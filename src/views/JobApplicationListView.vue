<template>
  <div class="job-applications">
    <div class="xt-section-head hero">
      <div>
        <p class="xt-eyebrow list-eyebrow">星途 · 投递记录</p>
        <h1 class="xt-section-title">投递记录</h1>
        <p class="xt-section-desc">
          把每一次投递都记下来：投了哪家公司、哪个岗位、进度到哪一步，支持组合筛选与行内编辑。
        </p>
      </div>
      <StarLaunchButton type="primary" size="large" @click="onAdd">
        <el-icon class="btn-ico"><Plus /></el-icon>
        新建投递记录
      </StarLaunchButton>
    </div>

    <!-- 筛选区：任一条件变化即带参重新请求（服务端筛选） -->
    <div class="filter-bar">
      <el-input
        v-model="filters.companyName"
        class="filter-item filter-input"
        placeholder="投递公司"
        clearable
        :prefix-icon="Search"
        :size="isMobile ? 'small' : undefined"
      />
      <el-input
        v-model="filters.position"
        class="filter-item filter-input"
        placeholder="投递岗位"
        clearable
        :prefix-icon="Search"
        :size="isMobile ? 'small' : undefined"
      />
      <el-select
        v-model="filters.progress"
        class="filter-item filter-select"
        placeholder="全部进度"
        clearable
        :size="isMobile ? 'small' : undefined"
      >
        <el-option v-for="o in progressOptions" :key="o.code" :label="o.label" :value="o.code" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        class="filter-item filter-dates"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="投递开始"
        end-placeholder="投递结束"
        clearable
        :size="isMobile ? 'small' : undefined"
      />
      <el-button class="filter-reset" plain :size="isMobile ? 'small' : undefined" @click="resetFilters">
        <el-icon class="btn-ico"><RefreshLeft /></el-icon>
        重置
      </el-button>
      <span v-if="!loading" class="filter-count">共 {{ items.length }} 条</span>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />

    <template v-else>
      <el-empty
        v-if="!tableRows.length"
        :description="hasFilter ? '没有符合筛选条件的投递记录' : '还没有投递记录，记下第一笔吧'"
      >
        <el-button v-if="!hasFilter" type="primary" @click="onAdd">
          <el-icon class="btn-ico"><Plus /></el-icon>
          新建投递记录
        </el-button>
      </el-empty>

      <!-- 桌面端：表格行内编辑 -->
      <div v-else-if="!isMobile" class="table-wrap">
        <el-table :data="tableRows" v-loading="refreshing" class="app-table" :row-class-name="rowClassName">
          <el-table-column label="投递日期" width="148" align="center">
            <template #default="{ row }">
              <el-date-picker
                v-if="isEditing(row)"
                v-model="buffer.applyDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="默认今天"
                class="cell-editor cell-date-picker"
              />
              <span v-else class="cell-date">{{ row.applyDate || '—' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="公司" min-width="150">
            <template #default="{ row }">
              <div v-if="isEditing(row)" class="cell-editor-wrap">
                <i class="req-star">*</i>
                <el-input
                  v-model="buffer.companyName"
                  maxlength="128"
                  placeholder="如：字节跳动"
                  class="cell-editor"
                />
              </div>
              <div v-else class="cell-company">
                <span class="company-name" :title="row.companyName">{{ row.companyName }}</span>
                <el-tag v-if="row.source === 'PLUGIN'" type="warning" size="small" effect="plain" class="plugin-badge">
                  插件同步
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="岗位" min-width="140">
            <template #default="{ row }">
              <div v-if="isEditing(row)" class="cell-editor-wrap">
                <i class="req-star">*</i>
                <el-input
                  v-model="buffer.position"
                  maxlength="128"
                  placeholder="如：后端开发工程师"
                  class="cell-editor"
                />
              </div>
              <span v-else class="cell-position" :title="row.position">{{ row.position }}</span>
            </template>
          </el-table-column>

          <el-table-column label="进度" width="104" align="center" class-name="col-progress" label-class-name="col-progress">
            <template #default="{ row }">
              <el-select v-if="isEditing(row)" v-model="buffer.progress" class="cell-editor progress-select">
                <el-option v-for="o in progressOptions" :key="o.code" :label="o.label" :value="o.code" />
              </el-select>
              <span v-else class="progress-pill" :class="`is-${row.progress.toLowerCase()}`">
                {{ row.progressLabel }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="网申地址" min-width="120">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row)"
                v-model="buffer.applyUrl"
                maxlength="512"
                placeholder="https://…（选填）"
                class="cell-editor"
              />
              <el-link
                v-else-if="row.applyUrl"
                type="primary"
                :href="row.applyUrl"
                target="_blank"
                rel="noopener"
                class="cell-link"
              >
                {{ urlHost(row.applyUrl) }}
                <el-icon class="link-ico"><TopRight /></el-icon>
              </el-link>
              <span v-else class="cell-empty">—</span>
            </template>
          </el-table-column>

          <el-table-column label="备注" min-width="140">
            <template #default="{ row }">
              <el-input
                v-if="isEditing(row)"
                v-model="buffer.remark"
                maxlength="1024"
                placeholder="如：校招提前批（选填）"
                class="cell-editor"
              />
              <span v-else-if="row.remark" class="cell-remark" :title="row.remark">{{ row.remark }}</span>
              <span v-else class="cell-empty">—</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <!-- 编辑态：保存后才入库 / 生效；新增行点删除即移除草稿，已有行编辑中提供取消 -->
              <div v-if="isEditing(row)" class="row-actions">
                <el-button type="primary" link :loading="saving" @click="onSave(row)">保存</el-button>
                <el-button v-if="row.applicationId === NEW_ROW_KEY" type="danger" link :disabled="saving" @click="onDiscardNew">
                  删除
                </el-button>
                <el-button v-else link :disabled="saving" @click="onCancelEdit">取消</el-button>
              </div>
              <div v-else class="row-actions">
                <el-button type="primary" link :disabled="editingKey !== null" @click="onEdit(row)">编辑</el-button>
                <el-button
                  type="danger"
                  link
                  :loading="deletingId === row.applicationId"
                  :disabled="editingKey !== null"
                  @click="onDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 移动端：卡片列表（表格窄屏易挤压，改为卡片承载同样的行内编辑） -->
      <div v-else v-stagger class="card-list">
        <div
          v-for="row in tableRows"
          :key="row.applicationId"
          class="app-card"
          :class="{ editing: isEditing(row) }"
        >
          <!-- 查看态 -->
          <template v-if="!isEditing(row)">
            <div class="card-head">
              <div class="card-head-main">
                <span class="card-company">{{ row.companyName }}</span>
                <el-tag v-if="row.source === 'PLUGIN'" type="warning" size="small" effect="plain">插件同步</el-tag>
              </div>
              <span class="progress-pill" :class="`is-${row.progress.toLowerCase()}`">{{ row.progressLabel }}</span>
            </div>
            <div class="card-line">
              <span class="line-label">岗位</span>
              <span class="line-value">{{ row.position }}</span>
            </div>
            <div class="card-line">
              <span class="line-label">投递日期</span>
              <span class="line-value">{{ row.applyDate || '—' }}</span>
            </div>
            <div class="card-line">
              <span class="line-label">网申地址</span>
              <el-link
                v-if="row.applyUrl"
                type="primary"
                :href="row.applyUrl"
                target="_blank"
                rel="noopener"
                class="cell-link"
              >
                {{ urlHost(row.applyUrl) }}
                <el-icon class="link-ico"><TopRight /></el-icon>
              </el-link>
              <span v-else class="line-value muted">—</span>
            </div>
            <div v-if="row.remark" class="card-line">
              <span class="line-label">备注</span>
              <span class="line-value">{{ row.remark }}</span>
            </div>
            <div class="card-foot">
              <el-button type="primary" plain :disabled="editingKey !== null" @click="onEdit(row)">编辑</el-button>
              <el-button
                type="danger"
                plain
                :loading="deletingId === row.applicationId"
                :disabled="editingKey !== null"
                @click="onDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>

          <!-- 编辑态：带字段标签的纵向表单，必填带 * -->
          <template v-else>
            <div class="edit-field">
              <label class="edit-label"><i class="req-star">*</i>公司</label>
              <el-input v-model="buffer.companyName" maxlength="128" placeholder="如：字节跳动" />
            </div>
            <div class="edit-field">
              <label class="edit-label"><i class="req-star">*</i>岗位</label>
              <el-input v-model="buffer.position" maxlength="128" placeholder="如：后端开发工程师" />
            </div>
            <div class="edit-field">
              <label class="edit-label">投递日期</label>
              <el-date-picker
                v-model="buffer.applyDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="默认今天"
                class="edit-date"
              />
            </div>
            <div class="edit-field">
              <label class="edit-label">进度</label>
              <el-select v-model="buffer.progress" class="edit-progress">
                <el-option v-for="o in progressOptions" :key="o.code" :label="o.label" :value="o.code" />
              </el-select>
            </div>
            <div class="edit-field">
              <label class="edit-label">网申地址</label>
              <el-input v-model="buffer.applyUrl" maxlength="512" placeholder="https://…（选填）" />
            </div>
            <div class="edit-field">
              <label class="edit-label">备注</label>
              <el-input
                v-model="buffer.remark"
                type="textarea"
                :rows="2"
                maxlength="1024"
                placeholder="如：校招提前批（选填）"
              />
            </div>
            <div class="card-foot">
              <el-button type="primary" :loading="saving" @click="onSave(row)">保存</el-button>
              <el-button v-if="row.applicationId === NEW_ROW_KEY" type="danger" plain :disabled="saving" @click="onDiscardNew">
                删除
              </el-button>
              <el-button v-else plain :disabled="saving" @click="onCancelEdit">取消</el-button>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 投递记录列表页：组合筛选（服务端）+ 行内编辑。
 * 新增 = 顶部插入空白编辑行；编辑 = 该行切换为输入控件；均须点「保存」才入库 / 生效。
 * 桌面端为表格，移动端为卡片列表，共用同一套编辑状态。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Plus, RefreshLeft, Search, TopRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createJobApplication,
  deleteJobApplication,
  getJobApplicationProgressOptions,
  listJobApplications,
  updateJobApplication,
  type JobApplicationListItemVO,
  type JobApplicationProgressOption,
} from '@/api/jobApplication'
import StarLaunchButton from '@/components/StarLaunchButton.vue'

/** 新增草稿行的占位 id（真实 id 为正数，不会冲突） */
const NEW_ROW_KEY = -1

const isMobile = useMediaQuery('(max-width: 767px)')

const loading = ref(true)
const refreshing = ref(false)
const items = ref<JobApplicationListItemVO[]>([])
const progressOptions = ref<JobApplicationProgressOption[]>([])

/* —— 筛选 —— */
const filters = reactive({
  companyName: '',
  position: '',
  progress: '',
})
const dateRange = ref<[string, string] | null>(null)

const hasFilter = computed(
  () => !!(filters.companyName || filters.position || filters.progress || dateRange.value?.length),
)

async function load(showSkeleton = false) {
  if (showSkeleton) loading.value = true
  else refreshing.value = true
  try {
    items.value = await listJobApplications({
      companyName: filters.companyName,
      position: filters.position,
      progress: filters.progress,
      applyDateStart: dateRange.value?.[0],
      applyDateEnd: dateRange.value?.[1],
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

/* 文本输入防抖 400ms，下拉 / 日期立即生效 */
let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [filters.companyName, filters.position],
  () => {
    if (filterTimer) clearTimeout(filterTimer)
    filterTimer = setTimeout(() => void load(), 400)
  },
)
watch(
  () => [filters.progress, dateRange.value],
  () => void load(),
)

function resetFilters() {
  if (filterTimer) clearTimeout(filterTimer)
  filters.companyName = ''
  filters.position = ''
  filters.progress = ''
  dateRange.value = null
  // watch 会触发 load；原本就为空时手动刷一次
  if (!hasFilter.value) void load()
}

/* —— 行内编辑状态：同一时刻仅一行处于编辑态 —— */
/** null = 无编辑；NEW_ROW_KEY = 新增草稿行；其余为正编辑的记录 id */
const editingKey = ref<number | null>(null)
const saving = ref(false)

/** 编辑缓冲区：编辑期间不触碰行数据，取消 / 失败时行数据天然不变 */
const buffer = reactive({
  companyName: '',
  position: '',
  applyDate: '',
  progress: 'APPLIED',
  applyUrl: '',
  remark: '',
})

function isEditing(row: JobApplicationListItemVO): boolean {
  return editingKey.value !== null && row.applicationId === editingKey.value
}

/** 新增草稿行：仅用于把编辑行渲染进列表，id 固定为 NEW_ROW_KEY */
const draftRow = computed<JobApplicationListItemVO>(() => ({
  applicationId: NEW_ROW_KEY,
  companyName: '',
  position: '',
  applyDate: null,
  progress: 'APPLIED',
  progressLabel: '',
  applyUrl: '',
  source: 'MANUAL',
  remark: '',
  createdAt: '',
  updatedAt: '',
}))

const tableRows = computed<JobApplicationListItemVO[]>(() =>
  editingKey.value === NEW_ROW_KEY ? [draftRow.value, ...items.value] : items.value,
)

function rowClassName({ row }: { row: JobApplicationListItemVO }): string {
  return isEditing(row) ? 'row-editing' : ''
}

function todayStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fillBuffer(row: JobApplicationListItemVO) {
  buffer.companyName = row.companyName
  buffer.position = row.position
  buffer.applyDate = row.applyDate ?? ''
  buffer.progress = row.progress
  buffer.applyUrl = row.applyUrl
  buffer.remark = row.remark
}

function onAdd() {
  if (editingKey.value !== null) {
    ElMessage.warning('请先完成当前行的保存')
    return
  }
  // 新建默认：日期今天、进度已投递（与后端缺省一致）
  buffer.companyName = ''
  buffer.position = ''
  buffer.applyDate = todayStr()
  buffer.progress = 'APPLIED'
  buffer.applyUrl = ''
  buffer.remark = ''
  editingKey.value = NEW_ROW_KEY
}

function onEdit(row: JobApplicationListItemVO) {
  if (editingKey.value !== null) return // 按钮已禁用，防御一下
  fillBuffer(row)
  editingKey.value = row.applicationId
}

function onDiscardNew() {
  editingKey.value = null
}

function onCancelEdit() {
  editingKey.value = null
}

function validateBuffer(): string | null {
  if (!buffer.companyName.trim()) return '投递公司不能为空'
  if (!buffer.position.trim()) return '投递岗位不能为空'
  if (buffer.companyName.trim().length > 128) return '投递公司最长 128 字'
  if (buffer.position.trim().length > 128) return '投递岗位最长 128 字'
  if (buffer.applyUrl.trim().length > 512) return '网申地址最长 512 字'
  if (buffer.remark.trim().length > 1024) return '备注最长 1024 字'
  return null
}

async function onSave(row: JobApplicationListItemVO) {
  const err = validateBuffer()
  if (err) {
    ElMessage.error(err)
    return
  }
  saving.value = true
  try {
    const isNew = row.applicationId === NEW_ROW_KEY
    const body = {
      companyName: buffer.companyName.trim(),
      position: buffer.position.trim(),
      // 后端：新建不传默认当天；更新传 "" 清空为 null
      applyDate: buffer.applyDate || (isNew ? undefined : ''),
      progress: buffer.progress || undefined,
      applyUrl: buffer.applyUrl.trim(),
      remark: buffer.remark.trim(),
    }
    if (isNew) {
      await createJobApplication(body)
      ElMessage.success('已创建投递记录')
    } else {
      await updateJobApplication(row.applicationId, body)
      ElMessage.success('已保存')
    }
    editingKey.value = null
    await load()
  } finally {
    saving.value = false
  }
}

/* —— 删除（软删） —— */
const deletingId = ref<number | null>(null)

async function onDelete(row: JobApplicationListItemVO) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.companyName} · ${row.position}」这条投递记录？`, '删除投递记录', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }
  deletingId.value = row.applicationId
  try {
    await deleteJobApplication(row.applicationId)
    ElMessage.success('已删除')
    await load()
  } finally {
    deletingId.value = null
  }
}

function urlHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

onMounted(async () => {
  // 进度选项（筛选 + 行内编辑下拉共用）与列表并行拉取
  await Promise.all([
    getJobApplicationProgressOptions().then((list) => (progressOptions.value = list)),
    load(true),
  ])
})
</script>

<style scoped>
.job-applications {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.list-eyebrow {
  color: var(--xt-primary);
  margin-bottom: 6px;
}

.hero {
  position: relative;
}

.btn-ico {
  margin-right: 6px;
}

/* —— 筛选区 —— */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--xt-surface-solid);
  border: 1px solid var(--xt-border);
}

.filter-input {
  width: 190px;
}

.filter-select {
  width: 150px;
}

/* el-date-picker 为 fragment 根组件，scoped scopeId 无法落在其根元素上，
   须经 :deep() 从带 scopeId 的原生 .filter-bar 穿透命中 */
.filter-bar :deep(.filter-dates) {
  width: 270px;
}

.filter-reset {
  cursor: pointer;
}

.filter-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--xt-text-muted);
  white-space: nowrap;
}

/* —— 桌面端表格 —— */
.table-wrap {
  border-radius: 12px;
  border: 1px solid var(--xt-border);
  overflow: hidden;
  background: var(--xt-surface-solid);
}

.app-table {
  --el-table-border-color: var(--xt-border);
  --el-table-header-bg-color: rgba(232, 230, 224, 0.04);
  --el-table-row-hover-bg-color: rgba(232, 163, 61, 0.06);
  --el-table-tr-bg-color: transparent;
  font-size: 15px;
  width: 100%;
}

.app-table :deep(.el-table__header th) {
  font-weight: 600;
  font-size: 14px;
  color: var(--xt-text-secondary);
}

/* 行距放宽，左右留白适度收紧以保证全部列一屏放下 */
.app-table :deep(.el-table__cell) {
  padding: 14px 0;
}

.app-table :deep(.el-table .cell) {
  padding: 0 10px;
  line-height: 1.5;
}

/* 进度列：左右间距收窄 */
.app-table :deep(.col-progress .cell),
.app-table :deep(th.col-progress .cell) {
  padding: 0 4px;
}

/* 编辑行高亮：琥珀细边底纹 */
.app-table :deep(.row-editing td) {
  background: rgba(232, 163, 61, 0.07) !important;
}

/* 必填标记：仅出现在编辑态单元格内 */
.req-star {
  color: var(--el-color-danger);
  font-style: normal;
  flex-shrink: 0;
}

.cell-editor-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 编辑态控件字号随正文放大 */
.cell-editor,
.cell-editor-wrap,
.table-wrap :deep(.cell-date-picker) {
  --el-font-size-base: 15px;
}

.cell-editor {
  width: 100%;
}

/* el-date-picker 为 fragment 根组件，scoped scopeId 落不上其根元素，须经 :deep 穿透 */
.table-wrap :deep(.cell-date-picker) {
  width: 100%;
}

.cell-date {
  font-variant-numeric: tabular-nums;
  color: var(--xt-text-secondary);
}

.cell-company {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.company-name {
  font-weight: 600;
  color: var(--xt-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-badge {
  flex-shrink: 0;
}

.cell-position {
  color: var(--xt-text);
}

.cell-empty {
  color: var(--xt-text-muted);
}

.cell-remark {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--xt-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.cell-link {
  font-size: 14px;
}

.link-ico {
  margin-left: 2px;
  vertical-align: -2px;
}

/* 进度胶囊（查看态） */
.progress-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 14px;
  line-height: 1.6;
  white-space: nowrap;
  background: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
  color: var(--xt-text);
}

.progress-pill.is-offer {
  background: var(--el-color-success-light-9);
  box-shadow: 0 0 0 1px var(--el-color-success-light-7) inset;
}

.progress-pill.is-terminated {
  background: rgba(232, 230, 224, 0.06);
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  color: var(--xt-text-muted);
}

.progress-select {
  width: 100%;
}

.row-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.row-actions :deep(.el-button) {
  cursor: pointer;
}

/* —— 移动端卡片列表 —— */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.app-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--xt-surface-solid);
  border: 1px solid var(--xt-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-card.editing {
  border-color: rgba(232, 163, 61, 0.45);
  background: rgba(232, 163, 61, 0.05);
  gap: 14px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-company {
  font-size: 16px;
  font-weight: 700;
  color: var(--xt-text);
  line-height: 1.35;
}

.card-line {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.line-label {
  flex-shrink: 0;
  width: 60px;
  font-size: 13px;
  color: var(--xt-text-muted);
}

.line-value {
  color: var(--xt-text);
  word-break: break-all;
}

.line-value.muted {
  color: var(--xt-text-muted);
}

.card-foot {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  margin-top: 2px;
  border-top: 1px solid var(--xt-border);
}

.card-foot :deep(.el-button) {
  flex: 1;
  margin-left: 0;
  cursor: pointer;
}

/* 移动端编辑表单 */
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-label {
  font-size: 13px;
  color: var(--xt-text-secondary);
  display: flex;
  align-items: center;
  gap: 3px;
}

/* .edit-progress 为 el-select（单根，scoped 可命中）；.edit-date 为 el-date-picker（fragment 根，须 :deep） */
.edit-progress {
  width: 100%;
}

.edit-field :deep(.edit-date) {
  width: 100%;
}

@media (max-width: 767px) {
  /* 移动端紧凑筛选：公司/岗位一行，进度+日期一行，重置+计数一行 */
  .filter-bar {
    padding: 12px;
    gap: 8px;
  }

  .filter-input {
    flex: none;
    width: calc(50% - 4px);
  }

  .filter-select {
    flex: none;
    width: 30%;
  }

  /* EP 默认 .el-date-editor.el-input__wrapper { width: 100% }；:deep 穿透后锚定 .filter-bar 稳压。
     min-width 保证假想主尺寸足以把重置按钮挤到下一行，又不至于在极窄屏溢出 */
  .filter-bar :deep(.filter-dates) {
    flex: 1 1 0;
    width: auto;
    min-width: 180px;
  }

  .filter-reset {
    margin-left: 0;
  }

  .filter-count {
    margin-left: auto;
    font-size: 12px;
  }
}
</style>
