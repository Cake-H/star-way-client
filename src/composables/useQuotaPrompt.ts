/**
 * 额度不足弹窗 · 共享状态
 *
 * 响应拦截器统一触发，各页面无需自行处理 30200。
 */
import { ref } from 'vue'

const visible = ref(false)

export function useQuotaPrompt() {
  function promptQuota() {
    visible.value = true
  }

  function closeQuotaPrompt() {
    visible.value = false
  }

  return {
    quotaPromptVisible: visible,
    promptQuota,
    closeQuotaPrompt,
  }
}
