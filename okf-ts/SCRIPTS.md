# okf-ts 脚本文件说明文档

本文档详细说明 `okf-ts/src/` 目录下每个 TypeScript 文件的职责、输入/输出、核心逻辑和设计决策。

---

## 文件总览

```
src/
├── main.ts                   ← CLI 入口，串联整个流程
├── llmRunner.ts              ← LLM 驱动引擎（ReAct 循环核心）
├── context.ts                ← 全局上下文单例（依赖注入）
│
├── bundle/
│   ├── document.ts           ← OKF 文档格式（解析/序列化）
│   ├── paths.ts              ← concept_id ↔ 文件路径互转
│   └── indexer.ts            ← 目录索引生成（纯 TS，不调 LLM）
│
├── sources/
│   ├── base.ts               ← Source 接口 + ConceptRef 类型
│   └── jsSyntax.ts           ← JS 语法知识域（内存数据源）
│
├── tools/
│   ├── bundleTools.ts        ← readExistingDoc / writeConceptDoc 工具
│   └── sourceTools.ts        ← listConcepts / readConceptRaw 工具
│
├── viewer/
│   └── generator.ts          ← viz.html 知识图谱生成器
│
└── prompts/
    └── jsInstruction.md      ← LLM 系统提示词
```

---

## 1. `main.ts` — CLI 入口

### 职责

整个工程的**启动和协调**文件。它不包含任何业务逻辑，只负责：

1. 解析命令行参数
2. 初始化数据源和输出目录
3. 加载系统提示词
4. 循环处理每个概念（每个概念创建一个独立的 `ToolCallRunner`）
5. 调用后处理：生成索引 + 生成 viz.html

### 输入

| 来源 | 内容 |
|---|---|
| 命令行参数 | `--concept` / `--bundle-dir` / `--visualize` |
| 环境变量 | `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` |
| 文件系统 | `prompts/jsInstruction.md`（系统提示词） |

### 输出

| 产物 | 说明 |
|---|---|
| `bundles/js_syntax/**/*.md` | LLM 生成的知识文档（由 `writeConceptDoc` 写入） |
| `bundles/js_syntax/*/index.md` | 各子目录索引 |
| `bundles/js_syntax/viz.html` | 交互式知识图谱 |

### 关键代码逻辑

```typescript
// 每个概念独立创建 Runner，避免上下文污染
for (const ref of targets) {
  const runner = new ToolCallRunner(systemPrompt, tools, { maxRounds: 20 });
  const userMessage = `Enrich the JavaScript concept with id: ${ref.idStr}\n...`;
  await runner.run(userMessage);
}
```

**为什么每个概念创建新的 Runner？**
因为 `ToolCallRunner` 内部持有消息历史（`messages[]`），不同概念之间的历史不应该混在一起，否则后面的概念会受前面概念的内容干扰，导致生成质量下降。

---

## 2. `llmRunner.ts` — LLM 驱动引擎

### 职责

这是整个系统的**核心引擎**，替代了 Python 版中的 `google-adk`。实现了 **ReAct（Reasoning + Acting）循环**：

```
用户消息
  │
  ▼
向 LLM 发送消息（携带工具 schema）
  │
  ▼
LLM 返回 tool_calls？
  ├── 是 → 执行工具函数 → 把结果追加进历史 → 再次请求 LLM → 循环
  └── 否 → 返回最终文字（结束）
```

### 输入

- `systemPrompt`：系统提示词（从 `prompts/jsInstruction.md` 读取）
- `tools`：`ToolDef[]` 工具列表（4 个工具函数）
- `userMessage`：任务描述字符串

### 输出

- **返回值**：LLM 最后一轮的确认文字（通常可忽略）
- **副作用**：`writeConceptDoc` 工具被调用，在磁盘上写入 `.md` 文件

### `ToolDef` 接口

```typescript
interface ToolDef {
  name: string;                                   // 工具名（LLM 用此名字调用）
  description: string;                            // 给 LLM 的功能描述
  parameters: Record<string, unknown>;            // JSON Schema 参数定义
  fn: (args) => unknown | Promise<unknown>;       // 实际执行逻辑
}
```

**与 Python 版的差异**：
- Python 版用 `inspect` 自动反射函数签名生成 schema
- TypeScript 版每个工具**显式声明 schema**，更清晰且类型安全
- Python 版用 `google.adk.Agent` + `Runner` + `InMemorySessionService` 三个类
- TypeScript 版只有一个 `ToolCallRunner` 类，约 100 行代码实现等价功能

### 提供商配置表

```typescript
const PROVIDERS = {
  deepseek: { baseURL: "https://api.deepseek.com", defaultModel: "deepseek-chat" },
  qwen:     { baseURL: "https://dashscope...",      defaultModel: "qwen-plus" },
  openai:   { baseURL: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
};
```

