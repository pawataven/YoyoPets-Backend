// 66812344521 (as Supabase Auth stores it) → 081-234-4521
export function formatThaiPhone(storedPhone: string) {
  const digits = storedPhone.replace(/\D/g, '')
  const local = digits.startsWith('66') ? `0${digits.slice(2)}` : digits
  if (local.length !== 10) return local
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
}
