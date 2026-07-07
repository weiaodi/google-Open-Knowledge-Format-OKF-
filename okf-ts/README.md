# OKF Knowledge Graph Generator

> 把任意代码工程的文档，编译成 AI 可高效遍历的结构化知识图谱。

---

## 为什么需要这个工具

### 问题背景

当你的代码工程变大，会有一个越来越严重的问题：

**AI 能读到的上下文有限，但你的文档越来越多。**

你的工程可能有 200 个模块、50 个 API 文档、30 个架构设计文档——合计几十万 token，远超任何模型的上下文窗口。每次让 AI 帮你做一件事，它实际上只看到了知识库的一个碎片，不知道依赖链、不知道边界，给出半对不对的答案。

### 主流方案的局限

**向量数据库 RAG**：把文档切块、向量化，提问时找"最相似的 10 个 chunk"塞进上下文。

这个方案有一个根本问题：**它靠统计相似度猜测相关内容，而不是理解知识的依赖结构**。

比如你问"UserService 里的认证逻辑是如何工作的"，RAG 可能找到了描述 UserService 的 chunk，但 AuthMiddleware 和 TokenValidator 的文档用词不同，向量距离不近，所以没被检索进来——AI 拿着不完整的上下文，给出错误的回答。

### 本工具的做法

**核心思路**：在文档生成阶段，让 LLM 显式声明每个概念的依赖关系，而不是在查询阶段靠向量相似度猜。

```
向量 RAG：提问 → 相似度搜索 → 找到"最像"的 chunk → 拼接上下文（可能不完整）
本工具：生成时 → LLM 声明依赖 → 查询时图遍历 → 精确收集全部上下文
```

每篇文档里的 `Related Concepts` 章节，作用和代码里的 `import` 语句完全一样——不是说"这也有关"，而是说"不读这个就无法理解当前这篇"。

这样，AI 工作时可以从一篇文档出发，顺着显式声明的依赖链精确收集所需上下文，而不是大海捞针。

### 本工具 vs 向量 RAG 对比

| 维度 | 向量数据库 RAG | 本工具 (OKF) |
|---|---|---|
| **知识存储形态** | 原始文本切块（chunks） | 结构化 Markdown，有 schema，有显式关系 |
| **检索方式** | 向量相似度（余弦距离） | 图遍历 + 结构查询 |
| **关系表达** | 隐式（靠向量空间距离） | 显式（Related Concepts 是硬链接） |
| **知识边界** | 模糊（同一概念散落多个 chunk） | 清晰（一个概念一个文档，显式 ID）|
| **更新方式** | 重新嵌入整个知识库 | 增量更新单篇文档 |
| **可追溯性** | 无法知道为什么检索到这个 chunk | 来源、关系、引用全部可追溯 |
| **适合场景** | 大量自由格式文本（邮件、讨论记录）| 有清晰边界的模块/API 文档 |

---

## 工作原理：两步 Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ Pass 1 — 文档生成（Enrich Pass）                             │
│                                                             │
│  代码工程 / 知识域定义                                        │
│      ↓                                                      │
│  LLM 阅读元数据 → 生成结构化 OKF Markdown 文档               │
│      ↓                                                      │
│  bundles/ 目录：每个概念一个 .md 文件                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Pass 2 — Web 增强（Web Ingestion Pass）                      │
│                                                             │
│  读取文档中的 resource URL（MDN / 官方文档）                  │
│      ↓                                                      │
│  fetch_url 抓取页面 → LLM 增量更新文档                       │
│      ↓                                                      │
│  Citations 章节追加来源，现有内容不退化                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Post-processing — 索引 + 可视化                              │
│                                                             │
│  regenerateIndexes → */index.md                            │
│  writeVizHtml     → viz.html（Cytoscape.js 交互图谱）         │
└─────────────────────────────────────────────────────────────┘
```

---

## OKF 文档格式

每个生成的 `.md` 文件遵循 OKF（Open Knowledge Format）规范：

```markdown
---
type: JS Builtin                     # 概念类型（驱动图谱节点颜色）
title: Promise                       # 显示标题
description: 一句话摘要               # 直接用于索引页展示
resource: https://developer.mozilla.org/...  # 权威来源，Web Pass 的抓取起点
tags: [ES6, then, catch, Promise.all]        # 全文索引标签
timestamp: '2026-07-07T03:23:29Z'    # 最后更新时间（自动填充）
---

