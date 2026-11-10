import { http, unwrapData } from './request'
import type { ApiEnvelope } from './types'

export type FeedbackStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED'

export interface AppFeedbackAttachmentVO {
  /** 预签名下载 URL，1 小时有效；为空串时需占位处理 */
  url: string
  fileName: string
  mimeType: string
  size: number
  mediaType: 'IMAGE' | 'VIDEO'
}

export interface AppFeedbackListItemVO {
  feedbackId: string
  content: string
  attachments: AppFeedbackAttachmentVO[]
  status: FeedbackStatus
  statusLabel: string
  adminNote: string
  createdAt: string
}

export interface SubmitFeedbackPayload {
  content: string
  contactEmail?: string
  attachments?: File[]
}

/** POST /feedback（multipart/form-data，同名多文件字段 attachments） */
export async function submitFeedback(payload: SubmitFeedbackPayload) {
  const form = new FormData()
  form.append('content', payload.content)
  if (payload.contactEmail?.trim()) form.append('contactEmail', payload.contactEmail.trim())
  payload.attachments?.forEach((file) => form.append('attachments', file))
  const res = await http.post<ApiEnvelope<{ feedbackId: string }>>('/feedback', form)
  return unwrapData(res)
}

/** GET /feedback/my：当前用户全部反馈，按提交时间倒序，无分页 */
export async function listMyFeedback() {
  const res = await http.get<ApiEnvelope<AppFeedbackListItemVO[]>>('/feedback/my')
  return unwrapData(res) ?? []
}
