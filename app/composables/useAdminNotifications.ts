import { useRepositories } from '~/repositories'

export function useAdminNotifications() {
  const { adminNotification } = useRepositories()

  const { data: notifications, refresh } = useAsyncData(
    'admin-notifications',
    () => adminNotification.getRecentNotifications(),
    { default: () => [], server: false }
  )

  const unreadCount = computed(() => notifications.value.filter(notification => !notification.isRead).length)

  async function markAsRead(notificationId: string) {
    await adminNotification.markAsRead([notificationId])
    await refresh()
  }

  async function markAllAsRead() {
    await adminNotification.markAllAsRead()
    await refresh()
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead }
}
