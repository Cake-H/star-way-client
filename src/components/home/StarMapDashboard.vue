<template>
  <section class="dashboard-section" aria-label="个人星图看板">
        <div class="section-header">
      <h2 class="section-title">个人星图</h2>
      <p class="section-subtitle">你的星能与航程，一图总览</p>
    </div>

    <!-- 游客：登录引导 -->
    <div v-if="isGuest" class="guest-panel">
      <div class="guest-icon" aria-hidden="true">
        <el-icon :size="30"><Moon /></el-icon>
      </div>
      <p class="guest-text">登录后即可点亮你的个人星图：星能余额、试炼完成度与航行日志。</p>
      <StarLaunchButton type="primary" @click="goLogin">
        登录，点亮星图
      </StarLaunchButton>
    </div>

    <div v-else v-loading="loading" class="dash-grid">
      <!-- 星能余额环形图 -->
      <div class="dash-card ring-card">
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" class="ring-svg" role="img" :aria-label="`剩余星能 ${balance} 点`">
            <circle cx="60" cy="60" r="52" class="ring-track" />
            <circle
              cx="60" cy="60" r="52"
              class="ring-value"
              :stroke-dasharray="ringDash"
              stroke-dashoffset="0"
            />
          </svg>
          <div class="ring-center">
            <span class="ring-num">{{ balance }}</span>
            <span class="ring-unit">剩余星能</span>
          </div>
        </div>
        <div class="ring-meta">
          <span class="member-badge">{{ memberLevelText }}</span>
          <span class="grant-badge" :class="{ claimed: dailyGrantClaimed }">
            {{ dailyGrantClaimed ? '今日补给已领' : '今日补给待领' }}
          </span>
        </div>
        <!-- 空状态：星能为 0 -->
        <div v-if="!loading && balance === 0" class="empty-hint">
          <p class="empty-hint-text">星能耗尽？每日登录可领 10 点补给</p>
          <button type="button" class="ghost-btn" @click="go('quota-center')">
            输入补给密令充值
          </button>
        </div>
      </div>

      <!-- 试炼完成度 + 复盘场次 + 档案 -->
      <div class="dash-card stats-card">
        <div class="stat-block">
          <span class="stat-num">{{ mockStats.completed }}<span class="stat-total">/ {{ mockStats.total }}</span></span>
          <span class="stat-label">跃迁试炼完成</span>
          <div v-if="mockStats.total > 0" class="mini-bar">
            <div class="mini-bar-fill" :style="{ width: `${mockPercent}%` }" />
          </div>
          <button v-else type="button" class="ghost-btn" @click="go('mock-interview-new')">
            去完成第一次跃迁试炼
          </button>
        </div>
        <div class="stat-block">
          <span class="stat-num">{{ counts.interviews }}</span>
          <span class="stat-label">航行日志场次</span>
          <button v-if="counts.interviews === 0" type="button" class="ghost-btn" @click="go('interview-new')">
            记录第一篇航行日志
          </button>
        </div>
        <div class="stat-block">
          <span class="stat-num">{{ counts.resumes }}</span>
          <span class="stat-label">星舰档案</span>
          <button v-if="counts.resumes === 0" type="button" class="ghost-btn" @click="go('resume-upload')">
            上传第一份星舰档案
          </button>
        </div>
      </div>

      <!-- 近期星能流水趋势 -->
      <div class="dash-card spark-card">
        <div class="spark-head">
          <span class="spark-title">近期星能流水</span>
          <router-link class="spark-link" to="/quota">额度中心</router-link>
        </div>
        <svg v-if="sparkPoints" viewBox="0 0 260 72" class="spark-svg" preserveAspectRatio="none" aria-hidden="true">
          <polyline :points="sparkPoints" class="spark-line" />
          <polygon :points="sparkArea" class="spark-area" />
          <!-- 当前值标记：最新数据点，坐标由数据计算而非写死 -->
          <g v-if="sparkLast" class="spark-end">
            <circle class="spark-end-halo" :cx="sparkLast.x" :cy="sparkLast.y" r="4" />
            <circle class="spark-end-dot" :cx="sparkLast.x" :cy="sparkLast.y" r="2" />
          </g>
        </svg>
        <!-- 空状态：无流水 -->
        <div v-else class="spark-empty">
          <div class="spark-empty-icon" aria-hidden="true">
            <el-icon :size="22"><TrendCharts /></el-icon>
          </div>
          <p class="spark-empty-text">还没有星能流水，完成一次解析或试炼即可点亮趋势</p>
          <button type="button" class="ghost-btn" @click="go('mock-interview-new')">
            去跃迁试炼
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Moon, TrendCharts } from '@element-plus/icons-vue'
import StarLaunchButton from '@/components/StarLaunchButton.vue'
import type { QuotaBalanceVO, QuotaTransactionVO } from '@/api/quota'

