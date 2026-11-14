import { createSupabaseAdminAccountRepository } from './admin-account.repository'
import { createMockAdminNotificationRepository } from './admin-notification.repository'
import { createMockDashboardRepository } from './dashboard.repository'
import { createSupabaseMemberRepository } from './member.repository'
import { createMockOrderRepository } from './order.repository'
import { createMockRedemptionRepository } from './redemption.repository'
import { createReportRepository } from './report.repository'
import { createMockWorkQueueRepository } from './work-queue.repository'

// Shared instances so the mocks remember changes between calls (read notifications, approved orders)
const mockAdminNotificationRepository = createMockAdminNotificationRepository()
const mockOrderRepository = createMockOrderRepository()
const mockWorkQueueRepository = createMockWorkQueueRepository(mockOrderRepository)

// Single switch point for the data source, same pattern as the member app.
// Mocks still in use (must be swapped before the client demo): adminNotification, workQueue, order, redemption,
// dashboard, and the sample rows in report (development builds only)
export function useRepositories() {
  const supabase = useSupabaseClient()
  const member = createSupabaseMemberRepository(supabase)
  return {
    adminAccount: createSupabaseAdminAccountRepository(supabase),
    member,
    adminNotification: mockAdminNotificationRepository,
    workQueue: mockWorkQueueRepository,
    order: mockOrderRepository,
    redemption: createMockRedemptionRepository(),
    dashboard: createMockDashboardRepository(),
    report: createReportRepository(member, import.meta.dev)
  }
}
