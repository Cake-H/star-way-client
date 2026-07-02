<template>
  <div v-loading="loading" class="mock-interview-practice-page">
    <el-page-header class="page-head" title=" " @back="onLeave">
      <template #content>
        <span class="page-title">模拟面试 · 练习模式</span>
      </template>
    </el-page-header>

    <el-result v-if="!loading && error" icon="error" title="加载失败" :sub-title="error" class="result"
      >
      <template #extra>
        <el-button @click="load">重试</el-button>
      </template>
    </el-result>

    <template v-else-if="interview">
      <div class="practice-header">
        <div class="practice-meta">
          <h2 class="interview-title">{{ interview.title }}</h2>
          <p class="interview-sub">{{ interview.questionCount }} 题 · 第 {{ currentIndex + 1 }} 题</p>
        </div>
        <OrbitProgress
          :steps="interview.questions.length"
          :active="currentIndex"
          size="md"
          :labels="progressLabels"
        />
      </div>

      <MockInterviewQuestionCard
        v-if="currentQuestion"
        :question="currentQuestion"
        :index="currentIndex + 1"
        :practice-mode="!answerRevealed"
        class="question-card"
      />

      <el-empty v-else description="暂无题目" />

      <div class="practice-toolbar">
        <el-button-group>
          <el-button :disabled="currentIndex <= 0" size="large" @click="prev"
            ><el-icon><ArrowLeft /></el-icon>上一题
          </el-button>
          <el-button :disabled="currentIndex >= interview.questions.length - 1" size="large" @click="next"
            >下一题<el-icon><ArrowRight /></el-icon>
          </el-button>
        </el-button-group>

        <el-button
          size="large"
          :type="answerRevealed ? 'default' : 'primary'"
          plain
          @click="toggleReveal"
        >
          {{ answerRevealed ? '隐藏答案' : '查看答案' }}
        </el-button>

        <el-button v-if="isLast" type="success" size="large" :loading="finishing" @click="finish"
          >完成练习
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { MockInterviewPracticeProgress, MockInterviewVO } from '@/api/mockInterviewTypes'
import {
  getMockInterviewDetail,
  loadPracticeProgress,
  savePracticeProgress,
  updateMockInterviewStatus,
} from '@/services/mockInterviewService'
import MockInterviewQuestionCard from '@/components/mockInterview/MockInterviewQuestionCard.vue'
import OrbitProgress from '@/components/OrbitProgress.vue'

const route = useRoute()
const router = useRouter()
const interview = ref<MockInterviewVO | null>(null)
const loading = ref(true)
const error = ref('')
const currentIndex = ref(0)
const answerRevealed = ref(false)
const finishing = ref(false)

const mockInterviewId = computed(() => Number(route.params.mockInterviewId))
const currentQuestion = computed(() => interview.value?.questions[currentIndex.value])
const isLast = computed(() => currentIndex.value >= (interview.value?.questions.length ?? 1) - 1)
const progressLabels = computed(() =>
  interview.value ? interview.value.questions.map((_, i) => `${i + 1}`) : [],
)

let hasUnsavedProgress = false

async function load() {
  loading.value = true
  error.value = ''
  try {
    const id = mockInterviewId.value
    const detail = await getMockInterviewDetail(id)
    interview.value = detail

    const saved = await loadPracticeProgress(id)
    if (saved) {
      const idx = detail.questions.findIndex((q) => q.mockInterviewQuestionId === saved.currentQuestionId)
      currentIndex.value = idx >= 0 ? idx : 0
      answerRevealed.value = saved.answerRevealed
    } else {
      currentIndex.value = 0
      answerRevealed.value = false
    }

    if (detail.status === 'GENERATED') {
      await updateMockInterviewStatus(id, 'PRACTICING')
      detail.status = 'PRACTICING'
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function persistProgress() {
  if (!interview.value || !currentQuestion.value) return
  const progress: MockInterviewPracticeProgress = {
    currentQuestionId: currentQuestion.value.mockInterviewQuestionId,
    answerRevealed: answerRevealed.value,
  }
  await savePracticeProgress(interview.value.mockInterviewId, progress)
  hasUnsavedProgress = false
}

watch([currentIndex, answerRevealed], () => {
  hasUnsavedProgress = true
})

function prev() {
  if (!interview.value || currentIndex.value <= 0) return
  currentIndex.value--
  answerRevealed.value = false
  persistProgress()
}

function next() {
  if (!interview.value || currentIndex.value >= interview.value.questions.length - 1) return
  currentIndex.value++
  answerRevealed.value = false
  persistProgress()
}

function toggleReveal() {
  answerRevealed.value = !answerRevealed.value
  persistProgress()
}

async function finish() {
  if (!interview.value) return
  finishing.value = true
  try {
    await persistProgress()
    await updateMockInterviewStatus(interview.value.mockInterviewId, 'COMPLETED')
    ElMessage.success('已完成本次模拟面试练习')
    router.replace({
      name: 'mock-interview-detail',
      params: { mockInterviewId: String(interview.value.mockInterviewId) },
    })
  } catch (e: unknown) {
    if (e instanceof Error) ElMessage.error(e.message)
  } finally {
    finishing.value = false
  }
}

async function onLeave() {
  if (!hasUnsavedProgress || !interview.value) {
    goBack()
    return
  }
  try {
    await ElMessageBox.confirm('是否保存当前练习进度？', '退出练习', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'info',
      distinguishCancelAndClose: true,
      showClose: false,
    })
    await persistProgress()
    ElMessage.success('进度已保存')
  } catch (action: unknown) {
    if (action === 'cancel' || action === 'close') {
      // 用户选择不保存或关闭弹窗，直接离开
    } else if (action instanceof Error) {
      ElMessage.error(action.message)
      return
    }
  }
  goBack()
}

function goBack() {
  router.push({ name: 'mock-interview-list' })
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasUnsavedProgress) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(async (_to, _from, next) => {
  if (!hasUnsavedProgress || !interview.value) {
    next()
    return
  }
  try {
    await ElMessageBox.confirm('是否保存当前练习进度？', '退出练习', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'info',
      distinguishCancelAndClose: true,
      showClose: false,
    })
    await persistProgress()
    ElMessage.success('进度已保存')
    next()
  } catch (action: unknown) {
    if (action === 'cancel' || action === 'close') {
      next()
    } else if (action instanceof Error) {
      ElMessage.error(action.message)
      next(false)
    } else {
      next(false)
    }
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.mock-interview-practice-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--xt-text);
}

.result {
  margin-top: 40px;
}

.practice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.practice-meta {
  flex: 1 1 auto;
}

.interview-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--xt-text);
}

.interview-sub {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.question-card {
  margin-bottom: 24px;
}

.practice-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px;
  border-radius: var(--xt-radius-md);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
  box-shadow: var(--xt-shadow-sm);
}

@media (max-width: 768px) {
  .practice-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .practice-toolbar .el-button-group {
    display: flex;
  }

  .practice-toolbar .el-button {
    flex: 1;
  }
}
</style>
