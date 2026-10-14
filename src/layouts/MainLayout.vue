<template>
  <div class="layout">
    <StarryBackground v-if="!hideStarry" :variant="isHome ? 'dark' : 'subtle'" />
    <div class="grain-overlay" aria-hidden="true" />
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
        <nav v-if="!isMobile" class="nav" aria-label="主导航">
          <router-link class="nav-link" to="/" :class="{ active: isHome }">首页</router-link>
          <router-link class="nav-link" to="/resume" :class="{ active: isResumeSection }">我的简历</router-link>
          <router-link class="nav-link" to="/applications" :class="{ active: isApplicationSection }">投递记录</router-link>
          <router-link class="nav-link" to="/mock-interview" :class="{ active: isMockInterviewSection }">模拟面试</router-link>
          <router-link class="nav-link" to="/interview" :class="{ active: isInterviewSection }">面试复盘</router-link>
        </nav>
      </div>
      <!-- PC：额度 + 退出/登录 + 设置（账号注销） -->
      <div v-if="!isMobile" class="right-actions">
        <!-- 破晓：日/夜切换（复用同一时间线，压缩至 1.2s） -->
        <button
          type="button"
          class="theme-toggle"
          :aria-label="dawnTheme === 'dawn' ? '切换到夜间模式' : '切换到破晓模式'"
          :title="dawnTheme === 'dawn' ? '切换到夜间模式' : '切换到破晓模式'"
          @click="toggleDawn('nav')"
        >
          <el-icon :size="17"><Sunny v-if="dawnTheme === 'dawn'" /><Moon v-else /></el-icon>
        </button>
        <el-button v-if="isLoggedIn" class="quota-btn" type="info" plain @click="goQuota">
          <el-icon class="quota-ico"><Wallet /></el-icon>
          额度
        </el-button>
        <el-button v-if="isLoggedIn" class="logout-btn" type="primary" plain @click="onLogout">退出登录</el-button>
        <el-button v-else class="logout-btn" type="primary" plain @click="goLogin">登录/注册</el-button>
        <el-dropdown v-if="isLoggedIn" trigger="click" @command="onSettingsCommand">
          <button type="button" class="settings-btn" aria-label="设置">
            <el-icon :size="17"><Setting /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="delete-account">账号注销</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <!-- 移动端：头像入口（额度、退出登录收入菜单） -->
      <div v-else class="avatar-entry">
        <!-- 破晓：日/夜切换 -->
        <button
          type="button"
          class="theme-toggle"
          :aria-label="dawnTheme === 'dawn' ? '切换到夜间模式' : '切换到破晓模式'"
          @click="toggleDawn('nav')"
        >
          <el-icon :size="17"><Sunny v-if="dawnTheme === 'dawn'" /><Moon v-else /></el-icon>
        </button>
        <el-button v-if="!isLoggedIn" class="logout-btn" type="primary" plain @click="goLogin">登录/注册</el-button>
        <button
          v-else
          type="button"
          class="avatar-btn"
          aria-label="账号菜单"
          :aria-expanded="avatarMenuOpen"
          @click="avatarMenuOpen = !avatarMenuOpen"
        >
          <el-icon :size="18"><User /></el-icon>
        </button>
      </div>
    </header>

    <!-- 移动端头像菜单 -->
    <template v-if="isMobile && avatarMenuOpen">
      <div class="avatar-menu-mask" @click="avatarMenuOpen = false" />
      <div class="avatar-menu" role="menu">
        <button type="button" class="avatar-menu-item" role="menuitem" @click="goQuotaFromMenu">
          <el-icon :size="16"><Wallet /></el-icon>
          星能补给站
        </button>
        <button type="button" class="avatar-menu-item" role="menuitem" @click="openDeleteAccount">
          <el-icon :size="16"><Setting /></el-icon>
          账号注销
        </button>
        <button type="button" class="avatar-menu-item" role="menuitem" @click="onLogoutFromMenu">
          <el-icon :size="16"><SwitchButton /></el-icon>
          退出登录
        </button>
      </div>
    </template>

    <!-- 移动端底部 Tab Bar -->
    <nav v-if="isMobile" class="tabbar" aria-label="底部导航">
      <router-link
        v-for="t in tabs"
        :key="t.label"
        class="tab"
        :class="{ active: t.active.value }"
        :to="t.to"
      >
        <el-icon :size="20"><component :is="t.icon" /></el-icon>
        <span class="tab-label">{{ t.label }}</span>
      </router-link>
    </nav>
    <main class="content xt-main-content" :class="{ 'content--wide': isHome, 'content--tabbar': isMobile }">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <LoginRequiredDialog
      v-model="loginPromptVisible"
      :redirect="loginPromptRedirect"
    />
    <QuotaInsufficientDialog v-model="quotaPromptVisible" />
    <AccountDeleteDialog v-model="accountDeleteVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ChatLineSquare,
  Document,
  House,
  MagicStick,
  Moon,
  Notebook,
  Setting,
  Share,
  Sunny,
  SwitchButton,
  User,
  Wallet,
} from '@element-plus/icons-vue'
import StarLogo from '@/components/StarLogo.vue'
import StarryBackground from '@/components/StarryBackground.vue'
import LoginRequiredDialog from '@/components/LoginRequiredDialog.vue'
import QuotaInsufficientDialog from '@/components/QuotaInsufficientDialog.vue'
import AccountDeleteDialog from '@/components/AccountDeleteDialog.vue'
import { dawnTheme, toggleDawn } from '@/theme/useDawnTransition'
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

