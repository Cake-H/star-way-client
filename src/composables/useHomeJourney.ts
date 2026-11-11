/**
 * 首页星途旅程数据
 *
 * 并行加载简历、面试复盘、模拟面试三类数据，
 * 计算旅程阶段，并合并出「最近星轨」活动流与动态主 CTA。
 */
import { computed, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { HomeArchiveIcon, HomeEnergyIcon, HomeApplyIcon, HomeMockIcon, HomeReviewIcon } from '@/components/home/homeIcons'
import { listMyResumes } from '@/api/resume'
import { getQuotaBalance, getQuotaTransactions, type QuotaBalanceVO, type QuotaTransactionVO } from '@/api/quota'
import { listInterviewSessions } from '@/services/interviewService'
import { listMockInterviews } from '@/services/mockInterviewService'
import { authToken } from '@/auth/session'
import type { MockInterviewStatus } from '@/api/mockInterviewTypes'

export type ActivityType = 'resume' | 'interview' | 'mock'

export interface ActivityItem {
  type: ActivityType
  id: string
  title: string
  subtitle: string
  timestamp: string
  routeName: string
  routeParams?: Record<string, string>
  status?: string
}

export interface PrimaryCta {
  label: string
  icon: Component
  routeName: string
  routeParams?: Record<string, string>
}

export function useHomeJourney() {
  const loading = ref(true)
  const resumes = ref<Awaited<ReturnType<typeof listMyResumes>>>([])
  const interviews = ref<Awaited<ReturnType<typeof listInterviewSessions>>>([])
  const mocks = ref<Awaited<ReturnType<typeof listMockInterviews>>>([])
  const quota = ref<QuotaBalanceVO | null>(null)
  const transactions = ref<QuotaTransactionVO[]>([])

  const isGuest = computed(() => !authToken.value)

  async function load() {
    if (isGuest.value) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      const [r, i, m, q, t] = await Promise.all([
        listMyResumes().catch(() => []),
        listInterviewSessions().catch(() => []),
        listMockInterviews().catch(() => []),
        getQuotaBalance().catch(() => null),
        getQuotaTransactions(14).catch(() => [] as QuotaTransactionVO[]),
      ])
      resumes.value = r
      interviews.value = i
      mocks.value = m
      quota.value = q
      transactions.value = t
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  watch(authToken, (token) => {
    if (token) load()
  })

  /**
   * 「你的星途」当前航程阶段（按真实数据推算，顺序点亮、中间不断开）：
   * 0 星舰建档（有简历）→ 1 星能补给（收到过每日发放）→ 2 星港投递
   * （暂无使用信号，由后续阶段倒推点亮）→ 3 跃迁试炼（有模拟面试）→ 4 航行复盘（有面试复盘）。
   * -1 表示尚未启航（游客/无数据）。
   */
  const journeyStage = computed<number>(() => {
    if (interviews.value.length) return 4
    if (mocks.value.length) return 3
    if (quota.value?.lastDailyGrantDate) return 1
    if (resumes.value.length) return 0
    return -1
  })

  const counts = computed(() => ({
    resumes: resumes.value.length,
    interviews: interviews.value.length,
    mocks: mocks.value.length,
  }))

  const mockStats = computed(() => ({
    total: mocks.value.length,
    completed: mocks.value.filter((m) => m.status === 'COMPLETED').length,
  }))

  // 与后端 lastDailyGrantDate（本地日期 yyyy-MM-dd）对齐，避免 UTC 时区偏差
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const dailyGrantClaimed = computed(() => (quota.value?.lastDailyGrantDate ?? '').slice(0, 10) === todayStr)

  const activities = computed<ActivityItem[]>(() => {
    const items: ActivityItem[] = []

    resumes.value.forEach((r) => {
      items.push({
        type: 'resume',
        id: r.resumeId,
        title: r.title || '未命名简历',
        subtitle: r.fullName || '简历',
        timestamp: r.updatedAt,
        routeName: 'resume-detail',
        routeParams: { resumeId: String(r.resumeId) },
      })
    })

    interviews.value.forEach((i) => {
      const meta = [i.companyName, i.positionName].filter(Boolean).join(' · ')
      items.push({
        type: 'interview',
        id: i.sessionId,
        title: i.title,
        subtitle: `${i.questionCount} 题${meta ? ' · ' + meta : ''}`,
        timestamp: i.updatedAt,
        routeName: 'interview-session',
        routeParams: { sessionId: String(i.sessionId) },
      })
    })

    mocks.value.forEach((m) => {
      const statusMap: Record<MockInterviewStatus, string> = {
        GENERATED: '待练习',
        PRACTICING: '练习中',
        COMPLETED: '已完成',
      }
      items.push({
        type: 'mock',
        id: m.mockInterviewId,
        title: m.title,
        subtitle: `${statusMap[m.status]} · ${m.questionCount} 题`,
        timestamp: m.updatedAt,
        routeName: m.status === 'COMPLETED' ? 'mock-interview-detail' : 'mock-interview-practice',
        routeParams: { mockInterviewId: String(m.mockInterviewId) },
        status: m.status,
      })
    })

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  })

  const latestActivity = computed<ActivityItem | null>(() => activities.value[0] ?? null)

  const primaryCta = computed<PrimaryCta>(() => {
    const latest = latestActivity.value
    if (!latest) {
      return { label: '上传星舰档案，开启星途', icon: Upload, routeName: 'resume-upload' }
    }

    switch (latest.type) {
      case 'resume':
        return {
          label: '继续完善简历',
          icon: HomeArchiveIcon,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      case 'mock':
        return {
          label: latest.status === 'COMPLETED' ? '查看模拟面试' : '继续模拟面试',
          icon: HomeMockIcon,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      case 'interview':
        return {
          label: '继续复盘',
          icon: HomeReviewIcon,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      default:
        return { label: '上传星舰档案，开启星途', icon: Upload, routeName: 'resume-upload' }
    }
  })

  return {
    loading,
    journeyStage,
    counts,
    mockStats,
    quota,
    transactions,
    dailyGrantClaimed,
    activities,
    latestActivity,
    primaryCta,
    isGuest,
    reload: load,
  }
}

/** 核心功能区 Bento 卡片：通俗名 + 隐喻副标题，2 大 2 小 */
export interface FeatureCard {
  key: string
  title: string
  metaphor: string
  desc: string
  icon: Component
  routeName: string
  size: 'large' | 'small'
}

export const featureCards: FeatureCard[] = [
  {
    key: 'resume',
    title: '简历管理',
    metaphor: '星舰档案',
    desc: '上传简历文件，自动解析为结构化档案，多份档案随时切换。',
    icon: HomeArchiveIcon,
    routeName: 'resume-list',
    size: 'large',
  },
  {
    key: 'apply',
    title: '网申投递',
    metaphor: '星港导航',
    desc: '目的地站点目录 + 浏览器插件光速填表，网申不再重复劳动。',
    icon: HomeApplyIcon,
    routeName: 'apply-site-list',
    size: 'large',
  },
  {
    key: 'mock',
    title: '模拟面试',
    metaphor: '跃迁试炼',
    desc: '按你的简历出题，逐题试炼、断点续练。',
    icon: HomeMockIcon,
    routeName: 'mock-interview-list',
    size: 'small',
  },
  {
    key: 'interview',
    title: '面试复盘',
    metaphor: '航行日志',
    desc: '录音一句话，整理成结构化复盘。',
    icon: HomeReviewIcon,
    routeName: 'interview-list',
    size: 'small',
  },
]

/** 「你的星途」五阶段旅程 */
export interface JourneyStep {
  key: string
  label: string
  desc: string
  routeName: string
  icon: Component
}

export const journeySteps: JourneyStep[] = [
  { key: 'archive', label: '星舰建档', desc: '上传简历，自动解析为结构化档案', routeName: 'resume-upload', icon: HomeArchiveIcon },
  { key: 'quota', label: '星能补给', desc: '每日首次使用，自动领取 10 点星能', routeName: 'quota-center', icon: HomeEnergyIcon },
  { key: 'apply', label: '星港投递', desc: '选择目的地星港，插件光速填表', routeName: 'apply-site-list', icon: HomeApplyIcon },
  { key: 'mock', label: '跃迁试炼', desc: '按简历出题，逐题试炼', routeName: 'mock-interview-list', icon: HomeMockIcon },
  { key: 'review', label: '航行复盘', desc: '复盘真实面试，抵达新星', routeName: 'interview-list', icon: HomeReviewIcon },
]
