<template>
  <div class="new-page">
    <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">{{ isAddMode ? '添加面试问题' : '新建面试复盘' }}</span>
      </template>
    </el-page-header>

    <el-alert
      v-if="summarizeHint"
      type="warning"
      show-icon
      :closable="false"
      class="hint-alert"
      :title="summarizeHint"
    />

    <!-- 语音录入：默认主流程 -->
    <el-card class="voice-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <span class="card-title">语音录入</span>
            <span class="card-badge">推荐</span>
          </div>
          <span class="card-sub">说一说，AI 帮你整理成完整复盘（总结后需确认再保存）</span>
        </div>
      </template>

      <InterviewVoiceCapture
        ref="voiceRef"
        :session-id="activeSessionId"
        :before-summarize="ensureSessionForVoice"
        @summarized="onVoiceSummarized"
      />
    </el-card>

    <!-- 多题草稿切换 -->
    <el-card v-if="draftQuestions.length > 1" class="draft-nav-card" shadow="never">
      <div class="draft-nav">
        <span class="draft-nav-label">AI 识别到 {{ draftQuestions.length }} 道题</span>
        <el-button-group>
          <el-button
            v-for="(_, i) in draftQuestions"
            :key="i"
            :type="draftIndex === i ? 'primary' : 'default'"
            size="small"
            @click="selectDraft(i)"
          >
            第 {{ i + 1 }} 题
          </el-button>
        </el-button-group>
      </div>
    </el-card>

    <!-- 核对与手动修改 -->
    <el-card class="edit-card" shadow="never">
      <template #header>
        <div class="edit-head" @click="editExpanded = !editExpanded">
          <div>
            <span class="edit-title">核对与手动修改</span>
            <span class="edit-sub">确认 AI 草稿或完全手填后再保存</span>
          </div>
          <el-button link type="primary" @click.stop="editExpanded = !editExpanded">
            {{ editExpanded ? '收起' : '展开编辑' }}
            <el-icon><component :is="editExpanded ? ArrowUp : ArrowDown" /></el-icon>
          </el-button>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="editExpanded">
          <InterviewQuestionFormFields v-model="questionForm" />
        </div>
      </el-collapse-transition>

      <p v-if="!editExpanded && hasFormContent" class="preview-snippet">
        当前题：{{ questionForm.question?.slice(0, 48) }}{{ (questionForm.question?.length ?? 0) > 48 ? '…' : '' }}
        <el-button link type="primary" @click="editExpanded = true">查看全部</el-button>
      </p>
    </el-card>

    <!-- 场次元信息：AI 可能抽取公司/岗位/建议标题 -->
    <el-collapse v-model="metaCollapse" class="meta-collapse">
      <el-collapse-item name="meta">
        <template #title>
          <span class="meta-collapse-title">复盘基本信息</span>
          <span class="meta-collapse-hint">（AI 可能预填，保存时将同步到服务器）</span>
        </template>
        <el-form label-position="top" class="meta-form">
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="复盘标题">
                <el-input v-model="meta.title" placeholder="可用 AI 建议标题或自定义" maxlength="80" show-word-limit />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="面试日期">
                <el-date-picker
                  v-model="meta.interviewAt"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="公司">
                <el-input v-model="meta.companyName" placeholder="可选" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="岗位">
                <el-input v-model="meta.positionName" placeholder="可选" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="轮次">
                <el-input v-model="meta.interviewRound" placeholder="如：一面 / HR 面" clearable />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-collapse-item>
    </el-collapse>

    <div class="form-actions">
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!canSaveCurrent" @click="onSaveQuestion">
        保存本题
      </el-button>
      <el-button
        v-if="draftQuestions.length > 1"
        type="primary"
        plain
        :loading="savingAll"
        @click="onSaveAllDrafts"
      >
        保存全部 {{ draftQuestions.length }} 题
      </el-button>
      <el-button
        v-if="canSaveCurrent"
        type="success"
        plain
        :loading="saving"
        @click="onSaveAndNextVoice"
      >
        保存并继续口述
      </el-button>
      <el-button v-if="activeSessionId" plain @click="goSession">查看问题列表</el-button>
    </div>

    <el-card v-if="savedCount > 0" class="pending-card" shadow="never">
      <template #header>
        <span>本场已保存 {{ savedCount }} 题</span>
      </template>
      <p class="pending-tip">继续点「开始口述」录入下一题，或返回列表查看。</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 新建复盘 / 追加问题。
 * 流程：POST sessions → voice-summarize（草稿）→ 用户确认 → PUT sessions + POST questions。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { InterviewQuestionCreateRequest, InterviewVoiceSummarizeResultVO } from '@/api/interviewTypes'
