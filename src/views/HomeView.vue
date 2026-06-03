<template>
  <div class="home">
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">智能简历投递助手</p>
        <h1 class="hero-title">高效管理简历，一键解析与入库</h1>
        <p class="hero-desc">
          上传 PDF / Word 由大模型生成结构化草稿，或从空白开始填写；保存后与「我的简历」列表、详情、编辑全链路打通。
        </p>
        <div class="hero-cta">
          <el-button type="primary" size="large" @click="goList">
            <el-icon class="ico"><FolderOpened /></el-icon>
            我的简历
          </el-button>
          <el-button size="large" @click="goUpload">
            <el-icon class="ico"><Upload /></el-icon>
            上传解析
          </el-button>
          <el-button size="large" plain @click="goBlank">
            <el-icon class="ico"><DocumentAdd /></el-icon>
            空白新建
          </el-button>
        </div>
      </div>
    </section>

    <el-row :gutter="20" class="tiles">
      <el-col :xs="24" :md="8">
        <el-card class="tile" shadow="hover" @click="goList">
          <el-icon class="tile-icon" :size="28"><FolderOpened /></el-icon>
          <h2 class="tile-title">我的简历</h2>
          <p class="tile-text">查看已保存列表、默认标记与最近更新时间，进入详情或继续编辑。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="tile" shadow="hover" @click="goUpload">
          <el-icon class="tile-icon" :size="28"><Upload /></el-icon>
          <h2 class="tile-title">上传智能解析</h2>
          <p class="tile-text">支持 .pdf / .docx，解析完成后核对草稿并保存到云端。</p>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="tile" shadow="hover" @click="goBlank">
          <el-icon class="tile-icon" :size="28"><DocumentAdd /></el-icon>
          <h2 class="tile-title">空白简历</h2>
          <p class="tile-text">不经过解析，直接结构化填写并首次保存入库。</p>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="profile" class="session-card" shadow="never">
      <template #header>
        <span>当前会话</span>
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
import { DocumentAdd, FolderOpened, Upload } from '@element-plus/icons-vue'
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
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  border-radius: 20px;
  padding: 32px 28px;
  background: linear-gradient(125deg, #1d4ed8 0%, #3b82f6 42%, #6366f1 100%);
  color: #fff;
  box-shadow: 0 20px 50px rgba(37, 99, 235, 0.25);
}

.hero-inner {
  max-width: 720px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.hero-title {
  margin: 0 0 12px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.hero-desc {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.65;
  opacity: 0.92;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-cta :deep(.el-button--primary) {
  background: #fff;
  color: #1d4ed8;
  border-color: #fff;
  font-weight: 600;
}

.hero-cta :deep(.el-button--primary:hover) {
  background: #eff6ff;
  color: #1e40af;
}

.ico {
  margin-right: 6px;
  vertical-align: middle;
}

.tiles {
  margin: 0 !important;
}

.tile {
  border-radius: 14px;
  height: 100%;
  cursor: pointer;
  transition: transform 0.15s ease;
  border: 1px solid var(--el-border-color-lighter);
}

.tile:hover {
  transform: translateY(-2px);
}

.tile-icon {
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.tile-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}

.tile-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}

.session-card {
  border-radius: 14px;
}
</style>
