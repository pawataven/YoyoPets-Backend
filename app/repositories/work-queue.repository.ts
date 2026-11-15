import type { WorkQueueCounts } from '~/types/admin'
import type { OrderRepository } from './order.repository'

export interface WorkQueueRepository {
  getCounts(): Promise<WorkQueueCounts>
}

// Orders to review are real; the redemption count is still the Figma 20:155 sample until redemptions exist
export function createWorkQueueRepository(order: OrderRepository): WorkQueueRepository {
  return {
    async getCounts() {
      const orderCounts = await order.countByStatus()
      return { ordersToReview: orderCounts.pending_review, redemptionsToShip: 6 }
    }
  }
}
