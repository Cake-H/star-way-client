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
      <!-- 移动端：收起标题行后，「全部展开」收进 chips 末尾 -->
      <button type="button" class="nav-item nav-expand-all" @click="nav.expandAll">全部展开</button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useResumeSectionNav } from '@/composables/useResumeSectionNav'

const nav = useResumeSectionNav()

/** 滚动联动高亮时，让当前 chip 自动滑进可视区（仅横向、就近对齐） */
watch(nav.activeKey, async () => {
  await nextTick()
  const active = document.querySelector<HTMLElement>('.resume-section-nav .nav-item.active')
  active?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
})
</script>

<style scoped>
.resume-section-nav {
  position: sticky;
  top: 85px;
  align-self: flex-start;
  flex-shrink: 0;
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
  background: rgba(232, 230, 224, 0.04);
  color: var(--xt-text);
}

/* 当前项：左侧 2px 琥珀竖条 + 琥珀文字，不用色块底 */
.nav-item.active {
  background: transparent;
  box-shadow: inset 2px 0 0 var(--xt-primary);
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

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 桌面端不显示（在 nav-head 里已有入口），移动端 chips 末尾出现 */
.nav-expand-all {
  display: none;
  color: var(--xt-text-muted);
  border-style: dashed !important;
}

/* 窄屏：收起标题行，瘦身为单行胶囊吸顶条（scroll-snap，当前项琥珀） */
@media (max-width: 991px) {
  .resume-section-nav {
    position: sticky;
    /* 让开全局吸顶导航栏（mobile 高约 60px），留 6px 悬浮缝 */
    top: 66px;
    align-self: stretch;
    flex-shrink: 0;
    width: 100%;
    max-height: none;
    padding: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--xt-surface) 82%, transparent);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .nav-head {
    display: none;
  }

  .nav-expand-all {
    display: inline-flex;
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 2px;
    /* 隐藏原生横向滚动条，避免胶囊条下多一根「假进度条」 */
    scrollbar-width: none;
  }

  .nav-list::-webkit-scrollbar {
    display: none;
  }

  .nav-item {
    width: auto;
    flex: 0 0 auto;
    min-width: auto;
    justify-content: flex-start;
    scroll-snap-align: start;
    border: 1px solid var(--xt-border);
    border-radius: 999px;
    background: var(--xt-surface-muted);
    padding: 6px 14px;
  }

  .nav-item:hover {
    background: var(--xt-surface-muted);
    border-color: rgba(232, 163, 61, 0.45);
  }

  /* 当前 chip：琥珀文字 + 琥珀描边（不用色块底） */
  .nav-item.active {
    box-shadow: none;
    border-color: rgba(232, 163, 61, 0.55);
    background: transparent;
    color: var(--xt-primary);
  }

  .nav-dot {
    display: none;
  }
}

@media (max-width: 767px) {
  .nav-item {
    font-size: 12px;
    padding: 6px 12px;
  }

  .nav-label {
    white-space: nowrap;
  }
}
</style>
