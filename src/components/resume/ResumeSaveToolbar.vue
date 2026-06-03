<template>
  <el-card class="save-toolbar" shadow="never">
    <div class="save-toolbar-inner">
      <div class="fields">
        <div class="field field-title">
          <label class="lbl">简历名称（列表展示）<span class="req">*</span></label>
          <el-input
            v-model="title"
            maxlength="80"
            show-word-limit
            clearable
            placeholder="如：校招前端-张三"
          />
        </div>
        <div class="field field-def">
          <label class="lbl">设为默认简历</label>
          <div class="def-row">
            <el-switch v-model="isDefault" :active-value="1" :inactive-value="0" />
            <span class="def-hint">开启后，其它简历将自动取消默认</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" size="large" :loading="saving" @click="$emit('save')">
          {{ saveLabel }}
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    saving?: boolean
    saveLabel?: string
  }>(),
  { saveLabel: '保存到云端' },
)

defineEmits<{
  save: []
}>()

const title = defineModel<string>('title', { default: '' })
const isDefault = defineModel<number>('isDefault', { default: 0 })
</script>

<style scoped>
.save-toolbar {
  border-radius: var(--xt-radius-md);
  margin-bottom: 16px;
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--xt-shadow-sm);
}

.save-toolbar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px 24px;
}

.fields {
  flex: 1;
  min-width: 240px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 24px;
  align-items: end;
}

@media (max-width: 720px) {
  .fields {
    grid-template-columns: 1fr;
  }
}

.field .lbl {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.req {
  color: var(--el-color-danger);
  margin-left: 2px;
}

.def-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.def-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.actions {
  flex-shrink: 0;
}
</style>
