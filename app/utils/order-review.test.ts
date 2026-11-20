import { describe, expect, it } from 'vitest'
import type { LocationQuery } from 'vue-router'
import type { OrderReviewTab } from '~/types/admin'
import {
  DEFAULT_ORDER_REVIEW_FILTERS,
  clearOrderFilters,
  effectiveOrderDateRange,
  hasActiveOrderFilters,
  isOrderDateRangeFiltered,
  orderFilterSummary,
  orderReviewFiltersFromQuery,
  orderReviewQuery,
  withOrderDateRange,
  withOrderReviewTab
} from './order-review'

const defaults = DEFAULT_ORDER_REVIEW_FILTERS
const onTab = (tab: OrderReviewTab) => withOrderReviewTab(defaults, tab)

describe('effectiveOrderDateRange', () => {
  it('uses 7 days on the tab date column and all on the other', () => {
    expect(effectiveOrderDateRange(onTab('approved'), 'reviewed_at')).toEqual({ preset: '7d' })
    expect(effectiveOrderDateRange(onTab('approved'), 'submitted_at')).toEqual({ preset: 'all' })
    expect(effectiveOrderDateRange(onTab('all'), 'submitted_at')).toEqual({ preset: '7d' })
    expect(effectiveOrderDateRange(onTab('all'), 'reviewed_at')).toEqual({ preset: 'all' })
  })

  it('does not depend on the sort', () => {
    const sorted = { ...onTab('approved'), sort: { key: 'submitted_at' as const, ascending: true } }
    expect(effectiveOrderDateRange(sorted, 'reviewed_at')).toEqual({ preset: '7d' })
  })
})

describe('withOrderDateRange', () => {
  it('stores null when the range equals the default', () => {
    const filters = withOrderDateRange(onTab('approved'), 'reviewed_at', { preset: '7d' })
    expect(filters.dateRanges.reviewed_at).toBeNull()
    expect(hasActiveOrderFilters(filters)).toBe(false)
  })

  it('filters both columns at once', () => {
    let filters = withOrderDateRange(onTab('approved'), 'submitted_at', { from: '2026-11-01', to: '2026-11-15' })
    filters = withOrderDateRange(filters, 'reviewed_at', { preset: 'yesterday' })
    expect(effectiveOrderDateRange(filters, 'submitted_at')).toEqual({ from: '2026-11-01', to: '2026-11-15' })
    expect(effectiveOrderDateRange(filters, 'reviewed_at')).toEqual({ preset: 'yesterday' })
    expect(isOrderDateRangeFiltered(filters, 'submitted_at')).toBe(true)
    expect(hasActiveOrderFilters(filters)).toBe(true)
  })
})

describe('withOrderReviewTab', () => {
  it('lets default ranges follow the tab', () => {
    const waiting = withOrderReviewTab(onTab('pending_review'), 'waiting_return_period')
    expect(effectiveOrderDateRange(waiting, 'submitted_at')).toEqual({ preset: 'all' })
    expect(effectiveOrderDateRange(waiting, 'reviewed_at')).toEqual({ preset: '7d' })
  })

  it('keeps a chosen range across tabs', () => {
    const chosen = withOrderDateRange(onTab('pending_review'), 'submitted_at', { preset: '30d' })
    expect(effectiveOrderDateRange(withOrderReviewTab(chosen, 'approved'), 'submitted_at')).toEqual({ preset: '30d' })
  })

  it('drops the review range when entering the review queue', () => {
    const chosen = withOrderDateRange(onTab('approved'), 'reviewed_at', { preset: 'today' })
    const queue = withOrderReviewTab(chosen, 'pending_review')
    expect(queue.dateRanges.reviewed_at).toBeNull()
    expect(withOrderReviewTab(queue, 'approved').dateRanges.reviewed_at).toBeNull()
  })
})

describe('clearOrderFilters', () => {
  it('resets both ranges', () => {
    let filters = withOrderDateRange(onTab('approved'), 'submitted_at', { preset: 'today' })
    filters = withOrderDateRange(filters, 'reviewed_at', { preset: 'today' })
    expect(clearOrderFilters(filters).dateRanges).toEqual({ submitted_at: null, reviewed_at: null })
  })
})

