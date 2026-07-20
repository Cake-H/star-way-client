<template>
  <div
    ref="moduleRef"
    class="star-waiting-module"
    :class="{ 'is-playing': mode === 'playing', 'is-finishing': mode === 'finishing', 'reduced-motion': reducedMotion }"
    tabindex="0"
    @keydown.space.prevent="onSpace"
    @keydown.enter.prevent="onSpace"
  >
    <!-- 背景层 -->
    <div class="space-bg" aria-hidden="true">
      <div class="nebula"></div>
      <!-- 天体 -->
      <div class="celestial gas-giant">
        <div class="planet-body"></div>
        <div class="planet-ring"></div>
      </div>
      <div class="celestial lava-planet">
        <div class="planet-body"></div>
        <div class="atmosphere"></div>
      </div>
      <div class="celestial station">
        <svg viewBox="0 0 120 80" class="station-svg">
          <polygon points="60,10 90,40 60,70 30,40" class="station-core" />
          <rect x="10" y="35" width="30" height="10" class="station-arm" />
          <rect x="80" y="35" width="30" height="10" class="station-arm" />
          <circle cx="20" cy="40" r="3" class="station-light red" />
          <circle cx="100" cy="40" r="3" class="station-light green" />
          <circle cx="60" cy="40" r="4" class="station-light cyan" />
        </svg>
      </div>

      <div class="meteor meteor-1"></div>
      <div class="meteor meteor-2"></div>
      <div class="meteor meteor-3"></div>
      <div class="meteor meteor-4"></div>
      <div class="scan-line"></div>
    </div>

    <!-- Canvas 游戏层 -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>

    <!-- HUD 层 -->
    <div class="hud-layer">
      <div class="hud-top">
        <div class="mission-title">
          <span class="mission-label">MISSION</span>
          <h2 class="mission-name">{{ title }}</h2>
        </div>
        <div v-if="mode === 'playing'" class="score-board" :class="{ bump: scoreBump }">
          <span class="score-label">面试成功值</span>
          <span class="score-value">{{ score }}</span>
        </div>
      </div>

      <button
        v-if="mode === 'roaming'"
        class="mode-toggle"
        type="button"
        @click="enterGame"
      >
        <span class="toggle-icon">🚀</span>
        <span class="toggle-text">等待无聊？玩会小游戏解解闷~</span>
      </button>
      <button
        v-else-if="mode === 'playing'"
        class="mode-toggle back"
        type="button"
        @click="enterRoaming"
      >
        <span class="toggle-text">返回欣赏星空</span>
      </button>

      <div class="tip-terminal">
        <span class="tip-pulse"></span>
        <transition name="tip" mode="out-in">
          <p v-if="!tipChanging" :key="tipIndex" class="tip-text">{{ currentTip }}</p>
        </transition>
      </div>
    </div>

    <!-- 完成覆盖层 -->
    <div v-if="mode === 'finishing'" class="finish-overlay">
      <div class="finish-core">
        <div class="finish-ring"></div>
        <p class="finish-text">准备完成</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useWaitingTips, DEFAULT_WAITING_TIPS } from '@/composables/useWaitingTips'

interface Props {
  title?: string
  completed?: boolean
  tips?: string[]
  estimatedSeconds?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'AI 正在生成针对性面试题...',
  completed: false,
  tips: () => DEFAULT_WAITING_TIPS,
  estimatedSeconds: 20,
})

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'play'): void
  (e: 'idle'): void
}>()

const moduleRef = ref<HTMLDivElement>()
const gameCanvas = ref<HTMLCanvasElement>()
const prefersReducedMotion = usePreferredReducedMotion()
const reducedMotion = computed(() => prefersReducedMotion.value)

const mode = ref<'roaming' | 'playing' | 'finishing'>('roaming')
const score = ref(0)
const scoreBump = ref(false)

// 冷知识
const { current: currentTip, index: tipIndex, isChanging: tipChanging } = useWaitingTips(
  computed(() => props.tips),
  5000,
)

// Canvas 上下文
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null

