# Bilibili View2Text

B站视频字幕转结构化中文对话文章，基于 **LangChain** + **通义千问** 构建。

支持三种字幕提取方式、全流程流式输出、自定义生成要求、章节级 5W1H 结构化总结，并自动持久化视频/字幕/文章到本地。

---

## 功能特性

- **三种字幕提取方式**
  - **API 提取** — 调用 B站字幕接口，速度最快，支持填写登录 Cookie
  - **OCR 提取** — 下载视频后通过 tesseract.js 识别画面字幕，零成本
  - **大模型提取** — 下载视频后通过千问 VL 多模态模型识别，准确率最高
- **全链路流式体验** — 字幕提取逐行实时展示 + 文章逐 token 流式输出
- **自然语言生成要求** — 可选输入风格、受众、约束条件等，影响输出结果
- **5W1H 章节总结** — 点击章节获取 Who/What/When/Where/Why/How 结构化分析
- **本地持久化** — 下载的视频(.mp4)、提取的字幕(.txt)、生成的文章(.md) 自动保存到 `downloads/` 目录

---

## 技术栈

| 层级 | 技术 |
|------|------|
| AI 框架 | LangChain (@langchain/openai) |
| LLM | 通义千问 qwen-plus（文章生成） / qwen-vl-max（Vision 字幕识别） |
| API 接口 | DashScope OpenAI 兼容接口 |
| OCR | tesseract.js（中文 chi_sim） |
| 视频处理 | fluent-ffmpeg + 系统 ffmpeg |
| 后端 | Express.js + TypeScript (ESM) |
| 前端 | React 19 + Vite 8 |
| 流式通信 | Server-Sent Events (SSE) |

---

## 项目结构

```
blibli-view2text/
├── packages/
│   ├── server/                     # 后端服务
│   │   ├── src/
│   │   │   ├── env.ts             # 环境变量预加载（必须最先导入）
│   │   │   ├── index.ts            # Express 入口 (端口 3001)
│   │   │   ├── routes/api.ts       # API 路由 (SSE + REST)
│   │   │   ├── services/
│   │   │   │   ├── model.ts             # 模型工厂（千问 + DashScope）
│   │   │   │   ├── bilibili.ts          # B站字幕 API 封装
│   │   │   │   ├── bilibili-download.ts # 视频下载 + 本地保存
│   │   │   │   ├── ocr-subtitle.ts      # OCR 字幕提取 (tesseract.js)
│   │   │   │   ├── llm-subtitle.ts      # 大模型字幕提取 (千问 VL)
│   │   │   │   └── context-store.ts     # 生成上下文存储
│   │   │   └── tools/                   # LangChain Tool 定义
│   │   ├── downloads/              # 持久化产物（视频/字幕/文章）
│   │   └── .env                    # 环境变量配置
│   └── web/                        # 前端应用
│       └── src/
│           ├── App.tsx             # 主组件
│           ├── components/
│           │   ├── VideoInput.tsx   # 输入表单（三模式 + Cookie）
│           │   ├── ArticleView.tsx  # 字幕 + 文章流式展示
│           │   └── Section5W1H.tsx  # 5W1H 展示
│           └── hooks/
│               └── useSSE.ts       # SSE 流式通信 Hook
└── docs/                           # 需求文档
```

---

## 快速开始

### 前置要求

