/**
 * 星途 · 破晓主题状态机
 *
 * 铁律实现：
 * - 状态只存一处：document.documentElement.dataset.theme ∈ {'night','dawn'}，
 *   镜像写入 localStorage('xt-theme')；index.html 内联脚本在首帧前读取，杜绝 FOUC
 * - 全应用只允许这一条 GSAP timeline 负责切换：模块加载时创建一次、反复复用；
 *   中途再点 = 当前进度直接反转，禁止 kill/重建
 * - prefers-reduced-motion：跳过全部动效，仅 0.3s 透明度淡切
 *
 * 视觉状态收敛为一条时间线插值的 8 个标量（phase/bright/radiusK/…），
 * HeroCanvas（星空 + WebGL 星球）与 DOM 动效层（揭示层/破晓环）都从这里取帧。
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

export type DawnTheme = 'night' | 'dawn'

export interface DawnFrame {
  /** 破晓相位 0→1（WebGL 星球 uPhase：光照扫过 + 纹理自转 180°，全程不停顿） */
  phase: number
  /** 星球亮度 1.0 → 1.18（随自转爬升） → 1.5（铺满后绽放） → 1.25（恒星态），无平台无爆闪 */
  bright: number
  /** 星场渐亮 0→1：光锋面启程前，星星先被星球的晨光整体唤醒（先点亮星空，再点亮世界） */
  starGlow: number
  /** 星场裹挟进度 0→1：匀速旋转（不随自转缓动刹车），直到光圈铺满全屏才停 */
  swirl: number
  /** 绽放脉冲 0→1：铺满瞬间从球心荡开的柔光余晖（确认感），仅转场末段非零 */
  pulse: number
  /** 破晓环/揭示层归一化半径 0→1（光锋面：随球亮起即由球心向外连续铺满） */
  radiusK: number
  /** 破晓环透明度：光锋面的亮边，扩散中段达峰，抵达边缘前自然衰减 */
  ringOpacity: number
  /** 夜空环带变暖 #060608 → #221B14 */
  skyWarm: number
  /** 星球按压回弹 0.96 → 1.0：点击当刻的触感反馈（pressKick 独立驱动，不在时间线内） */
  press: number
  /** 揭示层透明度：铺满后淡出 */
  revealAlpha: number
  /** 残余星星 → 白昼微尘 */
  dustFade: number
  /** 时间线运行中（星星冻结、动效层显示的开关） */
  active: boolean
  theme: DawnTheme
}

export type DawnSubscriber = (f: DawnFrame) => void

const STORAGE_KEY = 'xt-theme'
/**
 * 主题翻转阈值（v6 规范第四节）：揭示圈半径 ≥ 球心到 Hero 文字块最远角 + 40px 即翻转，
 * 消除"浅色夜文字叠在白昼底色上"的灰影窗口。HeroCanvas 触发沿冻结时按实测几何注入；
 * 缺省 1（= 铺满全画布才翻转，对应非首页入口与注入前的安全回退）
 */
let flipRadiusK = 1
/** 注入文字块覆盖阈值（radiusK 量纲），仅在触发沿冻结时调用 */
export function setDawnFlipRadiusK(k: number) {
  flipRadiusK = Math.min(1, Math.max(0, k))
}
/** 日常入口（导航按钮）复用同一时间线，时长压缩 2.4s → 1.2s */
const NAV_TIMESCALE = 2
/** 星球点击完整仪式 2.4s（v9.2：总时长恢复，重新分配编舞——光锋面铺满与星辉点亮过程拉长） */
const PLANET_TIMESCALE = 1
/*
 * 回夜倒放起点（v10）：正放 2.2s 之后只剩"脉冲独占窗口"（其他标量都停在终点），
 * 从终点倒放会造成"点击后世界先愣住、只有光环在动"。回夜改为从 2.2s 起倒放——
 * 星辉回转 / 光界回退 / 天空变暗从点击当帧就与脉冲同步启动；
 * 2.2s 处脉冲标量 ≈0.28，收缩光环由渲染侧以点击为零位即时回放（HeroCanvas reverseStartP）；
 * 2.2s 处揭示层透明度 0.5 / 天空暖度 0.25 的跳变量与页面同色系，视觉上不可察觉
 */
const REVERSE_START_TIME = 2.2

gsap.registerPlugin(CustomEase)
// 光先快后慢：cubic-bezier(0.16, 1, 0.3, 1)
CustomEase.create('dawnOut', '0.16, 1, 0.3, 1')
// 星球自转：慢启动 - 中段快 - 缓落定（禁止线性）
CustomEase.create('dawnPhase', '0.55, 0.02, 0.15, 1')

function readInitialTheme(): DawnTheme {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dawn') {
    return 'dawn'
  }
  return 'night'
}

export const dawnTheme: Ref<DawnTheme> = ref(readInitialTheme())

function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/* —— 唯一时间线驱动的状态（只允许时间线写，订阅者只读） —— */
const state = {
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
}

