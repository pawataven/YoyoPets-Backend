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
  OrderReviewFilterOptions,
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
  // How many orders come before this one in the filtered list (its index), or null if the filters hide it
  countReviewOrdersBefore(filters: OrderReviewFilters, orderId: string): Promise<number | null>
  // Choices for the member-tier and reviewer column filters
  getReviewFilterOptions(): Promise<OrderReviewFilterOptions>
  getReviewOrder(orderId: string): Promise<OrderReviewDetail | null>
  getReviewStatuses(orderIds: string[]): Promise<OrderReviewOutcome[]>
  countByStatus(): Promise<OrderStatusCounts>
  // Waiting orders a person has to look at: everything except recent ones still expected in a file
  countOrdersNeedingReview(): Promise<number>
  getLatestFileImports(): Promise<OrderFileImport[]>
  // Days after delivery before points become usable, per platform (platform_settings)
  getReturnWindowDays(): Promise<Record<MarketplacePlatform, number>>
  // Points come from the database (calculate_order_points) so the preview can never disagree with what approval grants
  calculatePoints(amountBaht: number, pointsMultiplier: number): Promise<number>
  approveOrders(orderIds: string[], options: OrderApproveOptions): Promise<OrderBulkResult>
  rejectOrders(orderIds: string[], reason: string): Promise<OrderBulkResult>
  // Only while the approved points are not usable yet
  revokeApproval(orderId: string, reason: string): Promise<void>
}

type ReviewRow = Omit<
  Database['public']['Views']['member_order_reviews']['Row'],
  'approved_amount_baht' | 'points_awarded' | 'reviewed_by' | 'stored_status'
>

const REVIEW_COLUMNS = 'id, member_id, member_code, member_name, member_phone, tier_name, tier_points_multiplier, platform, order_no, submitted_at, claimed_amount_baht, proof_image_path, review_status, rejection_reason, points_available_at, amount_baht, platform_order_id, file_status, file_amount_baht, file_delivered_at, return_window_ends_at, file_imported_at, duplicate_of_member_code, match_result, points, reviewed_at, reviewer_name, decided_by_system, is_waiting_for_file'

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
    reviewerName: row.reviewer_name,
    pointsAvailableAt: row.points_available_at,
    decidedBySystem: row.decided_by_system ?? false,
    isWaitingForFile: row.is_waiting_for_file ?? false
  }
}

function toBulkResult(result: Database['public']['Functions']['approve_member_orders']['Returns']): OrderBulkResult {
  const counts = result as { updated_count: number, skipped_count: number }
  return { updatedCount: counts.updated_count, skippedCount: counts.skipped_count }
}

export function createSupabaseOrderRepository(supabase: SupabaseClient<Database>): OrderRepository {
  function filteredReviews<Columns extends string>(columns: Columns, filters: OrderReviewFilters, head = false) {
    let query = supabase.from('member_order_reviews').select(columns, { count: 'exact', head })
    if (filters.tab !== 'all') query = query.eq('review_status', filters.tab)
    if (filters.platforms.length) query = query.in('platform', filters.platforms)
    if (filters.matchResults.length) query = query.in('match_result', filters.matchResults)
    if (filters.tierNames.length) query = query.in('tier_name', filters.tierNames)
    if (filters.reviewerIds.length) query = query.in('reviewed_by', filters.reviewerIds)
    if (filters.proof === 'with') query = query.not('proof_image_path', 'is', null)
    if (filters.proof === 'without') query = query.is('proof_image_path', null)
    for (const dateColumn of ['submitted_at', 'reviewed_at'] as const) {
      const { since, until } = orderDateBounds(effectiveOrderDateRange(filters, dateColumn))
      if (since) query = query.gte(dateColumn, since.toISOString())
      if (until) query = query.lt(dateColumn, until.toISOString())
    }
    const conditions = searchConditions(filters.searchTerm)
    if (conditions) query = query.or(conditions)
    return query
  }

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
      const start = (page - 1) * pageSize
      const { key, ascending } = filters.sort
      const { data, count, error } = await filteredReviews(REVIEW_COLUMNS, filters)
        .order(key, { ascending, nullsFirst: false })
        .order('id', { ascending: false })
        .range(start, start + pageSize - 1)
      if (error) throw error
      return { totalCount: count ?? 0, items: data.map(toReviewItem) }
    },

    // Same order as listReviewOrders (sort column, nulls last, then id desc): rows ahead have a value that sorts earlier,
    // or the same value and a larger id. Separate counts instead of one or() because the search already uses or()
    // and PostgREST would not group them.
    async countReviewOrdersBefore(filters, orderId) {
      const { key, ascending } = filters.sort
      const { data: target, error: targetError } = await filteredReviews('id, submitted_at, reviewed_at, amount_baht, points', filters)
        .eq('id', orderId)
        .maybeSingle()
      if (targetError) throw targetError
      if (!target) return null
      const targetValue = target[key]

      const [ahead, tied] = await Promise.all(targetValue === null
        ? [
            filteredReviews('id', filters, true).not(key, 'is', null),
            filteredReviews('id', filters, true).is(key, null).gt('id', orderId)
          ]
        : [
            ascending
              ? filteredReviews('id', filters, true).lt(key, targetValue)
              : filteredReviews('id', filters, true).gt(key, targetValue),
            filteredReviews('id', filters, true).eq(key, targetValue).gt('id', orderId)
          ])
      if (ahead.error) throw ahead.error
      if (tied.error) throw tied.error
      return (ahead.count ?? 0) + (tied.count ?? 0)
    },

    async getReviewFilterOptions() {
      const [tiers, admins] = await Promise.all([
        supabase.from('tiers').select('name').order('sort_order'),
        // Former admins stay listed: their past decisions are still in the decided tabs
        supabase.from('admin_users').select('user_id, display_name, email')
      ])
      if (tiers.error) throw tiers.error
      if (admins.error) throw admins.error
      return {
        tierNames: tiers.data.map(tier => tier.name),
        reviewers: admins.data
          .map(admin => ({ id: admin.user_id, name: admin.display_name || admin.email }))
          .sort((first, second) => first.name.localeCompare(second.name, 'th'))
      }
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
        rejectionReason: row.rejection_reason
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
        .eq('status', 'completed')
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

    async getReturnWindowDays() {
      const { data, error } = await supabase.from('platform_settings').select('platform, return_window_days')
      if (error) throw error
      return Object.fromEntries(data.map(row => [row.platform, row.return_window_days])) as Record<MarketplacePlatform, number>
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
    },

    async revokeApproval(orderId, reason) {
      const { error } = await supabase.rpc('revoke_member_order_approval', { revoke_order_id: orderId, reason })
      if (error) throw error
    },

    async countOrdersNeedingReview() {
      const { count, error } = await supabase
        .from('member_order_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'pending_review')
        .eq('is_waiting_for_file', false)
      if (error) throw error
      return count ?? 0
    }
  }
}