通过 `LLM_BASE_URL` 可以覆盖为本地 Ollama 等任何兼容接口。

---

## 3. `context.ts` — 全局上下文单例

### 职责

解决一个工程问题：**工具函数（`bundleTools.ts` / `sourceTools.ts`）需要知道当前的数据源和输出目录，但不应该把这些信息作为参数层层传递。**

通过模块级单例实现"依赖注入"：

```
main.ts 调用 setContext(source, bundleRoot)
                        ↓
     _ctx = { source: JSSyntaxSource, bundleRoot: "/path/to/bundles/js_syntax" }
                        ↓
工具函数调用 getContext().source.listConcepts()
工具函数调用 getContext().bundleRoot → 拼接文件路径
```

### 接口

```typescript
setContext(source: Source, bundleRoot: string): void  // main.ts 启动时调用一次
getContext(): ToolContext                               // 工具函数运行时调用
```

### 为什么用全局单例而不是参数传递？

工具函数是以**函数引用**的形式传给 `ToolCallRunner` 的：

```typescript
const tools = [listConceptsTool, readConceptRawTool, ...];
```

`ToolCallRunner` 在执行工具时只调用 `tool.fn(args)`，无法注入额外的上下文参数。全局单例是最简洁的解法。

---

## 4. `bundle/document.ts` — OKF 文档格式

### 职责

定义 OKF（Open Knowledge Format）文档的**解析和序列化**逻辑。

### OKF 文档格式

```markdown
---
type: JS Syntax              ← 必填，概念类型
title: Arrow Functions       ← 必填，显示标题
description: 一句话描述       ← 必填
tags: [ES6, function]        ← 可选，关键词标签
resource: https://...        ← 可选，外部资源 URL
timestamp: '2026-07-06T...'  ← 自动填充，最后更新时间
---

## 正文内容                   ← Markdown 格式
```

### 核心函数

| 函数 | 输入 | 输出 |
|---|---|---|
| `parseOKF(text)` | `.md` 文件字符串 | `{ frontmatter, body }` |
| `serializeOKF(doc)` | `{ frontmatter, body }` | `.md` 文件字符串 |
| `validateOKF(doc)` | `OKFDocument` | 缺少必填字段时抛出错误 |

### 解析逻辑

```
--- ← 标记 frontmatter 开始
frontmatter YAML
--- ← 标记 frontmatter 结束
空行
Markdown 正文
```

用 `js-yaml` 解析 frontmatter，正文直接作为字符串保留。

---

## 5. `bundle/paths.ts` — 路径工具

### 职责

负责 `concept_id`（字符串）与文件系统路径之间的互转。

### 概念 ID 规范

- 格式：斜杠分隔的多段字符串
- 示例：`"syntax/arrow_function"` → `["syntax", "arrow_function"]`
- 字符限制：每段只允许 `[A-Za-z0-9_.-]`（防止路径注入）

### 核心函数

```typescript
// "syntax/arrow_function" → ["syntax", "arrow_function"]
parseConceptId(idStr: string): string[]

// ["syntax", "arrow_function"] → "/bundle/root/syntax/arrow_function.md"
conceptIdToPath(bundleRoot: string, id: string[]): string

// "/bundle/root/syntax/arrow_function.md" → "syntax/arrow_function"
pathToConceptId(bundleRoot: string, filePath: string): string
```

---

## 6. `bundle/indexer.ts` — 目录索引生成

### 职责

扫描 bundle 目录，为每个子目录生成 `index.md`，列出该目录下所有概念的标题和描述链接。同时在根目录生成总索引。

### 特点

- **纯 TypeScript，不调用 LLM**（原 Python 版的 `regenerate_indexes` 需要调用 Gemini）
- 通过读取已生成文档的 frontmatter 提取标题和描述

### 输出示例

```markdown
# syntax Index

- [Arrow Functions](./arrow_function.md) — ES6 简洁函数语法，词法 this 绑定
- [Destructuring Assignment](./destructuring.md) — 解构赋值：从数组或对象中提取值
```

---

## 7. `sources/base.ts` — Source 接口定义

### 职责

定义知识域数据源的**抽象接口**，让系统可以接入任何数据来源（内存、SQLite、REST API 等）而无需修改工具函数。

### 核心类型

