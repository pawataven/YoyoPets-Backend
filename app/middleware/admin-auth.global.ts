// UX routing only; the real guard is RLS (private.is_admin() requires an active admin_users row and aal2)
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password']
const MFA_PATHS = Object.values(ADMIN_AUTH_STEP_PATHS)

// "/login/" must match "/login", or it is treated as protected and bounces back to /login forever
function withoutTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

function isAuthFlowPath(path: string) {
  return PUBLIC_PATHS.includes(path) || MFA_PATHS.includes(path)
}

export default defineNuxtRouteMiddleware(async (to) => {
  const claims = useSupabaseUser()
  const path = withoutTrailingSlash(to.path)

  if (path !== to.path) {
    return navigateTo({ path, query: to.query, hash: to.hash }, { replace: true })
  }

  if (PUBLIC_PATHS.includes(path)) {
    if (path === '/login' && claims.value?.aal === 'aal2') {
      return navigateTo(safeRedirectPath(to.query.redirect))
    }
    return
  }

  if (!claims.value) {
    // Sending people back to a sign-in step after signing in makes no sense and nests ?redirect= values
    return navigateTo({ path: '/login', query: isAuthFlowPath(path) ? {} : { redirect: to.fullPath } })
  }

  const { loadAccount, resolveAuthStep, clearSession } = useAdminAuth()
  if (!(await loadAccount())) {
    await clearSession()
    return navigateTo({ path: '/login', query: { reason: 'not_admin' } })
  }

  const step = await resolveAuthStep()
  const isMfaPath = MFA_PATHS.includes(to.path)

  if (step === 'ready') {
    return isMfaPath ? navigateTo(safeRedirectPath(to.query.redirect)) : undefined
  }

  const stepPath = ADMIN_AUTH_STEP_PATHS[step]
  if (to.path === stepPath) return

  const redirect = isMfaPath ? safeRedirectPath(to.query.redirect, '') : to.fullPath
  return navigateTo({ path: stepPath, query: redirect ? { redirect } : {} })
})
