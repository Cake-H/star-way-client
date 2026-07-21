import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'

export interface QuotaBalanceVO {
  balance: number
  totalQuota: number
  memberLevel: string
  lastDailyGrantDate: string | null
}

export interface QuotaTransactionVO {
  id: number
  type: string
  points: number
  balanceAfter: number
  remark: string
  createdAt: string
}

export interface RedeemCodeRequest {
  code: string
}

export interface RedeemResultVO {
  code: string
  points: number
  balanceAfter: number
}

/** GET /quota/balance */
export async function getQuotaBalance() {
  const res = await http.get<ApiEnvelope<QuotaBalanceVO>>('/quota/balance')
  return unwrapData(res) ?? {
    balance: 0,
    totalQuota: 0,
    memberLevel: 'FREE',
    lastDailyGrantDate: null,
  }
}

/** GET /quota/transactions?limit= */
export async function getQuotaTransactions(limit = 20) {
  const res = await http.get<ApiEnvelope<QuotaTransactionVO[]>>('/quota/transactions', {
    params: { limit: Math.min(limit, 100) },
  })
  return unwrapData(res) ?? []
}

/** POST /quota/redeem */
export async function redeemQuotaCode(body: RedeemCodeRequest) {
  const res = await http.post<ApiEnvelope<RedeemResultVO>>('/quota/redeem', body)
  const data = unwrapData(res)
  if (!data) throw new Error('兑换结果为空')
  return data
}