// 游戏状态
interface Rocket {
  x: number
  y: number
  vy: number
  angle: number
  width: number
  height: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface Collectible {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  rotation: number
  collected: boolean
  pulse: number
}

interface Asteroid {
  x: number
  y: number
  vx: number
  radius: number
  vertices: { x: number; y: number }[]
  rotation: number
  rotSpeed: number
}

interface FloatingText {
  x: number
  y: number
  text: string
  life: number
  maxLife: number
  color: string
}

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  twinkleSpeed: number
  twinklePhase: number
  color: string
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

const rocket = ref<Rocket>({
  x: 0,
  y: 0,
  vy: 0,
  angle: 0,
  width: 110,
  height: 56,
})

const particles = ref<Particle[]>([])
const collectibles = ref<Collectible[]>([])
const asteroids = ref<Asteroid[]>([])
const floatingTexts = ref<FloatingText[]>([])
const stars = ref<Star[]>([])
const shootingStars = ref<ShootingStar[]>([])

let worldOffset = 0
let lastTime = 0
let asteroidSpawnTimer = 0
let collectibleSpawnTimer = 0
let engineGlow = 0
let rocketJitter = 0
let shootingStarTimer = 0

const GRAVITY = 0.35
const THRUST = -7.2
const MAX_FALL = 7
const WORLD_SPEED_ROAMING = 0.6
const WORLD_SPEED_PLAYING = 4.5

function initStarfield(width: number, height: number) {
  const rand = (min: number, max: number) => min + Math.random() * (max - min)
  const newStars: Star[] = []
  const layers = [
    { count: 60, speedMin: 0.7, speedMax: 1.4, sizeMin: 1, sizeMax: 2.2, opacityMin: 0.25, opacityMax: 0.55 },
    { count: 40, speedMin: 2, speedMax: 3.4, sizeMin: 1.4, sizeMax: 2.8, opacityMin: 0.4, opacityMax: 0.8 },
    { count: 24, speedMin: 4, speedMax: 6.5, sizeMin: 1.8, sizeMax: 3.8, opacityMin: 0.55, opacityMax: 1 },
  ]
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const colorRoll = Math.random()
      const color =
        colorRoll > 0.88 ? '#00f0ff' : colorRoll > 0.76 ? '#ffb627' : '#ffffff'
      newStars.push({
        x: rand(0, width),
        y: rand(0, height),
        size: rand(layer.sizeMin, layer.sizeMax),
        speed: rand(layer.speedMin, layer.speedMax),
        opacity: rand(layer.opacityMin, layer.opacityMax),
        twinkleSpeed: rand(0.5, 2.5),
        twinklePhase: rand(0, Math.PI * 2),
        color,
      })
    }
  }
  stars.value = newStars
  shootingStars.value = []
  shootingStarTimer = 0
}

function resizeCanvas() {
  const canvas = gameCanvas.value
  const container = moduleRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
  }

  // 初始化星空
  initStarfield(rect.width, rect.height)

  // 初始化火箭位置
  const centerX = rect.width * 0.38
  const centerY = rect.height * 0.48
  rocket.value.x = centerX
  if (mode.value === 'roaming') {
    rocket.value.y = centerY + Math.sin(Date.now() / 1200) * 30
  } else if (rocket.value.y === 0) {
    rocket.value.y = centerY
  }
}

function spawnParticle(x: number, y: number, vx: number, vy: number, color: string, size: number) {
  particles.value.push({
    x,
    y,
    vx,
    vy,
    life: 1,
    maxLife: 0.8 + Math.random() * 0.6,
    color,
    size,
  })
}

function spawnCollectible() {
  const canvas = gameCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  collectibles.value.push({
    x: rect.width + 60,
    y: 60 + Math.random() * (rect.height - 120),
    vx: -(WORLD_SPEED_PLAYING + 0.8 + Math.random() * 1.5),
    vy: Math.sin(Math.random() * Math.PI * 2) * 0.5,
    radius: 10 + Math.random() * 4,
    rotation: Math.random() * Math.PI * 2,
    collected: false,
    pulse: 0,
  })
}

function spawnAsteroid() {
  const canvas = gameCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const radius = 18 + Math.random() * 35
  const vertices: { x: number; y: number }[] = []
  const vertexCount = 7 + Math.floor(Math.random() * 5)
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2
    const r = radius * (0.7 + Math.random() * 0.5)
    vertices.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    })
  }
  asteroids.value.push({
    x: rect.width + radius + Math.random() * 100,
    y: Math.random() * rect.height,
    vx: -(WORLD_SPEED_PLAYING * 0.45 + Math.random() * 1.2),
    radius,
    vertices,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
  })
}

function spawnFloatingText(x: number, y: number, text: string, color: string) {
  floatingTexts.value.push({
    x,
    y,
    text,
    life: 1,
    maxLife: 1,
    color,
  })
}

function spawnShootingStar(width: number, height: number) {
  const y = Math.random() * height * 0.65
  const speed = 12 + Math.random() * 10
  const angle = -Math.PI / 12 - Math.random() * 0.15
  shootingStars.value.push({
    x: width + 60,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: 60 + Math.random() * 70,
    opacity: 0.7 + Math.random() * 0.3,
    life: 1,
    maxLife: 1,
  })
}

