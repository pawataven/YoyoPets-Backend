import type { LocationQuery, LocationQueryRaw } from 'vue-router'

// Options from the period picker design (2026-11-14)
export type DashboardPeriodPreset = 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'this-year'
export type DashboardPeriodKind = DashboardPeriodPreset | 'custom'

export interface DashboardPeriod {
  kind: DashboardPeriodKind
  // Start of the first day, local time
  from: Date
  // Start of the day after the last day (exclusive), so it works directly as a `< to` bound
  to: Date
}

export const DASHBOARD_PERIOD_PRESETS: DashboardPeriodPreset[] = [
  'today',
  'last-7-days',
  'last-30-days',
  'this-month',
  'last-month',
  'this-year'
]

const DEFAULT_PRESET: DashboardPeriodPreset = 'this-month'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function dateToKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function keyToDate(key: unknown) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  // Rejects impossible dates such as 2026-02-31, which Date would roll into March
  return dateToKey(date) === key ? date : null
}

function isPreset(value: unknown): value is DashboardPeriodPreset {
  return typeof value === 'string' && (DASHBOARD_PERIOD_PRESETS as string[]).includes(value)
}

export function resolvePresetPeriod(kind: DashboardPeriodPreset, now = new Date()): DashboardPeriod {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  const year = today.getFullYear()
  const month = today.getMonth()
  switch (kind) {
    case 'today': return { kind, from: today, to: tomorrow }
    case 'last-7-days': return { kind, from: addDays(today, -6), to: tomorrow }
    case 'last-30-days': return { kind, from: addDays(today, -29), to: tomorrow }
    case 'this-month': return { kind, from: new Date(year, month, 1), to: new Date(year, month + 1, 1) }
    case 'last-month': return { kind, from: new Date(year, month - 1, 1), to: new Date(year, month, 1) }
    case 'this-year': return { kind, from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) }
  }
}

export function customPeriod(firstDay: Date, lastDay: Date): DashboardPeriod {
  return { kind: 'custom', from: startOfDay(firstDay), to: addDays(startOfDay(lastDay), 1) }
}

export function lastDayOfPeriod(period: DashboardPeriod) {
  return addDays(period.to, -1)
}

// ?period=last-7-days, or ?period=custom&from=2026-11-01&to=2026-11-15; no query means this month
export function periodFromQuery(query: LocationQuery, now = new Date()): DashboardPeriod {
  if (query.period === 'custom') {
    const firstDay = keyToDate(query.from)
    const lastDay = keyToDate(query.to)
    if (firstDay && lastDay && firstDay <= lastDay) return customPeriod(firstDay, lastDay)
  }
  return resolvePresetPeriod(isPreset(query.period) ? query.period : DEFAULT_PRESET, now)
}

export function periodToQuery(period: DashboardPeriod): LocationQueryRaw {
  if (period.kind === DEFAULT_PRESET) return {}
  if (period.kind !== 'custom') return { period: period.kind }
  return { period: 'custom', from: dateToKey(period.from), to: dateToKey(lastDayOfPeriod(period)) }
}

export function periodCacheKey(period: DashboardPeriod) {
  return `${dateToKey(period.from)}_${dateToKey(period.to)}`
}

function previousMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

// Rows in the picker: "เดือนนี้ (พ.ย. 2026)"
export function periodOptionLabel(kind: DashboardPeriodPreset, now = new Date()) {
  switch (kind) {
    case 'today': return 'วันนี้'
    case 'last-7-days': return '7 วันล่าสุด'
    case 'last-30-days': return '30 วันล่าสุด'
    case 'this-month': return `เดือนนี้ (${formatThaiMonthYear(now, 'short')})`
    case 'last-month': return `เดือนที่แล้ว (${formatThaiMonthYear(previousMonthStart(now), 'short')})`
    case 'this-year': return 'ปีนี้'
  }
}

// Picker button: "เดือนนี้: พ.ย. 2026"
export function periodButtonLabel(period: DashboardPeriod) {
  switch (period.kind) {
    case 'today': return 'วันนี้'
    case 'last-7-days': return '7 วันล่าสุด'
    case 'last-30-days': return '30 วันล่าสุด'
    case 'this-month': return `เดือนนี้: ${formatThaiMonthYear(period.from, 'short')}`
    case 'last-month': return `เดือนที่แล้ว: ${formatThaiMonthYear(period.from, 'short')}`
    case 'this-year': return `ปีนี้: ${period.from.getFullYear()}`
    case 'custom': return formatThaiDateRange(period.from, lastDayOfPeriod(period))
  }
}

// Page subtitle and card subtitles: "เดือนพฤศจิกายน 2026", "ปี 2026", "8–14 พ.ย. 2026"
export function periodDescription(period: DashboardPeriod) {
  if (period.kind === 'this-month' || period.kind === 'last-month') return `เดือน${formatThaiMonthYear(period.from)}`
  if (period.kind === 'this-year') return `ปี ${period.from.getFullYear()}`
  return formatThaiDateRange(period.from, lastDayOfPeriod(period))
}

// Stat card labels: "ยอดซื้อจากสมาชิก (พ.ย.)"
export function periodShortLabel(period: DashboardPeriod) {
  switch (period.kind) {
    case 'today': return 'วันนี้'
    case 'last-7-days': return '7 วัน'
    case 'last-30-days': return '30 วัน'
    case 'this-month':
    case 'last-month': return formatThaiMonthName(period.from, 'short')
    case 'this-year': return `ปี ${period.from.getFullYear()}`
    case 'custom': return 'ช่วงที่เลือก'
  }
}

// "+184 เดือนนี้"
export function newMembersSuffix(period: DashboardPeriod) {
  switch (period.kind) {
    case 'today': return 'วันนี้'
    case 'last-7-days': return 'ใน 7 วัน'
    case 'last-30-days': return 'ใน 30 วัน'
    case 'this-month': return 'เดือนนี้'
    case 'last-month': return 'เดือนที่แล้ว'
    case 'this-year': return 'ปีนี้'
    case 'custom': return 'ในช่วงนี้'
  }
}

// "▲ 12% จาก ต.ค."
export function comparisonLabel(period: DashboardPeriod) {
  if (period.kind === 'this-month' || period.kind === 'last-month') {
    return `จาก ${formatThaiMonthName(previousMonthStart(period.from), 'short')}`
  }
  if (period.kind === 'this-year') return `จากปี ${period.from.getFullYear() - 1}`
  return 'จากช่วงก่อนหน้า'
}