## 概述        ← 先说"是什么"和"解决什么问题"
## Syntax      ← 精确的语法格式，可直接 copy-paste
## Examples    ← 多场景可运行代码
## Key Points  ← 核心认知要点，防止常见误解
## Common Mistakes ← ✅/❌ 对比，防止写出 bug
## Related Concepts ← 依赖声明（驱动知识图谱的边）
## Citations   ← 来源 URL（Web Pass 自动追加）
```

**三层设计原则**：
- **Frontmatter** 服务工具（机器可读，驱动索引、图谱、过滤）
- **正文** 服务人类（可读性优先，层次清晰）
- **Related Concepts** 服务图谱（显式依赖声明，驱动边的生成）

---

## 快速开始

### 1. 安装依赖

```bash
cd okf-ts
npm install
```

### 2. 设置 API Key

```bash
# DeepSeek（推荐，成本低，效果好）
export LLM_PROVIDER=deepseek
export LLM_API_KEY=sk-your-key-here

# 通义千问
export LLM_PROVIDER=qwen
export LLM_API_KEY=sk-your-key-here

# OpenAI
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-your-key-here

# 本地 Ollama（custom 模式）
export LLM_PROVIDER=custom
export LLM_BASE_URL=http://localhost:11434/v1
export LLM_API_KEY=ollama
```

### 3. 运行

```bash
# 完整两步流程：Pass 1（生成文档）+ Pass 2（Web 增强）
npx tsx src/main.ts --web-pass

# 只跑 Pass 1（生成文档，不抓网页）
npx tsx src/main.ts

# 跳过 Pass 1，只跑 Web Pass（已有文档时增量更新）
npx tsx src/main.ts --skip-enrich --web-pass

# 只处理指定概念（快速测试）
npx tsx src/main.ts --concept syntax/arrow_function --concept builtin/promise

# 只重新生成 viz.html（不调用 LLM）
npx tsx src/main.ts --visualize

# 控制 Web Pass 爬取深度和页数上限
npx tsx src/main.ts --web-pass --web-max-pages 15 --web-max-depth 2

# 手动指定 Web Pass 的种子 URL
npx tsx src/main.ts --skip-enrich --web-pass --web-seed https://your-docs-url.com

# 查看完整帮助
npx tsx src/main.ts --help
```

### 4. 查看结果

```bash
# macOS 直接在浏览器打开知识图谱
open bundles/js_syntax/viz.html
```

---

## 运行输出示例

```
============================================================
OKF Knowledge Graph Generator — TypeScript Edition
============================================================
Pass 1: Enriching 4 concept(s) → bundles/js_syntax
[1/4] Processing: topics/async (JS Topic)
  [tool→] read_existing_doc → null（首次生成）
  [tool→] read_concept_raw  → { title, keywords, mdn_url, ... }
  [tool→] list_concepts     → 概念列表（用于建立交叉链接）
  [tool→] write_concept_doc → ✓ topics/async.md (9143 bytes)
  ✓ Done (1/4)
...
Pass 1 Completed: 4 succeeded, 0 failed (94.0s)

Pass 2: Web Ingestion
  Seeds: 4 | Max pages: 8 | Max depth: 1
  Allowed hosts: developer.mozilla.org
  [tool→] fetch_url → Asynchronous JavaScript（MDN）✓
  [tool→] fetch_url → Arrow functions（MDN）✓
  [tool→] fetch_url → Promise（MDN）✓
  [tool→] fetch_url → Using promises（MDN 子链接，自动发现）✓
  [tool→] write_concept_doc → builtin/promise.md 7.1KB → 9.9KB（增量更新）
  [tool→] write_concept_doc → references/async_function.md（LLM 新建独立文档）
Web Pass Completed.

[viz] Generated viz.html — 5 nodes, 7 edges
Done! Open: open bundles/js_syntax/viz.html
```

---

## CLI 参数完整参考

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--concept <id>` | 只处理指定概念（可重复）| 全部概念 |
| `--bundle-dir <path>` | 输出目录 | `bundles/js_syntax` |
| `--visualize` | 只重新生成 viz.html | — |
| `--web-pass` | 启用 Web Ingestion Pass | — |
| `--skip-enrich` | 跳过 Pass 1 | — |
| `--web-seed <url>` | 手动指定 seed URL（可重复）| 从概念 resource 自动收集 |
| `--web-max-pages <n>` | Web Pass 最大抓取页数 | `20` |
| `--web-max-depth <n>` | 从 seed 出发的最大跳深 | `2` |

