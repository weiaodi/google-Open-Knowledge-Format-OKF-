# okf-ts — OKF Knowledge Graph Generator (TypeScript)

TypeScript 版 OKF 知识图谱生成器。使用任意 OpenAI 兼容 LLM（DeepSeek / 通义千问 / OpenAI）自动生成结构化 Markdown 知识文档，并输出交互式知识图谱。

本工程是 [`okf/`](../okf/) Python 版的 TypeScript 重写，去除了 Google Cloud 依赖，只需一个 API Key 即可运行。

---

## Demo 效果

运行后在 `bundles/js_syntax/` 目录生成：

```
bundles/js_syntax/
├── topics/
│   ├── variables.md       # Variables & Scope
│   ├── functions.md       # Functions
│   └── async.md           # Asynchronous JavaScript
├── syntax/
│   ├── arrow_function.md  # Arrow Functions
│   ├── destructuring.md   # Destructuring Assignment
│   ├── template_literals.md
│   └── async_await.md     # async / await
├── builtin/
│   ├── promise.md         # Promise
│   └── array.md           # Array Methods
├── patterns/
│   └── closure.md         # Closure
├── */index.md             # 各目录自动生成的索引
├── index.md               # 总索引
└── viz.html               # 交互式知识图谱（浏览器打开）
```

每个 `.md` 文件是 OKF 格式文档（YAML frontmatter + Markdown body），包含：
概述 → Syntax → Examples → Key Points → Common Mistakes → Related Concepts → Citations

---

## 快速开始

### 1. 安装依赖

```bash
cd okf-ts
npm install
```

### 2. 设置 API Key

```bash
# DeepSeek（推荐，成本低）
export LLM_PROVIDER=deepseek
export LLM_API_KEY=sk-your-key-here

# 通义千问
export LLM_PROVIDER=qwen
export LLM_API_KEY=sk-your-key-here

# OpenAI
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-your-key-here
```

### 3. 运行

```bash
# 处理全部 10 个 JS 概念（约 3~5 分钟）
npx tsx src/main.ts

# 只处理指定概念（快速测试）
npx tsx src/main.ts --concept syntax/arrow_function --concept builtin/promise

# 只重新生成 viz.html（不调用 LLM）
npx tsx src/main.ts --visualize

# 指定自定义输出目录
npx tsx src/main.ts --bundle-dir ./my_bundles/js

# 查看帮助
npx tsx src/main.ts --help
```

### 4. 查看结果

macOS 会自动在浏览器打开 `viz.html`。也可以手动：

```bash
open bundles/js_syntax/viz.html
```

---

## 工程结构

```
okf-ts/
├── src/
│   ├── main.ts                  # CLI 入口
│   ├── llmRunner.ts             # LLM 驱动引擎（ReAct 循环）
│   ├── context.ts               # 全局上下文注入（单例）
│   │
│   ├── bundle/
│   │   ├── document.ts          # OKF 文档解析/序列化（YAML frontmatter）
│   │   ├── paths.ts             # concept_id ↔ 文件路径互转
│   │   └── indexer.ts           # 目录索引生成器（纯 TS，不调 LLM）
│   │
│   ├── sources/
│   │   ├── base.ts              # Source 接口 + ConceptRef 类型定义
│   │   └── jsSyntax.ts          # JS 语法知识域（内存数据源，10 个概念）
│   │
│   ├── tools/
│   │   ├── bundleTools.ts       # readExistingDoc / writeConceptDoc
│   │   └── sourceTools.ts       # listConcepts / readConceptRaw
│   │
│   ├── viewer/
│   │   └── generator.ts         # viz.html 生成器（Cytoscape.js 图谱）
│   │
│   └── prompts/
│       └── jsInstruction.md     # LLM 系统提示词（角色 + 输出格式）
│
├── bundles/                     # 生成的知识文档（git 可追踪）
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 核心模块说明

### `llmRunner.ts` — LLM 驱动引擎

替代 google-adk 的轻量实现。核心是 `ToolCallRunner` 类，实现 **ReAct 循环**：

```
用户消息
  │
  ▼
LLM 决策 ──→ tool_calls? ──是──→ 执行工具函数 ──→ 把结果追加进消息历史 ──┐
  │                                                                    │
  否                                                                   └─→ 继续
  │
  ▼
