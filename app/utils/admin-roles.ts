import type { AdminAccount, AdminRole } from '~/types/admin'

// Wording from Figma node 20:155 ("เจ้าของร้าน · Owner"); at handover the shop owner holds super_admin
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'เจ้าของร้าน · Owner',
  admin: 'ทีมงาน · Staff'
}

export function adminDisplayName(account: AdminAccount) {
  return account.displayName ?? account.email
}

// "คุณฝน" → "ฝ": the honorific is skipped so the avatar shows the person's own initial
export function adminAvatarInitial(account: AdminAccount) {
  const name = (account.displayName ?? account.email).replace(/^คุณ\s*/, '')
  return Array.from(name)[0]?.toUpperCase() ?? '?'
}
