<template>
  <div class="resume-list-page">
    <div class="xt-section-head hero">
      <div class="hero-text">
        <p class="xt-eyebrow list-eyebrow">星途 · 简历库</p>
        <h1 class="xt-section-title">我的简历</h1>
        <p class="xt-section-desc">管理已入库的简历草稿，支持解析上传或从空白开始填写。</p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" size="large" @click="goUpload">
          <el-icon class="btn-icon"><Upload /></el-icon>
          上传解析
        </el-button>
        <el-button size="large" @click="goBlank">
          <el-icon class="btn-icon"><DocumentAdd /></el-icon>
          空白简历
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated class="skel" />

    <template v-else>
      <el-empty v-if="!items.length" description="暂无已保存的简历，开启你的第一份星途简历" class="empty">
        <el-button type="primary" @click="goUpload">上传第一份简历</el-button>
        <el-button @click="goBlank">从空白创建</el-button>
      </el-empty>

      <el-row v-else :gutter="20" class="grid">
        <el-col v-for="row in items" :key="row.resumeId" :xs="24" :sm="12" :lg="8">
          <el-card class="resume-card xt-clickable" shadow="hover" @click="goDetail(row.resumeId)">
            <div class="card-top">
              <h2 class="card-title">{{ row.title || '未命名简历' }}</h2>
              <el-tag v-if="row.isDefault === 1" type="success" effect="dark" size="small">默认</el-tag>
            </div>
            <p class="card-name">{{ row.fullName || '未填写姓名' }}</p>
            <p class="card-time">
              <el-icon><Clock /></el-icon>
              {{ formatDateTime(row.updatedAt) }}
            </p>
            <div class="card-actions" @click.stop>
              <el-button type="primary" link @click="goDetail(row.resumeId)">查看</el-button>
              <el-button type="primary" link @click="goEdit(row.resumeId)">编辑</el-button>
              <el-button
                type="danger"
                link
                :loading="deletingId === row.resumeId"
                @click="onDelete(row)"
              >
                删除
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, DocumentAdd, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ResumeListItemVO } from '@/api/resumeTypes'
import { deleteResume, listMyResumes } from '@/api/resume'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(true)
const items = ref<ResumeListItemVO[]>([])
const deletingId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    items.value = await listMyResumes()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goUpload() {
  router.push({ name: 'resume-upload' })
}

function goBlank() {
  router.push({ name: 'resume-new' })
}

function goDetail(id: number) {
  router.push({ name: 'resume-detail', params: { resumeId: String(id) } })
}

function goEdit(id: number) {
  router.push({ name: 'resume-edit', params: { resumeId: String(id) } })
}

async function onDelete(row: ResumeListItemVO) {
  const name = row.title?.trim() || '该简历'
  try {
    await ElMessageBox.confirm(
      `确定删除「${name}」？删除为软删除：列表与详情将不再显示此简历；若删除的是默认简历，系统会将最近更新的另一份未删简历设为默认（存在时）。`,
      '删除简历',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  deletingId.value = row.resumeId
  try {
    await deleteResume(row.resumeId)
    ElMessage.success('已删除')
    await load()
  } finally {
    deletingId.value = null
  }
}
</script>

<style scoped>
.resume-list-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.list-eyebrow {
  color: var(--xt-primary);
  margin-bottom: 6px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-actions :deep(.el-button) {
  cursor: pointer;
}

.btn-icon {
  margin-right: 6px;
  vertical-align: middle;
}

.skel {
  padding: 8px 0;
}

.empty {
  padding: 48px 16px;
}

.grid {
  margin: 0 !important;
}

.resume-card {
  height: 100%;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--xt-text);
  line-height: 1.35;
  flex: 1;
}

.card-name {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--xt-text-secondary);
}

.card-time {
  margin: 0 0 14px;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.card-actions :deep(.el-button) {
  cursor: pointer;
}
</style>
