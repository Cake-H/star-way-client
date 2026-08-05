<template>
  <el-dialog
    v-model="visible"
    :title="`${EXTENSION_NAME} · 简历一键填入`"
    width="640px"
    align-center
    class="plugin-guide-dialog"
    destroy-on-close
    :modal="false"
    :lock-scroll="false"
    :close-on-click-modal="false"
  >
    <div class="guide-body">
      <p class="guide-lead">
        安装浏览器插件后，在任意网申页打开插件侧栏，即可把星途云端简历一键填入招聘表单，省去反复复制粘贴。
      </p>

      <el-alert
        v-if="!hasResume"
        title="还没有简历"
        type="warning"
        :closable="false"
        show-icon
        class="resume-alert"
      >
        <div class="alert-row">
          <span>插件需要先从星途同步简历，请先在 APP 内创建至少一份简历。</span>
          <el-button type="primary" size="small" @click="goCreateResume">去创建简历</el-button>
        </div>
      </el-alert>

      <el-alert
        v-else
        title="简历已就绪"
        type="success"
        :closable="false"
        show-icon
        class="resume-alert"
      >
        已保存 {{ resumeCount }} 份简历，插件登录同一账号后即可同步使用。
      </el-alert>

      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <h4 class="step-title">安装插件</h4>
            <p class="step-desc">从浏览器商店安装扩展；如尚未上架，可加载插件仓库的 dist 目录作为「已解压的扩展程序」。</p>
            <div class="store-actions">
              <a
                v-if="storeUrls.chrome"
                :href="storeUrls.chrome"
                target="_blank"
                rel="noopener"
                class="store-link"
              >
                <el-icon><ChromeFilled /></el-icon>
                Chrome 商店
              </a>
              <a
                v-if="storeUrls.edge"
                :href="storeUrls.edge"
                target="_blank"
                rel="noopener"
                class="store-link"
              >
                <el-icon><ChromeFilled /></el-icon>
                Edge 加载项
              </a>
              <a
                v-if="storeUrls.firefox"
                :href="storeUrls.firefox"
                target="_blank"
                rel="noopener"
                class="store-link"
              >
                <el-icon><ChromeFilled /></el-icon>
                Firefox 附加组件
              </a>
              <el-tag v-if="!hasStoreUrl" type="info" size="small" effect="plain">
                商店链接待配置，请联系管理员获取安装包
              </el-tag>
            </div>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <h4 class="step-title">登录同一账号</h4>
            <p class="step-desc">
              点击浏览器工具栏的扩展图标，使用与星途 APP 相同的手机号验证码登录。首次登录的新用户，请回到本 APP 完善简历资料。
            </p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <h4 class="step-title">同步并选择简历</h4>
            <p class="step-desc">
              在插件面板中点击「同步简历」拉取云端草稿，随后从下拉框选择要用于填充的简历。建议将默认简历设为常用投递简历。
            </p>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-content">
            <h4 class="step-title">打开网申页一键填入</h4>
            <p class="step-desc">
              进入目标招聘网站的申请表页面，在插件侧栏点击「智能一键填入」，云端将分析表单并把对应字段写入页面。建议提交前人工核对一遍。
            </p>
          </div>
        </div>
      </div>

      <el-divider />

      <div class="guide-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>
          小提示：把扩展固定在浏览器工具栏，并在招聘页打开侧栏，可与网申页面并排操作，填表进度实时可见。
        </span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="!hasResume" type="primary" @click="goCreateResume">先创建简历</el-button>
        <el-button @click="visible = false">知道了</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChromeFilled, InfoFilled } from '@element-plus/icons-vue'
import { EXTENSION_NAME, EXTENSION_STORE_URLS } from '@/config'

const props = defineProps<{
  modelValue: boolean
  resumeCount: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const hasResume = computed(() => props.resumeCount > 0)
const storeUrls = EXTENSION_STORE_URLS
const hasStoreUrl = computed(
  () => !!storeUrls.chrome || !!storeUrls.edge || !!storeUrls.firefox,
)

function goCreateResume() {
  visible.value = false
  router.push({ name: 'resume-new' })
}
</script>

<style scoped>
.guide-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-body :deep(.el-divider) {
  margin: 4px 0;
}

.guide-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--xt-text-secondary);
}

.resume-alert :deep(.el-alert__content) {
  width: 100%;
}

.alert-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.step-item {
  display: flex;
  gap: 14px;
}

.step-num {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--xt-primary);
  color: #1c1206;
  font-size: 14px;
  font-weight: 700;
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--xt-text);
}

.step-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--xt-text-secondary);
}

.store-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.store-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--xt-radius-sm);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
  color: var(--xt-text);
  font-size: 13px;
  text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.store-link:hover {
  background: rgba(232, 163, 61, 0.08);
  border-color: rgba(232, 163, 61, 0.45);
  color: var(--xt-primary);
}

.guide-tip {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--xt-radius-sm);
  background: rgba(232, 163, 61, 0.06);
  color: var(--xt-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.guide-tip .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--xt-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

<style>
/* 限制弹窗高度，避免在大屏上拉满全屏（el-dialog 被 teleport 到 body，需用全局样式） */
.plugin-guide-dialog {
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}

.plugin-guide-dialog .el-dialog__body {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

@media (max-width: 768px) {
  .plugin-guide-dialog {
    max-height: 70vh;
    width: 85vw !important;
    margin: 15vh auto auto auto !important;
  }
}
</style>
