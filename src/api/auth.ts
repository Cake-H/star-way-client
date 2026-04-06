import { http, unwrapData } from './request'
import type { ApiEnvelope, SmsLoginResultVO } from './types'

/** POST /auth/sms/send-code */
export function sendLoginSmsCode(phone: string) {
  return http.post<ApiEnvelope<string>>('/auth/sms/send-code', { phone })
}

/** POST /auth/sms/login */
export function loginBySms(phone: string, code: string) {
  return http.post<ApiEnvelope<SmsLoginResultVO>>('/auth/sms/login', { phone, code })
}

/** POST /auth/sms/logout（需 Authorization） */
export function logout() {
  return http.post<ApiEnvelope<string>>('/auth/sms/logout')
}

export async function loginBySmsAndUnwrap(phone: string, code: string) {
  const res = await loginBySms(phone, code)
  return unwrapData(res) as SmsLoginResultVO
}
