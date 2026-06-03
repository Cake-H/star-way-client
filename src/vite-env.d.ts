/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** 设为 false 时面试复盘走 localStorage mock；默认 true 对接 ida-app-server */
  readonly VITE_INTERVIEW_USE_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Web Speech API（Chrome） */
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  [index: number]: { transcript: string }
  isFinal: boolean
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
}
