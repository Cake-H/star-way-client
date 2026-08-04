<template>
  <div class="hero-stats" role="list">
    <div v-for="s in stats" :key="s.label" class="stat" role="listitem">
      <span class="stat-value">
        <span class="stat-num">{{ s.display }}</span>
        <span v-if="s.suffix" class="stat-suffix">{{ s.suffix }}</span>
      </span>
      <span class="stat-label">{{ s.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCountUp } from '@/composables/useCountUp'

/**
 * Hero 底部平台级核心数据（count-up）。
 * 每日免费星能为产品固定配置。
 * TODO: 「已助力旅人」为占位数据，待后端提供平台级统计接口后替换，禁止编造营销数字。
 */
const PLATFORM_TRAVELERS_PLACEHOLDER = 12000

const travelerCount = ref(PLATFORM_TRAVELERS_PLACEHOLDER)
const dailyFreeQuota = ref(10)

const travelersUp = useCountUp(travelerCount)
const quotaUp = useCountUp(dailyFreeQuota)

const stats = [
  { label: '位旅人抵达新星', suffix: '+', display: travelersUp.display },
  { label: '每日免费星能', suffix: '点', display: quotaUp.display },
]
</script>

<style scoped>
.hero-stats {
  display: flex;
  gap: 48px;
  padding-top: 22px;
  margin-top: 6px;
  border-top: 1px solid rgba(232, 230, 224, 0.12);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-family: var(--xt-font-display);
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: #e8a33d;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.stat-suffix {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

.stat-label {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

@media (max-width: 768px) {
  .hero-stats {
    gap: 20px;
    justify-content: space-between;
  }

  .stat-num {
    font-size: 24px;
  }

  .stat-label {
    font-size: 12px;
  }
}
</style>
