<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="min(680px, 92vw)"
    class="agreement-dialog"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
    @open="load"
  >
    <div v-loading="loading" class="agreement-body">
      <p v-if="error" class="agreement-error">
        {{ error }}
        <el-button type="primary" link @click="load">重试</el-button>
      </p>
      <!-- 协议为后端下发的可信 markdown 全文，整段渲染展示 -->
      <div v-else-if="html" class="agreement-content" v-html="html" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import { getAgreement, type AgreementType } from '@/api/agreement'

const props = defineProps<{
  modelValue: boolean
  type: AgreementType
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const title = computed(() => (props.type === 'privacy' ? '隐私政策' : '用户协议'))

const loading = ref(false)
const error = ref('')
const html = ref('')

/** 文案后端内存缓存，前端会话内同样只拉一次 */
const cache = new Map<AgreementType, string>()

async function load() {
  error.value = ''
  const cached = cache.get(props.type)
  if (cached) {
    html.value = cached
    return
  }
  loading.value = true
  try {
    const md = await getAgreement(props.type)
    const rendered = await marked.parse(md, { async: true })
    cache.set(props.type, rendered)
    html.value = rendered
  } catch {
    // 网络/业务异常已由拦截器提示，这里提供重试入口
    error.value = '协议内容加载失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.agreement-body {
  min-height: 240px;
  max-height: 60vh;
  overflow-y: auto;
}

.agreement-error {
  margin: 24px 0;
  text-align: center;
  color: var(--xt-text-secondary);
}

.agreement-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--xt-text);
  word-break: break-word;
}

.agreement-content :deep(h1),
.agreement-content :deep(h2),
.agreement-content :deep(h3) {
  margin: 18px 0 8px;
  line-height: 1.4;
}

.agreement-content :deep(h1) { font-size: 20px; }
.agreement-content :deep(h2) { font-size: 17px; }
.agreement-content :deep(h3) { font-size: 15px; }

.agreement-content :deep(p) {
  margin: 8px 0;
}

.agreement-content :deep(ul),
.agreement-content :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.agreement-content :deep(a) {
  color: var(--el-color-primary);
}

.agreement-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.agreement-content :deep(th),
.agreement-content :deep(td) {
  border: 1px solid var(--xt-border-strong);
  padding: 6px 10px;
  font-size: 13px;
}
</style>
