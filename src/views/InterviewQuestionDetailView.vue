<template>
  <div class="detail-page">
    <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">问题详情</span>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="10" animated />

    <template v-else-if="question">
      <div class="toolbar">
        <div class="toolbar-orbit">
          <OrbitProgress :steps="2" :active="practiceMode ? 1 : 0" size="sm" />
        </div>
        <el-switch
          v-model="practiceMode"
          inline-prompt
          active-text="练习"
          inactive-text="全文"
          aria-label="练习模式"
        />
        <span class="toolbar-hint">{{ practiceMode ? '答案已遮盖，点击各区块可揭开/遮盖' : '显示完整复盘内容' }}</span>
        <el-button v-if="!editing" type="primary" link @click="editing = true">编辑</el-button>
      </div>

      <el-card v-if="!editing" class="content-card" shadow="never">
        <section class="block block-primary">
          <h2 class="block-title">面试问题</h2>
          <p class="block-body">{{ question.question || '—' }}</p>
        </section>

        <section class="block" :class="{ covered: practiceMode && !revealed.myAnswer }">
          <div class="block-head">
            <h2 class="block-title">我的回答</h2>
            <el-button
              v-if="practiceMode"
              type="primary"
              link
              @click="revealed.myAnswer = !revealed.myAnswer"
            >
              {{ revealed.myAnswer ? '遮盖' : '揭开' }}
            </el-button>
          </div>
          <ConstellationReveal v-if="practiceMode && revealed.myAnswer" :revealed="true">
            <p class="block-body">{{ question.myAnswer || '—' }}</p>
          </ConstellationReveal>
          <p v-else-if="!practiceMode" class="block-body">{{ question.myAnswer || '—' }}</p>
          <p v-else class="cover-placeholder">已遮盖 · 先尝试用自己的话回答一遍</p>
        </section>

        <section class="block" :class="{ covered: practiceMode && !revealed.answerEvaluation }">
          <div class="block-head">
            <h2 class="block-title">回答评价</h2>
            <el-button
              v-if="practiceMode"
              type="primary"
              link
              @click="revealed.answerEvaluation = !revealed.answerEvaluation"
            >
              {{ revealed.answerEvaluation ? '遮盖' : '揭开' }}
            </el-button>
          </div>
          <ConstellationReveal v-if="practiceMode && revealed.answerEvaluation" :revealed="true">
            <p class="block-body">{{ question.answerEvaluation || '—' }}</p>
          </ConstellationReveal>
          <p v-else-if="!practiceMode" class="block-body">{{ question.answerEvaluation || '—' }}</p>
          <p v-else class="cover-placeholder">已遮盖</p>
        </section>

        <section class="block" :class="{ covered: practiceMode && !revealed.referenceAnswer }">
          <div class="block-head">
            <h2 class="block-title">参考答案</h2>
            <el-button
              v-if="practiceMode"
              type="primary"
              link
              @click="revealed.referenceAnswer = !revealed.referenceAnswer"
            >
              {{ revealed.referenceAnswer ? '遮盖' : '揭开' }}
            </el-button>
          </div>
          <ConstellationReveal v-if="practiceMode && revealed.referenceAnswer" :revealed="true">
            <p class="block-body">{{ question.referenceAnswer || '—' }}</p>
          </ConstellationReveal>
          <p v-else-if="!practiceMode" class="block-body">{{ question.referenceAnswer || '—' }}</p>
          <p v-else class="cover-placeholder">已遮盖 · 自答后再对照参考思路</p>
        </section>

        <section class="block" :class="{ covered: practiceMode && !revealed.otherNotes }">
          <div class="block-head">
            <h2 class="block-title">其他交流信息</h2>
            <el-button
              v-if="practiceMode"
              type="primary"
              link
              @click="revealed.otherNotes = !revealed.otherNotes"
            >
              {{ revealed.otherNotes ? '遮盖' : '揭开' }}
            </el-button>
          </div>
          <ConstellationReveal v-if="practiceMode && revealed.otherNotes" :revealed="true">
            <p class="block-body">{{ question.otherNotes || '—' }}</p>
          </ConstellationReveal>
          <p v-else-if="!practiceMode" class="block-body">{{ question.otherNotes || '—' }}</p>
          <p v-else class="cover-placeholder">已遮盖</p>
        </section>

        <div v-if="practiceMode" class="reveal-all">
          <el-button type="primary" plain @click="revealAll">一键揭开全部</el-button>
        </div>
      </el-card>

      <el-card v-else class="content-card" shadow="never">
        <InterviewQuestionFormFields v-model="editForm" />
        <div class="edit-actions">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveEdit">保存修改</el-button>
          <el-button type="danger" plain :loading="deleting" @click="onDelete">删除此题</el-button>
        </div>
      </el-card>
    </template>

    <el-result v-else icon="warning" title="未找到问题">
      <template #extra>
        <el-button type="primary" @click="goBack">返回</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
