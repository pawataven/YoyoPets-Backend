<script setup lang="ts">
import type { DailyOrderSubmissions } from '~/types/admin'

const props = defineProps<{
  days: DailyOrderSubmissions[]
}>()

const AXIS_STEP = 10
const LABEL_EVERY_DAYS = 5
const PLOT_HEIGHT_PX = 268

// Stack order bottom to top and colours follow Figma 20:581
const SERIES = [
  { key: 'shopee', label: 'Shopee', class: 'bg-primary' },
  { key: 'lazada', label: 'Lazada', class: 'bg-lazada' },
  { key: 'tiktok', label: 'TikTok Shop', class: 'bg-tiktok' }
] as const

const isTableView = ref(false)
const hoveredIndex = ref<number | null>(null)

function dayTotal(day: DailyOrderSubmissions) {
  return day.shopee + day.lazada + day.tiktok
}

function parseLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

const totalOrders = computed(() => props.days.reduce((sum, day) => sum + dayTotal(day), 0))

const axisMax = computed(() => {
  const highestDay = Math.max(0, ...props.days.map(dayTotal))
  return Math.max(AXIS_STEP * 4, Math.ceil(highestDay / AXIS_STEP) * AXIS_STEP)
})

const axisTicks = computed(() =>
  Array.from({ length: axisMax.value / AXIS_STEP + 1 }, (_, index) => axisMax.value - index * AXIS_STEP)
)

function segmentHeightPx(count: number) {
  return (count / axisMax.value) * PLOT_HEIGHT_PX
}

function shortDate(dateKey: string) {
  return formatThaiDayMonth(parseLocalDate(dateKey).toISOString())
}

function fullDate(dateKey: string) {
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }).format(parseLocalDate(dateKey))
}

// Every 5th day counting back from today, so the last bar is always labelled
function isLabelledDay(index: number) {
  return (props.days.length - 1 - index) % LABEL_EVERY_DAYS === 0
}

const hoveredDay = computed(() => (hoveredIndex.value === null ? null : props.days[hoveredIndex.value] ?? null))
// The tooltip sits left of the bar near the right edge, otherwise right of it
const isTooltipOnLeft = computed(() => hoveredIndex.value !== null && hoveredIndex.value > props.days.length / 2)
</script>

