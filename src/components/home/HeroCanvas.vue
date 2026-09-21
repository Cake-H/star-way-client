<template>
  <canvas ref="canvasRef" class="hero-canvas" v-bind="$attrs" aria-hidden="true"></canvas>
  <!-- 破晓 · 揭示层：亮主题底色，以球心为原点 clip-path 扩散（z50，内容之上导航之下） -->
  <div ref="revealRef" class="dawn-reveal" aria-hidden="true"></div>
  <!-- 破晓 · 破晓环：三层光边界，与揭示层同步扩散，禁止硬边 -->
  <div ref="ringRef" class="dawn-ring" aria-hidden="true"></div>
  <!-- 破晓 · WebGL 星球层：星球本体 + 复刻行星环/环绕光点（z60，保证 t=50% 星球可见） -->
  <div ref="glOverlayRef" class="planet-gl-overlay" aria-hidden="true">
    <div ref="planetBoxRef" class="planet-gl-box">
      <div
        v-for="r in planetRings"
        :key="`gl-ring-back-${r.size}`"
        class="gl-ring gl-ring-back"
        :style="glRingStyle(r)"
      />
      <canvas ref="glCanvasRef" class="planet-gl-canvas"></canvas>
      <div
        v-for="r in planetRings"
        :key="`gl-ring-front-${r.size}`"
        class="gl-ring gl-ring-front"
        :style="glRingStyle(r)"
      />
      <div class="gl-orbit gl-orbit-1"><span class="gl-sat gl-sat-amber" /></div>
      <div class="gl-orbit gl-orbit-2"><span class="gl-sat gl-sat-warm" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// @ts-ignore 原生 WebGL 星球层（无类型声明的 .js 模块）
import { createPlanetGL, installDawnLab } from '@/theme/planetDawnGL'
import { subscribeDawn, setDawnFlipRadiusK } from '@/theme/useDawnTransition'
import type { DawnFrame } from '@/theme/useDawnTransition'

// 模板改为多根节点（新增揭示层/破晓环/WebGL 星球层）后，手动把父级 class 透传到原画布，
// 保证 .hero-particles 定位与改动前逐像素一致
defineOptions({ inheritAttrs: false })

interface Props {
  parallaxX?: number
  parallaxY?: number
  reducedMotion?: boolean
  visualEl?: HTMLDivElement
}

const props = withDefaults(defineProps<Props>(), {
  parallaxX: 0,
  parallaxY: 0,
  reducedMotion: false,
})

const canvasRef = ref<HTMLCanvasElement>()

/* —— 破晓：WebGL 星球层与动效层引用（全部为新增） —— */
const revealRef = ref<HTMLDivElement>()
const ringRef = ref<HTMLDivElement>()
const glOverlayRef = ref<HTMLDivElement>()
const planetBoxRef = ref<HTMLDivElement>()
const glCanvasRef = ref<HTMLCanvasElement>()

interface PlanetGLRenderer {
  resize(sizePx: number, dpr: number): void
  render(time: number, phase: number, bright: number): void
  recompile?(params: Record<string, number>): number
  destroy(): void
}

/** 破晓调参台预览帧（仅 ?dawnlab=1 面板注入；null = 交还时间线驱动） */
let dawnLabFrame: { phase: number; bright: number } | null = null

/** 行星环复刻参数：与原版 HeroPlanet 完全一致（尺寸/透明度/几何） */
const planetRings = [
  { size: 86, alpha: 0.22 },
  { size: 108, alpha: 0.4 },
  { size: 122, alpha: 0.28 },
]

function glRingStyle(r: { size: number; alpha: number }) {
  return {
    width: `${r.size}%`,
    height: `${r.size}%`,
    '--ring-alpha': r.alpha,
  } as Record<string, string | number>
}

