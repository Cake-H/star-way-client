<template>
  <div class="voice-panel">
    <div class="voice-hero" :class="{ recording: isRecording, summarizing }">
      <div
        class="mic-orb"
        :class="{ recording: isRecording }"
        role="meter"
        :aria-valuenow="Math.round(level * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="isRecording ? '当前录入音量' : '点击开始口述'"
      >
        <span
          v-for="i in 3"
          :key="`ring-${i}`"
          class="sonic-ring"
          aria-hidden="true"
          :style="sonicRingStyle(i - 1)"
        />
        <div v-show="isRecording" class="sonic-spokes" aria-hidden="true">
          <span
            v-for="(h, idx) in levelBars"
            :key="idx"
            class="sonic-spoke"
            :style="sonicSpokeStyle(idx, h)"
          />
        </div>
        <button
          type="button"
          class="voice-main-btn"
          :class="{ recording: isRecording }"
          :disabled="summarizing || preparing || sessionPending"
          :style="micBtnStyle"
          :aria-label="isRecording ? '停止口述并分析' : '开始口述'"
          @click="toggleRecording"
        >
          <span class="btn-ring" aria-hidden="true" />
          <span
            v-if="isRecording"
            class="btn-level-glow"
            aria-hidden="true"
            :style="{ opacity: 0.3 + level * 0.5, transform: `scale(${1 + level * 0.15})` }"
          />
          <el-icon class="btn-icon" :size="40"><Microphone /></el-icon>
          <span class="btn-label">{{ isRecording ? '停止并分析' : '开始口述' }}</span>
        </button>
      </div>

      <p class="hero-hint">{{ heroHint }}</p>
      <p v-if="isRecording" class="hero-live">
        正在录音…
        <span v-if="isSilent" class="silent-tip">未检测到声音，请靠近麦克风</span>
        <span v-else-if="level > 0.12" class="heard-tip">已检测到声音</span>
      </p>
      <p v-if="summarizing" class="hero-live summarizing">听写与 AI 整理中，约需数十秒，请勿重复提交…</p>
      <p v-if="durationSec > 0 && !summarizing" class="hero-time">{{ formatDuration(durationSec) }}</p>

      <el-button
        v-if="canRetrySummarize && !isRecording"
        class="retry-btn"
        type="primary"
        link
        :disabled="summarizing"
        @click="runVoiceSummarize"
      >
        重新分析
      </el-button>
    </div>

    <el-collapse v-model="textPanelOpen" class="text-supplement">
      <el-collapse-item name="text">
        <template #title>
          <span class="text-supplement-title">文字补充（可选）</span>
        </template>
        <p class="text-supplement-tip">
          满 {{ VOICE_MIN_TRANSCRIPT_CHARS }} 字将优先用文稿、可不上传录音听写；也可纯文字复盘
        </p>
        <el-input
          v-model="transcript"
          type="textarea"
          :rows="4"
          placeholder="粘贴或输入口述全文；停止录音后会自动调用 AI 总结（尚未保存）"
          class="transcript"
          :disabled="summarizing"
        />
        <el-button
          class="text-summarize-btn"
          type="primary"
          plain
          :loading="summarizing"
          :disabled="!canManualSummarize || isRecording"
          @click="runVoiceSummarize"
        >
          仅用文字分析
        </el-button>
      </el-collapse-item>
    </el-collapse>

    <el-alert
      v-if="statusMessage"
      :type="statusType"
      show-icon
      :closable="false"
      class="status-alert"
      :title="statusMessage"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 语音复盘：POST voice-summarize（阿里云听写 + DeepSeek 结构化，一次完成，无独立转写接口）。
 * 停止录音后自动总结；可选文字 ≥10 字跳过服务端听写。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { InterviewVoiceSummarizeResultVO } from '@/api/interviewTypes'
import { useMicLevel } from '@/composables/useMicLevel'
import { summarizeInterviewVoice } from '@/services/interviewService'
import {
  blobToWav16kMono,
  pickMediaRecorderMimeType,
  prepareInterviewAudioFile,
} from '@/utils/interviewAudioUpload'
import {
  plainTranscriptFromSummarize,
  shouldAttachRawTranscript,
  VOICE_MIN_TRANSCRIPT_CHARS,
} from '@/utils/interviewVoiceResult'

