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

/**
 * DELETE /user/account：账号注销（需登录）。
 * confirmText 必须是「注销」二字，否则后端报业务异常；
 * 成功后后端撤销当前 token，前端需清空本地登录态。
 */
export function deleteAccount(confirmText: string) {
  return http.delete<ApiEnvelope<void>>('/user/account', {
    data: { confirmText },
  })
}

export async function loginBySmsAndUnwrap(phone: string, code: string) {
  const res = await loginBySms(phone, code)
  return unwrapData(res) as SmsLoginResultVO
}
