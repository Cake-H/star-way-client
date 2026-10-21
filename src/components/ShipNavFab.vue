<template>
  <div class="ship-nav">
    <!-- 呼吸浮球 -->
    <button
      type="button"
      class="nav-orb"
      :class="{ open: visible }"
      aria-label="舰载导航：快捷面板"
      :aria-expanded="visible"
      @click="toggle"
    >
      <el-icon :size="22"><component :is="visible ? Close : Compass" /></el-icon>
    </button>

    <!-- 遮罩（移动端） -->
    <transition name="fade">
      <div v-if="visible" class="nav-mask" @click="close" />
    </transition>

    <!-- 快捷面板：PC 侧边卡片 / 移动端底部抽屉 -->
    <transition :name="isMobile ? 'sheet' : 'pop'">
      <div
        v-if="visible"
        class="nav-panel"
        role="dialog"
        aria-label="舰载导航快捷面板"
        @keydown.esc="close"
      >
        <div class="panel-head">
          <span class="panel-title">舰载导航</span>
          <span v-if="!isMobile" class="panel-kbd">⌘/Ctrl + K</span>
        </div>

        <div class="panel-group">
          <p class="group-title">快捷跳转</p>
          <div class="quick-grid">
            <button
              v-for="q in quickLinks"
              :key="q.routeName"
              type="button"
              class="quick-item"
              @click="go(q.routeName)"
            >
              <el-icon :size="16"><component :is="q.icon" /></el-icon>
              <span>{{ q.label }}</span>
            </button>
          </div>
        </div>

        <div class="panel-group">
          <p class="group-title">新手引导 · 三步启航</p>
          <ol class="guide-list">
            <li v-for="(g, i) in guideSteps" :key="g.routeName">
              <button type="button" class="guide-item" @click="go(g.routeName)">
                <span class="guide-no">{{ i + 1 }}</span>
                <span class="guide-text">{{ g.label }}</span>
                <el-icon :size="13" class="guide-arrow"><ArrowRight /></el-icon>
              </button>
            </li>
          </ol>
        </div>

        <div class="panel-group">
          <p class="group-title">常见问题</p>
          <div v-for="f in faqs" :key="f.q" class="faq-item">
            <button type="button" class="faq-q" @click="f.open = !f.open">
              <span>{{ f.q }}</span>
              <el-icon :size="12" class="faq-caret" :class="{ open: f.open }"><ArrowDown /></el-icon>
            </button>
            <p v-if="f.open" class="faq-a">{{ f.a }}</p>
          </div>
        </div>

        <p class="panel-foot">AI 对话能力即将上线，敬请期待</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDown,
  ArrowRight,
  ChatLineSquare,
  ChromeFilled,
  Close,
  Coin,
  Compass,
  FolderOpened,
  MagicStick,
} from '@element-plus/icons-vue'

/**
 * 舰载导航：导航与帮助中枢（非 AI 对话）。
 * PC 右下角浮球 + 侧边快捷面板，支持 ⌘/Ctrl+K 唤起；
 * 移动端展开为底部抽屉。
 */
const router = useRouter()
const visible = ref(false)
const isMobile = ref(false)

const quickLinks = [
  { label: '星舰档案', routeName: 'resume-list', icon: FolderOpened },
  { label: '星港导航', routeName: 'apply-site-list', icon: ChromeFilled },
  { label: '跃迁试炼', routeName: 'mock-interview-list', icon: MagicStick },
  { label: '航行日志', routeName: 'interview-list', icon: ChatLineSquare },
  { label: '星能补给站', routeName: 'quota-center', icon: Coin },
]

const guideSteps = [
  { label: '上传星舰档案（简历自动解析）', routeName: 'resume-upload' },
  { label: '领取每日星能补给', routeName: 'quota-center' },
  { label: '选择目的地星港投递', routeName: 'apply-site-list' },
]

const faqs = reactive([
  {
    q: '星能是什么，怎么获得？',
    a: '星能是解析、出题、复盘等智能功能的消耗额度。每日首次使用自动发放 10 点，也可在星能补给站输入补给密令（兑换码）充值。',
    open: false,
  },
  {
    q: '简历解析后会直接保存吗？',
    a: '不会。解析生成的是草稿，需你在确认页核对编辑后点击「确认入库」才会保存。',
    open: false,
  },
  {
    q: '光速填表在哪里使用？',
    a: '在带「光速填表」徽章的星港站点安装浏览器插件，即可在网申页自动填入你的星舰档案。',
    open: false,
  },
])

