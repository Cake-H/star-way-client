/**
 * 面试复盘 · 数据访问层
 *
 * 默认请求 ida-app-server `/api/v1/app/interview`。
 * 仅当 VITE_INTERVIEW_USE_API=false 时回退 localStorage mock（离线演示）。
 */
import * as interviewApi from '@/api/interview'
import type {
  InterviewQuestionCreateRequest,
  InterviewQuestionUpdateRequest,
  InterviewSessionCreateRequest,
  InterviewSessionDetailVO,
  InterviewSessionListItemVO,
  InterviewSessionUpdateRequest,
  InterviewVoiceSummarizeResultVO,
} from '@/api/interviewTypes'
import { interviewLocalStore, mockVoiceSummarize } from '@/utils/interviewLocalStore'
import { buildSessionMetaPutBody, type SessionMetaForm } from '@/utils/interviewVoiceResult'

const useApi = import.meta.env.VITE_INTERVIEW_USE_API !== 'false'

export async function listInterviewSessions(): Promise<InterviewSessionListItemVO[]> {
  if (useApi) return interviewApi.listInterviewSessions()
  return interviewLocalStore.listSessions()
}

export async function getInterviewSessionDetail(sessionId: string): Promise<InterviewSessionDetailVO> {
  if (useApi) return interviewApi.getInterviewSessionDetail(sessionId)
  const s = interviewLocalStore.getSession(sessionId)
  if (!s) throw new Error('面试复盘不存在')
  return { ...s, questions: [...s.questions].sort((a, b) => a.sortOrder - b.sortOrder) }
}

export async function createInterviewSession(body: InterviewSessionCreateRequest): Promise<string> {
  if (useApi) {
    const r = await interviewApi.createInterviewSession(body)
    return r.sessionId
  }
  return interviewLocalStore.createSession(body)
}

export async function updateInterviewSession(sessionId: string, body: InterviewSessionUpdateRequest) {
  if (useApi) return interviewApi.updateInterviewSession(sessionId, body)
  interviewLocalStore.updateSession(sessionId, body)
}

/** 用户确认 AI 场次草稿或编辑 meta 后，同步 PUT（仅提交非空字段） */
export async function syncInterviewSessionMeta(sessionId: string, meta: SessionMetaForm) {
  const partial = buildSessionMetaPutBody(meta)
  if (Object.keys(partial).length === 0) return
  await updateInterviewSession(sessionId, partial as InterviewSessionUpdateRequest)
}

export async function deleteInterviewSession(sessionId: string) {
  if (useApi) return interviewApi.deleteInterviewSession(sessionId)
  interviewLocalStore.deleteSession(sessionId)
}

export async function createInterviewQuestion(
  sessionId: string,
  body: InterviewQuestionCreateRequest,
): Promise<string> {
  if (useApi) {
    const r = await interviewApi.createInterviewQuestion(sessionId, body)
    return r.questionId
  }
  return interviewLocalStore.createQuestion(sessionId, body)
}

export async function updateInterviewQuestion(
  sessionId: string,
  questionId: string,
  body: InterviewQuestionUpdateRequest,
) {
  if (useApi) return interviewApi.updateInterviewQuestion(sessionId, questionId, body)
  interviewLocalStore.updateQuestion(sessionId, questionId, body)
}

export async function deleteInterviewQuestion(sessionId: string, questionId: string) {
  if (useApi) return interviewApi.deleteInterviewQuestion(sessionId, questionId)
  interviewLocalStore.deleteQuestion(sessionId, questionId)
}

/**
 * 语音 AI 总结（旧同步链路）
 * @deprecated 请用 submitInterviewVoiceSummarizeTask + pollInterviewVoiceSummarizeTask
 */
export async function summarizeInterviewVoice(
  sessionId: string,
  opts: { rawTranscript?: string; audioFile?: File },
): Promise<InterviewVoiceSummarizeResultVO> {
  if (useApi) return interviewApi.summarizeInterviewVoice(sessionId, opts)
  await new Promise((r) => setTimeout(r, 800))
  return mockVoiceSummarize(opts.rawTranscript ?? '')
}

/* —— 异步语音总结 —— */

/** mock 模式下暂存口述文本，供轮询时生成假结果 */
let mockLastTranscript = ''

/** 提交异步语音总结任务，返回 taskId */
export async function submitInterviewVoiceSummarizeTask(
  sessionId: string,
  opts: { rawTranscript?: string; audioFile?: File },
): Promise<string> {
  if (useApi) return interviewApi.submitInterviewVoiceSummarizeTask(sessionId, opts)
  mockLastTranscript = opts.rawTranscript ?? ''
  return 'mock-task'
}

/** 轮询任务直至终态；取消时返回 null */
export async function pollInterviewVoiceSummarizeTask(
  sessionId: string,
  taskId: string,
  opts?: interviewApi.PollInterviewVoiceSummarizeOptions,
): Promise<InterviewVoiceSummarizeResultVO | null> {
  if (useApi) return interviewApi.pollInterviewVoiceSummarizeTask(sessionId, taskId, opts)
  await new Promise((r) => setTimeout(r, 800))
  return mockVoiceSummarize(mockLastTranscript)
}

export function emptyQuestionForm(): InterviewQuestionCreateRequest {
  return {
    question: '',
    myAnswer: '',
    answerEvaluation: '',
    referenceAnswer: '',
    otherNotes: '',
  }
}

export { useApi as interviewUseApi }

