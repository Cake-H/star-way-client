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
  box-shadow: inset 0 1px 0 var(--xt-card-highlight), var(--xt-shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.mock-q-card.is-practice {
  border-color: rgba(232, 163, 61, 0.22);
  background: var(--xt-surface);
}

.q-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

/* Q 序号：琥珀小字，不用色块 */
.q-index {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--xt-primary);
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
  letter-spacing: 0.04em;
  color: var(--xt-primary);
}

.q-block-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(232, 230, 224, 0.88);
  white-space: pre-wrap;
}

/* 已遮盖：细虚线框 + 暖灰提示 */
.practice-hint {
  margin: 16px 0 0;
  padding: 14px;
  text-align: center;
  font-size: 13px;
  color: var(--xt-text-secondary);
  background: rgba(232, 230, 224, 0.02);
  border: 1px dashed rgba(232, 230, 224, 0.15);
  border-radius: var(--xt-radius-sm);
}
</style>
