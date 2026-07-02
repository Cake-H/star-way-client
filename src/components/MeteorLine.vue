<template>
  <div class="meteor-line" :class="{ active }" aria-hidden="true">
    <div class="meteor-body" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'MeteorLine' })

defineProps<{
  active?: boolean
}>()
</script>

<style scoped>
.meteor-line {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 2px;
  border-radius: 2px;
  background: var(--xt-orbit-path);
}

.meteor-body {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 55%;
  background: linear-gradient(90deg, transparent, var(--xt-launch-trail), var(--xt-accent));
  transform: translateX(-120%);
}

.meteor-line.active .meteor-body {
  animation: meteor-streak 0.85s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .meteor-body {
    transform: translateX(0);
    width: 100%;
    opacity: 0.6;
    animation: none;
  }
}
</style>
