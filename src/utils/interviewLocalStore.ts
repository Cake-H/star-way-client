/**
 * 面试复盘 · 本地 mock 存储
 *
 * 后端未就绪时（VITE_INTERVIEW_USE_API !== true）由 interviewService 调用。
 * 数据存于 localStorage，键名见 STORAGE_KEY；勿用于生产持久化。
 */
import type {
  InterviewQuestionCreateRequest,
  InterviewQuestionUpdateRequest,
  InterviewQuestionVO,
  InterviewSessionCreateRequest,
  InterviewSessionDetailVO,
  InterviewSessionListItemVO,
  InterviewSessionUpdateRequest,
  InterviewVoiceSummarizeResultVO,
} from '@/api/interviewTypes'

const STORAGE_KEY = 'xingtu_interview_sessions_v2'

/** 内存结构：自增 id + 场次数组（含嵌套 questions） */
interface LocalStore {
  nextSessionId: number
  nextQuestionId: number
  sessions: InterviewSessionDetailVO[]
}

function nowIso() {
  return new Date().toISOString()
}

function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LocalStore
      if (parsed.sessions && Array.isArray(parsed.sessions)) return parsed
    }
  } catch {
    /* ignore */
  }
  return { nextSessionId: 1, nextQuestionId: 1, sessions: [] }
}

function saveStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function toListItem(s: InterviewSessionDetailVO): InterviewSessionListItemVO {
  return {
    sessionId: s.sessionId,
    title: s.title,
    companyName: s.companyName,
    positionName: s.positionName,
    interviewRound: s.interviewRound,
    interviewAt: s.interviewAt,
    questionCount: s.questions.length,
    updatedAt: s.updatedAt,
  }
}

function touchSession(s: InterviewSessionDetailVO) {
  // 维护列表页需要的冗余字段
  s.questionCount = s.questions.length
  s.updatedAt = nowIso()
}

/** 本地 mock：结构与线上一致（questions + extractedSession） */
/** 本地 mock：模拟 Whisper 转写正文 */
export function mockVoiceTranscribe(): string {
  return (
    '面试官问我之前项目里负责什么，我说主要负责订单模块的开发，' +
    '用了 Spring Boot 和 Redis 做缓存，上线后接口响应从 800 毫秒降到 200 毫秒左右。' +
    '他又追问了缓存穿透怎么处理，我说用了布隆过滤器和空值缓存。'
  )
}

export function mockVoiceSummarize(transcript: string): InterviewVoiceSummarizeResultVO {
  const t = transcript.trim()
  const question =
    t.length > 80 ? `${t.slice(0, 80)}…（请核对并提炼为标准问法）` : t || '（未能识别问题，请手动补充）'
  const item = {
    question,
    myAnswer: t.includes('我回答') ? t.split('我回答')[1]?.trim() ?? t : '（根据口述自动提取，请核对你的实际回答）',
    answerEvaluation:
      '【本地演示】整体表达基本清晰，建议补充量化成果与 STAR 结构；具体评价待接入后端 AI 后生成。',
    referenceAnswer:
      '【本地演示】参考答案：结合岗位 JD 说明你的相关经验，用 STAR 描述案例，并点出与目标岗位的匹配点。',
    otherNotes: '【本地演示】可记录面试官追问、氛围、是否需 follow-up 等。',
  }
  return {
    hint: t.length < 10 ? '【本地演示】口述较短；线上环境建议至少 10 字或上传录音' : null,
    extractedSession: {
      suggestedTitle: '面试复盘（本地演示）',
      companyName: null,
      positionName: null,
      interviewRound: null,
      interviewAt: null,
    },
    questions: [item],
    ...item,
  }
}

