import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'
import type {
  MarketplacePlatform,
  OrderApproveOptions,
  OrderBulkResult,
  OrderFileImport,
  OrderMatchResult,
  OrderReviewDetail,
  OrderReviewFilters,
  OrderReviewItem,
  OrderReviewOutcome,
  OrderReviewStatus,
  OrderSearchResult,
  OrderStatusCounts,
  PlatformOrderStatus,
  SearchResultPage
} from '~/types/admin'

export interface OrderRepository {
  searchOrders(searchTerm: string, limit: number): Promise<SearchResultPage<OrderSearchResult>>
  listReviewOrders(filters: OrderReviewFilters, page: number, pageSize: number): Promise<SearchResultPage<OrderReviewItem>>
  getReviewOrder(orderId: string): Promise<OrderReviewDetail | null>
  getReviewStatuses(orderIds: string[]): Promise<OrderReviewOutcome[]>
  countByStatus(): Promise<OrderStatusCounts>
  getLatestFileImports(): Promise<OrderFileImport[]>
  // Points come from the database (calculate_order_points) so the preview can never disagree with what approval grants
  calculatePoints(amountBaht: number, pointsMultiplier: number): Promise<number>
  approveOrders(orderIds: string[], options: OrderApproveOptions): Promise<OrderBulkResult>
  rejectOrders(orderIds: string[], reason: string): Promise<OrderBulkResult>
}

type ReviewRow = Omit<
  Database['public']['Views']['member_order_reviews']['Row'],
  'approved_amount_baht' | 'points_awarded' | 'reviewed_by' | 'stored_status'
>

const REVIEW_COLUMNS = 'id, member_id, member_code, member_name, member_phone, tier_name, tier_points_multiplier, platform, order_no, submitted_at, claimed_amount_baht, proof_image_path, review_status, rejection_reason, points_available_at, amount_baht, platform_order_id, file_status, file_amount_baht, file_delivered_at, return_window_ends_at, file_imported_at, duplicate_of_member_code, match_result, points, reviewed_at, reviewer_name'

const REVIEW_STATUSES: OrderReviewStatus[] = ['pending_review', 'waiting_return_period', 'approved', 'rejected', 'cancelled']
const PROOF_BUCKET = 'order-proofs'
const PROOF_URL_LIFETIME_SECONDS = 10 * 60

// Characters with meaning inside a PostgREST or() filter or an ILIKE pattern
const FILTER_SYNTAX_CHARACTERS = /[,()%_\\*]/g

// Members' phones are stored as Supabase Auth keeps them (66812345678), staff type 081-234-5678
function toStoredPhoneDigits(searchTerm: string) {
  const digits = searchTerm.replace(/\D/g, '')
  return digits.startsWith('0') ? `66${digits.slice(1)}` : digits
}

function searchConditions(searchTerm: string) {
  const text = searchTerm.replace(FILTER_SYNTAX_CHARACTERS, ' ').trim()
  if (!text) return null
  const conditions = [`order_no.ilike.*${text}*`, `member_name.ilike.*${text}*`, `member_code.ilike.*${text}*`]
  const phoneDigits = toStoredPhoneDigits(text)
  if (phoneDigits.length >= 3) conditions.push(`member_phone.like.*${phoneDigits}*`)
  return conditions.join(',')
}

// numeric columns can arrive as strings ("640.00") depending on the PostgREST setting; normalise once here
function toNumberOrNull(value: number | string | null) {
  return value === null ? null : Number(value)
}

function toReviewItem(row: ReviewRow): OrderReviewItem {
  return {
    id: row.id!,
    orderNo: row.order_no!,
    platform: row.platform as MarketplacePlatform,
    member: {
      id: row.member_id!,
      memberCode: row.member_code!,
      // Names are filled in during onboarding; until then the code is all there is
      fullName: row.member_name || row.member_code!,
      tierName: row.tier_name!
    },
    submittedAt: row.submitted_at!,
    proofImageCount: row.proof_image_path ? 1 : 0,
    matchResult: row.match_result as OrderMatchResult,
    duplicateOfMemberCode: row.duplicate_of_member_code,
    amountBaht: toNumberOrNull(row.amount_baht),
    points: row.points,
    status: row.review_status as OrderReviewStatus,
    reviewedAt: row.reviewed_at,
    reviewerName: row.reviewer_name
  }
}

function toBulkResult(result: Database['public']['Functions']['approve_member_orders']['Returns']): OrderBulkResult {
  const counts = result as { updated_count: number, skipped_count: number }
  return { updatedCount: counts.updated_count, skippedCount: counts.skipped_count }
}

