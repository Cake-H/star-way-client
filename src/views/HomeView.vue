<template>
  <div ref="homeRoot" class="home">
    <section class="home-hero">
      <HeroCanvas
      class="hero-particles"
      :visual-el="visualRef"
      :parallax-x="starPx"
      :parallax-y="starPy"
      :reduced-motion="prefersReducedMotion === 'reduce'"
    />

      <div class="hero-grid">
        <div class="hero-copy constellation-reveal">
          <p class="xt-eyebrow hero-eyebrow">星途 · AI 驱动的简历与面试闭环</p>
          <h1 class="xt-hero-title hero-title">让每一次投递，都成为职业星途上的光点</h1>
          <p class="xt-hero-desc hero-desc">
            从 AI 解析简历、结构化管理，到浏览器插件一键填入网申、模拟面试与复盘沉淀，星途把「写简历」和「准备面试」串成一条可进化的星轨。
          </p>

          <div class="hero-actions">
            <StarLaunchButton
              type="primary"
              size="large"
              class="hero-primary-cta"
              @click="goCta"
            >
              <el-icon class="cta-ico"><component :is="primaryCta.icon" /></el-icon>
              {{ isGuest ? '登录，开启星途' : primaryCta.label }}
            </StarLaunchButton>

            <el-button
              type="info"
              link
              size="large"
              class="hero-link"
              @click="go('resume-list')"
            >
              查看简历
            </el-button>
          </div>
        </div>

        <div ref="visualRef" class="hero-visual" :style="visualStyle" aria-hidden="true">
          <div class="logo-wrapper">
            <StarLogo size="lg" :glow="true" class="hero-logo" />
          </div>
        </div>
      </div>
    </section>

    <StarJourneyTimeline :stage="stage" :counts="counts" @open-plugin-guide="pluginGuideVisible = true" />

    <PlanetaryFeatureGrid @open-plugin-guide="pluginGuideVisible = true" />

    <RecentActivityFeed
      :loading="loading"
      :activities="activities"
      :empty-text="isGuest ? '登录后查看你的星轨记录' : '还没有星轨记录'"
      @continue="goItem"
    />

    <PluginGuideDialog v-model="pluginGuideVisible" :resume-count="counts.resumes" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePreferredReducedMotion } from '@vueuse/core'
import StarLogo from '@/components/StarLogo.vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import HeroCanvas from '@/components/home/HeroCanvas.vue'
import StarJourneyTimeline from '@/components/home/StarJourneyTimeline.vue'
import PlanetaryFeatureGrid from '@/components/home/PlanetaryFeatureGrid.vue'
import RecentActivityFeed from '@/components/home/RecentActivityFeed.vue'
import PluginGuideDialog from '@/components/home/PluginGuideDialog.vue'
import { useHomeJourney, type ActivityItem } from '@/composables/useHomeJourney'
import { useStarParallax } from '@/composables/useStarParallax'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

const router = useRouter()
const prefersReducedMotion = usePreferredReducedMotion()
const { loading, stage, counts, activities, primaryCta, isGuest } = useHomeJourney()
const { px, py } = useStarParallax(16)
const { promptLogin } = useLoginPrompt()
const pluginGuideVisible = ref(false)
const visualRef = ref<HTMLDivElement>()

const starPx = computed(() => px.value * 0.5)
const starPy = computed(() => py.value * 0.5)
const visualStyle = computed(() => ({
  transform: `translate3d(${px.value}px, ${py.value}px, 0)`,
}))

onMounted(() => {
  if (prefersReducedMotion.value) return
  gsap.registerPlugin(ScrollTrigger)

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  tl.from('.hero-eyebrow', { y: 16, opacity: 0, duration: 0.5 })
    .from('.hero-title', { y: 24, opacity: 0, duration: 0.6 }, '-=0.3')
    .from('.hero-desc', { y: 16, opacity: 0, duration: 0.5 }, '-=0.35')
    .from('.hero-actions', { y: 16, opacity: 0, duration: 0.5 }, '-=0.3')
    .from('.hero-visual', { scale: 0.85, opacity: 0, duration: 0.8, ease: 'back.out(1.4)' }, '-=0.6')

  gsap.from('.journey-section', {
    scrollTrigger: { trigger: '.journey-section', start: 'top 85%' },
    y: 30,
    opacity: 0,
    duration: 0.7,
  })

  gsap.from('.feature-tile', {
    scrollTrigger: { trigger: '.features-section', start: 'top 85%' },
    y: 24,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
  })

  gsap.from('.activity-row', {
    scrollTrigger: { trigger: '.activity-section', start: 'top 85%' },
    x: -16,
    opacity: 0,
    duration: 0.4,
    stagger: 0.06,
  })
})

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill())
})

