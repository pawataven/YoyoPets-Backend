<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

// Shows the date as "1 พ.ย. 2026" (export dialog design) and picks it from a calendar
const date = defineModel<Date>({ required: true })

const props = defineProps<{
  label: string
  min?: Date
  max?: Date
}>()

// Thai month names with the Gregorian year; plain th-TH would show 2569
const CALENDAR_LOCALE = 'th-TH-u-ca-gregory'

const isOpen = ref(false)

function toCalendarDate(value: Date) {
  return new CalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate())
}

const calendarValue = computed({
  get: () => toCalendarDate(date.value),
  set: (value: CalendarDate | undefined) => {
    if (!value) return
    date.value = new Date(value.year, value.month - 1, value.day)
    isOpen.value = false
  }
})

const minValue = computed(() => (props.min ? toCalendarDate(props.min) : undefined))
const maxValue = computed(() => (props.max ? toCalendarDate(props.max) : undefined))
const displayText = computed(() => formatThaiDayMonth(date.value.toISOString()) + ` ${date.value.getFullYear()}`)
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align: 'start', sideOffset: 6, collisionPadding: 16 }"
    :ui="{ content: 'rounded-2xl p-3 shadow-xl ring-default' }"
  >
    <button
      type="button"
      class="flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-4 text-left text-base text-ink ring-[1.5px] ring-accented ring-inset transition-shadow hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      :aria-label="`${label}: ${displayText}`"
    >
      {{ displayText }}
      <UIcon
        name="i-lucide-calendar"
        class="size-5 shrink-0 text-muted"
      />
    </button>

    <template #content>
      <UCalendar
        v-model="calendarValue"
        :locale="CALENDAR_LOCALE"
        :min-value="minValue"
        :max-value="maxValue"
      />
    </template>
  </UPopover>
</template>
