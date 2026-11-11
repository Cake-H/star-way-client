<template>
  <header class="xt-section-head compact-page-head">
    <div class="page-heading-line">
      <h1 class="xt-section-title">{{ title }}</h1>
      <p class="xt-eyebrow page-heading-eyebrow">{{ eyebrow }}</p>
    </div>
    <p class="xt-section-desc page-heading-description">{{ description }}</p>
    <div class="page-heading-actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  eyebrow: string
  description: string
}>()
</script>

<style scoped>
.compact-page-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px 24px;
  padding: 18px 24px;
}

.page-heading-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  min-width: 0;
}

.page-heading-line .xt-section-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.4;
}

.page-heading-eyebrow {
  margin: 0;
  color: var(--xt-primary);
  font-size: 11px;
  line-height: 1.5;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.page-heading-description {
  grid-column: 1 / -1;
  grid-row: 2;
  max-width: none;
  min-width: 0;
  font-size: 13px;
  line-height: 1.7;
}

.page-heading-actions {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.page-heading-actions :deep(.el-button) {
  margin-left: 0;
  cursor: pointer;
}

@media (max-width: 640px) {
  .compact-page-head {
    grid-template-columns: minmax(0, 1fr);
    padding: 16px;
    gap: 10px;
  }

  .page-heading-line {
    gap: 6px 12px;
  }

  .page-heading-line .xt-section-title {
    font-size: 22px;
  }

  .page-heading-eyebrow {
    font-size: 10px;
  }

  .page-heading-actions {
    grid-column: 1;
    grid-row: 3;
    justify-content: flex-start;
    margin-top: 2px;
  }

  .page-heading-actions :deep(.el-button) {
    flex: 1 1 auto;
  }
}
</style>
