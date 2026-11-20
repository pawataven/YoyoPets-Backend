<script setup lang="ts">
import type { OrderDateColumn, OrderReviewItem } from '~/types/admin'

defineProps<{
  order: OrderReviewItem
  column: OrderDateColumn
  // The date the rows are sorted by stands out so the eye can follow the order
  isSortColumn: boolean
}>()
</script>

<template>
  <span
    v-if="column === 'submitted_at'"
    :class="isSortColumn ? 'font-bold text-ink' : 'text-muted'"
  >
    {{ formatThaiDayMonthTime(order.submittedAt) }}
  </span>
  <span
    v-else-if="order.reviewedAt"
    class="block"
  >
    <span
      class="block"
      :class="isSortColumn ? 'font-bold text-ink' : 'text-muted'"
    >
      {{ formatThaiDayMonthTime(order.reviewedAt) }}
    </span>
    <span class="block max-w-40 truncate text-[13px] text-muted">
      โดย {{ orderReviewerName(order) }}
    </span>
  </span>
  <span
    v-else
    class="text-dimmed"
    aria-label="ยังไม่ได้ตรวจ"
  >–</span>
</template>