const props = defineProps<{
  isGuest: boolean
  loading: boolean
  quota: QuotaBalanceVO | null
  transactions: QuotaTransactionVO[]
  mockStats: { total: number; completed: number }
  counts: { resumes: number; mocks: number; interviews: number }
  dailyGrantClaimed: boolean
}>()

const router = useRouter()

const balance = computed(() => props.quota?.balance ?? 0)
const totalQuota = computed(() => Math.max(props.quota?.totalQuota ?? 0, balance.value, 1))

const ringDash = computed(() => {
  const c = 2 * Math.PI * 52
  const ratio = Math.min(1, balance.value / totalQuota.value)
  return `${(c * ratio).toFixed(1)} ${c.toFixed(1)}`
})

const memberLevelText = computed(() => {
  const map: Record<string, string> = { FREE: '旅人', PRO: '领航员', VIP: '舰长' }
  return map[props.quota?.memberLevel ?? 'FREE'] ?? props.quota?.memberLevel ?? '旅人'
})

const mockPercent = computed(() =>
  props.mockStats.total === 0 ? 0 : Math.round((props.mockStats.completed / props.mockStats.total) * 100),
)

/** 近 14 条流水按时间正序绘制 balanceAfter 迷你趋势 */
const sparkData = computed(() =>
  [...props.transactions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-14)
    .map((t) => t.balanceAfter),
)

/** 折线坐标映射（与 sparkPoints 同一套换算，保证标记落在数据点上） */
function sparkMap(data: number[]) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  return (v: number, i: number) => ({
    x: (i / (data.length - 1)) * 260,
    y: 66 - ((v - min) / span) * 56,
  })
}

const sparkPoints = computed(() => {
  const data = sparkData.value
  if (data.length < 2) return ''
  const map = sparkMap(data)
  return data
    .map((v, i) => {
      const p = map(v, i)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
})

/** 最新数据点坐标（数据更新后自动跟随） */
const sparkLast = computed(() => {
  const data = sparkData.value
  if (data.length < 2) return null
  return sparkMap(data)(data[data.length - 1], data.length - 1)
})

const sparkArea = computed(() =>
  sparkPoints.value ? `0,72 ${sparkPoints.value} 260,72` : '',
)

function goLogin() {
  router.push({ name: 'login', query: { redirect: '/' } })
}

function go(routeName: string) {
  router.push({ name: routeName })
}
</script>

<style scoped>
.dashboard-section {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section-header {
  text-align: center;
}

.section-title {
  margin: 0 0 6px;
  font-family: var(--xt-font-title);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--xt-text-on-dark);
}

.section-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--xt-text-on-dark-muted);
}

.guest-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 44px 24px;
  border-radius: var(--xt-radius-lg);
  background: var(--xt-card-bg);
  border: 1px dashed var(--xt-card-border-hover);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
}

.guest-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #e8a33d;
  background: #0d0d12;
  border: 1px solid var(--xt-card-border-hover);
}

