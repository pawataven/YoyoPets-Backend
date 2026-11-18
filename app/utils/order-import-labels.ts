import type { FileOrderStatus, ImportField } from '~/types/order-import'

// What each normalised file status means for points, as the admin chooses it for a raw status they have not seen
export const FILE_STATUS_OPTIONS: { value: FileOrderStatus, label: string, hint: string }[] = [
  { value: 'pending', label: 'กำลังดำเนินการ', hint: 'ยังไม่ส่งถึงลูกค้า แต้มรอต่อ' },
  { value: 'completed', label: 'ส่งถึงแล้ว (ยังคืนได้)', hint: 'แต้มเข้าเมื่อพ้นระยะคืนสินค้า' },
  { value: 'closed', label: 'จบแล้ว คืนไม่ได้', hint: 'แต้มเข้าทันที' },
  { value: 'cancelled', label: 'ยกเลิก', hint: 'ไม่ได้แต้ม แต้มที่รออยู่ถูกยกเลิก' },
  { value: 'returned', label: 'คืนสินค้า / คืนเงิน', hint: 'ไม่ได้แต้ม แต้มที่รออยู่ถูกยกเลิก' }
]

export const FILE_STATUS_LABELS = Object.fromEntries(FILE_STATUS_OPTIONS.map(option => [option.value, option.label])) as
  Record<FileOrderStatus, string>

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  order_no: 'เลขคำสั่งซื้อ',
  status: 'สถานะคำสั่งซื้อ',
  amount: 'ยอดที่ลูกค้าจ่ายค่าสินค้า (ไม่รวมค่าส่ง)',
  delivered_at: 'วันที่ส่งถึงลูกค้า',
  ordered_at: 'วันที่สั่งซื้อ',
  product_name: 'ชื่อสินค้า',
  sku: 'SKU',
  refund_amount: 'ยอดคืนเงิน',
  quantity: 'จำนวน'
}

export const IMPORT_PLATFORM_OPTIONS: { value: 'shopee' | 'lazada' | 'tiktok', label: string, isReady: boolean }[] = [
  { value: 'lazada', label: 'Lazada', isReady: true },
  // Waiting for the shop's export files with data rows (2026-11-18)
  { value: 'shopee', label: 'Shopee', isReady: false },
  { value: 'tiktok', label: 'TikTok Shop', isReady: false }
]
