<template>
  <section ref="sectionEl" class="journey-section" :class="{ 'journey-entered': hasEntered }" aria-label="你的星途">
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
              <component :is="step.icon" class="journey-icon" />
            </span>
            <span class="jnode-label">{{ step.label }}</span>
            <span class="jnode-desc">{{ step.desc }}</span>
          </button>
        </li>
        <li
          v-if="i < steps.length - 1"
          class="jlink"
          :class="{ lit: i < stage }"
          :style="{ '--link-delay': `${i * 140}ms` }"
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
import { onMounted, onUnmounted, ref } from 'vue'
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
const sectionEl = ref<HTMLElement | null>(null)
const hasEntered = ref(false)
let entryObserver: IntersectionObserver | undefined

onMounted(() => {
  if (!sectionEl.value) return
  entryObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    hasEntered.value = true
    entryObserver?.disconnect()
  }, { threshold: 0.25 })
  entryObserver.observe(sectionEl.value)
})

onUnmounted(() => entryObserver?.disconnect())

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
  border-radius: var(--xt-radius-sm);
}

.jnode:focus-visible {
  outline: 2px solid var(--xt-primary);
  outline-offset: 4px;
}

.journey-icon {
  width: 20px;
  height: 20px;
  transition: translate 0.25s ease;
}

.jnode-dot {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--xt-text-on-dark-disabled);
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  transition: box-shadow 0.25s ease, color 0.25s ease, border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
}

.current .jnode-dot::after {
  content: '';
  position: absolute;
  inset: -5px;
  border: 1px solid var(--xt-primary);
  border-radius: inherit;
  opacity: 0.2;
  pointer-events: none;
  animation: journey-breathe 3.2s ease-in-out infinite;
}

@keyframes journey-breathe {
  0%, 100% { transform: scale(1); opacity: 0.16; }
  50% { transform: scale(1.08); opacity: 0.45; }
}

/* 已完成节点：浅金底与金色线稿，避免大面积实心圆抢占文字层次。 */
.completed .jnode-dot {
  color: var(--xt-primary);
  border-color: color-mix(in srgb, var(--xt-primary) 48%, transparent);
  background: color-mix(in srgb, var(--xt-primary) 10%, var(--xt-card-bg));
}

/* 当前节点：静态细环强调下一步。 */
.current .jnode-dot {
  color: var(--xt-primary);
  border-color: var(--xt-primary);
  background: color-mix(in srgb, var(--xt-primary) 6%, var(--xt-card-bg));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--xt-primary) 9%, transparent);
}

.current .jnode-label {
  color: var(--xt-primary);
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
  border-color: var(--xt-primary);
  color: var(--xt-primary);
  background: color-mix(in srgb, var(--xt-primary) 15%, var(--xt-card-bg));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--xt-primary) 10%, transparent);
  opacity: 1;
}

.jnode-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--xt-text-on-dark);
  transition: color 0.2s ease;
}

.jnode-desc {
  font-size: 12px;
  line-height: 1.8;
  color: var(--xt-text-on-dark-muted);
  text-align: center;
  max-width: 150px;
}

/* 节点间连线：点亮段为琥珀光线 */
.jlink {
  position: relative;
  flex: 1;
  height: 1px;
  margin-top: 27px;
  background: rgba(232, 230, 224, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.journey-entered .jlink.lit::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--xt-primary-light);
  transform-origin: left;
  opacity: 0;
  animation: journey-trace 0.9s ease-out var(--link-delay) 1;
}

@keyframes journey-trace {
  0% { transform: scaleX(0); opacity: 0; }
  25% { opacity: 1; }
  75% { transform: scaleX(1); opacity: 0.8; }
  100% { transform: scaleX(1); opacity: 0; }
}

@media (hover: hover) and (pointer: fine) {
  .jnode:is(:hover, :focus-visible) .jnode-dot {
    transform: scale(1.06);
  }

  .jnode:is(:hover, :focus-visible) .journey-icon {
    translate: 0 -2px;
  }

  .jnode:is(:hover, :focus-visible) .jnode-label {
    color: var(--xt-primary);
    opacity: 1;
  }

  .jnode.future:is(:hover, :focus-visible) .jnode-dot {
    background: color-mix(in srgb, var(--xt-primary) 7%, var(--xt-card-bg));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--xt-primary) 6%, transparent);
  }
}

@media (hover: none) {
  .jnode:active .jnode-dot {
    transform: scale(0.95);
    border-color: var(--xt-primary);
  }
}

.jlink.lit {
  background: color-mix(in srgb, var(--xt-primary) 55%, transparent);
}

/* —— 统计行 —— */
.journey-counts {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--xt-card-border);
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.count-value {
  font-family: var(--xt-font-display);
  font-size: 24px;
  font-weight: 500;
  color: var(--xt-primary);
  line-height: 1.2;
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
    width: 1px;
    height: 26px;
    margin-top: 0;
    margin-left: 22px;
    background: rgba(232, 230, 224, 0.1);
  }

  .jlink.lit {
    background: color-mix(in srgb, var(--xt-primary) 55%, transparent);
  }

  .journey-entered .jlink.lit::after {
    animation-name: journey-trace-vertical;
    transform-origin: top;
  }

  .journey-counts {
    gap: 20px;
    justify-content: space-between;
  }

  .count-value {
    font-size: 22px;
  }
}

@keyframes journey-trace-vertical {
  0% { transform: scaleY(0); opacity: 0; }
  25% { opacity: 1; }
  75% { transform: scaleY(1); opacity: 0.8; }
  100% { transform: scaleY(1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .jnode-dot,
  .journey-icon,
  .jnode-label {
    transition: none;
    transform: none !important;
    translate: none !important;
  }

  .current .jnode-dot::after,
  .journey-entered .jlink.lit::after {
    animation: none;
  }
}

/* 仅为本模块补齐破晓态，保留相同的节点层级。 */
:global(html[data-theme='dawn'] .journey-section .completed .jnode-dot) {
  color: var(--xt-primary);
  border-color: color-mix(in srgb, var(--xt-primary) 48%, transparent);
  background: color-mix(in srgb, var(--xt-primary) 10%, var(--xt-card-bg));
}

:global(html[data-theme='dawn'] .journey-section .current .jnode-dot) {
  border-color: var(--xt-primary);
  background: color-mix(in srgb, var(--xt-primary) 6%, var(--xt-card-bg));
}
</style>
