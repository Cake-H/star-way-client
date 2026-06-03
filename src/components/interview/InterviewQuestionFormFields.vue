<template>
  <el-form label-position="top" class="q-form">
    <el-form-item label="面试问题" required>
      <el-input
        v-model="model.question"
        type="textarea"
        :rows="3"
        placeholder="如：请介绍一下你在项目中负责的核心模块"
        maxlength="2000"
        show-word-limit
      />
    </el-form-item>
    <el-form-item label="我的回答">
      <el-input
        v-model="model.myAnswer"
        type="textarea"
        :rows="4"
        placeholder="记录你当时的回答要点"
        maxlength="5000"
        show-word-limit
      />
    </el-form-item>
    <el-form-item label="回答评价">
      <el-input
        v-model="model.answerEvaluation"
        type="textarea"
        :rows="3"
        placeholder="AI 或自我评价：亮点、不足、改进建议"
        maxlength="3000"
        show-word-limit
      />
    </el-form-item>
    <el-form-item label="参考答案">
      <el-input
        v-model="model.referenceAnswer"
        type="textarea"
        :rows="4"
        placeholder="理想回答思路或标准答案"
        maxlength="5000"
        show-word-limit
      />
    </el-form-item>
    <el-form-item label="其他交流信息">
      <el-input
        v-model="model.otherNotes"
        type="textarea"
        :rows="2"
        placeholder="追问、面试官反馈、氛围备注等"
        maxlength="2000"
        show-word-limit
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
/**
 * 单条问题的五段式表单（手动录入 / AI 总结后核对）。
 * 与 InterviewQuestionCreateRequest 双向绑定，保存时由父页面调 createInterviewQuestion。
 */
import type { InterviewQuestionCreateRequest } from '@/api/interviewTypes'

const model = defineModel<InterviewQuestionCreateRequest>({ required: true })
</script>

<style scoped>
.q-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--xt-text);
}
</style>
