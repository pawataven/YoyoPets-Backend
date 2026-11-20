import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type {
  MarketplacePlatform,
  OrderDateColumn,
  OrderDatePreset,
  OrderDateRange,
  OrderDecisionLine,
  OrderMatchResult,
  OrderProofFilter,
  OrderReviewItem,
  OrderReviewer,
  OrderReviewFilters,
  OrderReviewSort,
  OrderReviewStatus,
  OrderReviewTab,
  OrderSortKey
} from '~/types/admin'
// Explicit so the unit tests, which run without Nuxt auto-imports, can load this file
import { ORDER_MATCH_BADGES } from './status-labels'
import { formatThaiDateRange } from './thai-date'

export const ORDER_REVIEW_PAGE_SIZE = 8

// Tab order and wording from Figma 20:1293; "ทั้งหมด" has no count in the design
export const ORDER_REVIEW_TABS: { value: OrderReviewTab, label: string }[] = [
  { value: 'pending_review', label: 'รอตรวจ' },
  { value: 'waiting_return_period', label: 'รอพ้นระยะคืนสินค้า' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ไม่ผ่าน' },
  { value: 'all', label: 'ทั้งหมด' }
]

export const ORDER_PLATFORM_OPTIONS: { value: MarketplacePlatform, label: string }[] = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' }
]

export const ORDER_MATCH_OPTIONS: { value: OrderMatchResult, label: string }[] = (Object.keys(ORDER_MATCH_BADGES) as OrderMatchResult[])
  .map(value => ({ value, label: ORDER_MATCH_BADGES[value].label }))

export const ORDER_DATE_PRESET_OPTIONS: { value: OrderDatePreset, label: string }[] = [
  { value: 'today', label: 'วันนี้' },
  { value: 'yesterday', label: 'เมื่อวาน' },
  { value: '7d', label: '7 วันล่าสุด' },
  { value: '30d', label: '30 วันล่าสุด' },
  { value: 'all', label: 'ทั้งหมด' }
]

export const ORDER_PROOF_OPTIONS: { value: OrderProofFilter, label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'with', label: 'มีรูป' },
  { value: 'without', label: 'ไม่มีรูป' }
]

export const ORDER_DATE_COLUMN_LABELS: Record<OrderDateColumn, string> = {
  submitted_at: 'ส่งเมื่อ',
  reviewed_at: 'ตรวจเมื่อ'
}

// The decided tabs are a history of decisions, so by default they sort (latest first) and filter by when the order was
// reviewed: an order sent 10 days ago and approved just now belongs at the top of "อนุมัติแล้ว", not hidden by "7 วันล่าสุด".
// The review queue and "ทั้งหมด" go by when the member submitted.
export function tabDateColumn(tab: OrderReviewTab): OrderDateColumn {
  return tab === 'pending_review' || tab === 'all' ? 'submitted_at' : 'reviewed_at'
}

export function otherOrderDateColumn(column: OrderDateColumn): OrderDateColumn {
  return column === 'submitted_at' ? 'reviewed_at' : 'submitted_at'
}

export function defaultOrderReviewSort(tab: OrderReviewTab): OrderReviewSort {
  return { key: tabDateColumn(tab), ascending: false }
}

// Nothing in the review queue has been reviewed yet
export function sortableOrderKeys(tab: OrderReviewTab): OrderSortKey[] {
  return tab === 'pending_review'
    ? ['submitted_at', 'amount_baht', 'points']
    : ['submitted_at', 'reviewed_at', 'amount_baht', 'points']
}

const ORDER_DATE_COLUMNS: OrderDateColumn[] = ['submitted_at', 'reviewed_at']
const NO_CHOSEN_DATE_RANGES: Record<OrderDateColumn, OrderDateRange | null> = { submitted_at: null, reviewed_at: null }

function defaultOrderDateRange(tab: OrderReviewTab, column: OrderDateColumn): OrderDateRange {
  return { preset: column === tabDateColumn(tab) ? '7d' : 'all' }
}

function isSameOrderDateRange(first: OrderDateRange, second: OrderDateRange) {
  if ('preset' in first) return 'preset' in second && first.preset === second.preset
  return 'from' in second && first.from === second.from && first.to === second.to
}

