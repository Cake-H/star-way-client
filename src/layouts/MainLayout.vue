<template>
  <div class="layout">
    <header class="bar">
      <div class="left">
        <router-link class="brand" to="/">智能简历投递助手</router-link>
        <nav class="nav">
          <router-link class="nav-link" to="/" :class="{ active: isHome }">首页</router-link>
          <router-link class="nav-link" to="/resume" :class="{ active: isResumeSection }">我的简历</router-link>
        </nav>
      </div>
      <el-button type="primary" plain @click="onLogout">退出登录</el-button>
    </header>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { logout as logoutApi } from '@/api/auth'
import { clearSession } from '@/auth/session'

const router = useRouter()
const route = useRoute()
const isHome = computed(() => route.name === 'home')
const isResumeSection = computed(() => typeof route.path === 'string' && route.path.startsWith('/resume'))

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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f5f7ff 0%, #eef2ff 100%);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7f0;
  gap: 16px;
  flex-wrap: wrap;
}

.left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.brand {
  font-weight: 700;
  color: #1f2937;
  text-decoration: none;
  font-size: 16px;
}

.brand:hover {
  color: #2563eb;
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  padding: 6px 12px;
  border-radius: 8px;
  color: #4b5563;
  text-decoration: none;
  font-size: 14px;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-link.active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.content {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}
</style>
