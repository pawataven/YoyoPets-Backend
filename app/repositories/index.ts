import { createSupabaseAdminAccountRepository } from './admin-account.repository'
import { createMockAdminNotificationRepository } from './admin-notification.repository'
import { createMockDashboardRepository } from './dashboard.repository'
import { createSupabaseMemberRepository } from './member.repository'
import { createSupabaseOrderRepository } from './order.repository'
import { createSupabaseOrderImportRepository } from './order-import.repository'
import { createMockRedemptionRepository } from './redemption.repository'
import { createReportRepository } from './report.repository'
import { createWorkQueueRepository } from './work-queue.repository'

// Shared instance so the mock remembers which notifications were read between calls
const mockAdminNotificationRepository = createMockAdminNotificationRepository()

// Single switch point for the data source, same pattern as the member app.
// Mocks still in use (must be swapped before the client demo): adminNotification, redemption (and the redemption
// count in workQueue), dashboard, and the sample rows in report (development builds only)
export function useRepositories() {
  const supabase = useSupabaseClient()
  const member = createSupabaseMemberRepository(supabase)
  const order = createSupabaseOrderRepository(supabase)
  return {
    adminAccount: createSupabaseAdminAccountRepository(supabase),
    member,
    adminNotification: mockAdminNotificationRepository,
    workQueue: createWorkQueueRepository(order),
    order,
    orderImport: createSupabaseOrderImportRepository(supabase),
    redemption: createMockRedemptionRepository(),
    dashboard: createMockDashboardRepository(),
    report: createReportRepository(member, import.meta.dev)
  }
}
