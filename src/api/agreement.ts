import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'

export type AgreementType = 'privacy' | 'terms'

/**
 * GET /agreement/{type}：匿名可访问，data 为 markdown 全文。
 * 后端内存缓存、无分页无版本号，前端直接整段展示。
 */
export async function getAgreement(type: AgreementType): Promise<string> {
  const res = await http.get<ApiEnvelope<string>>(`/agreement/${type}`)
  return unwrapData(res) ?? ''
}