function usesOrderDateColumn(tab: OrderReviewTab, column: OrderDateColumn) {
  return !(tab === 'pending_review' && column === 'reviewed_at')
}

// A range equal to the tab's default is kept as null, so it keeps following the tab and doesn't show "ล้างตัวกรอง"
function chosenOrderDateRange(tab: OrderReviewTab, column: OrderDateColumn, range: OrderDateRange | null) {
  if (!range || !usesOrderDateColumn(tab, column)) return null
  return isSameOrderDateRange(range, defaultOrderDateRange(tab, column)) ? null : range
}

export function effectiveOrderDateRange(filters: Pick<OrderReviewFilters, 'tab' | 'dateRanges'>, column: OrderDateColumn): OrderDateRange {
  if (!usesOrderDateColumn(filters.tab, column)) return { preset: 'all' }
  return filters.dateRanges[column] ?? defaultOrderDateRange(filters.tab, column)
}

export function isOrderDateRangeFiltered(filters: Pick<OrderReviewFilters, 'tab' | 'dateRanges'>, column: OrderDateColumn) {
  return usesOrderDateColumn(filters.tab, column) && filters.dateRanges[column] !== null
}

export function withOrderDateRange(filters: OrderReviewFilters, column: OrderDateColumn, range: OrderDateRange): OrderReviewFilters {
  return { ...filters, dateRanges: { ...filters.dateRanges, [column]: chosenOrderDateRange(filters.tab, column, range) } }
}

export const DEFAULT_ORDER_REVIEW_FILTERS: OrderReviewFilters = {
  tab: 'pending_review',
  searchTerm: '',
  platforms: [],
  matchResults: [],
  tierNames: [],
  proof: 'all',
  reviewerIds: [],
  dateRanges: NO_CHOSEN_DATE_RANGES,
  sort: defaultOrderReviewSort('pending_review')
}

const REVIEW_STATUSES: OrderReviewStatus[] = ['pending_review', 'waiting_return_period', 'approved', 'rejected', 'cancelled']

const SORT_URL_VALUES: Record<OrderSortKey, string> = {
  submitted_at: 'submitted',
  reviewed_at: 'reviewed',
  amount_baht: 'amount',
  points: 'points'
}

const DATE_RANGE_URL_PREFIXES: Record<OrderDateColumn, string> = {
  submitted_at: 'submitted',
  reviewed_at: 'reviewed'
}

const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
// A malformed id in an in() filter makes Postgres reject the whole query
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pickOption<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? raw as T : null
}

function listFromQuery(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return []
  return [...new Set(raw.split(',').filter(Boolean))]
}

function allowedListFromQuery<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  return listFromQuery(raw).filter((value): value is T => (allowed as readonly string[]).includes(value))
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function parseIsoDay(day: string) {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year!, month! - 1, dayOfMonth!)
}

export function toIsoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isIsoDay(raw: unknown): raw is string {
  return typeof raw === 'string' && ISO_DAY_PATTERN.test(raw) && toIsoDay(parseIsoDay(raw)) === raw
}

function dateRangeFromKeys(within: unknown, from: unknown, to: unknown): OrderDateRange | null {
  if (isIsoDay(from) && isIsoDay(to) && from <= to) return { from, to }
  const preset = pickOption(within, ORDER_DATE_PRESET_OPTIONS.map(option => option.value))
  return preset ? { preset } : null
}

// Links made before 2026-11-21 carry a single within/from/to, which meant the tab's own date column
function dateRangesFromQuery(query: LocationQuery, tab: OrderReviewTab): Record<OrderDateColumn, OrderDateRange | null> {
  const legacyRange = dateRangeFromKeys(query.within, query.from, query.to)
  const rangeFor = (column: OrderDateColumn) => {
    const prefix = DATE_RANGE_URL_PREFIXES[column]
    const range = dateRangeFromKeys(query[`${prefix}_within`], query[`${prefix}_from`], query[`${prefix}_to`])
      ?? (column === tabDateColumn(tab) ? legacyRange : null)
    return chosenOrderDateRange(tab, column, range)
  }
  return { submitted_at: rangeFor('submitted_at'), reviewed_at: rangeFor('reviewed_at') }
}