function applyThrust() {
  if (mode.value !== 'playing') return
  rocket.value.vy = THRUST
  engineGlow = 1

  // 喷射粒子（朝右火箭，喷嘴在尾部左侧）
  const r = rocket.value
  const nozzleX = r.x - r.width * 0.45
  const nozzleY = r.y
  for (let i = 0; i < (reducedMotion.value ? 4 : 10); i++) {
    const angle = Math.PI + (Math.random() - 0.5) * 0.5
    const speed = 2 + Math.random() * 5
    spawnParticle(
      nozzleX,
      nozzleY,
      Math.cos(angle) * speed - WORLD_SPEED_PLAYING,
      Math.sin(angle) * speed,
      i % 3 === 0 ? '#00f0ff' : i % 3 === 1 ? '#ffb627' : '#ffffff',
      1.5 + Math.random() * 2.5,
    )
  }
}

function onSpace() {
  if (mode.value === 'playing') {
    applyThrust()
  }
}

function onPointerDown(e: PointerEvent) {
  if (mode.value === 'playing') {
    applyThrust()
  } else if (mode.value === 'roaming') {
    // 漫游模式下点击非按钮区域也可以给个轻推力，产生互动反馈
    const target = e.target as HTMLElement
    if (target && target.closest('.mode-toggle')) return
    rocket.value.vy -= 1.2
    engineGlow = 0.4
  }
}

function enterGame() {
  if (mode.value === 'playing') return
  mode.value = 'playing'
  score.value = 0
  rocket.value.vy = 0
  worldOffset = 0
  particles.value = []
  collectibles.value = []
  asteroids.value = []
  floatingTexts.value = []
  collectibleSpawnTimer = 0
  asteroidSpawnTimer = 0
  emit('play')
  startLoop()
}

function enterRoaming() {
  if (mode.value === 'roaming') return
  mode.value = 'roaming'
  particles.value = []
  collectibles.value = []
  asteroids.value = []
  floatingTexts.value = []
  emit('idle')
  startLoop()
}

