import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

export function usePWA() {
  const offlineReady = ref(false)
  const needRefresh = ref(false)

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegistered(r) {
      if (r) {
        // 每小时检查一次新版本
        setInterval(() => {
          r.update().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },
    onOfflineReady() {
      offlineReady.value = true
    },
    onNeedRefresh() {
      needRefresh.value = true
    },
  })

  async function acceptUpdate() {
    await updateServiceWorker(true)
  }

  function dismissUpdate() {
    needRefresh.value = false
  }

  return {
    offlineReady,
    needRefresh,
    acceptUpdate,
    dismissUpdate,
  }
}
