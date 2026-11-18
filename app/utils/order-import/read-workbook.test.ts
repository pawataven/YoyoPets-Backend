import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { decodeCsvBytes, readWorkbook } from './read-workbook'

// Thai letters in TIS-620 / Windows-874 sit at U+0E01..U+0E5B → 0xA1..0xFB
function encodeWindows874(text: string) {
  return new Uint8Array([...text].map((character) => {
    const codePoint = character.codePointAt(0)!
    return codePoint >= 0x0E01 && codePoint <= 0x0E5B ? codePoint - 0x0E00 + 0xA0 : codePoint
  }))
}

const THAI_CSV = 'หมายเลขคำสั่งซื้อ,สถานะการสั่งซื้อ\n2610109ABCDEF,สำเร็จแล้ว\n'

describe('decodeCsvBytes', () => {
  it('decodes UTF-8 and drops the BOM', () => {
    const withBom = new Uint8Array([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode(THAI_CSV)])
    expect(decodeCsvBytes(withBom)).toBe(THAI_CSV)
    expect(decodeCsvBytes(new TextEncoder().encode(THAI_CSV))).toBe(THAI_CSV)
  })

  it('falls back to Windows-874 for Thai Excel CSVs', () => {
    expect(decodeCsvBytes(encodeWindows874(THAI_CSV))).toBe(THAI_CSV)
  })
})

describe('readWorkbook', () => {
  it('keeps long order numbers as text in CSV', () => {
    const csv = 'orderNumber,paidPrice\n123456789012345678,420.00\n'
    const rows = readWorkbook(new TextEncoder().encode(csv).buffer, 'lazada.csv')
    expect(rows).toEqual([['orderNumber', 'paidPrice'], ['123456789012345678', '420.00']])
  })

  it('reads a Windows-874 CSV with Thai headers', () => {
    const rows = readWorkbook(encodeWindows874(THAI_CSV).buffer, 'Order.all.csv')
    expect(rows[0]).toEqual(['หมายเลขคำสั่งซื้อ', 'สถานะการสั่งซื้อ'])
    expect(rows[1]).toEqual(['2610109ABCDEF', 'สำเร็จแล้ว'])
  })

  it('reads the first sheet of an xlsx file as text', () => {
    const sheet = XLSX.utils.aoa_to_sheet([['orderNumber', 'paidPrice'], ['1029100221', 560]])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Orders')
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    expect(readWorkbook(buffer, 'lazada.xlsx')).toEqual([['orderNumber', 'paidPrice'], ['1029100221', '560']])
  })
})
