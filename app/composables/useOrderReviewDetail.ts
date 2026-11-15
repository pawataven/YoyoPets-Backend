import { useRepositories } from '~/repositories'

export function useOrderReviewDetail(orderId: Ref<string | null>) {
  const { order } = useRepositories()

  const { data: detail, status, refresh } = useAsyncData(
    () => `order-review-detail-${orderId.value ?? 'none'}`,
    () => (orderId.value ? order.getReviewOrder(orderId.value) : Promise.resolve(null)),
    { server: false }
  )

  return {
    detail,
    isLoading: computed(() => status.value === 'pending'),
    hasError: computed(() => status.value === 'error'),
    refresh,
    calculatePoints: (amountBaht: number, pointsMultiplier: number) => order.calculatePoints(amountBaht, pointsMultiplier)
  }
}
