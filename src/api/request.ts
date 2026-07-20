import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/config'
import { clearSession } from '@/auth/session'
import type { ApiEnvelope } from './types'

function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // multipart 需由浏览器自动带 boundary，不能沿用默认 application/json
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as { delete?: (k: string) => void }).delete === 'function') {
      ;(config.headers as { delete: (k: string) => void }).delete('Content-Type')
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type']
    }
  }
  return config
})

/** 与后端 ResponseDTO 一致：优先 code === 0 / 200，其次 ok / success */
function isBizSuccess(body: ApiEnvelope): boolean {
  const c = body.code
  if (c !== undefined) return c === 0 || c === 200
  if (typeof body.ok === 'boolean') return body.ok
  if (typeof body.success === 'boolean') return body.success
  return true
}

function pickMessage(body: ApiEnvelope, fallback: string): string {
  return body.message || body.msg || fallback
}

function handleUnauthorized(hadToken: boolean) {
  clearSession()
  import('@/router').then(({ router }) => {
    if (router.currentRoute.value.name === 'login') return
    // 游客在公开页面收到 401：原地不动，不强制跳转
    if (!hadToken && router.currentRoute.value.meta.public) return
    const redirect = router.currentRoute.value.fullPath
    router.replace({ name: 'login', query: { redirect } })
  })
}

http.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope>) => {
    const body = res.data
    if (body === null || body === undefined) {
      return res
    }
    if (typeof body === 'object' && ('code' in body || 'ok' in body || 'success' in body)) {
      if (!isBizSuccess(body)) {
        const msg = pickMessage(body, '请求失败')
        ElMessage.error(msg)
        return Promise.reject(new Error(msg))
      }
      return { ...res, data: body }
    }
    return res
  },
  (err: AxiosError<ApiEnvelope | { message?: string }>) => {
    if (err.response?.status === 401) {
      const hadToken = !!getToken()
      if (hadToken) {
        ElMessage.error('登录已失效，请重新登录')
      }
      handleUnauthorized(hadToken)
      return Promise.reject(err)
    }
    const data = err.response?.data
    let msg = err.message || '网络异常'
    if (data && typeof data === 'object') {
      const b = data as ApiEnvelope
      if (b.message || b.msg) msg = pickMessage(b, msg)
      else if ('message' in data && typeof (data as { message?: string }).message === 'string') {
        msg = (data as { message: string }).message
      }
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

/** 取出业务 data；成功时由拦截器保证 code/ok 合法 */
export function unwrapData<T>(res: AxiosResponse<ApiEnvelope<T>>): T | undefined {
  return res.data.data as T | undefined
}
