<template>
  <div class="constellation-progress" role="img" :aria-label="`进度：第 ${active + 1} 题，共 ${steps} 题`">
    <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="xMidYMid meet" class="cp-svg">
      <!-- 折线段：已走过的不分明亮暖白，未到的暗淡 -->
      <line
        v-for="i in steps - 1"
        :key="`seg-${i}`"
        class="cp-seg"
        :class="{ lit: i <= active }"
        :x1="points[i - 1].x"
        :y1="points[i - 1].y"
        :x2="points[i].x"
        :y2="points[i].y"
      />
      <!-- 折点：看完一题亮一个点 -->
      <g v-for="(p, i) in points" :key="`pt-${i}`">
        <circle
          v-if="i === active"
          class="cp-halo"
          :cx="p.x"
          :cy="p.y"
          :r="p.r + 6"
        />
        <circle
          class="cp-dot"
          :class="dotClass(i)"
          :cx="p.x"
          :cy="p.y"
          :r="i === active ? p.r + 1.4 : p.r"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 总题数（折点数） */
  steps: number
  /** 当前题（0 基）：≤ active 的折点点亮 */
  active: number
}>()

const height = 56

/** 确定性伪随机（与首页页脚星图同思路）：同一下标永远得到同一坐标，重渲染不跳动 */
function hash(seed: number) {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * 折点坐标：仿真实星图的不规则分布——
 * x 间距随 hash 在 30–46px 间变化，y 在中线两侧 ±6~22px 不规则起伏，
 * 点半径 2.4–4.2px 不一，避免机械 zigzag。
 */
const points = computed(() => {
  const padX = 14
  let x = padX
  return Array.from({ length: props.steps }, (_, i) => {
    const y = height / 2 + (hash(i * 2 + 1) - 0.5) * 2 * (6 + hash(i * 2 + 2) * 16)
    const r = 2.4 + hash(i * 2 + 3) * 1.8
    const p = { x, y: Math.min(height - 8, Math.max(8, y)), r }
    x += 30 + hash(i * 2 + 4) * 16
    return p
  })
})

const width = computed(() => {
  const last = points.value[points.value.length - 1]
  return (last ? last.x : 0) + 14
})

function dotClass(i: number) {
  if (i < props.active) return 'done'
  if (i === props.active) return 'current'
  return 'future'
}
</script>

<style scoped>
.constellation-progress {
  overflow: hidden;
}

.cp-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cp-seg {
  stroke: rgba(232, 230, 224, 0.14);
  stroke-width: 1.5;
  stroke-linecap: round;
  transition: stroke 0.3s ease;
}

.cp-seg.lit {
  stroke: rgba(232, 230, 224, 0.5);
}

.cp-dot {
  fill: #55524c;
  transition: fill 0.3s ease;
}

.cp-dot.done {
  fill: #e8a33d;
}

.cp-dot.current {
  fill: #f0bc66;
  filter: drop-shadow(0 0 4px rgba(232, 163, 61, 0.7));
}

/* 当前题：琥珀脉冲光晕 */
.cp-halo {
  fill: none;
  stroke: rgba(232, 163, 61, 0.5);
  stroke-width: 1.5;
  animation: cp-pulse 2s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}

@keyframes cp-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cp-halo {
    animation: none;
    opacity: 0.6;
  }
}
</style>