import InterviewQuestionFormFields from '@/components/interview/InterviewQuestionFormFields.vue'
import InterviewVoiceCapture from '@/components/interview/InterviewVoiceCapture.vue'
import {
  createInterviewQuestion,
  createInterviewSession,
  emptyQuestionForm,
  syncInterviewSessionMeta,
} from '@/services/interviewService'
import {
  applyExtractedSessionToMeta,
  draftToCreateRequest,
  hasExtractedSession,
  normalizeVoiceSummarizeQuestions,
} from '@/utils/interviewVoiceResult'

const route = useRoute()
const router = useRouter()

const voiceRef = ref<InstanceType<typeof InterviewVoiceCapture> | null>(null)
const saving = ref(false)
const savingAll = ref(false)
const activeSessionId = ref<number | null>(null)
const savedCount = ref(0)
const editExpanded = ref(false)
const metaCollapse = ref<string[]>([])
const summarizeHint = ref('')
const draftQuestions = ref<InterviewQuestionCreateRequest[]>([])
const draftIndex = ref(0)

const meta = reactive({
  title: '',
  companyName: '',
  positionName: '',
  interviewRound: '',
  interviewAt: '' as string | undefined,
})

const questionForm = ref(emptyQuestionForm())

const isAddMode = computed(() => !!route.query.sessionId)

const hasFormContent = computed(() => Boolean(questionForm.value.question?.trim()))

const canSaveCurrent = computed(() => hasFormContent.value)

/** 切换草稿题目前，把当前表单写回 draftQuestions */
watch(
  questionForm,
  (form) => {
    if (draftQuestions.value.length === 0) return
    draftQuestions.value[draftIndex.value] = { ...form }
  },
  { deep: true },
)

onMounted(() => {
  const sid = route.query.sessionId
  if (sid) activeSessionId.value = Number(sid)
})

