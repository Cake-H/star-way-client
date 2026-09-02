<template>
  <img
    class="star-logo"
    :class="[`size-${size}`, { 'with-glow': glow }]"
    :width="dim"
    :height="dim"
    src="/logo.png"
    alt="星途·智能求职助手"
  />
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
  object-fit: contain;
}

.star-logo.with-glow {
  filter: none;
}
</style>
