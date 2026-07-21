<template>
  <el-dialog
    v-model="visible"
    title="额度不足"
    width="440px"
    align-center
    class="quota-insufficient-dialog"
    destroy-on-close
  >
    <div class="dialog-body">
      <div class="icon-wrap">
        <div class="orbit-ring" />
        <div class="star-core">
          <el-icon :size="28"><Wallet /></el-icon>
        </div>
      </div>
      <p class="dialog-lead">
        当前额度已用完
      </p>
      <p class="dialog-sub">
        立即充值继续体验 AI 功能，或明天再来领取免费额度。
      </p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onTomorrow">明日再来</el-button>
        <el-button type="primary" @click="goQuotaCenter">去充值</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Wallet } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function goQuotaCenter() {
  visible.value = false
  router.push({ name: 'quota-center' })
}

function onTomorrow() {
  visible.value = false
}
</script>

<style scoped>
.dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.icon-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.orbit-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(99, 102, 241, 0.35);
  animation: spin 14s linear infinite;
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
  font-size: 15px;
  font-weight: 600;
  color: var(--xt-text);
  line-height: 1.7;
}

.dialog-sub {
  margin: 0;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
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
.quota-insufficient-dialog {
  max-height: 75vh;
}

@media (max-width: 640px) {
  .quota-insufficient-dialog {
    width: 85vw !important;
  }
}
</style>
