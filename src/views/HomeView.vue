<template>
  <div class="home">
    <section class="xt-hero hero">
      <div class="xt-hero-inner hero-inner">
        <p class="xt-eyebrow">星途 · 智能简历投递助手</p>
        <h1 class="xt-hero-title">踏上职业星途，从一份好简历开始</h1>
        <p class="xt-hero-desc">
          上传 PDF / Word 由大模型生成结构化草稿，或从空白开始填写；保存后与「我的简历」列表、详情、编辑全链路打通。
        </p>
        <div class="hero-cta">
          <el-button type="primary" size="large" class="cta-primary" @click="goList">
            <el-icon class="ico"><FolderOpened /></el-icon>
            我的简历
          </el-button>
          <el-button size="large" class="cta-secondary" @click="goInterview">
            <el-icon class="ico"><ChatLineSquare /></el-icon>
            面试复盘
          </el-button>
          <el-button size="large" class="cta-secondary" @click="goUpload">
            <el-icon class="ico"><Upload /></el-icon>
            上传解析
          </el-button>
          <el-button size="large" plain class="cta-ghost" @click="goBlank">
            <el-icon class="ico"><DocumentAdd /></el-icon>
            空白新建
          </el-button>
        </div>
      </div>
      <div class="hero-deco" aria-hidden="true">
        <StarLogo size="lg" :glow="true" />
      </div>
    </section>

    <el-row :gutter="20" class="tiles">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="tile xt-clickable" shadow="hover" @click="goList">
          <div class="tile-icon-wrap">
            <el-icon class="tile-icon" :size="26"><FolderOpened /></el-icon>
          </div>
          <h2 class="tile-title">我的简历</h2>
          <p class="tile-text">查看已保存列表、默认标记与最近更新时间，进入详情或继续编辑。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="tile xt-clickable" shadow="hover" @click="goInterview">
          <div class="tile-icon-wrap interview">
            <el-icon class="tile-icon" :size="26"><ChatLineSquare /></el-icon>
          </div>
          <h2 class="tile-title">面试复盘</h2>
          <p class="tile-text">语音或手动记录面试题，AI 总结评价与参考答案，练习模式自测。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="tile xt-clickable" shadow="hover" @click="goUpload">
          <div class="tile-icon-wrap accent">
            <el-icon class="tile-icon" :size="26"><Upload /></el-icon>
          </div>
          <h2 class="tile-title">上传智能解析</h2>
          <p class="tile-text">支持 .pdf / .docx，解析完成后核对草稿并保存到云端。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="tile xt-clickable" shadow="hover" @click="goBlank">
          <div class="tile-icon-wrap">
            <el-icon class="tile-icon" :size="26"><DocumentAdd /></el-icon>
          </div>
          <h2 class="tile-title">空白简历</h2>
          <p class="tile-text">不经过解析，直接结构化填写并首次保存入库。</p>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="profile" class="session-card" shadow="never">
      <template #header>
        <span class="session-head">当前会话</span>
      </template>
      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item label="用户 ID">{{ profile.userId }}</el-descriptions-item>
        <el-descriptions-item label="是否新用户">
          <el-tag :type="profile.newUser ? 'warning' : 'success'" size="small">
            {{ profile.newUser ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="会话剩余" :span="2">
          约 {{ profile.expiresInSeconds }} 秒（以服务端为准）
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChatLineSquare, DocumentAdd, FolderOpened, Upload } from '@element-plus/icons-vue'
import StarLogo from '@/components/StarLogo.vue'
import { getProfile } from '@/auth/session'

const router = useRouter()
const profile = computed(() => getProfile())

function goList() {
  router.push({ name: 'resume-list' })
}
function goUpload() {
  router.push({ name: 'resume-upload' })
}
function goBlank() {
  router.push({ name: 'resume-new' })
}
function goInterview() {
  router.push({ name: 'interview-list' })
}
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.hero-inner {
  flex: 1;
  min-width: 260px;
}

.hero-deco {
  flex-shrink: 0;
  opacity: 0.85;
  padding-right: 8px;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-cta :deep(.el-button) {
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.cta-primary {
  background: #fff !important;
  color: var(--xt-primary-dark) !important;
  border-color: #fff !important;
  font-weight: 600;
}

.cta-primary:hover {
  background: #eef2ff !important;
  color: #4338ca !important;
}

.cta-secondary {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.28) !important;
  color: #fff !important;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.22) !important;
}

.cta-ghost {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}

.cta-ghost:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

.ico {
  margin-right: 6px;
  vertical-align: middle;
}

.tiles {
  margin: 0 !important;
}

.tile {
  height: 100%;
}

.tile-icon-wrap {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  margin-bottom: 14px;
  background: var(--el-color-primary-light-9);
}

.tile-icon-wrap.interview {
  background: rgba(99, 102, 241, 0.12);
}

.tile-icon-wrap.interview .tile-icon {
  color: var(--xt-primary-dark);
}

.tile-icon-wrap.accent {
  background: var(--xt-accent-soft);
}

.tile-icon {
  color: var(--xt-primary);
}

.tile-icon-wrap.accent .tile-icon {
  color: #d97706;
}

.tile-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--xt-text);
}

.tile-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--xt-text-secondary);
}

.session-card {
  border-radius: var(--xt-radius-md);
}

.session-head {
  font-weight: 600;
  color: var(--xt-text);
}
</style>
