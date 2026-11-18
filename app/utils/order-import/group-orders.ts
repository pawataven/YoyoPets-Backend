import type {
  ColumnByField,
  FileOrderStatus,
  GroupedOrders,
  ImportField,
  ImportOrder,
  ImportOrderItem,
  ImportProblem
} from '~/types/order-import'
import { normalizeRawStatus, parseBaht, parseBangkokDateTime, parseOrderNo } from './normalize'

interface ParsedItemRow {
  orderNo: string
  rawStatus: string
  // Cancelled, returned or refunded items earn nothing (spec: "ชิ้นที่ไม่นับ")
  isCounted: boolean
  status: FileOrderStatus
  amount: number
  orderedAt: string | null
  deliveredAt: string | null
  productName: string
  sku: string | null
  quantity: number
}

function roundBaht(value: number) {
  return Math.round(value * 100) / 100
}

function earliest(values: (string | null)[]) {
  const dates = values.filter((value): value is string => value !== null)
  return dates.length ? dates.reduce((first, value) => (Date.parse(value) < Date.parse(first) ? value : first)) : null
}

function latest(values: (string | null)[]) {
  const dates = values.filter((value): value is string => value !== null)
  return dates.length ? dates.reduce((last, value) => (Date.parse(value) > Date.parse(last) ? value : last)) : null
}

function orderStatus(items: ParsedItemRow[]): FileOrderStatus {
  const counted = items.filter(item => item.isCounted)
  if (!counted.length) return items.some(item => item.status === 'returned') ? 'returned' : 'cancelled'
  if (counted.some(item => item.status === 'pending')) return 'pending'
  if (counted.every(item => item.status === 'closed')) return 'closed'
  return 'completed'
}

function mergeItems(items: ParsedItemRow[]): ImportOrderItem[] {
  const merged = new Map<string, ImportOrderItem>()
  for (const item of items) {
    const key = JSON.stringify([item.productName, item.sku, item.status])
    const existing = merged.get(key)
    if (existing) {
      existing.quantity += item.quantity
      existing.total_baht = roundBaht(existing.total_baht + item.amount)
    } else {
      merged.set(key, {
        product_name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        total_baht: roundBaht(item.amount),
        status: item.status
      })
    }
  }
  return [...merged.values()]
}

function toOrder(orderNo: string, items: ParsedItemRow[]): ImportOrder {
  const counted = items.filter(item => item.isCounted)
  const describing = counted.length ? counted : items
  return {
    order_no: orderNo,
    status: orderStatus(items),
    raw_status: [...new Set(describing.map(item => item.rawStatus))].join(' / '),
    amount_baht: roundBaht(counted.reduce((sum, item) => sum + item.amount, 0)),
    ordered_at: earliest(items.map(item => item.orderedAt)),
    delivered_at: latest(counted.map(item => item.deliveredAt)),
    items: mergeItems(items)
  }
}

// dataRows: the rows below the header at headerRowIndex (0-based); messages use 1-based spreadsheet row numbers.
// Rows with a status missing from statusByRaw are counted in unknownStatuses and produce no order until the admin
// says what that status means (tech-stack: never guess).
export function groupOrders(
  dataRows: string[][],
  columnByField: ColumnByField,
  statusByRaw: Map<string, FileOrderStatus>,
  headerRowIndex: number
): GroupedOrders {
  const problems: ImportProblem[] = []
  const unknownRowCounts = new Map<string, { rawStatus: string, rowCount: number }>()
  const itemsByOrderNo = new Map<string, ParsedItemRow[]>()

  const cell = (row: string[], field: ImportField) => {
    const columnIndex = columnByField[field]
    return columnIndex === undefined ? '' : (row[columnIndex] ?? '').trim()
  }

  dataRows.forEach((row, index) => {
    if (row.every(value => !value.trim())) return
    const rowNumber = headerRowIndex + index + 2
    const report = (message: string) => problems.push({ rowNumber, message })

    const orderNoText = cell(row, 'order_no')
    const orderNo = parseOrderNo(orderNoText)
    if (!orderNo) return report(`เลขคำสั่งซื้อ "${orderNoText}" อ่านไม่ได้`)

    const amountText = cell(row, 'amount')
    const amount = parseBaht(amountText)
    if (amount === null || amount < 0) return report(`ยอดเงิน "${amountText}" อ่านไม่ได้`)

    const refundText = cell(row, 'refund_amount')
    const refund = refundText ? parseBaht(refundText) : 0
    if (refund === null) return report(`ยอดคืนเงิน "${refundText}" อ่านไม่ได้`)

    const deliveredText = cell(row, 'delivered_at')
    const deliveredAt = parseBangkokDateTime(deliveredText)
    if (deliveredAt === 'invalid') return report(`วันที่ "${deliveredText}" อ่านไม่ได้`)
    const orderedText = cell(row, 'ordered_at')
    const orderedAt = parseBangkokDateTime(orderedText)
    if (orderedAt === 'invalid') return report(`วันที่ "${orderedText}" อ่านไม่ได้`)

    const rawStatus = cell(row, 'status')
    const statusKey = normalizeRawStatus(rawStatus)
    const fileStatus = statusByRaw.get(statusKey)
    if (!fileStatus) {
      const unknown = unknownRowCounts.get(statusKey) ?? { rawStatus, rowCount: 0 }
      unknown.rowCount += 1
      unknownRowCounts.set(statusKey, unknown)
      return
    }

    const isCounted = fileStatus !== 'cancelled' && fileStatus !== 'returned' && refund <= 0
    const quantityText = cell(row, 'quantity')
    const quantity = quantityText ? Math.max(1, Math.trunc(Number(quantityText)) || 1) : 1

    const item: ParsedItemRow = {
      orderNo,
      rawStatus,
      isCounted,
      status: isCounted || fileStatus === 'cancelled' ? fileStatus : 'returned',
      amount,
      orderedAt,
      deliveredAt,
      productName: cell(row, 'product_name') || '-',
      sku: cell(row, 'sku') || null,
      quantity
    }
    const orderItems = itemsByOrderNo.get(orderNo) ?? []
    orderItems.push(item)
    itemsByOrderNo.set(orderNo, orderItems)
  })

  // An order with any unknown-status row is held back whole, so its amount and status are never computed from part of it
  const ordersWithUnknownRows = new Set<string>()
  if (unknownRowCounts.size) {
    dataRows.forEach((row) => {
      const orderNo = parseOrderNo(cell(row, 'order_no'))
      if (orderNo && !statusByRaw.has(normalizeRawStatus(cell(row, 'status')))) ordersWithUnknownRows.add(orderNo)
    })
  }

  return {
    orders: [...itemsByOrderNo]
      .filter(([orderNo]) => !ordersWithUnknownRows.has(orderNo))
      .map(([orderNo, items]) => toOrder(orderNo, items)),
    problems,
    unknownStatuses: [...unknownRowCounts.values()]
  }
}
