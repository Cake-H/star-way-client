import { http, unwrapData } from './request'
import { normalizeDraftForPersistence } from '@/utils/resumePersist'
import type { ApiEnvelope } from './types'
import type {
  ResumeDetailVO,
  ResumeListItemVO,
  ResumeParseResultVO,
  ResumeParseTaskVO,
  ResumeSaveDraftRequest,
  ResumeSaveDraftResultVO,
  ResumeUpdateRequest,
} from './resumeTypes'

/**
 * 上传简历并智能解析（multipart，字段名 file）
 * 路径与后端 Controller 对齐；若不一致请只改此处。
 */
const UPLOAD_PARSE_PATH = '/resume/upload-parse'
const UPLOAD_PARSE_TASKS_PATH = '/resume/upload-parse/tasks'
const RESUME_BASE = '/resume'

/** 轮询策略（与服务端说明对齐）：每 2 秒一次，整体 120 秒超时 */
export const PARSE_POLL_INTERVAL_MS = 2_000
export const PARSE_POLL_TIMEOUT_MS = 120_000

/**
 * 旧同步接口：大模型解析期间 HTTP 连接长时间挂起，易触发网关/浏览器超时。
 * @deprecated 新代码请使用 submitResumeParseTask + pollResumeParseTask 异步链路；此函数仅作备用回退。
 */
export function uploadAndParseResume(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return http.post<ApiEnvelope<ResumeParseResultVO>>(UPLOAD_PARSE_PATH, fd, {
    timeout: 600_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
}

/** @deprecated 见 uploadAndParseResume */
export async function uploadAndParseResumeData(file: File) {
  const res = await uploadAndParseResume(file)
  const data = unwrapData(res)
  if (!data) {
    throw new Error('解析结果为空')
  }
  return data
}

/** 解析任务失败（status = FAILED），message 为服务端用户友好文案，可直接展示 */
export class ResumeParseFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResumeParseFailedError'
  }
}

/** 轮询整体超时（服务端任务仍在 RUNNING） */
export class ResumeParseTimeoutError extends Error {
  constructor() {
    super('解析时间较长，请稍后重试')
    this.name = 'ResumeParseTimeoutError'
  }
}

/**
 * 提交异步解析任务，立即返回 taskId。
 * 文件为空 / 超 15MB 等场景会同步失败（code != 0），由拦截器统一 toast 后 reject。
 */
export async function submitResumeParseTask(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await http.post<ApiEnvelope<string>>(UPLOAD_PARSE_TASKS_PATH, fd, {
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
  const taskId = unwrapData(res)
  if (!taskId) throw new Error('未获取到解析任务 ID')
  return taskId
}

/** 查询一次任务状态。任务过期（30 分钟）会返回业务错误 code 30100，由拦截器 toast 后 reject */
export async function getResumeParseTask(taskId: string): Promise<ResumeParseTaskVO> {
  const res = await http.get<ApiEnvelope<ResumeParseTaskVO>>(`${UPLOAD_PARSE_TASKS_PATH}/${taskId}`)
  const data = unwrapData(res)
  if (!data) throw new Error('任务状态为空')
  return data
}

export interface PollResumeParseTaskOptions {
  intervalMs?: number
  timeoutMs?: number
  /** 返回 false 时停止轮询（如组件已卸载），Promise 以 null 解决 */
  shouldContinue?: () => boolean
}

/**
 * 轮询任务直至终态：
 * - SUCCESS → 返回解析结果（结构同旧同步接口 data）
 * - FAILED  → 抛 ResumeParseFailedError（message 为服务端文案，直接展示）
 * - 超时     → 抛 ResumeParseTimeoutError
 * - 取消     → 返回 null
 * 任务过期 / 网络错误等原样抛出（拦截器已 toast）。
 * 页面切换 / 刷新后可凭 taskId 再次调用本函数继续轮询（30 分钟内有效）。
 */
export async function pollResumeParseTask(
  taskId: string,
  opts: PollResumeParseTaskOptions = {},
): Promise<ResumeParseResultVO | null> {
  const interval = opts.intervalMs ?? PARSE_POLL_INTERVAL_MS
  const deadline = Date.now() + (opts.timeoutMs ?? PARSE_POLL_TIMEOUT_MS)

  for (;;) {
    if (opts.shouldContinue && !opts.shouldContinue()) return null
    if (Date.now() > deadline) throw new ResumeParseTimeoutError()

    const task = await getResumeParseTask(taskId)
    if (task.status === 'SUCCESS') {
      if (!task.result) throw new Error('解析结果为空')
      return task.result
    }
    if (task.status === 'FAILED') {
      throw new ResumeParseFailedError(task.errorMessage || '解析失败，请重试')
    }

    await new Promise((r) => setTimeout(r, interval))
  }
}

export async function saveResumeDraft(body: ResumeSaveDraftRequest) {
  const payload: ResumeSaveDraftRequest = {
    ...body,
    draft: normalizeDraftForPersistence(body.draft),
  }
  const res = await http.post<ApiEnvelope<ResumeSaveDraftResultVO>>(`${RESUME_BASE}/save-draft`, payload)
  const data = unwrapData(res)
  if (!data) throw new Error('保存结果为空')
  return data
}

export async function listMyResumes() {
  const res = await http.get<ApiEnvelope<ResumeListItemVO[]>>(`${RESUME_BASE}/list`)
  return unwrapData(res) ?? []
}

export async function getResumeDetail(resumeId: string) {
  const res = await http.get<ApiEnvelope<ResumeDetailVO>>(`${RESUME_BASE}/${resumeId}`)
  const data = unwrapData(res)
  if (!data) throw new Error('简历详情为空')
  return data
}

export async function updateResume(resumeId: string, body: ResumeUpdateRequest) {
  const payload: ResumeUpdateRequest = {
    ...body,
    draft: normalizeDraftForPersistence(body.draft),
  }
  const res = await http.put<ApiEnvelope<ResumeSaveDraftResultVO>>(`${RESUME_BASE}/${resumeId}`, payload)
  const data = unwrapData(res)
  if (!data) throw new Error('更新结果为空')
  return data
}

/** 软删除：列表与详情不再返回该 id；若删默认简历，后端会将另一份未删简历设为默认（存在时） */
export async function deleteResume(resumeId: string) {
  await http.delete<ApiEnvelope<string>>(`${RESUME_BASE}/${resumeId}`)
}
