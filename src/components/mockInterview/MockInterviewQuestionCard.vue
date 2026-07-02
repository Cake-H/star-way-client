<template>
  <article class="mock-q-card" :class="{ 'is-practice': practiceMode }">
    <div class="q-head">
      <span class="q-index">Q{{ index }}</span>
      <el-tag v-if="practiceMode" type="warning" size="small" effect="plain">练习模式</el-tag>
    </div>

    <h3 class="q-title">{{ question.question || '（未填写问题）' }}</h3>

    <ConstellationReveal :revealed="!practiceMode">
      <template v-if="!practiceMode">
        <div v-if="question.referenceAnswer" class="q-block">
          <span class="q-block-label">参考答案</span>
          <p class="q-block-text">{{ question.referenceAnswer }}</p>
        </div>
        <div v-if="question.answerEvaluation" class="q-block">
          <span class="q-block-label">答题要点</span>
          <p class="q-block-text">{{ question.answerEvaluation }}</p>
        </div>
        <div v-if="question.otherNotes" class="q-block">
          <span class="q-block-label">补充说明</span>
          <p class="q-block-text">{{ question.otherNotes }}</p>
        </div>
      </template>
    </ConstellationReveal>

    <p v-if="practiceMode" class="practice-hint">
      已遮盖 · 先尝试用自己的话回答一遍
    </p>
  </article>
</template>

<script setup lang="ts">
import type { MockInterviewQuestionVO } from '@/api/mockInterviewTypes'
import ConstellationReveal from '@/components/ConstellationReveal.vue'

defineProps<{
  question: MockInterviewQuestionVO
  index: number
  practiceMode?: boolean
}>()
</script>

<style scoped>
.mock-q-card {
  padding: 20px;
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--xt-shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.mock-q-card.is-practice {
  border-color: var(--el-color-warning-light-5);
  background: linear-gradient(180deg, var(--xt-surface) 0%, var(--el-color-warning-light-9) 100%);
}

.q-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
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
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--xt-text);
}

.q-block {
  margin-bottom: 12px;
}

.q-block-label {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--xt-primary);
}

.q-block-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--xt-text-secondary);
  white-space: pre-wrap;
}

.practice-hint {
  margin: 16px 0 0;
  padding: 14px;
  text-align: center;
  font-size: 13px;
  color: var(--el-color-warning-dark-2);
  background: rgba(255, 255, 255, 0.5);
  border: 1px dashed var(--el-color-warning-light-3);
  border-radius: var(--xt-radius-sm);
}
</style>
