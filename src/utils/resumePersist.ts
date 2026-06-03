import type { ResumeParseDraftDto } from '@/api/resumeTypes'

/**
 * 后端 MySQL JSON 列要求写入合法 JSON 文档。
 * 用户常粘贴纯文本/Markdown/多行 URL；若整段不是合法 JSON，则包成单元素 JSON 数组，避免插入失败。
 */
export function sanitizePortfolioLinks(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== 'string') {
    try {
      return JSON.stringify(raw)
    } catch {
      return null
    }
  }
  const t = raw.trim()
  if (!t) return null
  try {
    const parsed = JSON.parse(t)
    return JSON.stringify(parsed)
  } catch {
    return JSON.stringify([t])
  }
}

/** 深拷贝并修正入库时易出错的字段（调用保存/更新接口前使用） */
export function normalizeDraftForPersistence(draft: ResumeParseDraftDto): ResumeParseDraftDto {
  const o = JSON.parse(JSON.stringify(draft)) as ResumeParseDraftDto
  const pl = sanitizePortfolioLinks(o.portfolioLinks)
  if (pl === null) {
    delete o.portfolioLinks
  } else {
    o.portfolioLinks = pl
  }
  return o
}
