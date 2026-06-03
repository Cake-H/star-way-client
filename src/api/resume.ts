import { http, unwrapData } from './request'
import { normalizeDraftForPersistence } from '@/utils/resumePersist'
import type { ApiEnvelope } from './types'
import type {
  ResumeDetailVO,
  ResumeListItemVO,
  ResumeParseResultVO,
  ResumeSaveDraftRequest,
  ResumeSaveDraftResultVO,
  ResumeUpdateRequest,
} from './resumeTypes'

/**
 * 上传简历并智能解析（multipart，字段名 file）
 * 路径与后端 Controller 对齐；若不一致请只改此处。
 */
const UPLOAD_PARSE_PATH = '/resume/upload-parse'
const RESUME_BASE = '/resume'

export function uploadAndParseResume(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return http.post<ApiEnvelope<ResumeParseResultVO>>(UPLOAD_PARSE_PATH, fd, {
    timeout: 600_000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
}

export async function uploadAndParseResumeData(file: File) {
  const res = await uploadAndParseResume(file)
  const data = unwrapData(res)
  if (!data) {
    throw new Error('解析结果为空')
  }
  return data
}

export async function saveResumeDraft(body: ResumeSaveDraftRequest) {
  const payload: ResumeSaveDraftRequest = {
    ...body,
    draft: normalizeDraftForPersistence(body.draft),
  }
  const res = await http.post<ApiEnvelope<ResumeSaveDraftResultVO>>(`${RESUME_BASE}/save-draft`, payload)
  const data = unwrapData(res)
  if (!data) throw new Error('保存结果为空')
  return data
}

export async function listMyResumes() {
  const res = await http.get<ApiEnvelope<ResumeListItemVO[]>>(`${RESUME_BASE}/list`)
  return unwrapData(res) ?? []
}

export async function getResumeDetail(resumeId: number) {
  const res = await http.get<ApiEnvelope<ResumeDetailVO>>(`${RESUME_BASE}/${resumeId}`)
  const data = unwrapData(res)
  if (!data) throw new Error('简历详情为空')
  return data
}

export async function updateResume(resumeId: number, body: ResumeUpdateRequest) {
  const payload: ResumeUpdateRequest = {
    ...body,
    draft: normalizeDraftForPersistence(body.draft),
  }
  const res = await http.put<ApiEnvelope<ResumeSaveDraftResultVO>>(`${RESUME_BASE}/${resumeId}`, payload)
  const data = unwrapData(res)
  if (!data) throw new Error('更新结果为空')
  return data
}

/** 软删除：列表与详情不再返回该 id；若删默认简历，后端会将另一份未删简历设为默认（存在时） */
export async function deleteResume(resumeId: number) {
  await http.delete<ApiEnvelope<string>>(`${RESUME_BASE}/${resumeId}`)
}
