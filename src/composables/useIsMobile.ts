/** 视口是否为移动端（< 768px），响应式 ref，组件卸载自动清理 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useIsMobile(breakpoint = 768) {
  const isMobile = ref(false)
  let mql: MediaQueryList | null = null

  const update = () => {
    isMobile.value = !!mql?.matches
  }

  onMounted(() => {
    mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    update()
    mql.addEventListener('change', update)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', update)
    mql = null
  })

  return isMobile
}