function sortFromQuery(query: LocationQuery, tab: OrderReviewTab): OrderReviewSort {
  const fallback = defaultOrderReviewSort(tab)
  const key = (Object.keys(SORT_URL_VALUES) as OrderSortKey[]).find(sortKey => SORT_URL_VALUES[sortKey] === query.sort) ?? fallback.key
  if (!sortableOrderKeys(tab).includes(key)) return fallback
  return { key, ascending: query.dir === 'asc' }
}

export function orderReviewFiltersFromQuery(query: LocationQuery): OrderReviewFilters {
  const tab = pickOption(query.tab, [...REVIEW_STATUSES, 'all']) ?? DEFAULT_ORDER_REVIEW_FILTERS.tab
  return {
    tab,
    searchTerm: typeof query.q === 'string' ? query.q : '',
    platforms: allowedListFromQuery(query.platform, ORDER_PLATFORM_OPTIONS.map(option => option.value)),
    matchResults: allowedListFromQuery(query.match, ORDER_MATCH_OPTIONS.map(option => option.value)),
    tierNames: listFromQuery(query.tier),
    proof: pickOption(query.proof, ORDER_PROOF_OPTIONS.map(option => option.value)) ?? 'all',
    reviewerIds: tab === 'pending_review' ? [] : listFromQuery(query.reviewer).filter(id => UUID_PATTERN.test(id)),
    dateRanges: dateRangesFromQuery(query, tab),
    sort: sortFromQuery(query, tab)
  }
}

