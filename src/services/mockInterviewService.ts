/**
 * 模拟面试 · 服务层
 *
 * 根据环境变量 VITE_MOCK_INTERVIEW_USE_API 决定走真实后端还是 localStorage 本地演示。
 */
import * as mockApi from '@/api/mockInterview'
import { listMyResumes } from '@/api/resume'
import { mockInterviewLocalStore } from '@/utils/mockInterviewLocalStore'
import type {
  MockInterviewListItemVO,
  MockInterviewPracticeProgress,
  MockInterviewStatus,
  MockInterviewVO,
} from '@/api/mockInterviewTypes'

const useApi = import.meta.env.VITE_MOCK_INTERVIEW_USE_API !== 'false'

/** 加载可用于生成模拟面试的简历列表 */
export async function listResumesForGeneration(): Promise<{ resumeId: number; title: string }[]> {
  try {
    const resumes = await listMyResumes()
    return resumes.map((r) => ({ resumeId: r.resumeId, title: r.title }))
  } catch {
    return [{ resumeId: 0, title: '示例简历（离线演示）' }]
  }
}

export async function listMockInterviews(): Promise<MockInterviewListItemVO[]> {
  if (useApi) return mockApi.listMockInterviews()
  return mockInterviewLocalStore.listInterviews()
}

export async function getMockInterviewDetail(mockInterviewId: number): Promise<MockInterviewVO> {
  if (useApi) return mockApi.getMockInterviewDetail(mockInterviewId)
  const it = mockInterviewLocalStore.getInterview(mockInterviewId)
  if (!it) throw new Error('模拟面试不存在')
  return it
}

export async function createMockInterview(resumeId: number, title?: string): Promise<number> {
  if (useApi) {
    const r = await mockApi.createMockInterview({ resumeId, title })
    return r.mockInterviewId
  }
  return mockInterviewLocalStore.createInterview(resumeId, title)
}

export async function deleteMockInterview(mockInterviewId: number) {
  if (useApi) return mockApi.deleteMockInterview(mockInterviewId)
  mockInterviewLocalStore.deleteInterview(mockInterviewId)
}

export async function updateMockInterviewStatus(mockInterviewId: number, status: MockInterviewStatus) {
  if (useApi) return mockApi.updateMockInterviewStatus(mockInterviewId, { status })
  mockInterviewLocalStore.updateStatus(mockInterviewId, status)
}

export async function savePracticeProgress(
  mockInterviewId: number,
  progress: MockInterviewPracticeProgress,
) {
  if (useApi) return mockApi.updateMockInterviewProgress(mockInterviewId, progress)
  mockInterviewLocalStore.saveProgress(mockInterviewId, progress)
}

export async function loadPracticeProgress(
  mockInterviewId: number,
): Promise<MockInterviewPracticeProgress | null> {
  if (useApi) {
    const detail = await mockApi.getMockInterviewDetail(mockInterviewId)
    return detail.practiceProgress ?? null
  }
  return mockInterviewLocalStore.getProgress(mockInterviewId)
}
