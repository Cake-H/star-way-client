<template>
  <div class="resume-list-page">
    <SectionPageHeader
      title="我的简历"
      eyebrow="星途 · 简历库"
      description="管理已保存的简历，支持解析上传或从空白开始填写。"
    >
      <StarLaunchButton type="primary" size="large" @click="goUpload">
        <el-icon class="btn-icon"><Upload /></el-icon>
        上传解析
      </StarLaunchButton>
      <el-button size="large" @click="goBlank">
        <el-icon class="btn-icon"><DocumentAdd /></el-icon>
        空白简历
      </el-button>
    </SectionPageHeader>

    <el-skeleton v-if="loading" :rows="6" animated class="skel" />

    <template v-else>
      <el-empty v-if="!items.length" description="暂无已保存的简历，开启你的第一份星途简历" class="empty">
        <p class="empty-plugin-hint">
          <el-icon><ChromeFilled /></el-icon>
          创建简历后，可在浏览器安装「智能投递助手」插件，在网申页一键填入。
        </p>
        <el-button type="primary" @click="goUpload">上传第一份简历</el-button>
        <el-button @click="goBlank">从空白创建</el-button>
      </el-empty>

      <OrbitalCard v-else class="plugin-banner" clickable shadow="never" @click="openPluginGuide">
        <div class="plugin-banner-content">
          <div class="plugin-banner-text">
            <h3 class="plugin-banner-title">
              <el-icon><ChromeFilled /></el-icon>
              去网申页一键填入
            </h3>
            <p class="plugin-banner-desc">
              安装浏览器插件后，在招聘网站申请表中打开「智能投递助手」，即可把星途简历自动同步填入。
            </p>
          </div>
          <el-button type="primary" @click.stop="openPluginGuide">查看使用说明</el-button>
        </div>
      </OrbitalCard>

      <el-row v-if="items.length" v-stagger :gutter="20" class="grid">
        <el-col v-for="row in items" :key="row.resumeId" :xs="24" :sm="12" :lg="8">
          <OrbitalCard
            class="resume-card"
            clickable
            shadow="hover"
            @click="goDetail(row.resumeId)"
          >
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
          </OrbitalCard>
        </el-col>
      </el-row>
    </template>

    <PluginGuideDialog v-model="pluginGuideVisible" :resume-count="items.length" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChromeFilled, Clock, DocumentAdd, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ResumeListItemVO } from '@/api/resumeTypes'
import { deleteResume, listMyResumes } from '@/api/resume'
import { formatDateTime } from '@/utils/format'
import OrbitalCard from '@/components/OrbitalCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import SectionPageHeader from '@/components/SectionPageHeader.vue'
import PluginGuideDialog from '@/components/home/PluginGuideDialog.vue'

const router = useRouter()
const loading = ref(true)
const items = ref<ResumeListItemVO[]>([])
const deletingId = ref<string | null>(null)
const pluginGuideVisible = ref(false)

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

function goDetail(id: string) {
  router.push({ name: 'resume-detail', params: { resumeId: String(id) } })
}

function goEdit(id: string) {
  router.push({ name: 'resume-edit', params: { resumeId: String(id) } })
}

function openPluginGuide() {
  pluginGuideVisible.value = true
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
  overflow-x: clip;
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

.empty-plugin-hint {
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.plugin-banner {
  cursor: pointer;
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  border-left: 3px solid #e8a33d;
}

.plugin-banner:hover {
  border-color: rgba(232, 163, 61, 0.4);
  border-left-color: #e8a33d;
}

.plugin-banner :deep(.el-card__body) {
  padding: 18px 22px;
}

.plugin-banner-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.plugin-banner-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plugin-banner-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--xt-text);
}

.plugin-banner-title .el-icon {
  color: var(--xt-primary);
}

.plugin-banner-desc {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.grid {
  margin: 0 !important;
  row-gap: 20px;
}

.resume-card {
  height: 100%;
}

.resume-card:hover {
  border-color: rgba(232, 163, 61, 0.4);
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
  font-family: var(--xt-font-title);
  font-size: 18px;
  font-weight: 700;
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
