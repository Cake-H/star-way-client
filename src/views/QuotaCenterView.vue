<template>
  <div class="quota-center">
    <div class="xt-section-head hero">
      <div>
        <p class="xt-eyebrow hero-eyebrow">星途 · 额度中心</p>
        <h1 class="xt-section-title">我的额度</h1>
        <p class="xt-section-desc">
          每日免费额度将在首次使用 AI 功能时自动到账，消耗按实际 token 结算。
        </p>
      </div>
      <div v-if="!loading" class="hero-actions">
        <el-button type="primary" plain @click="redeemVisible = true">
          <el-icon class="btn-ico"><Ticket /></el-icon>
          兑换码充值
        </el-button>
        <el-tooltip content="暂未开放" placement="top">
          <span class="disabled-btn-wrap">
            <el-button type="primary" disabled>
              <el-icon class="btn-ico"><CreditCard /></el-icon>
              在线充值
            </el-button>
          </span>
        </el-tooltip>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />

    <template v-else>
      <!-- 三列概览卡片 -->
      <el-row v-stagger :gutter="20" class="overview-grid">
        <el-col :xs="24" :sm="8">
          <OrbitalCard class="overview-card" shadow="hover">
            <p class="overview-label">当前余额</p>
            <div class="overview-value-row">
              <span ref="balanceElRef" class="overview-value primary">{{ balanceDisplay }}</span>
              <span class="overview-unit">点</span>
            </div>
            <p class="overview-tip" :class="{ fresh: isDailyGranted }">
              {{ isDailyGranted ? '今日免费额度已到账' : '今日免费额度将在首次使用 AI 功能时到账' }}
            </p>
          </OrbitalCard>
        </el-col>
        <el-col :xs="24" :sm="8">
          <OrbitalCard class="overview-card" shadow="hover">
            <p class="overview-label">累计额度</p>
            <div class="overview-value-row">
              <span ref="totalElRef" class="overview-value secondary">{{ totalDisplay }}</span>
              <span class="overview-unit">点</span>
            </div>
            <p class="overview-tip">含每日免费 + 充值 + 兑换</p>
          </OrbitalCard>
        </el-col>
        <el-col :xs="24" :sm="8">
          <OrbitalCard class="overview-card" shadow="hover">
            <p class="overview-label">会员等级</p>
            <div class="overview-value-row">
              <span class="overview-value accent">免费版</span>
            </div>
            <p class="overview-tip">升级会员可享更多额度</p>
          </OrbitalCard>
        </el-col>
      </el-row>

      <!-- 额度流水 -->
      <section class="transactions-section">
        <div class="section-title-row">
          <h2 class="section-title">额度流水</h2>
          <el-button text type="primary" size="small" @click="loadTransactions">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-empty v-if="!transactions.length" description="还没有额度记录，去体验一下 AI 功能吧" />

        <div v-else class="transaction-list">
          <div
            v-for="item in transactions"
            :key="item.id"
            class="transaction-item"
          >
            <div class="item-left">
              <span class="item-type">{{ typeLabel(item.type) }}</span>
              <span class="item-remark">{{ formatRemark(item.remark) }}</span>
            </div>
            <div class="item-right">
              <span class="item-points" :class="item.points > 0 ? 'income' : 'expense'">
                {{ item.points > 0 ? '+' : '' }}{{ item.points }}
              </span>
              <span class="item-time">{{ formatDateTime(item.createdAt) }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- 兑换码充值弹窗 -->
    <el-dialog
      v-model="redeemVisible"
      title="兑换码充值"
      width="440px"
      align-center
      destroy-on-close
    >
      <el-form class="redeem-dialog-form" @submit.prevent="onRedeem">
        <el-input
          v-model="redeemCode"
          placeholder="请输入兑换码"
          size="large"
          maxlength="64"
          :disabled="redeeming"
          clearable
          @input="redeemCode = redeemCode.toUpperCase().replace(/\s/g, '')"
        >
          <template #prefix>
            <el-icon><Ticket /></el-icon>
          </template>
        </el-input>
        <p v-if="redeemError" class="redeem-error">{{ redeemError }}</p>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :disabled="redeeming" @click="redeemVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="redeeming"
            :disabled="!redeemCode.trim()"
            @click="onRedeem"
          >
            立即充值
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Ticket, CreditCard } from '@element-plus/icons-vue'
import OrbitalCard from '@/components/OrbitalCard.vue'
import { formatDateTime } from '@/utils/format'
import { useCountUp } from '@/composables/useCountUp'
import {
  getQuotaBalance,
  getQuotaTransactions,
  redeemQuotaCode,
  type QuotaBalanceVO,
  type QuotaTransactionVO,
} from '@/api/quota'

