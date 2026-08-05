import type { Directive } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const observers = new WeakMap<HTMLElement, MutationObserver>()

/**
 * v-stagger：列表/卡片进入视口时 stagger 0.05s 淡入上移。
 * 复用首页 ScrollTrigger 模式；数据异步渲染时等子节点出现后播放一次；
 * prefers-reduced-motion 时直接直出，不播放。
 */
export const vStagger: Directive<HTMLElement> = {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let played = false
    const play = () => {
      if (played || !el.isConnected) return
      const targets = Array.from(el.children)
      if (!targets.length) return
      played = true
      observers.get(el)?.disconnect()
      observers.delete(el)
      gsap.from(targets, {
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        y: 12,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power3.out',
      })
    }

    // 列表数据多为异步填充：观察子节点出现后播放一次
    const observer = new MutationObserver(play)
    observer.observe(el, { childList: true })
    observers.set(el, observer)
    play()
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
    ScrollTrigger.getAll()
      .filter((t) => t.trigger === el)
      .forEach((t) => t.kill())
  },
}
