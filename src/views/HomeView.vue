<template>
  <div class="home">
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
          <p class="hero-eyebrow">星途 · 从简历到 Offer，每一步都有帮手</p>
          <h1 class="hero-title"><span class="hero-title-phrase">穿越星海，</span><wbr /><span class="hero-title-phrase">抵达你的新星</span></h1>
          <p class="hero-desc">
            从简历解析、网申投递，到模拟面试与面试复盘，星途把求职的每一步连成一条可进化的星轨。
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
              size="large"
              class="hero-secondary-cta"
              @click="go('apply-site-list')"
            >
              探索星港
            </el-button>
          </div>

          <HeroStats class="hero-stats-block" />
        </div>

        <div
          ref="visualRef"
          class="hero-visual"
          :style="visualStyle"
          aria-hidden="true"
          @click="onPlanetClick"
          @pointermove="onVisualPointerMove"
          @pointerleave="onVisualPointerLeave"
        >
          <HeroPlanet />
        </div>
      </div>
    </section>

    <FeatureBentoGrid />

    <StarJourneyTimeline :stage="journeyStage" :counts="counts" />

    <StarMapDashboard
      :is-guest="isGuest"
      :loading="loading"
      :quota="quota"
      :transactions="transactions"
      :mock-stats="mockStats"
      :counts="counts"
      :daily-grant-claimed="dailyGrantClaimed"
    />

    <RecentActivityFeed
      :loading="loading"
      :activities="activities"
      :empty-text="isGuest ? '登录后查看你的星轨记录' : '还没有星轨记录'"
    />

    <HomeFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { usePreferredReducedMotion } from '@vueuse/core'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import HeroCanvas from '@/components/home/HeroCanvas.vue'
import HeroPlanet from '@/components/home/HeroPlanet.vue'
import HeroStats from '@/components/home/HeroStats.vue'
import FeatureBentoGrid from '@/components/home/FeatureBentoGrid.vue'
import StarJourneyTimeline from '@/components/home/StarJourneyTimeline.vue'
import StarMapDashboard from '@/components/home/StarMapDashboard.vue'
import RecentActivityFeed from '@/components/home/RecentActivityFeed.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import { useHomeJourney } from '@/composables/useHomeJourney'
import { useStarParallax } from '@/composables/useStarParallax'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import { toggleDawn } from '@/theme/useDawnTransition'

/** 破晓：点击星球切换日/夜（完整 2.4s 仪式动画） */
function onPlanetClick() {
  toggleDawn('planet')
}

/** v9.7：悬停邀请收窄到球体圆盘内（圆盘 = 容器中心 60% 直径区域），
 *  仅指针落在球盘上才点亮背光/手型光标；容器四角不再触发 */
function onVisualPointerMove(e: PointerEvent) {
  const el = visualRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const dx = e.clientX - (r.left + r.width / 2)
  const dy = e.clientY - (r.top + r.height / 2)
  el.classList.toggle('planet-hover', Math.hypot(dx, dy) <= r.width * 0.3)
}

function onVisualPointerLeave() {
  visualRef.value?.classList.remove('planet-hover')
}

const router = useRouter()
const prefersReducedMotion = usePreferredReducedMotion()
const {
  loading,
  journeyStage,
  counts,
  mockStats,
  quota,
  transactions,
  dailyGrantClaimed,
  activities,
  primaryCta,
  isGuest,
} = useHomeJourney()
const { px, py } = useStarParallax(16)
const { promptLogin } = useLoginPrompt()
const visualRef = ref<HTMLDivElement>()

const starPx = computed(() => px.value * 0.5)
const starPy = computed(() => py.value * 0.5)
const visualStyle = computed(() => ({
  transform: `translate3d(${px.value}px, ${py.value}px, 0)`,
}))

onMounted(() => {
  if (prefersReducedMotion.value) return
  gsap.registerPlugin(ScrollTrigger, CustomEase)
  // 规范缓动：cubic-bezier(0.16, 1, 0.3, 1)
  CustomEase.create('xtOut', '0.16, 1, 0.3, 1')

  // 入场动画：眉题 → H1 → 副标题 → CTA → 统计，translateY(24px) + opacity，stagger 0.08s
  gsap.from('.hero-copy > *', {
    y: 24,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: 'xtOut',
  })
  gsap.from('.hero-visual', {
    scale: 0.9,
    opacity: 0,
    duration: 0.5,
    ease: 'xtOut',
    delay: 0.3,
  })

  // 滚动区块：进入视口触发（相当于 whileInView）
  const scrollIn = (target: string, stagger = 0) => {
    gsap.from(target, {
      scrollTrigger: { trigger: target, start: 'top 85%' },
      y: 24,
      opacity: 0,
      duration: 0.5,
      stagger,
      ease: 'xtOut',
    })
  }
  scrollIn('.features-section .section-header')
  scrollIn('.bento-card', 0.08)
  scrollIn('.journey-section')
  scrollIn('.dashboard-section')
  scrollIn('.activity-row', 0.08)
  scrollIn('.home-footer')
})

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill())
})

