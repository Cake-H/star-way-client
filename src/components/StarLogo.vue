<template>
  <svg
    class="star-logo"
    :class="[`size-${size}`, { 'with-glow': glow }]"
    :width="dim"
    :height="dim"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="star-grad" x1="12" y1="4" x2="36" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#F0F4FF" />
        <stop offset="0.35" stop-color="#A5B4FC" />
        <stop offset="0.7" stop-color="#6366F1" />
        <stop offset="1" stop-color="#312E81" />
      </linearGradient>
      <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(165,180,252,0.6)" />
        <stop offset="0.55" stop-color="rgba(99,102,241,0.2)" />
        <stop offset="1" stop-color="rgba(99,102,241,0)" />
      </linearGradient>
    </defs>

    <!-- 单道轨道弧线 -->
    <path
      d="M7 30 Q16 42, 34 38"
      stroke="url(#arc-grad)"
      stroke-width="1.4"
      stroke-linecap="round"
      fill="none"
    />

    <!-- 主星：修长四芒，底部延伸为流星尾 -->
    <path
      d="M24 5 C25.5 15, 33 22.5, 41 24 C33 25.5, 26 31, 24 43 C22 31, 15 25.5, 7 24 C15 22.5, 22.5 15, 24 5 Z"
      fill="url(#star-grad)"
      stroke="rgba(255,255,255,0.45)"
      stroke-width="0.7"
      stroke-linejoin="round"
    />

    <!-- 细腻高光 -->
    <path
      d="M20 14 Q22 12, 24 12"
      stroke="rgba(255,255,255,0.6)"
      stroke-width="1.5"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    glow?: boolean
  }>(),
  { size: 'md', glow: true },
)

const dim = computed(() => ({ sm: 32, md: 40, lg: 48 }[props.size]))
</script>

<style scoped>
.star-logo {
  display: block;
  flex-shrink: 0;
}

.star-logo.with-glow {
  filter: drop-shadow(0 0 14px rgba(99, 102, 241, 0.55));
}

@media (prefers-reduced-motion: reduce) {
  .star-logo {
    filter: none;
  }
}
</style>