/**
 * 单题详情：五段式展示 + 练习模式（遮盖答案，可逐块揭开）+ 编辑/删除。
 * 练习模式不请求后端，仅控制 UI 显隐。
 */
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { InterviewQuestionCreateRequest, InterviewQuestionVO } from '@/api/interviewTypes'
import InterviewQuestionFormFields from '@/components/interview/InterviewQuestionFormFields.vue'
import {
  deleteInterviewQuestion,
  getInterviewSessionDetail,
  updateInterviewQuestion,
} from '@/services/interviewService'
import ConstellationReveal from '@/components/ConstellationReveal.vue'
import OrbitProgress from '@/components/OrbitProgress.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const editing = ref(false)
const practiceMode = ref(route.query.practice === '1')
const question = ref<InterviewQuestionVO | null>(null)
const editForm = ref<InterviewQuestionCreateRequest>({
  question: '',
  myAnswer: '',
  answerEvaluation: '',
  referenceAnswer: '',
  otherNotes: '',
})

/** 练习模式下各答案区块是否已「揭开」 */
const revealed = reactive({
  myAnswer: false,
  answerEvaluation: false,
  referenceAnswer: false,
  otherNotes: false,
})

const sessionId = () => String(route.params.sessionId)
const questionId = () => String(route.params.questionId)

watch(practiceMode, (v) => {
  if (v) resetRevealed()
})

function resetRevealed() {
  revealed.myAnswer = false
  revealed.answerEvaluation = false
  revealed.referenceAnswer = false
  revealed.otherNotes = false
}

function revealAll() {
  revealed.myAnswer = true
  revealed.answerEvaluation = true
  revealed.referenceAnswer = true
  revealed.otherNotes = true
}

async function load() {
  loading.value = true
  try {
    const detail = await getInterviewSessionDetail(sessionId())
    const q = detail.questions.find((x) => x.questionId === questionId()) ?? null
    question.value = q
    if (q) syncEditForm(q)
  } catch {
    question.value = null
  } finally {
    loading.value = false
  }
}

function syncEditForm(q: InterviewQuestionVO) {
  editForm.value = {
    question: q.question,
    myAnswer: q.myAnswer ?? '',
    answerEvaluation: q.answerEvaluation ?? '',
    referenceAnswer: q.referenceAnswer ?? '',
    otherNotes: q.otherNotes ?? '',
  }
}

onMounted(load)

function goBack() {
  router.push({ name: 'interview-session', params: { sessionId: String(sessionId()) } })
}

function cancelEdit() {
  if (question.value) syncEditForm(question.value)
  editing.value = false
}

async function saveEdit() {
  if (!editForm.value.question?.trim()) {
    ElMessage.warning('请填写面试问题')
    return
  }
  saving.value = true
  try {
    await updateInterviewQuestion(sessionId(), questionId(), editForm.value)
    ElMessage.success('已保存')
    editing.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  try {
    await ElMessageBox.confirm('确定删除该问题？', '删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteInterviewQuestion(sessionId(), questionId())
    ElMessage.success('已删除')
    await router.replace({ name: 'interview-session', params: { sessionId: String(sessionId()) } })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 700;
  color: var(--xt-text);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--xt-radius-md);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
}

.toolbar-orbit {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 50%;
  background: var(--xt-surface-solid);
  border: 1px solid var(--xt-border);
  box-shadow: var(--xt-shadow-sm);
}

.toolbar-hint {
  flex: 1;
  font-size: 13px;
  color: var(--xt-text-muted);
}

.toolbar :deep(.el-button) {
  cursor: pointer;
}

.content-card {
  border-radius: var(--xt-radius-md);
}

.content-card :deep(.el-card__body) {
  padding: 8px 20px 20px;
}

.block {
  padding: 18px 0;
  border-bottom: 1px solid var(--xt-border);
}

.block:last-of-type {
  border-bottom: none;
}

.block-primary {
  padding-top: 8px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--xt-primary);
  text-transform: uppercase;
}

.block-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--xt-text);
  white-space: pre-wrap;
}

.block.covered {
  background: linear-gradient(180deg, var(--el-color-warning-light-9) 0%, transparent 100%);
  margin: 0 -20px;
  padding-left: 20px;
  padding-right: 20px;
  border-radius: var(--xt-radius-sm);
}

.cover-placeholder {
  margin: 0;
  font-size: 14px;
  color: var(--xt-text-muted);
  font-style: italic;
  padding: 12px 14px;
  border-radius: var(--xt-radius-sm);
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed var(--xt-border-strong);
}

.reveal-all {
  padding-top: 16px;
  text-align: center;
}

.reveal-all :deep(.el-button) {
  cursor: pointer;
}

.edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--xt-border);
}

.edit-actions :deep(.el-button) {
  cursor: pointer;
}
</style>
