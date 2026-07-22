<template>
  <div class="starry-root" :class="variant" aria-hidden="true">
    <div class="aurora" />
    <div class="glow" />
    <div
      v-for="(s, i) in stars"
      :key="i"
      class="star"
      :class="{ 'star-static': reducedMotion }"
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
import { computed, onMounted, ref } from 'vue'

type Star = { top: string; left: string; size: number; delay: number; opacity: number }

const props = withDefaults(
  defineProps<{
    /** dark：登录全屏深空；subtle：主应用浅色星空 */
    variant?: 'dark' | 'subtle'
  }>(),
  { variant: 'dark' },
)

const stars = ref<Star[]>([])
const reducedMotion = ref(false)

const showMeteors = computed(() => props.variant === 'dark' && !reducedMotion.value)

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const count = props.variant === 'dark' ? 160 : 72
  const opacityBase = props.variant === 'dark' ? 0.25 : 0.35
  stars.value = Array.from({ length: count }, () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: props.variant === 'dark' ? Math.random() * 2.2 + 0.6 : Math.random() * 1.8 + 0.4,
    delay: Math.random() * 5,
    opacity: opacityBase + Math.random() * (props.variant === 'dark' ? 0.75 : 0.45),
  }))
})
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
  background: radial-gradient(ellipse 120% 80% at 50% 0%, #1e3a8a 0%, #0b1028 45%, #050814 100%);
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
  background: #fff;
  box-shadow: 0 0 6px rgba(200, 230, 255, 0.9);
  animation: twinkle 4s ease-in-out infinite;
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
