/**
 * 面试复盘 · 类型定义
 *
 * 与 ida-app-server `/api/v1/app/interview` 对齐（camelCase）。
 * 对接说明见项目 docs 或后端 Interview 模块文档。
 */

/** 单条面试问题（GET 详情、问题 CRUD 响应） */
export interface InterviewQuestionVO {
  questionId: number
  sessionId: number
  sortOrder: number
  question: string
  myAnswer: string | null
  answerEvaluation: string | null
  referenceAnswer: string | null
  otherNotes: string | null
  createdAt: string
  updatedAt: string
}

/** GET /interview/sessions 列表项 */
export interface InterviewSessionListItemVO {
  sessionId: number
  title: string
  companyName: string | null
  positionName: string | null
  interviewRound: string | null
  /** YYYY-MM-DD */
  interviewAt: string | null
  questionCount: number
  updatedAt: string
}

/** GET /interview/sessions/{sessionId} */
export interface InterviewSessionDetailVO extends InterviewSessionListItemVO {
  questions: InterviewQuestionVO[]
}

/** POST /interview/sessions */
export interface InterviewSessionCreateRequest {
  title: string
  companyName?: string
  positionName?: string
  interviewRound?: string
  /** YYYY-MM-DD */
  interviewAt?: string
}

/**
 * PUT /interview/sessions/{sessionId}
 * 后端 PATCH 语义：JSON 中为 null 或未传的字段不更新；传 "" 可清空字符串字段。
 */
export type InterviewSessionUpdateRequest = Partial<InterviewSessionCreateRequest>

/** POST /interview/sessions/{sessionId}/questions */
export interface InterviewQuestionCreateRequest {
  question: string
  myAnswer?: string
  answerEvaluation?: string
  referenceAnswer?: string
  otherNotes?: string
  sortOrder?: number
}

/** PUT /interview/sessions/{sessionId}/questions/{questionId} */
export type InterviewQuestionUpdateRequest = Partial<InterviewQuestionCreateRequest>

/** POST voice-summarize JSON 体 */
export interface InterviewVoiceSummarizeRequest {
  rawTranscript?: string
}

/** AI 从口述中抽取的场次草稿（需用户确认后 PUT /sessions） */
export interface InterviewExtractedSessionVO {
  companyName?: string | null
  positionName?: string | null
  interviewRound?: string | null
  interviewAt?: string | null
  suggestedTitle?: string | null
}

/** 语音总结中的单题草稿（尚未入库） */
export interface InterviewQuestionDraftItem {
  question: string
  myAnswer?: string | null
  answerEvaluation?: string | null
  referenceAnswer?: string | null
  otherNotes?: string | null
}

/**
 * POST /interview/sessions/{sessionId}/voice-summarize 响应 data
 * 不入库；请读 questions[]，顶层五字段仅为兼容旧版。
 */
export interface InterviewVoiceSummarizeResultVO {
  hint?: string | null
  extractedSession?: InterviewExtractedSessionVO | null
  /** 主字段：可能含多题 */
  questions?: InterviewQuestionDraftItem[]
  /** @deprecated 与 questions[0] 同步 */
  question?: string
  myAnswer?: string
  answerEvaluation?: string
  referenceAnswer?: string
  otherNotes?: string
}

export interface InterviewSessionCreateResultVO {
  sessionId: number
}

export interface InterviewQuestionCreateResultVO {
  questionId: number
}