function updatePhysics(dt: number) {
  const canvas = gameCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const r = rocket.value

  // 重力（仅游戏模式生效；漫游模式由 targetY 直接控制位置）
  if (mode.value === 'playing') {
    r.vy += GRAVITY * dt * 60
    r.vy = Math.min(Math.max(r.vy, -10), MAX_FALL)
    r.y += r.vy * dt * 60
  }

  // 边界约束
  const margin = r.height * 0.9
  if (r.y < margin) {
    r.y = margin
    r.vy = Math.max(r.vy, 0.5)
  }
  if (r.y > rect.height - margin) {
    r.y = rect.height - margin
    r.vy = Math.min(r.vy, -0.5)
  }

  // 火箭俯仰角度（vy 向上为负，机头朝上翘；vy 向下为正，机头朝下俯）
  const targetAngle = mode.value === 'playing' ? (r.vy / MAX_FALL) * 0.35 : 0
  r.angle += (targetAngle - r.angle) * 0.1

  // 世界滚动
  const speed = mode.value === 'playing' ? WORLD_SPEED_PLAYING : WORLD_SPEED_ROAMING
  worldOffset += speed * dt * 60

  // 漫游模式自动起伏
  if (mode.value === 'roaming') {
    const targetY = rect.height * 0.48 + Math.sin(worldOffset * 0.008) * 30
    r.y += (targetY - r.y) * 0.04
    r.vy = 0

    // 漫游也产生少量尾焰
    if (Math.random() < 0.3) {
      spawnParticle(
        r.x - r.width * 0.45,
        r.y,
        -speed - Math.random() * 2,
        (Math.random() - 0.5) * 1.5,
        Math.random() > 0.5 ? '#00f0ff' : '#ffb627',
        1 + Math.random(),
      )
    }
  }

  // 引擎光晕衰减
  engineGlow *= 0.92

  // 火箭前进方向微小抖动：引擎越亮抖动越强，营造高速冲刺感
  const targetJitter =
    engineGlow > 0.05 ? (Math.random() - 0.5) * (mode.value === 'playing' ? 2.8 : 1.2) : 0
  rocketJitter += (targetJitter - rocketJitter) * 0.25

  // 星空滚动：不同层速度不同，形成视差
  const baseSpeed = mode.value === 'playing' ? WORLD_SPEED_PLAYING : WORLD_SPEED_ROAMING
  stars.value.forEach((s) => {
    s.x -= s.speed * baseSpeed * dt * 12
    if (s.x < -10) {
      s.x = rect.width + 10
      s.y = Math.random() * rect.height
    }
    s.twinklePhase += s.twinkleSpeed * dt * 3
  })

  // 流星生成与更新
  shootingStarTimer += dt * 60
  const shootingStarInterval = mode.value === 'playing' ? 90 : 160
  if (shootingStarTimer > shootingStarInterval + Math.random() * 80) {
    spawnShootingStar(rect.width, rect.height)
    shootingStarTimer = 0
  }
  shootingStars.value.forEach((ss) => {
    ss.x += ss.vx * dt * 60
    ss.y += ss.vy * dt * 60
    ss.life -= dt / 1.2
  })
  shootingStars.value = shootingStars.value.filter((ss) => ss.life > 0 && ss.x > -200)

  // 粒子更新
  particles.value.forEach((p) => {
    p.x += p.vx * dt * 60
    p.y += p.vy * dt * 60
    p.life -= dt / p.maxLife
  })
  particles.value = particles.value.filter((p) => p.life > 0)

  // 收集物生成
  if (mode.value === 'playing') {
    collectibleSpawnTimer += dt * 60
    if (collectibleSpawnTimer > 55) {
      spawnCollectible()
      collectibleSpawnTimer = 0
    }
  }

  // 收集物更新与碰撞
  collectibles.value.forEach((c) => {
    c.x += c.vx * dt * 60
    c.y += c.vy * dt * 60
    c.rotation += dt * 2
    c.pulse += dt * 5

    if (!c.collected) {
      const dx = c.x - r.x
      const dy = c.y - r.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < c.radius + r.width * 0.5) {
        c.collected = true
        score.value++
        scoreBump.value = true
        setTimeout(() => (scoreBump.value = false), 180)
        spawnFloatingText(c.x, c.y - 20, '+1', '#39ff14')
        // 收集爆炸粒子
        for (let i = 0; i < (reducedMotion.value ? 6 : 14); i++) {
          const angle = (i / 14) * Math.PI * 2
          spawnParticle(
            c.x,
            c.y,
            Math.cos(angle) * (2 + Math.random() * 4),
            Math.sin(angle) * (2 + Math.random() * 4),
            ['#00f0ff', '#39ff14', '#ffb627', '#ff4d6d'][i % 4],
            1.5 + Math.random() * 2,
          )
        }
      }
    }
  })
  collectibles.value = collectibles.value.filter((c) => c.x > -80 && !c.collected)

  // 小行星生成
  if (mode.value === 'playing') {
    asteroidSpawnTimer += dt * 60
    if (asteroidSpawnTimer > 140) {
      spawnAsteroid()
      asteroidSpawnTimer = 0
    }
  }

  // 小行星更新
  asteroids.value.forEach((a) => {
    a.x += a.vx * dt * 60
    a.rotation += a.rotSpeed * dt * 60
  })
  asteroids.value = asteroids.value.filter((a) => a.x > -a.radius - 50)

  // 飘字更新
  floatingTexts.value.forEach((ft) => {
    ft.y -= dt * 40
    ft.life -= dt
  })
  floatingTexts.value = floatingTexts.value.filter((ft) => ft.life > 0)
}

