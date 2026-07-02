<template>
  <el-button
    class="star-launch-btn xt-launch-btn"
    :class="{ 'no-glow': !glow }"
    v-bind="$attrs"
  >
    <slot />
  </el-button>
</template>

<script setup lang="ts">
defineOptions({
  name: 'StarLaunchButton',
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    glow?: boolean
  }>(),
  {
    glow: true,
  }
)
</script>

<style scoped>
.star-launch-btn {
  font-weight: 600;
}

.star-launch-btn.no-glow:not(:active) {
  box-shadow: none;
}
</style>
