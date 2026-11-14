import type {
  DailyOrderSubmissions,
  DashboardPeriodFigures,
  DashboardTodo,
  TeamActivity,
  TopReward,
  TopSpenderEntry
} from '~/types/admin'
import type { DashboardPeriod } from '~/utils/dashboard-period'

export interface DashboardRepository {
  getPeriodFigures(period: DashboardPeriod): Promise<DashboardPeriodFigures>
  getDailyOrderSubmissions(days: number): Promise<DailyOrderSubmissions[]>
  getTodos(): Promise<DashboardTodo[]>
  getTopRewards(period: DashboardPeriod, limit: number): Promise<TopReward[]>
  // Top Spender runs in monthly rounds, so it takes the month rather than the selected period
  getTopSpenders(month: Date, limit: number): Promise<TopSpenderEntry[]>
  getRecentTeamActivity(limit: number): Promise<TeamActivity[]>
}

const DAY_MS = 24 * 60 * 60 * 1000

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysAgo(days: number, hour: number, minute: number) {
  const date = new Date(Date.now() - days * DAY_MS)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

// Deterministic so the chart looks the same on every reload (Figma 20:581 averages ~18 orders a day)
function mockDailyCount(dayIndex: number, min: number, spread: number, seed: number) {
  return min + Math.floor((Math.sin(dayIndex * 12.9898 + seed) * 43758.5453 % 1 + 1) % 1 * spread)
}

// Mock: everything here comes from Figma 20:581 sample data. Replace piece by piece as the orders,
// points, redemptions, coupon stock, Top Spender and activity-log tables are built; must be real before the demo.
export function createMockDashboardRepository(): DashboardRepository {
  return {
    async getPeriodFigures() {
      return {
        ordersToReview: 24,
        oldestPendingOrderAt: daysAgo(2, 22, 40),
        memberSpendBaht: 482350,
        memberSpendChangePercent: 12,
        pointsIssued: 5568,
        pointsRedeemed: 3900
      }
    },

    async getDailyOrderSubmissions(days) {
      const today = new Date()
      return Array.from({ length: days }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - index))
        return {
          date: localDateKey(date),
          shopee: mockDailyCount(index, 7, 7, 1),
          lazada: mockDailyCount(index, 2, 4, 2),
          tiktok: mockDailyCount(index, 2, 5, 3)
        }
      })
    },

    async getTodos() {
      return [
        { kind: 'review_orders', title: 'ตรวจเลขคำสั่งซื้อ', detail: '24 รายการ · เก่าสุด 8 พ.ย.' },
        { kind: 'pack_redemptions', title: 'แพ็กของรางวัลที่แลก', detail: '6 รายการรอแพ็ก' },
        { kind: 'restock_reward', title: 'สต็อกของรางวัลใกล้หมด', detail: 'ผงดับกลิ่น Lavender เหลือ 8' },
        { kind: 'refill_coupon_codes', title: 'เติมโค้ดคูปอง 50 บาท', detail: 'Shopee เหลือ 12 โค้ด' },
        { kind: 'close_top_spender', title: 'ปิดรอบ Top Spender พ.ย.', detail: 'ภายใน 30 พ.ย. 2026' }
      ]
    },

    async getTopRewards(_period, limit) {
      const rewards: TopReward[] = [
        { id: 'reward-coupon-50', name: 'คูปองส่วนลด 50 บาท', imageUrl: null, couponValueBaht: 50, redemptionCount: 42 },
        { id: 'reward-tofu-litter', name: 'ทรายเต้าหู้ YoYo Tofu 7 ลิตร', imageUrl: '/images/rewards/yoyo-tofu-litter-7l-thumb.png', couponValueBaht: null, redemptionCount: 18 },
        { id: 'reward-pet-wipes', name: 'ทิชชู่เปียก Pet Wipes 80 แผ่น', imageUrl: '/images/rewards/yoyo-pet-wipes-80-thumb.png', couponValueBaht: null, redemptionCount: 11 },
        { id: 'reward-spa-gloves', name: 'ถุงมือสปา Pet SPA Gloves', imageUrl: '/images/rewards/pet-spa-gloves-thumb.png', couponValueBaht: null, redemptionCount: 7 }
      ]
      return rewards.slice(0, limit)
    },

    async getTopSpenders(_month, limit) {
      const entries: TopSpenderEntry[] = [
        { rank: 1, memberName: 'พิมพ์ชนก รุ่งเรือง', spendBaht: 18920 },
        { rank: 2, memberName: 'นที วงศ์ใหญ่', spendBaht: 15300 },
        { rank: 3, memberName: 'กานต์ ศรีทอง', spendBaht: 12450 },
        { rank: 4, memberName: 'สมชาย ดีมาก', spendBaht: 9870 },
        { rank: 5, memberName: 'อรุณี แก้วใส', spendBaht: 8140 }
      ]
      return entries.slice(0, limit)
    },

    async getRecentTeamActivity(limit) {
      const activity: TeamActivity[] = [
        { id: 'activity-1', adminName: 'คุณบีม', occurredAt: daysAgo(0, 9, 12), description: 'อนุมัติ 15 ออเดอร์จากไฟล์ Lazada' },
        { id: 'activity-2', adminName: 'คุณต้น', occurredAt: daysAgo(1, 16, 40), description: 'ใส่เลขพัสดุ RW-2611-0042' },
        { id: 'activity-3', adminName: 'คุณฝน', occurredAt: daysAgo(2, 11, 5), description: 'ตั้งของรางวัล Top Spender พ.ย.' },
        { id: 'activity-4', adminName: 'คุณบีม', occurredAt: daysAgo(3, 14, 30), description: 'ปรับแต้ม +100 ให้ YY-100871' },
        { id: 'activity-5', adminName: 'คุณฝน', occurredAt: daysAgo(9, 10, 0), description: 'เปิดแบนเนอร์ YoYo For your Pet' }
      ]
      return activity.slice(0, limit)
    }
  }
}
