<script setup lang="ts">
import type { OrderDateColumn, OrderReviewFilters } from '~/types/admin'

const filters = defineModel<OrderReviewFilters>({ required: true })

const props = defineProps<{
  column: OrderDateColumn
}>()

const isOpen = ref(false)

const dateRange = computed({
  get: () => effectiveOrderDateRange(filters.value, props.column),
  set: range => (filters.value = withOrderDateRange(filters.value, props.column, range))
})

const buttonLabel = computed(() => `${ORDER_DATE_COLUMN_LABELS[props.column]}: ${orderDateRangeLabel(dateRange.value)}`)
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align: 'start', sideOffset: 8, collisionPadding: 16 }"
    :ui="{ content: 'rounded-2xl shadow-xl ring-default' }"
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-calendar"
      trailing-icon="i-lucide-chevron-down"
      class="h-11 justify-between rounded-xl bg-white px-3.5 text-[15px] font-normal text-ink ring-[1.5px] xl:min-w-55"
      :ui="{ leadingIcon: 'size-5 text-ink', trailingIcon: 'size-5 text-ink' }"
    >
      <span class="flex-1 truncate text-left">{{ buttonLabel }}</span>
    </UButton>

    <template #content>
      <div class="w-[min(300px,calc(100vw-2rem))] p-3">
        <OrderDateRangeOptions
          v-model="dateRange"
          @preset-chosen="isOpen = false"
        />
      </div>
    </template>
  </UPopover>
</template>
