const IDLE_LIMIT_MS = 30 * 60 * 1000
const IDLE_CHECK_INTERVAL_MS = 30 * 1000
// Throttled so mouse movement doesn't write to localStorage on every event
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

export default defineNuxtPlugin(() => {
  const claims = useSupabaseUser()
  const { signOut } = useAdminAuth()
  // Fallback for when localStorage is unavailable; then idleness is only tracked within this tab
  let lastActivityInThisTab = Date.now()

  function recordActivity() {
    const now = Date.now()
    if (now - lastActivityInThisTab < ACTIVITY_WRITE_INTERVAL_MS) return
    lastActivityInThisTab = now
    saveLastActivityAt(now)
  }

  async function signOutIfIdle() {
    if (!claims.value) return
    const lastActivityAt = readLastActivityAt() ?? lastActivityInThisTab
    if (Date.now() - lastActivityAt > IDLE_LIMIT_MS) await signOut('idle')
  }

  for (const eventName of ACTIVITY_EVENTS) {
    window.addEventListener(eventName, recordActivity, { passive: true })
  }
  window.setInterval(signOutIfIdle, IDLE_CHECK_INTERVAL_MS)
  // Catches a tab reopened long after the last activity, before the first interval tick
  signOutIfIdle()
})
