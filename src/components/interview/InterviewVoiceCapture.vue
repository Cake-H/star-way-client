<template>
  <div class="voice-panel">
    <!-- 主操作区：大按钮优先 -->
    <div class="voice-hero" :class="{ recording: isRecording, summarizing }">
      <button
        type="button"
        class="voice-main-btn"
        :class="{ recording: isRecording }"
        :disabled="summarizing || preparing"
        :aria-label="isRecording ? '停止口述' : '开始口述'"
        @click="toggleRecording"
      >
        <span class="btn-ring" aria-hidden="true" />
        <el-icon class="btn-icon" :size="36"><Microphone /></el-icon>
        <span class="btn-label">{{ isRecording ? '停止口述' : '开始口述' }}</span>
      </button>

      <p class="hero-hint">
        {{ heroHint }}
      </p>
      <p v-if="durationSec > 0" class="hero-time">{{ formatDuration(durationSec) }}</p>

      <el-button
        class="summarize-btn"
        type="primary"
        size="large"
        :loading="summarizing || preparing"
        :disabled="!canSummarize && !isRecording"
        @click="onSummarizeClick"
      >
        <el-icon class="summarize-ico"><MagicStick /></el-icon>
        AI 智能总结
      </el-button>
    </div>

    <el-input
      v-model="transcript"
      type="textarea"
      :rows="4"
      placeholder="口述内容会实时转写在此；也可直接粘贴或修改，再点「AI 智能总结」"
      class="transcript"
    />

    <p v-if="!speechSupported && !mediaSupported" class="hint warn">
      当前环境无法使用麦克风或语音识别，请在下方输入文字后点击「AI 智能总结」。
    </p>
    <p v-else-if="!speechSupported" class="hint">
      浏览器不支持实时转写，录音仍会保存；总结时可上传音频或由后端识别。
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * 语音录入主组件：MediaRecorder 存音频 + Web Speech API 实时转写。
 *
 * 流程：开始口述 → 停止 → AI 智能总结 → emit('summarized')。
 * 总结前若 sessionId 为空，由父组件 through beforeSummarize 创建场次。
 * 本组件不负责入库，父页面核对后调 createInterviewQuestion。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { MagicStick, Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { InterviewVoiceSummarizeResultVO } from '@/api/interviewTypes'
import { summarizeInterviewVoice } from '@/services/interviewService'

const props = defineProps<{
  /** 可为空；总结前会通过 beforeSummarize 自动创建场次 */
  sessionId: number | null
  /** 总结前回调（如自动创建复盘场次），需返回 sessionId */
  beforeSummarize?: () => Promise<number>
}>()

const emit = defineEmits<{
  summarized: [result: InterviewVoiceSummarizeResultVO]
}>()

const transcript = ref('')
const isRecording = ref(false)
const summarizing = ref(false)
const preparing = ref(false)
const durationSec = ref(0)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioBlob: Blob | null = null
let durationTimer: ReturnType<typeof setInterval> | undefined
let recognition: SpeechRecognition | null = null

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
    : undefined

/** Chrome/Edge 支持；Safari/Firefox 可能仅能用 MediaRecorder + 手输文本 */
const speechSupported = !!SpeechRecognitionCtor
const mediaSupported =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const canSummarize = computed(
  () => transcript.value.trim().length > 0 || audioBlob != null || isRecording.value,
)

const heroHint = computed(() => {
  if (preparing.value) return '正在准备…'
  if (summarizing.value) return 'AI 正在整理你的口述内容…'
  if (isRecording.value) return '请口述：问了什么、你怎么答的、面试官还说了什么'
  if (audioBlob || transcript.value.trim()) return '口述完成，点击「AI 智能总结」生成结构化复盘'
  return '说一说就能完成记录，比手打快得多'
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

async function startRecording() {
  if (!transcript.value.trim()) {
    transcript.value = ''
  }
  if (!isRecording.value) {
    audioBlob = null
    audioChunks = []
    durationSec.value = 0
  }

  // 录音 blob 上传后端 STT；与下方 Web Speech 转写可并存
  if (mediaSupported) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data)
      }
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (audioChunks.length) {
          audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
        }
      }
      mediaRecorder.start()
    } catch {
      ElMessage.warning('无法访问麦克风，请检查浏览器权限')
    }
  }

  if (speechSupported && SpeechRecognitionCtor && !recognition) {
    recognition = new SpeechRecognitionCtor()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      transcript.value = text
    }
    recognition.onerror = () => {
      /* 用户仍可编辑文本 */
    }
    recognition.start()
  }

  isRecording.value = true
  clearDurationTimer()
  durationTimer = setInterval(() => {
    durationSec.value += 1
  }, 1000)
}

