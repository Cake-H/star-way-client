import type { ResumeParseDraftDto } from '@/api/resumeTypes'

export interface ResumeSaveValidationOptions {
  /** 列表展示用简历名称（工具栏） */
  listTitle: string
}

/**
 * 保存/更新入库前的必填与基础格式校验（与后端 JSON 等约束配合，减少无效请求）。
 */
export function getResumeSaveValidationErrors(
  draft: ResumeParseDraftDto,
  options: ResumeSaveValidationOptions,
): string[] {
  const errors: string[] = []
  if (!options.listTitle?.trim()) {
    errors.push('请填写「简历名称（列表展示）」')
  }
  if (!draft.fullName?.trim()) {
    errors.push('请填写「姓名」')
  }
  const phone = draft.phone?.trim()
  if (!phone) {
    errors.push('请填写「手机号」')
  } else if (!/^1[3-9]\d{9}$/.test(phone)) {
    errors.push('「手机号」须为 11 位中国大陆号码（1 开头）')
  }
  const email = draft.email?.trim()
  if (!email) {
    errors.push('请填写「邮箱」')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('「邮箱」格式不正确')
  }
  return errors
}
