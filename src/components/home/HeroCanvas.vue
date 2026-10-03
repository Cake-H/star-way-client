<template>
  <canvas ref="canvasRef" class="hero-canvas" v-bind="$attrs" aria-hidden="true"></canvas>
  <!-- 破晓 · 揭示层：亮主题底色，以球心为原点 clip-path 扩散（z50，内容之上导航之下） -->
  <div ref="revealRef" class="dawn-reveal" aria-hidden="true"></div>
  <!-- 破晓 · 破晓环：三层光边界，与揭示层同步扩散，禁止硬边 -->
  <div ref="ringRef" class="dawn-ring" aria-hidden="true"></div>
  <!-- 破晓 · 绽放脉冲：铺满瞬间从球心荡开的柔光余晖（v9.5） -->
  <div ref="pulseRef" class="dawn-pulse" aria-hidden="true"></div>
  <!-- 破晓 · WebGL 星球层：星球本体 + 真实投影轨道/小行星（z60，保证 t=50% 星球可见） -->
  <div ref="glOverlayRef" class="planet-gl-overlay" aria-hidden="true">
    <div ref="planetBoxRef" class="planet-gl-box">
      <canvas ref="glCanvasRef" class="planet-gl-canvas"></canvas>
      <!-- P2.1 轨道画布：单图层绘制前/后弧与两颗球形小行星；背面进入星球投影区时自然遮挡 -->
      <canvas ref="orbitCanvasRef" class="orbit-canvas"></canvas>
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
const pulseRef = ref<HTMLDivElement>()
const glOverlayRef = ref<HTMLDivElement>()
const planetBoxRef = ref<HTMLDivElement>()
const glCanvasRef = ref<HTMLCanvasElement>()
const orbitCanvasRef = ref<HTMLCanvasElement>()

interface PlanetGLRenderer {
  resize(sizePx: number, dpr: number): void
  render(time: number, phase: number, bright: number): void
  recompile?(params: Record<string, number>): number
  destroy(): void
}

/** 破晓调参台预览帧（仅 ?dawnlab=1 面板注入；null = 交还时间线驱动） */
let dawnLabFrame: { phase: number; bright: number } | null = null

/* P2.1 轨道系统：真实 3D 倾角投影（比旧 CSS 74° 压扁更立体），
   半径以 GL 星球半径为 1；前后半周由 z 深度判定，背弧被球体投影遮挡 */
const ORBIT_ROT = (-18 * Math.PI) / 180
const ORBIT_TILT = 0.4
const ORBIT_DEPTH = Math.sqrt(1 - ORBIT_TILT * ORBIT_TILT)
const ORBIT_COS = Math.cos(ORBIT_ROT)
const ORBIT_SIN = Math.sin(ORBIT_ROT)
const ORBIT_RINGS = [
  { radius: 1.42, width: 1.0, alpha: 0.16 },
  { radius: 1.78, width: 1.35, alpha: 0.34 },
  { radius: 2.04, width: 1.0, alpha: 0.2 },
]
let orbitCtx: CanvasRenderingContext2D | null = null
let orbitCanvasSize = 0