/* 破晓帧快照（subscribeDawn 立即回调一次，保证以亮主题加载时首帧即正确） */
let dawn: DawnFrame = {
  phase: 0,
  bright: 1,
  radiusK: 0,
  ringOpacity: 0,
  skyWarm: 0,
  press: 1,
  revealAlpha: 1,
  dustFade: 0,
  active: false,
  theme: 'night',
}
let unsubscribeDawn: (() => void) | null = null
let planetGL: PlanetGLRenderer | null = null
let planetElCache: HTMLElement | null | undefined

/* 冻结状态：触发瞬间的星星时间/球心/最大半径（反转同路径复用，保证严格可逆） */
let frozenTime = 0
let freezeCx = 0
let freezeCy = 0
let maxDist = 1
/* planetBox 尺寸缓存：仅在尺寸变化时写 style（避免每帧触发样式重算） */
let planetBoxW = 0
let planetBoxH = 0
/* 白昼天空暖光域缓存（cx|cy|r 组合键，变化才写 style） */
let lastGlowKey = ''

let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let lastTime = 0

// 画布逻辑尺寸（CSS 像素）
let canvasWidth = 0
let canvasHeight = 0

// 动画时间
let elapsed = 0

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  twinkleSpeed: number
  twinklePhase: number
  color: string
  layer: number
  /* —— 破晓扩展字段（夜间路径完全不读取，保证暗主题逐像素不变） —— */
  /** 白昼微尘（约 5%）：破晓时不被吞没，化为缓浮微尘 */
  dust?: boolean
  /** 归一化死亡半径：破晓环经过即熄灭（含 ±80ms 随机延迟） */
  deathK?: number
  /** 熄灭时长（归一化）：距环心越近灭得越快 */
  fadeK?: number
  /** 微尘漂浮：10~20s 一个来回 */
  driftAmp?: number
  driftPeriod?: number
  driftPhase?: number
  /** 预解析 RGB：微尘向暖金推移时插值用 */
  rgb?: [number, number, number]
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  opacity: number
  life: number
  maxLife: number
}

const stars = ref<Star[]>([])
const shootingStars = ref<ShootingStar[]>([])
let shootingStarTimer = 0
let nextMeteorIn = meteorInterval()

// 掉帧自动降级：0 正常 → 1 粒子减半 → 2 静态星空
let degradeLevel = 0
let starCountScale = 1
let frameCostEma = 16
let slowFrames = 0

/** 流星间隔：PC 8–15s，移动端再降频约一倍 */
function meteorInterval() {
  const mobileFactor = canvasWidth < 768 ? 1.8 : 1
  return (480 + Math.random() * 420) * mobileFactor
}

const scaleFactor = computed(() => Math.min(1, canvasWidth / 768))

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.parentElement) return

  const rect = canvas.parentElement.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  canvasWidth = rect.width
  canvasHeight = rect.height

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
  }

  initStarfield()
}

function initStarfield() {
  // 移动端粒子数减半；掉帧降级时进一步减半
  const base = canvasWidth < 768 ? 100 : 240
  const count = Math.floor(base * starCountScale)
  const newStars: Star[] = []
  const layers = [
    { count: Math.floor(count * 0.5), speedMin: 0.10, speedMax: 0.25, sizeMin: 0.8, sizeMax: 1.6, opacityMin: 0.15, opacityMax: 0.4 },
    { count: Math.floor(count * 0.35), speedMin: 0.22, speedMax: 0.50, sizeMin: 1, sizeMax: 2, opacityMin: 0.25, opacityMax: 0.6 },
    { count: Math.floor(count * 0.15), speedMin: 0.50, speedMax: 1.0, sizeMin: 1.2, sizeMax: 2.6, opacityMin: 0.35, opacityMax: 0.85 },
  ]
  let layerIndex = 0
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const colorRoll = Math.random()
      const color =
        colorRoll > 0.94 ? '#f0bc66' : colorRoll > 0.86 ? '#fff8ec' : '#e8e6e0'
      newStars.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
        speed: layer.speedMin + Math.random() * (layer.speedMax - layer.speedMin),
        opacity: layer.opacityMin + Math.random() * (layer.opacityMax - layer.opacityMin),
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        color,
        layer: layerIndex,
        // 破晓扩展：约 5% 星点为白昼微尘；rgb 预解析供破晓时颜色插值
        dust: Math.random() < 0.05,
        rgb: [
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16),
        ],
        driftAmp: 3 + Math.random() * 4,
        driftPeriod: 10 + Math.random() * 10,
        driftPhase: Math.random() * Math.PI * 2,
      })
    }
    layerIndex++
  }
  stars.value = newStars
  shootingStars.value = []
  shootingStarTimer = 0
}

