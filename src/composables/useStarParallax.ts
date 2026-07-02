/**
 * 星空视差
 *
 * 基于鼠标位置计算视差偏移，用于 Hero 视觉层与粒子背景。
 * 已尊重 prefers-reduced-motion。
 */
import { useMouse, usePreferredReducedMotion, useWindowSize } from '@vueuse/core'
import { computed } from 'vue'

export function useStarParallax(intensity = 10) {
  const { x, y } = useMouse()
  const { width, height } = useWindowSize()
  const prefersReducedMotion = usePreferredReducedMotion()

  const px = computed(() => {
    if (prefersReducedMotion.value) return 0
    if (!width.value || !height.value) return 0
    return (x.value / width.value - 0.5) * intensity
  })

  const py = computed(() => {
    if (prefersReducedMotion.value) return 0
    if (!width.value || !height.value) return 0
    return (y.value / height.value - 0.5) * intensity
  })

  return { px, py }
}
