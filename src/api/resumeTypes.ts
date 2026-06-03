/** 与后端 ResumeParseResultVO / ResumeParseDraftDto 对齐 */

export interface ResumeParseResultVO {
  originalFilename: string
  contentType: string
  ossBucket: string
  ossObjectKey: string
  ossPublicUrl: string | null
  plainTextCharLength: number
  parseNotes: string[]
  draft: ResumeParseDraftDto | null
}

export interface ResumeParseDraftDto {
  title?: string
  fullName?: string
  gender?: number | null
  birthDate?: string
  idDocType?: string
  idDocNumber?: string
  phone?: string
  email?: string
  qq?: string
  wechat?: string
  countryRegion?: string
  nativePlace?: string
  ethnicity?: string
  politicalStatus?: string
  hukouType?: string
  province?: string
  city?: string
  district?: string
  currentCity?: string
  detailAddress?: string
  mailingSameAsCurrent?: number | null
  mailingAddress?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  jobSeekingStatus?: number | null
  isFreshGraduate?: number | null
  workYears?: string
  expectedPositions?: string
  expectedCities?: string
  expectedIndustries?: string
  salaryExpectation?: string
  availability?: string
  acceptTransfer?: number | null
  selfIntro?: string
  strengths?: string
  portfolioLinks?: string
  educations: ResumeEducationDraftLine[]
  works: ResumeWorkDraftLine[]
  projects: ResumeProjectDraftLine[]
  campusExperiences: ResumeCampusDraftLine[]
  skills: ResumeSkillDraftLine[]
  languages: ResumeLanguageDraftLine[]
  certificates: ResumeCertificateDraftLine[]
  awards: ResumeAwardDraftLine[]
  publications: ResumePublicationDraftLine[]
}

export interface ResumeEducationDraftLine {
  schoolName?: string
  collegeName?: string
  major?: string
  degree?: string
  academicDegree?: string
  isFullTime?: number | null
  enrollDate?: string
  graduateDate?: string
  countryRegion?: string
  gpa?: string
  rankingDesc?: string
  majorCourses?: string
  studentPosition?: string
  honors?: string
  description?: string
}

export interface ResumeWorkDraftLine {
  companyName?: string
  department?: string
  jobTitle?: string
  workCity?: string
  companyIndustry?: string
  employmentNature?: string
  startDate?: string
  endDate?: string
  workDescription?: string
  leaveReason?: string
}

export interface ResumeProjectDraftLine {
  projectName?: string
  roleName?: string
  startDate?: string
  endDate?: string
  companyOrOrg?: string
  techKeywords?: string
  projectUrl?: string
  dutyDescription?: string
  achievement?: string
  description?: string
}

export interface ResumeCampusDraftLine {
  organizationName?: string
  roleTitle?: string
  startDate?: string
  endDate?: string
  description?: string
}

export interface ResumeSkillDraftLine {
  skillCategory?: string
  skillName?: string
  proficiency?: string
  monthsOfUse?: number | null
}

export interface ResumeLanguageDraftLine {
  languageName?: string
  listenLevel?: string
  speakLevel?: string
  readLevel?: string
  writeLevel?: string
  certName?: string
  certScore?: string
}

export interface ResumeCertificateDraftLine {
  certName?: string
  issuer?: string
  obtainDate?: string
  certNo?: string
}

export interface ResumeAwardDraftLine {
  awardName?: string
  awardLevel?: string
  issuer?: string
  awardDate?: string
  description?: string
}

export interface ResumePublicationDraftLine {
  pubType?: string
  title?: string
  role?: string
  venue?: string
  publishDate?: string
  description?: string
}

/** POST /resume/save-draft */
export interface ResumeSaveDraftRequest {
  resumeId?: number | null
  title?: string
  isDefault?: number | null
  draft: ResumeParseDraftDto
  originalFilename?: string
  ossBucket?: string
  ossObjectKey?: string
}

export interface ResumeSaveDraftResultVO {
  resumeId: number
}

/** GET /resume/list */
export interface ResumeListItemVO {
  resumeId: number
  title: string
  isDefault: number
  fullName: string | null
  updatedAt: string
}

/** GET /resume/{resumeId} */
export interface ResumeDetailVO {
  resumeId: number
  title: string
  isDefault: number
  schemaVersion: number
  updatedAt: string
  draft: ResumeParseDraftDto
}

/** PUT /resume/{resumeId} */
export interface ResumeUpdateRequest {
  title?: string
  isDefault?: number | null
  draft: ResumeParseDraftDto
  originalFilename?: string
  ossBucket?: string
  ossObjectKey?: string
}