export function createSupabaseOrderRepository(supabase: SupabaseClient<Database>): OrderRepository {
  return {
    async searchOrders(searchTerm, limit) {
      const conditions = searchConditions(searchTerm)
      if (!conditions) return { items: [], totalCount: 0 }
      const { data, count, error } = await supabase
        .from('member_order_reviews')
        .select('id, order_no, platform, member_name, member_code, submitted_at, review_status', { count: 'exact' })
        .or(conditions)
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return {
        totalCount: count ?? 0,
        items: data.map(row => ({
          id: row.id!,
          orderNo: row.order_no!,
          platform: row.platform as MarketplacePlatform,
          memberName: row.member_name || row.member_code!,
          submittedAt: row.submitted_at!,
          status: row.review_status as OrderReviewStatus
        }))
      }
    },

    async listReviewOrders(filters, page, pageSize) {
      let query = supabase.from('member_order_reviews').select(REVIEW_COLUMNS, { count: 'exact' })
      if (filters.tab !== 'all') query = query.eq('review_status', filters.tab)
      if (filters.platform !== 'all') query = query.eq('platform', filters.platform)
      if (filters.matchResult !== 'all') query = query.eq('match_result', filters.matchResult)
      const since = submittedSince(filters.submittedWithin)
      if (since) query = query.gte('submitted_at', since.toISOString())
      const conditions = searchConditions(filters.searchTerm)
      if (conditions) query = query.or(conditions)

      const start = (page - 1) * pageSize
      const { data, count, error } = await query
        .order('submitted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(start, start + pageSize - 1)
      if (error) throw error
      return { totalCount: count ?? 0, items: data.map(toReviewItem) }
    },

    async getReviewOrder(orderId) {
      const { data: row, error } = await supabase
        .from('member_order_reviews')
        .select(REVIEW_COLUMNS)
        .eq('id', orderId)
        .maybeSingle()
      if (error) throw error
      if (!row) return null

      const [items, proof] = await Promise.all([
        row.platform_order_id
          ? supabase.from('platform_order_items').select('id, product_name, quantity, total_baht').eq('platform_order_id', row.platform_order_id).order('id')
          : null,
        row.proof_image_path
          ? supabase.storage.from(PROOF_BUCKET).createSignedUrl(row.proof_image_path, PROOF_URL_LIFETIME_SECONDS)
          : null
      ])
      if (items?.error) throw items.error

      return {
        ...toReviewItem(row),
        memberPhone: row.member_phone,
        pointsMultiplier: Number(row.tier_points_multiplier),
        claimedAmountBaht: toNumberOrNull(row.claimed_amount_baht),
        fileRecord: row.platform_order_id
          ? {
              status: row.file_status as PlatformOrderStatus,
              amountBaht: toNumberOrNull(row.file_amount_baht),
              deliveredAt: row.file_delivered_at,
              returnWindowEndsAt: row.return_window_ends_at,
              importedAt: row.file_imported_at!
            }
          : null,
        items: (items?.data ?? []).map(item => ({
          id: String(item.id),
          productName: item.product_name,
          quantity: item.quantity,
          totalBaht: Number(item.total_baht)
        })),
        // A missing or unreadable picture should not block the review
        proofImageUrl: proof?.data?.signedUrl ?? null,
        rejectionReason: row.rejection_reason,
        pointsAvailableAt: row.points_available_at
      }
    },

    async getReviewStatuses(orderIds) {
      if (!orderIds.length) return []
      const { data, error } = await supabase
        .from('member_order_reviews')
        .select('id, order_no, review_status')
        .in('id', orderIds)
      if (error) throw error
      return data.map(row => ({ id: row.id!, orderNo: row.order_no!, status: row.review_status as OrderReviewStatus }))
    },

    async countByStatus() {
      const results = await Promise.all(REVIEW_STATUSES.map(status => supabase
        .from('member_order_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', status)))
      const counts = {} as OrderStatusCounts
      REVIEW_STATUSES.forEach((status, index) => {
        const result = results[index]!
        if (result.error) throw result.error
        counts[status] = result.count ?? 0
      })
      return counts
    },

    async getLatestFileImports() {
      const { data, error } = await supabase
        .from('order_imports')
        .select('platform, imported_at')
        .order('imported_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const latestByPlatform = new Map<string, OrderFileImport>()
      for (const row of data) {
        if (!latestByPlatform.has(row.platform)) {
          latestByPlatform.set(row.platform, { platform: row.platform as MarketplacePlatform, importedAt: row.imported_at })
        }
      }
      return [...latestByPlatform.values()]
    },

    async calculatePoints(amountBaht, pointsMultiplier) {
      const { data, error } = await supabase.rpc('calculate_order_points', { amount_baht: amountBaht, points_multiplier: pointsMultiplier })
      if (error) throw error
      return data
    },

    async approveOrders(orderIds, { creditMode, amountOverrideBaht }) {
      const { data, error } = await supabase.rpc('approve_member_orders', {
        order_ids: orderIds,
        credit_mode: creditMode,
        amount_override_baht: amountOverrideBaht
      })
      if (error) throw error
      return toBulkResult(data)
    },

    async rejectOrders(orderIds, reason) {
      const { data, error } = await supabase.rpc('reject_member_orders', { order_ids: orderIds, reason })
      if (error) throw error
      return toBulkResult(data)
    }
  }
}