function defaultSessionTitle() {
  const d = new Date()
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`
  const parts = [meta.companyName?.trim(), meta.positionName?.trim()].filter(Boolean)
  if (parts.length) return `${parts.join(' · ')} 面试复盘`
  return `面试复盘 ${dateStr}`
}

/** voice-summarize 要求 session 已存在且归属当前用户 */
async function ensureSessionForVoice(): Promise<number> {
  if (activeSessionId.value != null) return activeSessionId.value
  const title = meta.title.trim() || defaultSessionTitle()
  const id = await createInterviewSession({
    title,
    companyName: meta.companyName.trim() || undefined,
    positionName: meta.positionName.trim() || undefined,
    interviewRound: meta.interviewRound.trim() || undefined,
    interviewAt: meta.interviewAt || undefined,
  })
  activeSessionId.value = id
  if (!meta.title.trim()) meta.title = title
  return id
}

function selectDraft(index: number) {
  draftQuestions.value[draftIndex.value] = { ...questionForm.value }
  draftIndex.value = index
  questionForm.value = { ...draftQuestions.value[index] }
}

function onVoiceSummarized(result: InterviewVoiceSummarizeResultVO) {
  summarizeHint.value = result.hint?.trim() ?? ''

  if (hasExtractedSession(result.extractedSession)) {
    applyExtractedSessionToMeta(meta, result.extractedSession)
    if (!metaCollapse.value.includes('meta')) metaCollapse.value = ['meta']
  }

  const drafts = normalizeVoiceSummarizeQuestions(result)
  if (drafts.length === 0) {
    ElMessage.warning('未识别到有效问题，请补充口述或手动填写')
    return
  }

  draftQuestions.value = drafts.map((d) => ({ ...d }))
  draftIndex.value = 0
  questionForm.value = { ...draftQuestions.value[0] }
  editExpanded.value = true
}

function goBack() {
  if (activeSessionId.value) {
    router.push({ name: 'interview-session', params: { sessionId: String(activeSessionId.value) } })
  } else {
    router.push({ name: 'interview-list' })
  }
}

function goSession() {
  if (!activeSessionId.value) return
  router.push({ name: 'interview-session', params: { sessionId: String(activeSessionId.value) } })
}

async function persistSessionMeta(sessionId: number) {
  await syncInterviewSessionMeta(sessionId, meta)
}

async function onSaveQuestion(opts?: { stayOnPage?: boolean }): Promise<number | null> {
  if (!questionForm.value.question?.trim()) {
    ElMessage.warning('请先口述总结或手动填写面试问题')
    return null
  }
  if (draftQuestions.value.length > 0) {
    draftQuestions.value[draftIndex.value] = { ...questionForm.value }
  }
  saving.value = true
  try {
    const sid = await ensureSessionForVoice()
    await persistSessionMeta(sid)
    const body = draftToCreateRequest(questionForm.value)
    await createInterviewQuestion(sid, body)
    savedCount.value += 1
    ElMessage.success('已保存')
    if (isAddMode.value && !opts?.stayOnPage) {
      await router.replace({ name: 'interview-session', params: { sessionId: String(sid) } })
    }
    return sid
  } catch (e: unknown) {
    if (e instanceof Error) ElMessage.error(e.message)
    return null
  } finally {
    saving.value = false
  }
}

/** 按 AI 返回的 questions 数组逐条 POST（V1 无 batch 接口） */
async function onSaveAllDrafts() {
  draftQuestions.value[draftIndex.value] = { ...questionForm.value }
  const valid = draftQuestions.value.filter((q) => q.question?.trim())
  if (!valid.length) {
    ElMessage.warning('没有可保存的题目')
    return
  }
  savingAll.value = true
  try {
    const sid = await ensureSessionForVoice()
    await persistSessionMeta(sid)
    for (let i = 0; i < valid.length; i++) {
      await createInterviewQuestion(sid, draftToCreateRequest(valid[i], i + 1))
    }
    savedCount.value += valid.length
    ElMessage.success(`已保存 ${valid.length} 题`)
    draftQuestions.value = []
    questionForm.value = emptyQuestionForm()
    await router.replace({ name: 'interview-session', params: { sessionId: String(sid) } })
  } catch (e: unknown) {
    if (e instanceof Error) ElMessage.error(e.message)
  } finally {
    savingAll.value = false
  }
}

async function onSaveAndNextVoice() {
  const sid = await onSaveQuestion({ stayOnPage: true })
  if (sid == null) return
  draftQuestions.value = []
  draftIndex.value = 0
  summarizeHint.value = ''
  questionForm.value = emptyQuestionForm()
  editExpanded.value = false
  voiceRef.value?.resetForNext()
  ElMessage.info('请继续口述下一题')
}
</script>

<style scoped>
.new-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint-alert {
  border-radius: var(--xt-radius-md);
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 700;
  color: var(--xt-text);
}

.voice-card {
  border-radius: var(--xt-radius-md);
  border-color: var(--xt-border-strong);
}

.voice-card :deep(.el-card__header) {
  background: linear-gradient(90deg, var(--el-color-primary-light-9), transparent);
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
}

.card-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--xt-text);
  margin-right: 8px;
}

.card-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--xt-primary);
  color: #fff;
  vertical-align: middle;
}

.card-sub {
  font-size: 13px;
  color: var(--xt-text-muted);
}

.draft-nav-card,
.edit-card,
.pending-card {
  border-radius: var(--xt-radius-md);
}

.draft-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.draft-nav-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--xt-text);
}

.edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.edit-title {
  font-weight: 600;
  color: var(--xt-text);
  margin-right: 8px;
}

.edit-sub {
  font-size: 12px;
  color: var(--xt-text-muted);
}

.preview-snippet {
  margin: 0;
  padding-top: 4px;
  font-size: 13px;
  color: var(--xt-text-secondary);
  line-height: 1.5;
}

.meta-collapse {
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  overflow: hidden;
  background: var(--xt-surface);
}

.meta-collapse-title {
  font-weight: 600;
  color: var(--xt-text);
}

.meta-collapse-hint {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--xt-text-muted);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 0 8px;
}

.form-actions :deep(.el-button) {
  cursor: pointer;
}

.pending-tip {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-secondary);
}
</style>