function go(routeName: string) {
  if (isGuest.value) {
    promptLogin('/')
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
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 56px;
}

/* —— Hero：首屏全屏感 —— */
.home-hero {
  position: relative;
  min-height: min(78vh, 720px);
  display: flex;
  align-items: center;
  padding: 64px 56px;
  border-radius: var(--xt-radius-lg);
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
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;
  align-items: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-eyebrow {
  margin: 0;
  font-size: 14px;
  color: var(--xt-text-on-dark-muted);
}

.hero-title {
  margin: 0;
  max-width: 840px;
  font-family: var(--xt-font-title);
  font-size: clamp(34px, 5.2vw, 56px);
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -0.03em;
  color: var(--xt-text-on-dark);
}

.hero-title-phrase {
  display: inline-block;
  white-space: nowrap;
}

/* 首页内局部调整，不改变模块结构、星球定位及网申列表区域。 */
.home :deep(.journey-section .future:not(:hover):not(:focus-visible) .jnode-label),
.home :deep(.journey-section .future .jnode-desc) {
  opacity: 1;
  color: var(--xt-text-on-dark-muted);
}

.home :deep(.journey-section .future:not(:hover):not(:focus-visible) .jnode-dot) {
  opacity: 1;
  color: var(--xt-text-on-dark-muted);
}

.home :deep(.guest-panel),
.home :deep(.activity-empty) {
  padding: 28px 24px;
}

.home :deep(.guest-icon),
.home :deep(.empty-icon) {
  width: 48px;
  height: 48px;
}

.home :deep(.guest-text),
.home :deep(.empty-text) {
  line-height: 1.8;
  text-wrap: pretty;
}

.hero-desc {
  margin: 0;
  max-width: 560px;
  color: var(--xt-text-on-dark-muted);
  font-size: 16px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

/* 主 CTA：琥珀实底 + 深色文字，无外发光 */
.hero-primary-cta {
  background: #e8a33d !important;
  color: #0d0d12 !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 700;
  font-size: 16px;
  box-shadow: none;
}

.hero-primary-cta:hover {
  background: #f0bc66 !important;
}

.hero-secondary-cta {
  background: transparent !important;
  border: 1px solid rgba(232, 230, 224, 0.2) !important;
  border-radius: 8px !important;
  color: var(--xt-text-on-dark) !important;
  font-weight: 600;
  font-size: 16px;
}

.hero-secondary-cta:hover {
  border-color: rgba(232, 230, 224, 0.4) !important;
  background: rgba(232, 230, 224, 0.05) !important;
}

.hero-stats-block {
  margin-top: 18px;
}

.cta-ico {
  margin-right: 6px;
  vertical-align: middle;
}

.hero-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 340px;
  will-change: transform;
}

/* —— 移动端：星球背景化 + 文案下半屏叠加，首屏完整露出 CTA —— */
@media (max-width: 768px) {
  .home {
    gap: 40px;
  }

  .home-hero {
    /* 真机版式：不再强行撑满一屏；高度随内容走，底部不再留一大块黑 */
    min-height: 0;
    padding: 18px 18px 22px;
    align-items: stretch;
  }

  .hero-grid {
    position: relative;
    z-index: 70; /* 高于 GL 星球层（z60）与脉冲层（z65），低于导航（z100） */
    display: block;
    flex: 1;
    min-height: 0;
    /* 容器本身不拦截点击，星球仍可点；按钮在 .hero-actions 单独恢复 */
    pointer-events: none;
  }

  /* 文案底板不是卡片：从星球背景自然过渡到底部，保证文字可读 */
  .hero-grid::before {
    content: '';
    position: absolute;
    left: -18px;
    right: -18px;
    bottom: -22px;
    height: 64%;
    background: linear-gradient(
      to bottom,
      rgba(6, 6, 8, 0) 0%,
      rgba(6, 6, 8, 0.48) 42%,
      rgba(6, 6, 8, 0.84) 100%
    );
    pointer-events: none;
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    min-height: 0;
    /* 与星球直径同用 vw 标尺：同宽设备上标题相对星球的位置一致，不再随浏览器高矮漂移 */
    justify-content: flex-start;
    padding-top: clamp(86px, 27vw, 150px);
    gap: 10px;
    /* 文案层不拦截星球点击；按钮单独恢复可点 */
    pointer-events: none;
  }

  .hero-eyebrow {
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  .hero-title {
    font-size: clamp(28px, 8.4vw, 36px);
    line-height: 1.12;
    max-width: 10em;
  }

  .hero-desc {
    font-size: 13px;
    line-height: 1.55;
    max-width: 31em;
    /* 移动端只保留两行导语，避免把星球主体与 CTA 一起挤出首屏 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .hero-visual {
    position: absolute;
    /* 星球随宽度定位：轻负 top 收敛画布透明上空，但不裁掉轨道 */
    top: clamp(-30px, -5vw, -10px);
    left: 50%;
    translate: -50% 0;
    width: min(112vw, 430px);
    aspect-ratio: 1;
    min-height: 0;
    opacity: 1;
    /* pointer-events 会继承：父层穿透后，星球容器必须显式恢复可点 */
    pointer-events: auto;
  }

  /* CTA 一行双键：主键占较大份，次键收短；与导语间距同样用 vw 标尺，跨高度设备一致 */
  .hero-actions {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    gap: 10px;
    margin-top: clamp(18px, 6vw, 30px);
    pointer-events: auto;
  }

  .hero-primary-cta,
  .hero-secondary-cta {
    width: auto;
    min-width: 0;
    min-height: 46px;
    padding: 0 12px;
    border-radius: 10px !important;
    font-size: 14px;
    white-space: nowrap;
  }

  .hero-stats-block {
    margin-top: clamp(18px, 7vw, 34px);
  }

  .hero-stats-block :deep(.hero-stats) {
    gap: 28px;
    justify-content: flex-start;
    padding-top: 14px;
  }
}

/* 超窄屏（≤360px）：仍保持一行双键，但进一步压缩内边距与字号，避免换行/溢出 */
@media (max-width: 360px) {
  .home-hero .hero-actions {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.95fr);
    gap: 8px;
  }

  .home-hero .hero-primary-cta,
  .home-hero .hero-secondary-cta {
    min-height: 44px;
    padding: 0 8px;
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-primary-cta {
    animation: none;
  }
}
</style>
