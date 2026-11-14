import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type {
  MarketplacePlatform,
  OrderMatchResult,
  OrderReviewFilters,
  OrderReviewStatus,
  OrderReviewTab,
  OrderSubmittedWithin
} from '~/types/admin'

export const ORDER_REVIEW_PAGE_SIZE = 8

// Tab order and wording from Figma 20:1293; "ทั้งหมด" has no count in the design
export const ORDER_REVIEW_TABS: { value: OrderReviewTab, label: string }[] = [
  { value: 'pending_review', label: 'รอตรวจ' },
  { value: 'waiting_return_period', label: 'รอพ้นระยะคืนสินค้า' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ไม่ผ่าน' },
  { value: 'all', label: 'ทั้งหมด' }
]

export const ORDER_PLATFORM_OPTIONS: { value: MarketplacePlatform | 'all', label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' }
]

export const ORDER_MATCH_OPTIONS: { value: OrderMatchResult | 'all', label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  ...(Object.keys(ORDER_MATCH_BADGES) as OrderMatchResult[]).map(value => ({ value, label: ORDER_MATCH_BADGES[value].label }))
]

export const ORDER_SUBMITTED_WITHIN_OPTIONS: { value: OrderSubmittedWithin, label: string }[] = [
  { value: 'today', label: 'วันนี้' },
  { value: '7d', label: '7 วันล่าสุด' },
  { value: '30d', label: '30 วันล่าสุด' },
  { value: 'all', label: 'ทั้งหมด' }
]

export const DEFAULT_ORDER_REVIEW_FILTERS: OrderReviewFilters = {
  tab: 'pending_review',
  searchTerm: '',
  platform: 'all',
  matchResult: 'all',
  submittedWithin: '7d'
}

const REVIEW_STATUSES: OrderReviewStatus[] = ['pending_review', 'waiting_return_period', 'approved', 'rejected', 'cancelled']

function pickOption<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? raw as T : fallback
}

export function orderReviewFiltersFromQuery(query: LocationQuery): OrderReviewFilters {
  return {
    tab: pickOption(query.tab, [...REVIEW_STATUSES, 'all'], DEFAULT_ORDER_REVIEW_FILTERS.tab),
    searchTerm: typeof query.q === 'string' ? query.q : '',
    platform: pickOption(query.platform, ORDER_PLATFORM_OPTIONS.map(option => option.value), 'all'),
    matchResult: pickOption(query.match, ORDER_MATCH_OPTIONS.map(option => option.value), 'all'),
    submittedWithin: pickOption(query.within, ORDER_SUBMITTED_WITHIN_OPTIONS.map(option => option.value), DEFAULT_ORDER_REVIEW_FILTERS.submittedWithin)
  }
}

export function orderReviewPageFromQuery(query: LocationQuery) {
  const page = Number(query.page)
  return Number.isInteger(page) && page > 0 ? page : 1
}

// Defaults are left out so the plain /orders URL stays clean
export function orderReviewQuery(filters: OrderReviewFilters, page: number): LocationQueryRaw {
  const defaults = DEFAULT_ORDER_REVIEW_FILTERS
  return {
    tab: filters.tab === defaults.tab ? undefined : filters.tab,
    q: filters.searchTerm.trim() || undefined,
    platform: filters.platform === defaults.platform ? undefined : filters.platform,
    match: filters.matchResult === defaults.matchResult ? undefined : filters.matchResult,
    within: filters.submittedWithin === defaults.submittedWithin ? undefined : filters.submittedWithin,
    page: page > 1 ? String(page) : undefined
  }
}

// Earliest submission time the filter still includes, or null for no limit
export function submittedSince(within: OrderSubmittedWithin, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (within === 'today') return startOfToday
  if (within === '7d') return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 6)
  if (within === '30d') return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 29)
  return null
}