/* —— 移动端导航：顶部精简栏 + 底部 Tab Bar —— */
const isMobile = ref(false)
const avatarMenuOpen = ref(false)

function onResize() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) avatarMenuOpen.value = false
}

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

// 路由变化时收起头像菜单
watch(
  () => route.fullPath,
  () => {
    avatarMenuOpen.value = false
  },
)

const tabs = computed(() => [
  { label: '首页', to: '/', icon: House, active: isHome },
  { label: '简历', to: '/resume', icon: Document, active: isResumeSection },
  { label: '投递', to: '/applications', icon: Notebook, active: isApplicationSection },
  { label: '面试', to: '/mock-interview', icon: MagicStick, active: isMockInterviewSection },
  { label: '复盘', to: '/interview', icon: ChatLineSquare, active: isInterviewSection },
])

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
const isApplicationSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/applications'))
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

function goQuotaFromMenu() {
  avatarMenuOpen.value = false
  goQuota()
}

async function onLogoutFromMenu() {
  avatarMenuOpen.value = false
  await onLogout()
}

/* —— 设置 → 账号注销 —— */
const accountDeleteVisible = ref(false)

function openDeleteAccount() {
  avatarMenuOpen.value = false
  accountDeleteVisible.value = true
}

function onSettingsCommand(command: string) {
  if (command === 'delete-account') accountDeleteVisible.value = true
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
  background: #0a0a0d;
  border: 1px solid rgba(232, 230, 224, 0.08);
  border-bottom: 1px solid rgba(232, 230, 224, 0.12);
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
  position: relative;
  padding: 7px 14px;
  border-radius: var(--xt-radius-sm);
  color: var(--xt-text-on-dark-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--xt-text-on-dark);
}

/* 当前项：琥珀色 + 2px 下划线指示 */
.nav-link.active {
  color: #e8a33d;
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 2px;
  background: #e8a33d;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.quota-btn {
  border: 1px solid rgba(232, 163, 61, 0.4) !important;
  color: #e8a33d !important;
  background: transparent !important;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.quota-btn:hover {
  background: rgba(232, 163, 61, 0.1) !important;
  border-color: rgba(232, 163, 61, 0.65) !important;
}

.quota-ico {
  margin-right: 4px;
}

.logout-btn {
  border: 1px solid rgba(232, 230, 224, 0.2) !important;
  color: var(--xt-text-on-dark) !important;
  background: transparent !important;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.logout-btn:hover {
  border-color: rgba(232, 230, 224, 0.4) !important;
  color: #e8a33d !important;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(232, 230, 224, 0.16);
  background: transparent;
  color: var(--xt-text-on-dark);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.settings-btn:hover {
  border-color: rgba(232, 163, 61, 0.5);
  color: #e8a33d;
}

/* 破晓：日/夜切换按钮（样式与 settings-btn 一致；亮主题配色由 dawn.css 变量接管） */
.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(232, 230, 224, 0.16);
  background: transparent;
  color: var(--xt-text-on-dark);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.theme-toggle:hover {
  border-color: rgba(232, 163, 61, 0.5);
  color: #e8a33d;
}

.avatar-entry .theme-toggle {
  margin-right: 10px;
}

/* —— 移动端：头像入口 + 菜单 + 底部 Tab Bar —— */
.avatar-entry {
  display: flex;
  align-items: center;
}

.avatar-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(232, 230, 224, 0.16);
  background: #101014;
  color: var(--xt-text-on-dark);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.avatar-btn:active {
  border-color: rgba(232, 163, 61, 0.5);
  color: #e8a33d;
}

.avatar-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 998;
  background: rgba(6, 6, 8, 0.45);
}

.avatar-menu {
  position: fixed;
  top: 66px;
  right: 12px;
  z-index: 999;
  min-width: 168px;
  padding: 6px;
  border-radius: var(--xt-radius-md);
  background: #101014;
  border: 1px solid rgba(232, 230, 224, 0.1);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.avatar-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--xt-radius-sm);
  background: none;
  color: var(--xt-text-on-dark);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.avatar-menu-item:active {
  background: rgba(232, 230, 224, 0.06);
  color: #e8a33d;
}

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  background: #0a0a0d;
  border-top: 1px solid rgba(232, 230, 224, 0.1);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 56px;
  color: var(--xt-text-on-dark-muted);
  text-decoration: none;
  font-size: 11px;
}

.tab.active {
  color: #e8a33d;
}

.content--tabbar {
  padding-bottom: calc(76px + env(safe-area-inset-bottom));
}

/* 全局噪点纹理（film grain 2%） */
.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 1999;
  pointer-events: none;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
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

/* 内页切换：fadeIn + translateY(12px) 0.3s（reduced-motion 由全局规则降级） */
.page-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-fade-leave-active {
  transition: opacity 0.12s ease;
}

.page-fade-leave-to {
  opacity: 0;
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