export const interviewLocalStore = {
  listSessions(): InterviewSessionListItemVO[] {
    const store = loadStore()
    return store.sessions
      .map(toListItem)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  },

  getSession(sessionId: string): InterviewSessionDetailVO | null {
    return loadStore().sessions.find((s) => s.sessionId === sessionId) ?? null
  },

  createSession(body: InterviewSessionCreateRequest): string {
    const store = loadStore()
    const id = String(store.nextSessionId++)
    const ts = nowIso()
    store.sessions.push({
      sessionId: id,
      title: body.title.trim(),
      companyName: body.companyName?.trim() || null,
      positionName: body.positionName?.trim() || null,
      interviewRound: body.interviewRound?.trim() || null,
      interviewAt: body.interviewAt || null,
      questionCount: 0,
      updatedAt: ts,
      questions: [],
    })
    saveStore(store)
    return id
  },

  updateSession(sessionId: string, body: InterviewSessionUpdateRequest) {
    const store = loadStore()
    const s = store.sessions.find((x) => x.sessionId === sessionId)
    if (!s) throw new Error('面试复盘不存在')
    if (body.title !== undefined) s.title = body.title.trim()
    if (body.companyName !== undefined) s.companyName = body.companyName?.trim() || null
    if (body.positionName !== undefined) s.positionName = body.positionName?.trim() || null
    if (body.interviewRound !== undefined) s.interviewRound = body.interviewRound?.trim() || null
    if (body.interviewAt !== undefined) s.interviewAt = body.interviewAt || null
    touchSession(s)
    saveStore(store)
  },

  deleteSession(sessionId: string) {
    const store = loadStore()
    store.sessions = store.sessions.filter((s) => s.sessionId !== sessionId)
    saveStore(store)
  },

  createQuestion(sessionId: string, body: InterviewQuestionCreateRequest): string {
    const store = loadStore()
    const s = store.sessions.find((x) => x.sessionId === sessionId)
    if (!s) throw new Error('面试复盘不存在')
    const id = String(store.nextQuestionId++)
    const ts = nowIso()
    const q: InterviewQuestionVO = {
      questionId: id,
      sessionId,
      // 未传 sortOrder 时追加到末尾
      sortOrder: body.sortOrder ?? s.questions.length + 1,
      question: body.question.trim(),
      myAnswer: body.myAnswer?.trim() ?? '',
      answerEvaluation: body.answerEvaluation?.trim() ?? '',
      referenceAnswer: body.referenceAnswer?.trim() ?? '',
      otherNotes: body.otherNotes?.trim() ?? '',
      createdAt: ts,
      updatedAt: ts,
    }
    s.questions.push(q)
    touchSession(s)
    saveStore(store)
    return id
  },

  updateQuestion(sessionId: string, questionId: string, body: InterviewQuestionUpdateRequest) {
    const store = loadStore()
    const s = store.sessions.find((x) => x.sessionId === sessionId)
    if (!s) throw new Error('面试复盘不存在')
    const q = s.questions.find((x) => x.questionId === questionId)
    if (!q) throw new Error('问题不存在')
    if (body.question !== undefined) q.question = body.question.trim()
    if (body.myAnswer !== undefined) q.myAnswer = body.myAnswer.trim()
    if (body.answerEvaluation !== undefined) q.answerEvaluation = body.answerEvaluation.trim()
    if (body.referenceAnswer !== undefined) q.referenceAnswer = body.referenceAnswer.trim()
    if (body.otherNotes !== undefined) q.otherNotes = body.otherNotes.trim()
    if (body.sortOrder !== undefined) q.sortOrder = body.sortOrder
    q.updatedAt = nowIso()
    touchSession(s)
    saveStore(store)
  },

  deleteQuestion(sessionId: string, questionId: string) {
    const store = loadStore()
    const s = store.sessions.find((x) => x.sessionId === sessionId)
    if (!s) throw new Error('面试复盘不存在')
    s.questions = s.questions.filter((q) => q.questionId !== questionId)
    touchSession(s)
    saveStore(store)
  },

  getQuestion(sessionId: string, questionId: string): InterviewQuestionVO | null {
    const s = this.getSession(sessionId)
    return s?.questions.find((q) => q.questionId === questionId) ?? null
  },
}
