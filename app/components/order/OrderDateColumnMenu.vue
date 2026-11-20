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
  get: () => effectiveOrderDateRange(filters.value, props.column),
  set: range => (filters.value = withOrderDateRange(filters.value, props.column, range))
})

const reviewerIds = computed({
  get: () => filters.value.reviewerIds,
  set: reviewerIds => (filters.value = { ...filters.value, reviewerIds })
})

const isFiltered = computed(() => isOrderDateRangeFiltered(filters.value, props.column)
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
      <div>
        <p class="mb-2 text-[13px] font-bold text-muted">
          ช่วงวันที่
        </p>
        <OrderDateRangeOptions
          v-model="dateRange"
          @preset-chosen="close"
        />
      </div>

      <OrderCheckList
        v-if="column === 'reviewed_at'"
        v-model="reviewerIds"
        legend="ผู้ตรวจ"
        :options="reviewerOptions"
      />
    </template>
  </OrderColumnMenu>
</template>
