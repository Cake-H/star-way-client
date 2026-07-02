import { onBeforeMount, onUnmounted, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstallable = ref(false)
const isIOS = ref(false)

export function usePWAInstall() {
  function beforeInstallHandler(e: Event) {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    isInstallable.value = true
  }

  onBeforeMount(() => {
    isIOS.value =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as { MSStream?: unknown }).MSStream

    window.addEventListener('beforeinstallprompt', beforeInstallHandler)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
  })

  async function install() {
    const prompt = deferredPrompt.value
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    deferredPrompt.value = null
    isInstallable.value = false
    return outcome
  }

  function dismiss() {
    isInstallable.value = false
  }

  return {
    isInstallable,
    isIOS,
    install,
    dismiss,
  }
}
