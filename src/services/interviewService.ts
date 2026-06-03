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

export async function getInterviewSessionDetail(sessionId: number): Promise<InterviewSessionDetailVO> {
  if (useApi) return interviewApi.getInterviewSessionDetail(sessionId)
  const s = interviewLocalStore.getSession(sessionId)
  if (!s) throw new Error('面试复盘不存在')
  return { ...s, questions: [...s.questions].sort((a, b) => a.sortOrder - b.sortOrder) }
}

export async function createInterviewSession(body: InterviewSessionCreateRequest): Promise<number> {
  if (useApi) {
    const r = await interviewApi.createInterviewSession(body)
    return r.sessionId
  }
  return interviewLocalStore.createSession(body)
}

export async function updateInterviewSession(sessionId: number, body: InterviewSessionUpdateRequest) {
  if (useApi) return interviewApi.updateInterviewSession(sessionId, body)
  interviewLocalStore.updateSession(sessionId, body)
}

/** 用户确认 AI 场次草稿或编辑 meta 后，同步 PUT（仅提交非空字段） */
export async function syncInterviewSessionMeta(sessionId: number, meta: SessionMetaForm) {
  const partial = buildSessionMetaPutBody(meta)
  if (Object.keys(partial).length === 0) return
  await updateInterviewSession(sessionId, partial as InterviewSessionUpdateRequest)
}

export async function deleteInterviewSession(sessionId: number) {
  if (useApi) return interviewApi.deleteInterviewSession(sessionId)
  interviewLocalStore.deleteSession(sessionId)
}

export async function createInterviewQuestion(
  sessionId: number,
  body: InterviewQuestionCreateRequest,
): Promise<number> {
  if (useApi) {
    const r = await interviewApi.createInterviewQuestion(sessionId, body)
    return r.questionId
  }
  return interviewLocalStore.createQuestion(sessionId, body)
}

export async function updateInterviewQuestion(
  sessionId: number,
  questionId: number,
  body: InterviewQuestionUpdateRequest,
) {
  if (useApi) return interviewApi.updateInterviewQuestion(sessionId, questionId, body)
  interviewLocalStore.updateQuestion(sessionId, questionId, body)
}

export async function deleteInterviewQuestion(sessionId: number, questionId: number) {
  if (useApi) return interviewApi.deleteInterviewQuestion(sessionId, questionId)
  interviewLocalStore.deleteQuestion(sessionId, questionId)
}

export async function summarizeInterviewVoice(
  sessionId: number,
  opts: { rawTranscript?: string; audioFile?: File },
): Promise<InterviewVoiceSummarizeResultVO> {
  if (useApi) return interviewApi.summarizeInterviewVoice(sessionId, opts)
  await new Promise((r) => setTimeout(r, 800))
  return mockVoiceSummarize(opts.rawTranscript ?? '')
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
