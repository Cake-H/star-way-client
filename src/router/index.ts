import { createRouter, createWebHistory } from 'vue-router'
import { AUTH_TOKEN_KEY } from '@/config'

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
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { hideStarry: true },
        },
        {
          path: 'resume/upload',
          name: 'resume-upload',
          component: () => import('@/views/ResumeWorkflowView.vue'),
        },
        {
          path: 'resume/new',
          name: 'resume-new',
          component: () => import('@/views/ResumeNewView.vue'),
        },
        {
          path: 'resume/:resumeId/edit',
          name: 'resume-edit',
          component: () => import('@/views/ResumeEditView.vue'),
        },
        {
          path: 'resume/:resumeId',
          name: 'resume-detail',
          component: () => import('@/views/ResumeDetailView.vue'),
        },
        {
          path: 'resume',
          name: 'resume-list',
          component: () => import('@/views/ResumeListView.vue'),
        },
        // --- 面试复盘（语音录入 + 问题列表 + 练习模式）---
        {
          path: 'interview',
          name: 'interview-list',
          component: () => import('@/views/InterviewListView.vue'),
        },
        // 须放在 interview/:sessionId 之前，避免 "new" 被当作 sessionId
        {
          path: 'interview/new',
          name: 'interview-new',
          component: () => import('@/views/InterviewNewView.vue'),
        },
        {
          path: 'interview/:sessionId',
          name: 'interview-session',
          component: () => import('@/views/InterviewSessionView.vue'),
        },
        {
          path: 'interview/:sessionId/q/:questionId',
          name: 'interview-question',
          component: () => import('@/views/InterviewQuestionDetailView.vue'),
        },
        // --- 模拟面试（基于简历生成面试题 + 练习模式）---
        {
          path: 'mock-interview',
          name: 'mock-interview-list',
          component: () => import('@/views/MockInterviewListView.vue'),
        },
        // 须放在 mock-interview/:mockInterviewId 之前，避免 "new" 被当作 mockInterviewId
        {
          path: 'mock-interview/new',
          name: 'mock-interview-new',
          component: () => import('@/views/MockInterviewGenerateView.vue'),
        },
        {
          path: 'mock-interview/:mockInterviewId/practice',
          name: 'mock-interview-practice',
          component: () => import('@/views/MockInterviewPracticeView.vue'),
        },
        {
          path: 'mock-interview/:mockInterviewId',
          name: 'mock-interview-detail',
          component: () => import('@/views/MockInterviewDetailView.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && token) {
    return { name: 'home' }
  }
  return true
})
