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
        <svg
          class="sonic-wave"
          viewBox="0 0 200 200"
          aria-hidden="true"
          :style="sonicWaveStyle"
        >
          <defs>
            <linearGradient :id="waveGradId" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f0bc66" />
              <stop offset="100%" stop-color="#e8a33d" />
            </linearGradient>
          </defs>
          <path class="sonic-wave-outer" :d="wavePathOuter" fill="none" />
          <path
            class="sonic-wave-main"
            :d="wavePathMain"
            fill="none"
            :stroke="`url(#${waveGradId})`"
          />
        </svg>
        <button
          type="button"
          class="voice-main-btn"
          :class="{ recording: isRecording }"
          :disabled="summarizing || preparing || sessionPending"
          :style="micBtnStyle"
          :aria-label="isRecording ? '停止口述并分析' : '开始口述'"
          @click="toggleRecording"
        >
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

/**
 * 环形声波：频谱镜像映射到圆周（左右对称，避免人声低频集中导致的歪扭），
 * 余弦插值平滑成闭合波浪线；整体半径随音量微微胀缩，模拟声波向外扩散。
 */
const waveGradId = `sonic-wave-grad-${Math.random().toString(36).slice(2, 8)}`
const WAVE_SAMPLES = 96

function buildWavePath(baseRadius: number, amplitude: number, phase: number): string {
  const bands = levelBars.value
  const n = bands.length || 1
  const pulse = level.value * (amplitude * 0.28)
  const parts: string[] = []
  for (let i = 0; i <= WAVE_SAMPLES; i++) {
    const t = i / WAVE_SAMPLES
    const angle = t * Math.PI * 2 - Math.PI / 2
    // 镜像：半圆铺一遍频谱，另外半圆折返，画面永远左右对称
    const mirrorT = t <= 0.5 ? t * 2 : (1 - t) * 2
    const pos = mirrorT * (n - 1)
    const i0 = Math.floor(pos)
    const i1 = Math.min(n - 1, i0 + 1)
    const frac = pos - i0
    const smooth = (1 - Math.cos(frac * Math.PI)) / 2
    const band = bands[i0] * (1 - smooth) + bands[i1] * smooth
    const idleWobble = Math.sin(angle * 3 + phase) * 0.7
    const r = baseRadius + pulse + band * amplitude + idleWobble
    const x = 100 + r * Math.cos(angle)
    const y = 100 + r * Math.sin(angle)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `${parts.join(' ')} Z`
}

const wavePathMain = computed(() => buildWavePath(80, 8, 0))
const wavePathOuter = computed(() => buildWavePath(91, 4.5, Math.PI / 3))

const sonicWaveStyle = computed(() => {
  const glow = 3 + level.value * 9
  return {
    filter: `drop-shadow(0 0 ${glow.toFixed(1)}px rgba(232, 163, 61, ${(0.22 + level.value * 0.4).toFixed(2)}))`,
  }
})

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
  background: var(--xt-card-bg);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight), var(--xt-shadow-sm);
}

.voice-hero.recording {
  border-color: rgba(232, 163, 61, 0.4);
  background: var(--xt-card-bg);
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

/* 环形声波：两条闭合波浪线环绕按钮，随音量向四周起伏 */
.sonic-wave {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  opacity: 0.75;
  transform-origin: 50% 50%;
  animation: sonic-wave-breathe 3.4s ease-in-out infinite;
}

.mic-orb.recording .sonic-wave {
  opacity: 1;
  animation-duration: 1.8s;
}

.sonic-wave-main {
  stroke-width: 2.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.sonic-wave-outer {
  stroke: rgba(232, 163, 61, 0.32);
  stroke-width: 1.3;
  stroke-linejoin: round;
}

@keyframes sonic-wave-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
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

/* 录音中：按钮配色不变，声波起伏与呼吸节奏加速（见 .sonic-wave） */
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
  padding: 0 10px;
  box-sizing: border-box;
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
  background: var(--xt-card-bg);
}

/* 折叠面板自带 0 内边距，补齐左右留白避免文字贴边 */
.text-supplement :deep(.el-collapse-item__header) {
  padding: 0 16px;
}

.text-supplement :deep(.el-collapse-item__content) {
  padding: 0 16px 14px;
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

@media (max-width: 640px) {
  .voice-hero {
    padding: 20px 14px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sonic-wave,
  .btn-level-glow,
  .voice-main-btn {
    transition: none;
    animation: none;
  }
}
</style>
