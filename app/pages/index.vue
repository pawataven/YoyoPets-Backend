<script setup lang="ts">
import type { DashboardPeriod } from '~/utils/dashboard-period'

useSeoMeta({ title: 'แดชบอร์ด · YoyoPet Admin' })

const DAY_MS = 24 * 60 * 60 * 1000

const route = useRoute()

// The selected period lives in the URL so it survives reloads and can be shared
const period = computed<DashboardPeriod>({
  get: () => periodFromQuery(route.query),
  set: next => navigateTo({ query: periodToQuery(next) }, { replace: true })
})

const isExportOpen = ref(false)

// Set on the client only, so the server and browser render the same text
const lastUpdatedAt = ref<Date | null>(null)
onMounted(() => {
  lastUpdatedAt.value = new Date()
})

const pageDescription = computed(() => {
  const overview = `ภาพรวมระบบสมาชิก ${periodDescription(period.value)}`
  return lastUpdatedAt.value ? `${overview} · อัปเดตล่าสุด ${formatThaiDateTime(lastUpdatedAt.value)}` : overview
})

const {
  memberCounts,
  periodData,
  recent,
  topSpenderMonth,
  hasMemberCountsError,
  hasPeriodError,
  hasRecentError
} = useDashboard(period)
const hasAnyError = computed(() => hasMemberCountsError.value || hasPeriodError.value || hasRecentError.value)

const shortPeriodLabel = computed(() => periodShortLabel(period.value))

const newMembersTrend = computed(() => {
  const joined = memberCounts.value?.joinedSince
  if (joined === undefined) return undefined
  return `+${joined.toLocaleString('th-TH')} ${newMembersSuffix(period.value)}`
})

const oldestPendingTrend = computed(() => {
  const oldest = periodData.value?.figures.oldestPendingOrderAt
  if (!oldest) return undefined
  const days = Math.max(0, Math.floor((Date.now() - new Date(oldest).getTime()) / DAY_MS))
  return days === 0 ? 'เก่าสุดวันนี้' : `เก่าสุด ${days} วัน`
})

const spendChange = computed(() => periodData.value?.figures.memberSpendChangePercent ?? null)
const spendTrend = computed(() => {
  if (spendChange.value === null) return undefined
  const arrow = spendChange.value >= 0 ? '▲' : '▼'
  return `${arrow} ${Math.abs(spendChange.value)}% ${comparisonLabel(period.value)}`
})

const topSpenderMonthName = computed(() => formatThaiMonthName(topSpenderMonth.value))
const topSpenderClosingNote = computed(() => {
  const now = new Date()
  const month = topSpenderMonth.value
  const isCurrentRound = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  if (!isCurrentRound) return month > now ? 'ยังไม่เริ่มรอบ' : 'ปิดรอบแล้ว'
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  return daysLeft === 0 ? 'ปิดรอบวันนี้' : `ปิดรอบใน ${daysLeft} วัน`
})
</script>

<template>
  <div>
    <AdminPageHeader
      :breadcrumbs="[{ label: 'หน้าแรก', to: '/' }, { label: 'แดชบอร์ด' }]"
      title="แดชบอร์ด"
      :description="pageDescription"
    >
      <template #actions>
        <DashboardPeriodPicker v-model="period" />

        <UButton
          icon="i-lucide-download"
          class="h-11 rounded-xl px-4 font-heading text-base font-normal"
          @click="isExportOpen = true"
        >
          ส่งออกรายงาน
        </UButton>
        <ReportExportDialog
          v-model:open="isExportOpen"
          :initial-from="period.from"
          :initial-to="period.to"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      v-if="hasAnyError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="โหลดข้อมูลแดชบอร์ดบางส่วนไม่สำเร็จ กรุณารีเฟรชหน้า"
      class="mt-6"
    />

    <div class="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 2xl:grid-cols-4">
      <DashboardStatCard
        label="สมาชิกทั้งหมด"
        icon="i-lucide-users"
        icon-class="bg-primary-soft text-primary-dark"
        :value="memberCounts?.total ?? null"
        :is-unavailable="hasMemberCountsError"
        unit="คน"
        :trend="newMembersTrend"
        trend-class="text-success"
      />
      <DashboardStatCard
        label="ออเดอร์รอตรวจ"
        icon="/images/back-office/feature-orders.svg"
        is-mask-icon
        icon-class="bg-gold-soft text-pending"
        :value="periodData?.figures.ordersToReview ?? null"
        unit="รายการ"
        :trend="oldestPendingTrend"
        trend-class="text-pending"
      />
      <DashboardStatCard
        :label="`ยอดซื้อจากสมาชิก (${shortPeriodLabel})`"
        icon="i-lucide-chart-column"
        icon-class="bg-primary-soft text-primary-dark"
        :value="periodData?.figures.memberSpendBaht ?? null"
        unit="บาท"
        :trend="spendTrend"
        :trend-class="(spendChange ?? 0) >= 0 ? 'text-success' : 'text-primary-dark'"
      />
      <DashboardStatCard
        :label="`แต้มที่ให้ / ถูกแลก (${shortPeriodLabel})`"
        icon="i-lucide-star"
        icon-class="bg-primary-soft text-primary-dark"
        :value="periodData?.figures.pointsIssued ?? null"
        unit="แต้ม"
        :trend="periodData ? `แลกไป ${periodData.figures.pointsRedeemed.toLocaleString('th-TH')}` : undefined"
      />
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <div class="min-w-0 md:col-span-2">
        <DashboardOrdersChart
          v-if="recent"
          :days="recent.dailyOrders"
          class="h-full"
        />
        <USkeleton
          v-else
          class="h-[440px] w-full rounded-2xl"
        />
      </div>
      <DashboardTodoCard
        :todos="recent?.todos ?? null"
        class="md:col-span-2 xl:col-span-1"
      />
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 md:grid-cols-2 2xl:grid-cols-3">
      <DashboardTopRewardsCard
        :rewards="periodData?.topRewards ?? null"
        :description="periodDescription(period)"
      />
      <DashboardTopSpenderCard
        :entries="periodData?.topSpenders ?? null"
        :month-name="topSpenderMonthName"
        :closing-note="topSpenderClosingNote"
      />
      <DashboardActivityCard
        :activity="recent?.activity ?? null"
        class="md:col-span-2 2xl:col-span-1"
      />
    </div>
  </div>
</template>
