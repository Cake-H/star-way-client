<template>
  <section class="journey-section" aria-label="你的星途">
    <div class="section-header">
      <h2 class="section-title">你的星途</h2>
      <p class="section-subtitle">五段航程，按你的真实数据依序点亮</p>
    </div>

    <ol class="journey-track">
      <template v-for="(step, i) in steps" :key="step.key">
        <li class="jnode-wrap">
          <button
            type="button"
            class="jnode"
            :class="nodeClass(i)"
            :aria-label="`${step.label}：${step.desc}`"
            @click="goStep(step)"
          >
            <span class="jnode-dot">
              <el-icon :size="18"><component :is="step.icon" /></el-icon>
            </span>
            <span class="jnode-label">{{ step.label }}</span>
            <span class="jnode-desc">{{ step.desc }}</span>
          </button>
        </li>
        <li
          v-if="i < steps.length - 1"
          class="jlink"
          :class="{ lit: i < stage }"
          aria-hidden="true"
        />
      </template>
    </ol>

    <div class="journey-counts">
      <div class="count-item">
        <span class="count-value">{{ counts.resumes }}</span>
        <span class="count-label">份星舰档案</span>
      </div>
      <div class="count-item">
        <span class="count-value">{{ counts.mocks }}</span>
        <span class="count-label">场跃迁试炼</span>
      </div>
      <div class="count-item">
        <span class="count-value">{{ counts.interviews }}</span>
        <span class="count-label">篇航行日志</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { journeySteps, type JourneyStep } from '@/composables/useHomeJourney'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import { authToken } from '@/auth/session'

const props = defineProps<{
  /** 当前航程阶段：-1 未启航，0-4 已点亮的最高阶段；下一阶段为脉冲的当前节点 */
  stage: number
  counts: { resumes: number; mocks: number; interviews: number }
}>()

const router = useRouter()
const { promptLogin } = useLoginPrompt()
const steps = journeySteps

function nodeClass(index: number) {
  if (index <= props.stage) return 'completed'
  if (index === props.stage + 1) return 'current'
  return 'future'
}

function goStep(step: JourneyStep) {
  if (!authToken.value) {
    promptLogin('/')
    return
  }
  router.push({ name: step.routeName })
}
</script>

<style scoped>
.journey-section {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 36px 32px 28px;
  border-radius: var(--xt-radius-lg);
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
}

.section-header {
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

/* —— 星座连线（PC 横向） —— */
.journey-track {
  display: flex;
  align-items: flex-start;
  margin: 0;
  padding: 0;
  list-style: none;
}

.jnode-wrap {
  flex-shrink: 0;
  width: 132px;
  display: flex;
  justify-content: center;
}

.jnode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.jnode-dot {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--xt-text-on-dark-disabled);
  background: #0d0d12;
  border: 1px solid rgba(232, 230, 224, 0.14);
  transition: box-shadow 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* 已完成节点：琥珀点亮 */
.completed .jnode-dot {
  color: #0d0d12;
  border-color: #e8a33d;
  background: #e8a33d;
}

/* 当前节点：琥珀脉冲呼吸 */
.current .jnode-dot {
  color: #e8a33d;
  border-color: rgba(232, 163, 61, 0.8);
  animation: node-pulse 2s ease-in-out infinite;
}

.current .jnode-label {
  color: #e8a33d;
}

@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 163, 61, 0.35); }
  50% { box-shadow: 0 0 0 10px rgba(232, 163, 61, 0); }
}

/* 未到达节点：暗淡 */
.future .jnode-dot {
  opacity: 0.65;
}

.future .jnode-label,
.future .jnode-desc {
  opacity: 0.6;
}

.jnode:hover .jnode-dot,
.jnode:focus-visible .jnode-dot {
  border-color: rgba(232, 163, 61, 0.7);
  color: #e8a33d;
  opacity: 1;
}

.jnode-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--xt-text-on-dark);
}

.jnode-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--xt-text-on-dark-muted);
  text-align: center;
  max-width: 150px;
}

/* 节点间连线：点亮段为琥珀光线 */
.jlink {
  flex: 1;
  height: 2px;
  margin-top: 27px;
  background: rgba(232, 230, 224, 0.1);
  border-radius: 2px;
}

.jlink.lit {
  background: #e8a33d;
}

/* —— 统计行 —— */
.journey-counts {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding-top: 20px;
  border-top: 1px solid rgba(232, 230, 224, 0.1);
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.count-value {
  font-family: var(--xt-font-display);
  font-size: 28px;
  font-weight: 800;
  color: #e8a33d;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.count-label {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

/* —— 移动端：纵向时间线 —— */
@media (max-width: 768px) {
  .journey-section {
    padding: 26px 20px 22px;
    gap: 24px;
  }

  .section-title {
    font-size: 26px;
  }

  .journey-track {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .jnode-wrap {
    width: 100%;
    justify-content: flex-start;
  }

  .jnode {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 6px 0;
    text-align: left;
  }

  .jnode-dot {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  .jnode-label {
    font-size: 15px;
    min-width: 76px;
  }

  .jnode-desc {
    text-align: left;
    max-width: none;
    flex: 1;
  }

  .jlink {
    flex: none;
    width: 2px;
    height: 26px;
    margin-top: 0;
    margin-left: 27px;
    background: rgba(232, 230, 224, 0.1);
  }

  .jlink.lit {
    background: #e8a33d;
  }

  .journey-counts {
    gap: 20px;
    justify-content: space-between;
  }

  .count-value {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .current .jnode-dot {
    animation: none;
    box-shadow: 0 0 0 3px rgba(232, 163, 61, 0.25);
  }
}
</style>
