/**
 * 等待模块 · 冷知识轮播
 *
 * 用于 StarWaitingModule 等长等待场景，5 秒切换一条提示。
 */
import { computed, onUnmounted, ref, unref, type MaybeRef } from 'vue'

/** 默认面试冷知识 */
export const DEFAULT_WAITING_TIPS = [
  'STAR 法则：Situation → Task → Action → Result，讲故事的黄金结构。',
  '面试时保持语速适中，适当的停顿比「嗯」「啊」更有力量。',
  '自我介绍推荐三段式：我是谁 → 我做过什么 → 我为什么适合这个岗位。',
  '遇到不会的问题，诚实承认并展示思考路径，比硬编更加分。',
  '回答项目经历时，多说你做了什么，而不是你们团队做了什么。',
  '提前准备 3 个想问面试官的问题，体现你对岗位的兴趣。',
  '谈薪前先了解市场行情，给出一个合理的区间而不是具体数字。',
  '着装不一定要正装，但干净、得体、符合行业调性很重要。',
  '面试官问「你的缺点是什么」，避免说「我太追求完美」这种套话。',
  '群面中不一定要做 leader，找准自己的角色并贡献价值即可。',
]

export function useWaitingTips(tips: MaybeRef<string[]> = DEFAULT_WAITING_TIPS, intervalMs = 5000) {
  const index = ref(0)
  const isChanging = ref(false)
  const current = computed(() => unref(tips)[index.value] ?? '')

  let timer: number | null = null
  let changeTimer: number | null = null

  function start() {
    stop()
    timer = window.setInterval(() => {
      isChanging.value = true
      changeTimer = window.setTimeout(() => {
        const list = unref(tips)
        index.value = list.length ? (index.value + 1) % list.length : 0
        isChanging.value = false
      }, 320)
    }, intervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (changeTimer) {
      clearTimeout(changeTimer)
      changeTimer = null
    }
  }

  start()

  onUnmounted(stop)

  return { current, index, isChanging }
}
