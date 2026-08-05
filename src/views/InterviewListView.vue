<template>
  <div class="interview-list">
    <div class="xt-section-head hero">
      <div>
        <p class="xt-eyebrow list-eyebrow">星途 · 面试复盘</p>
        <h1 class="xt-section-title">面试问题记录</h1>
        <p class="xt-section-desc">
          面试结束后快速复盘：支持手动录入或语音口述，AI 帮你整理问题、回答、评价与参考答案，随时进入练习模式自测。
        </p>
      </div>
      <StarLaunchButton type="primary" size="large" @click="goNew">
        <el-icon class="btn-ico"><Microphone /></el-icon>
        语音新建复盘
      </StarLaunchButton>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-empty v-else-if="!items.length" description="还没有面试复盘，说一题就能开始记录">
      <el-button type="primary" @click="goNew">
        <el-icon class="btn-ico"><Microphone /></el-icon>
        语音新建复盘
      </el-button>
    </el-empty>

    <el-row v-else v-stagger :gutter="20" class="grid">
      <el-col v-for="row in items" :key="row.sessionId" :xs="24" :sm="12" :lg="8">
        <OrbitalCard
          class="session-card"
          clickable
          shadow="hover"
          @click="goSession(row.sessionId)"
        >
          <div class="card-top">
            <h2 class="card-title">{{ row.title }}</h2>
            <el-tag type="info" size="small">{{ row.questionCount }} 题</el-tag>
          </div>
          <p v-if="row.companyName || row.positionName" class="card-sub">
            {{ [row.companyName, row.positionName].filter(Boolean).join(' · ') }}
          </p>
          <p v-if="row.interviewRound" class="card-meta">轮次：{{ row.interviewRound }}</p>
          <p class="card-time">
            <el-icon><Clock /></el-icon>
            {{ formatDateTime(row.updatedAt) }}
          </p>
          <div class="card-actions" @click.stop>
            <el-button type="primary" link @click="goSession(row.sessionId)">查看问题</el-button>
            <el-button type="danger" link :loading="deletingId === row.sessionId" @click="onDelete(row)">
              删除
            </el-button>
          </div>
        </OrbitalCard>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/** 面试复盘场次列表页（GET /interview/sessions） */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, Microphone } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { InterviewSessionListItemVO } from '@/api/interviewTypes'
import { deleteInterviewSession, listInterviewSessions } from '@/services/interviewService'
import { formatDateTime } from '@/utils/format'
import OrbitalCard from '@/components/OrbitalCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'

const router = useRouter()
const loading = ref(true)
const items = ref<InterviewSessionListItemVO[]>([])
const deletingId = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    items.value = await listInterviewSessions()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goNew() {
  router.push({ name: 'interview-new' })
}

function goSession(id: string) {
  router.push({ name: 'interview-session', params: { sessionId: String(id) } })
}

async function onDelete(row: InterviewSessionListItemVO) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」及其中全部问题？`, '删除复盘', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  deletingId.value = row.sessionId
  try {
    await deleteInterviewSession(row.sessionId)
    ElMessage.success('已删除')
    await load()
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.interview-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.list-eyebrow {
  color: var(--xt-primary);
  margin-bottom: 6px;
}

.hero {
  position: relative;
}

.hero :deep(.el-button) {
  cursor: pointer;
}

.btn-ico {
  margin-right: 6px;
}

.empty {
  padding: 48px 16px;
}

.grid {
  margin: 0 !important;
}

.session-card {
  height: 100%;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.card-title {
  margin: 0;
  font-family: var(--xt-font-title);
  font-size: 18px;
  font-weight: 700;
  color: var(--xt-text);
  line-height: 1.35;
  flex: 1;
}

.card-sub {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--xt-text-secondary);
}

.card-meta {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--xt-text-muted);
}

.card-time {
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--xt-text-muted);
}

.card-actions {
  padding-top: 12px;
  border-top: 1px solid var(--xt-border);
  display: flex;
  gap: 12px;
}

.card-actions :deep(.el-button) {
  cursor: pointer;
}
</style>
