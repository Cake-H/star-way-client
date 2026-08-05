<template>
  <div class="apply-sites">
    <div class="xt-section-head hero">
      <div>
        <p class="xt-eyebrow hero-eyebrow">星途 · 一键网申</p>
        <h1 class="xt-section-title">网申站点</h1>
        <p class="xt-section-desc">
          按分类浏览网申入口，进入站点后即可使用浏览器插件一键填入简历。
        </p>
      </div>
      <div class="hero-actions">
        <el-button plain @click="pluginGuideVisible = true">
          <el-icon class="btn-ico"><ChromeFilled /></el-icon>
          插件安装指引
        </el-button>
        <el-button type="primary" plain :loading="refreshing" @click="onRefresh">
          <el-icon class="btn-ico"><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 分类 Tab：数量由后台运营增减，横向可滚动 -->
    <div class="category-bar">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="category-tab"
        :class="{ active: tab === activeCategory }"
        @click="switchCategory(tab)"
      >
        {{ tab }}
      </button>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated class="list-skeleton" />

    <el-empty v-else-if="!sites.length" description="该分类下暂无上架站点" />

    <div v-else v-stagger class="site-list">
      <OrbitalCard
        v-for="site in sites"
        :key="site.id"
        class="site-card"
        clickable
        shadow="hover"
        @click="onSiteClick(site)"
      >
        <div class="site-card-body">
          <div class="site-logo" :class="{ placeholder: !showLogo(site) }">
            <img
              v-if="showLogo(site)"
              :src="site.logoUrl!"
              :alt="site.name"
              loading="lazy"
              @error="onLogoError(site.id)"
            />
            <span v-else class="logo-fallback">{{ site.name.charAt(0) }}</span>
          </div>
          <div class="site-info">
            <div class="site-name-row">
              <span class="site-name">{{ site.name }}</span>
              <el-tag
                v-if="site.supportAutofill === 1"
                type="primary"
                size="small"
                effect="plain"
                class="autofill-badge"
              >
                <el-icon class="badge-ico"><MagicStick /></el-icon>
                一键填表
              </el-tag>
            </div>
            <p class="site-category">{{ site.category }}</p>
          </div>
          <el-icon class="site-arrow"><ArrowRight /></el-icon>
        </div>
      </OrbitalCard>
    </div>

    <!-- 一键网申说明弹窗：进入页面自动弹出，也可通过「插件安装指引」再次打开 -->
    <PluginGuideDialog v-model="pluginGuideVisible" :resume-count="resumeCount" />

    <!-- 一键填表引导弹窗：支持插件的站点点击时先引导安装扩展 -->
    <el-dialog
      v-model="guideVisible"
      :title="`${EXTENSION_NAME} · 一键填表`"
      width="480px"
      align-center
      destroy-on-close
      class="autofill-guide-dialog"
    >
      <div class="guide-body">
        <p class="guide-lead">
          「{{ pendingSite?.name }}」支持插件一键填表：安装浏览器扩展并登录同一账号后，打开网申页即可把云端简历一键填入表单。
        </p>
        <div class="store-actions">
          <a
            v-if="storeUrls.chrome"
            :href="storeUrls.chrome"
            target="_blank"
            rel="noopener"
            class="store-link"
          >
            <el-icon><ChromeFilled /></el-icon>
            Chrome 商店
          </a>
          <a
            v-if="storeUrls.edge"
            :href="storeUrls.edge"
            target="_blank"
            rel="noopener"
            class="store-link"
          >
            <el-icon><ChromeFilled /></el-icon>
            Edge 加载项
          </a>
          <a
            v-if="storeUrls.firefox"
            :href="storeUrls.firefox"
            target="_blank"
            rel="noopener"
            class="store-link"
          >
            <el-icon><ChromeFilled /></el-icon>
            Firefox 附加组件
          </a>
          <el-tag v-if="!hasStoreUrl" type="info" size="small" effect="plain">
            商店链接待配置，可先在首页「一键网申」查看安装指引
          </el-tag>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="guideVisible = false">取消</el-button>
          <el-button type="primary" @click="openPendingSite">
            直接访问站点
            <el-icon class="btn-ico"><TopRight /></el-icon>
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, ChromeFilled, MagicStick, Refresh, TopRight } from '@element-plus/icons-vue'
import OrbitalCard from '@/components/OrbitalCard.vue'
import PluginGuideDialog from '@/components/home/PluginGuideDialog.vue'
import { getApplySiteCategories, getApplySites, type ApplySiteVO } from '@/api/applySite'
import { listMyResumes } from '@/api/resume'
import { EXTENSION_NAME, EXTENSION_STORE_URLS } from '@/config'

const ALL_TAB = '全部'

const categories = ref<string[]>([])
const activeCategory = ref(ALL_TAB)
const sites = ref<ApplySiteVO[]>([])
const loading = ref(true)
const refreshing = ref(false)
const failedLogos = ref(new Set<string>())

