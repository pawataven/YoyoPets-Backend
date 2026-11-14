import { isAuthError } from '@supabase/supabase-js'

export type AdminAuthErrorCode = 'not_admin' | 'mfa_not_enrolled' | 'reset_link_invalid'

export class AdminAuthError extends Error {
  constructor(readonly code: AdminAuthErrorCode) {
    super(code)
    this.name = 'AdminAuthError'
  }
}

const ADMIN_AUTH_ERROR_MESSAGES: Record<AdminAuthErrorCode, string> = {
  not_admin: 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบหลังบ้าน กรุณาติดต่อเจ้าของร้าน',
  mfa_not_enrolled: 'บัญชีนี้ยังไม่ได้ตั้งค่ายืนยันตัวตน 2 ขั้นตอน',
  reset_link_invalid: 'ลิงก์ตั้งรหัสผ่านใหม่หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่'
}

const SUPABASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  email_not_confirmed: 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาติดต่อเจ้าของร้าน',
  user_banned: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเจ้าของร้าน',
  over_request_rate_limit: 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
  over_email_send_rate_limit: 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
  mfa_verification_failed: 'รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาใช้รหัสล่าสุดจากแอป',
  mfa_challenge_expired: 'รหัสหมดอายุแล้ว กรุณาใช้รหัสล่าสุดจากแอป',
  mfa_totp_enroll_not_enabled: 'ระบบยังไม่เปิดใช้การยืนยันตัวตน 2 ขั้นตอน กรุณาติดต่อผู้ดูแลระบบ',
  mfa_totp_verify_not_enabled: 'ระบบยังไม่เปิดใช้การยืนยันตัวตน 2 ขั้นตอน กรุณาติดต่อผู้ดูแลระบบ',
  weak_password: 'รหัสผ่านไม่ปลอดภัยพอ กรุณาใช้รหัสที่ยาวขึ้นหรือผสมตัวอักษรหลายแบบ',
  same_password: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม',
  insufficient_aal: 'กรุณายืนยันตัวตน 2 ขั้นตอนก่อนทำรายการนี้',
  session_expired: 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่',
  session_not_found: 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'
}

const FALLBACK_MESSAGE = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'

export function describeAuthError(error: unknown) {
  if (error instanceof AdminAuthError) return ADMIN_AUTH_ERROR_MESSAGES[error.code]
  if (isAuthError(error) && error.code) return SUPABASE_AUTH_ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE
  return FALLBACK_MESSAGE
}
