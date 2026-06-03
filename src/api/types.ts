/** 与 Spring ResponseDTO 对齐（ida-app-server） */
export interface ApiEnvelope<T = unknown> {
  /** 0 表示成功 */
  code?: number
  ok?: boolean
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
