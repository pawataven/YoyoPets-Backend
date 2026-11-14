<script setup lang="ts">
import type { AdminNotification, AdminNotificationKind } from '~/types/admin'

const emit = defineEmits<{
  navigate: []
}>()

const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications()

interface NotificationStyle {
  icon: string
  isMaskIcon?: boolean
  iconClass: string
  to: string
}

// Icon tones follow Figma 20:155: red for work waiting on staff, gold for stock and redemptions, green for done
const NOTIFICATION_STYLES: Record<AdminNotificationKind, NotificationStyle> = {
  orders_pending: { icon: '/images/back-office/feature-orders.svg', isMaskIcon: true, iconClass: 'bg-primary-soft text-primary-dark', to: '/orders' },
  redemptions_requested: { icon: 'i-lucide-truck', iconClass: 'bg-gold/25 text-pending', to: '/redemptions' },
  reward_stock_low: { icon: 'i-lucide-circle-alert', iconClass: 'bg-primary-soft text-primary-dark', to: '/rewards' },
  coupon_codes_low: { icon: 'i-lucide-ticket', iconClass: 'bg-gold/25 text-pending', to: '/coupons' },
  order_import_finished: { icon: 'i-lucide-file-text', iconClass: 'bg-success/12 text-success', to: '/orders' },
  top_spender_closing: { icon: 'i-lucide-trophy', iconClass: 'bg-primary-soft text-primary-dark', to: '/top-spender' }
}

async function openNotification(notification: AdminNotification) {
  if (!notification.isRead) await markAsRead(notification.id)
  emit('navigate')
  await navigateTo(NOTIFICATION_STYLES[notification.kind].to)
}
</script>

<template>
  <div class="w-[min(480px,calc(100vw-2rem))]">
    <div class="flex items-center justify-between gap-3 px-4 pt-5 pb-3 sm:px-6 sm:pt-6">
      <h2 class="font-heading text-[22px] font-normal text-ink">
        การแจ้งเตือน
      </h2>
      <button
        type="button"
        class="text-sm font-bold text-primary-dark hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        :disabled="unreadCount === 0"
        @click="markAllAsRead"
      >
        อ่านทั้งหมดแล้ว
      </button>
    </div>

    <ul
      v-if="notifications.length"
      class="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-2 pb-3 sm:px-3"
    >
      <li
        v-for="notification in notifications"
        :key="notification.id"
      >
        <button
          type="button"
          class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-primary-soft/60"
          :class="notification.isRead ? undefined : 'bg-cream'"
          @click="openNotification(notification)"
        >
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-full"
            :class="NOTIFICATION_STYLES[notification.kind].iconClass"
          >
            <AdminNavIcon
              :icon="NOTIFICATION_STYLES[notification.kind].icon"
              :is-mask-icon="NOTIFICATION_STYLES[notification.kind].isMaskIcon"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-bold text-ink">{{ notification.title }}</span>
            <span class="mt-0.5 block text-[13px] text-muted">{{ notification.detail }}</span>
          </span>
          <span class="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            <span class="text-xs text-muted">{{ formatTimeAgo(notification.createdAt) }}</span>
            <span
              v-if="!notification.isRead"
              class="size-2 rounded-full bg-primary"
            >
              <span class="sr-only">ยังไม่อ่าน</span>
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p
      v-else
      class="px-6 pb-8 pt-4 text-center text-sm text-muted"
    >
      ยังไม่มีการแจ้งเตือน
    </p>

    <div class="border-t border-default py-4 text-center">
      <NuxtLink
        to="/alerts"
        class="text-[15px] font-bold text-primary-dark hover:underline"
        @click="emit('navigate')"
      >
        ดูการแจ้งเตือนทั้งหมด
      </NuxtLink>
    </div>
  </div>
</template>
