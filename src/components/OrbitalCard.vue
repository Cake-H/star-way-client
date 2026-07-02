<template>
  <el-card
    class="orbital-card xt-orbit-ring"
    :class="{ 'glow-accent': glowAccent, clickable: clickable }"
    :shadow="shadow"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
  </el-card>
</template>

<script setup lang="ts">
defineOptions({ name: 'OrbitalCard' })

defineProps<{
  shadow?: string
  glowAccent?: boolean
  clickable?: boolean
}>()
</script>

<style scoped>
.orbital-card {
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.orbital-card.clickable {
  cursor: pointer;
}

.orbital-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--xt-shadow-md);
}

.orbital-card:not(.clickable):hover {
  box-shadow: var(--xt-shadow-md);
}

.orbital-card.glow-accent::before {
  border-color: rgba(251, 113, 133, 0.22);
}

.orbital-card.glow-accent:hover::before {
  border-color: rgba(251, 113, 133, 0.45);
}
</style>
