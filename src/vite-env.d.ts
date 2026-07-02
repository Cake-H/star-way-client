/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '@tsparticles/vue3' {
  import type { Plugin } from 'vue'
  const plugin: Plugin
  export default plugin
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** 设为 false 时面试复盘走 localStorage mock；默认 true 对接 ida-app-server */
  readonly VITE_INTERVIEW_USE_API?: string
  /** 设为 false 时模拟面试走 localStorage mock；默认 true 对接 ida-app-server */
  readonly VITE_MOCK_INTERVIEW_USE_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
