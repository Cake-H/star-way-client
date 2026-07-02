<template>
  <ResumePageLayout full-width>
    <div class="new-page">
      <el-page-header class="page-head" @back="goBack">
      <template #content>
        <span class="page-title">新建空白简历</span>
      </template>
    </el-page-header>

    <el-alert
      class="tip"
      type="info"
      show-icon
      :closable="false"
      title="从空白草稿开始"
      description="下方表单与解析结果结构一致，填写完成后点击保存。之后可在「我的简历」中继续编辑。"
    />

    <ResumeSaveToolbar
      v-model:title="resumeTitle"
      v-model:isDefault="isDefault"
      :saving="saving"
      save-label="保存新简历"
      @save="onSave"
    />

    <el-card class="form-card" shadow="never">
      <template #header>
        <span>简历内容</span>
      </template>
      <ResumeDraftForm :draft="draft" />
    </el-card>
    </div>
  </ResumePageLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { ResumeParseDraftDto } from '@/api/resumeTypes'
import { saveResumeDraft } from '@/api/resume'
import ResumeDraftForm from '@/components/resume/ResumeDraftForm.vue'
import ResumePageLayout from '@/components/resume/ResumePageLayout.vue'
import ResumeSaveToolbar from '@/components/resume/ResumeSaveToolbar.vue'
import { emptyDraft } from '@/utils/resumeDraft'
import { getResumeSaveValidationErrors } from '@/utils/resumeValidation'

const router = useRouter()
const saving = ref(false)
const resumeTitle = ref('我的简历')
const isDefault = ref(0)
const draft = reactive<ResumeParseDraftDto>(emptyDraft())

function goBack() {
  router.push({ name: 'resume-list' })
}

async function onSave() {
  const verr = getResumeSaveValidationErrors(draft, { listTitle: resumeTitle.value })
  if (verr.length) {
    ElMessage.error(verr.join('；'))
    return
  }
  saving.value = true
  try {
    const { resumeId } = await saveResumeDraft({
      title: resumeTitle.value || undefined,
      isDefault: isDefault.value,
      draft,
    })
    ElMessage.success('已保存，正在进入编辑页')
    await router.replace({ name: 'resume-edit', params: { resumeId: String(resumeId) } })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.new-page {
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

.tip {
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
}

.form-card {
  border-radius: var(--xt-radius-md);
}
</style>
