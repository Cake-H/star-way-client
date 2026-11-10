/**
 * 意见反馈弹窗 · 共享状态
 *
 * 导航球面板、设置菜单等入口通过 openFeedback() 打开同一个全局弹窗；
 * 反馈需登录，未登录时走全局登录引导。
 */
import { ref } from 'vue'
import { authToken } from '@/auth/session'
import { useLoginPrompt } from './useLoginPrompt'

const visible = ref(false)
/** 打开时定位到哪个页签：写反馈 / 我的反馈 */
const initialTab = ref<'compose' | 'list'>('compose')

export function useFeedbackDialog() {
  function openFeedback(tab: 'compose' | 'list' = 'compose') {
    if (!authToken.value) {
      useLoginPrompt().promptLogin()
      return
    }
    initialTab.value = tab
    visible.value = true
  }

  function closeFeedback() {
    visible.value = false
  }

  return {
    feedbackVisible: visible,
    feedbackInitialTab: initialTab,
    openFeedback,
    closeFeedback,
  }
}
