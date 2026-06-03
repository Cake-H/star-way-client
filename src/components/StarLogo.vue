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
      <linearGradient id="xt-star-grad" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stop-color="#818CF8" />
        <stop offset="0.5" stop-color="#6366F1" />
        <stop offset="1" stop-color="#4338CA" />
      </linearGradient>
      <linearGradient id="xt-trail-grad" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="rgba(251,191,36,0)" />
        <stop offset="0.4" stop-color="rgba(251,191,36,0.85)" />
        <stop offset="1" stop-color="rgba(255,255,255,0.95)" />
      </linearGradient>
    </defs>
    <!-- 流星尾迹 -->
    <path
      class="meteor-trail"
      d="M6 14 C14 16, 22 18, 34 22"
      stroke="url(#xt-trail-grad)"
      stroke-width="1.5"
      stroke-linecap="round"
      fill="none"
      opacity="0.75"
    />
    <!-- 星座连线 -->
    <path
      d="M12 32 L20 24 L28 28 L36 18"
      stroke="rgba(129,140,248,0.45)"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <!-- 小星点 -->
    <circle cx="12" cy="32" r="1.5" fill="#A5B4FC" />
    <circle cx="20" cy="24" r="1.2" fill="#C7D2FE" />
    <circle cx="28" cy="28" r="1.4" fill="#A5B4FC" />
    <!-- 主星 -->
    <path
      d="M24 6 L26.8 16.2 L37 16.2 L28.6 22.4 L31.4 32.6 L24 26.4 L16.6 32.6 L19.4 22.4 L11 16.2 L21.2 16.2 Z"
      fill="url(#xt-star-grad)"
      stroke="rgba(255,255,255,0.35)"
      stroke-width="0.6"
    />
    <circle cx="36" cy="18" r="2" fill="#FBBF24" opacity="0.9" />
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
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.45));
}

.meteor-trail {
  animation: trail-pulse 4s ease-in-out infinite;
}

@keyframes trail-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.85;
  }
}

@media (prefers-reduced-motion: reduce) {
  .meteor-trail {
    animation: none;
    opacity: 0.6;
  }
}
</style>
