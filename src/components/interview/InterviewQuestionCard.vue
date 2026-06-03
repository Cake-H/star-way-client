<template>
  <article
    class="q-card xt-clickable"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="q-head">
      <span class="q-index">Q{{ index }}</span>
      <el-tag v-if="practiceMode" type="warning" size="small" effect="plain">练习模式</el-tag>
    </div>
    <h3 class="q-title">{{ question.question || '（未填写问题）' }}</h3>

    <template v-if="!practiceMode">
      <p v-if="question.myAnswer" class="q-preview">
        <span class="lbl">我的回答</span>
        {{ preview(question.myAnswer) }}
      </p>
      <p v-if="question.answerEvaluation" class="q-preview eval">
        <span class="lbl">评价</span>
        {{ preview(question.answerEvaluation) }}
      </p>
    </template>
    <p v-else class="practice-hint">点击查看详情；当前仅展示问题，答案已隐藏便于自测</p>

    <div class="q-foot">
      <span class="time">{{ formatDateTime(question.updatedAt) }}</span>
      <el-icon class="arrow"><ArrowRight /></el-icon>
    </div>
  </article>
</template>

<script setup lang="ts">
/**
 * 场次内问题列表卡片。
 * practiceMode=true 时仅展示题干，供「练习模式」自测（详情页可逐块揭开答案）。
 */
import { ArrowRight } from '@element-plus/icons-vue'
import type { InterviewQuestionVO } from '@/api/interviewTypes'
import { formatDateTime } from '@/utils/format'

defineProps<{
  question: InterviewQuestionVO
  index: number
  practiceMode?: boolean
}>()

defineEmits<{ click: [] }>()

function preview(text: string, max = 72) {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}
</script>

<style scoped>
.q-card {
  padding: 18px 18px 14px;
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--xt-shadow-sm);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  outline: none;
}

.q-card:hover,
.q-card:focus-visible {
  border-color: var(--xt-border-strong);
  box-shadow: var(--xt-shadow-md);
  transform: translateY(-2px);
}

.q-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.q-index {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--xt-primary);
  background: var(--el-color-primary-light-9);
  padding: 2px 8px;
  border-radius: 6px;
}

.q-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--xt-text);
}

.q-preview {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--xt-text-secondary);
}

.q-preview.eval {
  color: var(--xt-text-muted);
}

.lbl {
  display: inline-block;
  margin-right: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--xt-primary);
}

.practice-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  line-height: 1.5;
}

.q-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--xt-border);
}

.time {
  font-size: 12px;
  color: var(--xt-text-muted);
}

.arrow {
  color: var(--xt-primary-light);
}
</style>
