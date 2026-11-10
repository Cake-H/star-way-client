<template>
  <el-dialog
    v-model="visible"
    width="560px"
    align-center
    class="feedback-dialog"
    destroy-on-close
    @closed="onClosed"
  >
    <template #header>
      <div class="dlg-head">
        <span class="dlg-title">意见反馈</span>
        <span class="dlg-sub">你的每一条建议，都是星途前进的坐标</span>
      </div>
    </template>

    <!-- 分段切换 -->
    <div class="seg" role="tablist">
      <button
        type="button"
        class="seg-btn"
        :class="{ active: tab === 'compose' }"
        role="tab"
        :aria-selected="tab === 'compose'"
        @click="tab = 'compose'"
      >
        写反馈
      </button>
      <button
        type="button"
        class="seg-btn"
        :class="{ active: tab === 'list' }"
        role="tab"
        :aria-selected="tab === 'list'"
        @click="switchToList"
      >
        我的反馈
      </button>
    </div>

    <!-- —— 写反馈 —— -->
    <div v-show="tab === 'compose'" class="compose">
      <!-- 提交成功：友好确认画面 -->
      <div v-if="submitted" class="success-pane">
        <div class="success-orb">
          <div class="success-ring" />
          <el-icon :size="30" class="success-icon"><Promotion /></el-icon>
        </div>
        <p class="success-title">您的宝贵意见已传达</p>
        <p class="success-sub">
          我们会认真核查并尽快处理，处理进度和官方回复可随时在「我的反馈」中查看。
        </p>
        <div class="success-actions">
          <el-button type="primary" @click="goListFromSuccess">查看我的反馈</el-button>
          <el-button plain @click="composeAgain">再写一条</el-button>
        </div>
      </div>

      <template v-else>
      <el-input
        v-model="content"
        type="textarea"
        :rows="5"
        maxlength="2000"
        show-word-limit
        placeholder="描述你遇到的问题或建议：哪个页面、做了什么操作、期望的效果…"
        class="content-input"
      />
      <el-input
        v-model="email"
        maxlength="128"
        placeholder="联系邮箱（选填，便于我们回复你）"
        class="email-input"
      />

      <div class="attach">
        <div class="attach-grid">
          <div v-for="(f, i) in files" :key="f.key" class="attach-item">
            <img v-if="f.isImage" :src="f.preview" :alt="f.file.name" class="attach-thumb" />
            <div v-else class="attach-thumb video-tile">
              <el-icon :size="20"><VideoPlay /></el-icon>
              <span class="video-name">{{ f.file.name }}</span>
            </div>
            <button
              type="button"
              class="attach-remove"
              :aria-label="`移除附件 ${f.file.name}`"
              @click="removeFile(i)"
            >
              <el-icon :size="12"><Close /></el-icon>
            </button>
          </div>
          <button
            v-if="files.length < MAX_FILES"
            type="button"
            class="attach-add"
            @click="fileInputRef?.click()"
          >
            <el-icon :size="18"><Plus /></el-icon>
            <span>截图 / 录屏</span>
          </button>
        </div>
        <p class="attach-tip">最多 {{ MAX_FILES }} 个，单个 ≤ 50MB，支持 jpg / png / webp / gif / mp4 / mov</p>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
          @change="onFilesPicked"
        />
      </div>

      <el-button
        type="primary"
        class="submit-btn"
        :loading="submitting"
        @click="onSubmit"
      >
        提交反馈
      </el-button>
      </template>
    </div>

    <!-- —— 我的反馈 —— -->
    <div v-show="tab === 'list'" class="my-list">
      <el-skeleton v-if="loadingList && !listLoaded" :rows="4" animated />
      <el-empty
        v-else-if="!items.length"
        description="还没有反馈记录，去写第一条吧"
        :image-size="72"
      />
      <div v-else class="fb-list">
        <article v-for="it in items" :key="it.feedbackId" class="fb-item">
          <div class="fb-head">
            <el-tag :type="statusTagType(it.status)" size="small" effect="light" round>
              {{ it.statusLabel }}
            </el-tag>
            <time class="fb-time">{{ formatDateTime(it.createdAt) }}</time>
          </div>
          <p class="fb-content">{{ it.content }}</p>
          <div v-if="it.attachments.length" class="fb-attach">
            <template v-for="(a, ai) in it.attachments" :key="ai">
              <img
                v-if="a.mediaType === 'IMAGE' && a.url"
                :src="a.url"
                :alt="a.fileName"
                class="fb-attach-img"
                @click="openAttachment(a.url)"
              />
              <video
                v-else-if="a.mediaType === 'VIDEO' && a.url"
                :src="a.url"
                class="fb-attach-video"
                controls
                preload="metadata"
              />
              <span v-else class="fb-attach-expired">附件链接已过期，重新打开本页签可刷新</span>
            </template>
          </div>
          <div v-if="it.adminNote" class="fb-reply">
            <span class="reply-label">官方回复</span>
            <p class="reply-text">{{ it.adminNote }}</p>
          </div>
        </article>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Close, Plus, Promotion, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  listMyFeedback,
  submitFeedback,
  type AppFeedbackListItemVO,
  type FeedbackStatus,
} from '@/api/feedback'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  modelValue: boolean
  initialTab?: 'compose' | 'list'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const MAX_FILES = 6
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
])
const EMAIL_RE = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/

