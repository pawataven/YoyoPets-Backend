import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/types/database.types'
import type { MarketplacePlatform } from '~/types/admin'
import type {
  ColumnAlias,
  FileOrderStatus,
  ImportField,
  ImportHistoryEntry,
  ImportOrder,
  ImportSummary
} from '~/types/order-import'

export interface OrderImportRepository {
  listColumnAliases(platform: MarketplacePlatform): Promise<ColumnAlias[]>
  addColumnAliases(platform: MarketplacePlatform, aliases: ColumnAlias[]): Promise<void>
  // Keyed by the normalised raw status
  listStatusAliases(platform: MarketplacePlatform): Promise<Map<string, FileOrderStatus>>
  saveStatusAliases(platform: MarketplacePlatform, entries: { rawStatus: string, status: FileOrderStatus }[]): Promise<void>
  // Returns the in-progress import for the same file if there is one, so an interrupted upload continues
  startImport(platform: MarketplacePlatform, fileName: string, fileHash: string): Promise<string>
  importChunk(importId: string, orders: ImportOrder[]): Promise<void>
  finishImport(importId: string): Promise<ImportSummary>
  // Approved orders still waiting for a delivery date from the file after this many days
  countLongWaitingCredits(olderThanDays: number): Promise<number>
  // Newest first
  listImportHistory(limit: number, platform: MarketplacePlatform | null): Promise<ImportHistoryEntry[]>
}

function summaryNumber(summary: Record<string, unknown>, key: string): number {
  const value = summary[key]
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

function toSummary(raw: Json): ImportSummary {
  const summary = raw as Record<string, unknown>
  return {
    importId: String(summary.import_id),
    ordersTotal: Number(summary.orders_total ?? 0),
    memberOrdersPendingMatched: Number(summary.member_orders_pending_matched ?? 0),
    ordersAutoApproved: Number(summary.orders_auto_approved ?? 0),
    ordersAutoRejected: Number(summary.orders_auto_rejected ?? 0),
    pointsScheduled: Number(summary.points_scheduled ?? 0),
    pointsReleased: Number(summary.points_released ?? 0),
    pointsReduced: Number(summary.points_reduced ?? 0),
    pointsCancelled: Number(summary.points_cancelled ?? 0),
    warningMemberOrderIds: (summary.warning_member_order_ids as string[] | undefined) ?? []
  }
}

export function createSupabaseOrderImportRepository(supabase: SupabaseClient<Database>): OrderImportRepository {
  return {
    async listColumnAliases(platform) {
      const { data, error } = await supabase.from('import_column_aliases').select('field, alias').eq('platform', platform)
      if (error) throw error
      return data.map(row => ({ field: row.field as ImportField, alias: row.alias }))
    },

    async addColumnAliases(platform, aliases) {
      if (!aliases.length) return
      const { error } = await supabase
        .from('import_column_aliases')
        .upsert(aliases.map(alias => ({ platform, field: alias.field, alias: alias.alias })), {
          onConflict: 'platform,alias',
          ignoreDuplicates: true
        })
      if (error) throw error
    },

    async listStatusAliases(platform) {
      const { data, error } = await supabase.from('import_status_aliases').select('raw_status, status').eq('platform', platform)
      if (error) throw error
      return new Map(data.map(row => [row.raw_status, row.status as FileOrderStatus]))
    },

    async saveStatusAliases(platform, entries) {
      if (!entries.length) return
      const { error } = await supabase
        .from('import_status_aliases')
        .upsert(entries.map(entry => ({ platform, raw_status: entry.rawStatus, status: entry.status })), {
          onConflict: 'platform,raw_status'
        })
      if (error) throw error
    },

    async startImport(platform, fileName, fileHash) {
      const { data, error } = await supabase.rpc('start_order_import', {
        import_platform: platform,
        import_file_name: fileName,
        import_file_hash: fileHash
      })
      if (error) throw error
      return data
    },

    async importChunk(importId, orders) {
      const { error } = await supabase.rpc('import_order_chunk', {
        chunk_import_id: importId,
        chunk_orders: orders as unknown as Json
      })
      if (error) throw error
    },

    async finishImport(importId) {
      const { data, error } = await supabase.rpc('finish_order_import', { finish_import_id: importId })
      if (error) throw error
      return toSummary(data)
    },

    async countLongWaitingCredits(olderThanDays) {
      const reviewedBefore = new Date(Date.now() - olderThanDays * 86_400_000).toISOString()
      const { count, error } = await supabase
        .from('member_order_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('stored_status', 'approved')
        .is('points_available_at', null)
        .lt('reviewed_at', reviewedBefore)
      if (error) throw error
      return count ?? 0
    },

    async listImportHistory(limit, platform) {
      let query = supabase
        .from('order_imports')
        .select('id, platform, file_name, imported_by, imported_at, status, summary')
        .order('imported_at', { ascending: false })
        .limit(limit)
      if (platform) query = query.eq('platform', platform)
      const [imports, admins] = await Promise.all([query, supabase.from('admin_users').select('user_id, display_name, email')])
      if (imports.error) throw imports.error
      if (admins.error) throw admins.error

      // order_imports.imported_by has no foreign key (it survives account removal), so names are joined here
      const nameByUserId = new Map(admins.data.map(admin => [admin.user_id, admin.display_name || admin.email]))
      return imports.data.map((row) => {
        const summary = (row.summary ?? {}) as Record<string, unknown>
        const hasSummary = 'orders_total' in summary
        return {
          id: row.id,
          platform: row.platform as ImportHistoryEntry['platform'],
          fileName: row.file_name,
          importerName: nameByUserId.get(row.imported_by) ?? null,
          importedAt: row.imported_at,
          isInProgress: row.status === 'in_progress',
          ordersTotal: hasSummary ? summaryNumber(summary, 'orders_total') : null,
          orderedFrom: typeof summary.ordered_from === 'string' ? summary.ordered_from : null,
          orderedTo: typeof summary.ordered_to === 'string' ? summary.ordered_to : null,
          pointsScheduled: summaryNumber(summary, 'points_scheduled'),
          pointsReleased: summaryNumber(summary, 'points_released'),
          pointsReduced: summaryNumber(summary, 'points_reduced'),
          pointsCancelled: summaryNumber(summary, 'points_cancelled'),
          warningCount: Array.isArray(summary.warning_member_order_ids) ? summary.warning_member_order_ids.length : 0
        }
      })
    }
  }
}
