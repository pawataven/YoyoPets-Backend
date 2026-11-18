import { describe, expect, it } from 'vitest'
import type { ColumnAlias } from '~/types/order-import'
import { detectHeader } from './detect-header'

const LAZADA_ALIASES: ColumnAlias[] = [
  { field: 'order_no', alias: 'ordernumber' },
  { field: 'status', alias: 'status' },
  { field: 'amount', alias: 'paidprice' },
  { field: 'delivered_at', alias: 'delivereddate' },
  { field: 'ordered_at', alias: 'createtime' },
  { field: 'product_name', alias: 'itemname' },
  { field: 'sku', alias: 'sellersku' },
  { field: 'refund_amount', alias: 'refundamount' }
]

describe('detectHeader', () => {
  it('finds the header row below a title block and maps every known column', () => {
    const rows = [
      ['Lazada Seller Center export'],
      [''],
      ['orderItemId', 'createTime', 'orderNumber', 'deliveredDate', 'paidPrice', 'itemName', 'status', 'sellerSku', 'refundAmount'],
      ['1', '17 Nov 2026 10:22', '1029100221', '', '420', 'Cat food', 'shipped', 'SKU-1', '0']
    ]
    const detection = detectHeader(rows, LAZADA_ALIASES)
    expect(detection.headerRowIndex).toBe(2)
    expect(detection.columnByField).toEqual({
      ordered_at: 1, order_no: 2, delivered_at: 3, amount: 4, product_name: 5, status: 6, sku: 7, refund_amount: 8
    })
    expect(detection.missingFields).toEqual([])
  })

  it('lists required fields it could not find', () => {
    const detection = detectHeader([['orderNumber', 'Item Price', 'Order Status']], LAZADA_ALIASES)
    expect(detection.headerRowIndex).toBe(0)
    expect(detection.missingFields).toEqual(['status', 'amount'])
  })

  it('returns -1 when nothing looks like a header', () => {
    expect(detectHeader([['a', 'b'], ['c', 'd']], LAZADA_ALIASES).headerRowIndex).toBe(-1)
  })
})