function go(routeName: string) {
  if (isGuest.value) {
    promptLogin('/resume')
    return
  }
  router.push({ name: routeName })
}

function goCta() {
  if (isGuest.value) {
    promptLogin('/')
    return
  }
  router.push({
    name: primaryCta.value.routeName,
    params: primaryCta.value.routeParams,
  })
}

function goItem(item: ActivityItem) {
  router.push({
    name: item.routeName,
    params: item.routeParams,
  })
}
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.home-hero {
  position: relative;
  min-height: 520px;
  display: flex;
  align-items: center;
  padding: 56px 50px;
  border-radius: var(--xt-radius-lg);
  background: radial-gradient(
      ellipse 80% 70% at 70% 50%,
      rgba(99, 102, 241, 0.35) 0%,
      transparent 60%
    ),
    linear-gradient(160deg, #0f0a2a 0%, #241e6b 50%, #0f0a2a 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: var(--xt-shadow-md);
  overflow: hidden;
}

.hero-particles {
  position: absolute;
  inset: 0;
}

.hero-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 1.6fr 0.8fr;
  gap: 48px;
  align-items: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-eyebrow {
  color: var(--xt-primary-light);
  margin: 0;
  font-size: 15px;
}

.hero-title {
  margin: 0;
  max-width: 840px;
  color: var(--xt-text-on-dark);
  font-size: clamp(30px, 5vw, 42px);
  white-space: nowrap;
}

.hero-desc {
  margin: 0;
  max-width: 560px;
  color: rgba(245, 243, 255, 0.86);
  font-size: 17px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.hero-primary-cta {
  background: #fff !important;
  color: var(--xt-primary-dark) !important;
  border-color: #fff !important;
  font-weight: 600;
  font-size: 16px;
}

.hero-primary-cta:hover {
  background: #eef2ff !important;
  color: #4338ca !important;
}

.hero-quick-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.22) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}

.hero-quick-btn:hover {
  background: rgba(255, 255, 255, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.32) !important;
  color: #fff !important;
}

.hero-link {
  color: rgba(255, 255, 255, 0.8) !important;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-weight: 500;
  font-size: 16px;
}

.hero-link:hover {
  color: #fff !important;
}

.cta-ico {
  margin-right: 6px;
  vertical-align: middle;
}

.hero-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 280px;
  will-change: transform;
}

.logo-wrapper {
  position: relative;
  z-index: 2;
  transform: scale(1.6);
}

.hero-logo {
  animation: logo-float 6s ease-in-out infinite;
}

@keyframes logo-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(3deg); }
}

.constellation-reveal > * {
  opacity: 0;
  transform: translateY(8px);
  animation: fade-in-up 0.6s ease forwards;
}

.constellation-reveal > *:nth-child(1) { animation-delay: 0ms; }
.constellation-reveal > *:nth-child(2) { animation-delay: 100ms; }
.constellation-reveal > *:nth-child(3) { animation-delay: 200ms; }
.constellation-reveal > *:nth-child(4) { animation-delay: 300ms; }

@keyframes fade-in-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .home-hero {
    padding: 40px 24px;
    min-height: auto;
  }

  .hero-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .hero-visual {
    order: -1;
    min-height: 200px;
  }

  .logo-wrapper {
    transform: scale(1.25);
  }
}

@media (prefers-reduced-motion: reduce) {
  .constellation-reveal > *,
  .hero-logo {
    animation: none;
  }

  .constellation-reveal > * {
    opacity: 1;
    transform: none;
  }

  .hero-logo {
    transform: none;
  }
}
</style>
