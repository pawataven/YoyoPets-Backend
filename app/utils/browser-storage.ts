// localStorage can be missing or throw (private windows, blocked site data); these preferences are optional

const REMEMBERED_EMAIL_KEY = 'yoyopet-admin:remembered-email'
const LAST_ACTIVITY_KEY = 'yoyopet-admin:last-activity'

function readItem(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeItem(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Not persisted; the feature just falls back to its default
  }
}

export function readRememberedEmail() {
  return readItem(REMEMBERED_EMAIL_KEY)
}

export function saveRememberedEmail(email: string | null) {
  writeItem(REMEMBERED_EMAIL_KEY, email)
}

// Shared through localStorage so activity in any open tab keeps every tab signed in
export function readLastActivityAt() {
  return Number(readItem(LAST_ACTIVITY_KEY)) || null
}

export function saveLastActivityAt(timestamp: number) {
  writeItem(LAST_ACTIVITY_KEY, String(timestamp))
}
