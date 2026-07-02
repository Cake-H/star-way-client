<template>
  <aside v-if="nav" class="resume-section-nav" aria-label="简历模块导航">
    <div class="nav-head">
      <span class="nav-title">模块导航</span>
      <el-button type="primary" link size="small" @click="nav.expandAll">全部展开</el-button>
    </div>
    <nav class="nav-list">
      <button
        v-for="s in nav.sections"
        :key="s.key"
        type="button"
        class="nav-item"
        :class="{ active: nav.activeKey.value === s.key }"
        :aria-current="nav.activeKey.value === s.key ? 'true' : undefined"
        @click="nav.scrollToSection(s.key)"
      >
        <span class="nav-dot" aria-hidden="true" />
        <span class="nav-label">{{ s.title }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useResumeSectionNav } from '@/composables/useResumeSectionNav'

const nav = useResumeSectionNav()
</script>

<style scoped>
.resume-section-nav {
  position: fixed;
  left: 16px;
  top: 85px;
  z-index: 10;
  width: 180px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 14px 13px;
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  backdrop-filter: blur(10px);
  box-shadow: var(--xt-shadow-sm);
}

.nav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.nav-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--xt-text);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--xt-text-secondary);
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
  color: var(--xt-text);
}

.nav-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--xt-primary);
  font-weight: 600;
}

.nav-dot {
  flex: 0 0 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.35;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.nav-item.active .nav-dot {
  opacity: 1;
  transform: scale(1.25);
}

/* 窄屏：变成顶部横向导航 */
@media (max-width: 991px) {
  .resume-section-nav {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    max-height: none;
    padding: 10px;
    border-radius: var(--xt-radius-md);
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .nav-item {
    width: auto;
    flex: 1 1 auto;
    min-width: 96px;
    justify-content: center;
  }
}

@media (max-width: 767px) {
  .nav-item {
    font-size: 12px;
    padding: 6px 8px;
  }

  .nav-label {
    white-space: nowrap;
  }
}
</style>
