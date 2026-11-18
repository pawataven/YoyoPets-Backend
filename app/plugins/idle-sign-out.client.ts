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

  // A fresh sign-in must not inherit the timestamp left by the previous, idle session
  watch(claims, (currentClaims, previousClaims) => {
    if (currentClaims && !previousClaims) {
      lastActivityInThisTab = Date.now()
      saveLastActivityAt(lastActivityInThisTab)
    }
  })

  for (const eventName of ACTIVITY_EVENTS) {
    window.addEventListener(eventName, recordActivity, { passive: true })
  }
  window.setInterval(signOutIfIdle, IDLE_CHECK_INTERVAL_MS)
  // Catches a tab reopened long after the last activity. Waits for hydration: navigating to
  // /login mid-hydration leaves the server-rendered dashboard layout's classes on the login page
  onNuxtReady(signOutIfIdle)
})
