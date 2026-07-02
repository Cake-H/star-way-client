<template>
  <ResumePageLayout full-width>
    <div class="edit-page">
      <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">编辑简历</span>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="10" animated />

    <template v-else-if="loaded">
      <div class="danger-zone">
        <el-button type="danger" plain :loading="deleting" @click="onDelete">删除该简历</el-button>
        <span class="danger-hint">软删除后无法在本应用查看；默认简历被删时系统会自动指定另一份（若有）。</span>
      </div>

      <ResumeSaveToolbar
        v-model:title="resumeTitle"
        v-model:isDefault="isDefault"
        :saving="saving"
        save-label="保存修改"
        @save="onSave"
      />

      <el-card class="form-card" shadow="never">
        <template #header>
          <span>简历内容</span>
        </template>
        <ResumeDraftForm :draft="draft" />
      </el-card>
    </template>

    <el-result v-else icon="error" title="加载失败" sub-title="请确认简历存在且仍属于当前账号">
      <template #extra>
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </template>
    </el-result>
    </div>
  </ResumePageLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ResumeParseDraftDto } from '@/api/resumeTypes'
import { deleteResume, getResumeDetail, updateResume } from '@/api/resume'
import ResumeDraftForm from '@/components/resume/ResumeDraftForm.vue'
import ResumePageLayout from '@/components/resume/ResumePageLayout.vue'
import ResumeSaveToolbar from '@/components/resume/ResumeSaveToolbar.vue'
import { assignFullDraft, emptyDraft } from '@/utils/resumeDraft'
import { getResumeSaveValidationErrors } from '@/utils/resumeValidation'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const deleting = ref(false)
const resumeTitle = ref('')
const isDefault = ref(0)
const draft = reactive<ResumeParseDraftDto>(emptyDraft())

const resumeId = () => Number(route.params.resumeId)

function goBack() {
  router.push({ name: 'resume-list' })
}

async function onDelete() {
  const id = resumeId()
  const name = resumeTitle.value?.trim() || '该简历'
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

async function onSave() {
  const id = resumeId()
  const verr = getResumeSaveValidationErrors(draft, { listTitle: resumeTitle.value })
  if (verr.length) {
    ElMessage.error(verr.join('；'))
    return
  }
  saving.value = true
  try {
    await updateResume(id, {
      title: resumeTitle.value || undefined,
      isDefault: isDefault.value,
      draft,
    })
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const d = await getResumeDetail(resumeId())
    resumeTitle.value = d.title || ''
    isDefault.value = d.isDefault ?? 0
    assignFullDraft(draft, d.draft)
    loaded.value = true
  } catch {
    loaded.value = false
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.edit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head {
  padding: 0;
}

.page-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--xt-text);
}

.form-card {
  border-radius: var(--xt-radius-md);
}

.danger-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 12px 16px;
  border-radius: var(--xt-radius-md);
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(254, 226, 226, 0.45);
  backdrop-filter: blur(8px);
}

.danger-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  flex: 1;
  min-width: 200px;
}
</style>