const subscribers = new Set<DawnSubscriber>()
let frame: DawnFrame = { ...state, active: false, theme: dawnTheme.value }

function applyTheme(t: DawnTheme) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch {
    /* 隐私模式等场景下 localStorage 不可写：仅内存态生效 */
  }
  dawnTheme.value = t
}

/** 阶段④：界面点亮 —— 导航/标题 y:12→0，stagger 0.06（仅正播入昼触发，反向不动界面） */
function heroEntrance() {
  const selectors = ['.layout .bar', '.home-hero .hero-copy > *']
  const els = selectors.flatMap((s) => Array.from(document.querySelectorAll(s)))
  if (!els.length) return
  gsap.fromTo(
    els,
    { y: 12, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'dawnOut',
      stagger: 0.06,
      overwrite: 'auto',
      clearProps: 'transform,opacity',
    },
  )
}

function sync() {
  // 半径驱动翻转（v6）：正放盖过文字块即入昼、回放退出文字块即入夜，两个方向同一阈值，无迟滞
  const want: DawnTheme = state.radiusK >= flipRadiusK ? 'dawn' : 'night'
  if (want !== dawnTheme.value) {
    applyTheme(want)
    if (tl.isActive() && !isReducedMotion()) heroEntrance()
  }
  frame = { ...state, active: tl.isActive(), theme: dawnTheme.value }
  subscribers.forEach((cb) => cb(frame))
}

/*
 * 破晓时间线（总时长 2.4s，仅首页 Hero 有完整视觉；其他页面复用同一进度驱动翻转到 data-theme）
 * v4 因果连续模型（星球是光源，一切光效随自转同步发生）+ v6 时序修正 + v9.3 顺序重排：
 *   自转 0.05→2.2s 全程不停；星场先被晨光整体唤醒（0.1→0.9s 渐亮），光圈 0.7s 才启程、
 *   1.5s 铺满（2.2s）——先点亮星空，再点亮世界；铺满后 uBright 绽放至 1.5 再平复 1.25；
 *   主题翻转 = 半径驱动：揭示圈盖住 Hero 文字块（最远角+40px）即翻转 data-theme，消除文字灰影窗口；
 *   回夜 = 同一时间线反向播放：光随自转回收、由外而内熄灭 —— 同一物理过程的两个方向。
 * 参与者：①星球=主角 ②星星=被晨光点亮再吞没 ③天空=从球心向外变暖 ④破晓环=光的边界 ⑤揭示层=带来白昼
 */
const tl = gsap.timeline({
  paused: true,
  onUpdate: sync,
  onComplete: sync,
  onReverseComplete: sync,
})

/*
 * 星球按压回弹（0.96→1.0，全片唯一回弹）不在时间线内——
 * 它是"点击当刻"的触感反馈，由 toggleDawn 经 pressKick 独立触发（正反向点击都有）；
 * 若在时间线 0–0.15s 段内，倒放会把它排到转场末尾，back.out 过冲表现为
 * "回夜结束时星球震一下"（v10.1 修复）
 */