function toggle() {
  visible.value = !visible.value
}

function close() {
  visible.value = false
}

function go(routeName: string) {
  close()
  router.push({ name: routeName })
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    toggle()
  } else if (e.key === 'Escape' && visible.value) {
    close()
  }
}

function onResize() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  onResize()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.ship-nav {
  position: relative;
  z-index: 900;
}

/* —— 呼吸浮球 —— */
.nav-orb {
  position: fixed;
  right: 28px;
  bottom: 32px;
  z-index: 902;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(232, 163, 61, 0.45);
  background: #101014;
  color: #e8a33d;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: inset 0 0 10px rgba(232, 163, 61, 0.12);
  animation: orb-breathe 3s ease-in-out infinite;
  transition: transform 0.2s ease;
}

.nav-orb:hover {
  transform: scale(1.06);
}

.nav-orb.open {
  animation: none;
  background: #0d0d12;
}

@keyframes orb-breathe {
  0%, 100% { box-shadow: inset 0 0 8px rgba(232, 163, 61, 0.1); }
  50% { box-shadow: inset 0 0 18px rgba(232, 163, 61, 0.28); }
}

.nav-mask {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(6, 6, 8, 0.55);
}

/* —— 面板 —— */
.nav-panel {
  position: fixed;
  right: 28px;
  bottom: 100px;
  z-index: 901;
  width: 340px;
  max-height: min(70vh, 560px);
  overflow-y: auto;
  padding: 18px;
  border-radius: var(--xt-radius-lg);
  background: #101014;
  border: 1px solid var(--xt-card-border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 var(--xt-card-highlight);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--xt-text-on-dark);
}

.panel-kbd {
  font-size: 11px;
  color: var(--xt-text-on-dark-muted);
  border: 1px solid rgba(232, 230, 224, 0.16);
  border-radius: 6px;
  padding: 2px 8px;
}

.group-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #e8a33d;
}

.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--xt-card-border);
  background: rgba(232, 230, 224, 0.03);
  color: var(--xt-text-on-dark);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.quick-item:hover {
  border-color: rgba(232, 163, 61, 0.45);
  color: #e8a33d;
}

.guide-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guide-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border-radius: var(--xt-radius-sm);
  border: 1px solid transparent;
  background: rgba(232, 230, 224, 0.03);
  color: var(--xt-text-on-dark);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.guide-item:hover {
  background: rgba(232, 230, 224, 0.08);
}

.guide-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #e8a33d;
  border: 1px solid rgba(232, 163, 61, 0.4);
  flex-shrink: 0;
}

.guide-text {
  flex: 1;
}

.guide-arrow {
  color: var(--xt-text-on-dark-muted);
}

.faq-item {
  border-bottom: 1px solid rgba(232, 230, 224, 0.08);
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 8px 2px;
  background: none;
  border: none;
  color: var(--xt-text-on-dark);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.faq-caret {
  transition: transform 0.2s ease;
  color: var(--xt-text-on-dark-muted);
}

.faq-caret.open {
  transform: rotate(180deg);
}

.faq-a {
  margin: 0;
  padding: 0 2px 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--xt-text-on-dark-muted);
}

.panel-foot {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--xt-text-muted);
  border-top: 1px dashed rgba(232, 230, 224, 0.14);
  padding-top: 12px;
}

/* —— 过渡 —— */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

/* —— 移动端：底部抽屉 —— */
@media (max-width: 768px) {
  .nav-orb {
    right: 18px;
    /* 避开底部 Tab Bar */
    bottom: calc(76px + env(safe-area-inset-bottom));
    width: 52px;
    height: 52px;
  }

  .nav-panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-height: 78vh;
    border-radius: 20px 20px 0 0;
    padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-orb {
    animation: none;
  }

  .pop-enter-active,
  .pop-leave-active,
  .sheet-enter-active,
  .sheet-leave-active {
    transition: none;
  }
}
</style>
