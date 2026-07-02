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

    <div class="orbit-stepper">
      <OrbitProgress :steps="3" :active="step" size="md" :labels="['上传', '解析', '保存']" />
    </div>

    <el-steps :active="step" align-center finish-status="success" class="steps">
      <el-step title="上传简历" description="仅支持 .pdf / .docx" />
      <el-step title="智能解析" description="上传文件并由 AI 抽取简历信息" />
      <el-step title="核对并保存" description="核对草稿后可保存，支持后续更新" />
    </el-steps>

    <el-card class="card upload-card" shadow="never">
      <template #header>
        <div class="card-head">
          <span>上传简历原件</span>
          <el-tag v-if="lastFileName" type="success" effect="plain">{{ lastFileName }}</el-tag>
        </div>
      </template>

      <div class="upload-body">
        <transition name="parse-fade">
          <div v-if="parsing" class="parse-overlay" role="status" aria-live="polite">
            <div class="parse-overlay-card">
              <div class="parse-spin" aria-hidden="true"></div>
              <p class="parse-title">正在智能解析中，请稍候</p>
              <p class="parse-desc">
                文件已提交，正在上传至云端并由大模型抽取结构化信息。此过程通常需要数十秒至数分钟，取决于文件大小与服务负载，
                <strong>属于正常等待</strong>，并非页面卡死。请勿关闭或刷新本页。
              </p>
              <el-progress
                class="parse-progress"
                :percentage="parseProgress"
                :stroke-width="12"
                striped
                striped-flow
                :duration="2.5"
              />
              <p class="parse-foot">
                进度为预估进度，仅作参考；若超过十分钟仍无结果，请检查网络后重试。
              </p>
            </div>
          </div>
        </transition>

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
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
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
import OrbitProgress from '@/components/OrbitProgress.vue'
import MeteorLine from '@/components/MeteorLine.vue'
import { ElMessage } from 'element-plus'

const maxMb = 20
const maxBytes = maxMb * 1024 * 1024

const parsing = ref(false)
const parseProgress = ref(0)
let parseProgressTimer: ReturnType<typeof setInterval> | null = null

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
  void nextTick(() => {
    meteorActive.value = true
    meteorTimer = setTimeout(() => {
      meteorActive.value = false
    }, 900)
  })
}

function clearParseProgressTimer() {
  if (parseProgressTimer) {
    clearInterval(parseProgressTimer)
    parseProgressTimer = null
  }
}

function startParseProgress() {
  clearParseProgressTimer()
  parseProgress.value = 6
  parseProgressTimer = setInterval(() => {
    if (parseProgress.value >= 88) return
    const next = parseProgress.value + (Math.random() * 4 + 0.8)
    parseProgress.value = Math.min(88, Math.round(next * 10) / 10)
  }, 380)
}

function completeParseProgress() {
  clearParseProgressTimer()
  parseProgress.value = 100
}

function resetParseProgress() {
  clearParseProgressTimer()
  parseProgress.value = 0
}

onBeforeUnmount(() => {
  clearParseProgressTimer()
})

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
  startParseProgress()
  try {
    const res = await uploadAndParseResumeData(file)
    parseResult.value = res
    applyDraftFromResult(res)
    suggestListTitle()
    completeParseProgress()
    await new Promise((r) => setTimeout(r, 420))
    if (!res.draft) {
      ElMessage.warning('未返回草稿结构，可手动填写下方表单')
    } else {
      ElMessage.success('解析完成，请核对下方草稿')
    }
  } catch (e: unknown) {
    resetParseProgress()
    parseResult.value = null
    if (e instanceof Error && e.message === '解析结果为空') {
      ElMessage.warning(e.message)
    }
  } finally {
    parsing.value = false
    if (parseProgress.value === 100) {
      setTimeout(() => {
        parseProgress.value = 0
      }, 400)
    } else {
      resetParseProgress()
    }
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

.orbit-stepper {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
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

.parse-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  min-height: 240px;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(6px);
  border-radius: 8px;
}

.parse-overlay-card {
  width: 100%;
  max-width: 520px;
  text-align: center;
}

.parse-spin {
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 50%;
  border: 2.5px solid rgba(99, 102, 241, 0.15);
  border-top-color: var(--xt-primary);
  animation: parse-spin-rotate 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .parse-spin {
    animation: none;
    border-color: var(--xt-primary);
    opacity: 0.6;
  }
}

@keyframes parse-spin-rotate {
  to {
    transform: rotate(360deg);
  }
}

.parse-title {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

.parse-desc {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.65;
  color: #4b5563;
  text-align: left;
}

.parse-progress {
  margin-bottom: 12px;
}

.parse-foot {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.parse-fade-enter-active,
.parse-fade-leave-active {
  transition: opacity 0.28s ease;
}

.parse-fade-enter-from,
.parse-fade-leave-to {
  opacity: 0;
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
