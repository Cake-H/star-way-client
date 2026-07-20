# 模拟面试模块 · 后端对接说明

> 前端文件位置：`src/api/mockInterview.ts`、`src/api/mockInterviewTypes.ts`、`src/services/mockInterviewService.ts`、`src/views/MockInterview*.vue`
> 本模块与「面试复盘（interview）」相互独立，可独立实现。

---

## 1. 基础约定

### 1.1 Base Path

```
{VITE_API_BASE_URL}/mock-interview
```

生产默认前缀：`/api/v1/app/mock-interview`

### 1.2 鉴权

所有接口需读取请求头 `Authorization: Bearer <token>`，校验当前登录用户。
返回数据仅包含当前用户创建的模拟面试。

### 1.3 响应格式

与项目其他模块一致，使用统一 `ApiEnvelope<T>`：

```json
{
  "code": 0,
  "message": "ok",
  "data": { }
}
```

- `code === 0` 表示成功；失败时返回非 0 `code` 及 `message`。
- 时间字段统一使用 ISO-8601 字符串，例如 `2026-07-11T08:30:00Z`。
- 驼峰命名（camelCase），与前端 TypeScript 类型保持一致。

---

## 2. 接口清单

| 方法 | 路径 | 说明 | 前端调用位置 |
|------|------|------|-------------|
| GET | `/mock-interview` | 当前用户模拟面试列表 | `listMockInterviews()` |
| GET | `/mock-interview/{mockInterviewId}` | 模拟面试详情（含题目） | `getMockInterviewDetail()` |
| POST | `/mock-interview` | 基于简历生成模拟面试 | `createMockInterview()` |
| DELETE | `/mock-interview/{mockInterviewId}` | 删除模拟面试 | `deleteMockInterview()` |
| PUT | `/mock-interview/{mockInterviewId}/status` | 更新状态 | `updateMockInterviewStatus()` |
| PUT | `/mock-interview/{mockInterviewId}/progress` | 保存练习进度 | `updateMockInterviewProgress()` |

---

## 3. 详细接口规范

### 3.1 GET /mock-interview

**说明**：当前用户的模拟面试列表，不含 `questions` 明细，按 `updatedAt` 倒序。

**请求参数**：无

**响应 data**：

```ts
interface MockInterviewListItemVO {
  mockInterviewId: number
  resumeId: number
  title: string
  questionCount: number
  status: 'GENERATED' | 'PRACTICING' | 'COMPLETED'
  updatedAt: string
}
```

**响应示例**：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "mockInterviewId": 1001,
      "resumeId": 42,
      "title": "Java 后端开发 · 模拟面试",
      "questionCount": 5,
      "status": "PRACTICING",
      "updatedAt": "2026-07-11T08:30:00Z"
    }
  ]
}
```

---

### 3.2 GET /mock-interview/{mockInterviewId}

**说明**：模拟面试详情，返回完整题目列表。`questions` 必须按 `sortOrder` 升序排列。

**路径参数**：`mockInterviewId: number`

**响应 data**：

```ts
interface MockInterviewPracticeProgress {
  currentQuestionId: number
  answerRevealed: boolean
}

interface MockInterviewQuestionVO {
  mockInterviewQuestionId: number
  mockInterviewId: number
  sortOrder: number
  question: string
  answerEvaluation: string | null
  referenceAnswer: string | null
  otherNotes: string | null
  createdAt: string
  updatedAt: string
}

interface MockInterviewVO {
  mockInterviewId: number
  resumeId: number
  title: string
  questionCount: number
  status: 'GENERATED' | 'PRACTICING' | 'COMPLETED'
  updatedAt: string
  practiceProgress: MockInterviewPracticeProgress | null
  questions: MockInterviewQuestionVO[]
}
```

**响应示例**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "mockInterviewId": 1001,
    "resumeId": 42,
    "title": "Java 后端开发 · 模拟面试",
    "questionCount": 5,
    "status": "PRACTICING",
    "updatedAt": "2026-07-11T08:30:00Z",
    "practiceProgress": {
      "currentQuestionId": 1001003,
      "answerRevealed": true
    },
    "questions": [
      {
        "mockInterviewQuestionId": 1001001,
        "mockInterviewId": 1001,
        "sortOrder": 1,
        "question": "请用 1-2 分钟简单介绍一下自己...",
        "answerEvaluation": "考察自我认知、表达逻辑与岗位匹配度...",
        "referenceAnswer": "建议采用「现在-过去-未来」结构...",
        "otherNotes": null,
        "createdAt": "2026-07-11T08:00:00Z",
        "updatedAt": "2026-07-11T08:00:00Z"
      }
    ]
  }
}
```