const props = defineProps<{
  sessionId: string | null
  /** 无 sessionId 时创建场次（需先 POST /sessions） */
  beforeSummarize?: () => Promise<string>
}>()

const emit = defineEmits<{
  summarized: [result: InterviewVoiceSummarizeResultVO]
}>()

const { level, bars: levelBars, isSilent, start: startMicLevel, stop: stopMicLevel } = useMicLevel()

const transcript = ref('')
const textPanelOpen = ref<string[]>([])
const isRecording = ref(false)
const summarizing = ref(false)
const preparing = ref(false)
const durationSec = ref(0)
const statusMessage = ref('')
const statusType = ref<'info' | 'warning' | 'error'>('info')

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioBlobWav: Blob | null = null
let durationTimer: ReturnType<typeof setInterval> | undefined

const mediaSupported =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
const secureContext =
  typeof window !== 'undefined' ? window.isSecureContext : true

const sessionPending = computed(() => props.sessionId == null && !props.beforeSummarize)

const canManualSummarize = computed(() => {
  const t = transcript.value.trim()
  return shouldAttachRawTranscript(t) || audioBlobWav != null
})

const canRetrySummarize = computed(
  () => canManualSummarize.value && !summarizing.value && !isRecording.value,
)

const heroHint = computed(() => {
  if (sessionPending.value) return '正在准备复盘场次…'
  if (preparing.value) return '正在准备…'
  if (summarizing.value) return '正在听写并生成结构化草稿…'
  if (isRecording.value) return '说完后点「停止并分析」，将自动听写并整理（确认后才保存）'
  return '以语音为主：口述结束即分析；也可展开下方输入文字'
})

const micBtnStyle = computed(() => {
  if (!isRecording.value) return undefined
  const glow = 12 + level.value * 28
  return {
    boxShadow: `0 12px 32px rgba(232, 163, 61, ${0.3 + level.value * 0.25}), 0 0 ${glow}px rgba(240, 188, 102, ${0.3 + level.value * 0.4})`,
  }
})

function sonicRingStyle(index: number) {
  const base = 1 + index * 0.12
  const scale = base + level.value * (0.1 + index * 0.05)
  const opacity = isRecording.value
    ? Math.min(0.7, 0.28 + level.value * 0.4 - index * 0.07)
    : 0.16
  return { transform: `scale(${scale})`, opacity, animationDelay: `${index * 0.35}s` }
}

function sonicSpokeStyle(index: number, height: number) {
  const count = levelBars.value.length || 36
  return { transform: `rotate(${(360 / count) * index}deg) scaleY(${height})` }
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `已口述 ${m}:${String(s).padStart(2, '0')}`
}

function clearDurationTimer() {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = undefined
  }
}

function releaseCaptureStream() {
  stopMicLevel()
}

function startMediaRecorder(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mediaSupported) {
      reject(new Error('当前环境不支持录音'))
      return
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        startMicLevel(stream)
        audioChunks = []
        const mimeType = pickMediaRecorderMimeType()
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data)
        }
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          releaseCaptureStream()
        }
        mediaRecorder.start(250)
        resolve()
      })
      .catch(() => {
        ElMessage.warning('无法访问麦克风，请检查权限')
        statusMessage.value = '无法访问麦克风，请检查浏览器权限'
        statusType.value = 'error'
        reject(new Error('麦克风不可用'))
      })
  })
}

function waitForRecorderStop(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const rec = mediaRecorder
    if (!rec || rec.state === 'inactive') {
      resolve(buildRawRecordBlob())
      return
    }
    rec.onstop = () => resolve(buildRawRecordBlob())
    try {
      rec.stop()
    } catch {
      resolve(buildRawRecordBlob())
    }
  })
}

function buildRawRecordBlob(): Blob | null {
  if (!audioChunks.length) return null
  const type = mediaRecorder?.mimeType || audioChunks[0]?.type || 'audio/webm'
  return new Blob(audioChunks, { type })
}

