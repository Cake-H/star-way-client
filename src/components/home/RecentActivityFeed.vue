<template>
  <section class="activity-section">
    <div class="section-header">
      <div class="section-title-wrap">
        <h2 class="section-title">最近星轨</h2>
        <p class="section-subtitle">从上次离开的地方继续</p>
      </div>
      <el-button v-if="activities.length" type="primary" link @click="emit('continue', activities[0])"
        >刷新
      </el-button>
    </div>

    <div v-loading="loading" class="activity-content">
      <el-empty v-if="!loading && activities.length === 0" description="还没有星轨记录"
      >
        <StarLaunchButton type="primary" @click="goUpload"
          ><el-icon class="btn-ico"><Upload /></el-icon>上传第一份简历</StarLaunchButton>
      </el-empty>

      <OrbitalCard v-else shadow="hover" class="activity-card">
        <div
          v-for="(item, i) in activities"
          :key="`${item.type}-${item.id}`"
          class="activity-row"
          :class="`type-${item.type}`"
          :style="{ animationDelay: `${i * 0.06}s` }"
          @click="go(item)"
        >
          <div class="row-icon">
            <el-icon :size="18"><component :is="iconFor(item.type)" /></el-icon>
          </div>
          <div class="row-info">
            <span class="row-title">{{ item.title }}</span>
            <span class="row-subtitle">{{ item.subtitle }} · {{ formatDateTime(item.timestamp) }}</span>
          </div>
          <div class="row-action" @click.stop="go(item)"
            >
            <el-button type="primary" link>继续</el-button>
          </div>
        </div>
      </OrbitalCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChatLineSquare, FolderOpened, MagicStick, Upload } from '@element-plus/icons-vue'
import type { ActivityItem, ActivityType } from '@/composables/useHomeJourney'
import { formatDateTime } from '@/utils/format'
import OrbitalCard from '@/components/OrbitalCard.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'

defineProps<{
  loading: boolean
  activities: ActivityItem[]
}>()

const emit = defineEmits<{
  continue: [item: ActivityItem]
}>()

const router = useRouter()

function iconFor(type: ActivityType) {
  const map: Record<ActivityType, typeof Upload> = {
    resume: FolderOpened,
    interview: ChatLineSquare,
    mock: MagicStick,
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
  font-size: 32px;
  font-weight: 700;
  color: var(--xt-text);
  letter-spacing: -0.02em;
}

.section-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--xt-text-secondary);
}

.activity-content {
  min-height: 160px;
}

.activity-card {
  padding: 8px;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: var(--xt-radius-md);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  animation: row-enter 0.5s ease both;
}

.activity-row:hover {
  background: var(--el-color-primary-light-9);
  transform: translateX(4px);
}

.activity-row + .activity-row {
  margin-top: 6px;
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

.type-resume .row-icon {
  background: linear-gradient(135deg, #818cf8, #6366f1);
}

.type-interview .row-icon {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
}

.type-mock .row-icon {
  background: linear-gradient(135deg, #fb7185, #e11d48);
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
  color: var(--xt-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-subtitle {
  font-size: 12px;
  color: var(--xt-text-secondary);
}

.row-action {
  flex-shrink: 0;
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
  .section-header {
    flex-direction: column;
    align-items: flex-start;
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
}
</style>
