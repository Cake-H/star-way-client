import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/config'
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
  return config
})

function isBizSuccess(body: ApiEnvelope): boolean {
  if (typeof body.success === 'boolean') return body.success
  const c = body.code
  if (c === undefined) return true
  return c === 200 || c === 0
}

function pickMessage(body: ApiEnvelope, fallback: string): string {
  return body.message || body.msg || fallback
}

http.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope>) => {
    const body = res.data
    if (body === null || body === undefined) {
      return res
    }
    if (typeof body === 'object' && 'code' in body) {
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

/** 取出业务 data；成功时由拦截器保证 code/success 合法 */
export function unwrapData<T>(res: AxiosResponse<ApiEnvelope<T>>): T | undefined {
  return res.data.data as T | undefined
}