function spawnShootingStar() {
  const y = Math.random() * canvasHeight * 0.6
  const speed = 6 + Math.random() * 5
  const angle = -Math.PI / 10 - Math.random() * 0.12
  shootingStars.value.push({
    x: canvasWidth + 50,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: 40 + Math.random() * 40,
    opacity: 0.5 + Math.random() * 0.35,
    life: 1,
    maxLife: 1,
  })
}

function drawBackground() {
  if (!ctx) return

  // 破晓：亮主题天空由 CSS 渐变承担（与揭示层同一渐变，淡出无缝）；夜间路径逐像素不变
  if (dawn.theme === 'dawn') return

  // 中性深空基色（不带蓝色倾向）
  const gradient = ctx.createRadialGradient(
    canvasWidth * 0.7, canvasHeight * 0.4, 0,
    canvasWidth * 0.7, canvasHeight * 0.4, canvasWidth * 0.9,
  )
  gradient.addColorStop(0, '#14141a')
  gradient.addColorStop(0.45, '#0d0d12')
  gradient.addColorStop(1, '#060608')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 微弱暖调纵深（克制，不大面积铺色）
  ctx.globalCompositeOperation = 'screen'
  const nebula1 = ctx.createRadialGradient(
    canvasWidth * 0.72, canvasHeight * 0.42, 0,
    canvasWidth * 0.72, canvasHeight * 0.42, canvasWidth * 0.5,
  )
  nebula1.addColorStop(0, 'rgba(232,163,61,0.05)')
  nebula1.addColorStop(1, 'rgba(232,163,61,0)')
  ctx.fillStyle = nebula1
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const nebula2 = ctx.createRadialGradient(
    canvasWidth * 0.2, canvasHeight * 0.75, 0,
    canvasWidth * 0.2, canvasHeight * 0.75, canvasWidth * 0.35,
  )
  nebula2.addColorStop(0, 'rgba(232,230,224,0.03)')
  nebula2.addColorStop(1, 'rgba(232,230,224,0)')
  ctx.fillStyle = nebula2
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.globalCompositeOperation = 'source-over'
}

