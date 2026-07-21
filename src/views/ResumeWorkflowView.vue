<template>
  <ResumePageLayout full-width :show-nav="!!parseResult">
    <div class="workflow">
      <el-page-header class="page-head" @back="goList">
      <template #content>
        <span class="page-head-title">上传解析</span>
      </template>
    </el-page-header>

    <div class="head">
      <h1 class="title">简历原件与智能填写</h1>
      <p class="desc">
        上传 PDF / Word 简历，系统将自动抽取文本并由大模型生成结构化草稿。请在上传后仔细核对各字段，模型结果仅供参考。
      </p>
    </div>

    <el-steps :active="step" align-center finish-status="success" class="steps">
      <el-step title="上传简历" description="仅支持 .pdf / .docx" />
      <el-step title="智能解析" description="上传文件并由 AI 抽取简历信息" />
      <el-step title="核对并保存" description="核对草稿后可保存，支持后续更新" />
    </el-steps>

    <!-- 解析中：隐藏上传卡片，直接展示星空等待模块 -->
    <div v-if="parsing" class="waiting-wrap">
      <StarWaitingModule
        title="AI 正在解析简历并生成结构化草稿"
        :completed="parseCompleted"
        :estimated-seconds="60"
        @done="onWaitingDone"
      />
    </div>

    <template v-else>
      <el-card class="card upload-card" shadow="never">
        <template #header>
          <div class="card-head">
            <span>上传简历原件</span>
            <el-tag v-if="lastFileName" type="success" effect="plain">{{ lastFileName }}</el-tag>
          </div>
        </template>

        <div class="upload-body">
          <el-upload
            class="uploader"
            drag
            :show-file-list="false"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            :before-upload="beforeUpload"
            :http-request="onCustomUpload"
            :disabled="parsing"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或 <em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">
                仅支持 <b>.pdf</b> 与 <b>.docx</b>，大小不超过 <b>{{ maxMb }}MB</b>。解析耗时取决于文件大小与模型负载，请耐心等待。
              </div>
            </template>
          </el-upload>

          <div v-if="parseResult" class="parse-meta">
            <el-alert
              title="解析完成"
              type="success"
              show-icon
              :closable="false"
              description="已生成结构化草稿，请核对下方内容并保存。"
            />

            <div v-if="parseResult.parseNotes?.length" class="notes">
              <div class="notes-title">解析提示（非错误）</div>
              <el-alert
                v-for="(n, i) in parseResult.parseNotes"
                :key="i"
                :title="n"
                type="warning"
                show-icon
                :closable="false"
                class="note-line"
              />
            </div>
          </div>

          <div v-if="parseResult" class="actions">
            <el-button @click="resetAll">重新上传</el-button>
          </div>
        </div>
      </el-card>
    </template>

    <template v-if="parseResult">
      <ResumeSaveToolbar
        v-model:title="resumeListTitle"
        v-model:isDefault="resumeIsDefault"
        :saving="savingDraft"
        :save-label="savedResumeId == null ? '保存为新简历' : '保存更新'"
        @save="onSaveDraft"
      />

      <MeteorLine class="save-meteor" :active="meteorActive" />

      <el-card class="card form-card" shadow="never">
        <template #header>
          <div class="form-card-head">
            <span>简历信息（草稿）</span>
          </div>
        </template>
        <p v-if="savedResumeId != null" class="saved-hint">
          已保存到云端，再次保存将更新此简历。
          <el-button type="primary" link @click="goEditSaved">在独立编辑页打开</el-button>
        </p>
        <ResumeDraftForm :draft="draft" />
      </el-card>
    </template>
    </div>
  </ResumePageLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import type { ResumeParseDraftDto, ResumeParseResultVO } from '@/api/resumeTypes'
import { saveResumeDraft, updateResume, uploadAndParseResumeData } from '@/api/resume'
import { buildDraftFromParseResult, emptyDraft } from '@/utils/resumeDraft'
import { getResumeSaveValidationErrors } from '@/utils/resumeValidation'
import ResumeDraftForm from '@/components/resume/ResumeDraftForm.vue'
import ResumePageLayout from '@/components/resume/ResumePageLayout.vue'
import ResumeSaveToolbar from '@/components/resume/ResumeSaveToolbar.vue'
import MeteorLine from '@/components/MeteorLine.vue'
import StarWaitingModule from '@/components/StarWaitingModule.vue'
import { ElMessage } from 'element-plus'

const maxMb = 20
const maxBytes = maxMb * 1024 * 1024

const parsing = ref(false)
const parseCompleted = ref(false)

const router = useRouter()

const parseResult = ref<ResumeParseResultVO | null>(null)
const lastFileName = ref('')
const draft = reactive<ResumeParseDraftDto>(emptyDraft())

const savedResumeId = ref<number | null>(null)
const resumeListTitle = ref('')
const resumeIsDefault = ref(0)
const savingDraft = ref(false)
const meteorActive = ref(false)
let meteorTimer: ReturnType<typeof setTimeout> | null = null

function goList() {
  router.push({ name: 'resume-list' })
}

function goEditSaved() {
  if (savedResumeId.value == null) return
  router.push({ name: 'resume-edit', params: { resumeId: String(savedResumeId.value) } })
}

