// Same five values as platform_orders.status / import_status_aliases.status in the database
export type FileOrderStatus = 'pending' | 'completed' | 'closed' | 'cancelled' | 'returned'

// Mirrors the field check on import_column_aliases
export type ImportField
  = | 'order_no'
    | 'status'
    | 'amount'
    | 'delivered_at'
    | 'ordered_at'
    | 'product_name'
    | 'sku'
    | 'refund_amount'
    | 'quantity'

export interface ColumnAlias {
  field: ImportField
  // Normalised with normalizeHeader
  alias: string
}

export type ColumnByField = Partial<Record<ImportField, number>>

export interface HeaderDetection {
  // -1 when no row in the scanned range looks like a header
  headerRowIndex: number
  columnByField: ColumnByField
  missingFields: ImportField[]
}

export interface ImportOrderItem {
  product_name: string
  sku: string | null
  quantity: number
  total_baht: number
  status: FileOrderStatus
}

// Shape sent to import_order_chunk; snake_case because it goes straight into jsonb_to_recordset
export interface ImportOrder {
  order_no: string
  status: FileOrderStatus
  raw_status: string
  amount_baht: number
  ordered_at: string | null
  delivered_at: string | null
  items: ImportOrderItem[]
}

export interface ImportProblem {
  // 1-based row number as the admin sees it in a spreadsheet
  rowNumber: number
  message: string
}

export interface UnknownStatus {
  // As written in the file (trimmed); the alias key is its normalised form
  rawStatus: string
  rowCount: number
}

export interface GroupedOrders {
  orders: ImportOrder[]
  problems: ImportProblem[]
  unknownStatuses: UnknownStatus[]
}

export interface ImportHistoryEntry {
  id: string
  platform: 'shopee' | 'lazada' | 'tiktok'
  fileName: string
  // null when the importing admin's account was removed
  importerName: string | null
  importedAt: string
  // In progress = the browser stopped before finishing; re-selecting the same file resumes it
  isInProgress: boolean
  // null while in progress, and for imports made before summaries existed
  ordersTotal: number | null
  orderedFrom: string | null
  orderedTo: string | null
  pointsScheduled: number
  pointsReleased: number
  pointsReduced: number
  pointsCancelled: number
  warningCount: number
}

export interface ImportSummary {
  importId: string
  ordersTotal: number
  memberOrdersPendingMatched: number
  ordersAutoApproved: number
  ordersAutoRejected: number
  pointsScheduled: number
  pointsReleased: number
  pointsReduced: number
  pointsCancelled: number
  warningMemberOrderIds: string[]
}
