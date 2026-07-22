import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'

export interface ApplySiteVO {
  id: string
  name: string
  logoUrl: string | null
  url: string
  category: string
  /** 是否支持插件一键填表：1=支持 0=不支持 */
  supportAutofill: number
}

/** 站点目录为后台人工维护的低频变更数据，前端做 5 分钟短缓存降低首屏请求压力 */
const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: unknown }>()

function readCache<T>(key: string): T | null {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T
  cache.delete(key)
  return null
}

function writeCache(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data })
}

/** GET /apply-sites/categories：上架站点分类去重列表（「全部」由前端自行插入） */
export async function getApplySiteCategories(forceRefresh = false): Promise<string[]> {
  const key = 'apply-sites:categories'
  if (!forceRefresh) {
    const cached = readCache<string[]>(key)
    if (cached) return cached
  }
  const res = await http.get<ApiEnvelope<string[]>>('/apply-sites/categories')
  const data = unwrapData(res) ?? []
  writeCache(key, data)
  return data
}

/** GET /apply-sites?category=：category 为空表示全部上架站点，按后台排序值升序返回 */
export async function getApplySites(category = '', forceRefresh = false): Promise<ApplySiteVO[]> {
  const key = `apply-sites:list:${category || '__all__'}`
  if (!forceRefresh) {
    const cached = readCache<ApplySiteVO[]>(key)
    if (cached) return cached
  }
  const res = await http.get<ApiEnvelope<ApplySiteVO[]>>('/apply-sites', {
    params: category ? { category } : {},
  })
  const data = unwrapData(res) ?? []
  writeCache(key, data)
  return data
}
