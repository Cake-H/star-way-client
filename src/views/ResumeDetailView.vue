<template>
  <div class="detail-page">
    <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">简历详情</span>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else-if="detail">
      <el-card class="head-card" shadow="never">
        <div class="head-row">
          <div>
            <h1 class="resume-title">{{ detail.title || '未命名简历' }}</h1>
            <p class="meta-line">
              <el-tag v-if="detail.isDefault === 1" type="success" size="small" class="tag">默认简历</el-tag>
              <span class="muted">结构版本 {{ detail.schemaVersion }}</span>
              <span class="muted">·</span>
              <span class="muted">更新于 {{ formatDateTime(detail.updatedAt) }}</span>
            </p>
          </div>
          <div class="head-btns">
            <el-button type="primary" @click="goEdit">编辑</el-button>
            <el-button type="danger" plain :loading="deleting" @click="onDelete">删除简历</el-button>
            <el-button @click="goBack">返回列表</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="full-card" shadow="never">
        <template #header>
          <span>完整简历内容（只读）</span>
        </template>
        <ResumeDraftForm :draft="draft" view-only />
      </el-card>
    </template>

    <el-result v-else icon="warning" title="未找到简历" sub-title="请返回列表重试">
      <template #extra>
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResumeDetailVO, ResumeParseDraftDto } from '@/api/resumeTypes'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteResume, getResumeDetail } from '@/api/resume'
import ResumeDraftForm from '@/components/resume/ResumeDraftForm.vue'
import { formatDateTime } from '@/utils/format'
import { assignFullDraft, emptyDraft } from '@/utils/resumeDraft'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const deleting = ref(false)
const detail = ref<ResumeDetailVO | null>(null)
const draft = reactive<ResumeParseDraftDto>(emptyDraft())

const resumeId = () => Number(route.params.resumeId)

watch(
  () => detail.value?.draft,
  (d) => {
    if (d) assignFullDraft(draft, d)
  },
  { immediate: true },
)

function goBack() {
  router.push({ name: 'resume-list' })
}

function goEdit() {
  router.push({ name: 'resume-edit', params: { resumeId: String(resumeId()) } })
}

async function onDelete() {
  const id = resumeId()
  const name = detail.value?.title?.trim() || '该简历'
  try {
    await ElMessageBox.confirm(
      `确定删除「${name}」？软删除后列表与详情将不再显示；若删的是默认简历，系统会将最近更新的另一份未删简历设为默认（存在时）。`,
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
  deleting.value = true
  try {
    await deleteResume(id)
    ElMessage.success('已删除')
    await router.replace({ name: 'resume-list' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    detail.value = await getResumeDetail(resumeId())
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 600;
  font-size: 16px;
}

.head-card {
  border-radius: 14px;
}

.head-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.resume-title {
  margin: 0 0 10px;
  font-size: 22px;
  color: #0f172a;
}

.meta-line {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.tag {
  margin-right: 4px;
}

.muted {
  color: #64748b;
}

.head-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.full-card {
  border-radius: 14px;
}

.full-card :deep(.resume-draft) {
  gap: 16px;
}
</style>
