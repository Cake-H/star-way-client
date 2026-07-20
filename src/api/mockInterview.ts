/**
 * 模拟面试 · HTTP 层
 *
 * Base: {VITE_API_BASE_URL}/mock-interview
 * 后端实现预留接口，前端先定义好调用契约。
 */
import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'
import type {
  MockInterviewCreateRequest,
  MockInterviewListItemVO,
  MockInterviewUpdateProgressRequest,
  MockInterviewVO,
} from './mockInterviewTypes'

const MOCK_INTERVIEW_BASE = '/mock-interview'

/** 当前用户的模拟面试列表（不含 questions 明细） */
export async function listMockInterviews() {
  const res = await http.get<ApiEnvelope<MockInterviewListItemVO[]>>(MOCK_INTERVIEW_BASE)
  return unwrapData(res) ?? []
}

/** 模拟面试详情；mockInterviewQuestions 应按 sortOrder 升序返回 */
export async function getMockInterviewDetail(mockInterviewId: number) {
  const res = await http.get<ApiEnvelope<MockInterviewVO>>(`${MOCK_INTERVIEW_BASE}/${mockInterviewId}`)
  const data = unwrapData(res)
  if (!data) throw new Error('模拟面试详情为空')
  return data
}

/** 根据简历生成模拟面试题；后端直接返回新建模拟面试 ID */
export async function createMockInterview(body: MockInterviewCreateRequest) {
  const res = await http.post<ApiEnvelope<number>>(MOCK_INTERVIEW_BASE, body, {
    timeout: 120_000,
  })
  const data = unwrapData(res)
  if (!data) throw new Error('创建模拟面试失败')
  return data
}

/** 删除模拟面试 */
export async function deleteMockInterview(mockInterviewId: number) {
  await http.delete<ApiEnvelope<unknown>>(`${MOCK_INTERVIEW_BASE}/${mockInterviewId}`)
}

/** 更新模拟面试状态；后端使用 query 参数 */
export async function updateMockInterviewStatus(mockInterviewId: number, status: string) {
  await http.put<ApiEnvelope<unknown>>(
    `${MOCK_INTERVIEW_BASE}/${mockInterviewId}/status`,
    null,
    { params: { status } },
  )
}

/** 保存练习进度 */
export async function updateMockInterviewProgress(
  mockInterviewId: number,
  body: MockInterviewUpdateProgressRequest,
) {
  await http.put<ApiEnvelope<unknown>>(`${MOCK_INTERVIEW_BASE}/${mockInterviewId}/progress`, body)
}