```typescript
// 一个概念的轻量引用（元数据）
interface ConceptRef {
  id: string[];          // ["syntax", "arrow_function"]
  idStr: string;         // "syntax/arrow_function"
  type: string;          // "JS Syntax"
  resource?: string;     // MDN URL
  hint: Record<...>;     // 额外元数据（关键词、ES版本等）
}

// 数据源接口
interface Source {
  listConcepts(): ConceptRef[];                          // 列出所有概念
  readConcept(idStr: string): Record<string, unknown>;   // 读取元数据
  sampleRows?(idStr, n): ... | null;                    // 采样数据（可选）
  find(id: string[]): ConceptRef | undefined;            // 按 id 查找
}
```

### 设计原则

工具函数（`listConceptsTool`、`readConceptRawTool`）只依赖 `Source` 接口，不依赖任何具体实现。更换数据源只需在 `main.ts` 替换 `new JSSyntaxSource()`。

---

## 8. `sources/jsSyntax.ts` — JS 语法知识域

### 职责

**"代码即数据源"**：将 JS 语法知识域的 10 个概念直接硬编码在 TypeScript 文件中，实现 `Source` 接口。

不依赖任何外部数据库或文件，是系统可运行的最简实现。

### 10 个概念

| 分类 | ID | 标题 |
|---|---|---|
| topics | `topics/variables` | Variables & Scope |
| topics | `topics/functions` | Functions |
| topics | `topics/async` | Asynchronous JavaScript |
| syntax | `syntax/arrow_function` | Arrow Functions |
| syntax | `syntax/destructuring` | Destructuring Assignment |
| syntax | `syntax/template_literals` | Template Literals |
| syntax | `syntax/async_await` | async / await |
| builtin | `builtin/promise` | Promise |
| builtin | `builtin/array` | Array Methods |
| patterns | `patterns/closure` | Closure |

### 每个概念的 hint 字段

```typescript
hint: {
  keywords: ["=>", "lexical this"],       // 关键词（LLM 生成文档时使用）
  related: ["topics/functions"],           // 相关概念 id（用于交叉引用）
  mdn: "https://developer.mozilla.org/...", // MDN 链接
  esVersion: "ES6",                        // 引入的 ES 版本
}
```

### `sampleRows()` 返回 `null`

内存数据源没有行数据，LLM 根据 hint 和自身知识自行生成代码示例。

---

## 9. `tools/sourceTools.ts` — 数据查询工具

### 职责

将数据源操作包装成 `ToolDef` 格式，供 LLM 调用。

### 工具列表

#### `list_concepts`

- **触发时机**：LLM 需要了解所有可用概念以建立交叉引用时调用
- **执行逻辑**：`getContext().source.listConcepts()` → 返回 10 个概念的元数据列表
- **返回格式**：`[{ id, type, resource, hint }, ...]`

#### `read_concept_raw`

- **触发时机**：LLM 需要获取某个概念的详细元数据（关键词、MDN URL 等）时调用
- **执行逻辑**：`getContext().source.readConcept(concept_id)`
- **返回格式**：`{ id, type, title, description, keywords, related_concepts, mdn_url, es_version }`

### 工具函数的"传送门"机制

```
LLM 决定调用 list_concepts()
    ↓
OpenAI SDK 返回 tool_calls: [{ function: { name: "list_concepts", arguments: "{}" } }]
    ↓
ToolCallRunner 找到 listConceptsTool.fn，执行它
    ↓
fn() 调用 getContext().source.listConcepts()
    ↓
结果 JSON.stringify 后追加进消息历史
    ↓
LLM 看到结果，继续下一步
```

---

## 10. `tools/bundleTools.ts` — 文档读写工具

### 职责

将 bundle 目录的文件操作包装成 `ToolDef` 格式，供 LLM 调用。这两个工具是**真正产生输出**的工具。

### 工具列表

#### `read_existing_doc`

- **触发时机**：LLM 在写文档前先检查是否已有历史版本（增量更新模式）
- **执行逻辑**：
  1. 计算文件路径：`bundleRoot + concept_id + ".md"`
  2. 文件存在 → 返回完整文件内容字符串
  3. 文件不存在 → 返回 `null`
- **意义**：LLM 看到 `null` 就知道要从零撰写；看到已有内容就可以在原基础上增补，保留已有的好内容

#### `write_concept_doc`

这是**最重要的工具**，所有前面的工具调用都是为了给这个工具提供正确的参数。

- **触发时机**：LLM 完成文档撰写，准备写入磁盘
- **参数**：
  - `concept_id`：如 `"syntax/arrow_function"`
  - `frontmatter`：JSON object（LLM 有时会错误地传字符串，此处自动修正）
  - `body`：完整的 Markdown 正文
