<template>
  <div class="orbit-progress" :class="[`size-${size}`]">
    <svg viewBox="0 0 100 100" class="orbit-svg" :style="svgStyle">
      <circle class="orbit-track" cx="50" cy="50" :r="radius" />
      <circle
        class="orbit-active"
        cx="50"
        cy="50"
        :r="radius"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
      <g
        v-for="i in steps"
        :key="i"
        class="orbit-step"
        :class="{ active: i <= activeIndex, current: i === activeIndex }"
      >
        <circle class="step-dot" :cx="dot(i).x" :cy="dot(i).y" :r="dotRadius" />
      </g>
    </svg>
    <div v-if="labels && labels.length" class="orbit-labels">
      <span
        v-for="(label, i) in labels"
        :key="i"
        class="orbit-label"
        :class="{ active: i < activeIndex - 1, current: i === activeIndex - 1 }"
      >
        {{ label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    steps: number
    active: number
    size?: 'sm' | 'md' | 'lg'
    labels?: string[]
  }>(),
  {
    size: 'md',
  }
)

const radius = 46
const circumference = 2 * Math.PI * radius
const activeIndex = computed(() => Math.min(Math.max(props.active + 1, 1), props.steps))

const fraction = computed(() => {
  if (props.steps <= 1) return 1
  return (activeIndex.value - 1) / (props.steps - 1)
})

const dashOffset = computed(() => circumference * (1 - fraction.value))

function dot(index: number) {
  const step = props.steps <= 1 ? 0 : (index - 1) / (props.steps - 1)
  const angle = step * 360 - 90
  const rad = (angle * Math.PI) / 180
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  }
}

const dotRadius = computed(() => {
  if (props.size === 'sm') return 3.2
  if (props.size === 'lg') return 5
  return 4
})

const svgStyle = computed(() => {
  const duration = props.size === 'lg' ? 30 : props.size === 'sm' ? 45 : 36
  return { animationDuration: `${duration}s` }
})
</script>

<style scoped>
.orbit-progress {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.orbit-svg {
  width: 100%;
  height: auto;
  animation: orbit-spin linear infinite;
}

.orbit-track {
  fill: none;
  stroke: var(--xt-orbit-path);
  stroke-width: 2;
}

.orbit-active {
  fill: none;
  stroke: var(--xt-primary-light);
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.step-dot {
  fill: var(--xt-surface-solid);
  stroke: var(--xt-orbit-ring-strong);
  stroke-width: 1.5;
  transition: fill 0.25s ease, stroke 0.25s ease, r 0.25s ease;
}

.orbit-step.active .step-dot {
  fill: var(--xt-primary);
  stroke: var(--xt-primary-light);
}

.orbit-step.current .step-dot {
  filter: drop-shadow(0 0 4px var(--xt-launch-glow));
}

.orbit-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 11px;
  /* 未答：禁用灰 */
  color: var(--xt-text-on-dark-disabled);
}

/* 已答：暖白 */
.orbit-label.active {
  color: var(--xt-text-on-dark);
}

/* 当前题：琥珀 */
.orbit-label.current {
  color: var(--xt-primary);
  font-weight: 600;
}

.size-sm {
  width: 48px;
}

.size-md {
  width: 88px;
}

.size-lg {
  width: 140px;
}

@media (prefers-reduced-motion: reduce) {
  .orbit-svg {
    animation: none;
  }
}
</style>
