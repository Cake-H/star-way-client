/**
 * 模拟面试 · 本地演示存储
 *
 * 当 VITE_MOCK_INTERVIEW_USE_API=false 时使用 localStorage 持久化，
 * 并提供一套基于简历的确定性模拟面试题，供前端独立开发与验证。
 */
import type {
  MockInterviewListItemVO,
  MockInterviewPracticeProgress,
  MockInterviewQuestionVO,
  MockInterviewStatus,
  MockInterviewVO,
} from '@/api/mockInterviewTypes'

const STORAGE_KEY = 'xingtu_mock_interviews_v2'

interface LocalStore {
  nextInterviewId: number
  nextQuestionId: number
  interviews: MockInterviewVO[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LocalStore
      return {
        nextInterviewId: parsed.nextInterviewId ?? 1,
        nextQuestionId: parsed.nextQuestionId ?? 1,
        interviews: parsed.interviews ?? [],
      }
    }
  } catch {
    // ignore
  }
  return { nextInterviewId: 1, nextQuestionId: 1, interviews: [] }
}

function writeStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function generateMockQuestions(sessionId: string, startId: number): MockInterviewQuestionVO[] {
  const questions: { question: string; referenceAnswer: string; answerEvaluation: string }[] = [
    {
      question: '请用 1-2 分钟简单介绍一下自己，重点说明与目标岗位最匹配的经历。',
      referenceAnswer:
        '建议采用「现在-过去-未来」结构：先说明当前身份与核心技能，再举 1 个与岗位强相关的项目/工作经历（背景、动作、结果量化），最后表达加入该岗位的兴趣与价值。',
      answerEvaluation: '考察自我认知、表达逻辑与岗位匹配度；回答需简洁、有数据、有重点。',
    },
    {
      question: '你简历中提到的某个项目遇到的最大挑战是什么？你是如何解决的？',
      referenceAnswer:
        '使用 STAR 法则描述：Situation（背景与压力）、Task（你的职责）、Action（具体步骤与决策）、Result（量化成果与复盘）。重点突出「你」做了什么，而不是团队做了什么。',
      answerEvaluation: '考察问题解决能力、抗压能力与 ownership；避免只讲功劳不讲过程。',
    },
    {
      question: '你为什么选择我们公司/这个岗位？',
      referenceAnswer:
        '结合公司业务、产品阶段、技术栈或文化特点，说明自己的技能与职业目标如何与之契合。避免只谈薪资或平台大小。',
      answerEvaluation: '考察求职动机、准备程度与价值观匹配；体现对公司的了解会增加可信度。',
    },
    {
      question: '你未来 3 年的职业规划是怎样的？',
      referenceAnswer:
        '分短期（融入团队、补齐某项技能）、中期（独立负责某块业务/模块）、长期（成为某领域专家或具备带人能力）。要与当前岗位成长路径一致。',
      answerEvaluation: '考察稳定性、目标感与自我驱动力；避免过于空泛或与岗位无关。',
    },
    {
      question: '你还有什么问题想问我们吗？',
      referenceAnswer:
        '可问团队当前核心挑战、岗位成功标准、技术栈演进方向、mentor 机制等。避免只问薪资福利或面试时间。',
      answerEvaluation: '考察主动性、思考力与对岗位的重视程度；好的提问能反向加分。',
    },
  ]

  return questions.map((q, i) => ({
    id: String(startId + i),
    sessionId,
    sortOrder: i + 1,
    question: q.question,
    referenceAnswer: q.referenceAnswer,
    answerEvaluation: q.answerEvaluation,
    otherNotes: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }))
}

export const mockInterviewLocalStore = {
  listInterviews(): MockInterviewListItemVO[] {
    const store = readStore()
    return store.interviews
      .map((it) => ({
        mockInterviewId: it.mockInterviewId,
        resumeId: it.resumeId,
        title: it.title,
        questionCount: it.questionCount,
        status: it.status,
        updatedAt: it.updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  },

  getInterview(mockInterviewId: string): MockInterviewVO | undefined {
    const store = readStore()
    const it = store.interviews.find((x) => x.mockInterviewId === mockInterviewId)
    if (!it) return undefined
    return {
      ...it,
      mockInterviewQuestions: [...it.mockInterviewQuestions].sort((a, b) => a.sortOrder - b.sortOrder),
    }
  },

  createInterview(resumeId: string, title?: string): string {
    const store = readStore()
    const id = String(store.nextInterviewId++)
    const startQuestionId = store.nextQuestionId
    const questions = generateMockQuestions(id, startQuestionId)
    store.nextQuestionId += questions.length

    const interview: MockInterviewVO = {
      mockInterviewId: id,
      resumeId,
      title: title?.trim() || `模拟面试 #${id}`,
      questionCount: questions.length,
      status: 'GENERATED',
      updatedAt: nowIso(),
      mockInterviewProgress: null,
      mockInterviewQuestions: questions,
    }

    store.interviews.push(interview)
    writeStore(store)
    return id
  },

  deleteInterview(mockInterviewId: string) {
    const store = readStore()
    store.interviews = store.interviews.filter((x) => x.mockInterviewId !== mockInterviewId)
    writeStore(store)
  },

  updateStatus(mockInterviewId: string, status: MockInterviewStatus) {
    const store = readStore()
    const it = store.interviews.find((x) => x.mockInterviewId === mockInterviewId)
    if (!it) return
    it.status = status
    it.updatedAt = nowIso()
    writeStore(store)
  },

  saveProgress(mockInterviewId: string, progress: MockInterviewPracticeProgress) {
    const store = readStore()
    const it = store.interviews.find((x) => x.mockInterviewId === mockInterviewId)
    if (!it) return
    it.mockInterviewProgress = { ...progress }
    it.updatedAt = nowIso()
    writeStore(store)
  },

  getProgress(mockInterviewId: string): MockInterviewPracticeProgress | null {
    const it = this.getInterview(mockInterviewId)
    return it?.mockInterviewProgress ?? null
  },
}
