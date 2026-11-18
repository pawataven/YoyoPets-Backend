import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/types/database.types'
import type { MarketplacePlatform } from '~/types/admin'
import type { ColumnAlias, FileOrderStatus, ImportField, ImportOrder, ImportSummary } from '~/types/order-import'

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
}

function toSummary(raw: Json): ImportSummary {
  const summary = raw as Record<string, unknown>
  return {
    importId: String(summary.import_id),
    ordersTotal: Number(summary.orders_total ?? 0),
    memberOrdersPendingMatched: Number(summary.member_orders_pending_matched ?? 0),
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
    }
  }
}
