import type { WorkQueueCounts } from '~/types/admin'
import type { OrderRepository } from './order.repository'

export interface WorkQueueRepository {
  getCounts(): Promise<WorkQueueCounts>
}

// Mock: the order count follows the (mock) order repository so approving updates the sidebar badge;
// the redemption count is the Figma 20:155 sample. Must be real before the client demo.
export function createMockWorkQueueRepository(order: OrderRepository): WorkQueueRepository {
  return {
    async getCounts() {
      const orderCounts = await order.countByStatus()
      return { ordersToReview: orderCounts.pending_review, redemptionsToShip: 6 }
    }
  }
}
