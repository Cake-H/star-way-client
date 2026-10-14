import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'

/**
 * 投递记录模块：Base /api/v1/app/job-application
 * 与后端《投递记录模块 · 前端对接说明》V1 对齐；路径不一致时只改此处。
 */
const BASE = '/job-application'

/** 列表项（GET /job-application，无分页，返回全量） */
export interface JobApplicationListItemVO {
  applicationId: number
  companyName: string
  position: string
  /** YYYY-MM-DD，可为 null */
  applyDate: string | null
  /** 进度 code，见 progress-options 接口 */
  progress: string
  /** 进度中文文案，可直接展示 */
  progressLabel: string
  /** 网申地址，可能为空串 */
  applyUrl: string
  /** MANUAL（手动记录）/ PLUGIN（插件识别入库，预留） */
  source: string
  /** 备注，可能为空串 */
  remark: string
  createdAt: string
  updatedAt: string
}

export interface JobApplicationProgressOption {
  code: string
  label: string
}

/** 列表组合筛选参数，均可选、可自由组合 */
export interface JobApplicationQuery {
  /** 模糊 LIKE %x% */
  companyName?: string
  /** 模糊 LIKE %x% */
  position?: string
  /** 精确匹配进度 code */
  progress?: string
  /** apply_date >=，YYYY-MM-DD */
  applyDateStart?: string
  /** apply_date <=，YYYY-MM-DD */
  applyDateEnd?: string
}

/**
 * 新建 / 更新请求体。
 * 更新为 PATCH 语义：字段为 null（或未传）表示不修改；传 "" 会清空（companyName/position 除外，不允许改空）。
 * 新建时 applyDate 不传默认当天，progress 不传默认 APPLIED。
 */
export interface JobApplicationSaveRequest {
  companyName?: string | null
  position?: string | null
  applyDate?: string | null
  progress?: string | null
  applyUrl?: string | null
  remark?: string | null
}

function cleanQuery(query: JobApplicationQuery): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    const s = typeof v === 'string' ? v.trim() : ''
    if (s) params[k] = s
  }
  return params
}

/** GET /job-application：组合筛选，默认 applyDate 降序、其次 createdAt 降序 */
export async function listJobApplications(query: JobApplicationQuery = {}) {
  const res = await http.get<ApiEnvelope<JobApplicationListItemVO[]>>(BASE, {
    params: cleanQuery(query),
  })
  return unwrapData(res) ?? []
}

/** GET /job-application/progress-options：进度下拉选项（按流程顺序），筛选与编辑表单共用，勿硬编码 */
export async function getJobApplicationProgressOptions() {
  const res = await http.get<ApiEnvelope<JobApplicationProgressOption[]>>(`${BASE}/progress-options`)
  return unwrapData(res) ?? []
}

/** POST /job-application：新建（来源固定 MANUAL），返回 applicationId */
export async function createJobApplication(body: JobApplicationSaveRequest): Promise<number> {
  const res = await http.post<ApiEnvelope<{ applicationId: number }>>(BASE, body)
  const data = unwrapData(res)
  if (!data) throw new Error('新建结果为空')
  return data.applicationId
}

/** PUT /job-application/{id}：部分更新；进度快速变更只传 { progress } 即可 */
export async function updateJobApplication(applicationId: number, body: JobApplicationSaveRequest) {
  await http.put<ApiEnvelope<null>>(`${BASE}/${applicationId}`, body)
}

/** DELETE /job-application/{id}：软删，列表不再返回 */
export async function deleteJobApplication(applicationId: number) {
  await http.delete<ApiEnvelope<null>>(`${BASE}/${applicationId}`)
}
