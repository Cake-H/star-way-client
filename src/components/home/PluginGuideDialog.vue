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
            <h4 class="step-title">安装插件（需在电脑端 Edge / Chrome 操作）</h4>
            <div class="channel-switch">
              <button
                type="button"
                class="channel-btn"
                :class="{ active: channel === 'stable' }"
                @click="selectStable"
              >
                安装正式版
              </button>
              <button
                type="button"
                class="channel-btn"
                :class="{ active: channel === 'beta' }"
                @click="channel = 'beta'"
              >
                安装最新测试版
                <span v-if="betaVersion" class="beta-ver">{{ betaVersion }}</span>
              </button>
            </div>

            <!-- 正式版：浏览器商店一键安装，自动更新 -->
            <div v-if="channel === 'stable'" class="channel-panel">
              <p class="step-desc">通过浏览器扩展商店一键安装，后续版本自动更新，无需手动维护。</p>
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
              </div>
            </div>

            <!-- 测试版：下载 zip + 开发者模式加载 -->
            <div v-else class="channel-panel">
              <p class="step-desc">
                公测阶段通过测试包安装，功能与正式版一致；后续有新版时重新下载、按同样步骤覆盖加载即可。
              </p>
              <div class="beta-actions">
                <el-button
                  type="primary"
                  :disabled="!zipUrl"
                  @click="downloadBeta"
                >
                  <el-icon style="margin-right: 6px"><Download /></el-icon>
                  下载插件测试包{{ betaVersion ? ` ${betaVersion}` : '' }}
                </el-button>
                <el-tag v-if="!zipUrl" type="info" size="small" effect="plain">
                  测试包即将上传，请稍后再试
                </el-tag>
              </div>
              <ol class="install-steps">
                <li>下载完成后解压 zip，记住解压出的文件夹位置。</li>
                <li>Edge 地址栏输入 <code>edge://extensions</code> 并回车（Chrome 用 <code>chrome://extensions</code>）。</li>
                <li>打开页面左侧的「开发人员模式」开关。</li>
                <li>点击「加载解压缩的扩展」，选中刚解压出的文件夹。</li>
                <li>在扩展卡片上点「固定」，把图标固定到浏览器工具栏。</li>
              </ol>
              <p class="step-desc beta-warn">
                每次启动浏览器若提示「已禁用开发人员模式扩展」，选择「保留」即可，不影响使用。
              </p>
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChromeFilled, Download } from '@element-plus/icons-vue'
import {
  EXTENSION_BETA_VERSION,
  EXTENSION_NAME,
  EXTENSION_STORE_URLS,
  EXTENSION_ZIP_URL,
} from '@/config'

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
const zipUrl = EXTENSION_ZIP_URL
const betaVersion = EXTENSION_BETA_VERSION

/** 安装渠道：公测期默认展示测试版；正式版商店上架后切到 stable */
const channel = ref<'stable' | 'beta'>(hasStoreUrl.value ? 'stable' : 'beta')

function selectStable() {
  if (!hasStoreUrl.value) {
    ElMessage.info('正式版暂未开启，商店上架后开放，可先使用测试版')
    return
  }
  channel.value = 'stable'
}

async function downloadBeta() {
  if (!zipUrl) return
  // 文件缺失时 SPA 兜底会返回 200 + text/html（表现为整页跳回首页），
  // 所以点击前先 HEAD 探测，content-type 必须是 zip/octet-stream 才算存在
  try {
    const res = await fetch(zipUrl, { method: 'HEAD', cache: 'no-store' })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || /text\/html/i.test(type)) throw new Error('not found')
  } catch {
    ElMessage.warning('测试包暂未上传或下载地址未配置，请稍后再试')
    return
  }
  const a = document.createElement('a')
  a.href = zipUrl
  a.download = '' // 同源时强制下载，避免整页跳转
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

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
  color: var(--xt-on-accent);
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

.channel-switch {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}

.channel-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--xt-radius-sm);
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  color: var(--xt-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.channel-btn:hover {
  border-color: rgba(var(--xt-accent-rgb), 0.45);
  color: var(--xt-primary);
}

.channel-btn.active {
  background: rgba(var(--xt-accent-rgb), 0.12);
  border-color: var(--xt-primary);
  color: var(--xt-primary);
  font-weight: 600;
}

.beta-ver {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(var(--xt-accent-rgb), 0.16);
  color: var(--xt-primary);
}

.channel-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: var(--xt-radius-sm);
  border: 1px dashed var(--xt-border);
  background: var(--xt-surface);
}

.beta-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.install-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--xt-text-secondary);
}

.install-steps code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--xt-accent-rgb), 0.1);
  color: var(--xt-primary);
  font-size: 12px;
}

.beta-warn {
  color: var(--xt-warning, #b88230);
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
  background: rgba(var(--xt-accent-rgb), 0.08);
  border-color: rgba(var(--xt-accent-rgb), 0.45);
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
