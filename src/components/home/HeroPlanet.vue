<template>
  <div class="hero-planet" aria-hidden="true">
    <div class="planet-halo" />

    <!-- 行星环（后半，被星球遮挡）：三环同一扁椭圆平面 -->
    <div
      v-for="r in rings"
      :key="`back-${r.size}`"
      class="ring ring-back"
      :style="ringStyle(r)"
    />

    <div class="planet-body">
      <div class="planet-texture" />
      <div class="planet-shade" />
      <div class="planet-rim" />
      <div class="planet-light" />
    </div>

    <!-- 行星环（前半，遮挡星球下缘）：前亮后淡 -->
    <div
      v-for="r in rings"
      :key="`front-${r.size}`"
      class="ring ring-front"
      :style="ringStyle(r)"
    />

    <!-- 环绕光点：贴着内/外环运行（琥珀 / 暖白） -->
    <div class="orbit orbit-1"><span class="sat sat-amber" /></div>
    <div class="orbit orbit-2"><span class="sat sat-warm" /></div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HeroPlanet' })

/** 三环系统：同一扁椭圆倾角，主环最亮，内/外环递减 */
const rings = [
  { size: 86, alpha: 0.22 },
  { size: 108, alpha: 0.4 },
  { size: 122, alpha: 0.28 },
]

function ringStyle(r: { size: number; alpha: number }) {
  return {
    width: `${r.size}%`,
    height: `${r.size}%`,
    '--ring-alpha': r.alpha,
  } as Record<string, string | number>
}
</script>

<style scoped>
.hero-planet {
  position: relative;
  width: min(100%, 520px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

/* 微弱暖调光晕（克制，非大面积彩色） */
.planet-halo {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(232, 163, 61, 0.14), transparent 62%);
  filter: blur(36px);
  animation: halo-breathe 6s ease-in-out infinite;
}

@keyframes halo-breathe {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

/* —— 暖金行星：多层径向渐变 + 立体光影 —— */
.planet-body {
  position: relative;
  z-index: 2;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(circle at 32% 26%, #f6cd82 0%, #e8a33d 20%, #6b5a3e 54%, #100d08 100%);
  box-shadow:
    /* 主阴影：右下大面积暗部 */
    inset -34px -28px 70px rgba(4, 3, 2, 0.9),
    /* 受光面内侧反光 */
    inset 14px 10px 40px rgba(255, 248, 236, 0.16),
    /* 球体轮廓微光边 */
    inset 0 0 0 1px rgba(255, 248, 236, 0.06);
}

/* 表面陨石坑：深坑 + 坑缘亮边成对出现，强化凹凸感 */
.planet-texture {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 31% 41%, rgba(255, 248, 236, 0.14) 0 1.5%, transparent 3.5%),
    radial-gradient(circle at 30% 40%, rgba(16, 12, 7, 0.5) 0 6%, transparent 9%),
    radial-gradient(circle at 59% 63%, rgba(255, 248, 236, 0.12) 0 1.5%, transparent 3.5%),
    radial-gradient(circle at 58% 62%, rgba(16, 12, 7, 0.45) 0 8%, transparent 11%),
    radial-gradient(circle at 44% 74%, rgba(16, 12, 7, 0.35) 0 5%, transparent 8%),
    radial-gradient(circle at 68% 34%, rgba(255, 248, 236, 0.14) 0 7%, transparent 10%),
    radial-gradient(circle at 22% 66%, rgba(255, 248, 236, 0.1) 0 5%, transparent 8%);
  animation: planet-drift 48s linear infinite;
}

@keyframes planet-drift {
  from { transform: translateX(0); }
  to { transform: translateX(12%); }
}

/* 晨昏线阴影：暗部更深、过渡更陡 */
.planet-shade {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 76% 80%, rgba(4, 3, 2, 0.85), transparent 58%);
}

/* 暗部侧反照（轮廓光）：让球体从背景里「转」出来 */
.planet-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset -4px -4px 10px rgba(240, 188, 102, 0.28),
    inset 2px 2px 6px rgba(255, 250, 238, 0.12);
}

/* 高光：主光斑 + 锐利光核 */
.planet-light {
  position: absolute;
  top: 11%;
  left: 17%;
  width: 30%;
  height: 20%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 250, 238, 0.5), transparent 70%);
  filter: blur(6px);
  transform: rotate(-18deg);
}

.planet-light::after {
  content: '';
  position: absolute;
  top: 28%;
  left: 28%;
  width: 26%;
  height: 26%;
  border-radius: 50%;
  background: rgba(255, 252, 244, 0.6);
  filter: blur(3px);
}

/* —— 行星环：三环同一扁椭圆，前后两段实现遮挡，前亮后淡 —— */
.ring {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  transform: rotateX(74deg) rotateZ(-14deg);
  pointer-events: none;
}

/* 后半段（被星球遮挡）：淡而细 */
.ring-back {
  z-index: 1;
  border-width: 1px;
  border-color: rgba(232, 163, 61, calc(var(--ring-alpha, 0.4) * 0.3));
}

/* 前半段（近侧）：只保留下半弧，弧两端渐淡 */
.ring-front {
  z-index: 3;
  border-width: 1.5px;
  border-color: rgba(232, 163, 61, var(--ring-alpha, 0.4));
  clip-path: inset(52% 0 0 0);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent);
}

/* —— 环绕光点：贴着外环（琥珀）与内环（暖白）运行 —— */
.orbit {
  position: absolute;
  border-radius: 50%;
  transform: rotateX(74deg) rotateZ(-14deg);
  animation: orbit-spin 26s linear infinite;
  pointer-events: none;
  z-index: 3;
}

.orbit-1 {
  width: 122%;
  height: 122%;
}

.orbit-2 {
  width: 86%;
  height: 86%;
  animation-duration: 38s;
  animation-direction: reverse;
}

.sat {
  position: absolute;
  top: -3px;
  left: 50%;
  border-radius: 50%;
}

.sat-amber {
  width: 7px;
  height: 7px;
  background: #e8a33d;
}

.sat-warm {
  width: 5px;
  height: 5px;
  background: #e8e6e0;
}

@keyframes orbit-spin {
  from { transform: rotateX(74deg) rotateZ(-14deg) rotate(0deg); }
  to { transform: rotateX(74deg) rotateZ(-14deg) rotate(360deg); }
}

@media (max-width: 768px) {
  .hero-planet {
    width: min(72vw, 300px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .planet-texture,
  .planet-halo,
  .orbit {
    animation: none;
  }
}
</style>
