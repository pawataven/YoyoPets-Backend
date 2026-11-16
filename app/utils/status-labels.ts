import type { MarketplacePlatform, OrderMatchResult, OrderReviewItem, OrderReviewStatus, RedemptionStatus } from '~/types/admin'

export interface StatusBadge {
  label: string
  // Tones from the style guide chips (Figma 55:6291): green done, gold waiting, red failed, grey cancelled
  class: string
}

const TONE_SUCCESS = 'bg-success/12 text-success'
const TONE_WAITING = 'bg-gold/30 text-pending'
const TONE_FAILED = 'bg-primary-soft text-primary-dark'
const TONE_CANCELLED = 'bg-elevated text-muted'

export const ORDER_STATUS_BADGES: Record<OrderReviewStatus, StatusBadge> = {
  pending_review: { label: 'รอตรวจ', class: TONE_WAITING },
  waiting_return_period: { label: 'รอพ้นระยะคืนสินค้า', class: TONE_WAITING },
  approved: { label: 'อนุมัติแล้ว', class: TONE_SUCCESS },
  rejected: { label: 'ไม่ผ่าน', class: TONE_FAILED },
  cancelled: { label: 'ยกเลิก', class: TONE_CANCELLED }
}

// Wording from the order review design (Figma 20:1293)
export const ORDER_MATCH_BADGES: Record<OrderMatchResult, StatusBadge> = {
  matched: { label: 'พบ · ยอดตรง', class: TONE_SUCCESS },
  not_in_file: { label: 'ยังไม่พบในไฟล์', class: TONE_WAITING },
  amount_mismatch: { label: 'ยอดไม่ตรง', class: TONE_WAITING },
  duplicate: { label: 'เลขซ้ำ', class: TONE_FAILED },
  cancelled_in_file: { label: 'คำสั่งซื้อถูกยกเลิก', class: TONE_FAILED },
  returned_in_file: { label: 'สินค้าถูกคืน', class: TONE_FAILED }
}

export function orderMatchLabel(order: Pick<OrderReviewItem, 'matchResult' | 'duplicateOfMemberCode'>) {
  const label = ORDER_MATCH_BADGES[order.matchResult].label
  return order.matchResult === 'duplicate' && order.duplicateOfMemberCode
    ? `${label} · ${order.duplicateOfMemberCode}`
    : label
}

const REVIEW_DECISION_VERBS: Record<OrderReviewStatus, string | null> = {
  pending_review: null,
  waiting_return_period: 'อนุมัติโดย',
  approved: 'อนุมัติโดย',
  rejected: 'ไม่อนุมัติโดย',
  cancelled: 'ยกเลิกโดย'
}

// The name is gone when the reviewing admin account was deleted; the decision itself still stands
export const REMOVED_ADMIN_NAME = 'แอดมินที่ถูกลบ'

// "อนุมัติโดย ทีมพัฒนา"; null while the order is still waiting for review
export function orderReviewerLabel(order: Pick<OrderReviewItem, 'status' | 'reviewedAt' | 'reviewerName'>) {
  const verb = REVIEW_DECISION_VERBS[order.status]
  if (!verb || !order.reviewedAt) return null
  return `${verb} ${order.reviewerName ?? REMOVED_ADMIN_NAME}`
}

export const REDEMPTION_STATUS_BADGES: Record<RedemptionStatus, StatusBadge> = {
  requested: { label: 'รอดำเนินการ', class: TONE_WAITING },
  preparing: { label: 'กำลังเตรียมของ', class: TONE_WAITING },
  shipped: { label: 'จัดส่งแล้ว', class: TONE_SUCCESS },
  delivered: { label: 'ได้รับแล้ว', class: TONE_SUCCESS },
  cancelled: { label: 'ยกเลิก', class: TONE_CANCELLED }
}

export const MARKETPLACE_LOGOS: Record<MarketplacePlatform, { src: string, name: string }> = {
  shopee: { src: '/images/marketplaces/shopee.png', name: 'Shopee' },
  lazada: { src: '/images/marketplaces/lazada.png', name: 'Lazada' },
  tiktok: { src: '/images/marketplaces/tiktok-shop.png', name: 'TikTok Shop' }
}
