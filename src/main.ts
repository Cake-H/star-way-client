import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// 全站「日冕暖金」深空主题：启用 Element Plus 深色变量（暖金细节由 xingtu-theme.css 覆盖）
document.documentElement.classList.add('dark')
import Particles from '@tsparticles/vue3'
import type { Engine } from '@tsparticles/engine'
import App from './App.vue'
import { router } from './router'
import { vStagger } from './directives/staggerReveal'
import './style.css'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.directive('stagger', vStagger)
app.use(Particles, {
  init: async (engine: Engine) => {
    const { loadStarsPreset } = await import('@tsparticles/preset-stars')
    await loadStarsPreset(engine)
  },
})
app.mount('#app')