const tab = ref<'compose' | 'list'>('compose')
const submitted = ref(false)
const content = ref('')
const email = ref('')
const submitting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

interface LocalFile {
  key: string
  file: File
  isImage: boolean
  preview: string
}

const files = ref<LocalFile[]>([])

const items = ref<AppFeedbackListItemVO[]>([])
const loadingList = ref(false)
/** 仅用于区分首次加载（显示骨架屏）与后续静默刷新，不做数据缓存拦截 */
const listLoaded = ref(false)

watch(visible, (v) => {
  if (!v) return
  tab.value = props.initialTab ?? 'compose'
  if (tab.value === 'list') loadList()
})

function switchToList() {
  tab.value = 'list'
  loadList()
}

async function loadList() {
  // 每次进入列表都重新拉取：后台处理状态会变，本地不得缓存旧数据
  if (loadingList.value) return
  loadingList.value = true
  try {
    items.value = await listMyFeedback()
    listLoaded.value = true
  } catch {
    /* 拦截器已提示 */
  } finally {
    loadingList.value = false
  }
}

function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  for (const file of picked) {
    if (files.value.length >= MAX_FILES) {
      ElMessage.warning(`附件最多 ${MAX_FILES} 个`)
      break
    }
    if (!ALLOWED_MIME.has(file.type)) {
      ElMessage.warning(`「${file.name}」类型不支持，仅限图片或 mp4/mov 视频`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      ElMessage.warning(`「${file.name}」超过 50MB`)
      continue
    }
    const isImage = file.type.startsWith('image/')
    files.value.push({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      isImage,
      preview: isImage ? URL.createObjectURL(file) : '',
    })
  }
}

function removeFile(index: number) {
  const [f] = files.value.splice(index, 1)
  if (f?.preview) URL.revokeObjectURL(f.preview)
}

function resetCompose() {
  content.value = ''
  email.value = ''
  files.value.forEach((f) => f.preview && URL.revokeObjectURL(f.preview))
  files.value = []
}

