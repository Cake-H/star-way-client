<template>
  <div class="layout">
    <StarryBackground v-if="!hideStarry" variant="subtle" />
    <el-alert
      v-if="needRefresh"
      :closable="false"
      type="success"
      show-icon
      class="pwa-update-toast"
    >
      <template #title>
        <span class="pwa-update-text">发现新版本，是否立即更新？</span>
        <el-button type="primary" size="small" @click="acceptUpdate">立即更新</el-button>
        <el-button size="small" text @click="dismissUpdate">稍后</el-button>
      </template>
    </el-alert>
    <el-alert
      v-if="showInstallPrompt"
      :closable="false"
      type="info"
      show-icon
      class="pwa-install-toast"
    >
      <template #title>
        <span class="pwa-install-text">安装到主屏幕，使用更方便</span>
        <template v-if="isIOS">
          <span class="ios-hint">iPhone 请点底部</span>
          <el-icon class="ios-share-icon"><Share /></el-icon>
          <span class="ios-hint">，再选「添加到主屏幕」</span>
        </template>
        <template v-else>
          <el-button type="primary" size="small" @click="installPWA">立即安装</el-button>
        </template>
        <el-button size="small" text @click="dismissInstall">暂不</el-button>
      </template>
    </el-alert>
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
          <router-link class="nav-link" to="/mock-interview" :class="{ active: isMockInterviewSection }">模拟面试</router-link>
          <router-link class="nav-link" to="/interview" :class="{ active: isInterviewSection }">面试复盘</router-link>
        </nav>
      </div>
      <div class="right-actions">
        <el-button v-if="isLoggedIn" class="quota-btn" type="info" plain @click="goQuota">
          <el-icon class="quota-ico"><Wallet /></el-icon>
          额度
        </el-button>
        <el-button v-if="isLoggedIn" class="logout-btn" type="primary" plain @click="onLogout">退出登录</el-button>
        <el-button v-else class="logout-btn" type="primary" plain @click="goLogin">登录/注册</el-button>
      </div>
    </header>
    <main class="content xt-main-content" :class="{ 'content--wide': isHome }">
      <router-view />
    </main>

    <LoginRequiredDialog
      v-model="loginPromptVisible"
      :redirect="loginPromptRedirect"
    />
    <QuotaInsufficientDialog v-model="quotaPromptVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Share, Wallet } from '@element-plus/icons-vue'
import StarLogo from '@/components/StarLogo.vue'
import StarryBackground from '@/components/StarryBackground.vue'
import LoginRequiredDialog from '@/components/LoginRequiredDialog.vue'
import QuotaInsufficientDialog from '@/components/QuotaInsufficientDialog.vue'
import { usePWA } from '@/composables/usePWA'
import { usePWAInstall } from '@/composables/usePWAInstall'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import { useQuotaPrompt } from '@/composables/useQuotaPrompt'
import { logout as logoutApi } from '@/api/auth'
import { authToken, clearSession } from '@/auth/session'

const router = useRouter()
const route = useRoute()
const { needRefresh, acceptUpdate, dismissUpdate } = usePWA()
const { isInstallable, isIOS, install: installPWA, dismiss: dismissInstall } = usePWAInstall()
const { loginPromptVisible, loginPromptRedirect } = useLoginPrompt()
const { quotaPromptVisible } = useQuotaPrompt()

const isLoggedIn = computed(() => !!authToken.value)

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
})

const showInstallPrompt = computed(() => isInstallable.value && !isStandalone.value)
const hideStarry = computed(() => !!(route.meta.hideStarry as boolean | undefined))
const isHome = computed(() => route.name === 'home')
const isResumeSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/resume'))
const isInterviewSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/interview'))
const isMockInterviewSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/mock-interview'))

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

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

function goQuota() {
  router.push({ name: 'quota-center' })
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
  flex-wrap: wrap;
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
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-link.active {
  background: rgba(59,130,246, 0.35);
  color: #fff;
  font-weight: 600;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.quota-btn {
  border-color: rgba(34, 211, 238, 0.45) !important;
  color: #a5f3fc !important;
  background: rgba(34, 211, 238, 0.08) !important;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.quota-btn:hover {
  background: rgba(34, 211, 238, 0.18) !important;
  border-color: rgba(34, 211, 238, 0.6) !important;
  color: #fff !important;
}

.quota-ico {
  margin-right: 4px;
}

.logout-btn {
  border-color: rgba(96,165,250, 0.55) !important;
  color: #bfdbfe !important;
  background: rgba(59,130,246, 0.12) !important;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.logout-btn:hover {
  background: rgba(59,130,246, 0.28) !important;
  border-color: rgba(147,197,253, 0.7) !important;
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

.content--wide {
  max-width: none;
  width: calc(100% - 180px);
  margin: 0 100px;
  padding: 20px 0 48px;
}

@media (max-width: 640px) {
  .content--wide {
    width: calc(100% - 40px);
    margin: 0 20px;
    padding: 16px 0 32px;
  }
}

.pwa-install-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  min-width: 320px;
  max-width: 90vw;
}

.pwa-install-text {
  margin-right: 8px;
}

.ios-hint {
  margin: 0 4px;
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.ios-share-icon {
  vertical-align: middle;
  color: var(--el-color-primary);
}

@media (max-width: 640px) {
  .pwa-update-toast,
  .pwa-install-toast {
    top: 8px;
    min-width: auto;
    width: calc(100vw - 20px);
  }

  .pwa-update-text,
  .pwa-install-text {
    display: block;
    margin: 0 0 8px;
  }

  .ios-hint {
    display: inline;
  }

  .bar {
    margin: 8px 10px 0;
    padding: 10px 14px;
  }

  .brand-tag {
    display: none;
  }

  .nav {
    gap: 4px;
  }

  .nav-link {
    padding: 6px 10px;
    font-size: 13px;
  }
}
</style>
