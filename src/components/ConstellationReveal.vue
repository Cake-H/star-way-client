<template>
  <div class="constellation-reveal" :class="{ 'xt-constellation-reveal': revealed }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ConstellationReveal' })

defineProps<{
  revealed: boolean
}>()
</script>

<style scoped>
.constellation-reveal {
  display: contents;
}
</style>
