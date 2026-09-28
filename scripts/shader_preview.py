"""
星途破晓星球着色器 v8.2 软件复刻渲染器（验证用，不进构建）
逐行移植 src/theme/planetDawnGL.js 的 buildFragSrc，输出各相位合成图。
"""
import numpy as np
from PIL import Image
import os, json, sys

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

# ---- v8.2 默认参数（与 DAWN_GLSL_DEFAULTS 一致） ----
P = dict(EMIT_BASE=0.3, EMIT_CORE=0.85, EMIT_CORE_POW=3.0,
         CORONA_A1_DAY=0.65, CORONA_A2_DAY=0.42,
         RIM_DAY=0.45, RIM_POW=5.0, DISC_WARM=0.55,
         # v9 候选（默认 = v8.2 行为）
         LIMB_DARK=0.0, LIMB_POW=1.6,
         EMIT_CORE_RAD=0.0,      # 核心径向分量占比 0→纯dl
         HALO_WIDE=0.0,          # 白昼宽晕第三层强度
         HALO_EXTEND=0.0)        # 白昼加性晕径向延展 0→0.21R收尾
USCALE = 1 / (0.5742 * 3)

# v9 候选参数集：日出恒星（中心暖白小核→中球暖金→临边深金 limb darkening）
V9 = dict(EMIT_BASE=0.18, EMIT_CORE=0.52, EMIT_CORE_POW=3.0,
          CORONA_A1_DAY=0.90, CORONA_A2_DAY=0.44,
          RIM_DAY=0.08, RIM_POW=4.0, RIM_G=0.45, RIM_B=0.12,
          DISC_WARM=0.80, WARM_G=0.88, WARM_B=0.60,
          LIMB_DARK=1.0, LIMB_POW=2.2, LIMB_G=0.55, LIMB_B=0.24,
          EMIT_CORE_RAD=0.45,
          BASE_G=0.76, BASE_B=0.36, CORE_G=0.86, CORE_B=0.60,
          HALO_WIDE=0.10, HALO_EXTEND=1.0)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)

def mix(a, b, t):
    return a + (b - a) * t

def fract(x):
    return x - np.floor(x)

def hash31(px, py, pz):
    px = fract(px * 0.3183099 + 0.1)
    py = fract(py * 0.3183099 + 0.17)
    pz = fract(pz * 0.3183099 + 0.13)
    px *= 17.0; py *= 17.0; pz *= 17.0
    return fract(px * py * pz * (px + py + pz))

def noise3(x, y, z):
    ix, iy, iz = np.floor(x), np.floor(y), np.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz)
    def h(dx, dy, dz): return hash31(ix + dx, iy + dy, iz + dz)
    n000, n100, n010, n110 = h(0,0,0), h(1,0,0), h(0,1,0), h(1,1,0)
    n001, n101, n011, n111 = h(0,0,1), h(1,0,1), h(0,1,1), h(1,1,1)
    return mix(mix(mix(n000, n100, fx), mix(n010, n110, fx), fy),
               mix(mix(n001, n101, fx), mix(n011, n111, fx), fy), fz)

def fbm(x, y, z):
    a = 0.5; s = np.zeros_like(x)
    for _ in range(4):
        s += a * noise3(x, y, z)
        x, y, z = x * 2.03 + 1.7, y * 2.03 + 9.2, z * 2.03 + 4.1
        a *= 0.5
    return s

def tone(c):
    return np.power(1.0 - np.exp(-c * 1.6), 0.92)

