<template>
  <div class="home-starfield" :style="parallaxStyle">
    <vue-particles
      id="home-stars"
      class="starfield-canvas"
      :options="options"
      @particles-loaded="onLoaded"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ISourceOptions } from '@tsparticles/engine'
import { usePreferredReducedMotion, useWindowSize } from '@vueuse/core'

const props = defineProps<{
  parallaxX?: number
  parallaxY?: number
}>()

const { width } = useWindowSize()
const prefersReducedMotion = usePreferredReducedMotion()

const isMobile = computed(() => width.value < 768)

const parallaxStyle = computed(() => ({
  transform: `translate3d(${props.parallaxX ?? 0}px, ${props.parallaxY ?? 0}px, 0)`,
}))

const options = computed<ISourceOptions>(() => ({
  preset: 'stars',
  fullScreen: { enable: false, zIndex: 0 },
  detectRetina: true,
  background: {
    color: 'transparent',
  },
  particles: {
    number: {
      value: isMobile.value ? 35 : 70,
      density: { enable: true, width: 1920, height: 1080 },
    },
    color: { value: ['#ffffff', '#c7d2fe', '#a5b4fc'] },
    shape: { type: 'circle' },
    opacity: {
      value: { min: 0.08, max: 0.5 },
      animation: prefersReducedMotion.value
        ? undefined
        : { enable: true, speed: 0.2, sync: false },
    },
    size: {
      value: { min: 0.5, max: 2 },
    },
    move: {
      enable: true,
      speed: prefersReducedMotion.value ? 0 : 0.04,
      direction: 'none',
      random: true,
      straight: false,
      outModes: { default: 'out' },
    },
    links: {
      enable: false,
    },
  },
  interactivity: {
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
    },
  },
}))

function onLoaded() {
  // 粒子加载完成，可用于后续调试或事件
}
</script>

<style scoped>
.home-starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  will-change: transform;
}

.starfield-canvas {
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .home-starfield {
    transform: none !important;
  }
}
</style>
