<script setup lang="ts">
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import type { DashboardPeriod, DashboardPeriodPreset } from '~/utils/dashboard-period'

// Period picker design (shared as an image, 2026-11-14)
const period = defineModel<DashboardPeriod>({ required: true })

// en-GB gives day/month/year with the Gregorian year; th-TH would show the Buddhist year (2569)
const DATE_FIELD_LOCALE = 'en-GB'

const isOpen = ref(false)
const customFirstDay = shallowRef<CalendarDate | undefined>()
const customLastDay = shallowRef<CalendarDate | undefined>()
const latestSelectableDay = today(getLocalTimeZone())

function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function toDate(calendarDate: CalendarDate) {
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
}

// The custom fields start from whatever is selected, so editing one end keeps the other
watch(isOpen, (open) => {
  if (!open) return
  customFirstDay.value = toCalendarDate(period.value.from)
  customLastDay.value = toCalendarDate(lastDayOfPeriod(period.value))
})

const customRangeError = computed(() => {
  if (!customFirstDay.value || !customLastDay.value) return null
  return customFirstDay.value.compare(customLastDay.value) > 0 ? 'วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด' : null
})

function choosePreset(kind: DashboardPeriodPreset) {
  period.value = resolvePresetPeriod(kind)
  isOpen.value = false
}

// Applied as soon as both dates are valid; the design has no confirm button
watch([customFirstDay, customLastDay], ([firstDay, lastDay]) => {
  if (!isOpen.value || !firstDay || !lastDay || customRangeError.value) return
  const next = customPeriod(toDate(firstDay), toDate(lastDay))
  if (periodCacheKey(next) === periodCacheKey(period.value)) return
  period.value = next
})
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align: 'end', sideOffset: 8, collisionPadding: 16 }"
    :ui="{ content: 'rounded-2xl shadow-xl ring-default' }"
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-calendar"
      class="h-11 rounded-xl bg-white px-4 text-base font-bold text-ink ring-[1.5px]"
    >
      {{ periodButtonLabel(period) }}
    </UButton>

    <template #content>
      <div class="w-[min(300px,calc(100vw-2rem))] py-2">
        <ul
          class="flex flex-col gap-1 px-2"
          aria-label="ช่วงเวลาสำเร็จรูป"
        >
          <li
            v-for="preset in DASHBOARD_PERIOD_PRESETS"
            :key="preset"
          >
            <button
              type="button"
              class="flex h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-[15px] transition-colors"
              :class="period.kind === preset
                ? 'bg-primary-soft font-bold text-primary-dark'
                : 'text-ink hover:bg-cream'"
              :aria-pressed="period.kind === preset"
              @click="choosePreset(preset)"
            >
              {{ periodOptionLabel(preset) }}
              <UIcon
                v-if="period.kind === preset"
                name="i-lucide-check"
                class="size-5 shrink-0"
              />
            </button>
          </li>
        </ul>

        <div class="mx-4 my-2 border-t border-default" />

        <fieldset class="px-4 pt-1 pb-3">
          <legend class="text-[13px] font-bold text-muted">
            กำหนดเอง
            <span
              v-if="period.kind === 'custom'"
              class="text-primary-dark"
            > · ใช้อยู่</span>
          </legend>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <UInputDate
              v-model="customFirstDay"
              :locale="DATE_FIELD_LOCALE"
              :max-value="latestSelectableDay"
              aria-label="วันเริ่มต้น"
              :ui="{ base: 'h-12 rounded-xl px-3 ring-[1.5px]' }"
            />
            <UInputDate
              v-model="customLastDay"
              :locale="DATE_FIELD_LOCALE"
              :max-value="latestSelectableDay"
              aria-label="วันสิ้นสุด"
              :ui="{ base: 'h-12 rounded-xl px-3 ring-[1.5px]' }"
            />
          </div>
          <p
            v-if="customRangeError"
            class="mt-2 text-[13px] text-primary-dark"
            role="alert"
          >
            {{ customRangeError }}
          </p>
        </fieldset>
      </div>
    </template>
  </UPopover>
</template>
