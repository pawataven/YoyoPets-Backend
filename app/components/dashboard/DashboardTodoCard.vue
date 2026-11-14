<script setup lang="ts">
import type { DashboardTodo, DashboardTodoKind } from '~/types/admin'

defineProps<{
  todos: DashboardTodo[] | null
}>()

interface TodoStyle {
  icon: string
  isMaskIcon?: boolean
  iconClass: string
  to: string
}

// Icon tiles from Figma 20:581: pink for orders and stock, gold for packing and coupons, grey for Top Spender
const TODO_STYLES: Record<DashboardTodoKind, TodoStyle> = {
  review_orders: { icon: '/images/back-office/feature-orders.svg', isMaskIcon: true, iconClass: 'bg-primary-soft text-primary-dark', to: '/orders' },
  pack_redemptions: { icon: 'i-lucide-package', iconClass: 'bg-gold-soft text-pending', to: '/redemptions' },
  restock_reward: { icon: 'i-lucide-circle-alert', iconClass: 'bg-primary-soft text-primary-dark', to: '/rewards' },
  refill_coupon_codes: { icon: 'i-lucide-ticket', iconClass: 'bg-gold-soft text-pending', to: '/coupons' },
  close_top_spender: { icon: 'i-lucide-trophy', iconClass: 'bg-neutral-soft text-muted', to: '/top-spender' }
}
</script>

<template>
  <DashboardCard
    title="งานที่ต้องทำ"
    description="เรียงตามความเร่งด่วน"
  >
    <div
      v-if="!todos"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="placeholder in 5"
        :key="placeholder"
        class="h-12 w-full"
      />
    </div>
    <p
      v-else-if="!todos.length"
      class="py-8 text-center text-sm text-muted"
    >
      ไม่มีงานค้าง
    </p>
    <ul
      v-else
      class="-mx-2 divide-y divide-default"
    >
      <li
        v-for="todo in todos"
        :key="todo.kind"
      >
        <NuxtLink
          :to="TODO_STYLES[todo.kind].to"
          class="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-cream"
        >
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full"
            :class="TODO_STYLES[todo.kind].iconClass"
          >
            <AdminNavIcon
              :icon="TODO_STYLES[todo.kind].icon"
              :is-mask-icon="TODO_STYLES[todo.kind].isMaskIcon"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-bold text-ink">{{ todo.title }}</span>
            <span class="block truncate text-[13px] text-muted">{{ todo.detail }}</span>
          </span>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-5 shrink-0 text-ink"
          />
        </NuxtLink>
      </li>
    </ul>
  </DashboardCard>
</template>