const guideVisible = ref(false)
const pendingSite = ref<ApplySiteVO | null>(null)

// 一键网申说明弹窗：进入页面自动弹出一次
const pluginGuideVisible = ref(false)
const resumeCount = ref(0)

const tabs = computed(() => [ALL_TAB, ...categories.value])
const storeUrls = EXTENSION_STORE_URLS
const hasStoreUrl = computed(
  () => !!storeUrls.chrome || !!storeUrls.edge || !!storeUrls.firefox,
)

function showLogo(site: ApplySiteVO): boolean {
  return !!site.logoUrl && !failedLogos.value.has(site.id)
}

function onLogoError(id: string) {
  failedLogos.value = new Set(failedLogos.value).add(id)
}

async function loadSites(forceRefresh = false) {
  const data = await getApplySites(
    activeCategory.value === ALL_TAB ? '' : activeCategory.value,
    forceRefresh,
  )
  sites.value = data
}

async function switchCategory(tab: string) {
  if (tab === activeCategory.value) return
  activeCategory.value = tab
  loading.value = true
  try {
    await loadSites()
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  try {
    // 分类和当前列表一起强刷，模拟下拉刷新语义
    await getApplySiteCategories(true).then((list) => (categories.value = list))
    await loadSites(true)
  } finally {
    refreshing.value = false
  }
}

function onSiteClick(site: ApplySiteVO) {
  if (site.supportAutofill === 1) {
    pendingSite.value = site
    guideVisible.value = true
    return
  }
  window.open(site.url, '_blank', 'noopener')
}

function openPendingSite() {
  if (pendingSite.value) {
    window.open(pendingSite.value.url, '_blank', 'noopener')
  }
  guideVisible.value = false
}

onMounted(async () => {
  try {
    // 分类、「全部」列表、简历数（供插件指引弹窗判断）并行拉取
    const [categoryList, , resumes] = await Promise.all([
      getApplySiteCategories(),
      loadSites(),
      listMyResumes().catch(() => []),
    ])
    categories.value = categoryList
    resumeCount.value = resumes.length
    pluginGuideVisible.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.apply-sites {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-ico {
  margin-right: 4px;
}

/* 分类 Tab 条：横向滚动，分类个数不写死 */
.category-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.category-tab {
  flex-shrink: 0;
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid var(--xt-border);
  background: var(--xt-surface);
  color: var(--xt-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.category-tab:hover {
  color: var(--xt-text);
  border-color: rgba(232, 163, 61, 0.45);
}

/* 当前分类：琥珀实底 + 深色文字 */
.category-tab.active {
  background: var(--xt-primary);
  border-color: var(--xt-primary);
  color: #1c1206;
  font-weight: 600;
}

.list-skeleton {
  margin-top: 8px;
}

/* 网格：PC 3 列、平板 2 列、移动端 1 列 */
.site-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .site-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.site-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  background: var(--xt-surface-solid);
}

.site-card:hover {
  transform: translateY(-3px);
  border-color: rgba(232, 163, 61, 0.4);
  box-shadow: var(--xt-shadow-md);
}

.site-card-body {
  display: flex;
  align-items: center;
  gap: 14px;
}

.site-logo {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
}

.site-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 字母方块：哑光底 + 琥珀字母 + 细边 */
.site-logo.placeholder {
  background: #1a1a1f;
  border: 1px solid rgba(232, 230, 224, 0.12);
}

.logo-fallback {
  color: var(--xt-primary);
  font-size: 20px;
  font-weight: 700;
}

.site-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.site-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.site-name {
  font-family: var(--xt-font-title);
  font-size: 16px;
  font-weight: 700;
  color: var(--xt-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 一键填表：琥珀描边小胶囊 */
.autofill-badge {
  flex-shrink: 0;
  background: transparent;
  border-color: rgba(232, 163, 61, 0.55);
  color: var(--xt-primary);
}

.badge-ico {
  margin-right: 2px;
  vertical-align: -2px;
}

.site-category {
  margin: 0;
  font-size: 13px;
  color: var(--xt-text-secondary);
}

.site-arrow {
  flex-shrink: 0;
  color: var(--xt-text-secondary);
  transition: transform 0.2s ease, color 0.2s ease;
}

.site-card:hover .site-arrow {
  transform: translateX(2px);
  color: var(--xt-primary);
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.guide-lead {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--xt-text-secondary);
}

.store-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.store-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--xt-radius-sm);
  background: var(--xt-surface);
  border: 1px solid var(--xt-border);
  color: var(--xt-text);
  font-size: 13px;
  text-decoration: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.store-link:hover {
  background: rgba(232, 163, 61, 0.08);
  border-color: rgba(232, 163, 61, 0.45);
  color: var(--xt-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .site-list {
    grid-template-columns: 1fr;
  }
}
</style>