---

### 3.3 POST /mock-interview

**说明**：根据简历生成模拟面试题。该接口为核心 AI 接口，可能需要 10-30 秒，前端已设置 `timeout: 120_000`。

**请求体**：

```ts
interface MockInterviewCreateRequest {
  resumeId: number
  title?: string
}
```

**业务逻辑建议**：

1. 校验 `resumeId` 属于当前登录用户。
2. 读取简历结构化数据（`resume.draft`）及/或原始文本。
3. 调用 LLM 生成 N 道面试题（建议 5 题）。
4. 将生成的面试题入库，创建 `mock_interview` 记录及 `mock_interview_question` 记录。
5. 初始状态设为 `GENERATED`。
6. 返回新生成的 `mockInterviewId`。

**响应 data**：

```ts
interface MockInterviewCreateResultVO {
  mockInterviewId: number
}
```

**响应示例**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "mockInterviewId": 1001
  }
}
```

---

### 3.4 DELETE /mock-interview/{mockInterviewId}

**说明**：删除模拟面试及其下属所有题目。

**路径参数**：`mockInterviewId: number`

**响应 data**：成功消息字符串即可，例如 `"ok"`。

---

### 3.5 PUT /mock-interview/{mockInterviewId}/status

**说明**：更新模拟面试状态。

**路径参数**：`mockInterviewId: number`

**请求体**：

```ts
interface MockInterviewUpdateStatusRequest {
  status: 'GENERATED' | 'PRACTICING' | 'COMPLETED'
}
```

**业务规则**：

- `GENERATED` → `PRACTICING`：首次进入练习模式时触发。
- `PRACTICING` → `COMPLETED`：用户点击「完成练习」时触发。
- 状态变更时建议同步更新 `updated_at`。

**响应 data**：成功消息字符串即可。

---

### 3.6 PUT /mock-interview/{mockInterviewId}/progress

**说明**：保存练习进度。前端在用户切换题目、查看/隐藏答案、完成练习时调用。

**路径参数**：`mockInterviewId: number`

**请求体**：

```ts
interface MockInterviewUpdateProgressRequest {
  currentQuestionId: number
  answerRevealed: boolean
}
```

**业务规则**：

- `currentQuestionId` 必须是该模拟面试下的题目 ID。
- 后端只需持久化这两个字段，返回成功即可。
- 保存进度时建议同步更新 `mock_interview.updated_at`，使列表页排序反映最近练习时间。

**响应 data**：成功消息字符串即可。

---

## 4. 数据模型建议

### 4.1 表：`mock_interview`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK | 自增主键，对应 `mockInterviewId` |
| `user_id` | BIGINT | 所属用户 |
| `resume_id` | BIGINT | 关联简历 ID |
| `title` | VARCHAR(255) | 标题；若用户未传，可由后端根据简历生成，例如「{期望岗位} · 模拟面试」 |
| `status` | TINYINT / VARCHAR | `GENERATED`、`PRACTICING`、`COMPLETED` |
| `question_count` | INT | 题目数量，与问题表一致 |
| `practice_progress_current_question_id` | BIGINT | 当前练习到的题目 ID，可为空 |
| `practice_progress_answer_revealed` | TINYINT | 当前题目答案是否已展开：0/1 |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### 4.2 表：`mock_interview_question`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK | 自增主键，对应 `mockInterviewQuestionId` |
| `mock_interview_id` | BIGINT FK | 关联模拟面试 |
| `sort_order` | INT | 题目顺序，从 1 开始 |
| `question` | TEXT | 问题内容 |
| `reference_answer` | TEXT | 参考答案 |
| `answer_evaluation` | TEXT | 答题要点/评价维度 |
| `other_notes` | TEXT | 补充说明，可选 |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

---

## 5. AI 生成逻辑建议

### 5.1 输入

后端拿到 `resumeId` 后，可读取：

- 简历结构化数据：`ResumeParseDraftDto`，包含：
  - 基本信息：期望岗位、工作年限、求职状态、所在城市等
  - 工作经历：`works`（公司、岗位、职责、成果）
  - 项目经历：`projects`（项目名、角色、技术栈、职责、成果）
  - 教育背景：`educations`
  - 技能：`skills`
- 如结构化数据不足，可结合简历原始文本（OSS 文件或解析文本）。

### 5.2 Prompt 设计思路

建议生成 5 道题目，覆盖：

1. 自我介绍 / 个人动机
2. 项目/工作经历深挖（STAR 法则）
3. 技术/业务问题（基于技能栈与岗位）
4. 职业规划 / 稳定性
5. 反问 / 软技能

每道题输出：

- `question`：问题文本
- `referenceAnswer`：参考答案
- `answerEvaluation`：考察点与回答要点
- `otherNotes`：可选补充

### 5.3 失败处理

- AI 生成失败时返回非 0 `code` 与可读 `message`，前端会 `ElMessage.error` 提示。
- 建议对生成过程加超时控制，并在失败时回滚已创建数据，避免脏数据。

---

## 6. 状态机

```
GENERATED --(进入练习)--> PRACTICING --(完成练习)--> COMPLETED
```

- `GENERATED`：刚生成，尚未开始练习。
- `PRACTICING`：已开始练习，可能多次进入。
- `COMPLETED`：用户主动点击「完成练习」后进入，可再次进入练习（状态可保持 `COMPLETED`，也可回到 `PRACTICING`，前端都能正常展示）。

> 前端在详情页判断：若状态为 `GENERATED`，会自动重定向到练习页。

---

## 7. 环境变量与联调方式

前端通过环境变量切换真实后端 / 本地 mock：

```bash
# .env.development
VITE_MOCK_INTERVIEW_USE_API=false   # 走 localStorage 本地 mock
VITE_MOCK_INTERVIEW_USE_API=true    # 走真实后端 /mock-interview/*
```

联调步骤：

1. 后端实现上述 6 个接口。
2. 将 `.env.development` 中 `VITE_MOCK_INTERVIEW_USE_API` 设为 `true`。
3. 重启前端 dev server。
4. 访问导航栏「模拟面试」进行联调。

---

## 8. 注意事项

1. **题目顺序**：详情接口返回的 `questions` 必须按 `sortOrder` 升序，否则前端进度定位会错乱。
2. **权限隔离**：列表、详情、删除、更新等接口必须校验数据属于当前登录用户，避免越权。
3. **标题兜底**：`POST /mock-interview` 的 `title` 为可选；若为空，建议后端根据简历期望岗位生成默认标题。
4. **进度字段校验**：`PUT /mock-interview/{id}/progress` 中的 `currentQuestionId` 应校验属于该模拟面试。
5. **updated_at 刷新**：状态变更、保存进度时更新 `updated_at`，列表页按此字段倒序展示。
6. **与 interview 模块区分**：`mock-interview` 与 `interview` 是两套独立表与接口，不要复用。
7. **现有 localStorage mock**：`src/utils/mockInterviewLocalStore.ts` 中保留了前端离线演示逻辑，后端开发期间可作为参考，了解前端期望的数据结构与字段含义。

---

## 9. 前端类型速查

完整类型定义见 `src/api/mockInterviewTypes.ts`：

```ts
export type MockInterviewStatus = 'GENERATED' | 'PRACTICING' | 'COMPLETED'

export interface MockInterviewPracticeProgress {
  currentQuestionId: number
  answerRevealed: boolean
}

export interface MockInterviewQuestionVO {
  mockInterviewQuestionId: number
  mockInterviewId: number
  sortOrder: number
  question: string
  answerEvaluation: string | null
  referenceAnswer: string | null
  otherNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface MockInterviewListItemVO {
  mockInterviewId: number
  resumeId: number
  title: string
  questionCount: number
  status: MockInterviewStatus
  updatedAt: string
}

export interface MockInterviewVO extends MockInterviewListItemVO {
  practiceProgress: MockInterviewPracticeProgress | null
  questions: MockInterviewQuestionVO[]
}

export interface MockInterviewCreateRequest {
  resumeId: number
  title?: string
}

export interface MockInterviewCreateResultVO {
  mockInterviewId: number
}

export interface MockInterviewUpdateProgressRequest {
  currentQuestionId: number
  answerRevealed: boolean
}

export interface MockInterviewUpdateStatusRequest {
  status: MockInterviewStatus
}
```