async function resolveSessionId(): Promise<string> {
  if (props.sessionId != null) return props.sessionId
  if (props.beforeSummarize) return props.beforeSummarize()
  throw new Error('复盘场次未就绪，请稍后重试')
}

async function runVoiceSummarize() {
  if (isRecording.value) await stopRecording(false)
  const text = transcript.value.trim()
  const attachText = shouldAttachRawTranscript(text)
  if (!attachText && !audioBlobWav) {
    ElMessage.warning('请先口述录音，或输入至少 10 字文字')
    return
  }
  if (text.length > 0 && !attachText && !audioBlobWav) {
    ElMessage.warning(`文字不足 ${VOICE_MIN_TRANSCRIPT_CHARS} 字，请继续说明或重新录音`)
    return
  }

  summarizing.value = true
  preparing.value = true
  statusMessage.value = ''
  try {
    const sid = await resolveSessionId()
    preparing.value = false
    const uploadFile = audioBlobWav ? await prepareInterviewAudioFile(audioBlobWav) : undefined
    const result = await summarizeInterviewVoice(sid, {
      rawTranscript: attachText ? text : undefined,
      audioFile: uploadFile,
    })
    const plain = plainTranscriptFromSummarize(result)
    if (plain && !transcript.value.trim()) transcript.value = plain
    emit('summarized', result)
    const drafts = result.questions?.length ?? (result.question ? 1 : 0)
    if (drafts > 0) {
      ElMessage.success('分析完成，请在下方核对后保存')
    } else {
      ElMessage.warning(result.hint?.trim() || '未能拆出题干，请补充口述或手动填写')
    }
  } catch (e: unknown) {
    preparing.value = false
    if (e instanceof Error) {
      statusMessage.value = e.message
      statusType.value = 'error'
      ElMessage.error(e.message)
    }
  } finally {
    summarizing.value = false
    preparing.value = false
  }
}

async function startRecording() {
  if (!mediaSupported) {
    ElMessage.warning('当前浏览器不支持录音，请使用文字补充')
    textPanelOpen.value = ['text']
    return
  }
  if (!secureContext) {
    statusMessage.value = '录音需在 HTTPS 或 localhost 下使用'
    statusType.value = 'warning'
  }
  statusMessage.value = ''
  audioBlobWav = null
  audioChunks = []
  durationSec.value = 0
  isRecording.value = true
  clearDurationTimer()
  durationTimer = setInterval(() => {
    durationSec.value += 1
  }, 1000)
  try {
    await startMediaRecorder()
  } catch {
    isRecording.value = false
    clearDurationTimer()
  }
}

async function stopRecording(autoSummarize = true) {
  isRecording.value = false
  clearDurationTimer()
  const raw = await waitForRecorderStop()
  mediaRecorder = null

  audioBlobWav = null
  if (raw && raw.size > 0) {
    try {
      audioBlobWav = await blobToWav16kMono(raw)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '录音转码失败'
      statusMessage.value = msg
      statusType.value = 'error'
      ElMessage.warning(msg)
      return
    }
  }

  if (autoSummarize && audioBlobWav) {
    await runVoiceSummarize()
  } else if (audioBlobWav) {
    statusMessage.value = '录音已就绪，可点「重新分析」或展开文字补充'
    statusType.value = 'info'
  }
}

async function toggleRecording() {
  if (sessionPending.value) {
    ElMessage.info('场次创建中，请稍候')
    return
  }
  if (isRecording.value) await stopRecording(true)
  else await startRecording()
}

function resetForNext() {
  transcript.value = ''
  audioBlobWav = null
  audioChunks = []
  durationSec.value = 0
  statusMessage.value = ''
  isRecording.value = false
  summarizing.value = false
  clearDurationTimer()
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop()
    } catch {
      /* ignore */
    }
  } else {
    releaseCaptureStream()
  }
  mediaRecorder = null
}

defineExpose({ resetForNext, runVoiceSummarize })

