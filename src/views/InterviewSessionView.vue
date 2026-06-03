<template>
  <div class="session-page">
    <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">面试复盘</span>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else-if="session">
      <el-card class="head-card" shadow="never">
        <div class="head-row">
          <div>
            <h1 class="session-title">{{ session.title }}</h1>
            <p class="meta">
              <span v-if="session.companyName">{{ session.companyName }}</span>
              <span v-if="session.positionName"> · {{ session.positionName }}</span>
              <span v-if="session.interviewRound"> · {{ session.interviewRound }}</span>
            </p>
            <p class="meta muted">共 {{ session.questions.length }} 题 · 更新于 {{ formatDateTime(session.updatedAt) }}</p>
          </div>
          <div class="head-actions">
            <div class="practice-toggle">
              <span class="toggle-lbl">练习模式</span>
              <el-switch
                v-model="practiceMode"
                inline-prompt
                active-text="开"
                inactive-text="关"
                aria-label="练习模式：开启后列表仅显示问题，隐藏答案"
              />
            </div>
            <el-button type="primary" @click="goAddQuestion">
              <el-icon class="btn-ico"><Microphone /></el-icon>
              语音添加问题
            </el-button>
            <el-button type="danger" plain :loading="deleting" @click="onDeleteSession">删除复盘</el-button>
          </div>
        </div>
      </el-card>

      <el-alert
        v-if="practiceMode"
        type="warning"
        show-icon
        :closable="false"
        title="练习模式已开启"
        description="下方仅展示面试问题，答案与评价已隐藏。点击进入详情后可逐块「揭开答案」对照练习。"
        class="practice-alert"
      />

      <el-empty v-if="!session.questions.length" description="还没有记录问题，用语音说一题就能快速开始">
        <el-button type="primary" @click="goAddQuestion">
          <el-icon class="btn-ico"><Microphone /></el-icon>
          语音添加第一题
        </el-button>
      </el-empty>

      <div v-else class="q-list">
        <InterviewQuestionCard
          v-for="(q, i) in session.questions"
          :key="q.questionId"
          :question="q"
          :index="i + 1"
          :practice-mode="practiceMode"
          @click="goQuestion(q.questionId)"
        />
      </div>
    </template>

    <el-result v-else icon="warning" title="未找到复盘" sub-title="请返回列表重试">
      <template #extra>
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
/**
 * 单场次问题列表页。
 * practiceMode：纯前端开关，列表卡片仅展示题干；进详情时带 query practice=1。
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Microphone } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { InterviewSessionDetailVO } from '@/api/interviewTypes'
import InterviewQuestionCard from '@/components/interview/InterviewQuestionCard.vue'
import {
  deleteInterviewSession,
  getInterviewSessionDetail,
} from '@/services/interviewService'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const deleting = ref(false)
const practiceMode = ref(false)
const session = ref<InterviewSessionDetailVO | null>(null)

const sessionId = () => Number(route.params.sessionId)

async function load() {
  loading.value = true
  try {
    session.value = await getInterviewSessionDetail(sessionId())
  } catch {
    session.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goBack() {
  router.push({ name: 'interview-list' })
}

function goAddQuestion() {
  router.push({ name: 'interview-new', query: { sessionId: String(sessionId()) } })
}

function goQuestion(questionId: number) {
  router.push({
    name: 'interview-question',
    params: { sessionId: String(sessionId()), questionId: String(questionId) },
    // 练习模式下进入详情，默认遮盖答案区块
    query: practiceMode.value ? { practice: '1' } : undefined,
  })
}

async function onDeleteSession() {
  if (!session.value) return
  try {
    await ElMessageBox.confirm(`确定删除「${session.value.title}」？`, '删除复盘', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteInterviewSession(sessionId())
    ElMessage.success('已删除')
    await router.replace({ name: 'interview-list' })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.session-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 700;
  color: var(--xt-text);
}

.head-card {
  border-radius: var(--xt-radius-md);
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.session-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: var(--xt-text);
}

.meta {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--xt-text-secondary);
}

.meta.muted {
  font-size: 13px;
  color: var(--xt-text-muted);
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.head-actions :deep(.el-button) {
  cursor: pointer;
}

.btn-ico {
  margin-right: 4px;
}

.practice-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--xt-radius-sm);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
}

.toggle-lbl {
  font-size: 13px;
  font-weight: 600;
  color: var(--xt-text);
}

.practice-alert {
  border-radius: var(--xt-radius-md);
}

.q-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