function drawRocket() {
  if (!ctx) return
  const r = rocket.value
  ctx.save()
  ctx.translate(r.x + rocketJitter, r.y)
  // 机头朝右，vy 向上时机头略上翘
  ctx.rotate(r.angle)

  const w = r.width
  const h = r.height

  // 引擎辉光（尾部左侧）
  const glow = 0.3 + engineGlow * 0.7
  const glowGradient = ctx.createRadialGradient(-w * 0.45, 0, 2, -w * 0.45, 0, 45 * glow)
  glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  glowGradient.addColorStop(0.2, 'rgba(255, 182, 39, 0.75)')
  glowGradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.35)')
  glowGradient.addColorStop(1, 'rgba(0, 240, 255, 0)')
  ctx.fillStyle = glowGradient
  ctx.beginPath()
  ctx.arc(-w * 0.45, 0, 45 * glow, 0, Math.PI * 2)
  ctx.fill()

  // 尾翼（上下两片，在尾部左侧）
  ctx.fillStyle = '#9ca3af'
  ctx.beginPath()
  ctx.moveTo(-w * 0.35, -h * 0.32)
  ctx.lineTo(-w * 0.78, -h * 0.62)
  ctx.lineTo(-w * 0.42, -h * 0.22)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-w * 0.35, h * 0.32)
  ctx.lineTo(-w * 0.78, h * 0.62)
  ctx.lineTo(-w * 0.42, h * 0.22)
  ctx.closePath()
  ctx.fill()

  // 机身（水平圆柱）
  const bodyGradient = ctx.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5)
  bodyGradient.addColorStop(0, '#e2e8f0')
  bodyGradient.addColorStop(0.45, '#94a3b8')
  bodyGradient.addColorStop(1, '#64748b')
  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.roundRect(-w * 0.42, -h * 0.34, w * 0.78, h * 0.68, h * 0.34)
  ctx.fill()

  // 鼻锥（右侧尖锐）
  ctx.fillStyle = '#d97706'
  ctx.beginPath()
  ctx.moveTo(w * 0.36, -h * 0.34)
  ctx.quadraticCurveTo(w * 0.92, 0, w * 0.36, h * 0.34)
  ctx.lineTo(w * 0.36, -h * 0.34)
  ctx.closePath()
  ctx.fill()

  // 鼻锥高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.beginPath()
  ctx.moveTo(w * 0.36, -h * 0.18)
  ctx.quadraticCurveTo(w * 0.72, 0, w * 0.36, h * 0.18)
  ctx.lineTo(w * 0.36, -h * 0.18)
  ctx.closePath()
  ctx.fill()

  // 隔热瓦/铆钉线
  ctx.strokeStyle = 'rgba(80, 50, 30, 0.2)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const x = -w * 0.22 + i * w * 0.18
    ctx.beginPath()
    ctx.moveTo(x, -h * 0.3)
    ctx.lineTo(x, h * 0.3)
    ctx.stroke()
  }

  // 舷窗（机身中部偏右）
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(w * 0.08, -h * 0.05, h * 0.22, 0, Math.PI * 2)
  ctx.fill()
  const windowGlow = ctx.createRadialGradient(w * 0.05, -h * 0.1, 2, w * 0.08, -h * 0.05, h * 0.22)
  windowGlow.addColorStop(0, '#7dd3fc')
  windowGlow.addColorStop(0.55, '#0ea5e9')
  windowGlow.addColorStop(1, '#0f172a')
  ctx.fillStyle = windowGlow
  ctx.beginPath()
  ctx.arc(w * 0.08, -h * 0.05, h * 0.18, 0, Math.PI * 2)
  ctx.fill()

  // 喷口（左侧）
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.moveTo(-w * 0.42, -h * 0.2)
  ctx.lineTo(-w * 0.58, -h * 0.28)
  ctx.lineTo(-w * 0.58, h * 0.28)
  ctx.lineTo(-w * 0.42, h * 0.2)
  ctx.closePath()
  ctx.fill()

  // 喷口内部火光
  ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + engineGlow * 0.4})`
  ctx.beginPath()
  ctx.ellipse(-w * 0.5, 0, w * 0.06, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawParticles() {
  if (!ctx) return
  particles.value.forEach((p) => {
    const alpha = Math.max(0, p.life)
    ctx!.globalAlpha = alpha
    ctx!.fillStyle = p.color
    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
    ctx!.fill()
  })
  ctx!.globalAlpha = 1
}

function drawCollectibles() {
  if (!ctx) return
  collectibles.value.forEach((c) => {
    if (c.collected) return
    ctx!.save()
    ctx!.translate(c.x, c.y)
    ctx!.rotate(c.rotation)

    const pulseScale = 1 + Math.sin(c.pulse) * 0.12
    ctx!.scale(pulseScale, pulseScale)

    // 外发光
    const glow = ctx!.createRadialGradient(0, 0, c.radius * 0.3, 0, 0, c.radius * 2)
    glow.addColorStop(0, 'rgba(57, 255, 20, 0.6)')
    glow.addColorStop(1, 'rgba(57, 255, 20, 0)')
    ctx!.fillStyle = glow
    ctx!.beginPath()
    ctx!.arc(0, 0, c.radius * 2, 0, Math.PI * 2)
    ctx!.fill()

    // 八面晶体
    ctx!.fillStyle = '#39ff14'
    ctx!.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = i % 2 === 0 ? c.radius : c.radius * 0.55
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) ctx!.moveTo(x, y)
      else ctx!.lineTo(x, y)
    }
    ctx!.closePath()
    ctx!.fill()

    // 内核
    ctx!.fillStyle = '#e8f4ff'
    ctx!.beginPath()
    ctx!.arc(0, 0, c.radius * 0.25, 0, Math.PI * 2)
    ctx!.fill()

    ctx!.restore()
  })
}

function drawAsteroids() {
  if (!ctx) return
  asteroids.value.forEach((a) => {
    ctx!.save()
    ctx!.translate(a.x, a.y)
    ctx!.rotate(a.rotation)

    const gradient = ctx!.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, 2, 0, 0, a.radius)
    gradient.addColorStop(0, '#4b5563')
    gradient.addColorStop(0.6, '#1f2937')
    gradient.addColorStop(1, '#0f172a')
    ctx!.fillStyle = gradient
    ctx!.beginPath()
    a.vertices.forEach((v, i) => {
      if (i === 0) ctx!.moveTo(v.x, v.y)
      else ctx!.lineTo(v.x, v.y)
    })
    ctx!.closePath()
    ctx!.fill()

    // 坑洞
    ctx!.fillStyle = 'rgba(0,0,0,0.35)'
    ctx!.beginPath()
    ctx!.arc(a.radius * 0.25, -a.radius * 0.15, a.radius * 0.18, 0, Math.PI * 2)
    ctx!.fill()
    ctx!.beginPath()
    ctx!.arc(-a.radius * 0.2, a.radius * 0.3, a.radius * 0.12, 0, Math.PI * 2)
    ctx!.fill()

    ctx!.restore()
  })
}

function drawFloatingTexts() {
  if (!ctx) return
  floatingTexts.value.forEach((ft) => {
    const alpha = Math.max(0, ft.life)
    ctx!.globalAlpha = alpha
    ctx!.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx!.fillStyle = ft.color
    ctx!.shadowColor = ft.color
    ctx!.shadowBlur = 12
    ctx!.fillText(ft.text, ft.x, ft.y)
    ctx!.shadowBlur = 0
  })
  ctx!.globalAlpha = 1
}

function drawStarfield() {
  if (!ctx) return
  const time = Date.now() / 1000
  stars.value.forEach((s) => {
    // 减少动画模式下星星不滚动、不闪烁，但仍可见
    const twinkle = reducedMotion.value ? 1 : 0.75 + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25
    const alpha = s.opacity * twinkle

    // 给较亮的星星加柔和光晕，更容易被看到
    if (s.size > 1.8 && alpha > 0.5) {
      const r = parseInt(s.color.slice(1, 3), 16)
      const g = parseInt(s.color.slice(3, 5), 16)
      const b = parseInt(s.color.slice(5, 7), 16)
      const glow = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3)
      glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2)
      ctx!.fill()
    }

    ctx!.globalAlpha = alpha
    ctx!.fillStyle = s.color
    ctx!.beginPath()
    ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx!.fill()

    // 稍大的星星加十字高光，更像星星
    if (s.size > 2.2 && alpha > 0.5) {
      ctx!.globalAlpha = alpha * 0.5
      ctx!.fillRect(s.x - s.size * 2, s.y - 0.5, s.size * 4, 1)
      ctx!.fillRect(s.x - 0.5, s.y - s.size * 2, 1, s.size * 4)
    }
  })
  ctx!.globalAlpha = 1
}

function drawShootingStars() {
  if (!ctx || reducedMotion.value) return
  shootingStars.value.forEach((ss) => {
    const alpha = Math.max(0, ss.life * ss.opacity)
    ctx!.globalAlpha = alpha

    // 流星头部
    ctx!.fillStyle = '#ffffff'
    ctx!.beginPath()
    ctx!.arc(ss.x, ss.y, 2, 0, Math.PI * 2)
    ctx!.fill()

    // 拖尾
    const tailX = ss.x - ss.vx * (ss.length / 12)
    const tailY = ss.y - ss.vy * (ss.length / 12)
    const gradient = ctx!.createLinearGradient(ss.x, ss.y, tailX, tailY)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.3, 'rgba(0,240,255,0.5)')
    gradient.addColorStop(1, 'rgba(0,240,255,0)')
    ctx!.strokeStyle = gradient
    ctx!.lineWidth = 2
    ctx!.lineCap = 'round'
    ctx!.beginPath()
    ctx!.moveTo(ss.x, ss.y)
    ctx!.lineTo(tailX, tailY)
    ctx!.stroke()
  })
  ctx!.globalAlpha = 1
}

function drawFrame(time: number) {
  if (!ctx || !gameCanvas.value) return
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016
  lastTime = time

  const rect = gameCanvas.value.getBoundingClientRect()
  ctx.clearRect(0, 0, rect.width, rect.height)

  updatePhysics(dt)
  drawStarfield()
  drawShootingStars()
  drawAsteroids()
  drawCollectibles()
  drawParticles()
  drawRocket()
  drawFloatingTexts()

  rafId = requestAnimationFrame(drawFrame)
}

function startLoop() {
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

function finish() {
  if (mode.value === 'finishing') return
  mode.value = 'finishing'
  stopLoop()
  setTimeout(() => {
    emit('done')
  }, 1200)
}

watch(
  () => props.completed,
  (done) => {
    if (done) finish()
  },
)

onMounted(() => {
  nextTick(() => {
    resizeCanvas()
    startLoop()
  })

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('pointerdown', onPointerDown)

  if (moduleRef.value) {
    resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(moduleRef.value)
  }
})

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('pointerdown', onPointerDown)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.star-waiting-module {
  position: relative;
  width: 100%;
  min-height: 480px;
  height: 100%;
  border-radius: var(--xt-radius-lg);
  overflow: hidden;
  background: radial-gradient(ellipse at 20% 30%, rgba(10, 12, 28, 0.95) 0%, #03040a 60%, #020205 100%);
  outline: none;
  user-select: none;
}

/* 背景层 */
.space-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.nebula {
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(circle at 70% 30%, rgba(255, 77, 109, 0.08) 0%, transparent 35%),
    radial-gradient(circle at 30% 70%, rgba(0, 240, 255, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(255, 182, 39, 0.05) 0%, transparent 30%);
  animation: nebula-drift 28s linear infinite;
}

@keyframes nebula-drift {
  from { transform: rotate(0deg) scale(1.1); }
  to { transform: rotate(360deg) scale(1.1); }
}

/* 天体 */
.celestial {
  position: absolute;
  pointer-events: none;
}

.gas-giant {
  top: 8%;
  right: 12%;
  width: 160px;
  height: 160px;
}

.gas-giant .planet-body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    linear-gradient(150deg, rgba(232,244,255,0.12) 0%, transparent 40%),
    radial-gradient(circle at 35% 35%, #5a6478 0%, #2a3142 45%, #101520 100%);
  box-shadow:
    inset -20px -20px 40px rgba(0,0,0,0.6),
    inset 10px 10px 30px rgba(232,244,255,0.08),
    0 0 60px rgba(255,255,255,0.06);
}

.gas-giant .planet-ring {
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  border: 2px solid rgba(232,244,255,0.15);
  transform: rotateX(72deg) rotateY(-12deg) rotateZ(25deg);
  box-shadow: 0 0 20px rgba(0,240,255,0.1);
  animation: ring-spin 30s linear infinite;
}

.lava-planet {
  bottom: 12%;
  left: 8%;
  width: 80px;
  height: 80px;
}

.lava-planet .planet-body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #ff6b4a 0%, #b91c1c 40%, #450a0a 100%);
  box-shadow:
    inset -10px -10px 20px rgba(0,0,0,0.6),
    0 0 30px rgba(255,77,109,0.2);
}

.lava-planet .planet-body::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    linear-gradient(60deg, transparent 55%, rgba(255,182,39,0.35) 60%, transparent 65%),
    linear-gradient(120deg, transparent 35%, rgba(255,77,109,0.3) 40%, transparent 45%);
}

.lava-planet .atmosphere {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid rgba(255,77,109,0.25);
  box-shadow: 0 0 16px rgba(255,77,109,0.15);
}

.station {
  top: 35%;
  right: 28%;
  width: 90px;
  height: 60px;
  opacity: 0.55;
  animation: station-float 12s ease-in-out infinite;
}

.station-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.station-core {
  fill: rgba(200,208,231,0.08);
  stroke: rgba(232,244,255,0.35);
  stroke-width: 1;
}

.station-arm {
  fill: rgba(200,208,231,0.1);
  stroke: rgba(232,244,255,0.25);
  stroke-width: 0.8;
}

.station-light {
  animation: blink 2s infinite;
}

.station-light.red { fill: #ff4d6d; animation-delay: 0s; }
.station-light.green { fill: #39ff14; animation-delay: 0.6s; }
.station-light.cyan { fill: #00f0ff; animation-delay: 1.2s; }

@keyframes ring-spin {
  from { transform: rotateX(72deg) rotateY(-12deg) rotateZ(0deg); }
  to { transform: rotateX(72deg) rotateY(-12deg) rotateZ(360deg); }
}

@keyframes station-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(1.5deg); }
}

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 流星 */
.meteor {
  position: absolute;
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(232,244,255,0.9) 50%, rgba(0,240,255,0.4) 100%);
  border-radius: 2px;
  opacity: 0;
}

.meteor-1 {
  top: 18%;
  left: -120px;
  animation: meteor-fly 4.5s 0.5s infinite;
}

.meteor-2 {
  top: 52%;
  left: -120px;
  animation: meteor-fly 6s 2.5s infinite;
  transform: rotate(8deg);
}

.meteor-3 {
  top: 34%;
  left: -120px;
  animation: meteor-fly 7.5s 4.5s infinite;
  transform: rotate(-5deg);
}

.meteor-4 {
  top: 72%;
  left: -120px;
  animation: meteor-fly 5.5s 6s infinite;
  transform: rotate(12deg);
}

@keyframes meteor-fly {
  0% { transform: translateX(0) rotate(-15deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(calc(100vw + 240px)) rotate(-15deg); opacity: 0; }
}

/* HUD 扫描线 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.4), transparent);
  opacity: 0.35;
  animation: scan 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes scan {
  0% { top: 0; opacity: 0; }
  10% { opacity: 0.35; }
  90% { opacity: 0.35; }
  100% { top: 100%; opacity: 0; }
}

/* Canvas */
.game-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

/* HUD 层 */
.hud-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  pointer-events: none;
}

.hud-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  pointer-events: auto;
}

.mission-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mission-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgba(0, 240, 255, 0.7);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}

.mission-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #e8f4ff;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}

.score-board {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 8px 14px;
  border-radius: var(--xt-radius-sm);
  background: rgba(3, 4, 10, 0.55);
  border: 1px solid rgba(57, 255, 20, 0.25);
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.1);
}

.score-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(57, 255, 20, 0.75);
}

.score-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 24px;
  font-weight: 800;
  color: #39ff14;
  text-shadow: 0 0 16px rgba(57, 255, 20, 0.6);
  transition: transform 0.15s ease;
}

.score-board.bump .score-value {
  transform: scale(1.25);
}

.mode-toggle {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid rgba(0, 240, 255, 0.45);
  border-radius: 999px;
  background: rgba(3, 4, 10, 0.5);
  backdrop-filter: blur(8px);
  color: #e8f4ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
  transition: all 0.25s ease;
}

.mode-toggle:hover {
  border-color: #00f0ff;
  box-shadow: 0 0 28px rgba(0, 240, 255, 0.25), inset 0 0 12px rgba(0, 240, 255, 0.08);
  transform: translateY(-1px);
}

.mode-toggle.back {
  border-color: rgba(232, 244, 255, 0.3);
  box-shadow: 0 0 16px rgba(232, 244, 255, 0.08);
}

.mode-toggle.back:hover {
  border-color: rgba(232, 244, 255, 0.6);
  box-shadow: 0 0 24px rgba(232, 244, 255, 0.15);
}

.toggle-icon {
  font-size: 16px;
  filter: drop-shadow(0 0 6px rgba(255,182,39,0.5));
}

/* 冷知识终端 */
.tip-terminal {
  align-self: center;
  max-width: 720px;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--xt-radius-md);
  background: rgba(3, 4, 10, 0.55);
  border: 1px solid rgba(232, 244, 255, 0.12);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  pointer-events: auto;
}

.tip-pulse {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: #39ff14;
  box-shadow: 0 0 10px #39ff14;
  animation: pulse-beat 1.5s ease-in-out infinite;
}

@keyframes pulse-beat {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

.tip-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(232, 244, 255, 0.88);
}

/* 过渡动画 */
.tip-enter-active,
.tip-leave-active {
  transition: all 0.32s ease;
}

.tip-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tip-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 完成覆盖层 */
.finish-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(3, 4, 10, 0.85);
  backdrop-filter: blur(6px);
  animation: finish-fade 1.2s ease forwards;
  z-index: 10;
}

.finish-core {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.finish-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #00f0ff;
  border-right-color: #39ff14;
  animation: finish-spin 0.8s linear infinite;
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
}

.finish-text {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #e8f4ff;
  text-shadow: 0 0 16px rgba(0, 240, 255, 0.5);
}

@keyframes finish-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes finish-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 减少动画 */
.reduced-motion .nebula,
.reduced-motion .planet-ring,
.reduced-motion .meteor,
.reduced-motion .scan-line,
.reduced-motion .station-light,
.reduced-motion .finish-ring {
  animation: none !important;
}

.reduced-motion .station {
  animation: none;
}

.reduced-motion .tip-enter-from,
.reduced-motion .tip-leave-to {
  transform: none;
}

/* 响应式 */
@media (max-width: 640px) {
  .star-waiting-module {
    min-height: 520px;
  }

  .hud-layer {
    padding: 16px;
  }

  .mission-name {
    font-size: 16px;
  }

  .mode-toggle {
    padding: 8px 14px;
    font-size: 12px;
  }

  .tip-terminal {
    padding: 12px 14px;
  }

  .tip-text {
    font-size: 13px;
  }

  .score-value {
    font-size: 20px;
  }
}
</style>