function drawStarfield() {
  if (!ctx) return
  // 破晓：触发瞬间星星冻结在最后状态（暂停，不继续闪）；夜间恒为实时时间，逐像素不变
  const time = dawn.active ? frozenTime : Date.now() / 1000
  const parallaxFactors = [0.12, 0.25, 0.45]
  // 破晓相关绘制仅在（过渡中 / 亮主题 / 微尘落定中）启用，否则与原版完全同路径
  const engage = dawn.active || dawn.theme === 'dawn' || dawn.radiusK > 0 || dawn.dustFade > 0

  stars.value.forEach((s) => {
    const factor = parallaxFactors[s.layer] ?? 0.2
    const px = props.parallaxX * factor
    const py = props.parallaxY * factor
    let x = ((s.x + px) % canvasWidth + canvasWidth) % canvasWidth
    let y = ((s.y + py) % canvasHeight + canvasHeight) % canvasHeight

    const twinkle = props.reducedMotion
      ? 1
      : 0.75 + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25
    let alpha = s.opacity * twinkle
    let color = s.color

    if (engage) {
      if (s.dust) {
        // 白昼微尘：约 5% 星点保留，缓慢漂浮（10~20s 一个来回），颜色向暖金推移
        if (dawn.dustFade > 0) {
          alpha *= 1 - 0.6 * dawn.dustFade
          if (!props.reducedMotion && s.driftAmp && s.driftPeriod && s.driftPhase !== undefined) {
            const w = (Math.PI * 2) / s.driftPeriod
            x += Math.sin(time * w + s.driftPhase) * s.driftAmp * dawn.dustFade
            y += Math.cos(time * w * 0.8 + s.driftPhase) * s.driftAmp * 0.6 * dawn.dustFade
          }
          if (s.rgb) {
            const k = dawn.dustFade
            color = `rgb(${Math.round(s.rgb[0] + (232 - s.rgb[0]) * k)},${Math.round(
              s.rgb[1] + (163 - s.rgb[1]) * k,
            )},${Math.round(s.rgb[2] + (61 - s.rgb[2]) * k)})`
          }
        }
      } else if (dawn.radiusK > 0) {
        // 破晓环吞没：环先提亮 1.5×（0.1s）再熄灭（0.3s）；反转经过时重新点亮
        const rel = dawn.radiusK - (s.deathK ?? 0.5)
        const brightBand = 0.07
        if (rel <= -brightBand) {
          // 环未到，保持原样
        } else if (rel <= 0) {
          alpha *= 1 + (0.5 * (rel + brightBand)) / brightBand
        } else if (rel <= (s.fadeK ?? 0.33)) {
          alpha *= 1.5 * (1 - rel / (s.fadeK ?? 0.33))
        } else {
          alpha = 0
        }
      }
      alpha = Math.min(alpha, 1)
      if (alpha <= 0.004) return
    }

    ctx!.globalAlpha = alpha
    ctx!.fillStyle = color
    ctx!.beginPath()
    ctx!.arc(x, y, s.size, 0, Math.PI * 2)
    ctx!.fill()

    if (s.size > 1.6 && alpha > 0.5) {
      const r = parseInt(s.color.slice(1, 3), 16)
      const g = parseInt(s.color.slice(3, 5), 16)
      const b = parseInt(s.color.slice(5, 7), 16)
      const glow = ctx!.createRadialGradient(x, y, 0, x, y, s.size * 3)
      glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.45})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.arc(x, y, s.size * 3, 0, Math.PI * 2)
      ctx!.fill()
    }
  })
  ctx!.globalAlpha = 1
}

function drawShootingStars() {
  if (!ctx || props.reducedMotion) return
  shootingStars.value.forEach((ss) => {
    const alpha = Math.max(0, ss.life * ss.opacity)
    ctx!.globalAlpha = alpha

    ctx!.fillStyle = '#ffffff'
    ctx!.beginPath()
    ctx!.arc(ss.x, ss.y, 1.8, 0, Math.PI * 2)
    ctx!.fill()

    const tailX = ss.x - ss.vx * (ss.length / 14)
    const tailY = ss.y - ss.vy * (ss.length / 14)
    const grad = ctx!.createLinearGradient(ss.x, ss.y, tailX, tailY)
    grad.addColorStop(0, 'rgba(255,248,236,0.9)')
    grad.addColorStop(0.25, 'rgba(240,188,102,0.5)')
    grad.addColorStop(1, 'rgba(240,188,102,0)')
    ctx!.strokeStyle = grad
    ctx!.lineWidth = 2
    ctx!.lineCap = 'round'
    ctx!.beginPath()
    ctx!.moveTo(ss.x, ss.y)
    ctx!.lineTo(tailX, tailY)
    ctx!.stroke()
  })
  ctx!.globalAlpha = 1
}

function drawCentralGlow(cx: number, cy: number) {
  if (!ctx) return
  const pulse = props.reducedMotion ? 1 : 1 + Math.sin(elapsed * 1.5) * 0.08
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160 * scaleFactor.value * pulse)
  glow.addColorStop(0, 'rgba(232,163,61,0.16)')
  glow.addColorStop(0.4, 'rgba(232,163,61,0.06)')
  glow.addColorStop(1, 'rgba(232,163,61,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, 160 * scaleFactor.value * pulse, 0, Math.PI * 2)
  ctx.fill()
}