## 环境变量参考

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `LLM_API_KEY` | ✅ | — | API 密钥 |
| `LLM_PROVIDER` | — | `deepseek` | `deepseek` / `qwen` / `openai` / `custom` |
| `LLM_MODEL` | — | 按 provider | 覆盖默认模型名 |
| `LLM_BASE_URL` | — | 按 provider | 覆盖默认 API 地址（custom 时必填）|

---

## 工程结构

```
okf-ts/
├── src/
│   ├── main.ts                  # CLI 入口：解析参数，串联 Pass 1 → Pass 2 → Post
│   ├── llmRunner.ts             # LLM 驱动引擎：ToolCallRunner（ReAct 循环）
│   ├── context.ts               # 全局上下文单例（数据源 + 输出目录 + Web 状态）
│   │
│   ├── bundle/
│   │   ├── document.ts          # OKF 文档解析/序列化（YAML frontmatter + Markdown）
│   │   ├── paths.ts             # concept_id ↔ 文件路径互转
│   │   └── indexer.ts           # 目录索引生成器（纯 TS，不调 LLM）
│   │
│   ├── sources/
│   │   ├── base.ts              # Source 接口 + ConceptRef 类型定义
│   │   └── jsSyntax.ts          # JS 语法知识域（内存数据源，4~10 个概念）
│   │
│   ├── tools/
│   │   ├── bundleTools.ts       # read_existing_doc / write_concept_doc
│   │   ├── sourceTools.ts       # list_concepts / read_concept_raw / sample_rows
│   │   └── webTools.ts          # fetch_url（Web Pass 专用，带 6 层安全过滤）
│   │
│   ├── web/
│   │   └── fetcher.ts           # HTTP 抓取 + HTML→Markdown + 链接提取
│   │
│   ├── viewer/
│   │   └── generator.ts         # viz.html 生成器（Cytoscape.js 知识图谱）
│   │
│   └── prompts/
│       ├── jsInstruction.md     # Pass 1 系统提示词
│       └── webIngestionInstruction.md  # Pass 2 系统提示词
│
├── bundles/                     # 生成的知识文档（可 git 追踪变化）
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 核心模块说明

### `llmRunner.ts` — ReAct 循环引擎

系统核心，实现 **Reasoning + Acting** 循环：

```
用户消息
  │
  ▼
向 LLM 发送（携带工具 schema）
  │
  ▼
LLM 返回 tool_calls？
  ├── 是 → 执行工具函数 → 结果追加进历史 → 再次请求 LLM → 循环
  └── 否 → 返回最终文字（副作用：磁盘上已写入 .md 文件）
```

工具通过 `ToolDef` 接口显式声明 schema：

```typescript
interface ToolDef {
  name: string;                               // 工具名（LLM 用此名字调用）
  description: string;                        // 给 LLM 的功能说明
  parameters: Record<string, unknown>;        // JSON Schema 参数定义
  fn: (args) => unknown | Promise<unknown>;   // 实际执行逻辑
}
```

每个概念独立创建 Runner 实例，消息历史不跨概念污染。

### `tools/webTools.ts` — fetch_url 安全边界

Web Pass 期间，LLM 通过 `fetch_url` 工具抓取外部页面，但需要防止失控。工具实现了 6 层过滤：

1. **协议检查**：只允许 http / https
2. **allowed_hosts 白名单**：只能访问 seed URL 的域名
3. **allowed_path_prefixes**：只允许特定路径前缀（如 `/en-US/docs/`）
4. **denied_path_substrings**：屏蔽不需要的路径（如 `/blog/`、`/community/`）
5. **visited 去重**：同一 URL 只抓一次
6. **预算 + 深度**：`max_pages` 总量限制 + `max_depth` 跳数限制

LLM 只能通过 `links` 字段返回的 URL 发现新页面，无法凭空构造 URL（防止 hallucination 导致抓取任意网址）。

### `bundle/document.ts` — OKF 文档格式

核心函数：

| 函数 | 作用 |
|---|---|
| `parseOKF(text)` | `.md` 字符串 → `{ frontmatter, body }` |
| `serializeOKF(doc)` | `{ frontmatter, body }` → `.md` 字符串 |
| `validateOKF(doc)` | 缺少必填字段时抛出错误 |

### `viewer/generator.ts` — 知识图谱可视化

扫描所有 `.md` 文件，解析 `[text](*.md)` 相对链接构建图谱，生成内联 Cytoscape.js HTML：

- **节点颜色**：按 `type` 字段着色（Topic / Syntax / Builtin / Pattern 各色）
- **节点大小**：正比于被引用次数（入度越高 = 枢纽概念）
- **点击交互**：高亮当前节点及其一跳邻居，右侧展开文档内容

---

## 如何接入自己的工程

### 方式一：修改 `jsSyntax.ts`

在 `_CONCEPTS` 数组中添加你工程的模块/API/服务概念：

```typescript
{
  id: ["services", "user_service"],
  type: "Service",
  title: "UserService",
  description: "用户身份认证与账户管理服务",
  hint: {
    keywords: ["authentication", "JWT", "session"],
    related: ["services/auth_middleware", "services/token_validator"],
    mdn: "https://your-internal-docs.com/services/user",
  },
}
```

### 方式二：实现新的 Source 接口

```typescript
// src/sources/myProjectSource.ts
import type { ConceptRef, Source } from "./base.js";

