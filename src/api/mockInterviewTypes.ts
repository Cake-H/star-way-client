/**
 * 模拟面试 · 类型定义
 *
 * 该模块为 LLM 根据简历生成的模拟面试题提供独立的数据模型，
 * 与既有 interview 复盘模块分离，便于后端独立实现。
 */

/** 模拟面试状态 */
export type MockInterviewStatus = 'GENERATED' | 'PRACTICING' | 'COMPLETED'

/** 练习进度（由前端保存，后端预留字段） */
export interface MockInterviewPracticeProgress {
  /** 当前正在练习的题目 ID */
  currentQuestionId: number
  /** 当前题目答案是否已展开 */
  answerRevealed: boolean
}

/** 模拟面试题 VO */
export interface MockInterviewQuestionVO {
  mockInterviewQuestionId: number
  mockInterviewId: number
  sortOrder: number
  question: string
  answerEvaluation: string | null
  referenceAnswer: string | null
  otherNotes: string | null
  createdAt: string
  updatedAt: string
}

/** 模拟面试列表项 VO */
export interface MockInterviewListItemVO {
  mockInterviewId: number
  resumeId: number
  title: string
  questionCount: number
  status: MockInterviewStatus
  updatedAt: string
}

/** 模拟面试详情 VO */
export interface MockInterviewVO extends MockInterviewListItemVO {
  practiceProgress: MockInterviewPracticeProgress | null
  questions: MockInterviewQuestionVO[]
}

/** 创建模拟面试请求 */
export interface MockInterviewCreateRequest {
  resumeId: number
  title?: string
}

/** 创建模拟面试结果 */
export interface MockInterviewCreateResultVO {
  mockInterviewId: number
}

/** 更新练习进度请求 */
export interface MockInterviewUpdateProgressRequest {
  currentQuestionId: number
  answerRevealed: boolean
}

/** 更新状态请求 */
export interface MockInterviewUpdateStatusRequest {
  status: MockInterviewStatus
}