describe('URL', () => {
  it('round-trips explicit ranges only', () => {
    let filters = withOrderDateRange(onTab('approved'), 'submitted_at', { from: '2026-11-01', to: '2026-11-15' })
    filters = withOrderDateRange(filters, 'reviewed_at', { preset: 'yesterday' })
    const query = orderReviewQuery(filters, 1)
    expect(query).toMatchObject({ submitted_from: '2026-11-01', submitted_to: '2026-11-15', reviewed_within: 'yesterday' })
    expect(query.within).toBeUndefined()
    expect(orderReviewFiltersFromQuery(query as LocationQuery).dateRanges).toEqual(filters.dateRanges)
    expect(orderReviewQuery(onTab('approved'), 1).reviewed_within).toBeUndefined()
  })

  it('reads legacy within, from and to as the tab date column', () => {
    expect(orderReviewFiltersFromQuery({ tab: 'all', within: 'all' }).dateRanges).toEqual({ submitted_at: { preset: 'all' }, reviewed_at: null })
    expect(orderReviewFiltersFromQuery({ tab: 'waiting_return_period', within: 'all' }).dateRanges).toEqual({ submitted_at: null, reviewed_at: { preset: 'all' } })
    expect(orderReviewFiltersFromQuery({ tab: 'approved', from: '2026-11-01', to: '2026-11-15' }).dateRanges.reviewed_at).toEqual({ from: '2026-11-01', to: '2026-11-15' })
  })

  it('prefers the new keys over legacy ones', () => {
    expect(orderReviewFiltersFromQuery({ tab: 'all', within: 'all', submitted_within: 'today' }).dateRanges.submitted_at).toEqual({ preset: 'today' })
  })

  it('ignores a review range on the review queue', () => {
    const filters = orderReviewFiltersFromQuery({ reviewed_within: 'today' })
    expect(filters.dateRanges.reviewed_at).toBeNull()
    expect(hasActiveOrderFilters(filters)).toBe(false)
  })

  it('falls back to the default for bad or default values', () => {
    expect(orderReviewFiltersFromQuery({ submitted_from: '2026-11-15', submitted_to: '2026-11-01' }).dateRanges.submitted_at).toBeNull()
    expect(orderReviewFiltersFromQuery({ submitted_from: '2026-02-30', submitted_to: '2026-03-01' }).dateRanges.submitted_at).toBeNull()
    expect(orderReviewFiltersFromQuery({ submitted_within: '7d' }).dateRanges.submitted_at).toBeNull()
  })
})

describe('orderFilterSummary', () => {
  const reviewers = [{ id: 'a0000000-0000-4000-8000-000000000001', name: 'สมศรี' }]

  it('lists every condition that hides rows, in plain words', () => {
    let filters = withOrderDateRange(onTab('all'), 'submitted_at', { preset: 'all' })
    filters = withOrderDateRange(filters, 'reviewed_at', { preset: 'today' })
    filters = {
      ...filters,
      searchTerm: ' 5700 ',
      platforms: ['shopee', 'lazada'],
      tierNames: ['Puppy'],
      proof: 'with',
      matchResults: ['matched'],
      reviewerIds: ['a0000000-0000-4000-8000-000000000001']
    }
    expect(orderFilterSummary(filters, reviewers)).toEqual([
      'ค้นหา "5700"',
      'ตรวจเมื่อ: วันนี้',
      'ช่องทาง: Shopee, Lazada',
      'ระดับสมาชิก: Puppy',
      'หลักฐาน: มีรูป',
      'ผลตรวจ: พบ · ยอดตรง',
      'ผู้ตรวจ: สมศรี'
    ])
  })

  it('includes the default 7 days, since it also hides older orders', () => {
    expect(orderFilterSummary(onTab('pending_review'), [])).toEqual(['ส่งเมื่อ: 7 วันล่าสุด'])
  })

  it('is empty when nothing is hidden', () => {
    expect(orderFilterSummary(withOrderDateRange(onTab('all'), 'submitted_at', { preset: 'all' }), [])).toEqual([])
  })

  it('counts reviewers whose names are not loaded', () => {
    const filters = { ...onTab('approved'), reviewerIds: ['a0000000-0000-4000-8000-000000000009'] }
    expect(orderFilterSummary(filters, null)).toContain('ผู้ตรวจ: 1 คน')
  })
})