function pressKick() {
  gsap.fromTo(
    state,
    { press: 0.96 },
    { press: 1, duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto', onUpdate: sync },
  )
}

// 自转 + 点亮全程同步：相位 0.05→2.2s 不停顿（慢启动-中段快-缓落定）；
// 亮度前段随自转平滑爬升（无平台），世界铺满后绽放一次再安定（v6 规范第三节：
// 过冲必须发生在揭示圈铺满画布之后，否则闪耀被揭示层盖住观众看不见）
tl.to(state, { phase: 1, duration: 2.15, ease: 'dawnPhase' }, 0.05)
// v9.8：取消 uBright 1.5 绽放尖峰——白昼画面上的全局亮度骤升骤降是"白色频闪"，观感差；
// 亮度全程平滑爬升至 1.25 恒星态，"光覆盖世界"的高潮确认改由绽放脉冲（pulse）承担
tl.to(state, { bright: 1.25, duration: 2.15, ease: 'power1.inOut' }, 0.05)

// v9.3 时序重排：先点亮星空，再点亮世界 ——
// ① 星场渐亮（0.1→0.9s）：光锋面启程前，星星先被星球的晨光整体唤醒、越来越亮（过渡过程，
//    一开始的光芒不该强烈）；② 光圈 0.7s 才启程（星场已亮到 ~85%），1.5s 铺满（2.2s）；
// 主题翻转按文字块覆盖阈值（见 sync）
tl.to(state, { starGlow: 1, duration: 0.8, ease: 'power1.inOut' }, 0.1)
tl.to(state, { radiusK: 1, duration: 1.5, ease: 'power1.inOut' }, 0.7)
// v9.4：星场裹挟匀速推进（0.1→2.2s 线性）——持续旋转直到光圈铺满全屏才停，
// 不随自转缓动在末尾刹车；倒放同样匀速退回
tl.to(state, { swirl: 1, duration: 2.1, ease: 'none' }, 0.1)
// 破晓环 = 光锋面的亮边：随扩散自然增亮，铺满前才淡出
tl.to(state, { ringOpacity: 1, duration: 0.4, ease: 'power1.out' }, 0.75)
tl.to(state, { ringOpacity: 0, duration: 0.5, ease: 'power1.in' }, 1.6)
// 夜空环带变暖 → 融入白昼（与光锋面同步进退）
tl.to(state, { skyWarm: 1, duration: 1.1, ease: 'power1.inOut' }, 0.65)
tl.to(state, { skyWarm: 0, duration: 0.6, ease: 'power1.inOut' }, 1.75)
// 星星跟随光锋面逐渐被晨光吞没（而非阶段开关）
tl.to(state, { dustFade: 1, duration: 1.3, ease: 'power1.inOut' }, 0.8)
// 铺满（2.2s）前揭示层开始淡出，交出真实白昼界面
tl.to(state, { revealAlpha: 0, duration: 0.4, ease: 'power1.inOut' }, 2.0)
// v9.5 绽放脉冲：铺满瞬间从球心荡开的大半径柔光余晖——"光覆盖世界"的确认感；
// v9.9 放慢至 1.6s 匀速（1.75→3.35s）：荡开—驻留—散去完整可读；倒放时作为光回收前的最后一晕
tl.to(state, { pulse: 1, duration: 1.6, ease: 'none' }, 1.75)

// 以亮主题加载时直接落到终点帧（无动效）
if (dawnTheme.value === 'dawn') {
  tl.progress(1)
}

/**
 * 订阅破晓帧。立即以当前快照回调一次；返回取消订阅函数。
 * HeroCanvas 据此驱动星空吞没/天空变暖/WebGL 星球 uniform。
 */
export function subscribeDawn(cb: DawnSubscriber): () => void {
  subscribers.add(cb)
  cb(frame)
  return () => {
    subscribers.delete(cb)
  }
}

/**
 * 切换日/夜。同一入口供星球点击（2.4s 完整仪式）与导航按钮（压缩 1.2s）使用；
 * 中途再点 = 当前进度直接反转。
 */
export function toggleDawn(source: 'planet' | 'nav' = 'nav') {
  if (isReducedMotion()) {
    fadeSwitch()
    return
  }
  // 按压回弹：每次点击（含中途反向）当刻触发，独立于时间线方向
  pressKick()
  if (tl.isActive()) {
    // 中途再点：保持当前速率幅值，仅换向（GSAP 3.15 中 reversed 即负 timeScale）
    tl.reversed(!tl.reversed())
    return
  }
  /*
   * 静止于端点时才允许重设速率与方向。
   * 注意两个 GSAP 3.15 陷阱（实证）：
   * ① timeScale(正数) 会把"反向播放完毕"残留的 ts=-1 翻正并立即起播，
   *   若先归一化速率再判断 isActive() 会误判为"中途"并反转回去（表现为点击无效）；
   * ② play() 强制正向，从破晓终点回夜必须用 reverse()。
   */
  tl.timeScale(source === 'nav' ? NAV_TIMESCALE : PLANET_TIMESCALE)
  if (dawnTheme.value === 'night') {
    tl.reversed(false)
    tl.play()
  } else {
    // 回夜：从 2.2s 起倒放，跳过终点后的"脉冲独占窗口"——点击当帧，
    // 星辉回转 / 光界回退 / 天空变暗就与脉冲收缩同步启动（v10）
    tl.time(REVERSE_START_TIME)
    tl.reverse()
  }
  // 点击当帧即发布 active 快照：回夜方向第一帧就让脉冲以小半径可见态出现，
  // 不等 GSAP 下一 tick，避免用户以为没点上而二次点击把转场又反回去
  sync()
}

/** reduced-motion：跳过全部动效，仅 0.3s 透明度淡切 */
let fading = false
function fadeSwitch() {
  if (fading) return
  fading = true
  const target: DawnTheme = dawnTheme.value === 'night' ? 'dawn' : 'night'
  const app = document.getElementById('app')
  const settle = () => {
    tl.pause()
    tl.timeScale(1)
    tl.progress(target === 'dawn' ? 1 : 0) // sync：终点状态落盘 + 订阅者跳变
    if (app) {
      gsap.to(app, {
        opacity: 1,
        duration: 0.15,
        ease: 'power1.inOut',
        clearProps: 'opacity',
        onComplete: () => {
          fading = false
        },
      })
    } else {
      fading = false
    }
  }
  if (app) {
    gsap.to(app, { opacity: 0, duration: 0.15, ease: 'power1.inOut', onComplete: settle })
  } else {
    settle()
  }
}

// 开发环境调试钩子：验收录屏/中间帧取证用（生产构建不含）
if (import.meta.env.DEV) {
  ;(window as unknown as { __xtDawn?: unknown }).__xtDawn = { tl, state, toggle: toggleDawn }
}
