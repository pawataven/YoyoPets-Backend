import type { AdminNotification } from '~/types/admin'

export interface AdminNotificationRepository {
  getRecentNotifications(): Promise<AdminNotification[]>
  markAsRead(notificationIds: string[]): Promise<void>
  markAllAsRead(): Promise<void>
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR_MS).toISOString()
}

// Mock: sample data from Figma node 20:155. Replace with a Supabase implementation once orders,
// redemptions, reward stock and coupon-code tables exist; must be real before the client demo.
export function createMockAdminNotificationRepository(): AdminNotificationRepository {
  let notifications: AdminNotification[] = [
    { id: 'notification-orders', kind: 'orders_pending', title: 'ออเดอร์รอตรวจ 24 รายการ', detail: 'เก่าสุดส่งเมื่อ 8 พ.ย. 22:40', createdAt: new Date(Date.now() - 5 * MINUTE_MS).toISOString(), isRead: false },
    { id: 'notification-redemptions', kind: 'redemptions_requested', title: 'คำขอแลกสินค้าใหม่ 2 รายการ', detail: 'ทรายเต้าหู้ YoYo Tofu 7 ลิตร, ถุงมือสปา', createdAt: hoursAgo(1), isRead: false },
    { id: 'notification-stock', kind: 'reward_stock_low', title: 'ผงดับกลิ่นทรายแมว Lavender เหลือ 8 ชิ้น', detail: 'ต่ำกว่าจุดแจ้งเตือนที่ตั้งไว้ 10 ชิ้น', createdAt: hoursAgo(3), isRead: false },
    { id: 'notification-coupons', kind: 'coupon_codes_low', title: 'โค้ดส่วนลด 50 บาท (Shopee) เหลือ 12 โค้ด', detail: 'นำเข้าโค้ดเพิ่มก่อนหมด', createdAt: new Date(Date.now() - DAY_MS).toISOString(), isRead: true },
    { id: 'notification-import', kind: 'order_import_finished', title: 'นำเข้าไฟล์ Lazada สำเร็จ', detail: 'อนุมัติอัตโนมัติ 15 รายการ · ต้องตรวจเอง 4', createdAt: new Date(Date.now() - DAY_MS - 2 * HOUR_MS).toISOString(), isRead: true },
    { id: 'notification-top-spender', kind: 'top_spender_closing', title: 'Top Spender พ.ย. จะปิดรอบใน 20 วัน', detail: 'ตั้งค่าของรางวัลเดือนนี้แล้ว', createdAt: new Date(Date.now() - 2 * DAY_MS).toISOString(), isRead: true }
  ]

  return {
    async getRecentNotifications() {
      return notifications
    },

    async markAsRead(notificationIds) {
      notifications = notifications.map(notification =>
        notificationIds.includes(notification.id) ? { ...notification, isRead: true } : notification
      )
    },

    async markAllAsRead() {
      notifications = notifications.map(notification => ({ ...notification, isRead: true }))
    }
  }
}
