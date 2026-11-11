<template>
  <section class="activity-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <h2 class="section-title">最近星轨</h2>
        <p class="section-subtitle">从上次离开的地方继续</p>
      </div>
    </div>

    <div v-loading="loading" class="activity-content">
      <div v-if="!loading && activities.length === 0" class="activity-empty">
        <div class="empty-icon" aria-hidden="true">
          <el-icon :size="30"><Promotion /></el-icon>
        </div>
        <p class="empty-text">{{ props.emptyText }}</p>
        <StarLaunchButton type="primary" @click="goUpload">
          <el-icon class="btn-ico"><Upload /></el-icon>上传第一份星舰档案
        </StarLaunchButton>
      </div>

      <div v-else class="activity-card">
        <div
          v-for="(item, i) in activities"
          :key="`${item.type}-${item.id}`"
          class="activity-row"
          :class="`type-${item.type}`"
          :style="{ animationDelay: `${i * 0.06}s` }"
          role="link"
          tabindex="0"
          @click="go(item)"
          @keydown.enter="go(item)"
        >
          <div class="row-icon" aria-hidden="true">
            <el-icon :size="18"><component :is="iconFor(item.type)" /></el-icon>
          </div>
          <div class="row-info">
            <span class="row-title">{{ item.title }}</span>
            <span class="row-subtitle">{{ item.subtitle }} · {{ formatDateTime(item.timestamp) }}</span>
          </div>
          <div class="row-action" @click.stop="go(item)">
            <button type="button" class="row-ghost-btn">继续</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Promotion, Upload } from '@element-plus/icons-vue'
import type { Component } from 'vue'
import { HomeArchiveIcon, HomeMockIcon, HomeReviewIcon } from './homeIcons'
import type { ActivityItem, ActivityType } from '@/composables/useHomeJourney'
import { formatDateTime } from '@/utils/format'
import StarLaunchButton from '@/components/StarLaunchButton.vue'

const props = withDefaults(defineProps<{
  loading: boolean
  activities: ActivityItem[]
  emptyText?: string
}>(), {
  emptyText: '还没有星轨记录',
})

const router = useRouter()

function iconFor(type: ActivityType) {
  const map: Record<ActivityType, Component> = {
    resume: HomeArchiveIcon,
    interview: HomeReviewIcon,
    mock: HomeMockIcon,
  }
  return map[type]
}

function go(item: ActivityItem) {
  router.push({
    name: item.routeName,
    params: item.routeParams,
  })
}

function goUpload() {
  router.push({ name: 'resume-upload' })
}
</script>

<style scoped>
.activity-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
}

.section-title-wrap {
  text-align: center;
}

.section-title {
  margin: 0 0 6px;
  font-family: var(--xt-font-title);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--xt-text-on-dark);
}

.section-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--xt-text-on-dark-muted);
}

.activity-content {
  min-height: 160px;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 40px 24px;
  border-radius: var(--xt-radius-lg);
  border: 1px dashed var(--xt-card-border-hover);
  background: var(--xt-card-bg);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #e8a33d;
  background: #0d0d12;
  border: 1px solid var(--xt-card-border-hover);
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--xt-text-on-dark-muted);
}

.activity-card {
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  border-radius: var(--xt-radius-lg);
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
}

.activity-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: var(--xt-radius-md);
  cursor: pointer;
  transition: background 0.25s ease, box-shadow 0.25s ease, translate 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  animation: row-enter 0.5s ease both;
}

/* 条目间渐隐光线分隔（中间亮两端透明） */
.activity-row + .activity-row::before {
  content: '';
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(232, 230, 224, 0.14), transparent);
}

.activity-row:hover,
.activity-row:focus-visible,
.activity-row:focus-within {
  background: linear-gradient(110deg, color-mix(in srgb, var(--xt-primary) 10%, transparent), color-mix(in srgb, var(--xt-primary) 3%, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--xt-primary) 60%, transparent),
    0 6px 18px color-mix(in srgb, var(--xt-primary) 10%, transparent);
}

.activity-row:focus-visible {
  outline: 2px solid var(--xt-primary);
  outline-offset: 2px;
}

.row-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
}

/* 行图标：哑光圆底 + 暖白图标，hover 琥珀 */
.activity-row .row-icon {
  background: #0d0d12;
  border: 1px solid var(--xt-card-border);
  color: var(--xt-text-on-dark);
  transition: color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.activity-row:is(:hover, :focus-visible, :focus-within) .row-icon {
  color: var(--xt-primary);
  border-color: var(--xt-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--xt-primary) 9%, transparent);
}

.activity-row:is(:hover, :focus-visible, :focus-within) .row-ghost-btn {
  color: var(--xt-primary);
  border-color: color-mix(in srgb, var(--xt-primary) 65%, transparent);
  background: color-mix(in srgb, var(--xt-primary) 8%, transparent);
}

.activity-empty {
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease, translate 0.28s ease;
}

.empty-icon {
  transition: transform 0.28s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.activity-empty:is(:hover, :focus-within) {
  border-color: color-mix(in srgb, var(--xt-primary) 65%, transparent);
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--xt-primary) 9%, transparent), transparent 65%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--xt-primary) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--xt-primary) 12%, transparent),
    0 12px 30px color-mix(in srgb, var(--xt-primary) 12%, transparent);
}

.activity-empty:is(:hover, :focus-within) .empty-icon {
  border-color: var(--xt-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--xt-primary) 10%, transparent);
}

@media (hover: hover) and (pointer: fine) {
  .activity-row:is(:hover, :focus-visible, :focus-within) {
    translate: 0 -2px;
  }

  .activity-row:is(:hover, :focus-visible, :focus-within) .row-icon {
    transform: translateY(-2px) scale(1.06);
  }

  .activity-empty:is(:hover, :focus-within) {
    translate: 0 -3px;
  }

  .activity-empty:is(:hover, :focus-within) .empty-icon {
    transform: translateY(-2px) scale(1.06);
  }
}

@media (hover: none) {
  .activity-row:active,
  .activity-empty:active {
    translate: 0 1px;
    box-shadow: inset 0 0 0 1px var(--xt-primary);
  }
}

.row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.row-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--xt-text-on-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-subtitle {
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
}

.row-action {
  flex-shrink: 0;
}

/* 幽灵按钮 */
.row-ghost-btn {
  min-height: 34px;
  padding: 4px 16px;
  border-radius: 999px;
  border: 1px solid rgba(232, 230, 224, 0.2);
  background: transparent;
  color: var(--xt-text-on-dark);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.row-ghost-btn:hover {
  border-color: rgba(232, 163, 61, 0.55);
  color: #e8a33d;
}

.btn-ico {
  margin-right: 6px;
}

@keyframes row-enter {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 26px;
  }

  .activity-row {
    align-items: flex-start;
    gap: 12px;
  }

  .row-info {
    gap: 6px;
  }

  .row-title {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-row {
    animation: none;
  }

  .activity-row:hover {
    transform: none;
  }

  .activity-row,
  .activity-row .row-icon,
  .activity-empty,
  .empty-icon {
    transition: none;
    translate: none !important;
    transform: none !important;
  }
}
</style>
