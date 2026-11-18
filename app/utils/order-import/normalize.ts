// Same rule as member_orders.order_no and import_order_chunk, so a row the browser accepts is never rejected later
const ORDER_NO_PATTERN = /^[A-Z0-9-]{6,40}$/
const SCIENTIFIC_NOTATION = /^\d+(\.\d+)?E[+-]?\d+$/i

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

// Excel serials in this range cover 1954–2119; anything else that is all digits is not a date
const EXCEL_SERIAL_MIN = 20000
const EXCEL_SERIAL_MAX = 80000
const EXCEL_EPOCH_SERIAL = 25569
const BUDDHIST_ERA_OFFSET = 543
const BUDDHIST_YEAR_THRESHOLD = 2400

export type ParsedDateTime = string | null | 'invalid'

export function normalizeHeader(text: string) {
  // \s also matches the BOM some CSV exports leave on the first header
  return text.toLowerCase().replace(/[\s()[\]*]/g, '')
}

export function normalizeRawStatus(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseOrderNo(text: string) {
  const compact = text.replace(/\s/g, '').toUpperCase()
  if (SCIENTIFIC_NOTATION.test(compact) || !ORDER_NO_PATTERN.test(compact)) return null
  return compact
}

export function parseBaht(text: string) {
  const cleaned = text.replace(/[,฿\s]|THB/gi, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toBangkokIso(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): ParsedDateTime {
  const fullYear = year > BUDDHIST_YEAR_THRESHOLD ? year - BUDDHIST_ERA_OFFSET : year
  const check = new Date(Date.UTC(fullYear, month - 1, day, hour, minute, second))
  const isRealDate = check.getUTCFullYear() === fullYear && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
    && hour < 24 && minute < 60 && second < 60
  if (!isRealDate) return 'invalid'
  return `${fullYear}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`
}

function fromExcelSerial(serial: number): ParsedDateTime {
  // The serial is the wall-clock time in the file, so its UTC fields are read back as Bangkok time
  const wallClock = new Date(Math.round((serial - EXCEL_EPOCH_SERIAL) * 86400) * 1000)
  return toBangkokIso(
    wallClock.getUTCFullYear(), wallClock.getUTCMonth() + 1, wallClock.getUTCDate(),
    wallClock.getUTCHours(), wallClock.getUTCMinutes(), wallClock.getUTCSeconds()
  )
}

// Seller Center files have no time zone; the shop is in Thailand, so wall-clock times are read as UTC+7
export function parseBangkokDateTime(text: string): ParsedDateTime {
  const value = text.trim()
  if (!value) return null

  const withOffset = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:?\d{2})$/)
  if (withOffset) {
    const iso = `${withOffset[1]}T${withOffset[2]!.length === 5 ? `${withOffset[2]}:00` : withOffset[2]}${withOffset[3]}`
    return Number.isNaN(Date.parse(iso)) ? 'invalid' : iso
  }

  const isoLike = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (isoLike) {
    const [, year, month, day, hour, minute, second] = isoLike.map(Number)
    return toBangkokIso(year!, month!, day!, hour || 0, minute || 0, second || 0)
  }

  const dayFirst = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dayFirst) {
    const [, day, month, year, hour, minute, second] = dayFirst.map(Number)
    return toBangkokIso(year!, month!, day!, hour || 0, minute || 0, second || 0)
  }

  const monthName = value.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (monthName) {
    const month = MONTHS[monthName[2]!.slice(0, 3).toLowerCase()]
    if (!month) return 'invalid'
    return toBangkokIso(
      Number(monthName[3]), month, Number(monthName[1]),
      Number(monthName[4] ?? 0), Number(monthName[5] ?? 0), Number(monthName[6] ?? 0)
    )
  }

  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value)
    if (serial >= EXCEL_SERIAL_MIN && serial <= EXCEL_SERIAL_MAX) return fromExcelSerial(serial)
  }

  return 'invalid'
}