export function orderReviewPageFromQuery(query: LocationQuery) {
  const page = Number(query.page)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function dateRangeQuery(column: OrderDateColumn, range: OrderDateRange | null): LocationQueryRaw {
  if (!range) return {}
  const prefix = DATE_RANGE_URL_PREFIXES[column]
  if ('preset' in range) return { [`${prefix}_within`]: range.preset }
  return { [`${prefix}_from`]: range.from, [`${prefix}_to`]: range.to }
}

// Defaults are left out so the plain /orders URL stays clean
export function orderReviewQuery(filters: OrderReviewFilters, page: number): LocationQueryRaw {
  const { sort } = filters
  return {
    tab: filters.tab === DEFAULT_ORDER_REVIEW_FILTERS.tab ? undefined : filters.tab,
    q: filters.searchTerm.trim() || undefined,
    platform: filters.platforms.join(',') || undefined,
    match: filters.matchResults.join(',') || undefined,
    tier: filters.tierNames.join(',') || undefined,
    proof: filters.proof === 'all' ? undefined : filters.proof,
    reviewer: filters.reviewerIds.join(',') || undefined,
    ...dateRangeQuery('submitted_at', filters.dateRanges.submitted_at),
    ...dateRangeQuery('reviewed_at', filters.dateRanges.reviewed_at),
    sort: sort.key === defaultOrderReviewSort(filters.tab).key ? undefined : SORT_URL_VALUES[sort.key],
    dir: sort.ascending ? 'asc' : undefined,
    page: page > 1 ? String(page) : undefined
  }
}

// Each tab has its own natural order, and the review queue has no reviewer or review date to filter by
export function withOrderReviewTab(filters: OrderReviewFilters, tab: OrderReviewTab): OrderReviewFilters {
  const isReviewQueue = tab === 'pending_review'
  return {
    ...filters,
    tab,
    sort: defaultOrderReviewSort(tab),
    reviewerIds: isReviewQueue ? [] : filters.reviewerIds,
    dateRanges: isReviewQueue ? { ...filters.dateRanges, reviewed_at: null } : filters.dateRanges
  }
}

export function hasActiveOrderFilters(filters: OrderReviewFilters) {
  return filters.platforms.length > 0
    || filters.matchResults.length > 0
    || filters.tierNames.length > 0
    || filters.proof !== 'all'
    || filters.reviewerIds.length > 0
    || ORDER_DATE_COLUMNS.some(column => isOrderDateRangeFiltered(filters, column))
}

// Search, tab and sort stay: the search box belongs to the admin, and sorting hides nothing
export function clearOrderFilters(filters: OrderReviewFilters): OrderReviewFilters {
  return {
    ...filters,
    platforms: [],
    matchResults: [],
    tierNames: [],
    proof: 'all',
    reviewerIds: [],
    dateRanges: NO_CHOSEN_DATE_RANGES
  }
}

function optionLabels<T extends string>(values: T[], options: { value: T, label: string }[]) {
  return values.map(value => options.find(option => option.value === value)?.label ?? value).join(', ')
}

function reviewerSummary(reviewerIds: string[], reviewers: OrderReviewer[] | null) {
  const names = reviewerIds.map(id => reviewers?.find(reviewer => reviewer.id === id)?.name)
  return names.every(Boolean) ? names.join(', ') : `${reviewerIds.length.toLocaleString('th-TH')} คน`
}

// Every condition that can hide rows, the tab's default 7 days included, so an empty table can say why it is empty
export function orderFilterSummary(filters: OrderReviewFilters, reviewers: OrderReviewer[] | null): string[] {
  const searchTerm = filters.searchTerm.trim()
  const dateLines = ORDER_DATE_COLUMNS.flatMap((column) => {
    const range = effectiveOrderDateRange(filters, column)
    return 'preset' in range && range.preset === 'all' ? [] : [`${ORDER_DATE_COLUMN_LABELS[column]}: ${orderDateRangeLabel(range)}`]
  })
  return [
    ...(searchTerm ? [`ค้นหา "${searchTerm}"`] : []),
    ...dateLines,
    ...(filters.platforms.length ? [`ช่องทาง: ${optionLabels(filters.platforms, ORDER_PLATFORM_OPTIONS)}`] : []),
    ...(filters.tierNames.length ? [`ระดับสมาชิก: ${filters.tierNames.join(', ')}`] : []),
    ...(filters.proof !== 'all' ? [`หลักฐาน: ${optionLabels([filters.proof], ORDER_PROOF_OPTIONS)}`] : []),
    ...(filters.matchResults.length ? [`ผลตรวจ: ${optionLabels(filters.matchResults, ORDER_MATCH_OPTIONS)}`] : []),
    ...(filters.reviewerIds.length ? [`ผู้ตรวจ: ${reviewerSummary(filters.reviewerIds, reviewers)}`] : [])
  ]
}

// [since, until): until is null when the range runs to now. Days are the browser's local days (the shop is in Thailand).
export function orderDateBounds(range: OrderDateRange, now = new Date()): { since: Date | null, until: Date | null } {
  if ('from' in range) return { since: parseIsoDay(range.from), until: addDays(parseIsoDay(range.to), 1) }
  const startOfToday = startOfDay(now)
  switch (range.preset) {
    case 'today': return { since: startOfToday, until: null }
    case 'yesterday': return { since: addDays(startOfToday, -1), until: startOfToday }
    case '7d': return { since: addDays(startOfToday, -6), until: null }
    case '30d': return { since: addDays(startOfToday, -29), until: null }
    case 'all': return { since: null, until: null }
  }
}

export function orderDateRangeLabel(range: OrderDateRange) {
  if ('preset' in range) return ORDER_DATE_PRESET_OPTIONS.find(option => option.value === range.preset)!.label
  return formatThaiDateRange(parseIsoDay(range.from), parseIsoDay(range.to))
}

export function toOrderDecisionLine(order: OrderReviewItem): OrderDecisionLine {
  return {
    id: order.id,
    platform: order.platform,
    orderNo: order.orderNo,
    memberName: order.member.fullName,
    memberCode: order.member.memberCode,
    amountBaht: order.amountBaht,
    points: order.points,
    skipReason: null
  }
}

// Mirrors approve_member_orders for a multi-order call: only exact matches are credited without a person looking;
// mismatched and not-in-file orders need the drawer, where the amount used can be checked and corrected
export function bulkApprovalSkipReason(order: OrderReviewItem): string | null {
  if (order.matchResult === 'amount_mismatch' || order.matchResult === 'not_in_file') return 'ต้องตรวจทีละรายการ'
  if (order.points === null) return 'ให้แต้มไม่ได้'
  return null
}
