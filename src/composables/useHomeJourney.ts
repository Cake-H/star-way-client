/**
 * 首页星途旅程数据
 *
 * 并行加载简历、面试复盘、模拟面试三类数据，
 * 计算旅程阶段，并合并出「最近星轨」活动流与动态主 CTA。
 */
import { computed, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import {
  ChatLineSquare,
  DocumentAdd,
  FolderOpened,
  MagicStick,
  Microphone,
  Upload,
} from '@element-plus/icons-vue'
import { listMyResumes } from '@/api/resume'
import { listInterviewSessions } from '@/services/interviewService'
import { listMockInterviews } from '@/services/mockInterviewService'
import type { MockInterviewStatus } from '@/api/mockInterviewTypes'

export type ActivityType = 'resume' | 'interview' | 'mock'

export interface ActivityItem {
  type: ActivityType
  id: number
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

  async function load() {
    loading.value = true
    try {
      const [r, i, m] = await Promise.all([
        listMyResumes().catch(() => []),
        listInterviewSessions().catch(() => []),
        listMockInterviews().catch(() => []),
      ])
      resumes.value = r
      interviews.value = i
      mocks.value = m
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  const stage = computed(() => {
    if (interviews.value.length) return 3
    if (mocks.value.length) return 2
    if (resumes.value.length) return 1
    return 0
  })

  const counts = computed(() => ({
    resumes: resumes.value.length,
    interviews: interviews.value.length,
    mocks: mocks.value.length,
  }))

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
      return { label: '上传简历，开启星途', icon: Upload, routeName: 'resume-upload' }
    }

    switch (latest.type) {
      case 'resume':
        return {
          label: '继续完善简历',
          icon: FolderOpened,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      case 'mock':
        return {
          label: latest.status === 'COMPLETED' ? '查看模拟面试' : '继续模拟面试',
          icon: MagicStick,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      case 'interview':
        return {
          label: '继续复盘',
          icon: ChatLineSquare,
          routeName: latest.routeName,
          routeParams: latest.routeParams,
        }
      default:
        return { label: '上传简历，开启星途', icon: Upload, routeName: 'resume-upload' }
    }
  })

  return {
    loading,
    stage,
    counts,
    activities,
    latestActivity,
    primaryCta,
    reload: load,
  }
}

export const featureItems = [
  {
    key: 'resume',
    title: '我的简历',
    desc: '查看已保存列表、默认标记与最近更新时间，进入详情或继续编辑。',
    icon: FolderOpened,
    routeName: 'resume-list',
    planetClass: 'planet-indigo',
  },
  {
    key: 'interview',
    title: '面试复盘',
    desc: '语音或手动记录面试题，AI 总结评价与参考答案，练习模式自测。',
    icon: ChatLineSquare,
    routeName: 'interview-list',
    planetClass: 'planet-violet',
  },
  {
    key: 'mock',
    title: '模拟面试',
    desc: '基于简历由 AI 生成面试题，练习模式逐题自测，随时查看参考答案。',
    icon: MagicStick,
    routeName: 'mock-interview-list',
    planetClass: 'planet-amber',
  },
  {
    key: 'upload',
    title: '上传智能解析',
    desc: '支持 .pdf / .docx，解析完成后核对草稿并保存到云端。',
    icon: Upload,
    routeName: 'resume-upload',
    planetClass: 'planet-sun',
    featured: true,
  },
  {
    key: 'blank',
    title: '空白简历',
    desc: '不经过解析，直接结构化填写并保存。',
    icon: DocumentAdd,
    routeName: 'resume-new',
    planetClass: 'planet-silver',
  },
]

export const journeySteps = [
  { label: '智能解析', desc: '上传简历，AI 自动解析为结构化草稿', routeName: 'resume-upload', icon: Upload },
  { label: '简历管理', desc: '查看、编辑、管理你的所有简历', routeName: 'resume-list', icon: FolderOpened },
  { label: '模拟面试', desc: '基于简历生成面试题并练习', routeName: 'mock-interview-list', icon: MagicStick },
  { label: '面试复盘', desc: '记录真实面试，沉淀经验', routeName: 'interview-list', icon: Microphone },
]
