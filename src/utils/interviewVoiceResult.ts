import type {
  InterviewExtractedSessionVO,
  InterviewQuestionCreateRequest,
  InterviewVoiceSummarizeResultVO,
} from '@/api/interviewTypes'

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** 将 AI 草稿条目转为创建问题请求体 */
export function draftToCreateRequest(
  item: InterviewQuestionCreateRequest,
  sortOrder?: number,
): InterviewQuestionCreateRequest {
  return {
    question: str(item.question),
    myAnswer: str(item.myAnswer) || undefined,
    answerEvaluation: str(item.answerEvaluation) || undefined,
    referenceAnswer: str(item.referenceAnswer) || undefined,
    otherNotes: str(item.otherNotes) || undefined,
    sortOrder,
  }
}

/**
 * 从 voice-summarize 响应提取题目列表。
 * 后端 V1：以 data.questions 为准；顶层五字段仅为兼容 questions[0]。
 */
export function normalizeVoiceSummarizeQuestions(
  result: InterviewVoiceSummarizeResultVO,
): InterviewQuestionCreateRequest[] {
  const fromArray = (result.questions ?? [])
    .map((q) => draftToCreateRequest(q))
    .filter((q) => q.question.length > 0)

  if (fromArray.length > 0) return fromArray

  const legacyQ = str(result.question)
  if (!legacyQ) return []

  return [
    draftToCreateRequest({
      question: legacyQ,
      myAnswer: str(result.myAnswer),
      answerEvaluation: str(result.answerEvaluation),
      referenceAnswer: str(result.referenceAnswer),
      otherNotes: str(result.otherNotes),
    }),
  ]
}

/** extractedSession 是否有可展示/可应用的非空字段 */
export function hasExtractedSession(session: InterviewExtractedSessionVO | null | undefined): boolean {
  if (!session) return false
  return Boolean(
    str(session.suggestedTitle) ||
      str(session.companyName) ||
      str(session.positionName) ||
      str(session.interviewRound) ||
      str(session.interviewAt),
  )
}

export interface SessionMetaForm {
  title: string
  companyName: string
  positionName: string
  interviewRound: string
  interviewAt?: string
}

/**
 * 将 AI 抽取的场次信息合并进表单（不覆盖用户已填内容）。
 */
export function applyExtractedSessionToMeta(
  meta: SessionMetaForm,
  extracted: InterviewExtractedSessionVO | null | undefined,
) {
  if (!extracted) return
  if (!meta.title.trim() && str(extracted.suggestedTitle)) {
    meta.title = str(extracted.suggestedTitle)
  }
  if (!meta.companyName.trim() && str(extracted.companyName)) {
    meta.companyName = str(extracted.companyName)
  }
  if (!meta.positionName.trim() && str(extracted.positionName)) {
    meta.positionName = str(extracted.positionName)
  }
  if (!meta.interviewRound.trim() && str(extracted.interviewRound)) {
    meta.interviewRound = str(extracted.interviewRound)
  }
  if (!meta.interviewAt && str(extracted.interviewAt)) {
    meta.interviewAt = str(extracted.interviewAt)
  }
}

/** 保存前同步场次元信息：仅提交有值的字段（后端 null/省略 = 不更新） */
export function buildSessionMetaPutBody(meta: SessionMetaForm): Record<string, string> {
  const body: Record<string, string> = {}
  const title = meta.title.trim()
  if (title) body.title = title
  const company = meta.companyName.trim()
  if (company) body.companyName = company
  const position = meta.positionName.trim()
  if (position) body.positionName = position
  const round = meta.interviewRound.trim()
  if (round) body.interviewRound = round
  if (meta.interviewAt?.trim()) body.interviewAt = meta.interviewAt.trim()
  return body
}