/* 破晓帧快照（subscribeDawn 立即回调一次，保证以亮主题加载时首帧即正确） */
let dawn: DawnFrame = {
  phase: 0,
  bright: 1,
  starGlow: 0,
  swirl: 0,
  pulse: 0,
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
let dawnLabActive = false

/* P2 省电：夜间稳定态 GL 颗粒降帧（约 12fps）；过渡/白昼/调参台仍全帧率 */
const NIGHT_GL_FRAME_MS = 1000 / 12
let lastPlanetRenderAt = Number.NEGATIVE_INFINITY
let planetRenderTime = 0

/* 冻结状态：触发瞬间的星星时间/球心/最大半径（反转同路径复用，保证严格可逆） */
let frozenTime = 0
let freezeCx = 0
let freezeCy = 0
let maxDist = 1
/* 本次回夜的脉冲零位（脉冲标量 p 在起播瞬间的值）：回夜从 2.2s 跳转起播时 p≈0.28，
   收缩进度 q 以此为 0 重新起算，点击当帧即进入"触发即亮"段 */
let reverseStartP = 1
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

/*
 * 移动端 dpr 上限 1.5（桌面仍 2）：手机转场每帧全屏重绘 2D 画布 + WebGL 星球噪声着色器，
 * dpr 2→1.5 让像素填充量减少约 44%，是手机转场掉帧的主要减负项；
 * 星点/光晕在小屏上的观感差异不可察觉
 */
function dprCap(w: number = canvasWidth) {
  return Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.parentElement) return

  const rect = canvas.parentElement.getBoundingClientRect()
  // 注意必须传实测宽度：canvasWidth 此时尚未赋值，首次调用恒为 0（会误判为移动端）
  const dpr = dprCap(rect.width)
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

  // 转场期间跳过两团静态星云（α≤0.05 的氛围色，2.4s 内不可察觉）：
  // 每帧少两次全屏径向渐变填充，手机填充率压力显著下降
  if (dawn.active) return

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
  // 破晓：触发瞬间星星位置冻结在最后状态；夜间恒为实时时间，逐像素不变。
  // liveTime 仅供唤醒呼吸使用（振幅从 0 渐入，不破坏冻结沿的连续性）
  const liveTime = Date.now() / 1000
  const time = dawn.active ? frozenTime : liveTime
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
    let drawSize = s.size
    let cr = s.rgb?.[0] ?? 232
    let cg = s.rgb?.[1] ?? 230
    let cb = s.rgb?.[2] ?? 224
    /** P2 十字星芒强度：仅最大一批亮星在被点燃/吞没交界短暂出现 */
    let flare = 0
    const flareEligible = s.layer === 2 && s.size >= 2.0

    if (engage) {
      // v9.1 星辉变换①：星球自转裹挟星点（绕球心角位移，近球强远球弱；绘制期偏移，不污染坐标）。
      // v9.4：角位移由 swirl 标量匀速推进（0.1→2.2s），持续旋转直到光圈铺满全屏才停，
      // 不再随自转缓动末尾刹车；白昼微尘永久停在最终角位移；倒放随 swirl 匀速退回
      const dxs = x - freezeCx
      const dys = y - freezeCy
      const ds = Math.hypot(dxs, dys)
      const fall = Math.exp(-ds / (maxDist * 0.5))
      const ang = -0.55 * dawn.swirl * fall
      if (ang !== 0 && maxDist > 1) {
        const ca = Math.cos(ang)
        const sa = Math.sin(ang)
        x = freezeCx + dxs * ca - dys * sa
        y = freezeCy + dxs * sa + dys * ca
      }
      if (s.dust) {
        // 白昼微尘：约 5% 星点保留，缓慢漂浮（10~20s 一个来回），颜色向暖金推移
        if (dawn.dustFade > 0) {
          alpha *= 1 - 0.6 * dawn.dustFade
          if (!props.reducedMotion && s.driftAmp && s.driftPeriod && s.driftPhase !== undefined) {
            const w = (Math.PI * 2) / s.driftPeriod
            x += Math.sin(time * w + s.driftPhase) * s.driftAmp * dawn.dustFade
            y += Math.cos(time * w * 0.8 + s.driftPhase) * s.driftAmp * 0.6 * dawn.dustFade
          }
          const k = dawn.dustFade
          cr += (232 - cr) * k
          cg += (163 - cg) * k
          cb += (61 - cb) * k
        }
      } else if (dawn.radiusK > 0 || dawn.starGlow > 0) {
        // v9.3 星场渐亮·修正：按离球心距离分级唤醒（近球强、远球微），取消尺寸膨胀、
        // 提亮收敛——整屏同步变大变亮会产生密集光斑的不适感，渐层点亮才像晨光漫过星海；
        // 波前到达后再进入点燃/吞没流程——先点亮星空，再点亮世界
        if (dawn.starGlow > 0 && dawn.radiusK - (s.deathK ?? 0.5) <= -0.07) {
          const wk = dawn.starGlow * (0.3 + 0.7 * Math.exp(-ds / (maxDist * 0.55)))
          // P2 苏醒呼吸：唤醒期在冻结基准上叠加 ±12% 的活性闪烁；wk 从 0 渐入，无跳变
          const breath = props.reducedMotion
            ? 1
            : 1 + Math.sin(liveTime * (1.1 + s.twinkleSpeed * 0.65) + s.twinklePhase) * 0.12 * wk
          alpha *= (1 + 0.9 * wk) * breath
          cr += (255 - cr) * 0.3 * wk
          cg += (230 - cg) * 0.3 * wk
          cb += (195 - cb) * 0.3 * wk
        }
        // 破晓环吞没：环先点亮再吞没（反转经过时重新点亮）
        const rel = dawn.radiusK - (s.deathK ?? 0.5)
        const brightBand = 0.07
        if (rel <= -brightBand) {
          // v9.1 星辉变换②·前导辉光：波前逼近的星点先被晨光"点亮"（微亮 + 色温转暖）
          const pre = rel + brightBand + 0.14
          if (pre > 0) {
            const k2 = pre / 0.14
            alpha *= 1 + 0.35 * k2
            cr += (255 - cr) * k2 * 0.5
            cg += (224 - cg) * k2 * 0.5
            cb += (170 - cb) * k2 * 0.5
          }
        } else if (rel <= 0) {
          // v9.1 星辉变换③·点燃：抵近波前急剧提亮、放大、转为暖金星辉，再被吞没
          const k = (rel + brightBand) / brightBand
          alpha *= 1 + 1.3 * k
          drawSize = s.size * (1 + 0.7 * k)
          cr += (255 - cr) * k * 0.85
          cg += (214 - cg) * k * 0.85
          cb += (150 - cb) * k * 0.85
          // P2：十字星芒随点燃爬升，抵达波前交界时达到最亮
          if (flareEligible) flare = Math.sin(k * Math.PI * 0.5)
        } else if (rel <= (s.fadeK ?? 0.33)) {
          const fadeOut = 1 - rel / (s.fadeK ?? 0.33)
          alpha *= 2.3 * fadeOut
          // P2：星芒越过波前后随星体一起熄灭，不出现突然消失
          if (flareEligible) flare = Math.max(0, fadeOut)
        } else {
          alpha = 0
        }
      }
      alpha = Math.min(alpha, 1)
      if (alpha <= 0.004) return
    }

    const ri = Math.round(cr)
    const gi = Math.round(cg)
    const bi = Math.round(cb)
    ctx!.globalAlpha = alpha
    ctx!.fillStyle = `rgb(${ri},${gi},${bi})`
    ctx!.beginPath()
    ctx!.arc(x, y, drawSize, 0, Math.PI * 2)
    ctx!.fill()

    if (drawSize > 1.6 && alpha > 0.5) {
      const glow = ctx!.createRadialGradient(x, y, 0, x, y, drawSize * 3)
      glow.addColorStop(0, `rgba(${ri},${gi},${bi},${alpha * 0.45})`)
      glow.addColorStop(1, `rgba(${ri},${gi},${bi},0)`)
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.arc(x, y, drawSize * 3, 0, Math.PI * 2)
      ctx!.fill()
    }

    if (flare > 0.01 && alpha > 0.03) {
      // P2 十字星芒：两条正交细线（横长竖短），screen 叠加，中心暖白、两端透明
      const a = Math.min(1, alpha * 0.72) * flare
      const len = drawSize * (7 + 4 * flare)
      ctx!.save()
      ctx!.globalCompositeOperation = 'screen'
      ctx!.globalAlpha = 1
      ctx!.lineCap = 'round'
      ctx!.lineWidth = Math.max(0.55, drawSize * 0.16)
      const hor = ctx!.createLinearGradient(x - len, y, x + len, y)
      hor.addColorStop(0, 'rgba(255,244,214,0)')
      hor.addColorStop(0.5, `rgba(255,244,214,${a.toFixed(3)})`)
      hor.addColorStop(1, 'rgba(255,244,214,0)')
      ctx!.strokeStyle = hor
      ctx!.beginPath()
      ctx!.moveTo(x - len, y)
      ctx!.lineTo(x + len, y)
      ctx!.stroke()
      const vLen = len * 0.72
      const ver = ctx!.createLinearGradient(x, y - vLen, x, y + vLen)
      ver.addColorStop(0, 'rgba(255,244,214,0)')
      ver.addColorStop(0.5, `rgba(255,244,214,${(a * 0.82).toFixed(3)})`)
      ver.addColorStop(1, 'rgba(255,244,214,0)')
      ctx!.strokeStyle = ver
      ctx!.beginPath()
      ctx!.moveTo(x, y - vLen)
      ctx!.lineTo(x, y + vLen)
      ctx!.stroke()
      ctx!.restore()
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
 * v9.1 破晓波前（canvas 层，screen 混合）：不规则大气扰动环形 + 两条尾随波纹。
 * 角向摆动（3/7/13 波数叠加、缓慢旋转）让光锋面不再是规则几何圆；
 * 尾随波纹制造"光的波动"。摆幅经 front_sim.py 形态模拟标定。
 * 仅过渡中绘制；夜间路径不进入。DOM 破晓环（z50）负责内容层之上的部分，本层补充细节。
 */
function drawDawnFront() {
  if (!ctx) return
  if (!dawn.active || dawn.ringOpacity <= 0.001 || dawn.radiusK <= 0) return
  const R0 = dawn.radiusK * maxDist
  if (R0 < 8) return
  const t = performance.now() / 1000
  const rotA = t * 0.25 + dawn.phase * 2.0
  const bands: Array<{ k: number; half: number; peak: number; hue: [number, number, number] }> = [
    { k: 1.0, half: Math.max(40, R0 * 0.06), peak: 0.5, hue: [239, 151, 18] },
    { k: 0.88, half: Math.max(24, R0 * 0.045), peak: 0.16, hue: [240, 178, 90] },
    { k: 0.76, half: Math.max(16, R0 * 0.035), peak: 0.08, hue: [245, 200, 140] },
  ]
  const N = 48
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const b of bands) {
    const Rb = R0 * b.k
    if (Rb - b.half <= 1) continue
    const a = b.peak * dawn.ringOpacity
    const grad = ctx.createRadialGradient(
      freezeCx, freezeCy, Math.max(0, Rb - b.half),
      freezeCx, freezeCy, Rb + b.half,
    )
    grad.addColorStop(0, `rgba(${b.hue[0]},${b.hue[1]},${b.hue[2]},0)`)
    grad.addColorStop(0.5, `rgba(${b.hue[0]},${b.hue[1]},${b.hue[2]},${a.toFixed(3)})`)
    grad.addColorStop(1, `rgba(${b.hue[0]},${b.hue[1]},${b.hue[2]},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2
      const w = 1 + 0.022 * Math.sin(3 * th + rotA * 1.7) + 0.013 * Math.sin(7 * th - rotA * 1.1) + 0.007 * Math.sin(13 * th + rotA * 2.3)
      const r = (Rb + b.half) * w
      const wx = freezeCx + Math.cos(th) * r
      const wy = freezeCy + Math.sin(th) * r
      if (i === 0) ctx.moveTo(wx, wy)
      else ctx.lineTo(wx, wy)
    }
    for (let i = N; i >= 0; i--) {
      const th = (i / N) * Math.PI * 2
      const w = 1 + 0.022 * Math.sin(3 * th + rotA * 1.7) + 0.013 * Math.sin(7 * th - rotA * 1.1) + 0.007 * Math.sin(13 * th + rotA * 2.3)
      const r = Math.max(0, Rb - b.half) * (2 - w)
      ctx.lineTo(freezeCx + Math.cos(th) * r, freezeCy + Math.sin(th) * r)
    }
    ctx.closePath()
    ctx.fill('evenodd')
  }
  ctx.restore()
}

/** P2.1 数值工具：轨道角向明暗/背面遮挡都用平滑阶跃，避免硬切边 */
function smooth01(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function mixRgb(a: [number, number, number], b: [number, number, number], k: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

function rgba(rgb: [number, number, number], a: number) {
  return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${Math.min(1, Math.max(0, a)).toFixed(3)})`
}

/** 轨道平面 3D 投影：x/y 为屏幕坐标，z 为正表示在星球前方 */
function orbitPoint(theta: number, radius: number, cx: number, cy: number): [number, number, number] {
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  return [
    cx + radius * (cosT * ORBIT_COS - sinT * ORBIT_SIN * ORBIT_TILT),
    cy + radius * (cosT * ORBIT_SIN + sinT * ORBIT_COS * ORBIT_TILT),
    radius * sinT * ORBIT_DEPTH,
  ]
}

/** 轨道画布与 GL 画布同尺寸、同中心；尺寸变化时重建 2D 上下文 */
function resizeOrbitCanvas(sizeCss: number) {
  const canvas = orbitCanvasRef.value
  if (!canvas || sizeCss <= 0) return
  const size = Math.max(2, Math.round(sizeCss))
  if (size === orbitCanvasSize && orbitCtx) return
  const dpr = dprCap()
  orbitCanvasSize = size
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  orbitCtx = canvas.getContext('2d')
  orbitCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/**
 * P2.1 轨道系统重设计：三条细环有真实倾角、角向明暗与轻微有机扰动；
 * 两颗小行星按 3D 轨道运行，背面进入星球圆形投影区时平滑消隐，
 * 前侧更大更亮、后侧更小更暗，取代旧 CSS 压扁圆点。
 */
function drawOrbitSystem(boxW: number) {
  const c = orbitCtx
  if (!c || boxW <= 0 || orbitCanvasSize <= 0) return
  const size = orbitCanvasSize
  const cx = size / 2
  const cy = size / 2
  const sphereR = boxW * 0.3
  const uiScale = Math.min(1, Math.max(0.72, boxW / 520))
  const dayMix = smooth01(0.88, 1, dawn.phase)
  const ringColor = mixRgb([232, 163, 61], [176, 105, 26], dayMix)
  const time = props.reducedMotion ? 0 : performance.now() / 1000

  c.clearRect(0, 0, size, size)
  c.save()
  c.lineCap = 'round'
  c.lineJoin = 'round'

  // 轨道：背弧淡、前弧亮；背弧穿过星球投影圆时按临边淡出（真实遮挡，不靠层级硬切）
  ORBIT_RINGS.forEach((ring, ringIndex) => {
    const R = sphereR * ring.radius
    const segments = 128
    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2
      const t1 = ((i + 1) / segments) * Math.PI * 2
      const tm = (t0 + t1) / 2
      const [x0, y0] = orbitPoint(t0, R, cx, cy)
      const [x1, y1] = orbitPoint(t1, R, cx, cy)
      const [xm, ym, zm] = orbitPoint(tm, R, cx, cy)
      const front = smooth01(-0.08 * R, 0.08 * R, zm)
      const dist = Math.hypot(xm - cx, ym - cy)
      const visible = zm >= 0 ? 1 : smooth01(sphereR * 0.93, sphereR * 1.04, dist)
      const organic = 0.84 + 0.16 * Math.sin(2 * tm + ringIndex * 0.9) * Math.sin(5 * tm - 0.4)
      const a = ring.alpha * (0.35 + 0.65 * front) * visible * organic * (1 - dayMix * 0.08)
      if (a <= 0.003) continue
      if (ring.width > 1.2) {
        c.strokeStyle = rgba(ringColor, a * 0.16)
        c.lineWidth = ring.width * 3.2 * uiScale
        c.beginPath()
        c.moveTo(x0, y0)
        c.lineTo(x1, y1)
        c.stroke()
      }
      c.strokeStyle = rgba(ringColor, a)
      c.lineWidth = ring.width * (0.86 + 0.24 * front) * uiScale
      c.beginPath()
      c.moveTo(x0, y0)
      c.lineTo(x1, y1)
      c.stroke()
    }
  })

  // 小行星：两颗球形受光体，分别贴外环/内环运行；背面由星球圆形投影遮挡
  const satellites = [
    {
      theta: (time * Math.PI * 2) / 26 + 0.8,
      ringRadius: ORBIT_RINGS[2].radius,
      radius: 4.5 * uiScale,
      body: mixRgb([232, 163, 61], [176, 105, 26], dayMix),
      shade: mixRgb([98, 59, 16], [74, 45, 14], dayMix),
      light: mixRgb([255, 225, 168], [238, 194, 122], dayMix),
    },
    {
      theta: (-time * Math.PI * 2) / 38 + 2.4,
      ringRadius: ORBIT_RINGS[0].radius,
      radius: 3.3 * uiScale,
      body: mixRgb([232, 230, 224], [122, 114, 102], dayMix),
      shade: mixRgb([78, 73, 66], [54, 49, 43], dayMix),
      light: mixRgb([255, 250, 238], [218, 207, 190], dayMix),
    },
  ]
  satellites.forEach((sat) => {
    const orbitR = sphereR * sat.ringRadius
    const [x, y, z] = orbitPoint(sat.theta, orbitR, cx, cy)
    const front = smooth01(-0.06 * orbitR, 0.06 * orbitR, z)
    const dist = Math.hypot(x - cx, y - cy)
    const visible = z >= 0 ? 1 : smooth01(sphereR * 0.93, sphereR * 1.04, dist)
    if (visible <= 0.01) return
    const rr = sat.radius * (0.86 + 0.22 * front)
    const alpha = (0.48 + 0.52 * front) * visible

    const halo = c.createRadialGradient(x, y, 0, x, y, rr * 3.2)
    halo.addColorStop(0, rgba(sat.body, alpha * 0.14))
    halo.addColorStop(0.48, rgba(sat.body, alpha * 0.05))
    halo.addColorStop(1, rgba(sat.body, 0))
    c.fillStyle = halo
    c.beginPath()
    c.arc(x, y, rr * 3.2, 0, Math.PI * 2)
    c.fill()

    // 光源来自星球高光侧：小行星保持圆形，只用品相/明暗表达体积，不再被轨道压扁
    const body = c.createRadialGradient(x - rr * 0.38, y - rr * 0.42, rr * 0.08, x, y, rr)
    body.addColorStop(0, rgba(sat.light, alpha))
    body.addColorStop(0.52, rgba(sat.body, alpha))
    body.addColorStop(1, rgba(sat.shade, alpha))
    c.fillStyle = body
    c.beginPath()
    c.arc(x, y, rr, 0, Math.PI * 2)
    c.fill()
  })
  c.restore()
}

/**
 * WebGL 星球层逐帧同步：跟随原版 .hero-planet 位置/尺寸（含视差），
 * 按压回弹 scale(dawn.press)，随后渲染着色器星球与轨道画布。
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
    planetGL?.resize(w * 1.8, dprCap())
    // resize 会清空画布：强制下一帧重绘，避免夜间降帧窗口内出现空帧
    lastPlanetRenderAt = Number.NEGATIVE_INFINITY
  }
  resizeOrbitCanvas(w * 1.8)
  const s = dawn.press
  const ox = (w * (1 - s)) / 2
  const oy = (h * (1 - s)) / 2
  box.style.transform = `translate3d(${pr.left - hr.left + ox}px, ${pr.top - hr.top + oy}px, 0) scale(${s})`
  const pf = dawnLabFrame ?? dawn
  const now = performance.now()
  // P2 省电：夜间稳定态只有着色器颗粒随 uTime 微动，降至约 12fps；
  // 过渡、白昼、调参台与 resize 后仍立即全帧率渲染，视觉与交互零影响
  const stableNight =
    !dawnLabActive &&
    !dawn.active &&
    dawn.theme === 'night' &&
    pf.phase === 0 &&
    pf.bright === 1
  const shouldRender =
    !stableNight ||
    lastPlanetRenderAt === Number.NEGATIVE_INFINITY ||
    now - lastPlanetRenderAt >= NIGHT_GL_FRAME_MS
  if (shouldRender) {
    planetRenderTime = props.reducedMotion ? 0 : now / 1000
    planetGL?.render(planetRenderTime, pf.phase, pf.bright)
    lastPlanetRenderAt = now
  }
  // 轨道画布独立全帧率：小行星运动不受 GL 夜间颗粒降帧影响
  drawOrbitSystem(w)
}

/** 降级为静态星空（动画循环已停）时：主题切换仍能落一帧正确画面 */
function drawStaticOnce() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  drawBackground()
  drawSkyWarm()
  drawDawnFront()
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
  const prevPulse = dawn.pulse
  dawn = f
  if (f.active && !wasActive) {
    captureFreeze()
    if (ringRef.value) {
      ringRef.value.style.transform = `translate3d(${freezeCx - 1200}px, ${freezeCy - 1200}px, 0)`
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
      // v9.1：半径改由 transform scale 驱动（基准半径 1000px，层宽 2400px 控内存），
      // 微椭圆（1.025/0.975）+ 缓慢旋转，配合 CSS 角向光丝遮罩，破除规则几何圆
      const k = (f.radiusK * maxDist) / 1000
      const t = performance.now() / 1000
      const rot = t * 7 + Math.sin(t * 0.6) * 4
      ring.style.transform = `translate3d(${freezeCx - 1200}px, ${freezeCy - 1200}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(k * 1.025).toFixed(4)}, ${(k * 0.975).toFixed(4)})`
    } else if (ring.style.display !== 'none') {
      ring.style.display = 'none'
    }
  }
  const pulseEl = pulseRef.value
  if (pulseEl) {
    const p = Math.min(1, Math.max(0, f.pulse))
    // 回夜起播（含 2.2s 跳转起播，此时 p≈0.28）：记录本次倒放的脉冲零位，
    // 收缩进度 q 以此为 0 重新起算——点击当帧就进入"触发即亮"段
    if (f.active && !wasActive && p > 0.05) {
      reverseStartP = p
    }
    // 回夜识别：脉冲标量随倒放往 0 走；起播/跳转的起点帧（标量静止且主题仍是 dawn）也按回夜处理，
    // 让点击当帧就进入脉冲的"触发"段，而不是等倒放走出可见 opacity
    const reversing =
      f.active && (p < prevPulse - 0.0001 || (Math.abs(p - prevPulse) <= 0.0001 && f.theme === 'dawn' && p > 0.001))
    // 中途反向（正播途中被点回夜）时零位可能落后于当前 p，向前追齐，保证 q 从 0 起算
    if (reversing && p > reverseStartP) {
      reverseStartP = p
    }
    // 统一脉冲进度 q：0 = 脉冲刚触发（入昼铺满瞬间 / 回夜点击瞬间），1 = 余晖散尽。
    // 两个方向共用"触发即亮"的包络——前 10% 快速攻到峰值再缓释散去，
    // 杜绝"点击后只有一圈越来越暗的环"造成的无响应错觉；
    // 半径方向相反：入昼是光从球心荡开（0.2R→1.3R），回夜是光被星球收回（0.85R→0.15R，
    // 起点留在画面内、点击当帧即可见）；
    // 回夜从 2.2s 跳转起播（useDawnTransition REVERSE_START_TIME）——脉冲收缩与
    // 星辉回转 / 光界回退 / 天空变暗从点击当帧同步进行，无先后
    const q = reversing ? Math.min(1, Math.max(0, (reverseStartP - p) / reverseStartP)) : p
    const attack = Math.min(1, q / 0.1)
    const decayT = Math.min(1, Math.max(0, (q - 0.1) / 0.9))
    const opacity = attack * Math.pow(1 - decayT, 1.6) * 0.85
    if (f.active && opacity > 0.004) {
      pulseEl.style.display = 'block'
      pulseEl.style.opacity = opacity.toFixed(3)
      const radiusKq = reversing ? 0.85 - 0.7 * q : 0.2 + 1.1 * q
      const kp = (radiusKq * maxDist) / 1000
      pulseEl.style.transform = `translate3d(${freezeCx - 1200}px, ${freezeCy - 1200}px, 0) scale(${kp.toFixed(4)})`
    } else if (pulseEl.style.display !== 'none') {
      pulseEl.style.display = 'none'
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
    // 破晓调参台：仅 ?dawnlab=1 时挂载（内部自检 URL，无参数零注入）；
    // 调参台激活时禁用夜间降帧，保证重编译/预览即时可见
    dawnLabActive = installDawnLab(planetGL, {
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
  drawDawnFront()
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
