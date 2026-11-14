// Only same-site paths, so a crafted ?redirect= cannot send a signed-in admin to another site.
// Sign-in pages are refused too: landing on one after signing in would loop back into the sign-in flow.
export function safeRedirectPath(redirect: unknown, fallback = '/') {
  if (typeof redirect !== 'string') return fallback
  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) return fallback
  if (/^\/login(?:[/?#]|$)/.test(redirect)) return fallback
  return redirect
}