/* ==================== 破晓：以下为全部新增函数 ==================== */

/** 查找原版 DOM 星球元素（缓存失效自动重查；元素本身不改动） */
function findPlanetEl(): HTMLElement | null {
  if (planetElCache && planetElCache.isConnected) return planetElCache
  planetElCache = document.querySelector<HTMLElement>('.hero-planet')
  return planetElCache ?? null
}

/**
 * 触发沿冻结：星星时间、球心（hero 坐标系）、最大扩散半径、
 * 每颗星归一化死亡半径（±80ms 抖动，近者灭得更快），并同步 hero 亮主题渐变原点。
 * 反转同路径复用，保证严格可逆。
 */
function captureFreeze() {
  frozenTime = Date.now() / 1000
  const canvas = canvasRef.value
  if (!canvas) return
  const canvasRect = canvas.getBoundingClientRect()
  const planetEl = findPlanetEl()
  if (planetEl) {
    const pr = planetEl.getBoundingClientRect()
    freezeCx = pr.left + pr.width / 2 - canvasRect.left
    freezeCy = pr.top + pr.height / 2 - canvasRect.top
  } else {
    freezeCx = canvasWidth * 0.7
    freezeCy = canvasHeight * 0.42
  }
  // 最大半径：球心到四角最远点 × 1.15 余量，保证揭示层铺满
  maxDist = 1
  const corners: Array<[number, number]> = [
    [0, 0],
    [canvasWidth, 0],
    [0, canvasHeight],
    [canvasWidth, canvasHeight],
  ]
  for (const [x, y] of corners) {
    maxDist = Math.max(maxDist, Math.hypot(x - freezeCx, y - freezeCy))
  }
  maxDist *= 1.15
  // 环扩散行程 0.9s：±80ms 抖动折算为半径系数 ±(0.08/0.9)
  stars.value.forEach((s) => {
    const d = Math.min(1, Math.hypot(s.x - freezeCx, s.y - freezeCy) / maxDist)
    const jitter = (Math.random() * 2 - 1) * (0.08 / 0.9)
    s.deathK = Math.min(1, Math.max(0, d + jitter))
    s.fadeK = 0.33 * (0.55 + 0.45 * d)
  })
  // 亮主题 hero 渐变原点 = 球心（揭示层淡去后天空无缝衔接）
  const hero = canvas.parentElement
  hero?.style.setProperty('--dawn-cx', `${((freezeCx / canvasWidth) * 100).toFixed(2)}%`)
  hero?.style.setProperty('--dawn-cy', `${((freezeCy / canvasHeight) * 100).toFixed(2)}%`)
  // v6 规范第四节：主题翻转阈值 = 揭示圈盖住 Hero 文字块（最远角 + 40px）的半径系数，
  // 消除"浅色夜文字叠在白昼底色上"的灰影窗口；找不到文字块时保持缺省 1（铺满才翻转）
  const copyEl = document.querySelector('.home-hero .hero-copy')
  if (copyEl) {
    const cr = copyEl.getBoundingClientRect()
    const textCorners: Array<[number, number]> = [
      [cr.left - canvasRect.left, cr.top - canvasRect.top],
      [cr.right - canvasRect.left, cr.top - canvasRect.top],
      [cr.left - canvasRect.left, cr.bottom - canvasRect.top],
      [cr.right - canvasRect.left, cr.bottom - canvasRect.top],
    ]
    let textDist = 0
    for (const [x, y] of textCorners) {
      textDist = Math.max(textDist, Math.hypot(x - freezeCx, y - freezeCy))
    }
    setDawnFlipRadiusK((textDist + 40) / maxDist)
  }
}

/**
 * 天空环带变暖 #060608→#221B14：沿破晓环半径的柔和暗带（screen 混合），
 * 地平线以下叠加 20%（低处先暖 ×1.2）。仅过渡中绘制；夜间路径不进入。
 */
