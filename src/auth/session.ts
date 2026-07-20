import { ref } from 'vue'
import { AUTH_TOKEN_KEY } from '@/config'
import type { SmsLoginResultVO } from '@/api/types'

const PROFILE_KEY = 'ida_auth_profile'

/** 响应式 token，供布局/页面监听登录态变化 */
export const authToken = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY))

export function setSession(vo: SmsLoginResultVO) {
  localStorage.setItem(AUTH_TOKEN_KEY, vo.token)
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      userId: vo.userId,
      newUser: vo.newUser,
      expiresInSeconds: vo.expiresInSeconds,
    }),
  )
  authToken.value = vo.token
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
  authToken.value = null
}

export function getProfile():
  | { userId: number; newUser: boolean; expiresInSeconds: number }
  | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as {
      userId: number
      newUser: boolean
      expiresInSeconds: number
    }
  } catch {
    return null
  }
}
