<template>
  <el-dialog
    :model-value="modelValue"
    title="账号注销"
    width="min(440px, 92vw)"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="delete-body">
      <el-alert type="warning" :closable="false" show-icon class="warn">
        <template #title>
          注销后，你的简历、面试复盘、模拟面试记录将被全部删除，且不可恢复。
          注销后原手机号可重新注册，但注册即是全新账号，不含任何历史数据。
        </template>
      </el-alert>

      <p class="confirm-tip">如确认注销，请手动输入「注销」二字：</p>
      <el-input
        v-model="confirmText"
        maxlength="8"
        placeholder="请输入：注销"
        @keyup.enter="onConfirm"
      />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button
        type="danger"
        :disabled="confirmText !== '注销'"
        :loading="deleting"
        @click="onConfirm"
      >
        确认注销
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { deleteAccount } from '@/api/auth'
import { clearSession } from '@/auth/session'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const confirmText = ref('')
const deleting = ref(false)

// 每次打开重置输入
watch(
  () => props.modelValue,
  (v) => {
    if (v) confirmText.value = ''
  },
)

async function onConfirm() {
  if (confirmText.value !== '注销' || deleting.value) return
  deleting.value = true
  try {
    await deleteAccount(confirmText.value)
    // 后端已撤销 token，清空本地登录态并回登录页
    clearSession()
    emit('update:modelValue', false)
    ElMessage.success('账号已注销，感谢曾经的同行')
    await router.replace({ name: 'login' })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.delete-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.warn :deep(.el-alert__title) {
  line-height: 1.7;
}

.confirm-tip {
  margin: 0;
  font-size: 14px;
  color: var(--xt-text-secondary);
}
</style>