- **执行逻辑**：
  1. 兼容处理：若 `frontmatter` 被传成字符串，自动 `JSON.parse()`
  2. 自动填充 `timestamp`（`new Date().toISOString()`）
  3. **反退化保护**：新 body 长度 < 现有 body 的 70% 时拒绝写入，防止内容退化
  4. `fs.mkdirSync(dir, { recursive: true })` 自动创建中间目录
  5. `serializeOKF()` 序列化为 YAML frontmatter + Markdown 正文
  6. `fs.writeFileSync()` 写入磁盘
- **返回格式**：`{ status: "ok", path: "syntax/arrow_function.md", bytes: 6283 }`

---

## 11. `viewer/generator.ts` — viz.html 生成器

### 职责

扫描 bundle 目录所有已生成的 `.md` 文件，构建知识图谱数据，生成可在浏览器直接打开的交互式 HTML 文件。

### 处理流程

```
1. 递归扫描 bundleRoot 下所有 .md（排除 index.md）
2. 第一遍：解析每个文件的 frontmatter → 生成节点（id, label, type, description, body）
3. 第二遍：解析每个文件 body 中的 [text](*.md) 相对链接 → 生成边
4. 边去重：同一对节点只保留一条边（source/target 排序后拼 key）
5. 把节点的 Markdown body 转成 HTML（内联 mdToHtml 函数）
6. 生成内联 Cytoscape.js HTML（所有数据嵌入 <script> 标签）
```

### 边去重逻辑

原始数据中每个节点的 Related Concepts 都会互相引用，导致双向边。去重后只保留一条：

```typescript
const key = [conceptId, target].sort().join("|||");
if (edgeSet.has(key)) continue;  // 跳过重复边
edgeSet.add(key);
edges.push({ source: conceptId, target });
```

效果：42 条原始边 → 24 条去重后边

### 节点点击交互

点击节点时，右侧展开文档面板，同时：
- 当前节点高亮（加粗边框）
- 相邻节点和连线高亮（蓝色）
- 非相邻节点变暗（透明度 25%）

这让用户能快速看清某个概念的直接关联。

### `mdToHtml()` 内联 Markdown 转换器

viz.html 不引入外部 Markdown 库（保持单文件独立），内置轻量转换：

| Markdown 语法 | 转换结果 |
|---|---|
| ` ```javascript ` ... ` ``` ` | `<pre class="code-block" data-lang="javascript">` |
| `# ## ### ####` | `<h1> ~ <h4>` |
| `- item` | `<li>` → 自动包进 `<ul>` |
| `**粗体**` | `<strong>` |
| `` `行内代码` `` | `<code class="inline-code">` |
| `[文字](链接)` | `<span class="link-text">文字</span>`（不跳转，保持单页） |

---

## 12. `prompts/jsInstruction.md` — 系统提示词

### 职责

这是发给 LLM 的**角色说明书**，决定 LLM 生成文档的格式和质量。

### 内容结构

1. **角色定义**：`You are a JavaScript knowledge documentation agent`
2. **工作流程**：明确指定调用工具的顺序（read_existing → read_raw → list → write）
3. **Frontmatter 规范**：说明必填字段、示例 JSON
4. **Body 结构**：7 个章节的顺序和内容要求（概述、Syntax、Examples 等）
5. **交叉链接规则**：只引用 `list_concepts()` 返回的 id，使用相对路径
6. **风格要求**：中文解释 + 英文代码，具体实用不填充废话

### 为什么提示词很重要？

提示词决定了 LLM 在没有明确指令时的默认行为。例如：

- 没有"Frontmatter MUST be a JSON object"这条规则，LLM 会时常把 frontmatter 传成 YAML 字符串，导致 `write_concept_doc` 失败
- 没有指定"call `write_concept_doc` exactly once"，LLM 可能写两次或不写
- 没有交叉链接规则，LLM 会凭空捏造不存在的 concept id

---

## 数据流总结

```
环境变量（LLM_API_KEY）
  + prompts/jsInstruction.md（系统提示词）
  + JSSyntaxSource（10 个概念元数据）
           ↓
        main.ts
    对每个概念创建
  ToolCallRunner.run(userMessage)
           ↓
    ┌──── ReAct 循环 ────┐
    │                    │
    │  LLM 决策          │
    │  ↓                 │
    │  tool_calls?       │
    │  ├─ read_existing_doc  → fs.readFile → null / 已有内容
    │  ├─ read_concept_raw   → JSSyntaxSource.readConcept → 元数据 JSON
    │  ├─ list_concepts      → JSSyntaxSource.listConcepts → 概念列表
    │  └─ write_concept_doc  → serializeOKF → fs.writeFile
    │                    │
    └────────────────────┘
           ↓
  bundles/js_syntax/**/*.md（10 个知识文档）
           ↓
    regenerateIndexes()     → */index.md（各目录索引）
    writeVizHtml()          → viz.html（交互式图谱）
```