function stopRecording() {
  isRecording.value = false
  clearDurationTimer()
  if (recognition) {
    try {
      recognition.stop()
    } catch {
      /* ignore */
    }
    recognition = null
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  mediaRecorder = null
}

function toggleRecording() {
  if (isRecording.value) stopRecording()
  else startRecording()
}

async function resolveSessionId(): Promise<number> {
  if (props.sessionId != null) return props.sessionId
  if (props.beforeSummarize) return props.beforeSummarize()
  throw new Error('无法总结：缺少复盘场次')
}

async function onSummarizeClick() {
  if (isRecording.value) stopRecording()
  const text = transcript.value.trim()
  if (!text && !audioBlob) {
    ElMessage.warning('请先口述或输入内容')
    return
  }
  // 与后端 ida.speech-to-text.min-transcript-chars 对齐；过短且无音频时提示
  if (text.length > 0 && text.length < 10 && !audioBlob) {
    ElMessage.warning('口述文字较短（不足 10 字），建议继续说明或上传录音')
  }
  summarizing.value = true
  preparing.value = true
  try {
    const sid = await resolveSessionId()
    preparing.value = false
    const result = await summarizeInterviewVoice(sid, {
      rawTranscript: transcript.value.trim(),
      audioFile: audioBlob
        ? new File([audioBlob], 'interview-voice.webm', { type: audioBlob.type })
        : undefined,
    })
    emit('summarized', result)
    ElMessage.success('总结完成，请在下方核对后保存')
  } catch (e: unknown) {
    preparing.value = false
    if (e instanceof Error) ElMessage.error(e.message)
  } finally {
    summarizing.value = false
    preparing.value = false
  }
}

/** 保存本题后清空，便于连续口述下一题 */
function resetForNext() {
  transcript.value = ''
  audioBlob = null
  audioChunks = []
  durationSec.value = 0
  stopRecording()
}

defineExpose({ resetForNext })

onBeforeUnmount(() => {
  stopRecording()
})
</script>

<style scoped>
.voice-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.voice-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 20px 24px;
  border-radius: var(--xt-radius-lg);
  border: 1px solid var(--xt-border-strong);
  background: linear-gradient(165deg, var(--el-color-primary-light-9) 0%, #fff 55%);
  box-shadow: var(--xt-shadow-sm);
}

.voice-hero.recording {
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(165deg, #fef2f2 0%, #fff 55%);
}

.voice-main-btn {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  background: linear-gradient(145deg, var(--xt-primary-light) 0%, var(--xt-primary-dark) 100%);
  box-shadow: 0 12px 32px rgba(79, 70, 229, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.voice-main-btn:hover:not(:disabled) {
  transform: scale(1.03);
  box-shadow: 0 16px 40px rgba(79, 70, 229, 0.42);
}

.voice-main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voice-main-btn.recording {
  background: linear-gradient(145deg, #f87171 0%, #dc2626 100%);
  box-shadow: 0 12px 32px rgba(220, 38, 38, 0.35);
  animation: pulse-ring 1.6s ease-in-out infinite;
}

.btn-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.25);
  pointer-events: none;
}

.voice-main-btn.recording .btn-ring {
  border-color: rgba(239, 68, 68, 0.45);
  animation: ring-expand 1.6s ease-out infinite;
}

.btn-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.btn-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@keyframes pulse-ring {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes ring-expand {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .voice-main-btn.recording {
    animation: none;
  }
  .voice-main-btn.recording .btn-ring {
    animation: none;
  }
}

.hero-hint {
  margin: 18px 0 0;
  max-width: 360px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--xt-text-secondary);
}

.hero-time {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-danger);
  font-variant-numeric: tabular-nums;
}

.summarize-btn {
  margin-top: 20px;
  min-width: 200px;
  height: 44px;
  font-weight: 600;
  cursor: pointer;
}

.summarize-ico {
  margin-right: 6px;
}

.transcript :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--xt-text-muted);
  line-height: 1.5;
}

.hint.warn {
  color: var(--el-color-warning-dark-2);
}
</style>
