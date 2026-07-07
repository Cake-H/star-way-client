<template>
  <section class="features-section">
    <div class="section-header">
      <h2 class="section-title">能力星球</h2>
      <p class="section-subtitle">探索你的星途工具</p>
    </div>

    <el-row :gutter="20" class="feature-grid">
      <el-col
        v-for="(item, i) in items"
        :key="item.key"
        :xs="24"
        :sm="12"
        :md="8"
        :xl="4"
        :style="{ animationDelay: `${i * 0.1}s` }"
      >
        <OrbitalCard
          class="feature-tile"
          :class="[item.planetClass, { featured: item.featured }]"
          clickable
          shadow="hover"
          @click="go(item.routeName)"
        >
          <div class="tile-visual">
            <div class="planet-ring" />
            <div class="planet">
              <div class="planet-glow" />
              <div class="planet-atmosphere" />
              <div class="planet-surface" />
              <el-icon class="planet-icon" :size="26"><component :is="item.icon" /></el-icon>
            </div>
          </div>
          <div class="tile-text">
            <h3 class="tile-title">{{ item.title }}</h3>
            <p class="tile-desc">{{ item.desc }}</p>
          </div>
        </OrbitalCard>
      </el-col>
    </el-row>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { featureItems } from '@/composables/useHomeJourney'
import OrbitalCard from '@/components/OrbitalCard.vue'

const emit = defineEmits<{
  (e: 'open-plugin-guide'): void
}>()

const router = useRouter()
const items = featureItems

function go(routeName: string) {
  if (routeName === 'plugin-guide') {
    emit('open-plugin-guide')
    return
  }
  router.push({ name: routeName })
}
</script>

<style scoped>
.features-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  text-align: center;
}

.section-title {
  margin: 0 0 6px;
  font-size: 32px;
  font-weight: 700;
  color: var(--xt-text);
  letter-spacing: -0.02em;
}

.section-subtitle {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--xt-text-secondary);
}

.feature-grid {
  margin: 0 !important;
  row-gap: 24px;
}

.feature-tile {
  height: 100%;
  min-height: 220px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  background: var(--xt-surface-solid);
}

.feature-tile :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 28px 20px;
  gap: 16px;
  text-align: center;
}

.feature-tile:hover {
  transform: translateY(-4px);
  box-shadow: var(--xt-shadow-md);
}

.tile-visual {
  position: relative;
  width: 110px;
  height: 110px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.planet {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  position: relative;
  z-index: 2;
  box-shadow:
    inset -10px -10px 22px rgba(0, 0, 0, 0.22),
    inset 6px 6px 16px rgba(255, 255, 255, 0.18),
    0 10px 28px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.planet-icon {
  position: relative;
  z-index: 4;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.planet-glow {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  opacity: 0.45;
  filter: blur(16px);
  z-index: 0;
}

.planet-atmosphere {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  z-index: 3;
  pointer-events: none;
}

.planet-surface {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  z-index: 1;
  opacity: 0.35;
  background:
    radial-gradient(circle at 25% 35%, rgba(255, 255, 255, 0.25) 0%, transparent 15%),
    radial-gradient(circle at 65% 25%, rgba(255, 255, 255, 0.18) 0%, transparent 12%),
    radial-gradient(circle at 45% 70%, rgba(255, 255, 255, 0.15) 0%, transparent 18%),
    radial-gradient(circle at 75% 65%, rgba(0, 0, 0, 0.08) 0%, transparent 20%);
}

.planet-ring {
  position: absolute;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  transform: rotateX(70deg) rotateY(-15deg) rotateZ(25deg);
  z-index: 1;
  opacity: 0.7;
  transition: transform 0.4s ease;
  pointer-events: none;
}

.feature-tile:hover .planet-ring {
  transform: rotateX(70deg) rotateY(-15deg) rotateZ(45deg);
}

.tile-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tile-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--xt-text);
}

.tile-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--xt-text-secondary);
}

/* 星球配色：潮流靛紫 / 赛博青 / 珊瑚粉 / 亮金 / 高级灰 */
.planet-indigo .planet {
  background: radial-gradient(circle at 30% 30%, #818cf8, #4f46e5 45%, #312e81);
}
.planet-indigo .planet-glow {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.45), transparent 70%);
}
.planet-indigo .planet-ring {
  border-color: rgba(129, 140, 248, 0.55);
}

.planet-violet .planet {
  background: radial-gradient(circle at 30% 30%, #22d3ee, #0891b2 45%, #164e63);
}
.planet-violet .planet-glow {
  background: radial-gradient(circle, rgba(34, 211, 238, 0.45), transparent 70%);
}
.planet-violet .planet-ring {
  border-color: rgba(34, 211, 238, 0.55);
}

.planet-amber .planet {
  background: radial-gradient(circle at 30% 30%, #fb7185, #e11d48 45%, #881337);
}
.planet-amber .planet-glow {
  background: radial-gradient(circle, rgba(251, 113, 133, 0.45), transparent 70%);
}
.planet-amber .planet-ring {
  border-color: rgba(251, 113, 133, 0.55);
}

.planet-sun .planet {
  background: radial-gradient(circle at 30% 30%, #fde047, #facc15 45%, #a16207);
}
.planet-sun .planet-glow {
  background: radial-gradient(circle, rgba(250, 204, 21, 0.5), transparent 70%);
}
.planet-sun .planet-ring {
  border-color: rgba(251, 191, 36, 0.55);
}

.planet-silver .planet {
  background: radial-gradient(circle at 30% 30%, #f1f5f9, #94a3b8 45%, #64748b);
}
.planet-silver .planet-glow {
  background: radial-gradient(circle, rgba(100, 116, 139, 0.4), transparent 70%);
}
.planet-silver .planet-ring {
  border-color: rgba(148, 163, 184, 0.55);
}

.planet-emerald .planet {
  background: radial-gradient(circle at 30% 30%, #34d399, #059669 45%, #064e3b);
}
.planet-emerald .planet-glow {
  background: radial-gradient(circle, rgba(52, 211, 153, 0.45), transparent 70%);
}
.planet-emerald .planet-ring {
  border-color: rgba(52, 211, 153, 0.55);
}

.featured .tile-visual {
  transform: scale(1.08);
}

@media (prefers-reduced-motion: reduce) {
  .feature-tile {
    animation: none;
  }

  .planet-ring {
    transition: none;
  }
}
</style>
