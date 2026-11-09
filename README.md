# 星途 · 智能简历投递助手（App 端）

一款面向求职者的一站式 PWA 应用：AI 简历解析、投递进度管理、模拟面试、面试语音复盘，配合浏览器插件实现网申页一键填表。支持桌面与移动端，可安装到主屏幕。

> 后端服务为独立进程 `ida-app-server`（Spring Boot），本仓库仅包含前端 App。

## ✨ 功能

- **简历管理**：上传 PDF / DOCX，异步任务 + 轮询的 AI 智能解析生成结构化草稿；多份简历管理、默认简历、原件预览
- **投递记录**：公司 / 岗位 / 进度 / 日期区间组合筛选，表格行内编辑，进度从「已投递」到「offer / 终止」全流程跟踪
- **模拟面试**：基于简历内容生成面试题，练习模式逐题作答
- **面试复盘**：语音口述（录音）或文字输入 → 异步 AI 总结为结构化问答草稿，核对后入库，支持练习模式
- **网申站点**：按分类浏览投递入口，配合浏览器扩展一键填入简历
- **额度中心**：AI 调用额度查询、充值与兑换码
- **账号体系**：短信验证码登录，Token 鉴权

## 🛠 技术栈

| 领域 | 选型 |
|---|---|
| 框架 | Vue 3 + TypeScript + Vite 6 |
| UI | Element Plus + 自研「星途」主题（暗色 / 破晓亮色双主题） |
| 路由 / 状态 | Vue Router 4 / 组合式 API |
| HTTP | axios（统一响应封装、401 处理、网络错误静默重试） |
| PWA | vite-plugin-pwa + workbox（可安装、自动更新） |
| 动效 | GSAP、tsParticles、自绘 Canvas（星空背景 / 声波） |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 本地开发（默认连 .env.development 配置的后端）
npm run dev

# 类型检查 + 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 前缀（`/api/v1/app`） | `/api` |
| `VITE_INTERVIEW_USE_API` | 面试复盘是否走真实接口，`false` 时用 localStorage mock（离线演示） | `true` |
| `VITE_MOCK_INTERVIEW_USE_API` | 模拟面试是否走真实接口 | `true` |
| `VITE_EXTENSION_CHROME_URL` / `VITE_EXTENSION_EDGE_URL` / `VITE_EXTENSION_FIREFOX_URL` | 浏览器扩展商店链接 | 空 |
| `VITE_EXTENSION_ZIP_URL` | 扩展测试包直链（免商店分发） | 空 |
| `VITE_EXTENSION_BETA_VERSION` | 扩展测试包版本号（仅展示） | 空 |

本地开发请复制 `.env.development` 按需修改；生产配置在 `.env.production`。

## 📁 目录结构

```
src/
├── api/          # HTTP 层：各模块接口封装（resume / interview / job-application / quota …）
├── services/     # 数据访问层：接口与 localStorage mock 的统一出口
├── views/        # 页面（简历、投递记录、模拟面试、面试复盘、额度中心 …）
├── components/   # 通用与业务组件
├── composables/  # 组合式函数（登录引导、额度提示、PWA …）
├── layouts/      # 主布局（顶部导航 / 移动端 Tab Bar）
├── router/       # 路由与鉴权守卫
├── theme/        # 双主题与过渡动画
└── utils/        # 工具函数
```

## 🔌 接口约定

- Base：`{VITE_API_BASE_URL}` → 生产为 `/api/v1/app`
- 鉴权：`Authorization: Bearer <token>`（短信登录获取）
- 统一响应体：`{ code, ok, msg, data }`，`code === 0` 为成功
- AI 长耗时操作（简历解析、语音总结）均为**异步任务接口**：提交返回 `taskId`，前端每 2~3 秒轮询直至 `SUCCESS / FAILED`

## 📦 相关

- 后端：`ida-app-server`（默认端口 8088，接口文档 Knife4j `/doc.html`）
- 浏览器扩展：一键网申填表（配套插件仓库）

## License

私有项目，暂未开源授权。
