import { createRouter, createWebHistory } from 'vue-router'
import { AUTH_TOKEN_KEY } from '@/config'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

const { promptLogin } = useLoginPrompt()

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { public: true },
        },
        {
          path: 'resume/upload',
          name: 'resume-upload',
          component: () => import('@/views/ResumeWorkflowView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'resume/new',
          name: 'resume-new',
          component: () => import('@/views/ResumeNewView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'resume/:resumeId/edit',
          name: 'resume-edit',
          component: () => import('@/views/ResumeEditView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'resume/:resumeId',
          name: 'resume-detail',
          component: () => import('@/views/ResumeDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'resume',
          name: 'resume-list',
          component: () => import('@/views/ResumeListView.vue'),
          meta: { requiresAuth: true },
        },
        // --- 面试复盘（语音录入 + 问题列表 + 练习模式）---
        {
          path: 'interview',
          name: 'interview-list',
          component: () => import('@/views/InterviewListView.vue'),
          meta: { requiresAuth: true },
        },
        // 须放在 interview/:sessionId 之前，避免 "new" 被当作 sessionId
        {
          path: 'interview/new',
          name: 'interview-new',
          component: () => import('@/views/InterviewNewView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'interview/:sessionId',
          name: 'interview-session',
          component: () => import('@/views/InterviewSessionView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'interview/:sessionId/q/:questionId',
          name: 'interview-question',
          component: () => import('@/views/InterviewQuestionDetailView.vue'),
          meta: { requiresAuth: true },
        },
        // --- 模拟面试（基于简历生成面试题 + 练习模式）---
        {
          path: 'mock-interview',
          name: 'mock-interview-list',
          component: () => import('@/views/MockInterviewListView.vue'),
          meta: { requiresAuth: true },
        },
        // 须放在 mock-interview/:mockInterviewId 之前，避免 "new" 被当作 mockInterviewId
        {
          path: 'mock-interview/new',
          name: 'mock-interview-new',
          component: () => import('@/views/MockInterviewGenerateView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'mock-interview/:mockInterviewId/practice',
          name: 'mock-interview-practice',
          component: () => import('@/views/MockInterviewPracticeView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'mock-interview/:mockInterviewId',
          name: 'mock-interview-detail',
          component: () => import('@/views/MockInterviewDetailView.vue'),
          meta: { requiresAuth: true },
        },
        // --- 额度中心 ---
        {
          path: 'quota',
          name: 'quota-center',
          component: () => import('@/views/QuotaCenterView.vue'),
          meta: { requiresAuth: true },
        },
        // --- 网申站点 ---
        {
          path: 'apply-sites',
          name: 'apply-site-list',
          component: () => import('@/views/ApplySiteListView.vue'),
          meta: { requiresAuth: true },
        },
        // --- 投递记录 ---
        {
          path: 'applications',
          name: 'job-application-list',
          component: () => import('@/views/JobApplicationListView.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to, from) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (to.meta.requiresAuth && !token) {
    // 直接访问受保护 URL：硬跳登录页
    if (from.name === undefined) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // 应用内点击受保护导航：停留当前页，弹出登录提示
    promptLogin(to.fullPath)
    return false
  }
  if (to.name === 'login' && token) {
    return { name: 'home' }
  }
  return true
})
