<template>
  <div class="resume-page-layout">
    <ResumeSectionNav v-if="showNav" />
    <div class="resume-page-main" :class="{ 'is-full-width': fullWidth }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { provideResumeSectionNav } from '@/composables/useResumeSectionNav'
import ResumeSectionNav from './ResumeSectionNav.vue'

withDefaults(
  defineProps<{
    fullWidth?: boolean
    showNav?: boolean
  }>(),
  { fullWidth: false, showNav: true },
)

provideResumeSectionNav()
</script>

<style scoped>
.resume-page-layout {
  display: flex;
  align-items: flex-start;
}

.resume-page-main {
  flex: 1;
  min-width: 0;
  margin-left: 188px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.resume-page-main.is-full-width {
  margin-left: 0;
}

@media (max-width: 991px) {
  .resume-page-layout {
    flex-direction: column;
  }

  .resume-page-main {
    margin-left: 0;
    width: 100%;
  }
}
</style>