const loading = ref(true)
const balance = ref<QuotaBalanceVO>({
  balance: 0,
  totalQuota: 0,
  memberLevel: 'FREE',
  lastDailyGrantDate: null,
})
const transactions = ref<QuotaTransactionVO[]>([])

const redeemVisible = ref(false)
const redeemCode = ref('')
const redeeming = ref(false)
const redeemError = ref('')

const isDailyGranted = computed(() => {
  if (!balance.value.lastDailyGrantDate) return false
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return balance.value.lastDailyGrantDate === `${yyyy}-${mm}-${dd}`
})

/* 统计数字 count-up（1.2s，reduced-motion 直出） */
const { display: balanceDisplay, elRef: balanceElRef } = useCountUp(
  computed(() => balance.value.balance),
)
const { display: totalDisplay, elRef: totalElRef } = useCountUp(
  computed(() => balance.value.totalQuota),
)

async function loadBalance() {
  balance.value = await getQuotaBalance()
}

async function loadTransactions() {
  transactions.value = await getQuotaTransactions(50)
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadBalance(), loadTransactions()])
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

async function onRedeem() {
  const code = redeemCode.value.trim()
  if (!code) {
    redeemError.value = '兑换码不能为空'
    return
  }
  redeeming.value = true
  redeemError.value = ''
  try {
    const result = await redeemQuotaCode({ code })
    ElMessage.success(`成功充值 ${result.points} 点`)
    redeemVisible.value = false
    redeemCode.value = ''
    await loadAll()
  } catch (err: unknown) {
    redeemError.value = err instanceof Error ? err.message : '兑换失败，请稍后重试'
  } finally {
    redeeming.value = false
  }
}

const typeLabels: Record<string, string> = {
  daily_grant: '每日免费额度',
  consume: 'AI 功能消耗',
  redeem: '兑换码充值',
  recharge: '在线充值',
  admin_adjust: '系统调整',
}

function typeLabel(type: string) {
  return typeLabels[type] || type
}

const remarkMap: Record<string, string> = {
  resume_parse: '简历解析',
  plugin_autofill: '一键填表',
  interview_summarize: '面试总结',
  mock_interview_generate: '模拟面试',
}

function formatRemark(remark: string) {
  if (!remark) return ''
  for (const [key, label] of Object.entries(remarkMap)) {
    if (remark.includes(key)) return `AI 调用消耗：${label}`
  }
  return maskRedeemCode(stripAdminId(remark))
}

/** 管理员调整备注不向前台用户展示操作管理员 ID */
function stripAdminId(text: string) {
  return text.replace(/[（(]\s*操作管理员ID\s*[:：]?\s*\d+\s*[)）]/g, '').trim()
}

/** 兑换码等敏感信息中间打码，保留前4后4 */
function maskRedeemCode(text: string) {
  return text.replace(/([A-Z0-9]{4})[A-Z0-9]{8,}([A-Z0-9]{4})/g, '$1****$2')
}
</script>

<style scoped>
.quota-center {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.hero-eyebrow {
  color: var(--xt-primary);
  margin-bottom: 6px;
}

.balance-card {
  padding: 24px;
}

.overview-grid {
  margin: 0 !important;
  row-gap: 20px;
}

.overview-card {
  padding: 24px;
  height: 100%;
}

.overview-label {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--xt-text-secondary);
}

.overview-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
}

/* 统计数字：琥珀 Orbitron */
.overview-value {
  font-family: var(--xt-font-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--xt-primary);
}

.overview-value.accent {
  font-size: 32px;
}

.overview-unit {
  font-size: 15px;
  color: var(--xt-text-secondary);
}

.overview-tip {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-muted);
}

.overview-tip.fresh {
  color: var(--xt-success);
  font-weight: 500;
}

.redeem-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.redeem-error {
  margin: 0;
  font-size: 13px;
  color: var(--xt-danger);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.transactions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-family: var(--xt-font-title);
  font-size: 18px;
  font-weight: 700;
  color: var(--xt-text);
}

.transaction-list {
  display: flex;
  flex-direction: column;
}

/* 流水：行间渐隐细线分隔 */
.transaction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 4px;
  border-bottom: 1px solid rgba(232, 230, 224, 0.06);
}

.transaction-item:last-child {
  border-bottom: none;
}

.item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--xt-text);
}

.item-remark {
  font-size: 13px;
  color: var(--xt-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.item-points {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* 正负金额：正数成功绿，负数暖白 */
.item-points.income {
  color: var(--xt-success);
}

.item-points.expense {
  color: var(--xt-text);
}

.item-time {
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.disabled-btn-wrap {
  display: inline-flex;
  cursor: not-allowed;
}

.btn-ico {
  margin-right: 6px;
}

@media (max-width: 640px) {
  .balance-value {
    font-size: 40px;
  }

  .balance-meta {
    text-align: left;
  }

  .redeem-actions {
    flex-direction: column;
  }
}
</style>
