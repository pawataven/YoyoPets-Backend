import { useRepositories } from '~/repositories'
import type { OrderReviewFilters } from '~/types/admin'

export function useOrderReview(filters: Ref<OrderReviewFilters>, page: Ref<number>) {
  const { order } = useRepositories()

  const { data: orderPage, status: orderPageStatus, refresh: refreshOrderPage } = useAsyncData(
    () => `order-review-${JSON.stringify(filters.value)}-${page.value}`,
    () => order.listReviewOrders(filters.value, page.value, ORDER_REVIEW_PAGE_SIZE),
    { server: false }
  )

  const { data: overview, refresh: refreshOverview } = useAsyncData(
    'order-review-overview',
    async () => {
      const [statusCounts, latestImports] = await Promise.all([order.countByStatus(), order.getLatestFileImports()])
      return { statusCounts, latestImports }
    },
    { server: false }
  )

  async function refreshAfterChange() {
    await Promise.all([refreshOrderPage(), refreshOverview(), refreshNuxtData('work-queue-counts')])
  }

  async function approveOrders(orderIds: string[]) {
    const result = await order.approveOrders(orderIds)
    await refreshAfterChange()
    return result
  }

  async function rejectOrders(orderIds: string[], reason: string) {
    const result = await order.rejectOrders(orderIds, reason)
    await refreshAfterChange()
    return result
  }

  return {
    orderPage,
    overview,
    isLoadingOrders: computed(() => orderPageStatus.value === 'pending'),
    hasOrdersError: computed(() => orderPageStatus.value === 'error'),
    approveOrders,
    rejectOrders
  }
}
