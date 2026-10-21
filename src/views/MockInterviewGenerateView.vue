<template>
  <div v-if="!generating" class="mock-interview-generate-page">
    <el-page-header class="page-head" title=" " @back="goBack">
      <template #content>
        <span class="page-title">新建模拟面试</span>
      </template>
    </el-page-header>

    <el-alert
      class="tip"
      type="info"
      show-icon
      :closable="false"
      title="基于简历生成面试题"
      description="选择一份简历，AI 将分析其内容并生成针对性的模拟面试题与参考答案。生成过程可能需要 10-30 秒，请耐心等待。"
    />

    <div v-loading="loadingResumes" class="resume-select">
      <h2 class="section-title">选择简历</h2>

      <el-empty v-if="!loadingResumes && resumes.length === 0" description="暂无简历，请先上传或新建简历">
        <el-button type="primary" @click="goUpload">上传简历</el-button>
        <el-button @click="goBlank">空白简历</el-button>
      </el-empty>

      <el-row v-else :gutter="16" class="resume-grid">
        <el-col v-for="r in resumes" :key="r.resumeId" :xs="24" :sm="12" :lg="8">
          <OrbitalCard
            class="resume-card"
            :class="{ selected: selectedResumeId === r.resumeId }"
            clickable
            shadow="hover"
            @click="selectedResumeId = r.resumeId"
          >
            <div class="resume-card-head">
              <el-radio :label="r.resumeId" :model-value="selectedResumeId" @click.stop="selectedResumeId = r.resumeId"
                >{{ r.title }}
              </el-radio>
            </div>
            <p class="resume-card-hint">点击选择该简历作为生成依据</p>
          </OrbitalCard>
        </el-col>
      </el-row>
    </div>

    <div class="actions">
      <StarLaunchButton
        type="primary"
        size="large"
        :disabled="selectedResumeId == null || generating"
        :loading="generating"
        @click="onGenerate"
      >
        <el-icon class="btn-icon"><MagicStick /></el-icon>
        AI 生成面试题
      </StarLaunchButton>
    </div>
  </div>

  <StarWaitingModule
    v-else
    title="AI 正在根据简历生成针对性面试题..."
    :completed="generationCompleted"
    @done="onGenerationDone"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { listResumesForGeneration, createMockInterview } from '@/services/mockInterviewService'
import OrbitalCard from '@/components/OrbitalCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import StarWaitingModule from '@/components/StarWaitingModule.vue'

const router = useRouter()
const resumes = ref<{ resumeId: string; title: string }[]>([])
const loadingResumes = ref(true)
const selectedResumeId = ref<string | null>(null)
const generating = ref(false)
const generationCompleted = ref(false)
const generatedId = ref<string | null>(null)

onMounted(async () => {
  try {
    resumes.value = await listResumesForGeneration()
  } catch (e: unknown) {
    if (e instanceof Error) ElMessage.error(e.message)
  } finally {
    loadingResumes.value = false
  }
})

function goBack() {
  router.push({ name: 'mock-interview-list' })
}

function goUpload() {
  router.push({ name: 'resume-upload' })
}

function goBlank() {
  router.push({ name: 'resume-new' })
}

async function onGenerate() {
  if (selectedResumeId.value == null) return
  generating.value = true
  generationCompleted.value = false
  generatedId.value = null
  try {
    generatedId.value = await createMockInterview(selectedResumeId.value)
    generationCompleted.value = true
  } catch (e: unknown) {
    generating.value = false
    if (e instanceof Error) ElMessage.error(e.message)
  }
}

function onGenerationDone() {
  if (generatedId.value == null) return
  ElMessage.success('已生成模拟面试题，进入练习模式')
  router.push({ name: 'mock-interview-practice', params: { mockInterviewId: String(generatedId.value) } })
}
</script>

<style scoped>
.mock-interview-generate-page {
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

.tip {
  border-radius: var(--xt-radius-md);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--xt-text);
}

.resume-select {
  min-height: 160px;
}

.resume-grid {
  margin: 0 !important;
  row-gap: 16px;
}

.resume-card {
  height: 100%;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.resume-card.selected {
  border-color: var(--xt-primary);
  box-shadow: 0 0 0 1px var(--xt-primary), var(--xt-shadow-md);
}

.resume-card-head {
  margin-bottom: 8px;
}

.resume-card-hint {
  margin: 0;
  font-size: 12px;
  color: var(--xt-text-muted);
}

.actions {
  display: flex;
  justify-content: center;
}

.btn-icon {
  margin-right: 6px;
}
</style>
