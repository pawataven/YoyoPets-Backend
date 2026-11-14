import type {
  MarketplacePlatform,
  OrderBulkResult,
  OrderFileImport,
  OrderReviewFilters,
  OrderReviewItem,
  OrderSearchResult,
  OrderStatusCounts,
  SearchResultPage
} from '~/types/admin'

export interface OrderRepository {
  searchOrders(searchTerm: string, limit: number): Promise<SearchResultPage<OrderSearchResult>>
  listReviewOrders(filters: OrderReviewFilters, page: number, pageSize: number): Promise<SearchResultPage<OrderReviewItem>>
  countByStatus(): Promise<OrderStatusCounts>
  getLatestFileImports(): Promise<OrderFileImport[]>
  // The real implementations must be Postgres RPCs: approving grants points, which no app may compute itself
  approveOrders(orderIds: string[]): Promise<OrderBulkResult>
  rejectOrders(orderIds: string[], reason: string): Promise<OrderBulkResult>
}

interface MockOrder extends OrderReviewItem {
  memberPhone: string
  rejectionReason: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number, hour: number, minute: number) {
  const date = new Date(Date.now() - days * DAY_MS)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

// Fitted to the design's sample rows (640 บาท Buddy → +7, 2,150 Family → +43, 1,480 Best Friend → +22)
const MOCK_TIER_POINT_RATES: Record<string, number> = { 'Buddy': 1.1, 'Family': 2, 'Best Friend': 1.5 }

function mockPoints(amountBaht: number, tierName: string) {
  return Math.round(amountBaht / 100 * (MOCK_TIER_POINT_RATES[tierName] ?? 1))
}

interface SampleRow {
  orderNo: string
  platform: MarketplacePlatform
  memberCode: string
  fullName: string
  tierName: string
  phone: string
  submittedAt: string
  proofImageCount: number
  matchResult: MockOrder['matchResult']
  duplicateOfMemberCode?: string
  amountBaht: number | null
  status: MockOrder['status']
}

function toMockOrder(row: SampleRow): MockOrder {
  const canEarnPoints = row.amountBaht !== null && !['duplicate', 'cancelled_in_file', 'returned_in_file'].includes(row.matchResult)
  return {
    id: `order-${row.orderNo}`,
    orderNo: row.orderNo,
    platform: row.platform,
    member: { id: `member-${row.memberCode}`, memberCode: row.memberCode, fullName: row.fullName, tierName: row.tierName },
    memberPhone: row.phone,
    submittedAt: row.submittedAt,
    proofImageCount: row.proofImageCount,
    matchResult: row.matchResult,
    duplicateOfMemberCode: row.duplicateOfMemberCode ?? null,
    amountBaht: row.amountBaht,
    points: canEarnPoints ? mockPoints(row.amountBaht!, row.tierName) : null,
    status: row.status,
    rejectionReason: row.status === 'rejected' ? 'ไม่พบคำสั่งซื้อในไฟล์ร้าน' : null
  }
}

// The eight rows of Figma 20:1293, with "today" in the design (10 พ.ย.) mapped to today
const DESIGN_ROWS: SampleRow[] = [
  { orderNo: '1029384756', platform: 'lazada', memberCode: 'YY-204518', fullName: 'มายด์ ใจดี', tierName: 'Buddy', phone: '0812344521', submittedAt: daysAgo(0, 9, 41), proofImageCount: 1, matchResult: 'matched', amountBaht: 640, status: 'pending_review' },
  { orderNo: '251109MX4T7Q', platform: 'shopee', memberCode: 'YY-100871', fullName: 'นที วงศ์ใหญ่', tierName: 'Family', phone: '0891230871', submittedAt: daysAgo(0, 8, 15), proofImageCount: 0, matchResult: 'matched', amountBaht: 2150, status: 'pending_review' },
  { orderNo: '251108PK22LD', platform: 'shopee', memberCode: 'YY-101442', fullName: 'กานต์ ศรีทอง', tierName: 'Best Friend', phone: '0861011442', submittedAt: daysAgo(1, 21, 3), proofImageCount: 1, matchResult: 'matched', amountBaht: 1480, status: 'pending_review' },
  { orderNo: '577104552', platform: 'tiktok', memberCode: 'YY-153360', fullName: 'อรุณี แก้วใส', tierName: 'Buddy', phone: '0831533600', submittedAt: daysAgo(1, 19, 47), proofImageCount: 1, matchResult: 'not_in_file', amountBaht: 890, status: 'pending_review' },
  { orderNo: '251109RT81BC', platform: 'shopee', memberCode: 'YY-118205', fullName: 'สมชาย ดีมาก', tierName: 'Best Friend', phone: '0841182050', submittedAt: daysAgo(1, 17, 30), proofImageCount: 0, matchResult: 'duplicate', duplicateOfMemberCode: 'YY-160033', amountBaht: 560, status: 'pending_review' },
  { orderNo: '1031552908', platform: 'lazada', memberCode: 'YY-100519', fullName: 'จิราพร สุขใจ', tierName: 'Family', phone: '0811005190', submittedAt: daysAgo(1, 15, 12), proofImageCount: 1, matchResult: 'amount_mismatch', amountBaht: 1120, status: 'pending_review' },
  { orderNo: '251108ZQ09HN', platform: 'shopee', memberCode: 'YY-127764', fullName: 'ต่อศักดิ์ มั่นคง', tierName: 'Best Friend', phone: '0821277640', submittedAt: daysAgo(1, 11, 58), proofImageCount: 1, matchResult: 'matched', amountBaht: 760, status: 'pending_review' },
  { orderNo: '577098311', platform: 'tiktok', memberCode: 'YY-171208', fullName: 'ปวีณา ใจงาม', tierName: 'Buddy', phone: '0871712080', submittedAt: daysAgo(2, 22, 40), proofImageCount: 0, matchResult: 'cancelled_in_file', amountBaht: 430, status: 'pending_review' }
]

// Rows from the top bar search design, kept so that search still finds them
const SEARCH_DESIGN_ROWS: SampleRow[] = [
  { orderNo: '1029100221', platform: 'lazada', memberCode: 'YY-188012', fullName: 'ต้นกล้า รักแมว', tierName: 'Buddy', phone: '0899871234', submittedAt: daysAgo(3, 10, 30), proofImageCount: 1, matchResult: 'matched', amountBaht: 520, status: 'pending_review' },
  { orderNo: '576293011', platform: 'tiktok', memberCode: 'YY-204518', fullName: 'มายด์ ใจดี', tierName: 'Buddy', phone: '0812344521', submittedAt: daysAgo(1, 19, 40), proofImageCount: 1, matchResult: 'matched', amountBaht: 990, status: 'waiting_return_period' },
  { orderNo: '250918K3PQ', platform: 'shopee', memberCode: 'YY-204518', fullName: 'มายด์ ใจดี', tierName: 'Buddy', phone: '0812344521', submittedAt: daysAgo(2, 22, 40), proofImageCount: 1, matchResult: 'matched', amountBaht: 1350, status: 'approved' },
  { orderNo: '251102AB7Z', platform: 'shopee', memberCode: 'YY-204518', fullName: 'มายด์ ใจดี', tierName: 'Buddy', phone: '0812344521', submittedAt: daysAgo(8, 13, 5), proofImageCount: 0, matchResult: 'matched', amountBaht: 780, status: 'approved' }
]

const GENERATED_MEMBERS = [
  { memberCode: 'YY-110245', fullName: 'พิมพ์ชนก รุ่งเรือง', tierName: 'Best Friend' },
  { memberCode: 'YY-120388', fullName: 'ธนพล ใจกว้าง', tierName: 'Family' },
  { memberCode: 'YY-131902', fullName: 'ศิริพร มีสุข', tierName: 'Buddy' },
  { memberCode: 'YY-142217', fullName: 'วรวุฒิ ทองดี', tierName: 'Family' },
  { memberCode: 'YY-155630', fullName: 'ณัฐธิดา แสงทอง', tierName: 'Buddy' },
  { memberCode: 'YY-166104', fullName: 'อนุชา พรหมมา', tierName: 'Best Friend' },
  { memberCode: 'YY-179955', fullName: 'กมลวรรณ ชื่นใจ', tierName: 'Buddy' },
  { memberCode: 'YY-183476', fullName: 'ภูมิ ศักดิ์ดี', tierName: 'Family' }
]

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
const PLATFORMS: MarketplacePlatform[] = ['shopee', 'shopee', 'shopee', 'lazada', 'tiktok']

// Deterministic so the list looks the same on every reload
function createSeededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function generateRows(status: MockOrder['status'], count: number, firstDay: number, spanDays: number, seed: number): SampleRow[] {
  const random = createSeededRandom(seed)
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!
  return Array.from({ length: count }, (_, index) => {
    const platform = pick(PLATFORMS)
    const member = pick(GENERATED_MEMBERS)
    const orderNo = platform === 'shopee'
      ? `2511${String(10 + index % 20).padStart(2, '0')}${Array.from({ length: 6 }, () => pick([...ALNUM])).join('')}`
      : platform === 'lazada'
        ? `10${String(Math.floor(random() * 1e8)).padStart(8, '0')}`
        : `57${String(Math.floor(random() * 1e7)).padStart(7, '0')}`
    const matchResult = status === 'rejected'
      ? pick(['not_in_file', 'duplicate', 'cancelled_in_file', 'returned_in_file'] as const)
      : status === 'pending_review' ? pick(['matched', 'matched', 'matched', 'not_in_file', 'amount_mismatch'] as const) : 'matched'
    return {
      orderNo,
      platform,
      ...member,
      phone: `08${String(Math.floor(random() * 1e8)).padStart(8, '0')}`,
      submittedAt: daysAgo(firstDay + Math.floor(random() * spanDays), 8 + Math.floor(random() * 14), Math.floor(random() * 60)),
      proofImageCount: random() < 0.6 ? 1 : 0,
      matchResult,
      duplicateOfMemberCode: matchResult === 'duplicate' ? pick(GENERATED_MEMBERS).memberCode : undefined,
      amountBaht: 200 + Math.floor(random() * 30) * 50,
      status
    }
  })
}

// Totals match the tab badges in the design: 24 pending, 18 waiting, 1,236 approved, 57 rejected
function createMockOrders(): MockOrder[] {
  return [
    ...DESIGN_ROWS,
    ...SEARCH_DESIGN_ROWS,
    ...generateRows('pending_review', 15, 2, 4, 11),
    ...generateRows('waiting_return_period', 17, 2, 12, 23),
    ...generateRows('approved', 1234, 7, 180, 37),
    ...generateRows('rejected', 57, 1, 90, 41),
    ...generateRows('cancelled', 3, 3, 30, 53)
  ]
    .map(toMockOrder)
    .sort((first, second) => second.submittedAt.localeCompare(first.submittedAt))
}

function matchesSearch(order: MockOrder, searchTerm: string) {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return true
  const digits = term.replace(/\D/g, '')
  return order.orderNo.toLowerCase().includes(term)
    || order.member.fullName.toLowerCase().includes(term)
    || order.member.memberCode.toLowerCase().includes(term)
    || (digits.length >= 3 && order.memberPhone.includes(digits))
}

function matchesFilters(order: MockOrder, filters: OrderReviewFilters, since: Date | null) {
  return (filters.tab === 'all' || order.status === filters.tab)
    && (filters.platform === 'all' || order.platform === filters.platform)
    && (filters.matchResult === 'all' || order.matchResult === filters.matchResult)
    && (!since || new Date(order.submittedAt) >= since)
    && matchesSearch(order, filters.searchTerm)
}

function toReviewItem({ memberPhone: _memberPhone, rejectionReason: _rejectionReason, ...order }: MockOrder): OrderReviewItem {
  return order
}

const simulatedLatency = () => new Promise(resolve => setTimeout(resolve, 150))

// Mock until the order-import tables and approval RPCs exist; must be real before the demo.
// Approve/reject change this in-memory list only, so they reset on reload.
export function createMockOrderRepository(): OrderRepository {
  const orders = createMockOrders()

  return {
    async searchOrders(searchTerm, limit) {
      const matches = orders.filter(order => matchesSearch(order, searchTerm))
      return {
        totalCount: matches.length,
        items: matches.slice(0, limit).map(order => ({
          id: order.id,
          orderNo: order.orderNo,
          platform: order.platform,
          memberName: order.member.fullName,
          submittedAt: order.submittedAt,
          status: order.status
        }))
      }
    },

    async listReviewOrders(filters, page, pageSize) {
      await simulatedLatency()
      const since = submittedSince(filters.submittedWithin)
      const matches = orders.filter(order => matchesFilters(order, filters, since))
      const start = (page - 1) * pageSize
      return { totalCount: matches.length, items: matches.slice(start, start + pageSize).map(toReviewItem) }
    },

    async countByStatus() {
      const counts: OrderStatusCounts = { pending_review: 0, waiting_return_period: 0, approved: 0, rejected: 0, cancelled: 0 }
      for (const order of orders) counts[order.status] += 1
      return counts
    },

    async getLatestFileImports() {
      return [
        { platform: 'shopee', importedAt: daysAgo(0, 8, 0) },
        { platform: 'lazada', importedAt: daysAgo(0, 8, 0) },
        { platform: 'tiktok', importedAt: daysAgo(1, 20, 0) }
      ]
    },

    // The real RPC will also hold orders still inside the return window in waiting_return_period
    async approveOrders(orderIds) {
      await simulatedLatency()
      let updatedCount = 0
      for (const order of orders) {
        if (!orderIds.includes(order.id)) continue
        if (order.status !== 'pending_review' || order.points === null) continue
        order.status = 'approved'
        updatedCount += 1
      }
      return { updatedCount, skippedCount: orderIds.length - updatedCount }
    },

    async rejectOrders(orderIds, reason) {
      await simulatedLatency()
      let updatedCount = 0
      for (const order of orders) {
        if (!orderIds.includes(order.id) || order.status !== 'pending_review') continue
        order.status = 'rejected'
        order.rejectionReason = reason
        updatedCount += 1
      }
      return { updatedCount, skippedCount: orderIds.length - updatedCount }
    }
  }
}
