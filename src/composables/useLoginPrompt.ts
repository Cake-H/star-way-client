/**
 * 登录提示弹窗 · 共享状态
 *
 * 路由守卫和页面组件通过 promptLogin() 打开同一个全局弹窗。
 */
import { ref } from 'vue'

const visible = ref(false)
const redirectPath = ref('/')

export function useLoginPrompt() {
  function promptLogin(path?: string) {
    redirectPath.value = path || '/'
    visible.value = true
  }

  return {
    loginPromptVisible: visible,
    loginPromptRedirect: redirectPath,
    promptLogin,
  }
}
