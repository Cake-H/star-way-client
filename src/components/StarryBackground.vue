<template>
  <div class="starry-root" aria-hidden="true">
    <div class="aurora" />
    <div class="glow" />
    <div
      v-for="(s, i) in stars"
      :key="i"
      class="star"
      :style="{
        top: s.top,
        left: s.left,
        width: `${s.size}px`,
        height: `${s.size}px`,
        opacity: s.opacity,
        animationDelay: `${s.delay}s`,
      }"
    />
    <div class="meteor meteor-a" />
    <div class="meteor meteor-b" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Star = { top: string; left: string; size: number; delay: number; opacity: number }

const stars = ref<Star[]>([])

onMounted(() => {
  stars.value = Array.from({ length: 160 }, () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2.2 + 0.6,
    delay: Math.random() * 5,
    opacity: 0.25 + Math.random() * 0.75,
  }))
})
</script>

<style scoped>
.starry-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(ellipse 120% 80% at 50% 0%, #1b2a6a 0%, #0b1028 45%, #050814 100%);
}

.aurora {
  position: absolute;
  inset: -20% -10% auto;
  height: 55%;
  background: radial-gradient(ellipse at 50% 0%, rgba(99, 179, 255, 0.35), transparent 60%),
    radial-gradient(ellipse at 30% 20%, rgba(168, 120, 255, 0.22), transparent 55%);
  filter: blur(2px);
  opacity: 0.85;
  pointer-events: none;
}

.glow {
  position: absolute;
  inset: auto 10% -25%;
  height: 45%;
  background: radial-gradient(ellipse at 50% 100%, rgba(40, 120, 255, 0.18), transparent 65%);
  pointer-events: none;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px rgba(200, 230, 255, 0.9);
  animation: twinkle 4s ease-in-out infinite;
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
</style>
