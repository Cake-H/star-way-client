/**
 * 面试复盘 · HTTP 层
 *
 * Base: {VITE_API_BASE_URL}/interview → 生产默认 /api/v1/app/interview
 * 鉴权: Authorization: Bearer <token>
 */
import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'
import type {
  InterviewQuestionCreateRequest,
  InterviewQuestionCreateResultVO,
  InterviewQuestionUpdateRequest,
  InterviewQuestionVO,
  InterviewSessionCreateRequest,
  InterviewSessionCreateResultVO,
  InterviewSessionDetailVO,
  InterviewSessionListItemVO,
  InterviewSessionUpdateRequest,
  InterviewVoiceSummarizeRequest,
  InterviewVoiceSummarizeResultVO,
  InterviewVoiceSummarizeTaskVO,
} from './interviewTypes'

/** 与后端 Controller 前缀对齐；若不一致请只改此处 */
const INTERVIEW_BASE = '/interview'

/** 当前用户的复盘场次列表（不含 questions 明细） */
export async function listInterviewSessions() {
  const res = await http.get<ApiEnvelope<InterviewSessionListItemVO[]>>(`${INTERVIEW_BASE}/sessions`)
  return unwrapData(res) ?? []
}

/** 场次详情；questions 应按 sortOrder 升序返回 */
export async function getInterviewSessionDetail(sessionId: string) {
  const res = await http.get<ApiEnvelope<InterviewSessionDetailVO>>(`${INTERVIEW_BASE}/sessions/${sessionId}`)
  const data = unwrapData(res)
  if (!data) throw new Error('面试复盘详情为空')
  return data
}

export async function createInterviewSession(body: InterviewSessionCreateRequest) {
  const res = await http.post<ApiEnvelope<InterviewSessionCreateResultVO>>(`${INTERVIEW_BASE}/sessions`, body)
  const data = unwrapData(res)
  if (!data) throw new Error('创建面试复盘失败')
  return data
}

export async function updateInterviewSession(sessionId: string, body: InterviewSessionUpdateRequest) {
  await http.put<ApiEnvelope<string>>(`${INTERVIEW_BASE}/sessions/${sessionId}`, body)
}

export async function deleteInterviewSession(sessionId: string) {
  await http.delete<ApiEnvelope<string>>(`${INTERVIEW_BASE}/sessions/${sessionId}`)
}

export async function createInterviewQuestion(sessionId: string, body: InterviewQuestionCreateRequest) {
  const res = await http.post<ApiEnvelope<InterviewQuestionCreateResultVO>>(
    `${INTERVIEW_BASE}/sessions/${sessionId}/questions`,
    body,
  )
  const data = unwrapData(res)
  if (!data) throw new Error('添加问题失败')
  return data
}

export async function updateInterviewQuestion(
  sessionId: string,
  questionId: string,
  body: InterviewQuestionUpdateRequest,
) {
  await http.put<ApiEnvelope<string>>(
    `${INTERVIEW_BASE}/sessions/${sessionId}/questions/${questionId}`,
    body,
  )
}

export async function deleteInterviewQuestion(sessionId: string, questionId: string) {
  await http.delete<ApiEnvelope<string>>(
    `${INTERVIEW_BASE}/sessions/${sessionId}/questions/${questionId}`,
  )
}

/**
 * 语音 AI 总结（旧同步接口）：录音场景会挂起「音频时长 + 大模型耗时」的 HTTP 连接（分钟级），
 * 极易触发网关/浏览器超时。
 * @deprecated 新代码请用 submitInterviewVoiceSummarizeTask + pollInterviewVoiceSummarizeTask；此函数仅作备用回退。
 */
export async function summarizeInterviewVoice(
  sessionId: string,
  payload: InterviewVoiceSummarizeRequest & { audioFile?: File },
) {
  if (payload.audioFile) {
    const fd = new FormData()
    fd.append('file', payload.audioFile, payload.audioFile.name)
    if (payload.rawTranscript?.trim()) {
      fd.append('rawTranscript', payload.rawTranscript.trim())
    }
    const res = await http.post<ApiEnvelope<InterviewVoiceSummarizeResultVO>>(
      `${INTERVIEW_BASE}/sessions/${sessionId}/voice-summarize`,
      fd,
      { timeout: 120_000 },
    )
    const data = unwrapData(res)
    if (!data) throw new Error('语音总结结果为空')
    return data
  }
  // 无录音文件时，仅提交文本（用户粘贴或手打口述内容）
  const res = await http.post<ApiEnvelope<InterviewVoiceSummarizeResultVO>>(
    `${INTERVIEW_BASE}/sessions/${sessionId}/voice-summarize`,
    { rawTranscript: payload.rawTranscript },
    { timeout: 120_000 },
  )
  const data = unwrapData(res)
  if (!data) throw new Error('语音总结结果为空')
  return data
}

