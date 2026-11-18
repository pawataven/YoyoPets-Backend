import { useRepositories } from '~/repositories'

// Shared across the drawer and the file-check card; changes only when a super admin edits platform_settings
export function useReturnWindowDays() {
  const { order } = useRepositories()
  const { data } = useAsyncData('platform-return-window-days', () => order.getReturnWindowDays(), { server: false })
  return data
}