function suggestListTitle() {
  const fromDraft = draft.title?.trim()
  const base = lastFileName.value.replace(/\.[^.]+$/i, '').trim()
  resumeListTitle.value = fromDraft || base || '我的简历'
}

async function onSaveDraft() {
  const pr = parseResult.value
  if (!pr) return
  const verr = getResumeSaveValidationErrors(draft, { listTitle: resumeListTitle.value })
  if (verr.length) {
    ElMessage.error(verr.join('；'))
    return
  }
  savingDraft.value = true
  try {
    if (savedResumeId.value == null) {
      const r = await saveResumeDraft({
        draft,
        title: resumeListTitle.value || undefined,
        isDefault: resumeIsDefault.value,
        originalFilename: pr.originalFilename,
        ossBucket: pr.ossBucket,
        ossObjectKey: pr.ossObjectKey,
      })
      savedResumeId.value = r.resumeId
      ElMessage.success('已保存，可在「我的简历」中查看或继续编辑后更新')
      triggerMeteor()
    } else {
      await updateResume(savedResumeId.value, {
        title: resumeListTitle.value || undefined,
        isDefault: resumeIsDefault.value,
        draft,
        originalFilename: pr.originalFilename,
        ossBucket: pr.ossBucket,
        ossObjectKey: pr.ossObjectKey,
      })
      ElMessage.success('已更新保存')
      triggerMeteor()
    }
  } finally {
    savingDraft.value = false
  }
}

function triggerMeteor() {
  if (meteorTimer) clearTimeout(meteorTimer)
  meteorActive.value = false
  void Promise.resolve().then(() => {
    meteorActive.value = true
    meteorTimer = setTimeout(() => {
      meteorActive.value = false
    }, 900)
  })
}

function onWaitingDone() {
  // 等待模块动画结束后，把结果切回展示
  parsing.value = false
  parseCompleted.value = false
}

const step = computed(() => {
  if (parsing.value) return 1
  if (parseResult.value) return 2
  return 0
})

function applyDraftFromResult(res: ResumeParseResultVO) {
  const merged = buildDraftFromParseResult(res)
  for (const k of Object.keys(merged) as (keyof ResumeParseDraftDto)[]) {
    ;(draft as Record<string, unknown>)[k] = merged[k] as unknown
  }
}

function beforeUpload(file: File) {
  const name = file.name.toLowerCase()
  const ok = name.endsWith('.pdf') || name.endsWith('.docx')
  if (!ok) {
    ElMessage.error('仅支持 .pdf 或 .docx 格式')
    return false
  }
  if (file.size > maxBytes) {
    ElMessage.error(`文件过大，请控制在 ${maxMb}MB 以内`)
    return false
  }
  return true
}

async function onCustomUpload(opt: UploadRequestOptions) {
  const file = opt.file as File
  lastFileName.value = file.name
  savedResumeId.value = null
  parsing.value = true
  parseCompleted.value = false
  try {
    const res = await uploadAndParseResumeData(file)
    parseResult.value = res
    applyDraftFromResult(res)
    suggestListTitle()
    if (!res.draft) {
      ElMessage.warning('未返回草稿结构，可手动填写下方表单')
    } else {
      ElMessage.success('解析完成，请核对下方草稿')
    }
  } catch (e: unknown) {
    parseResult.value = null
    parsing.value = false
    if (e instanceof Error && e.message === '解析结果为空') {
      ElMessage.warning(e.message)
    }
  } finally {
    parseCompleted.value = true
  }
}

function resetAll() {
  parseResult.value = null
  lastFileName.value = ''
  savedResumeId.value = null
  resumeListTitle.value = ''
  resumeIsDefault.value = 0
  const fresh = emptyDraft()
  for (const k of Object.keys(fresh) as (keyof ResumeParseDraftDto)[]) {
    ;(draft as Record<string, unknown>)[k] = fresh[k] as unknown
  }
}
</script>

<style scoped>
.workflow {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  padding: 0;
}

.page-head-title {
  font-weight: 600;
  font-size: 16px;
}

.head .title {
  margin: 0 0 8px;
  font-size: 22px;
  color: var(--xt-text);
  font-weight: 700;
}

.head .desc {
  margin: 0;
  color: var(--xt-text-secondary);
  line-height: 1.6;
  font-size: 14px;
}

.steps {
  /* 样式由 xt-main-content 全局提供 */
}

.save-meteor {
  margin-top: 8px;
}

.card {
  border-radius: 12px;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.upload-body {
  position: relative;
}

.waiting-wrap {
  border-radius: 12px;
  overflow: hidden;
}

.uploader {
  width: 100%;
}

.uploader :deep(.el-upload-dragger) {
  border-radius: 12px;
}

.uploader :deep(.el-upload__tip) {
  color: #4b5563;
  line-height: 1.55;
  font-size: 13px;
}

.el-icon--upload {
  font-size: 48px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.parse-meta {
  margin-top: 18px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 12px;
  word-break: break-all;
}

.notes {
  margin-top: 14px;
}

.notes-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.note-line + .note-line {
  margin-top: 8px;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.form-card {
  margin-top: 0;
}

.form-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.saved-hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.55;
}
</style>
