import { provide, inject, ref, type InjectionKey, type Ref } from 'vue'

export interface ResumeSectionMeta {
  key: string
  title: string
}

export const RESUME_SECTIONS: ResumeSectionMeta[] = [
  { key: 'basic', title: '基本信息' },
  { key: 'contact', title: '联系方式' },
  { key: 'addr', title: '籍贯与现居' },
  { key: 'job', title: '求职意向' },
  { key: 'edu', title: '教育经历' },
  { key: 'work', title: '工作经历' },
  { key: 'proj', title: '项目经历' },
  { key: 'campus', title: '校园经历' },
  { key: 'skill', title: '技能' },
  { key: 'lang', title: '语言能力' },
  { key: 'cert', title: '证书' },
  { key: 'award', title: '获奖情况' },
  { key: 'pub', title: '论文/专利/著作' },
]

export const PANEL_KEYS = RESUME_SECTIONS.map((s) => s.key)

export interface ResumeSectionNav {
  sections: readonly ResumeSectionMeta[]
  activeKey: Ref<string>
  activePanels: Ref<string[]>
  expandAll: () => void
  scrollToSection: (key: string) => void
  registerSectionEl: (key: string, el: HTMLElement | null) => void
  observe: () => void
  disconnect: () => void
}

export const ResumeNavKey: InjectionKey<ResumeSectionNav> = Symbol('resumeNav')

export function createResumeSectionNav(): ResumeSectionNav {
  const activeKey = ref<string>(RESUME_SECTIONS[0].key)
  const activePanels = ref<string[]>([...PANEL_KEYS])
  const sectionEls = ref<Record<string, HTMLElement>>({})
  let observer: IntersectionObserver | null = null
  let scrollTimer: ReturnType<typeof setTimeout> | null = null
  let isClickScrolling = false

  function registerSectionEl(key: string, el: HTMLElement | null) {
    if (el) sectionEls.value[key] = el
  }

  function expandAll() {
    activePanels.value = [...PANEL_KEYS]
  }

  function scrollToSection(key: string) {
    if (!PANEL_KEYS.includes(key)) return
    if (!activePanels.value.includes(key)) {
      activePanels.value = [...activePanels.value, key]
    }
    const el = sectionEls.value[key]
    if (!el) return

    isClickScrolling = true
    if (scrollTimer) clearTimeout(scrollTimer)

    el.scrollIntoView({ behavior: 'auto', block: 'start' })
    activeKey.value = key

    scrollTimer = setTimeout(() => {
      isClickScrolling = false
    }, 900)
  }

  function observe() {
    if (!('IntersectionObserver' in window)) return
    disconnect()

    observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling) return
        const intersecting = entries.filter((entry) => entry.isIntersecting)
        if (!intersecting.length) return
        const topmost = intersecting.reduce((min, entry) =>
          entry.boundingClientRect.top < min.boundingClientRect.top ? entry : min,
        )
        const key = topmost.target.getAttribute('data-section')
        if (key) activeKey.value = key
      },
      {
        rootMargin: '-8% 0px -75% 0px',
        threshold: 0,
      },
    )

    Object.values(sectionEls.value).forEach((el) => observer?.observe(el))
  }

  function disconnect() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  return {
    sections: RESUME_SECTIONS,
    activeKey,
    activePanels,
    expandAll,
    scrollToSection,
    registerSectionEl,
    observe,
    disconnect,
  }
}

/** 在父级（页面）创建并下发导航状态 */
export function provideResumeSectionNav(): ResumeSectionNav {
  const nav = createResumeSectionNav()
  provide(ResumeNavKey, nav)
  return nav
}

/** 子组件获取共享导航状态；无提供者时自动创建本地状态 */
export function useResumeSectionNav(): ResumeSectionNav {
  return inject(ResumeNavKey, createResumeSectionNav())
}