onBeforeUnmount(() => {
  clearDurationTimer()
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop()
    } catch {
      /* ignore */
    }
  } else {
    releaseCaptureStream()
  }
})
</script>

<style scoped>
.voice-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px 20px;
  border-radius: var(--xt-radius-lg);
  border: 1px solid var(--xt-border-strong);
  background: #101014;
  box-shadow: inset 0 1px 0 var(--xt-card-highlight), var(--xt-shadow-sm);
}

.voice-hero.recording {
  border-color: rgba(232, 163, 61, 0.4);
  background: #101014;
}

.voice-hero.summarizing {
  border-color: rgba(232, 163, 61, 0.35);
}

.mic-orb {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* 外圈脉冲环：琥珀 2s 呼吸（录音中加速为 1s，颜色不变） */
.sonic-ring {
  position: absolute;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 2px solid rgba(232, 163, 61, 0.2);
  pointer-events: none;
  animation: sonic-breathe 2s ease-in-out infinite;
  transition: transform 0.09s ease-out, opacity 0.1s ease;
}

.mic-orb.recording .sonic-ring {
  border-color: rgba(232, 163, 61, 0.45);
  animation: sonic-breathe 1s ease-in-out infinite;
}

.sonic-spokes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sonic-spoke {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 20px;
  margin-left: -1.5px;
  margin-top: -78px;
  transform-origin: 50% 100%;
  border-radius: 3px;
  background: linear-gradient(to top, rgba(232, 163, 61, 0.95), rgba(240, 188, 102, 0.7));
  box-shadow: 0 0 8px rgba(232, 163, 61, 0.4);
  transition: transform 0.06s ease-out;
}

@keyframes sonic-breathe {
  0%,
  100% {
    opacity: 0.6;
    filter: blur(0);
  }
  50% {
    opacity: 1;
    filter: blur(0.5px);
  }
}

.voice-main-btn {
  position: relative;
  z-index: 2;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #1c1206;
  background: linear-gradient(145deg, var(--xt-primary-light) 0%, var(--xt-primary-dark) 100%);
  box-shadow: 0 12px 32px rgba(232, 163, 61, 0.28);
  transition: transform 0.15s ease, box-shadow 0.1s ease;
}

.voice-main-btn:hover:not(:disabled) {
  transform: scale(1.03);
}

.voice-main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 录音中：颜色不变，仅脉冲加速（见 .sonic-ring） */
.voice-main-btn.recording {
  background: linear-gradient(145deg, var(--xt-primary-light) 0%, var(--xt-primary-dark) 100%);
}

.btn-level-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240, 188, 102, 0.85) 0%, transparent 70%);
  pointer-events: none;
  transition: opacity 0.08s ease, transform 0.08s ease;
}

.btn-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid rgba(232, 163, 61, 0.22);
  pointer-events: none;
}

.voice-main-btn.recording .btn-ring {
  border-color: rgba(232, 163, 61, 0.45);
}

.btn-icon {
  position: relative;
  z-index: 1;
}

.btn-label {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 700;
}

.hero-hint {
  margin: 16px 0 0;
  max-width: 340px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--xt-text-secondary);
}

.hero-live {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--xt-primary);
}

.hero-live.summarizing {
  color: var(--xt-primary);
}

.hero-time {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--xt-primary);
  font-variant-numeric: tabular-nums;
}

.retry-btn {
  margin-top: 8px;
}

.silent-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-warning);
}

.heard-tip {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-color-success);
}

.text-supplement {
  border-radius: var(--xt-radius-md);
  border: 1px solid var(--xt-border);
  overflow: hidden;
  background: #101014;
}

.text-supplement-title {
  font-weight: 600;
  font-size: 14px;
}

.text-supplement-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--xt-text-muted);
  line-height: 1.5;
}

.text-summarize-btn {
  margin-top: 10px;
}

.transcript :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
}

.status-alert {
  border-radius: var(--xt-radius-md);
}

@media (prefers-reduced-motion: reduce) {
  .sonic-spoke,
  .sonic-ring,
  .btn-level-glow,
  .voice-main-btn {
    transition: none;
    animation: none;
  }
}
</style>