/* —— 异步语音总结（提交任务 + 轮询）—— */

/** 轮询策略（与服务端说明对齐）：每 2.5 秒一次；超时按输入形态由调用方给（纯文本 90s，录音 = 音频时长 + 90s） */
export const VOICE_SUMMARIZE_POLL_INTERVAL_MS = 2_500
export const VOICE_SUMMARIZE_TEXT_TIMEOUT_MS = 90_000

/** 任务 FAILED，message 为服务端用户友好文案，可直接展示 */
export class InterviewSummarizeFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InterviewSummarizeFailedError'
  }
}

/** 轮询整体超时（服务端任务仍在 RUNNING） */
export class InterviewSummarizeTimeoutError extends Error {
  constructor() {
    super('整理时间较长，请稍后重试')
    this.name = 'InterviewSummarizeTimeoutError'
  }
}

/**
 * 提交异步语音总结任务，立即返回 taskId。
 * - 有 audioFile：multipart，字段 file + 可选 rawTranscript
 * - 无 audioFile：JSON { rawTranscript }
 * file 与 rawTranscript 至少给一个，否则任务 FAILED。
 */
export async function submitInterviewVoiceSummarizeTask(
  sessionId: string,
  payload: InterviewVoiceSummarizeRequest & { audioFile?: File },
): Promise<string> {
  const url = `${INTERVIEW_BASE}/sessions/${sessionId}/voice-summarize/tasks`
  if (payload.audioFile) {
    const fd = new FormData()
    fd.append('file', payload.audioFile, payload.audioFile.name)
    if (payload.rawTranscript?.trim()) {
      fd.append('rawTranscript', payload.rawTranscript.trim())
    }
    const res = await http.post<ApiEnvelope<string>>(url, fd, {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })
    const taskId = unwrapData(res)
    if (!taskId) throw new Error('未获取到总结任务 ID')
    return taskId
  }
  const res = await http.post<ApiEnvelope<string>>(url, { rawTranscript: payload.rawTranscript })
  const taskId = unwrapData(res)
  if (!taskId) throw new Error('未获取到总结任务 ID')
  return taskId
}

/** 查询一次任务状态；URL 中 sessionId 必须与任务所属场次一致，否则 30100「任务不存在、已过期或无权访问」 */
export async function getInterviewVoiceSummarizeTask(
  sessionId: string,
  taskId: string,
): Promise<InterviewVoiceSummarizeTaskVO> {
  const res = await http.get<ApiEnvelope<InterviewVoiceSummarizeTaskVO>>(
    `${INTERVIEW_BASE}/sessions/${sessionId}/voice-summarize/tasks/${taskId}`,
  )
  const data = unwrapData(res)
  if (!data) throw new Error('任务状态为空')
  return data
}

export interface PollInterviewVoiceSummarizeOptions {
  intervalMs?: number
  /** 纯文本 90s；录音建议 音频时长 + 90s */
  timeoutMs?: number
  /** 返回 false 时停止轮询（如组件已卸载），Promise 以 null 解决 */
  shouldContinue?: () => boolean
}

/**
 * 轮询任务直至终态：
 * - SUCCESS → 返回总结结果（结构与旧同步接口 data 一致，不入库）
 * - FAILED  → 抛 InterviewSummarizeFailedError（message 为服务端文案，直接展示）
 * - 超时     → 抛 InterviewSummarizeTimeoutError
 * - 取消     → 返回 null
 * 任务过期（30 分钟）/ 串场次等 30100 与网络错误原样抛出（拦截器已 toast）。
 */
export async function pollInterviewVoiceSummarizeTask(
  sessionId: string,
  taskId: string,
  opts: PollInterviewVoiceSummarizeOptions = {},
): Promise<InterviewVoiceSummarizeResultVO | null> {
  const interval = opts.intervalMs ?? VOICE_SUMMARIZE_POLL_INTERVAL_MS
  const deadline = Date.now() + (opts.timeoutMs ?? VOICE_SUMMARIZE_TEXT_TIMEOUT_MS)

  for (;;) {
    if (opts.shouldContinue && !opts.shouldContinue()) return null
    if (Date.now() > deadline) throw new InterviewSummarizeTimeoutError()

    const task = await getInterviewVoiceSummarizeTask(sessionId, taskId)
    if (task.status === 'SUCCESS') {
      if (!task.result) throw new Error('语音总结结果为空')
      return task.result
    }
    if (task.status === 'FAILED') {
      throw new InterviewSummarizeFailedError(task.errorMessage || '语音总结失败，请重试')
    }

    await new Promise((r) => setTimeout(r, interval))
  }
}

export type { InterviewQuestionVO }
