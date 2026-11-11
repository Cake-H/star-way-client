<template>
  <section class="features-section" aria-label="核心功能">
    <div class="section-header">
      <h2 class="section-title">核心能力</h2>
      <p class="section-subtitle">四件舰载装备，覆盖求职全航程</p>
    </div>

    <div class="bento-grid">
      <article
        v-for="item in items"
        :key="item.key"
        class="bento-card"
        :class="`size-${item.size}`"
        tabindex="0"
        role="link"
        :aria-label="`${item.title} · ${item.metaphor}`"
        @click="go(item.routeName)"
        @keydown.enter="go(item.routeName)"
      >
        <div class="card-head">
          <el-icon class="card-icon" :size="item.size === 'large' ? 26 : 22" aria-hidden="true">
            <component :is="item.icon" />
          </el-icon>
          <p class="card-metaphor">{{ item.metaphor }}</p>
        </div>

        <!-- 大卡：迷你功能示意，填充空白 -->
        <div v-if="item.key === 'resume'" class="mini-fields" aria-hidden="true">
          <div v-for="f in ['基本信息', '教育经历', '工作经历', '项目经验']" :key="f" class="mini-field">
            <span class="mini-field-dot" />
            <span class="mini-field-name">{{ f }}</span>
            <span class="mini-field-line" />
          </div>
        </div>
        <div v-else-if="item.key === 'apply'" class="mini-sites" @click.stop @keydown.enter.stop>
          <!-- 有真实站点数据：分类可点 + 当前分类站点列表 -->
          <template v-if="categories.length">
            <div class="mini-cats" role="tablist" aria-label="站点分类">
              <button
                v-for="c in categories"
                :key="c"
                type="button"
                class="mini-chip mini-chip-btn"
                :class="{ 'mini-chip-amber': c === activeCategory }"
                role="tab"
                :aria-selected="c === activeCategory"
                @click="activeCategory = c"
              >
                {{ c }}
              </button>
            </div>
            <ul class="mini-site-list">
              <li v-for="s in shownSites" :key="s.id">
                <button type="button" class="mini-site" @click="go('apply-site-list')">
                  <img v-if="s.logoUrl" :src="s.logoUrl" class="mini-site-logo" alt="" loading="lazy" />
                  <span v-else class="mini-site-logo mini-site-logo-text" aria-hidden="true">
                    {{ s.name.slice(0, 1) }}
                  </span>
                  <span class="mini-site-name">{{ s.name }}</span>
                  <span v-if="s.supportAutofill === 1" class="mini-site-badge">光速填表</span>
                </button>
              </li>
              <li v-if="!shownSites.length" class="mini-site-empty">该分类暂无站点</li>
            </ul>
          </template>
          <!-- 无数据（游客/接口异常）：回退为装饰 chips -->
          <div v-else class="mini-chips" aria-hidden="true">
            <span v-for="c in ['综合招聘', '校招专区', '实习', '社招']" :key="c" class="mini-chip">{{ c }}</span>
            <span class="mini-chip mini-chip-amber">光速填表</span>
          </div>
        </div>

        <div class="card-text">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-desc">{{ item.desc }}</p>
        </div>

        <!-- 小卡：迷你题卡预览（跃迁试炼） -->
        <div v-if="item.key === 'mock'" class="mini-preview" aria-hidden="true">
          <p class="mini-preview-note">第 3 题 · 自我介绍</p>
          <div class="mini-dots">
            <span v-for="i in 5" :key="i" class="mini-dot" :class="{ on: i === 1 }" :style="{ '--motion-delay': `${(i - 1) * 80}ms` }" />
          </div>
        </div>

        <!-- 小卡：迷你录音日志预览（航行日志） -->
        <div v-else-if="item.key === 'interview'" class="mini-preview" aria-hidden="true">
          <div class="mini-wave">
            <span
              v-for="(h, i) in waveBars"
              :key="i"
              class="mini-wave-bar"
              :class="{ amber: i % 3 === 0 }"
              :style="{ height: `${h}px`, '--motion-delay': `${i * 35}ms` }"
            />
          </div>
          <p class="mini-preview-note">已整理为结构化复盘 · 3 个待改进点</p>
        </div>

        <span class="card-entry">
          进入
          <el-icon :size="16"><Right /></el-icon>
        </span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Right } from '@element-plus/icons-vue'
import { featureCards } from '@/composables/useHomeJourney'
import { getApplySiteCategories, getApplySites, type ApplySiteVO } from '@/api/applySite'

const router = useRouter()
const items = featureCards

/** 静态录音示意，与参考样式保持疏密节奏。 */
const waveBars = [16, 26, 34, 13, 22, 32, 15, 24, 36, 27, 18, 12]

/* —— 网申大卡：真实分类 + 站点预览（接口 5 分钟缓存，失败回退装饰态） —— */
const ALL = '全部'
const categories = ref<string[]>([])
const sites = ref<ApplySiteVO[]>([])
const activeCategory = ref(ALL)

