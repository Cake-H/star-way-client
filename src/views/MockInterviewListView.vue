<template>
  <div class="mock-interview-list">
    <SectionPageHeader
      title="模拟面试题"
      eyebrow="星途 · 模拟面试"
      description="基于简历由 AI 生成面试题，练习模式逐题自测，随时查看参考答案。"
    >
      <StarLaunchButton type="primary" size="large" @click="goNew">
        <el-icon class="btn-ico"><MagicStick /></el-icon>
        新建模拟面试
      </StarLaunchButton>
    </SectionPageHeader>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-empty v-else-if="!items.length" description="还没有生成过模拟面试题">
      <el-button type="primary" @click="goNew">
        <el-icon class="btn-ico"><MagicStick /></el-icon>
        立即生成
      </el-button>
    </el-empty>

    <el-row v-else v-stagger :gutter="20" class="grid">
      <el-col v-for="row in items" :key="row.mockInterviewId" :xs="24" :sm="12" :lg="8">
        <OrbitalCard
          class="session-card"
          clickable
          shadow="hover"
          @click="goDetail(row.mockInterviewId)"
        >
          <div class="card-top">
            <h2 class="card-title">{{ row.title }}</h2>
            <el-tag :type="statusTagType(row.status)" size="small" effect="plain">
              {{ statusLabel(row.status) }}
            </el-tag>
          </div>
          <p class="card-meta">{{ row.questionCount }} 题 · 更新于 {{ formatDateTime(row.updatedAt) }}</p>
          <div class="card-actions" @click.stop>
            <el-button type="primary" link @click="goPractice(row.mockInterviewId)"
              >{{ row.status === 'COMPLETED' ? '重新练习' : '继续练习' }}
            </el-button>
            <el-button link @click="goDetail(row.mockInterviewId)">查看</el-button>
            <el-button type="danger" link :loading="deletingId === row.mockInterviewId" @click="onDelete(row)"
              >删除
            </el-button>
          </div>
        </OrbitalCard>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { MockInterviewListItemVO, MockInterviewStatus } from '@/api/mockInterviewTypes'
import { deleteMockInterview, listMockInterviews } from '@/services/mockInterviewService'
import { formatDateTime } from '@/utils/format'
import OrbitalCard from '@/components/OrbitalCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import SectionPageHeader from '@/components/SectionPageHeader.vue'

const router = useRouter()
const loading = ref(true)
const items = ref<MockInterviewListItemVO[]>([])
const deletingId = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    items.value = await listMockInterviews()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goNew() {
  router.push({ name: 'mock-interview-new' })
}

function goDetail(id: string) {
  router.push({ name: 'mock-interview-detail', params: { mockInterviewId: String(id) } })
}

function goPractice(id: string) {
  router.push({ name: 'mock-interview-practice', params: { mockInterviewId: String(id) } })
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

async function onDelete(row: MockInterviewListItemVO) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除模拟面试', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  deletingId.value = row.mockInterviewId
  try {
    await deleteMockInterview(row.mockInterviewId)
    ElMessage.success('已删除')
    await load()
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.mock-interview-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.btn-ico {
  margin-right: 6px;
}

.grid {
  margin: 0 !important;
  row-gap: 20px;
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

.card-meta {
  margin: 0 0 12px;
  font-size: 13px;
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
