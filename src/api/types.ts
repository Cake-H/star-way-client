/** 与 Spring ResponseDTO 等常见包装对齐，按需扩展 */
export interface ApiEnvelope<T = unknown> {
  code?: number
  success?: boolean
  message?: string
  msg?: string
  data?: T
}

export interface SmsLoginResultVO {
  token: string
  userId: number
  newUser: boolean
  expiresInSeconds: number
}
