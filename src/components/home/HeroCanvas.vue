<template>
  <canvas ref="canvasRef" class="hero-canvas" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  const time = Date.now() / 1000
  const parallaxFactors = [0.12, 0.25, 0.45]

  stars.value.forEach((s) => {
    const factor = parallaxFactors[s.layer] ?? 0.2
    const px = props.parallaxX * factor
    const py = props.parallaxY * factor
    const x = ((s.x + px) % canvasWidth + canvasWidth) % canvasWidth
    const y = ((s.y + py) % canvasHeight + canvasHeight) % canvasHeight

    const twinkle = props.reducedMotion
      ? 1
      : 0.75 + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25
    const alpha = s.opacity * twinkle

    ctx!.globalAlpha = alpha
    ctx!.fillStyle = s.color
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

function updatePhysics(dt: number) {
  if (!props.reducedMotion) {
    elapsed += dt
  }

  // 星空滚动
  stars.value.forEach((s) => {
    if (props.reducedMotion) return
    s.x -= s.speed * dt * 60
    if (s.x < -10) {
      s.x = canvasWidth + 10
      s.y = Math.random() * canvasHeight
    }
  })

  // 流星：每 8–15 秒随机一颗（移动端降频）
  if (!props.reducedMotion) {
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

  drawCentralGlow(cx, cy)

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
