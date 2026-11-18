import { describe, expect, it } from 'vitest'
import type { ColumnByField, FileOrderStatus } from '~/types/order-import'
import { groupOrders } from './group-orders'

const COLUMNS: ColumnByField = {
  order_no: 0, status: 1, amount: 2, delivered_at: 3, ordered_at: 4, product_name: 5, sku: 6, refund_amount: 7
}

const STATUS_BY_RAW = new Map<string, FileOrderStatus>([
  ['shipped', 'pending'],
  ['delivered', 'completed'],
  ['confirmed', 'closed'],
  ['canceled', 'cancelled'],
  ['returned', 'returned']
])

// Data rows only (after the header); the header sat on file row 1, so these are rows 2, 3, …
function row(orderNo: string, status: string, amount: string, delivered = '', refund = '0', product = 'Cat food', sku = 'SKU-1') {
  return [orderNo, status, amount, delivered, '10 Nov 2026 09:00', product, sku, refund]
}

describe('groupOrders', () => {
  it('sums paidPrice of every item and keeps one order per order number', () => {
    const result = groupOrders([
      row('1029100221', 'Delivered', '420', '13 Nov 2026 12:00'),
      row('1029100221', 'Delivered', '180.50', '13 Nov 2026 12:00', '0', 'Litter', 'SKU-2')
    ], COLUMNS, STATUS_BY_RAW, 0)

    expect(result.problems).toEqual([])
    expect(result.orders).toEqual([{
      order_no: '1029100221',
      status: 'completed',
      raw_status: 'Delivered',
      amount_baht: 600.5,
      ordered_at: '2026-11-10T09:00:00+07:00',
      delivered_at: '2026-11-13T12:00:00+07:00',
      items: [
        { product_name: 'Cat food', sku: 'SKU-1', quantity: 1, total_baht: 420, status: 'completed' },
        { product_name: 'Litter', sku: 'SKU-2', quantity: 1, total_baht: 180.5, status: 'completed' }
      ]
    }])
  })

  it('merges identical item rows into one line with a quantity', () => {
    const result = groupOrders([
      row('1029100221', 'Delivered', '100', '13 Nov 2026 12:00'),
      row('1029100221', 'Delivered', '100', '13 Nov 2026 12:00')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders[0]!.items).toEqual([
      { product_name: 'Cat food', sku: 'SKU-1', quantity: 2, total_baht: 200, status: 'completed' }
    ])
  })

  it('leaves returned items and refunded items out of the amount (partial return)', () => {
    const result = groupOrders([
      row('1029100221', 'Delivered', '600', '13 Nov 2026 12:00'),
      row('1029100221', 'Returned', '400', '13 Nov 2026 12:00', '400', 'Toy', 'SKU-3'),
      row('1029100221', 'Delivered', '50', '13 Nov 2026 12:00', '50', 'Snack', 'SKU-4')
    ], COLUMNS, STATUS_BY_RAW, 0)
    const order = result.orders[0]!
    expect(order.amount_baht).toBe(600)
    expect(order.status).toBe('completed')
    expect(order.items.map(item => item.status)).toEqual(['completed', 'returned', 'returned'])
  })

  it('marks an order returned when every item was returned, cancelled when every item was cancelled', () => {
    const result = groupOrders([
      row('1111111111', 'Returned', '300', '13 Nov 2026 12:00', '300'),
      row('2222222222', 'Canceled', '300'),
      row('2222222222', 'Canceled', '100', '', '0', 'Litter', 'SKU-2')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders.map(order => [order.order_no, order.status, order.amount_baht])).toEqual([
      ['1111111111', 'returned', 0],
      ['2222222222', 'cancelled', 0]
    ])
  })

  it('keeps an order pending while any counted item is still on its way', () => {
    const result = groupOrders([
      row('1029100221', 'Delivered', '100', '13 Nov 2026 12:00'),
      row('1029100221', 'Shipped', '100', '', '0', 'Litter', 'SKU-2')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders[0]!.status).toBe('pending')
    expect(result.orders[0]!.raw_status).toBe('Delivered / Shipped')
  })

  it('treats the order as closed only when every counted item is closed', () => {
    const result = groupOrders([
      row('1029100221', 'Confirmed', '100', '13 Nov 2026 12:00'),
      row('1029100221', 'Confirmed', '100', '13 Nov 2026 12:00', '0', 'Litter', 'SKU-2')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders[0]!.status).toBe('closed')
  })

  it('collects statuses it has never seen instead of guessing', () => {
    const result = groupOrders([
      row('1029100221', 'Lost by 3PL', '100'),
      row('1029100222', 'Lost by 3PL', '100'),
      row('1029100223', 'Packed', '100')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders).toEqual([])
    expect(result.unknownStatuses).toEqual([
      { rawStatus: 'Lost by 3PL', rowCount: 2 },
      { rawStatus: 'Packed', rowCount: 1 }
    ])
  })

  it('reports unreadable rows by their spreadsheet row number and skips blank rows', () => {
    const result = groupOrders([
      row('1.2E+14', 'Delivered', '100'),
      ['', '', '', '', '', '', '', ''],
      row('1029100222', 'Delivered', 'abc'),
      row('1029100223', 'Delivered', '100', '31/02/2026')
    ], COLUMNS, STATUS_BY_RAW, 0)
    expect(result.orders).toEqual([])
    expect(result.problems).toEqual([
      { rowNumber: 2, message: 'เลขคำสั่งซื้อ "1.2E+14" อ่านไม่ได้' },
      { rowNumber: 4, message: 'ยอดเงิน "abc" อ่านไม่ได้' },
      { rowNumber: 5, message: 'วันที่ "31/02/2026" อ่านไม่ได้' }
    ])
  })
})