- **Node.js** >= 18
- **通义千问 API Key** — 前往 [阿里云百炼](https://bailian.console.aliyun.com/) 获取 DashScope API Key
- **ffmpeg**（可选，OCR/大模型提取模式需要）— macOS: `brew install ffmpeg`，Linux: `apt install ffmpeg`

### 1. 安装依赖

```bash
cd blibli-view2text
npm install
```

### 2. 配置环境变量

在 `packages/server/` 目录下创建 `.env` 文件：

```bash
# packages/server/.env
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx

# 可选：自定义模型名称（默认 qwen-plus / qwen-vl-max）
# QWEN_MODEL=qwen-plus
# QWEN_VL_MODEL=qwen-vl-max

# 可选：自定义模型接口地址（默认 DashScope 官方）
# MODEL_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 可选：B站登录 Cookie（也可在页面中填写）
BILIBILI_COOKIE=SESSDATA=xxxxx

# 可选：服务端口，默认 3001
PORT=3001
```

> 项目使用 `dotenv` 自动加载 `.env` 文件，无需手动 export。`.env` 已被 `.gitignore` 忽略，不会提交到仓库。

### 3. 启动服务

**同时启动前后端（推荐）：**

```bash
npm run dev
```

**或分别启动：**

```bash
# 终端 1 — 后端 (http://localhost:3001)
npm run dev:server

# 终端 2 — 前端 (http://localhost:5173)
npm run dev:web
```

### 4. 使用

1. 打开浏览器访问 `http://localhost:5173`
2. 选择字幕提取方式：
   - **API 提取** — 最快，部分视频需填写 Cookie
   - **OCR 提取** — 免费离线，耗时较长
   - **大模型提取** — 准确率最高，消耗 API 额度
3. 输入 Bilibili 视频链接（如 `https://www.bilibili.com/video/BVxxxxx`）
4. （可选）填写 B站登录 Cookie（用于获取需要登录才能访问的字幕）
5. （可选）展开「自定义生成要求」输入自然语言约束
6. 点击 **「生成文章」**，观察流式生成效果
7. 文章生成完成后，点击章节的 **[5W1H]** 按钮获取结构化总结

> 生成完成后，视频、字幕、文章会自动保存到 `packages/server/downloads/` 目录。

---

## 字幕提取方式对比

| 方式 | 原理 | 速度 | 准确率 | 成本 | 适用场景 |
|------|------|------|-------|------|----------|
| API 提取 | B站字幕接口 | 秒级 | 最高 | 免费 | 有 AI 字幕的视频 |
| OCR 提取 | ffmpeg 抽帧 + tesseract.js | 分钟级 | 一般 | 免费 | 无字幕接口、不想花 API 额度 |
| 大模型提取 | ffmpeg 抽帧 + 千问 VL | 中等 | 很高 | 消耗 API 额度 | 要求高准确率、花字/特效字幕 |

---

## 核心实现说明

### 1. 字幕提取流程

**API 模式：**
1. 解析 URL 中的 BV 号
2. 调用 `api.bilibili.com/x/web-interface/view` 获取 aid/cid
3. 调用 `api.bilibili.com/x/player/wbi/v2` 获取字幕列表
4. 下载字幕 JSON，拼接为纯文本

**OCR / 大模型模式：**
1. 通过 playurl API 获取视频直链，下载到本地
2. ffmpeg 抽帧（裁剪底部字幕区域）
3. 分别调用 tesseract.js 或千问 VL 多模态识别
4. 去重连续相似帧 → 拼接纯文本

### 2. SSE 流式通信

```typescript
// 服务端：逐行推送字幕 + 逐 token 推送文章
sendEvent("subtitle_token", { content: line });
sendEvent("token", { content: chunk.content });

// 前端：fetch + ReadableStream 实时解析
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  // 解析 SSE 事件...
}
```

### 3. 5W1H 章节总结

- 服务端自动按 `## 标题` 解析章节并存储到 ContextStore
- 前端仅发送 `{ taskId, sectionIndex }`，服务端基于已存储上下文完成总结
- 返回 Who/What/When/Where/Why/How 六维 JSON

### 4. 本地持久化

所有产物自动保存到 `packages/server/downloads/`：
- 视频文件：`{标题}_{BV号}.mp4`
- 字幕文件：`{标题}.txt`
- 文章文件：`{标题}_文章.md`

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/generate` | 生成文章（SSE 流式响应） |
| `POST` | `/api/5w1h` | 生成章节 5W1H 总结 |
| `GET` | `/api/sections/:taskId` | 获取章节列表 |
| `GET` | `/health` | 健康检查 |

### POST /api/generate

**请求体：**
```json
{
  "videoUrl": "https://www.bilibili.com/video/BVxxxxx",
  "method": "api",
  "cookie": "SESSDATA=xxxxx",
  "userRequirement": "面向技术从业者，使用专业语言风格"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| videoUrl | string | ✅ | B站视频链接 |
| method | string | ✖ | `api` / `ocr` / `llm`，默认 `api` |
| cookie | string | ✖ | B站登录 Cookie |
| userRequirement | string | ✖ | 自然语言生成要求 |

**SSE 事件流：**
```
event: status          → { stage, message }         状态更新
event: subtitle_start  → { title }                  字幕开始
event: subtitle_token  → { content }                字幕逐行流式
event: subtitle_end    → {}                         字幕结束
event: taskId          → { taskId }                 任务 ID
event: token           → { content }                文章逐 token 输出
event: complete        → { taskId, sections }       生成完成
event: error           → { message }                错误
```

---

## 工程亮点

1. **三模式字幕提取** — API / OCR / 大模型三种方式覆盖不同场景
2. **全链路流式** — 字幕逐行 + 文章逐 token 实时推送，用户零等待感知
3. **SSE 可靠性** — TCP NoDelay、心跳保活、正确的断连检测（`res.on('close')`）
4. **产物持久化** — 视频/字幕/文章自动保存到本地，方便离线回顾
5. **上下文隔离** — 5W1H 基于服务端存储，前端无需重传全文
6. **模块化架构** — 模型工厂、字幕提取、文章生成、上下文管理解耦为独立服务
7. **Monorepo** — 前后端统一管理，`npm run dev` 一键启动

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DASHSCOPE_API_KEY` | ✅ | 通义千问 DashScope API Key |
| `QWEN_MODEL` | ✖ | 文本模型名称，默认 `qwen-plus` |
| `QWEN_VL_MODEL` | ✖ | 视觉模型名称，默认 `qwen-vl-max` |
| `MODEL_BASE_URL` | ✖ | 模型接口地址，默认 DashScope 官方 |
| `BILIBILI_COOKIE` | ✖ | B站登录 Cookie（也可在页面填写） |
| `PORT` | ✖ | 服务端口，默认 `3001` |

---

## 云端部署

项目支持打包到服务器后解压即用（零网络依赖）：

```bash
# 本机打包（含 node_modules）
tar --exclude='.git' --exclude='downloads' -czf app.tar.gz .

# 上传到服务器
scp app.tar.gz user@your-server:/home/admin/

# 服务器上解压并启动
mkdir -p /home/admin/blibli-view2text
cd /home/admin/blibli-view2text
tar -xzf ../app.tar.gz
npm run dev
```

> 注意：需确保服务器防火墙放行 5173（前端）和 3001（后端）端口。

---

## License

MIT
