// th-TH defaults to the Buddhist calendar (2569); the designs use the Gregorian year (2026)
const THAI_GREGORIAN_LOCALE = 'th-TH-u-ca-gregory'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// "5 นาที", "3 ชม.", "เมื่อวาน", "2 วัน" as in the notification list design
export function formatTimeAgo(isoDate: string, now = new Date()) {
  const date = new Date(isoDate)
  const elapsedMs = now.getTime() - date.getTime()
  if (elapsedMs < MINUTE_MS) return 'เมื่อสักครู่'
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)} นาที`

  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * HOUR_MS))
  if (daysAgo === 0) return `${Math.floor(elapsedMs / HOUR_MS)} ชม.`
  if (daysAgo === 1) return 'เมื่อวาน'
  return `${daysAgo} วัน`
}

export function formatThaiMonthYear(date: Date, month: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { month, year: 'numeric' }).format(date)
}

// "พฤศจิกายน" / "พ.ย.", without the year
export function formatThaiMonthName(date: Date, month: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { month }).format(date)
}

// "09:12" today, "เมื่อวาน 16:40", otherwise "8 พ.ย." as in the team activity design
export function formatActivityTime(isoDate: string, now = new Date()) {
  const date = new Date(isoDate)
  const time = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * HOUR_MS))
  if (daysAgo === 0) return time
  if (daysAgo === 1) return `เมื่อวาน ${time}`
  return formatThaiDayMonth(isoDate)
}

// "10 พ.ย."
export function formatThaiDayMonth(isoDate: string) {
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { day: 'numeric', month: 'short' }).format(new Date(isoDate))
}

// "9 พ.ย. 2026"
export function formatThaiShortDate(isoDate: string) {
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(isoDate))
}

// "10 พ.ย. 09:41"
export function formatThaiDayMonthTime(isoDate: string) {
  const time = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(isoDate))
  return `${formatThaiDayMonth(isoDate)} ${time}`
}

// "8–14 พ.ย. 2026" (both ends inclusive)
export function formatThaiDateRange(firstDay: Date, lastDay: Date) {
  return new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
    .formatRange(firstDay, lastDay)
}

// "10 พ.ย. 2026 09:45"
export function formatThaiDateTime(date: Date) {
  const day = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat(THAI_GREGORIAN_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `${day} ${time}`
}
