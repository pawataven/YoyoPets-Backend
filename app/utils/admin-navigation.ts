import type { WorkQueueCounts } from '~/types/admin'

export interface AdminNavItem {
  label: string
  to: string
  // Lucide icon name, or a public SVG used as a mask when Lucide has no matching icon
  icon: string
  isMaskIcon?: boolean
  badgeCount?: keyof WorkQueueCounts
}

export interface AdminNavGroup {
  label: string | null
  items: AdminNavItem[]
}

// Order and wording follow Figma node 20:155
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: null,
    items: [{ label: 'แดชบอร์ด', to: '/', icon: 'i-lucide-layout-grid' }]
  },
  {
    label: 'งานประจำวัน',
    items: [
      { label: 'ตรวจเลขออเดอร์', to: '/orders', icon: '/images/back-office/feature-orders.svg', isMaskIcon: true, badgeCount: 'ordersToReview' },
      { label: 'การแลกและจัดส่ง', to: '/redemptions', icon: 'i-lucide-truck', badgeCount: 'redemptionsToShip' }
    ]
  },
  {
    label: 'สมาชิกและสิทธิ์',
    items: [
      { label: 'สมาชิก', to: '/members', icon: 'i-lucide-users' },
      { label: 'ของรางวัล', to: '/rewards', icon: 'i-lucide-gift' },
      { label: 'คูปอง', to: '/coupons', icon: 'i-lucide-ticket' },
      { label: 'Top Spender', to: '/top-spender', icon: 'i-lucide-trophy' }
    ]
  },
  {
    label: 'หน้าเว็บ',
    items: [
      { label: 'แบนเนอร์และเนื้อหา', to: '/content', icon: 'i-lucide-image' },
      { label: 'แจ้งเตือน', to: '/member-notifications', icon: 'i-lucide-bell' }
    ]
  },
  {
    label: 'ระบบ',
    items: [{ label: 'ตั้งค่า', to: '/settings', icon: 'i-lucide-settings' }]
  }
]

// Pages that exist only as "coming soon" placeholders until their systems are built
export const PLACEHOLDER_PAGE_TITLES: Record<string, string> = {
  ...Object.fromEntries(ADMIN_NAV_GROUPS.flatMap(group => group.items).map(item => [item.to, item.label])),
  '/alerts': 'การแจ้งเตือนทั้งหมด',
  // Destinations of the profile dropdown (Figma 20:306)
  '/account': 'บัญชีของฉัน',
  '/account/password': 'เปลี่ยนรหัสผ่าน',
  '/account/security': 'ยืนยันตัวตน 2 ขั้นตอน',
  '/search': 'ผลการค้นหา',
  '/activity': 'กิจกรรมของทีม'
}

// Detail pages opened from search results, e.g. /orders/<id>
const PLACEHOLDER_DETAIL_TITLES: Record<string, string> = {
  '/members/': 'ข้อมูลสมาชิก',
  '/redemptions/': 'รายละเอียดการแลกของรางวัล'
}

export function placeholderPageTitle(path: string) {
  const exactTitle = PLACEHOLDER_PAGE_TITLES[path]
  if (exactTitle) return exactTitle
  const detailPrefix = Object.keys(PLACEHOLDER_DETAIL_TITLES).find(prefix => path.startsWith(prefix))
  return detailPrefix ? PLACEHOLDER_DETAIL_TITLES[detailPrefix]! : PLACEHOLDER_PAGE_TITLES[path] ?? null
}

export function isAdminNavItemActive(currentPath: string, to: string) {
  return to === '/' ? currentPath === '/' : currentPath === to || currentPath.startsWith(`${to}/`)
}
