export type AdminRole = 'super_admin' | 'admin'

export interface AdminAccount {
  userId: string
  email: string
  // null until a super admin sets it; the UI shows the email instead
  displayName: string | null
  role: AdminRole
}

// Where a signed-in user still has to go before reaching the back office
export type AdminAuthStep = 'mfa-setup' | 'mfa-verify' | 'ready'

// UPinInput with type="number" leaves unfilled boxes undefined
export type TotpCodeDigits = (number | undefined)[]

export interface TotpEnrollment {
  factorId: string
  // SVG data URI from Supabase, safe to use directly as an <img> src
  qrCode: string
  secret: string
}

export type AdminNotificationKind
  = | 'orders_pending'
    | 'redemptions_requested'
    | 'reward_stock_low'
    | 'coupon_codes_low'
    | 'order_import_finished'
    | 'top_spender_closing'

export interface AdminNotification {
  id: string
  kind: AdminNotificationKind
  title: string
  detail: string
  createdAt: string
  isRead: boolean
}

// Counts shown as badges next to the daily-work menu items
export interface WorkQueueCounts {
  ordersToReview: number
  redemptionsToShip: number
}

export interface MemberSearchResult {
  id: string
  memberCode: string
  fullName: string
  phone: string | null
  // null until the points system exists; the search list hides them meanwhile
  tierName: string | null
  pointsBalance: number | null
}

export type MarketplacePlatform = 'shopee' | 'lazada' | 'tiktok'

export type OrderReviewStatus = 'pending_review' | 'waiting_return_period' | 'approved' | 'rejected' | 'cancelled'

export interface OrderSearchResult {
  id: string
  orderNo: string
  platform: MarketplacePlatform
  memberName: string
  submittedAt: string
  status: OrderReviewStatus
}

// How a member's submitted order compares with the latest Seller Center file
export type OrderMatchResult
  = | 'matched'
    | 'not_in_file'
    | 'amount_mismatch'
    | 'duplicate'
    | 'cancelled_in_file'
    | 'returned_in_file'

export interface OrderReviewMember {
  id: string
  memberCode: string
  fullName: string
  tierName: string
}

export interface OrderReviewItem {
  id: string
  orderNo: string
  platform: MarketplacePlatform
  member: OrderReviewMember
  submittedAt: string
  proofImageCount: number
  matchResult: OrderMatchResult
  // Member code of whoever submitted the same order number first; set only for 'duplicate'
  duplicateOfMemberCode: string | null
  // From the Seller Center file once matched; before that the design shows the member's own figure (e.g. "ยังไม่พบในไฟล์" 890).
  // null when neither is known
  amountBaht: number | null
  // null when the order cannot earn points (duplicate, cancelled, returned)
  points: number | null
  status: OrderReviewStatus
}

export type PlatformOrderStatus = 'pending' | 'completed' | 'cancelled' | 'returned'

// The order as it appears in the latest Seller Center file
export interface PlatformOrderRecord {
  status: PlatformOrderStatus
  amountBaht: number | null
  deliveredAt: string | null
  returnWindowEndsAt: string | null
  importedAt: string
}

export interface PlatformOrderItem {
  id: string
  productName: string
  quantity: number
  totalBaht: number
}

export interface OrderReviewDetail extends OrderReviewItem {
  memberPhone: string | null
  pointsMultiplier: number
  claimedAmountBaht: number | null
  fileRecord: PlatformOrderRecord | null
  items: PlatformOrderItem[]
  // Short-lived signed URL; null when the member attached no picture
  proofImageUrl: string | null
  rejectionReason: string | null
  pointsAvailableAt: string | null
}

// "แต้มเข้าเมื่อพ้นระยะคืนสินค้า" (recommended) or "ให้แต้มใช้ได้ทันที" in the review drawer
export type OrderCreditMode = 'after_return_window' | 'immediately'

export interface OrderApproveOptions {
  creditMode: OrderCreditMode
  // The drawer's "ยอดซื้อที่ใช้คำนวณ"; only allowed when approving a single order
  amountOverrideBaht?: number
}

export type OrderReviewTab = OrderReviewStatus | 'all'
export type OrderSubmittedWithin = 'today' | '7d' | '30d' | 'all'

export interface OrderReviewFilters {
  tab: OrderReviewTab
  searchTerm: string
  platform: MarketplacePlatform | 'all'
  matchResult: OrderMatchResult | 'all'
  submittedWithin: OrderSubmittedWithin
}

export type OrderStatusCounts = Record<OrderReviewStatus, number>

export interface OrderFileImport {
  platform: MarketplacePlatform
  importedAt: string
}

export interface OrderBulkResult {
  updatedCount: number
  // Orders that were no longer pending, or (on approve) cannot earn points
  skippedCount: number
}

export type RedemptionStatus ='requested' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

export interface RedemptionSearchResult {
  id: string
  redemptionNo: string
  rewardName: string
  rewardImageUrl: string | null
  memberName: string
  carrierName: string | null
  trackingNo: string | null
  status: RedemptionStatus
}

// One group of search results plus how many matched in total, for "ดูผลทั้งหมด N รายการ"
export interface SearchResultPage<T> {
  items: T[]
  totalCount: number
}

export interface MemberCounts {
  total: number
  joinedSince: number
}

// Figures for the selected period that come from systems not built yet (orders, points, spend)
export interface DashboardPeriodFigures {
  ordersToReview: number
  oldestPendingOrderAt: string | null
  memberSpendBaht: number
  // Change against the previous period of the same kind (previous month, previous year, previous N days);
  // null when there is nothing to compare with
  memberSpendChangePercent: number | null
  pointsIssued: number
  pointsRedeemed: number
}

export interface DailyOrderSubmissions {
  // YYYY-MM-DD, local date
  date: string
  shopee: number
  lazada: number
  tiktok: number
}

export type DashboardTodoKind
  = | 'review_orders'
    | 'pack_redemptions'
    | 'restock_reward'
    | 'refill_coupon_codes'
    | 'close_top_spender'

export interface DashboardTodo {
  kind: DashboardTodoKind
  title: string
  detail: string
}

export interface TopReward {
  id: string
  name: string
  imageUrl: string | null
  // Coupon rewards have no photo; the design shows their value on a red tile instead
  couponValueBaht: number | null
  redemptionCount: number
}

export interface TopSpenderEntry {
  rank: number
  memberName: string
  spendBaht: number
}

export interface TeamActivity {
  id: string
  adminName: string
  occurredAt: string
  description: string
}