.guest-text {
  margin: 0;
  font-size: 15px;
  color: var(--xt-text-on-dark-muted);
  text-align: center;
}

.dash-grid {
  display: grid;
  grid-template-columns: 300px 1fr 1.2fr;
  gap: 20px;
  min-height: 180px;
}

.dash-card {
  padding: 24px;
  border-radius: var(--xt-radius-lg);
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.dash-card:hover {
  border-color: var(--xt-card-border-hover);
  background: #131318;
}

/* —— 星能环形图 —— */
.ring-card {
  align-items: center;
}

.ring-wrap {
  position: relative;
  width: 150px;
  height: 150px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: #1a1a1f;
  stroke-width: 9;
}

.ring-value {
  fill: none;
  stroke: #e8a33d;
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.ring-num {
  font-family: var(--xt-font-display);
  font-size: 34px;
  font-weight: 800;
  color: #e8a33d;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ring-unit {
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
}

.ring-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.member-badge,
.grant-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}

.member-badge {
  color: #e8a33d;
  background: rgba(232, 163, 61, 0.08);
  border: 1px solid rgba(232, 163, 61, 0.3);
}

.grant-badge {
  color: var(--xt-text-on-dark-muted);
  background: rgba(232, 230, 224, 0.04);
  border: 1px solid rgba(232, 230, 224, 0.12);
}

.grant-badge.claimed {
  color: #86efac;
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.35);
}

/* —— 中部统计 —— */
.stats-card {
  justify-content: space-around;
}

.stat-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.stat-num {
  font-family: var(--xt-font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--xt-text-on-dark);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-total {
  font-size: 15px;
  font-weight: 600;
  color: var(--xt-text-on-dark-muted);
}

.stat-label {
  font-size: 13px;
  color: var(--xt-text-on-dark-muted);
}

.mini-bar {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: rgba(232, 230, 224, 0.08);
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: #e8a33d;
  transition: width 0.5s ease;
}

/* —— 空状态：图标/文案 + 幽灵 CTA —— */
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px dashed rgba(232, 230, 224, 0.14);
  width: 100%;
}

.empty-hint-text {
  margin: 0;
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
  text-align: center;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(232, 163, 61, 0.4);
  background: transparent;
  color: #e8a33d;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.ghost-btn:hover {
  background: rgba(232, 163, 61, 0.1);
  border-color: rgba(232, 163, 61, 0.65);
}

/* —— 流水趋势 —— */
.spark-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.spark-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--xt-text-on-dark);
}

.spark-link {
  font-size: 13px;
  color: #e8a33d;
  text-decoration: none;
}

.spark-link:hover {
  text-decoration: underline;
}

.spark-svg {
  width: 100%;
  height: 72px;
  flex: 1;
}

.spark-line {
  fill: none;
  stroke: #e8a33d;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.spark-area {
  fill: rgba(232, 163, 61, 0.08);
  stroke: none;
}

/* 当前值标记：琥珀实心点 + 呼吸光晕 */
.spark-end-dot {
  fill: #e8a33d;
}

.spark-end-halo {
  fill: rgba(232, 163, 61, 0.25);
  animation: spark-end-pulse 2s ease-in-out infinite;
}

@keyframes spark-end-pulse {
  0%, 100% {
    r: 4;
    opacity: 0.25;
  }
  50% {
    r: 6;
    opacity: 0;
  }
}

.spark-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 0;
}

.spark-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #e8a33d;
  background: rgba(232, 163, 61, 0.06);
  border: 1px solid rgba(232, 163, 61, 0.25);
}

.spark-empty-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--xt-text-on-dark-muted);
  text-align: center;
}

/* —— 移动端：单列卡片流 —— */
@media (max-width: 1023px) {
  .dash-grid {
    grid-template-columns: 1fr 1fr;
  }

  .ring-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .dash-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-value,
  .mini-bar-fill {
    transition: none;
  }

  .spark-end-halo {
    animation: none;
    opacity: 0.25;
  }
}
</style>
