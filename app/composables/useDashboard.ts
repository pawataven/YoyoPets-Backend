import { useRepositories } from '~/repositories'
import type { DashboardPeriod } from '~/utils/dashboard-period'

const CHART_DAYS = 30
const LEADERBOARD_SIZE = 5
const TOP_REWARDS_SIZE = 4
const ACTIVITY_SIZE = 5

export function useDashboard(period: Ref<DashboardPeriod>) {
  const { member, dashboard } = useRepositories()
  const periodKey = computed(() => periodCacheKey(period.value))
  // Top Spender runs in monthly rounds: show the round the period ends in
  const topSpenderMonth = computed(() => {
    const lastDay = lastDayOfPeriod(period.value)
    return new Date(lastDay.getFullYear(), lastDay.getMonth(), 1)
  })

  // Member counts come from Supabase and the rest from other sources; one failing must not blank the others
  const { data: memberCounts, status: memberCountsStatus } = useAsyncData(
    () => `dashboard-member-counts-${periodKey.value}`,
    () => member.countMembers(period.value.from, period.value.to),
    { server: false }
  )

  const { data: periodData, status: periodStatus } = useAsyncData(
    () => `dashboard-period-${periodKey.value}`,
    async () => {
      const [figures, topRewards, topSpenders] = await Promise.all([
        dashboard.getPeriodFigures(period.value),
        dashboard.getTopRewards(period.value, TOP_REWARDS_SIZE),
        dashboard.getTopSpenders(topSpenderMonth.value, LEADERBOARD_SIZE)
      ])
      return { figures, topRewards, topSpenders }
    },
    { server: false }
  )

  // The chart, to-dos and activity feed always show the latest period, whatever period is selected
  const { data: recent, status: recentStatus } = useAsyncData(
    'dashboard-recent',
    async () => {
      const [dailyOrders, todos, activity] = await Promise.all([
        dashboard.getDailyOrderSubmissions(CHART_DAYS),
        dashboard.getTodos(),
        dashboard.getRecentTeamActivity(ACTIVITY_SIZE)
      ])
      return { dailyOrders, todos, activity }
    },
    { server: false }
  )

  return {
    memberCounts,
    periodData,
    recent,
    topSpenderMonth,
    hasMemberCountsError: computed(() => memberCountsStatus.value === 'error'),
    hasPeriodError: computed(() => periodStatus.value === 'error'),
    hasRecentError: computed(() => recentStatus.value === 'error')
  }
}