function drawSkyWarm() {
  if (!ctx) return
  if (!dawn.active || dawn.skyWarm <= 0.001 || dawn.radiusK <= 0) return
  const R = dawn.radiusK * maxDist
  if (R <= 1) return
  const band = Math.max(80, maxDist * 0.22)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(
    freezeCx, freezeCy, Math.max(0, R - band),
    freezeCx, freezeCy, R + band,
  )
  const a = 0.55 * dawn.skyWarm
  g.addColorStop(0, 'rgba(34,27,20,0)')
  g.addColorStop(0.5, `rgba(34,27,20,${a.toFixed(3)})`)
  g.addColorStop(1, 'rgba(34,27,20,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  // 低处先暖：球心水平线以下再叠加一层（等效速率 ×1.2）
  ctx.globalAlpha = 0.2 * dawn.skyWarm
  ctx.beginPath()
  ctx.rect(0, freezeCy, canvasWidth, canvasHeight - freezeCy)
  ctx.clip()
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.restore()
}

/**
 * WebGL 星球层逐帧同步：跟随原版 .hero-planet 位置/尺寸（含视差），
 * 按压回弹 scale(dawn.press)，随后渲染着色器星球。
 * 尺寸写 style 仅在变化时；位移走 transform（GPU 合成）。
 */
function syncPlanetOverlay() {
  const overlay = glOverlayRef.value
  const box = planetBoxRef.value
  if (!overlay || !box) return
  const planetEl = findPlanetEl()
  const host = overlay.parentElement
  if (!planetEl || !host) return
  const pr = planetEl.getBoundingClientRect()
  const hr = host.getBoundingClientRect()
  const w = pr.width
  const h = pr.height
  // 白昼天空暖光域：中心 = 球心，半径 = 2.5 倍球半径（GL 球径 = 盒宽 × 0.6），供 dawn.css 天空/揭示层渐变使用
  const glowCx = (((pr.left + w / 2 - hr.left) / hr.width) * 100).toFixed(2) + '%'
  const glowCy = (((pr.top + h / 2 - hr.top) / hr.height) * 100).toFixed(2) + '%'
  const glowR = (w * 0.75).toFixed(1) + 'px'
  const glowKey = `${glowCx}|${glowCy}|${glowR}`
  if (glowKey !== lastGlowKey) {
    lastGlowKey = glowKey
    host.style.setProperty('--dawn-cx', glowCx)
    host.style.setProperty('--dawn-cy', glowCy)
    host.style.setProperty('--dawn-glow-r', glowR)
  }
  if (w > 0 && (w !== planetBoxW || h !== planetBoxH)) {
    planetBoxW = w
    planetBoxH = h
    box.style.width = `${w}px`
    box.style.height = `${h}px`
    // GL 画布边长 = 星球盒 ×1.8（= 3 × 球体直径，容下光晕）
    planetGL?.resize(w * 1.8, Math.min(window.devicePixelRatio || 1, 2))
  }
  const s = dawn.press
  const ox = (w * (1 - s)) / 2
  const oy = (h * (1 - s)) / 2
  box.style.transform = `translate3d(${pr.left - hr.left + ox}px, ${pr.top - hr.top + oy}px, 0) scale(${s})`
  const pf = dawnLabFrame ?? dawn
  planetGL?.render(
    props.reducedMotion ? 0 : performance.now() / 1000,
    pf.phase,
    pf.bright,
  )
}

/** 降级为静态星空（动画循环已停）时：主题切换仍能落一帧正确画面 */
function drawStaticOnce() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  drawBackground()
  drawSkyWarm()
  drawStarfield()
  let cx = canvasWidth * (canvasWidth >= 768 ? 0.78 : 0.5)
  let cy = canvasHeight * 0.5
  const visual = props.visualEl
  if (visual) {
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const visualRect = visual.getBoundingClientRect()
    cx = visualRect.left + visualRect.width / 2 - canvasRect.left
    cy = visualRect.top + visualRect.height / 2 - canvasRect.top
  }
  // 破晓：白昼天空（含球心径向暖辐照）完全由着色器在 GL 画布内负责（v6 规范第六节），
  // 2D 画布不再叠加任何径向光斑，避免与着色器天空叠暖或在 GL 画布边缘形成色差断层
  if (dawn.theme !== 'dawn') drawCentralGlow(cx, cy)
  syncPlanetOverlay()
}

