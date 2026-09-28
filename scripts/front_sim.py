"""v9.1 破晓波前形态模拟：不规则摆动环形 + 尾随波纹（验证摆幅/波数的美感，再移植进 HeroCanvas）"""
import numpy as np
from PIL import Image
import os

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

S = 720
yy, xx = np.mgrid[0:S, 0:S].astype(np.float64) + 0.5
cx = cy = S / 2
dx, dy = xx - cx, yy - cy
dist = np.hypot(dx, dy)
theta = np.arctan2(dy, dx)

# 夜底 + 白昼揭示盘（半径 R 内亮）
R = 300.0
night = np.stack([np.full((S, S), 13/255), np.full((S, S), 13/255), np.full((S, S), 18/255)], -1)
day = np.stack([np.full((S, S), 247/255), np.full((S, S), 243/255), np.full((S, S), 236/255)], -1)
img = np.where((dist < R)[..., None], day, night)

def front_layer(img, Rb, half, peak, hue, t, wob=(0.022, 0.013, 0.007), rip=True):
    # 角向摆动：3/7/13 波数叠加 + 缓慢旋转
    rotA = t * 0.25
    w = 1 + wob[0]*np.sin(3*theta + rotA*1.7) + wob[1]*np.sin(7*theta - rotA*1.1) + wob[2]*np.sin(13*theta + rotA*2.3)
    outer = (Rb + half) * w
    inner = np.maximum(0.0, Rb - half) * (2 - w)
    # 径向轮廓：中心峰 + 两侧余弦滚降
    prof = np.clip(1 - np.abs(dist - Rb) / half, 0, 1)
    prof = 0.5 + 0.5 * np.cos(np.pi * (1 - prof))  # 平滑峰
    mask = ((dist >= inner) & (dist <= outer)).astype(np.float64)
    a = prof * mask * peak
    for c in range(3):
        img[..., c] += (hue[c] / 255) * a
    return np.clip(img, 0, 1)

# 主锋面 + 两条尾随波纹（波动感）
img = front_layer(img, R,        max(40, R*0.06),  0.5,  (239, 151, 18), 1.3)
img = front_layer(img, R * 0.88, max(24, R*0.045), 0.16, (240, 178, 90), 1.3)
img = front_layer(img, R * 0.76, max(16, R*0.035), 0.08, (245, 200, 140), 1.3)

Image.fromarray((img * 255).astype(np.uint8)).save(os.path.join(OUT, "front-sim.png"))
print("saved front-sim.png")
