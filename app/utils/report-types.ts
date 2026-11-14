// Report types and wording from the export dialog design (2026-11-14)
export type ReportKind = 'member-summary' | 'points-ledger' | 'approved-orders' | 'redemptions' | 'coupon-usage'
export type ReportFileFormat = 'xlsx' | 'csv'

export interface ReportDefinition {
  kind: ReportKind
  title: string
  description: string
  // Excel limits sheet names to 31 characters
  sheetName: string
  fileSlug: string
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { kind: 'member-summary', title: 'สรุปภาพรวมสมาชิกและแต้ม', description: 'จำนวนสมาชิก ยอดซื้อ แต้มเข้า-ออก รายวัน', sheetName: 'สรุปรายวัน', fileSlug: 'member-summary' },
  { kind: 'points-ledger', title: 'บัญชีแต้มทั้งหมด (Ledger)', description: 'ทุกรายการแต้มเข้า หัก หมดอายุ พร้อมผู้ทำรายการ', sheetName: 'บัญชีแต้ม', fileSlug: 'points-ledger' },
  { kind: 'approved-orders', title: 'คำสั่งซื้อที่อนุมัติ', description: 'สำหรับกระทบยอดกับ Seller Center', sheetName: 'คำสั่งซื้อที่อนุมัติ', fileSlug: 'approved-orders' },
  { kind: 'redemptions', title: 'การแลกของรางวัลและจัดส่ง', description: 'รายการแลก ที่อยู่ เลขพัสดุ', sheetName: 'การแลกของรางวัล', fileSlug: 'redemptions' },
  { kind: 'coupon-usage', title: 'การใช้คูปอง', description: 'โค้ดที่แจก ใช้แล้ว และหมดอายุ', sheetName: 'การใช้คูปอง', fileSlug: 'coupon-usage' }
]

export interface ReportColumn {
  key: string
  label: string
}

export type ReportCell = string | number | null

export interface ReportTable {
  columns: ReportColumn[]
  rows: Record<string, ReportCell>[]
}

// Where a report's rows come from right now
export type ReportDataSource = 'live' | 'sample' | 'unavailable'