/**
 * 破晓帧订阅回调：复制快照；触发沿冻结现场；
 * 揭示层/破晓环按帧写 clip-path/opacity/半径（结束立即 display:none）；
 * 动画循环停止时退化为静态重绘。
 */
function onDawnFrame(f: DawnFrame) {
  const wasActive = dawn.active
  dawn = f
  if (f.active && !wasActive) {
    captureFreeze()
    if (ringRef.value) {
      ringRef.value.style.transform = `translate3d(${freezeCx - 1700}px, ${freezeCy - 1700}px, 0)`
    }
  }
  const reveal = revealRef.value
  if (reveal) {
    if (f.active && f.radiusK > 0 && f.revealAlpha > 0.001) {
      reveal.style.display = 'block'
      reveal.style.clipPath = `circle(${(f.radiusK * maxDist).toFixed(1)}px at ${freezeCx.toFixed(1)}px ${freezeCy.toFixed(1)}px)`
      reveal.style.opacity = f.revealAlpha.toFixed(3)
    } else if (reveal.style.display !== 'none') {
      reveal.style.display = 'none'
    }
  }
  const ring = ringRef.value
  if (ring) {
    if (f.active && f.radiusK > 0 && f.ringOpacity > 0.001) {
      ring.style.display = 'block'
      ring.style.opacity = f.ringOpacity.toFixed(3)
      ring.style.setProperty('--dawn-ring-r', `${(f.radiusK * maxDist).toFixed(1)}px`)
    } else if (ring.style.display !== 'none') {
      ring.style.display = 'none'
    }
  }
  if (rafId === null) {
    drawStaticOnce()
  }
}

/** WebGL 星球初始化：失败即显式标注 data-planet-gl（保留原版 DOM 星球 + 降级徽标），禁止静默退回 */
function initPlanetGL() {
  const glCanvas = glCanvasRef.value
  if (!glCanvas) return
  try {
    planetGL = createPlanetGL(glCanvas)
    document.documentElement.dataset.planetGl = 'ready'
    glCanvas.addEventListener('webglcontextlost', onGlContextLost)
    // 破晓调参台：仅 ?dawnlab=1 时挂载（内部自检 URL，无参数零注入）
    installDawnLab(planetGL, {
      setPreview: (f: { phase: number; bright: number } | null) => {
        dawnLabFrame = f
      },
    })
  } catch (err) {
    planetGL = null
    document.documentElement.dataset.planetGl = 'failed'
    console.error('[破晓] WebGL 星球初始化失败：已保留原版 DOM 星球并显式标注（data-planet-gl="failed"）。', err)
  }
}

function onGlContextLost(e: Event) {
  e.preventDefault()
  planetGL = null
  document.documentElement.dataset.planetGl = 'lost'
  console.error('[破晓] WebGL 上下文丢失：已回退原版 DOM 星球并显式标注（data-planet-gl="lost"）。')
}

function updatePhysics(dt: number) {
  if (!props.reducedMotion) {
    elapsed += dt
  }

  // 破晓：过渡中星星冻结（暂停非继续闪）；亮主题下星点已化为微尘（位移为绘制期偏移，不污染坐标）
  const frozen = dawn.active || dawn.theme === 'dawn'

  // 星空滚动
  stars.value.forEach((s) => {
    if (props.reducedMotion || frozen) return
    s.x -= s.speed * dt * 60
    if (s.x < -10) {
      s.x = canvasWidth + 10
      s.y = Math.random() * canvasHeight
    }
  })

  // 流星：每 8–15 秒随机一颗（移动端降频）；破晓过渡与亮主题下不再生成
  if (!props.reducedMotion && !frozen) {
    shootingStarTimer += dt * 60
    if (shootingStarTimer > nextMeteorIn) {
      spawnShootingStar()
      shootingStarTimer = 0
      nextMeteorIn = meteorInterval()
    }
  }
  shootingStars.value.forEach((ss) => {
    ss.x += ss.vx * dt * 60
    ss.y += ss.vy * dt * 60
    // 500ms 划过并渐隐
    ss.life -= dt / 0.55
  })
  shootingStars.value = shootingStars.value.filter((ss) => ss.life > 0 && ss.x > -150)
}

