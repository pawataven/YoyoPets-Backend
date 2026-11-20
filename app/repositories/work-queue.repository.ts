import type { WorkQueueCounts } from '~/types/admin'
import type { OrderRepository } from './order.repository'

export interface WorkQueueRepository {
  getCounts(): Promise<WorkQueueCounts>
}

// Orders to review are real; the redemption count is still the Figma 20:155 sample until redemptions exist.
// Orders still expected in a file are left out: the next import settles them without anyone (auto review, 2026-11-18).
export function createWorkQueueRepository(order: OrderRepository): WorkQueueRepository {
  return {
    async getCounts() {
      return { ordersToReview: await order.countOrdersNeedingReview(), redemptionsToShip: 6 }
    }
  }
}
