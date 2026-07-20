<template>
  <el-dialog
    v-model="visible"
    title="需要登录"
    width="480px"
    align-center
    class="login-required-dialog"
    destroy-on-close
    :modal="false"
    :lock-scroll="false"
    :close-on-click-modal="false"
  >
    <div class="dialog-body">
      <div class="icon-wrap">
        <div class="orbit-ring" />
        <div class="orbit-ring inner" />
        <div class="star-core">
          <el-icon :size="28"><User /></el-icon>
        </div>
      </div>
      <p class="dialog-lead">
        登录后即可使用我的简历、面试复盘、模拟面试等完整功能。
      </p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="goLogin">去登录</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { User } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  redirect?: string
}>(), {
  redirect: '/',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function goLogin() {
  visible.value = false
  router.push({ name: 'login', query: { redirect: props.redirect } })
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 8px 0;
}

.icon-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
}

.orbit-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(99, 102, 241, 0.35);
  animation: spin 14s linear infinite;
}

.orbit-ring.inner {
  inset: 12px;
  border-color: rgba(34, 211, 238, 0.25);
  animation-duration: 10s;
  animation-direction: reverse;
}

.star-core {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--xt-primary) 0%, var(--xt-primary-dark) 100%);
  color: #fff;
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.35);
}

.dialog-lead {
  margin: 0;
  text-align: center;
  font-size: 14px;
  line-height: 1.7;
  color: var(--xt-text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

<style>
.login-required-dialog {
  max-height: 75vh;
}

@media (max-width: 640px) {
  .login-required-dialog {
    width: 85vw !important;
  }
}
</style>
