<script setup lang="ts">
import type { OrderReviewTab, OrderStatusCounts } from '~/types/admin'

const selectedTab = defineModel<OrderReviewTab>({ required: true })

defineProps<{
  counts: OrderStatusCounts | null
}>()
</script>

<template>
  <div class="overflow-x-auto border-b border-default">
    <div
      role="tablist"
      aria-label="สถานะคำสั่งซื้อ"
      class="flex min-w-max gap-8"
    >
      <button
        v-for="tab in ORDER_REVIEW_TABS"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="selectedTab === tab.value"
        class="-mb-px flex items-center gap-2 border-b-[3px] pt-1 pb-3 text-base transition-colors"
        :class="selectedTab === tab.value
          ? 'border-primary font-bold text-primary-dark'
          : 'border-transparent text-muted hover:text-ink'"
        @click="selectedTab = tab.value"
      >
        {{ tab.label }}
        <span
          v-if="tab.value !== 'all' && counts"
          class="flex h-5 min-w-7 items-center justify-center rounded-full px-2 font-number text-[13px] font-bold"
          :class="selectedTab === tab.value ? 'bg-primary text-white' : 'bg-neutral-soft text-muted'"
        >
          {{ counts[tab.value].toLocaleString('th-TH') }}
        </span>
      </button>
    </div>
  </div>
</template>
