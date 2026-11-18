import { describe, expect, it } from 'vitest'
import { normalizeHeader, normalizeRawStatus, parseBaht, parseBangkokDateTime, parseOrderNo } from './normalize'

describe('normalizeHeader', () => {
  it('lower-cases and drops spaces, brackets, asterisks and the BOM', () => {
    expect(normalizeHeader(`${String.fromCharCode(0xFEFF)}paidPrice`)).toBe('paidprice')
    expect(normalizeHeader(' ราคาสินค้าที่ชำระโดยผู้ซื้อ (THB) ')).toBe('ราคาสินค้าที่ชำระโดยผู้ซื้อthb')
    expect(normalizeHeader('*หมายเลขติดตามพัสดุ')).toBe('หมายเลขติดตามพัสดุ')
  })
})

describe('normalizeRawStatus', () => {
  it('trims, lower-cases and collapses inner spaces', () => {
    expect(normalizeRawStatus('  Ready  To Ship ')).toBe('ready to ship')
  })
})

describe('parseOrderNo', () => {
  it('trims, removes spaces and upper-cases', () => {
    expect(parseOrderNo(' 250918k3pq ')).toBe('250918K3PQ')
    expect(parseOrderNo('1029 100 221')).toBe('1029100221')
  })

  it('rejects numbers Excel already turned into scientific notation', () => {
    expect(parseOrderNo('1.2E+14')).toBeNull()
  })

  it('rejects what the database would reject', () => {
    expect(parseOrderNo('')).toBeNull()
    expect(parseOrderNo('12345')).toBeNull()
    expect(parseOrderNo('ABC_123456')).toBeNull()
  })
})

describe('parseBaht', () => {
  it('strips thousands separators, the baht sign and THB', () => {
    expect(parseBaht('1,290.50')).toBe(1290.5)
    expect(parseBaht('฿ 640')).toBe(640)
    expect(parseBaht('420 THB')).toBe(420)
  })

  it('returns null for empty or non-numeric text', () => {
    expect(parseBaht('')).toBeNull()
    expect(parseBaht('-')).toBeNull()
    expect(parseBaht('abc')).toBeNull()
  })
})

describe('parseBangkokDateTime', () => {
  it('reads ISO-like text as Bangkok time unless it carries its own offset', () => {
    expect(parseBangkokDateTime('2026-11-17 10:22')).toBe('2026-11-17T10:22:00+07:00')
    expect(parseBangkokDateTime('2026-11-17T10:22:05')).toBe('2026-11-17T10:22:05+07:00')
    expect(parseBangkokDateTime('2026-11-17T03:22:05Z')).toBe('2026-11-17T03:22:05Z')
  })

  it('reads dd/mm/yyyy with or without time and converts Buddhist years', () => {
    expect(parseBangkokDateTime('05/11/2026 18:15')).toBe('2026-11-05T18:15:00+07:00')
    expect(parseBangkokDateTime('5/11/2569')).toBe('2026-11-05T00:00:00+07:00')
  })

  it('reads Lazada style "17 Nov 2026 10:22"', () => {
    expect(parseBangkokDateTime('17 Nov 2026 10:22')).toBe('2026-11-17T10:22:00+07:00')
    expect(parseBangkokDateTime('3 September 2026')).toBe('2026-09-03T00:00:00+07:00')
  })

  it('reads Excel serial numbers as Bangkok wall-clock time', () => {
    expect(parseBangkokDateTime('46343.5')).toBe('2026-11-17T12:00:00+07:00')
  })

  it('returns null for empty cells and "invalid" for text it cannot read', () => {
    expect(parseBangkokDateTime('')).toBeNull()
    expect(parseBangkokDateTime('  ')).toBeNull()
    expect(parseBangkokDateTime('31/02/2026')).toBe('invalid')
    expect(parseBangkokDateTime('yesterday')).toBe('invalid')
  })
})
