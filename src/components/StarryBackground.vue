<template>
  <div class="starry-root" :class="variant" aria-hidden="true">
    <div v-if="variant !== 'dark'" class="aurora" />
    <div v-if="variant !== 'dark'" class="glow" />
    <div
      v-for="(s, i) in stars"
      :key="i"
      class="star"
      :class="{ 'star-static': reducedMotion, 'star-bright': s.bright }"
      :style="{
        top: s.top,
        left: s.left,
        width: `${s.size}px`,
        height: `${s.size}px`,
        opacity: s.opacity,
        animationDelay: `${s.delay}s`,
      }"
    />
    <div v-if="showMeteors" class="meteor meteor-a" />
    <div v-if="showMeteors" class="meteor meteor-b" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type Star = { top: string; left: string; size: number; delay: number; opacity: number; bright: boolean }

const props = withDefaults(
  defineProps<{
    /** dark：深空黑（首页/登录）；subtle：内页浅色星空 */
    variant?: 'dark' | 'subtle'
  }>(),
  { variant: 'dark' },
)

const stars = ref<Star[]>([])
const reducedMotion = ref(false)

const showMeteors = computed(() => props.variant === 'dark' && !reducedMotion.value)

function generateStars() {
  // 移动端粒子数减半
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768
  const count = props.variant === 'dark' ? (mobile ? 110 : 220) : 72
  const opacityBase = props.variant === 'dark' ? 0.3 : 0.35
  stars.value = Array.from({ length: count }, () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: props.variant === 'dark' ? Math.random() * 2 + 1 : Math.random() * 1.8 + 0.4,
    delay: Math.random() * 5,
    opacity: opacityBase + Math.random() * (1 - opacityBase),
    // 仅 2–3% 亮星带微弱十字光
    bright: Math.random() < 0.025,
  }))
}

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  generateStars()
})

watch(() => props.variant, generateStars)
</script>

<style scoped>
.starry-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.starry-root.dark {
  background: linear-gradient(180deg, #060608 0%, #0d0d12 60%, #060608 100%);
}

.starry-root.subtle {
  background:
    radial-gradient(ellipse 100% 60% at 50% -10%, rgba(59,130,246, 0.12), transparent 55%),
    radial-gradient(ellipse 80% 50% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 50%),
    linear-gradient(180deg, #eff6ff 0%, #f0f6ff 38%, #f8fafc 100%);
}

.aurora {
  position: absolute;
  inset: -20% -10% auto;
  height: 55%;
  filter: blur(2px);
  opacity: 0.85;
  pointer-events: none;
}

.dark .aurora {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(99, 179, 255, 0.35), transparent 60%),
    radial-gradient(ellipse at 30% 20%, rgba(168, 120, 255, 0.22), transparent 55%);
}

.subtle .aurora {
  height: 40%;
  opacity: 0.55;
  background: radial-gradient(ellipse at 40% 0%, rgba(96,165,250, 0.18), transparent 65%);
}

.glow {
  position: absolute;
  inset: auto 10% -25%;
  height: 45%;
  pointer-events: none;
}

.dark .glow {
  background: radial-gradient(ellipse at 50% 100%, rgba(40, 120, 255, 0.18), transparent 65%);
}

.subtle .glow {
  height: 30%;
  background: radial-gradient(ellipse at 50% 100%, rgba(59,130,246, 0.06), transparent 70%);
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #e8e6e0;
  animation: twinkle 4s ease-in-out infinite;
}

/* 2–3% 亮星：微弱十字光 */
.star-bright::before,
.star-bright::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  background: rgba(232, 230, 224, 0.35);
  transform: translate(-50%, -50%);
}

.star-bright::before {
  width: 9px;
  height: 1px;
}

.star-bright::after {
  width: 1px;
  height: 9px;
}

.subtle .star {
  background: #3b82f6;
  box-shadow: 0 0 4px rgba(59,130,246, 0.35);
}

.star-static {
  animation: none !important;
}

@keyframes twinkle {
  0%,
  100% {
    transform: scale(1);
    opacity: var(--o, 0.8);
  }
  50% {
    transform: scale(0.85);
    opacity: 0.2;
  }
}

.meteor {
  position: absolute;
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.85));
  opacity: 0;
  transform: rotate(-32deg);
  filter: blur(0.3px);
  animation: meteor 9s ease-in-out infinite;
}

.meteor-a {
  top: 12%;
  left: 55%;
  animation-delay: 1s;
}

.meteor-b {
  top: 28%;
  left: 20%;
  animation-delay: 5.5s;
}

@keyframes meteor {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotate(-32deg);
  }
  8% {
    opacity: 0.9;
  }
  22% {
    opacity: 0;
    transform: translate3d(-220px, 140px, 0) rotate(-32deg);
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .star {
    animation: none;
  }

  .meteor {
    display: none;
  }
}
</style>