export class MyProjectSource implements Source {
  listConcepts(): ConceptRef[] {
    // 从你的数据源读取：SQLite、REST API、本地 JSON...
  }
  readConcept(idStr: string): Record<string, unknown> {
    // 返回概念的详细元数据
  }
  find(id: string[]): ConceptRef | undefined { /* ... */ }
}
```

在 `main.ts` 替换 `new JSSyntaxSource()` 为 `new MyProjectSource()` 即可，无需修改其他代码。

---

## 数据流总览

```
环境变量（LLM_API_KEY）
  + prompts/jsInstruction.md（系统提示词）
  + JSSyntaxSource（概念元数据）
         ↓
      main.ts
  对每个概念创建独立的 ToolCallRunner
         ↓
  ┌──── ReAct 循环（Pass 1） ────┐
  │  read_existing_doc → fs.readFile → null / 已有内容
  │  read_concept_raw  → Source.readConcept → 元数据 JSON
  │  list_concepts     → Source.listConcepts → 概念列表
  │  write_concept_doc → serializeOKF → fs.writeFile
  └──────────────────────────────┘
         ↓
  bundles/**/*.md（结构化知识文档）
         ↓
  ┌──── ReAct 循环（Pass 2，可选） ────┐
  │  fetch_url         → http/https → HTML → Markdown
  │  read_existing_doc → 读取已有文档
  │  write_concept_doc → 增量更新（Citations 只增不减）
  └────────────────────────────────────┘
         ↓
  regenerateIndexes → */index.md（各目录索引）
  writeVizHtml      → viz.html（交互式知识图谱）
```

---

## 依赖

| 包 | 用途 |
|---|---|
| `openai` | LLM API 调用（OpenAI 兼容接口，支持 DeepSeek / 通义 / OpenAI） |
| `js-yaml` | YAML frontmatter 解析/序列化 |
| `turndown` | HTML → Markdown 转换（Web Pass 用） |
| `commander` | CLI 参数解析 |
| `tsx` | 直接运行 TypeScript 源码（无需预编译） |
| `typescript` | 编译期类型检查 |

---

## 与 Python 版对比

本工程是 [`okf/`](../okf/) Python 版的 TypeScript 重写，去除了 Google Cloud 依赖，只需一个 API Key 即可运行。

| 维度 | Python 版 (`okf/`) | TypeScript 版（本工程）|
|---|---|---|
| 工具 schema 生成 | `inspect` 自动反射函数签名 | 显式 `ToolDef` 对象声明 |
| LLM 框架 | `google-adk` | 原生 `openai` npm 包 |
| 云依赖 | BigQuery + Google ADK | 无，只需 API Key |
| 异步执行 | `asyncio` 顺序循环 | `async/await`，可扩展为并发 |
| 类型安全 | 运行时检查 | 编译期 `tsc --noEmit` |
| 前端集成 | 不适合 | 可直接接入 Next.js / Express |

两个版本生成的 `.md` 文件格式完全相同（OKF 标准），输出文档可互相混用。