function drawFrame(time: number) {
  if (!ctx || !canvasRef.value) return
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016

  // —— 掉帧自动降级：持续高帧耗时 → 粒子减半 → 静态星空 ——
  if (!props.reducedMotion && lastTime) {
    const frameCost = (time - lastTime) || 16
    frameCostEma = frameCostEma * 0.95 + Math.min(frameCost, 100) * 0.05
    if (frameCostEma > 34) {
      slowFrames++
      if (slowFrames > 90) {
        slowFrames = 0
        frameCostEma = 16
        degradeLevel++
        if (degradeLevel === 1) {
          starCountScale = 0.5
          initStarfield()
        } else if (degradeLevel >= 2) {
          // 最终降级：绘制一帧静态星空后停止动画循环
          updatePhysics(0)
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)
          drawBackground()
          drawStarfield()
          syncPlanetOverlay()
          rafId = null
          return
        }
      }
    } else {
      slowFrames = Math.max(0, slowFrames - 2)
    }
  }

  lastTime = time

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  updatePhysics(dt)

  drawBackground()
  drawSkyWarm()
  drawStarfield()
  drawShootingStars()

  // 轨道系统绘制在视觉容器中心
  let cx = canvasWidth * (canvasWidth >= 768 ? 0.78 : 0.5) + props.parallaxX * 0.05
  let cy = canvasHeight * 0.5 + props.parallaxY * 0.05

  const visual = props.visualEl
  const canvasRect = canvasRef.value.getBoundingClientRect()
  if (visual) {
    const visualRect = visual.getBoundingClientRect()
    cx = visualRect.left + visualRect.width / 2 - canvasRect.left + props.parallaxX * 0.05
    cy = visualRect.top + visualRect.height / 2 - canvasRect.top + props.parallaxY * 0.05
  }

  // 破晓：白昼天空（含球心径向暖辐照）完全由着色器在 GL 画布内负责（v6 规范第六节），
  // 2D 画布不再叠加任何径向光斑，避免与着色器天空叠暖或在 GL 画布边缘形成色差断层
  if (dawn.theme !== 'dawn') drawCentralGlow(cx, cy)

  syncPlanetOverlay()

  rafId = requestAnimationFrame(drawFrame)
}

function startLoop() {
  if (degradeLevel >= 2) return
  if (rafId) cancelAnimationFrame(rafId)
  lastTime = 0
  rafId = requestAnimationFrame(drawFrame)
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

/** 页面不可见时暂停动画循环 */
function onVisibilityChange() {
  if (document.hidden) {
    stopLoop()
  } else {
    startLoop()
  }
}

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    initPlanetGL()
    // 订阅破晓状态机（立即回调一次：以亮主题加载时首帧即正确）
    unsubscribeDawn = subscribeDawn(onDawnFrame)
    startLoop()
  })

  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (canvasRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(canvasRef.value.parentElement)
  }
})

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  resizeObserver?.disconnect()
  // 破晓：退订 + 销毁 GL 上下文 + 还原星球层标注
  unsubscribeDawn?.()
  unsubscribeDawn = null
  glCanvasRef.value?.removeEventListener('webglcontextlost', onGlContextLost)
  planetGL?.destroy()
  planetGL = null
  planetElCache = undefined
  delete document.documentElement.dataset.planetGl
})

watch(() => [props.parallaxX, props.parallaxY], () => {
  // 视差变化由绘制循环直接读取，无需额外触发
}, { flush: 'post' })
</script>

<style scoped>
.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
