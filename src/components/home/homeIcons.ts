import { defineComponent, h } from 'vue'

// 首页同一功能共用同一个图标，避免能力卡、航程和最近记录各自维护。
function homeIcon(name: string, paths: string[]) {
  return defineComponent({
    name,
    setup: () => () => h('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    }, paths.map(d => h('path', { d }))),
  })
}

export const HomeArchiveIcon = homeIcon('HomeArchiveIcon', [
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z',
  'M14 2v6h6M8 13h8M8 17h5',
])
export const HomeEnergyIcon = homeIcon('HomeEnergyIcon', ['m13 2-9 12h7l-1 8 10-12h-7l1-8Z'])
export const HomeApplyIcon = homeIcon('HomeApplyIcon', ['m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13'])
export const HomeMockIcon = homeIcon('HomeMockIcon', [
  'm12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z',
  'M20 2v4m-2-2h4M4 18v4m-2-2h4',
])
export const HomeReviewIcon = homeIcon('HomeReviewIcon', [
  'M14 5H4a2 2 0 0 0-2 2v10l4-4h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z',
  'M8 17h10l4 4V11a2 2 0 0 0-2-2',
])
