import { useRepositories } from '~/repositories'

export function useWorkQueueCounts() {
  const { workQueue } = useRepositories()

  const { data: counts } = useAsyncData(
    'work-queue-counts',
    () => workQueue.getCounts(),
    { default: () => ({ ordersToReview: 0, redemptionsToShip: 0 }), server: false }
  )

  return { counts }
}
