# 技术参考：模块详解

> 本文档是工程源码的逐模块深入说明，适合需要理解实现细节或进行二次开发的读者。
> 工程概述、快速开始和 CLI 参数请查阅 [README.md](./README.md)。

---

## 目录

1. [数据流总览](#数据流总览)
2. [main.ts — CLI 入口](#1-maints--cli-入口)
3. [llmRunner.ts — ReAct 引擎](#2-llmrunnerts--react-引擎)
4. [context.ts — 全局上下文单例](#3-contextts--全局上下文单例)
5. [bundle/document.ts — OKF 文档格式](#4-bundledocumentts--okf-文档格式)
6. [bundle/paths.ts — 路径工具](#5-bundlepathsts--路径工具)
7. [bundle/indexer.ts — 目录索引生成](#6-bundleindexerts--目录索引生成)
8. [sources/base.ts — Source 接口](#7-sourcesbasets--source-接口)
9. [sources/jsSyntax.ts — JS 知识域](#8-sourcesjssyntaxts--js-知识域)
10. [tools/sourceTools.ts — 数据查询工具](#9-toolssourcetoolsts--数据查询工具)
11. [tools/bundleTools.ts — 文档读写工具](#10-toolsbundletoolsts--文档读写工具)
12. [tools/webTools.ts — fetch_url 工具](#11-toolswebtoolsts--fetch_url-工具)
13. [web/fetcher.ts — HTTP 抓取器](#12-webfetcherts--http-抓取器)
14. [viewer/generator.ts — viz.html 生成器](#13-viewergeneratorts--vizhtml-生成器)
15. [prompts/ — 系统提示词](#14-prompts--系统提示词)

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
    ┌──── ReAct 循环（Pass 1） ──────────────────────────┐
    │  read_existing_doc  → fs.readFile  → null / 已有内容│
    │  read_concept_raw   → Source       → 元数据 JSON    │
    │  list_concepts      → Source       → 概念列表       │
    │  sample_rows        → Source       → 采样数据       │
    │  write_concept_doc  → fs.writeFile → .md 文件       │
    └───────────────────────────────────────────────────┘
           ↓
    bundles/**/*.md（结构化知识文档）
           ↓
    ┌──── ReAct 循环（Pass 2，可选）─────────────────────┐
    │  fetch_url          → http/https   → Page{markdown} │
    │  read_existing_doc  → fs.readFile  → 已有内容        │
    │  write_concept_doc  → fs.writeFile → 增量更新        │
    └───────────────────────────────────────────────────┘
           ↓
    regenerateIndexes → */index.md
    writeVizHtml      → viz.html（Cytoscape.js 图谱）
```

---

## 1. `main.ts` — CLI 入口

### 职责

整个工程的**启动和协调**文件。不包含业务逻辑，只负责：

1. 解析 CLI 参数（`commander`）
2. 初始化数据源和输出目录
3. 加载系统提示词
4. 循环处理 Pass 1：每个概念一个独立 `ToolCallRunner`
5. （可选）执行 Pass 2：Web Ingestion
6. 调用后处理：`regenerateIndexes` + `writeVizHtml`

### 关键设计：每个概念独立创建 Runner

```typescript
for (const ref of targets) {
  const runner = new ToolCallRunner(systemPrompt, tools, { maxRounds: 20 });
  await runner.run(`Enrich the JavaScript concept: ${ref.idStr}`);
}
```

`ToolCallRunner` 内部持有 `messages[]` 消息历史，不同概念必须隔离，否则后面的概念会受前面的内容干扰，生成质量下降。

### Web Pass 的 seed 收集逻辑

```typescript
// 优先用 --web-seed 手动指定
// 否则从所有概念的 .resource 字段自动收集
webSeeds = allConcepts
  .map(c => c.resource)
  .filter(Boolean);
```

---

## 2. `llmRunner.ts` — ReAct 引擎

### 职责

系统核心。实现 **ReAct（Reasoning + Acting）循环**，替代 Python 版中的 `google-adk`。约 150 行代码实现等价功能。

### ReAct 循环

```
用户消息
  │
  ▼
向 LLM 发送（携带 tools schema）
  │
  ▼
LLM 返回 tool_calls？
  ├── 是 → 执行 tool.fn(args) → 结果追加进 messages → 再请求 LLM → 循环
  └── 否 → 返回最终文字（结束，副作用：磁盘已写入 .md）
```

到达 `maxRounds` 上限时强制结束，防止死循环。

### `ToolDef` 接口

```typescript
interface ToolDef {
  name: string;                               // 工具名（LLM 用此名字调用）
  description: string;                        // 给 LLM 的功能描述
  parameters: Record<string, unknown>;        // JSON Schema 参数定义
  fn: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}
```

与 Python 版的差异：
- Python 版用 `inspect` 自动反射函数签名生成 schema
- TypeScript 版每个工具**显式声明 schema**，更清晰，类型安全，IDE 有提示

### LLM 提供商配置

```typescript
const PROVIDERS = {
  deepseek: { baseURL: "https://api.deepseek.com",   defaultModel: "deepseek-chat" },
  qwen:     { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
               defaultModel: "qwen-plus" },
  openai:   { baseURL: "https://api.openai.com/v1",  defaultModel: "gpt-4o-mini" },
  custom:   { baseURL: process.env.LLM_BASE_URL,     defaultModel: "default" },
};
```

`custom` 模式下 `LLM_BASE_URL` 必须设置，适合本地 Ollama 等场景。

---

## 3. `context.ts` — 全局上下文单例

### 职责

解决工程问题：**工具函数需要知道当前数据源和输出目录，但它们是以函数引用的形式传给 `ToolCallRunner` 的，无法在调用时注入参数。**

用模块级单例实现"依赖注入"：

```
main.ts 调用 setContext(source, bundleRoot)
                        ↓
     _ctx = { source: JSSyntaxSource, bundleRoot: "/path/to/bundles/js_syntax" }
                        ↓
工具函数运行时：getContext().source.listConcepts()
工具函数运行时：getContext().bundleRoot → 拼接文件路径
```

### Web Pass 扩展

Web Pass 期间额外暴露 `WebState`：

```typescript
interface WebState {
  allowedHosts: Set<string>;       // URL 白名单域名集合
  maxPages: number;                // 总抓取页数预算
  allowedPathPrefixes: string[];   // 允许的路径前缀
  deniedPathSubstrings: string[];  // 屏蔽的路径关键词
  maxDepth: number;                // 从 seed 出发的最大跳数
  visited: Set<string>;            // 已访问 URL 集合（去重）
  fetchedCount: number;            // 已消耗页数
  urlDepth: Map<string, number>;   // url → 距离 seed 的跳数
}
```

`try/finally` 保证 Web Pass 结束后无论成功/失败都执行 `clearWebState()`，状态不泄露。

---

## 4. `bundle/document.ts` — OKF 文档格式

### OKF 格式规范

```
--- ← frontmatter 开始标记（必须在第一行）
YAML 内容
--- ← frontmatter 结束标记
（空行，可选）
Markdown 正文
```

### 核心函数

| 函数 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `parseOKF(text)` | `.md` 字符串 | `{ frontmatter, body }` | 用 `js-yaml` 解析 frontmatter |
| `serializeOKF(doc)` | `{ frontmatter, body }` | `.md` 字符串 | 序列化回文件 |
| `validateOKF(doc)` | `OKFDocument` | `void` or throws | 缺 `type`/`title`/`description` 时抛错 |

### frontmatter 必填字段

```yaml
type: JS Syntax        # 必填，概念类型
title: Arrow Functions # 必填，显示标题
description: 一句话描述 # 必填，用于索引和搜索
```

其余字段（`tags`、`resource`、`timestamp`）为可选，`timestamp` 由 `write_concept_doc` 工具自动填充。

---

## 5. `bundle/paths.ts` — 路径工具

### 概念 ID 规范

- 格式：斜杠分隔的多段字符串，如 `"syntax/arrow_function"`
- 解析为：`["syntax", "arrow_function"]`
- 安全约束：每段只允许 `[A-Za-z0-9_.-]`（防止路径穿越注入）

### 核心函数

```typescript
// 字符串 → 数组
parseConceptId("syntax/arrow_function")
  → ["syntax", "arrow_function"]

// 数组 → 绝对文件路径
conceptIdToPath("/bundle/root", ["syntax", "arrow_function"])
  → "/bundle/root/syntax/arrow_function.md"

// 绝对文件路径 → 字符串 ID
pathToConceptId("/bundle/root", "/bundle/root/syntax/arrow_function.md")
  → "syntax/arrow_function"
```

---

## 6. `bundle/indexer.ts` — 目录索引生成

### 职责

扫描 bundle 目录，为每个子目录生成 `index.md`，并在根目录生成总索引。**纯 TypeScript，不调用 LLM**（与 Python 版不同，Python 版调用 Gemini 生成索引内容）。

### 输出示例

```markdown
# syntax Index

- [Arrow Functions](./arrow_function.md) — ES6 简洁函数语法，词法 this 绑定
- [async / await](./async_await.md) — 基于 Promise 的同步风格异步语法糖
```

通过读取 frontmatter 中的 `title` 和 `description` 提取信息，不解析正文。

---

## 7. `sources/base.ts` — Source 接口

### 职责

定义知识域数据源的抽象接口，让系统支持任意数据来源。

### 核心类型

```typescript
// 概念的轻量引用（列表/索引用）
interface ConceptRef {
  id: string[];           // ["syntax", "arrow_function"]
  idStr: string;          // "syntax/arrow_function"
  type: string;           // "JS Syntax"
  resource?: string;      // 权威文档 URL（MDN / 内部文档）
  hint: Record<string, unknown>;  // 关键词、依赖关系等元数据
}

// 数据源接口
interface Source {
  listConcepts(): ConceptRef[];
  readConcept(idStr: string): Record<string, unknown>;
  sampleRows?(idStr: string, n?: number): Record<string, unknown>[] | null;
  find(id: string[]): ConceptRef | undefined;
}
```

工具函数只依赖 `Source` 接口，更换数据源只需在 `main.ts` 替换 `new JSSyntaxSource()`。

---

## 8. `sources/jsSyntax.ts` — JS 知识域

### 职责

**"代码即数据源"**：将 JS 语法知识域的概念直接硬编码在 TypeScript 文件中，实现 `Source` 接口。无需任何外部数据库，是系统可运行的最简实现。

### 概念定义结构

```typescript
{
  id: ["syntax", "arrow_function"],
  type: "JS Syntax",
  title: "Arrow Functions",
  description: "ES6 简洁函数语法，词法 this 绑定，不能用作构造函数",
  hint: {
    keywords: ["=>", "lexical this", "implicit return"],
    related: ["builtin/promise", "patterns/closure"],
    mdn: "https://developer.mozilla.org/...",
    esVersion: "ES6",
  },
}
```

`sampleRows()` 返回 `null`（内存数据源无行数据），LLM 根据 keywords 和自身知识生成代码示例。

---

## 9. `tools/sourceTools.ts` — 数据查询工具

将数据源操作包装为 `ToolDef`，供 LLM 在 ReAct 循环中调用。

### `list_concepts`

- **触发时机**：LLM 需要了解所有可用概念，以在 Related Concepts 章节建立正确的交叉链接
- **执行**：`getContext().source.listConcepts()`
- **返回**：`[{ id, type, resource, hint }, ...]`

### `read_concept_raw`

- **触发时机**：LLM 需要某个概念的详细元数据（关键词、MDN URL 等）
- **执行**：`getContext().source.readConcept(concept_id)`
- **返回**：`{ id, type, title, description, keywords, related_concepts, mdn_url, es_version }`

### `sample_rows`

- **触发时机**：LLM 想查看来自数据源的实际数据行（如数据库表的示例数据）
- **执行**：`getContext().source.sampleRows(concept_id, n)`
- **返回**：`{ rows: [], note: "..." }`（内存数据源返回空数组）

---

## 10. `tools/bundleTools.ts` — 文档读写工具

### `read_existing_doc`

- **触发时机**：LLM 在写文档前先检查是否已有历史版本（支持增量更新）
- **返回**：`null`（首次生成）或完整文件字符串（已有版本）
- **意义**：LLM 看到 `null` 从零撰写；看到已有内容则在原基础上增补，保留已有好内容

### `write_concept_doc`

所有前面工具调用的最终目的地，真正产生输出的工具。

**参数**：
- `concept_id`：如 `"syntax/arrow_function"`
- `frontmatter`：JSON 对象（LLM 有时错误传字符串，此处自动修正）
- `body`：完整 Markdown 正文

**执行逻辑**：
1. 兼容处理：若 `frontmatter` 为字符串，自动 `JSON.parse()`
2. 自动填充 `timestamp`
3. **Pass 1 反退化保护**：新 body 长度 < 现有 body 70% 时拒绝写入，防止内容退化
4. **Pass 2 Citations 保护**：Web Pass 期间，新 body 的 Citations 数量不能少于现有数量，防止来源信息丢失
5. `fs.mkdirSync(dir, { recursive: true })` 自动创建中间目录
6. `serializeOKF()` 序列化并写入磁盘

**返回**：
- 成功：`{ status: "ok", path: "syntax/arrow_function.md", bytes: 6283 }`
- 拒绝：`{ status: "rejected", reason: "Body length decreased..." }`

---

## 11. `tools/webTools.ts` — fetch_url 工具

### 职责

Web Pass 专用工具，让 LLM 可以抓取外部网页，同时严格限制爬取范围。

### 6 层安全过滤（按顺序执行）

```
1. 协议检查      → 只允许 http / https，拒绝 file:// 等
2. allowed_hosts → 只能访问 seed URL 的域名（如 developer.mozilla.org）
3. path_prefixes → 只允许特定路径前缀（如 /en-US/docs/）
4. path_denies   → 屏蔽不需要的路径（/blog/, /community/, /newsletter/ 等）
5. visited 去重  → 同一 URL 只抓一次
6. 预算 + 深度   → max_pages 总量限制 + max_depth 跳数限制
```

### 深度追踪机制

LLM 只能通过 `fetch_url` 响应中 `links` 字段返回的 URL 发现新页面，无法凭空构造 URL（防止 hallucination 导致抓取任意地址）：

```
seed URL（depth=0）
  → fetch_url → Page.links → 新 URL（depth=1）
  → fetch_url → Page.links → 新 URL（depth=2，若 max_depth=1 则拒绝）
```

### 成功返回格式

```json
{
  "url": "https://developer.mozilla.org/...",
  "title": "Promise - JavaScript | MDN",
  "markdown": "# Promise\n\n...",
  "links": ["https://developer.mozilla.org/...", "..."],
  "fetched_count": 3,
  "max_pages_budget": 8,
  "depth": 0,
  "max_depth": 1
}
```

---

## 12. `web/fetcher.ts` — HTTP 抓取器

### 职责

底层 HTTP 客户端，对应 Python 版 `web/fetcher.py`。

使用 Node.js 内置的 `http`/`https` 模块（兼容 Node 16+，不依赖全局 `fetch`）。

### 处理流程

```
httpGet(url) → 处理重定向（最多 5 跳）
             → 检查 Content-Type（必须含 html）
             → extractTitle() → <title> 标签提取
             → turndown() → HTML 转 Markdown
             → extractLinks() → 提取所有绝对链接（去 fragment、去非 http）
             → truncate() → 截断到 40KB
```

### `Page` 返回类型

```typescript
interface Page {
  url: string;       // 最终 URL（可能经过重定向）
  title: string | null;
  markdown: string;  // 截断到 40KB
  links: string[];   // 页面内所有 http/https 链接
}
```

---

## 13. `viewer/generator.ts` — viz.html 生成器

### 处理流程

```
1. 递归扫描 bundleRoot 下所有 .md（排除 index.md）
2. 第一遍：解析 frontmatter → 节点（id, label, type, description）
3. 第二遍：解析 body 中的 [text](*.md) 相对链接 → 边（source → target）
4. 边去重：[conceptA, conceptB].sort().join("|||") 作 key，双向边合并为单向
5. 把节点 body（Markdown）内联转成 HTML
6. 生成包含所有数据的 Cytoscape.js 单文件 HTML
```

### 边去重

```typescript
const key = [conceptId, target].sort().join("|||");
if (edgeSet.has(key)) continue;
```

效果：原始双向引用产生 42 条边 → 去重后 24 条边（实际依关系数量而定）。

### 节点视觉编码

- **颜色**：按 `type` 字段（Topic=蓝 / Syntax=紫 / Builtin=绿 / Pattern=橙）
- **大小**：正比于入度（被引用越多 = 节点越大 = 枢纽概念）

### 内置 `mdToHtml()` 轻量转换器

viz.html 不引入外部 Markdown 库（保持单文件独立），内置简化转换：

| Markdown | HTML 输出 |
|---|---|
| ` ```js ` 代码块 | `<pre class="code-block" data-lang="js">` |
| `# ## ### ####` | `<h1> ~ <h4>` |
| `- item` | `<li>` → 自动包进 `<ul>` |
| `**粗体**` | `<strong>` |
| `` `行内代码` `` | `<code class="inline-code">` |
| `[文字](链接)` | `<span class="link-text">文字</span>`（不跳转） |

---

## 14. `prompts/` — 系统提示词

### `jsInstruction.md` — Pass 1 提示词

告诉 LLM 如何生成 OKF 文档：

1. **角色定义**：`You are a JavaScript knowledge documentation agent`
2. **工作流程**：工具调用顺序（read_existing → read_raw → list → write）
3. **Frontmatter 规范**：必填字段和 JSON 格式要求
4. **Body 结构**：7 个章节的顺序和内容要求
5. **交叉链接规则**：只引用 `list_concepts()` 返回的 id，使用相对路径
6. **风格要求**：中文解释 + 英文代码，具体实用

**关键规则的存在原因**：
- "Frontmatter MUST be a JSON object"→ 否则 LLM 时常传 YAML 字符串，导致 `write_concept_doc` 解析失败
- "call `write_concept_doc` exactly once"→ 否则 LLM 可能写两次或不写
- "only link to concepts from `list_concepts()`"→ 否则 LLM 会凭空捏造不存在的 concept id，生成无效链接

### `webIngestionInstruction.md` — Pass 2 提示词

告诉 LLM 如何进行 Web 增强：

1. **Seed 爬取工作流**（5 步）：从 seed URL 出发 → 抓取 → 识别相关内容 → 增量更新文档
2. **四门参考测试**（防止写进无关内容）：
   - Topic shape test：内容是否和概念主题匹配？
   - Not meta test：是否是内容页而不是目录页？
   - Citation test：是否有具体可引用的信息？
   - Reuse test：这个信息在现有文档中是否已经存在？
3. **Augmentation 规则**：frontmatter 完整保留，body heading 只增不减
