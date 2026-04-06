<template>
  <div class="home">
    <header class="bar">
      <div class="left">
        <span class="name">智能简历投递助手</span>
      </div>
      <el-button type="primary" plain @click="onLogout">退出登录</el-button>
    </header>

    <main class="main">
      <el-card class="panel" shadow="never">
        <template #header>
          <span>已登录</span>
        </template>
        <p v-if="profile">用户 ID：{{ profile.userId }}</p>
        <p v-if="profile">
          是否新用户：
          <el-tag :type="profile.newUser ? 'warning' : 'success'" size="small">
            {{ profile.newUser ? '是' : '否' }}
          </el-tag>
        </p>
        <p v-if="profile">会话剩余约 {{ profile.expiresInSeconds }} 秒（以服务端为准）</p>
        <p class="hint">后续功能可在此页扩展；当前为占位首页。</p>
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { logout as logoutApi } from '@/api/auth'
import { clearSession, getProfile } from '@/auth/session'

const router = useRouter()
const profile = computed(() => getProfile())

async function onLogout() {
  let remoteOk = false
  try {
    await logoutApi()
    remoteOk = true
  } catch {
    // 错误信息由 axios 拦截器统一提示
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
.home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7ff 0%, #eef2ff 100%);
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7f0;
}

.name {
  font-weight: 650;
  color: #1f2937;
}

.main {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 16px;
}

.panel {
  border-radius: 12px;
}

.hint {
  margin-top: 12px;
  color: #6b7280;
  font-size: 13px;
}
</style>