<template>
  <DashboardCard
    title="เลขคำสั่งซื้อที่สมาชิกส่งเข้ามา"
    stack-actions-on-mobile
    :description="`${days.length} วันล่าสุด · แยกตามช่องทาง · รวม ${totalOrders.toLocaleString('th-TH')} รายการ`"
  >
    <template #actions>
      <div class="flex flex-col gap-2 sm:items-end">
        <ul
          class="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6"
          aria-label="คำอธิบายสี"
        >
          <li
            v-for="series in SERIES"
            :key="series.key"
            class="flex items-center gap-2 text-sm text-ink"
          >
            <span
              class="size-3.5 rounded-[4px]"
              :class="series.class"
            />
            {{ series.label }}
          </li>
        </ul>
        <button
          type="button"
          class="self-start text-sm font-bold text-primary-dark hover:underline sm:self-end"
          :aria-pressed="isTableView"
          @click="isTableView = !isTableView"
        >
          {{ isTableView ? 'ดูเป็นกราฟ ›' : 'ดูเป็นตาราง ›' }}
        </button>
      </div>
    </template>

    <div
      v-if="isTableView"
      class="mt-3 max-h-[320px] overflow-auto rounded-xl border border-default"
    >
      <table class="w-full min-w-[420px] text-sm">
        <thead class="sticky top-0 bg-cream text-left text-muted">
          <tr>
            <th class="px-4 py-2 font-bold">
              วันที่
            </th>
            <th
              v-for="series in SERIES"
              :key="series.key"
              class="px-4 py-2 text-right font-bold"
            >
              {{ series.label }}
            </th>
            <th class="px-4 py-2 text-right font-bold">
              รวม
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="day in [...days].reverse()"
            :key="day.date"
            class="border-t border-default"
          >
            <td class="px-4 py-2 text-ink">
              {{ fullDate(day.date) }}
            </td>
            <td
              v-for="series in SERIES"
              :key="series.key"
              class="px-4 py-2 text-right font-number text-ink"
            >
              {{ day[series.key] }}
            </td>
            <td class="px-4 py-2 text-right font-number font-bold text-ink">
              {{ dayTotal(day) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-else
      class="mt-3 flex gap-2 sm:gap-3"
    >
      <div
        class="relative flex flex-col justify-between text-right font-number text-[13px] text-muted"
        :style="{ height: `${PLOT_HEIGHT_PX}px` }"
        aria-hidden="true"
      >
        <span
          v-for="tick in axisTicks"
          :key="tick"
          class="-my-2 leading-4"
        >{{ tick }}</span>
      </div>

      <div class="relative min-w-0 flex-1">
        <div
          class="relative"
          :style="{ height: `${PLOT_HEIGHT_PX}px` }"
          role="img"
          :aria-label="`กราฟแท่งจำนวนเลขคำสั่งซื้อรายวัน ${days.length} วัน รวม ${totalOrders} รายการ ดูตัวเลขได้จากปุ่มดูเป็นตาราง`"
          @mouseleave="hoveredIndex = null"
        >
          <div
            v-for="(tick, index) in axisTicks"
            :key="tick"
            class="absolute inset-x-0 h-px"
            :class="index === axisTicks.length - 1 ? 'bg-chart-axis' : 'bg-chart-grid'"
            :style="{ top: `${(index / (axisTicks.length - 1)) * 100}%` }"
          />

          <!-- Bars shrink with the card (18px at the design width) so all 30 days fit on a phone -->
          <div class="absolute inset-0 flex items-end justify-between px-0.5 sm:px-1">
            <div
              v-for="(day, index) in days"
              :key="day.date"
              class="relative flex h-full min-w-0 flex-1 items-end justify-center px-px sm:px-0.5"
              @mouseenter="hoveredIndex = index"
              @click="hoveredIndex = index"
            >
              <div
                v-if="hoveredIndex === index"
                class="absolute inset-y-0 left-1/2 w-full max-w-[26px] -translate-x-1/2 rounded-md bg-ink/5"
              />
              <div class="relative flex w-full max-w-[18px] flex-col-reverse overflow-hidden rounded-t-[3px] sm:rounded-t-[4px]">
                <div
                  v-for="series in SERIES"
                  :key="series.key"
                  :class="series.class"
                  :style="{ height: `${segmentHeightPx(day[series.key])}px` }"
                />
              </div>
            </div>
          </div>

          <div
            v-if="hoveredDay"
            class="pointer-events-none absolute top-2 z-10 w-[min(221px,80%)] rounded-xl border border-default bg-white px-4 py-3 shadow-lg"
            :style="isTooltipOnLeft
              ? { right: `min(calc(${100 - ((hoveredIndex! + 0.5) / days.length) * 100}% + 20px), calc(100% - min(221px, 80%)))` }
              : { left: `min(calc(${((hoveredIndex! + 0.5) / days.length) * 100}% + 20px), calc(100% - min(221px, 80%)))` }"
          >
            <p class="text-sm font-bold text-ink">
              {{ fullDate(hoveredDay.date) }} · รวม {{ dayTotal(hoveredDay) }}
            </p>
            <dl class="mt-2 flex flex-col gap-1.5">
              <div
                v-for="series in SERIES"
                :key="series.key"
                class="flex items-center gap-2 text-[13px] text-ink"
              >
                <span
                  class="size-2.5 rounded-[3px]"
                  :class="series.class"
                />
                <dt class="flex-1">
                  {{ series.label }}
                </dt>
                <dd class="font-number text-sm font-bold">
                  {{ hoveredDay[series.key] }}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div
          class="mt-2 flex justify-between px-0.5 text-[11px] text-muted sm:px-1 sm:text-xs"
          aria-hidden="true"
        >
          <!-- Labels may overflow their narrow day column; they are centred on it and spaced 5 days apart -->
          <span
            v-for="(day, index) in days"
            :key="day.date"
            class="flex min-w-0 flex-1 justify-center whitespace-nowrap"
          ><span v-if="isLabelledDay(index)">{{ shortDate(day.date) }}</span></span>
        </div>
      </div>
    </div>
  </DashboardCard>
</template>
