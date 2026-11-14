import { useRepositories } from '~/repositories'
import type { AdminAccount, AdminAuthStep, TotpEnrollment } from '~/types/admin'

export const ADMIN_AUTH_STEP_PATHS: Record<Exclude<AdminAuthStep, 'ready'>, string> = {
  'mfa-setup': '/login/mfa-setup',
  'mfa-verify': '/login/mfa'
}

const TOTP_FACTOR_NAME = 'YoyoPet Admin'

export function useAdminAuth() {
  const supabase = useSupabaseClient()
  const claims = useSupabaseUser()
  const account = useState<AdminAccount | null>('admin-account', () => null)
  const { adminAccount } = useRepositories()
  const requestUrl = useRequestURL()

  // The module refreshes claims from onAuthStateChange asynchronously; navigating right after a
  // sign-in or MFA step would otherwise race it and the middleware would see stale claims
  async function syncClaims() {
    const { data } = await supabase.auth.getClaims()
    claims.value = data?.claims ?? null
  }

  async function loadAccount() {
    const userId = claims.value?.sub
    if (!userId) {
      account.value = null
      return null
    }
    if (account.value?.userId !== userId) {
      account.value = await adminAccount.getActiveAccount(userId)
    }
    return account.value
  }

  async function resolveAuthStep(): Promise<AdminAuthStep> {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) throw error
    if (data.currentLevel === 'aal2') return 'ready'
    if (data.nextLevel === 'aal2') return 'mfa-verify'
    return 'mfa-setup'
  }

  async function clearSession() {
    // local: only this browser; the default 'global' would also end the admin's sessions on other devices
    await supabase.auth.signOut({ scope: 'local' })
    claims.value = null
    account.value = null
    clearNuxtState('totp-enrollment')
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const signedInAccount = await adminAccount.getActiveAccount(data.user.id)
    if (!signedInAccount) {
      await clearSession()
      throw new AdminAuthError('not_admin')
    }

    account.value = signedInAccount
    saveLastActivityAt(Date.now())
    await syncClaims()
    return resolveAuthStep()
  }

  async function startTotpEnrollment(): Promise<TotpEnrollment> {
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) throw listError

    // An abandoned setup leaves an unverified factor whose name would clash with the new one
    const abandonedFactors = factors.all.filter(factor => factor.factor_type === 'totp' && factor.status === 'unverified')
    for (const factor of abandonedFactors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (error) throw error
    }

    // issuer is the account label shown in the authenticator app; Supabase defaults it to the project URL
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: TOTP_FACTOR_NAME,
      issuer: TOTP_FACTOR_NAME
    })
    if (error) throw error
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
  }

  async function verifyTotp(code: string, enrollingFactorId?: string) {
    let factorId = enrollingFactorId
    if (!factorId) {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      factorId = data.totp[0]?.id
    }
    if (!factorId) throw new AdminAuthError('mfa_not_enrolled')

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    saveLastActivityAt(Date.now())
    await syncClaims()
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${requestUrl.origin}/reset-password`
    })
    if (error) throw error
  }

  // Recovery links carry a PKCE code that must be exchanged in the same browser that asked for the link
  async function startPasswordRecovery(code: string | null) {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw new AdminAuthError('reset_link_invalid')
    }
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new AdminAuthError('reset_link_invalid')
    await syncClaims()
    return resolveAuthStep()
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  async function signOut(reason?: 'idle') {
    await clearSession()
    await navigateTo({ path: '/login', query: reason ? { reason } : {} })
  }

  return {
    account: readonly(account),
    loadAccount,
    resolveAuthStep,
    clearSession,
    signIn,
    startTotpEnrollment,
    verifyTotp,
    requestPasswordReset,
    startPasswordRecovery,
    updatePassword,
    signOut
  }
}