返回最终文字（副作用：writeConceptDoc 已写入磁盘 .md 文件）
```

工具通过 `ToolDef` 接口显式声明：

```typescript
interface ToolDef {
  name: string;                               // 工具名
  description: string;                        // 给 LLM 的描述
  parameters: Record<string, unknown>;        // JSON Schema 参数定义
  fn: (args) => unknown | Promise<unknown>;   // 实际执行逻辑
}
```

### `sources/base.ts` — Source 接口

知识域数据源的抽象接口，可插拔：

```typescript
interface Source {
  listConcepts(): ConceptRef[];                          // 列出所有概念
  readConcept(idStr: string): Record<string, unknown>;   // 读取概念元数据
  sampleRows?(idStr, n): Record<string, unknown>[] | null; // 采样数据（可选）
  find(id: string[]): ConceptRef | undefined;            // 查找概念
}
```

目前实现了 `JSSyntaxSource`（内存数据源），可扩展为 SQLite、REST API 等。

### `bundle/document.ts` — OKF 文档格式

每个生成的 `.md` 文件结构：

```markdown
---
type: JS Syntax                     # OKF 类型（必填）
title: Arrow Functions              # 显示标题（必填）
description: 简洁函数语法...         # 一句话描述（必填）
tags: [ES6, function, arrow]        # 关键词标签
resource: https://developer.mozilla.org/...  # 外部资源 URL
timestamp: '2026-07-06T09:30:00Z'   # 最后更新时间（自动填充）
---

## 概述
...

## Syntax
```javascript
...
```

## Examples
...

## Key Points
...

## Common Mistakes
...

## Related Concepts
- [Functions](../topics/functions.md)
...

## Citations
...
```

### `viewer/generator.ts` — 知识图谱可视化

扫描所有 `.md` 文件，解析 `[text](*.md)` 相对链接构建图谱，生成内联 Cytoscape.js HTML：
- 点击节点查看概念描述
- COSE 布局自动排列
- 按类型着色（蓝/紫/绿/橙）

---

## 环境变量参考

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `LLM_API_KEY` | ✅ | — | API 密钥 |
| `LLM_PROVIDER` | — | `deepseek` | `deepseek` / `qwen` / `openai` / `custom` |
| `LLM_MODEL` | — | 按 provider | 覆盖默认模型名 |
| `LLM_BASE_URL` | — | 按 provider | 覆盖默认 API 地址 |

`LLM_PROVIDER=custom` 时必须同时设置 `LLM_BASE_URL`，适合本地 Ollama 等场景。

---

## 与 Python 版对比

| 维度 | Python 版 (`okf/`) | TypeScript 版 (`okf-ts/`) |
|---|---|---|
| 工具 schema 生成 | `inspect` 自动反射 | 显式 `ToolDef` 对象声明 |
| LLM 框架 | `openai` SDK | `openai` npm 包（相同） |
| 异步执行 | `asyncio` 顺序循环 | `async/await`，可扩展为并发 |
| 文件操作 | `pathlib.Path` | Node.js `fs/path` |
| YAML | `pyyaml` | `js-yaml` |
| 类型安全 | 运行时类型检查 | 编译期类型检查（tsc --noEmit） |
| 前端集成 | 不适合 | 可直接接入 Next.js / Express |

两个版本生成的 `.md` 文件格式完全相同（OKF 标准），可互相混用。

---

## 扩展：添加新的知识域

### 方式一：继续扩展 `jsSyntax.ts`

在 `_CONCEPTS` 数组中添加新概念即可，无需修改其他代码。

### 方式二：实现新的 Source

```typescript
// src/sources/mySource.ts
import type { ConceptRef, Source } from "./base.js";

export class MySource implements Source {
  listConcepts(): ConceptRef[] { /* 从你的数据源读取 */ }
  readConcept(idStr: string) { /* 返回结构化元数据 */ }
  find(id: string[]) { /* 查找 */ }
}
```

然后在 `main.ts` 中替换 `new JSSyntaxSource()` 为 `new MySource()`。

---

## 依赖

| 包 | 用途 |
|---|---|
| `openai` | 调用 LLM API（OpenAI 兼容接口） |
| `js-yaml` | 解析/序列化 YAML frontmatter |
| `commander` | CLI 参数解析 |
| `tsx` | 直接运行 TypeScript（无需预编译） |
| `typescript` | 类型检查 |