def render(phase, bright, size=540, params=None):
    p = dict(P); p.update(params or {})
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) + 0.5
    res = float(size)
    uvx = ((xx * 2 - res) / res) / USCALE
    uvy = (-(yy * 2 - res) / res) / USCALE   # gl_FragCoord y 向上
    az = mix(-0.5, 0.35, phase)
    L = np.array([np.sin(az), 0.28, np.cos(az)]); L /= np.linalg.norm(L)
    rot = phase * np.pi
    ro = np.array([0.0, 0.0, 3.1])
    rdx, rdy, rdz = uvx * 0.92, uvy * 0.92, np.full_like(uvx, -1.55)
    rl = np.sqrt(rdx**2 + rdy**2 + rdz**2); rdx, rdy, rdz = rdx/rl, rdy/rl, rdz/rl
    b = ro[0]*rdx + ro[1]*rdy + ro[2]*rdz
    cc = np.dot(ro, ro) - 1.0
    h = b * b - cc
    sunAmt = 0.32 + 0.62 * phase
    col = np.zeros((size, size, 3)); alpha = np.zeros((size, size)); doTone = np.ones((size, size))

    # ---------- 球体分支 ----------
    hit = h > 0
    if hit.any():
        th = -b - np.sqrt(np.maximum(h, 0))
        px = ro[0] + rdx * th; py = ro[1] + rdy * th; pz = ro[2] + rdz * th
        nl = np.sqrt(px**2 + py**2 + pz**2); nx, ny, nz = px/nl, py/nl, pz/nl
        dl = nx * L[0] + ny * L[1] + nz * L[2]
        cr, sr = np.cos(rot), np.sin(rot)
        ntx = nx * cr + nz * sr; nty = ny; ntz = -nx * sr + nz * cr
        surf = fbm(ntx * 2.4 + 7.3, nty * 2.4 + 2.9, ntz * 2.4 + 5.1)
        detail = fbm(ntx * 6.0 + 1.0, nty * 6.0 + 1.0, ntz * 6.0 + 1.0)
        mottle = smoothstep(0.35, 0.75, surf + detail * 0.25)
        alb = np.stack([mix(0.56, 0.84, mottle), mix(0.38, 0.60, mottle), mix(0.135, 0.27, mottle)], -1)
        dark = smoothstep(0.55, 0.80, fbm(ntx * 1.6 + 11.0, nty * 1.6 + 11.0, ntz * 1.6 + 11.0))
        alb *= (1 - mix(0.18, 0.06, phase) * dark)[..., None]
        alb = mix(alb, np.array([1.0, 0.82, 0.48]), phase * 0.26)
        lit = mix(0.50, 0.76, phase) + 0.60 * np.maximum(dl, 0)
        sc = alb * lit[..., None] * np.array([1.0, 0.94, 0.82])
        hv = np.stack([L[0] - rdx, L[1] - rdy, L[2] - rdz], -1)
        hv /= np.linalg.norm(hv, axis=-1, keepdims=True)
        ndh = np.maximum(nx * hv[..., 0] + ny * hv[..., 1] + nz * hv[..., 2], 0)
        sc += np.array([1.0, 0.95, 0.85]) * (ndh ** 26)[..., None] * 0.48
        sc += np.array([0.35, 0.18, 0.05]) * (smoothstep(-0.25, 0.15, dl) * (1 - smoothstep(0.15, 0.6, dl)))[..., None] * 0.4
        sc *= bright
        ndv = np.maximum(-(nx * rdx + ny * rdy + nz * rdz), 0)
        fres = (1 - ndv) ** 3
        sc += np.array([1.0, 0.72, 0.34]) * (fres * (0.35 + 0.65 * phase) * (1 - 0.75 * phase) * (0.4 + 0.6 * smoothstep(-0.5, 0.6, dl)))[..., None] * bright
        rim = (1 - ndv) ** p['RIM_POW']
        rimClr = np.array([1.0, p.get('RIM_G', 0.66), p.get('RIM_B', 0.28)])
        sc += rimClr * (rim * phase * p['RIM_DAY'])[..., None] * bright
        # v9 临边昏暗（limb darkening，×uPhase，夜间零回归）：临边沉为深金，盘体有体积感
        sc *= mix(1.0, np.array([1.0, p.get('LIMB_G', 0.46), p.get('LIMB_B', 0.26)]),
                  (((1 - ndv) ** p['LIMB_POW']) * phase * p['LIMB_DARK'])[..., None])
        sc *= mix(1.0, np.array([1.05, p.get('WARM_G', 0.95), p.get('WARM_B', 0.78)]), phase * p['DISC_WARM'])
        sc *= mix(1.0, np.array([1.07, 0.93, 0.70]), (fres * phase * 0.3)[..., None])
        baseClr = np.array([1.0, p.get('BASE_G', 0.90), p.get('BASE_B', 0.70)])
        sc += baseClr * (phase * (0.45 + 0.75 * np.maximum(dl, 0)) * p['EMIT_BASE'])[..., None] * bright
        coreClr = np.array([1.0, p.get('CORE_G', 0.94), p.get('CORE_B', 0.78)])
        coreTerm = (np.maximum(dl, 0) ** p['EMIT_CORE_POW']) * (1 - p['EMIT_CORE_RAD']) \
                 + (ndv ** 10) * p['EMIT_CORE_RAD']
        sc += coreClr * (phase * phase * coreTerm * p['EMIT_CORE'])[..., None] * bright
        col = np.where(hit[..., None], sc, col); alpha = np.where(hit, 1.0, alpha)

    # ---------- 光晕/天空分支 ----------
    miss = ~hit
    if miss.any():
        closest = np.sqrt(np.maximum(np.dot(ro, ro) - b * b, 0))
        g = np.maximum(closest - 1.0, 0)
        a1 = mix(0.55, p['CORONA_A1_DAY'], phase)
        a2 = mix(0.30, p['CORONA_A2_DAY'], phase)
        glow = (np.exp(-g * 9.0) * a1 + np.exp(-g * 3.2) * a2 + np.exp(-g * 2.0) * 0.11 * phase) * sunAmt * bright * (1 + 0.65 * phase)
        # v9 白昼宽晕第三层（cosmos 式多层指数衰减）+ 径向收尾随 phase 延展（夜间逐位不变）
        glow += np.exp(-g * 1.5) * p['HALO_WIDE'] * phase * sunAmt * bright
        cut0 = mix(0.10, 0.18, phase * p['HALO_EXTEND'])
        cut1 = mix(0.21, 0.85, phase * p['HALO_EXTEND'])
        glow *= 1 - smoothstep(cut0, cut1, g)
        light = np.stack([glow, glow * 0.66, glow * 0.30], -1)
        light = 1 - np.exp(-light * 1.6); light = np.power(light, 0.92)
        a = np.clip(glow * 1.25, 0, 0.98)
        nightCol = light * (a ** 3)[..., None]
        nightAlpha = a ** 2 * (1 - phase)
        hueT = smoothstep(0.02, 0.16, g)[..., None]
        glowHue = mix(np.array([1.0, 0.58, 0.22]), np.array([1.0, 0.84, 0.58]), hueT)
        glowLin = glowHue * (glow * 0.55)[..., None]
        skyLin = np.full((size, size, 3), [2.11, 1.86, 1.57])
        skyLin *= mix(1.0, np.array([1.26, 1.02, 0.70]), (phase * np.exp(-g * 2.0))[..., None])
        band = np.exp(-g * 5.5) * phase * (0.65 + 0.35 * bright)
        skyLin *= mix(1.0, np.array([1.12, 0.84, 0.36]), band[..., None])
        sunDir2 = np.array([0.62, 0.45]); sunDir2 /= np.linalg.norm(sunDir2)
        ul = np.sqrt(uvx**2 + uvy**2) + 1e-4
        dirW = 0.5 + 0.5 * (uvx / ul * sunDir2[0] + uvy / ul * sunDir2[1])
        skyLin *= mix(1.0, np.array([1.09, 0.99, 0.84]), (phase * np.exp(-g * 1.5) * 0.4 * dirW)[..., None])
        skyVis = smoothstep(0.88, 1.00, phase)
        glowCol = tone(skyLin + glowLin * 1.55)
        gcol = mix(nightCol, glowCol, skyVis)
        gal = mix(nightAlpha, np.ones_like(nightAlpha), skyVis)
        col = np.where(miss[..., None], gcol, col); alpha = np.where(miss, gal, alpha)
        doTone = np.where(miss, 0.0, doTone)

    col = np.where(doTone[..., None] > 0.5, tone(col), col)
    return col, alpha

def composite(col, alpha, bg):
    return col + (1 - alpha[..., None]) * np.asarray(bg, dtype=np.float64)

def save(img, name):
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, name))
    print("saved", name)

NIGHT_BG = (13/255, 13/255, 18/255)   # hero 区域 #0d0d12 近似
DAWN_BG = (247/255, 243/255, 236/255) # #F7F3EC

if __name__ == "__main__":
    frames = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [
        ("v9-night",     0.0, 1.0,  NIGHT_BG),
        ("v9-mid-030",   0.30, 1.08, NIGHT_BG),
        ("v9-mid-055",   0.55, 1.15, NIGHT_BG),
        ("v9-mid-080",   0.80, 1.20, NIGHT_BG),
        ("v9-bloom",     1.0, 1.5,  DAWN_BG),
        ("v9-dawn-rest", 1.0, 1.25, DAWN_BG),
    ]
    for name, ph, br, bg in frames:
        params = V9 if name.startswith("v9") else None
        col, alpha = render(ph, br, params=params)
        save(composite(col, alpha, bg), f"{name}.png")
