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