onMounted(async () => {
  try {
    const [cats, list] = await Promise.all([getApplySiteCategories(), getApplySites()])
    if (!list.length) return
    categories.value = [ALL, ...cats]
    sites.value = list
  } catch {
    // 游客无权限或网络异常：保持装饰 chips 回退态
  }
})

/** 当前分类下的站点（列表区固定高度内部滚动，条数不受限） */
const shownSites = computed(() => {
  return activeCategory.value === ALL
    ? sites.value
    : sites.value.filter((s) => s.category === activeCategory.value)
})

function go(routeName: string) {
  router.push({ name: routeName })
}
</script>

<style scoped>
.features-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section-header {
  text-align: center;
}

/* 区块标题：思源宋体 Bold + 暖白纯色 */
.section-title {
  margin: 0 0 6px;
  font-family: var(--xt-font-title);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--xt-text-on-dark);
}

.section-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--xt-text-on-dark-muted);
}

/* —— Bento 不对称网格：2 大 2 小 —— */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* 行高自适应内容（小卡含迷你预览，约需 250px），避免 overflow 裁掉卡片底部 */
  grid-template-rows: minmax(250px, auto) minmax(250px, auto);
  grid-template-areas:
    'resume resume apply'
    'mock interview apply';
  gap: 20px;
}

.bento-card:nth-of-type(1) { grid-area: resume; }
.bento-card:nth-of-type(2) { grid-area: apply; }
.bento-card:nth-of-type(3) { grid-area: mock; }
.bento-card:nth-of-type(4) { grid-area: interview; }

/* 位移使用独立 translate，避免与首页滚动入场的 transform 冲突。 */
.bento-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  border-radius: var(--xt-radius-lg);
  cursor: pointer;
  overflow: hidden;
  background: var(--xt-card-bg);
  border: 1px solid var(--xt-card-border);
  box-shadow: inset 0 1px 0 var(--xt-card-highlight);
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease, translate 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.bento-card:hover,
.bento-card:focus-visible {
  border-color: color-mix(in srgb, var(--xt-primary) 65%, transparent);
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--xt-primary) 9%, transparent), transparent 65%);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--xt-primary) 18%, transparent),
    0 0 0 1px color-mix(in srgb, var(--xt-primary) 12%, transparent),
    0 8px 24px color-mix(in srgb, var(--xt-primary) 8%, transparent);
}

.bento-card:focus-visible {
  outline: 2px solid var(--xt-primary);
  outline-offset: 3px;
}

/* 图标：细线感单色，无底托方块，hover 琥珀 */
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 26px;
}

.card-icon {
  color: var(--xt-primary);
  transition: color 0.2s ease, transform 0.28s ease;
}

.bento-card:hover .card-icon,
.bento-card:focus-visible .card-icon {
  color: var(--xt-primary);
}

.card-metaphor {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--xt-text-on-dark-muted);
}

/* —— 大卡迷你示意 —— */
.mini-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--xt-radius-sm);
  border: 1px solid var(--xt-card-border);
  background: rgba(232, 230, 224, 0.02);
}

.mini-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-field-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--xt-primary);
  flex-shrink: 0;
}

.mini-field-name {
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
  width: 56px;
  flex-shrink: 0;
}

.mini-field-line {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 5px;
  border-radius: 3px;
  background: rgba(232, 230, 224, 0.08);
}

.mini-field-line::after {
  content: '';
  position: absolute;
  inset: 0 var(--field-tail, 12%) 0 0;
  border-radius: inherit;
  background: var(--xt-text-on-dark-muted);
  opacity: 0.18;
}

.mini-field:nth-child(2) { --field-tail: 25%; }
.mini-field:nth-child(3) { --field-tail: 38%; }
.mini-field:nth-child(4) { --field-tail: 18%; }

.mini-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}

.mini-chip {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--xt-card-border);
  color: var(--xt-text-on-dark-muted);
  background: rgba(232, 230, 224, 0.02);
}

.mini-chip-amber {
  color: #e8a33d;
  border-color: rgba(232, 163, 61, 0.4);
  background: rgba(232, 163, 61, 0.08);
}

/* —— 网申大卡：分类可点 + 站点预览 —— */
.mini-sites {
  /* 弹性占满卡片剩余高度，标题与「进入」沉底 */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mini-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.mini-chip-btn {
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.mini-chip-btn:focus-visible,
.mini-site:focus-visible {
  outline: 2px solid var(--xt-primary);
  outline-offset: -2px;
}

.mini-chip-btn:hover {
  border-color: rgba(232, 163, 61, 0.35);
  color: var(--xt-text-on-dark);
}

.mini-chip-btn.mini-chip-amber:hover {
  color: #e8a33d;
}

.mini-site-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 占满卡片剩余空间；放不下直接截断（不滚动），截断处渐隐收尾 */
  flex: 1;
  min-height: 0;
  /* 封顶防止内容把卡片撑高，截断高度略收 */
  max-height: 350px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 72%, transparent 99%);
  mask-image: linear-gradient(180deg, #000 72%, transparent 99%);
}

.mini-site {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--xt-radius-sm);
  background: rgba(232, 230, 224, 0.02);
  color: var(--xt-text-on-dark);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.mini-site:hover {
  background: rgba(232, 230, 224, 0.06);
  border-color: rgba(232, 230, 224, 0.1);
}

.mini-site-logo {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
  background: #0d0d12;
}

.mini-site-logo-text {
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #e8a33d;
  border: 1px solid rgba(232, 163, 61, 0.3);
}

.mini-site-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-site-badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  color: #e8a33d;
  border: 1px solid rgba(232, 163, 61, 0.35);
}

