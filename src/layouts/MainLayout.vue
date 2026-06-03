<template>
  <div class="layout">
    <StarryBackground variant="subtle" />
    <header class="bar">
      <div class="left">
        <router-link class="brand" to="/">
          <StarLogo size="sm" />
          <span class="brand-text">
            <span class="brand-name">星途</span>
            <span class="brand-tag">智能简历投递助手</span>
          </span>
        </router-link>
        <nav class="nav" aria-label="主导航">
          <router-link class="nav-link" to="/" :class="{ active: isHome }">首页</router-link>
          <router-link class="nav-link" to="/resume" :class="{ active: isResumeSection }">我的简历</router-link>
          <router-link class="nav-link" to="/interview" :class="{ active: isInterviewSection }">面试复盘</router-link>
        </nav>
      </div>
      <el-button class="logout-btn" type="primary" plain @click="onLogout">退出登录</el-button>
    </header>
    <main class="content xt-main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StarLogo from '@/components/StarLogo.vue'
import StarryBackground from '@/components/StarryBackground.vue'
import { logout as logoutApi } from '@/api/auth'
import { clearSession } from '@/auth/session'

const router = useRouter()
const route = useRoute()
const isHome = computed(() => route.name === 'home')
const isResumeSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/resume'))
const isInterviewSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/interview'))

async function onLogout() {
  let remoteOk = false
  try {
    await logoutApi()
    remoteOk = true
  } catch {
    // 拦截器已提示
  } finally {
    clearSession()
    await router.replace({ name: 'login' })
    if (remoteOk) {
      ElMessage.success('已退出登录')
    }
  }
}
</script>

<style scoped>
.layout {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  margin: 12px 16px 0;
  border-radius: var(--xt-radius-md);
  background: rgba(11, 16, 40, 0.82);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(5, 8, 20, 0.25);
  gap: 16px;
  flex-wrap: wrap;
}

.left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.brand:hover {
  opacity: 0.92;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-name {
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 0.06em;
  color: #f8faff;
  line-height: 1.2;
}

.brand-tag {
  font-size: 11px;
  font-weight: 500;
  color: rgba(232, 236, 255, 0.62);
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  padding: 7px 14px;
  border-radius: var(--xt-radius-sm);
  color: rgba(232, 236, 255, 0.78);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-link.active {
  background: rgba(99, 102, 241, 0.35);
  color: #fff;
  font-weight: 600;
}

.logout-btn {
  border-color: rgba(129, 140, 248, 0.55) !important;
  color: #c7d2fe !important;
  background: rgba(99, 102, 241, 0.12) !important;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.logout-btn:hover {
  background: rgba(99, 102, 241, 0.28) !important;
  border-color: rgba(165, 180, 252, 0.7) !important;
  color: #fff !important;
}

.content {
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 48px;
}

@media (max-width: 640px) {
  .bar {
    margin: 8px 10px 0;
    padding: 10px 14px;
  }

  .brand-tag {
    display: none;
  }
}
</style>
