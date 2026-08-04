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
            <span v-for="i in 10" :key="i" class="mini-dot" :class="{ on: i <= 3 }" />
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
              :style="{ height: `${h}px` }"
            />
          </div>
          <p class="mini-preview-note">已整理为结构化复盘 · 3 个待改进点</p>
        </div>

        <span class="card-entry">
          进入
          <el-icon :size="14"><ArrowRight /></el-icon>
        </span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { featureCards } from '@/composables/useHomeJourney'
import { getApplySiteCategories, getApplySites, type ApplySiteVO } from '@/api/applySite'

const router = useRouter()
const items = featureCards

/** 迷你录音波形：高度 6–22px 伪随机但固定，琥珀:暖灰 = 1:2 */
const waveBars = [8, 14, 20, 11, 17, 22, 9, 13, 19, 7, 16, 21, 10, 15]

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

/* 哑光实底卡：1px 描边 + 顶部 1px 内高光，无玻璃无发光 */
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
  transition: border-color 0.2s ease, background 0.2s ease;
}

.bento-card:hover,
.bento-card:focus-visible {
  border-color: var(--xt-card-border-hover);
  background: #131318;
}

/* 图标：细线感单色，无底托方块，hover 琥珀 */
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  color: var(--xt-text-on-dark);
  transition: color 0.2s ease;
}

.bento-card:hover .card-icon,
.bento-card:focus-visible .card-icon {
  color: #e8a33d;
}

.card-metaphor {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
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
  background: #e8a33d;
  flex-shrink: 0;
}

.mini-field-name {
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
  width: 56px;
  flex-shrink: 0;
}

.mini-field-line {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(232, 230, 224, 0.08);
}

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

/* —— 小卡迷你预览（哑光细边包裹） —— */
.mini-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 11px 12px;
  border-radius: var(--xt-radius-sm);
  border: 1px solid rgba(232, 230, 224, 0.06);
}

.mini-preview-note {
  margin: 0;
  font-size: 12px;
  color: var(--xt-text-on-dark-muted);
}

/* 迷你题卡：前 3 题琥珀实心，其余空心 */
.mini-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  border: 1px solid #2a2a30;
}

.mini-dot.on {
  background: #e8a33d;
  border-color: #e8a33d;
}

/* 迷你录音波形 */
.mini-wave {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 22px;
}

.mini-wave-bar {
  width: 3px;
  border-radius: 2px;
  background: var(--xt-text-on-dark-muted);
  opacity: 0.7;
}

.mini-wave-bar.amber {
  background: #e8a33d;
}

.card-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.card-title {
  margin: 0;
  font-family: var(--xt-font-title);
  font-size: 20px;
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
  line-height: 1.6;
  color: var(--xt-text-on-dark-muted);
}

.card-entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--xt-text-on-dark-muted);
  transition: color 0.2s ease;
}

.bento-card:hover .card-entry,
.bento-card:focus-visible .card-entry {
  color: #e8a33d;
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
  .card-entry {
    transition: none;
  }
}
</style>