.mini-site-empty {
  padding: 10px 8px;
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
}

/* —— 小卡迷你预览：开放留白，不额外嵌套边框 —— */
.mini-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  min-height: 72px;
  justify-content: flex-start;
  border: 0;
  background: transparent;
}

/* 保持破晓模式下同样无底框的预览。 */
:global(html[data-theme='dawn'] .features-section .mini-preview) {
  background: transparent;
}

.mini-preview-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--xt-text-on-dark-muted);
}

/* 迷你题卡：与参考图一致的五段静态进度示意 */
.mini-dots {
  display: flex;
  align-items: center;
  gap: 5px;
}

.mini-dot {
  width: 20px;
  height: 3px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--xt-text-on-dark-muted) 22%, transparent);
}

.mini-dot.on {
  background: var(--xt-primary);
}

/* 迷你录音波形 */
.mini-wave {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 38px;
}

.mini-wave-bar {
  width: 3px;
  border-radius: 2px;
  background: var(--xt-text-on-dark-muted);
  opacity: 0.65;
}

.mini-wave-bar.amber {
  background: var(--xt-primary);
  opacity: 1;
}

.card-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.size-small .card-text {
  margin-top: 6px;
}

.size-small .mini-preview {
  margin-top: auto;
}

.card-title {
  margin: 0;
  font-family: var(--xt-font-title);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--xt-text-on-dark);
}

.size-large .card-title {
  font-size: 22px;
}

.card-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
  color: var(--xt-text-on-dark-muted);
}

.card-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--xt-card-border);
  font-size: 13px;
  font-weight: 500;
  color: var(--xt-primary);
  transition: color 0.2s ease;
}

.bento-card:hover .card-entry,
.bento-card:focus-visible .card-entry {
  color: var(--xt-primary);
}

.card-entry .el-icon {
  transition: transform 0.2s ease;
}

.bento-card:hover .card-entry .el-icon,
.bento-card:focus-visible .card-entry .el-icon {
  transform: translateX(3px);
}

@keyframes preview-progress {
  0%, 100% { background: color-mix(in srgb, var(--xt-text-on-dark-muted) 22%, transparent); }
  35%, 65% { background: var(--xt-primary); }
}

@keyframes preview-wave {
  0%, 100% { transform: scaleY(1); }
  30% { transform: scaleY(0.55); }
  65% { transform: scaleY(1.08); }
}

@media (hover: hover) and (pointer: fine) {
  .bento-card:hover,
  .bento-card:focus-visible {
    translate: 0 -3px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--xt-primary) 22%, transparent),
      0 12px 30px color-mix(in srgb, var(--xt-primary) 12%, transparent);
  }

  .bento-card:hover .card-icon,
  .bento-card:focus-visible .card-icon {
    transform: scale(1.08);
  }

  .bento-card:is(:hover, :focus-visible) .mini-dot:not(.on) {
    animation: preview-progress 0.48s ease var(--motion-delay) 1;
  }

  .bento-card:is(:hover, :focus-visible) .mini-wave-bar {
    animation: preview-wave 0.65s ease-in-out var(--motion-delay) 1;
  }
}

@media (hover: none) {
  .bento-card:active {
    translate: 0 1px;
    border-color: var(--xt-primary);
    background: color-mix(in srgb, var(--xt-primary) 8%, var(--xt-card-bg));
  }
}

/* —— 平板：两列 —— */
@media (max-width: 1023px) {
  .bento-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      'resume apply'
      'mock interview';
  }

  .bento-card {
    min-height: 200px;
  }
}

/* —— 移动端：纵向卡片流 —— */
@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas:
      'resume'
      'apply'
      'mock'
      'interview';
    gap: 14px;
  }

  .bento-card {
    min-height: 0;
    padding: 20px;
  }

  .section-title {
    font-size: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bento-card,
  .card-icon,
  .card-entry,
  .card-entry .el-icon,
  .mini-preview {
    transition: none;
  }

  .bento-card:hover .card-entry .el-icon,
  .bento-card:focus-visible .card-entry .el-icon {
    transform: none;
  }

  .bento-card {
    translate: none !important;
  }

  .card-icon {
    transform: none !important;
  }

  .mini-dot,
  .mini-wave-bar {
    animation: none !important;
  }
}
</style>