async function onSubmit() {
  const text = content.value.trim()
  if (!text) {
    ElMessage.warning('先写点内容再提交吧')
    return
  }
  if (text.length > 2000) {
    ElMessage.warning('反馈内容不能超过 2000 字')
    return
  }
  const mail = email.value.trim()
  if (mail && !EMAIL_RE.test(mail)) {
    ElMessage.warning('联系邮箱格式不正确')
    return
  }
  submitting.value = true
  try {
    await submitFeedback({
      content: text,
      contactEmail: mail || undefined,
      attachments: files.value.map((f) => f.file),
    })
    resetCompose()
    listLoaded.value = false
    // 友好确认画面代替一行 toast，用户明确知道「已送达」
    submitted.value = true
  } catch {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}

function goListFromSuccess() {
  submitted.value = false
  switchToList()
}

function composeAgain() {
  submitted.value = false
}

function statusTagType(status: FeedbackStatus) {
  if (status === 'RESOLVED') return 'success'
  if (status === 'PROCESSING') return 'warning'
  return 'info'
}

function openAttachment(url: string) {
  window.open(url, '_blank', 'noopener')
}

function onClosed() {
  resetCompose()
  submitted.value = false
  tab.value = 'compose'
}
</script>

<style scoped>
.dlg-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dlg-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--xt-text);
}

.dlg-sub {
  font-size: 12px;
  color: var(--xt-text-muted);
}

/* —— 分段切换：胶囊轨 + 琥珀激活块 —— */
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  border-radius: 999px;
  background: var(--xt-surface-muted, rgba(232, 230, 224, 0.05));
  border: 1px solid var(--xt-border);
}

.seg-btn {
  min-height: 34px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--xt-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.seg-btn.active {
  background: rgba(232, 163, 61, 0.16);
  color: var(--xt-primary);
}

.compose {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-input :deep(.el-textarea__inner) {
  line-height: 1.6;
}

/* —— 附件九宫格 —— */
.attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attach-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--xt-radius-sm);
  overflow: hidden;
  border: 1px solid var(--xt-border);
}

.attach-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  background: rgba(232, 230, 224, 0.04);
  color: var(--xt-text-muted);
}

.video-name {
  font-size: 10px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  cursor: pointer;
}

.attach-add {
  width: 72px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: var(--xt-radius-sm);
  border: 1px dashed var(--xt-border-strong);
  background: transparent;
  color: var(--xt-text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.attach-add:hover {
  border-color: rgba(232, 163, 61, 0.55);
  color: var(--xt-primary);
}

.attach-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--xt-text-muted);
}

.submit-btn {
  align-self: flex-end;
  min-width: 128px;
}

/* —— 提交成功画面 —— */
.success-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 8px 10px;
  text-align: center;
}

.success-orb {
  position: relative;
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.success-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px dashed rgba(232, 163, 61, 0.4);
  animation: success-spin 12s linear infinite;
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--xt-primary) 0%, var(--xt-primary-dark) 100%);
  color: #1c1206;
  box-shadow: 0 0 24px rgba(232, 163, 61, 0.35);
}

.success-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--xt-text);
}

.success-sub {
  margin: 0;
  max-width: 340px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--xt-text-secondary);
}

.success-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

@keyframes success-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* —— 我的反馈列表 —— */
.fb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 2px;
}

.fb-item {
  padding: 14px;
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
}

.fb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.fb-time {
  font-size: 12px;
  color: var(--xt-text-muted);
  font-variant-numeric: tabular-nums;
}

.fb-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--xt-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.fb-attach {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.fb-attach-img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--xt-radius-sm);
  border: 1px solid var(--xt-border);
  cursor: zoom-in;
}

.fb-attach-video {
  width: 220px;
  max-width: 100%;
  border-radius: var(--xt-radius-sm);
  border: 1px solid var(--xt-border);
}

.fb-attach-expired {
  font-size: 12px;
  color: var(--xt-text-muted);
}

/* 官方回复：琥珀左边条 + 浅底，与正文拉开层级 */
.fb-reply {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 0 var(--xt-radius-sm) var(--xt-radius-sm) 0;
  border-left: 2px solid var(--xt-primary);
  background: rgba(232, 163, 61, 0.08);
}

.reply-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--xt-primary);
}

.reply-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--xt-text-secondary);
  white-space: pre-wrap;
}
</style>

<style>
@media (max-width: 640px) {
  .feedback-dialog {
    width: 94vw !important;
  }
}
</style>
