<script setup lang="ts">
import type { OrderDateColumn, OrderReviewFilters } from '~/types/admin'

const filters = defineModel<OrderReviewFilters>({ required: true })

const props = withDefaults(defineProps<{
  column: OrderDateColumn
  reviewerOptions: { value: string, label: string }[] | null
  align?: 'start' | 'end'
}>(), {
  align: 'start'
})

const sort = computed({
  get: () => filters.value.sort,
  set: sort => (filters.value = { ...filters.value, sort })
})

const dateRange = computed({
  get: () => filters.value.dateRange,
  set: dateRange => (filters.value = { ...filters.value, dateRange })
})

const reviewerIds = computed({
  get: () => filters.value.reviewerIds,
  set: reviewerIds => (filters.value = { ...filters.value, reviewerIds })
})

// Only one date column carries the range at a time: the one the rows are sorted by (or the tab's own date)
const rangeColumn = computed(() => orderReviewDateColumn(filters.value))
const isRangeColumn = computed(() => rangeColumn.value === props.column)

const isFiltered = computed(() => (isRangeColumn.value && !isDefaultOrderDateRange(filters.value.dateRange))
  || (props.column === 'reviewed_at' && filters.value.reviewerIds.length > 0))
</script>

<template>
  <OrderColumnMenu
    v-model:sort="sort"
    :label="ORDER_DATE_COLUMN_LABELS[column]"
    :sort-key="column"
    :is-filtered="isFiltered"
    :align="align"
  >
    <template #default="{ close }">
      <div v-if="isRangeColumn">
        <p class="mb-2 text-[13px] font-bold text-muted">
          ช่วงวันที่
        </p>
        <OrderDateRangeOptions
          v-model="dateRange"
          @preset-chosen="close"
        />
      </div>
      <p
        v-else
        class="text-sm text-muted"
      >
        ตอนนี้ช่วงวันที่กรองด้วย "{{ ORDER_DATE_COLUMN_LABELS[rangeColumn] }}"
        เลือกเรียงตามคอลัมน์นี้ถ้าต้องการกรองด้วย "{{ ORDER_DATE_COLUMN_LABELS[column] }}"
      </p>

      <OrderCheckList
        v-if="column === 'reviewed_at'"
        v-model="reviewerIds"
        legend="ผู้ตรวจ"
        :options="reviewerOptions"
      />
    </template>
  </OrderColumnMenu>
</template>
