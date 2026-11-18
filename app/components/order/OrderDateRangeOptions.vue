<script setup lang="ts">
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import type { OrderDatePreset, OrderDateRange } from '~/types/admin'

// Same look as DashboardPeriodPicker: presets, then two day fields that apply as soon as both are valid
const range = defineModel<OrderDateRange>({ required: true })

const emit = defineEmits<{
  presetChosen: []
}>()

// en-GB gives day/month/year with the Gregorian year; th-TH would show the Buddhist year (2569)
const DATE_FIELD_LOCALE = 'en-GB'

const latestSelectableDay = today(getLocalTimeZone())

function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function toIsoDayFromCalendar(calendarDate: CalendarDate) {
  return toIsoDay(new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day))
}

// The fields start from the range in use, so editing one end keeps the other
const { since, until } = orderDateBounds(range.value)
const customFirstDay = shallowRef<CalendarDate | undefined>(toCalendarDate(since ?? new Date()))
const customLastDay = shallowRef<CalendarDate | undefined>(toCalendarDate(until ? new Date(until.getTime() - 1) : new Date()))

const customRangeError = computed(() => {
  if (!customFirstDay.value || !customLastDay.value) return null
  return customFirstDay.value.compare(customLastDay.value) > 0 ? 'วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด' : null
})

function isPresetInUse(preset: OrderDatePreset) {
  return 'preset' in range.value && range.value.preset === preset
}

function choosePreset(preset: OrderDatePreset) {
  range.value = { preset }
  emit('presetChosen')
}

watch([customFirstDay, customLastDay], ([firstDay, lastDay]) => {
  if (!firstDay || !lastDay || customRangeError.value) return
  const from = toIsoDayFromCalendar(firstDay)
  const to = toIsoDayFromCalendar(lastDay)
  if ('from' in range.value && range.value.from === from && range.value.to === to) return
  range.value = { from, to }
})
</script>

<template>
  <div>
    <ul
      class="flex flex-col gap-1"
      aria-label="ช่วงเวลาสำเร็จรูป"
    >
      <li
        v-for="option in ORDER_DATE_PRESET_OPTIONS"
        :key="option.value"
      >
        <button
          type="button"
          class="flex h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[15px] transition-colors"
          :class="isPresetInUse(option.value) ? 'bg-primary-soft font-bold text-primary-dark' : 'text-ink hover:bg-cream'"
          :aria-pressed="isPresetInUse(option.value)"
          @click="choosePreset(option.value)"
        >
          {{ option.label }}
          <UIcon
            v-if="isPresetInUse(option.value)"
            name="i-lucide-check"
            class="size-5 shrink-0"
          />
        </button>
      </li>
    </ul>

    <fieldset class="mt-3 border-t border-default pt-3">
      <legend class="sr-only">
        กำหนดเอง
      </legend>
      <p
        aria-hidden="true"
        class="text-[13px] font-bold text-muted"
      >
        กำหนดเอง
        <span
          v-if="'from' in range"
          class="text-primary-dark"
        > · ใช้อยู่</span>
      </p>
      <div class="mt-2 grid grid-cols-2 gap-3">
        <UInputDate
          v-model="customFirstDay"
          :locale="DATE_FIELD_LOCALE"
          :max-value="latestSelectableDay"
          aria-label="วันเริ่มต้น"
          :ui="{ base: 'h-11 rounded-xl px-3 ring-[1.5px]' }"
        />
        <UInputDate
          v-model="customLastDay"
          :locale="DATE_FIELD_LOCALE"
          :max-value="latestSelectableDay"
          aria-label="วันสิ้นสุด"
          :ui="{ base: 'h-11 rounded-xl px-3 ring-[1.5px]' }"
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
