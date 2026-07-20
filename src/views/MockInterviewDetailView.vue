<template>
  <div v-loading="loading" class="mock-interview-detail-page">
    <el-page-header class="page-head" title=" " @back="goBack">
      <template #content>
        <span class="page-title">模拟面试详情</span>
      </template>
    </el-page-header>

    <el-result v-if="!loading && error" icon="error" title="加载失败" :sub-title="error" class="result"
      >
      <template #extra>
        <el-button @click="load">重试</el-button>
      </template>
    </el-result>

    <template v-else-if="interview">
      <div class="detail-head">
        <div class="detail-meta">
          <h1 class="detail-title">{{ interview.title }}</h1>
          <div class="detail-tags">
            <el-tag :type="statusTagType(interview.status)" size="small" effect="plain">{{ statusLabel(interview.status) }}</el-tag>
            <span class="detail-sub">{{ interview.questionCount }} 题 · 更新于 {{ formatDateTime(interview.updatedAt) }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <StarLaunchButton type="primary" @click="goPractice"
            >{{ interview.status === 'COMPLETED' ? '重新练习' : '继续练习' }}
          </StarLaunchButton>
          <el-button type="danger" plain :loading="deleting" @click="onDelete">删除</el-button>
        </div>
      </div>

      <div class="questions-list">
        <MockInterviewQuestionCard
          v-for="(q, i) in interview.mockInterviewQuestions"
          :key="q.id"
          :question="q"
          :index="i + 1"
          :practice-mode="false"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { MockInterviewStatus, MockInterviewVO } from '@/api/mockInterviewTypes'
import { deleteMockInterview, getMockInterviewDetail } from '@/services/mockInterviewService'
import { formatDateTime } from '@/utils/format'
import MockInterviewQuestionCard from '@/components/mockInterview/MockInterviewQuestionCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'

const route = useRoute()
const router = useRouter()
const interview = ref<MockInterviewVO | null>(null)
const loading = ref(true)
const error = ref('')
const deleting = ref(false)

const mockInterviewId = Number(route.params.mockInterviewId)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const detail = await getMockInterviewDetail(mockInterviewId)
    if (detail.status === 'GENERATED') {
      router.replace({ name: 'mock-interview-practice', params: { mockInterviewId: String(mockInterviewId) } })
      return
    }
    interview.value = detail
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goBack() {
  router.push({ name: 'mock-interview-list' })
}

function goPractice() {
  router.push({ name: 'mock-interview-practice', params: { mockInterviewId: String(mockInterviewId) } })
}

function statusLabel(status: MockInterviewStatus): string {
  const map: Record<MockInterviewStatus, string> = {
    GENERATED: '待练习',
    PRACTICING: '练习中',
    COMPLETED: '已完成',
  }
  return map[status]
}

function statusTagType(status: MockInterviewStatus): 'info' | 'warning' | 'success' {
  const map: Record<MockInterviewStatus, 'info' | 'warning' | 'success'> = {
    GENERATED: 'info',
    PRACTICING: 'warning',
    COMPLETED: 'success',
  }
  return map[status]
}

async function onDelete() {
  if (!interview.value) return
  try {
    await ElMessageBox.confirm(`确定删除「${interview.value.title}」？`, '删除模拟面试', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    })
    deleting.value = true
    await deleteMockInterview(mockInterviewId)
    ElMessage.success('已删除')
    goBack()
  } catch (e: unknown) {
    if (e instanceof Error && e.message !== 'cancel') {
      ElMessage.error(e.message)
    }
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.mock-interview-detail-page {
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

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 20px;
  border-radius: var(--xt-radius-md);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
  box-shadow: var(--xt-shadow-sm);
}

.detail-meta {
  flex: 1 1 auto;
}

.detail-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 600;
  color: var(--xt-text);
}

.detail-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-sub {
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 768px) {
  .detail-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
