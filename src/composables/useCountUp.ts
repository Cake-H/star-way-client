/**
 * 数字滚动（count-up）动画
 * 进入视口后从 0 滚动到目标值，时长 ≤500ms，遵循 prefers-reduced-motion。
 */
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export function useCountUp(target: Ref<number>, duration = 1200) {
  const display = ref(0)
  const elRef = ref<HTMLElement>()
  let rafId: number | null = null
  let observer: IntersectionObserver | null = null
  let started = false

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function animate() {
    if (reduced) {
      display.value = target.value
      return
    }
    if (rafId) cancelAnimationFrame(rafId)
    const from = 0
    const to = target.value
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      // cubic-bezier(0.16, 1, 0.3, 1) 的近似：easeOutExpo 曲线
      const eased = 1 - Math.pow(1 - p, 3)
      display.value = Math.round(from + (to - from) * eased)
      if (p < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    if (!elRef.value || typeof IntersectionObserver === 'undefined') {
      started = true
      animate()
      return
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (started) return
        if (entries.some((e) => e.isIntersecting)) {
          started = true
          animate()
          observer?.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(elRef.value)
  })

  watch(target, () => {
    if (started) animate()
  })

  onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId)
    observer?.disconnect()
  })

  return { display, elRef }
}
