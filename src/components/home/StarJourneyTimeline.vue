<template>
  <section class="journey-section">
    <div class="section-header">
      <p class="xt-eyebrow journey-eyebrow">星途旅程</p>
      <h2 class="xt-section-title">四步开启职业星图</h2>
    </div>

    <div class="journey-svg-wrap">
      <svg
        class="journey-svg"
        viewBox="0 0 800 120"
        preserveAspectRatio="xMidYMid meet"
        aria-labelledby="journeyTitle journeyDesc"
      >
        <title id="journeyTitle">星途旅程进度</title>
        <desc id="journeyDesc">从智能解析到面试复盘的四个阶段进度</desc>

        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--xt-primary)" />
            <stop offset="100%" stop-color="var(--xt-primary-light)" />
          </linearGradient>
          <radialGradient id="currentGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#fb7185" />
            <stop offset="100%" stop-color="#e11d48" />
          </radialGradient>
        </defs>

        <path
          class="track-bg"
          d="M60,60 H740"
          fill="none"
          stroke="var(--xt-border)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="6 6"
        />

        <path
          class="track-progress"
          d="M60,60 H740"
          fill="none"
          stroke="url(#progressGradient)"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="progressDasharray"
          :stroke-dashoffset="progressDashoffset"
        />

        <g
          v-for="(step, i) in steps"
          :key="step.routeName"
          class="journey-node"
          :class="nodeClass(i)"
          @click="goStep(step.routeName)"
        >
          <circle
            class="node-bg"
            :cx="nodeX(i)"
            cy="60"
            r="28"
            fill="transparent"
          />

          <circle
            class="node-planet"
            :cx="nodeX(i)"
            cy="60"
            r="22"
          />

          <circle
            v-if="i === stage"
            class="node-pulse"
            :cx="nodeX(i)"
            cy="60"
            r="28"
            fill="none"
          />

          <foreignObject
            :x="nodeX(i) - 12"
            y="48"
            width="24"
            height="24"
          >
            <el-icon :size="20" class="node-icon"><component :is="step.icon" /></el-icon>
          </foreignObject>

          <text
            class="node-title"
            :x="nodeX(i)"
            y="110"
            text-anchor="middle"
          >
            {{ step.label }}
          </text>
        </g>
      </svg>
    </div>

    <div class="journey-counts">
      <div class="count-item">
        <span class="count-value">{{ counts.resumes }}</span>
        <span class="count-label">份简历</span>
      </div>
      <div class="count-item">
        <span class="count-value">{{ counts.mocks }}</span>
        <span class="count-label">场模拟面试</span>
      </div>
      <div class="count-item">
        <span class="count-value">{{ counts.interviews }}</span>
        <span class="count-label">场面试复盘</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { journeySteps } from '@/composables/useHomeJourney'

const props = defineProps<{
  stage: number
  counts: { resumes: number; mocks: number; interviews: number }
}>()

const router = useRouter()
const steps = journeySteps
const totalWidth = 800
const padding = 60
const usableWidth = totalWidth - padding * 2
const nodeCount = steps.length

function nodeX(index: number) {
  return padding + (usableWidth / (nodeCount - 1)) * index
}

function nodeClass(index: number) {
  if (index < props.stage) return 'completed'
  if (index === props.stage) return 'current'
  return 'future'
}

function goStep(routeName: string) {
  router.push({ name: routeName })
}

const trackLength = computed(() => usableWidth)
const progressRatio = computed(() => props.stage / (nodeCount - 1))
const progressDasharray = computed(() => `${trackLength.value * progressRatio.value} ${trackLength.value}`)
const progressDashoffset = computed(() => 0)
</script>

<style scoped>
.journey-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 28px;
  border-radius: var(--xt-radius-lg);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
  box-shadow: var(--xt-shadow-sm);
}

.section-header {
  text-align: center;
}

.journey-eyebrow {
  color: var(--xt-accent);
  margin: 0 0 8px;
}

.journey-svg-wrap {
  width: 100%;
  overflow-x: auto;
  padding: 8px 0;
}

.journey-svg {
  width: 100%;
  min-width: 560px;
  height: auto;
  display: block;
}

.track-progress {
  transition: stroke-dasharray 0.8s ease;
}

.journey-node {
  cursor: pointer;
}

.journey-node:hover .node-planet {
  filter: brightness(1.1);
}

.node-planet {
  transition: all 0.25s ease;
  stroke: transparent;
  stroke-width: 3;
}

.completed .node-planet {
  fill: url(#progressGradient);
}

.current .node-planet {
  fill: url(#currentGradient);
}

.current .node-pulse {
  stroke: var(--xt-accent);
  stroke-width: 2;
  opacity: 0.6;
  animation: node-pulse 2s ease-in-out infinite;
}

.future .node-planet {
  fill: #e2e8f0;
}

.node-icon {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.future .node-icon {
  color: var(--xt-text-muted);
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  fill: var(--xt-text);
}

@keyframes node-pulse {
  0%,
  100% {
    r: 22;
    opacity: 0.6;
  }
  50% {
    r: 32;
    opacity: 0.2;
  }
}

.journey-counts {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding-top: 12px;
  border-top: 1px solid var(--xt-border);
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.count-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--xt-primary);
  line-height: 1;
}

.count-label {
  font-size: 13px;
  color: var(--xt-text-secondary);
}

@media (max-width: 640px) {
  .journey-svg-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .journey-counts {
    gap: 16px;
  }

  .count-value {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .current .node-pulse {
    animation: none;
    opacity: 0.4;
  }

  .track-progress {
    transition: none;
  }
}
</style>
