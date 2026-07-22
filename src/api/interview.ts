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
 * 语音 AI 总结（听写 + DeepSeek 结构化）：仅返回草稿，不入库。
 * - 有 audioFile：multipart，字段 file + 可选 rawTranscript
 * - 无 audioFile：JSON { rawTranscript }
 * 用户核对后需再调 createInterviewQuestion 保存。
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

export type { InterviewQuestionVO }
