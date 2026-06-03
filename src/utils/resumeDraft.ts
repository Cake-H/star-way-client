import type {
  ResumeAwardDraftLine,
  ResumeCampusDraftLine,
  ResumeCertificateDraftLine,
  ResumeEducationDraftLine,
  ResumeLanguageDraftLine,
  ResumeParseDraftDto,
  ResumeParseResultVO,
  ResumeProjectDraftLine,
  ResumePublicationDraftLine,
  ResumeSkillDraftLine,
  ResumeWorkDraftLine,
} from '@/api/resumeTypes'

export function emptyDraft(): ResumeParseDraftDto {
  return {
    educations: [],
    works: [],
    projects: [],
    campusExperiences: [],
    skills: [],
    languages: [],
    certificates: [],
    awards: [],
    publications: [],
  }
}

export function mergeDraftFromParse(
  target: ResumeParseDraftDto,
  source: Partial<ResumeParseDraftDto> | null | undefined,
) {
  if (!source) return
  for (const key of Object.keys(source) as (keyof ResumeParseDraftDto)[]) {
    const v = source[key]
    if (v === undefined) continue
    const t = target as unknown as Record<string, unknown>
    if (Array.isArray(v)) {
      t[key as string] = v.map((row) => ({ ...(row as object) }))
    } else {
      t[key as string] = v as unknown
    }
  }
}

export function buildDraftFromParseResult(vo: ResumeParseResultVO): ResumeParseDraftDto {
  const d = emptyDraft()
  mergeDraftFromParse(d, vo.draft ?? undefined)
  return d
}

/** 用服务端完整 draft 覆盖本地 reactive 草稿（编辑/详情回填） */
export function assignFullDraft(target: ResumeParseDraftDto, source: ResumeParseDraftDto) {
  const merged = emptyDraft()
  mergeDraftFromParse(merged, source)
  const t = target as unknown as Record<string, unknown>
  const m = merged as unknown as Record<string, unknown>
  for (const k of Object.keys(merged) as (keyof ResumeParseDraftDto)[]) {
    t[k as string] = m[k as string]
  }
}

export function emptyEducationLine(): ResumeEducationDraftLine {
  return {}
}

export function emptyWorkLine(): ResumeWorkDraftLine {
  return {}
}

export function emptyProjectLine(): ResumeProjectDraftLine {
  return {}
}

export function emptyCampusLine(): ResumeCampusDraftLine {
  return {}
}

export function emptySkillLine(): ResumeSkillDraftLine {
  return {}
}

export function emptyLanguageLine(): ResumeLanguageDraftLine {
  return {}
}

export function emptyCertificateLine(): ResumeCertificateDraftLine {
  return {}
}

export function emptyAwardLine(): ResumeAwardDraftLine {
  return {}
}

export function emptyPublicationLine(): ResumePublicationDraftLine {
  return {}
}
