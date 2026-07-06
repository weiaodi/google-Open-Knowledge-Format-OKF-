# Knowledge Catalog 本地化部署与使用说明

> 面向中国区用户的完整指南：使用 DeepSeek / 通义千问替代 Google Cloud，在本地运行 OKF 知识图谱生成流水线。

---

## 目录

0. [项目背景：这是什么、解决什么问题](#0-项目背景这是什么解决什么问题)
1. [原始项目整体架构](#1-原始项目整体架构)
2. [知识库的版本管理机制](#2-知识库的版本管理机制)
3. [本地化改造：新增文件说明](#3-本地化改造新增文件说明)
4. [完整执行流程详解（以 JS 语法知识库为例）](#4-完整执行流程详解)
5. [核心概念：OKF 文档格式 + 生成样例解析](#5-核心概念okf-文档格式)
6. [Python 脚本功能说明](#6-python-脚本功能说明)
7. _(已合并入第 6 章)_
8. [快速开始](#8-快速开始)
9. [扩展：如何创建自己的知识库](#9-扩展如何创建自己的知识库)
10. [配置参考](#10-配置参考)

---

## 0. 项目背景：这是什么、解决什么问题

### 它解决什么问题

大型技术团队普遍面临一个困境：**数据资产没有文档**。

- 数据仓库里有几百张表，只有写表的人知道每列是什么意思
- 新员工入职，要花几周才能搞清楚 `orders` 表和 `order_items` 表的关系
- 代码库里有几十个模块，没有任何说明哪些函数互相依赖
- 即使有文档，也早已过时，和真实代码/数据脱节

`knowledge-catalog` 的答案是：**让 AI 自动生成、维护这份文档**，并把它组织成一张可以浏览的知识图谱。

### 它的核心产出是什么

一个 **OKF Bundle（知识包）**：

```
bundles/js_syntax/
├── topics/
│   ├── variables.md          ← 一个"概念文档"
│   ├── functions.md
│   └── ...
├── syntax/
│   ├── arrow_function.md
│   └── ...
├── index.md                  ← 自动生成的目录
└── viz.html                  ← 交互式知识图谱（可在浏览器打开）
```

每个 `.md` 文件是一个**有结构的知识单元**（OKF Concept Document），文件之间通过 Markdown 链接相互引用，形成图谱。

### 和普通文档有什么区别

| 普通文档 | OKF Bundle |
|---|---|
| 人工编写，容易过时 | AI 从数据源自动生成，可随时重跑更新 |
| 平铺的文字 | YAML frontmatter + Markdown body，机器可解析 |
| 孤立的文件 | 概念间有显式链接，构成有向图 |
| 静态 | 可视化图谱支持交互探索 |
| 一次性 | 版本化存储，支持 Git 追踪变化 |

---

## 1. 原始项目整体架构

### 项目定位

`knowledge-catalog` 是 Google Cloud Platform 开源的一个 **AI 知识目录自动化工具**，核心场景是：从 **BigQuery 数据仓库** 读取表结构，用 **Gemini** 生成标准化文档，再汇聚成可视化的知识图谱。

### 代码组织

```
knowledge-catalog/
├── okf/                          ← 主包（Open Knowledge Format）
│   ├── src/reference_agent/      ← Agent 核心代码
│   │   ├── agent.py              ← google-adk Agent 定义（工具集组装）
│   │   ├── runner.py             ← 调用 Agent 的流程控制器
│   │   ├── cli.py                ← 命令行入口（原始）
│   │   ├── bundle/               ← OKF 文档格式库
│   │   │   ├── document.py       ← OKFDocument 类（解析/序列化 .md）
│   │   │   ├── index.py          ← index.md 自动生成器
│   │   │   ├── paths.py          ← concept_id ↔ 文件路径 互转
│   │   │   └── synthesizer.py    ← 用 LLM 生成目录描述（原始）
│   │   ├── sources/              ← 数据源抽象层
│   │   │   ├── base.py           ← Source 抽象基类
│   │   │   └── bigquery.py       ← BigQuery 数据源实现
│   │   ├── tools/                ← Agent 可调用的工具函数
│   │   │   ├── bundle_tools.py   ← read_existing_doc, write_concept_doc
│   │   │   ├── source_tools.py   ← list_concepts, read_concept_raw, sample_rows
│   │   │   ├── context.py        ← 全局上下文（数据源 + 输出路径注入）
│   │   │   └── web_tools.py      ← fetch_url（网页增强 pass）
│   │   ├── prompts/              ← LLM 系统提示词
│   │   │   ├── reference_instruction.md   ← BQ pass 主提示词
│   │   │   └── web_ingestion_instruction.md ← Web 增强 pass 提示词
│   │   └── viewer/               ← viz.html 可视化生成器
│   │       ├── generator.py      ← 扫描 bundle → 构图 → 渲染 HTML
│   │       ├── templates/viz.html ← HTML 模板（嵌 Cytoscape.js）
│   │       └── static/           ← CSS / JS 资源
│   └── bundles/                  ← AI 生成的知识库输出目录
└── README.md
```

### 原始工作流程（两个 Pass）

原始项目对每个数据源概念执行两轮处理：

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Pass 1：BQ Pass（元数据 Pass）                                          │
│                                                                         │
│  BigQuery ──► list_concepts() ──► 逐个概念                              │
│                                        │                               │
│                                        ▼                               │
│                              read_concept_raw() ──► LLM ──► write_doc  │
│                              sample_rows()                              │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Pass 2：Web Pass（外部资源增强 Pass）                                   │
│                                                                         │
│  读取 Pass 1 生成的文档                                                 │
│       │                                                                 │
│       ▼                                                                 │
│  提取 resource URL ──► fetch_url() ──► LLM ──► 增量更新文档             │
│  （如 BigQuery 官方文档、相关 GitHub 链接）                             │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              regenerate_indexes()
                              generate_visualization()
```

**Pass 1** 侧重数据结构本身：列名、类型、样本数据 → 生成详细的 Schema 文档。
**Pass 2** 侧重外部补充：抓取 URL 内容 → 补充使用场景、业务语义、最佳实践。

### 核心抽象：`Source` 基类

所有数据源必须实现以下三个方法：

```python
class Source(ABC):
    @abstractmethod
    def list_concepts(self) -> list[ConceptRef]:
        """返回该数据源下所有概念的列表（ID + 类型）"""

    @abstractmethod
    def read_concept(self, ref: ConceptRef) -> dict[str, Any]:
        """返回单个概念的结构化元数据（给 LLM 参考）"""

    def sample_rows(self, ref: ConceptRef, n: int = 3) -> list[dict[str, Any]]:
        """返回该概念的样本数据（可选，默认返回空列表）"""
```

这个抽象使得 BigQuery、SQLite、甚至代码定义的知识域都能无缝接入同一套 Agent 流水线。

### 核心抽象：`OKFDocument` 类

存储在磁盘的每一个 `.md` 文件，在代码里都是一个 `OKFDocument` 实例：

```python
@dataclass
class OKFDocument:
    frontmatter: dict[str, Any]  # YAML 头部，机器可解析
    body: str                    # Markdown 正文，人可阅读

    @classmethod
    def parse(cls, text: str) -> "OKFDocument":  # 解析 .md 文件
    def serialize(self) -> str:                  # 序列化回 .md 文件
    def validate(self) -> None:                  # 校验必填字段
```

必填的 frontmatter 字段：`type`、`title`、`description`、`timestamp`。

---

## 2. 知识库的版本管理机制

这是整个项目设计最精妙的地方之一。**知识库本身就是 Git 仓库**，`.md` 文件即版本单元。

### 2.1 文件级版本：`timestamp` 字段

每次 `write_concept_doc()` 写入文档时，会自动在 frontmatter 里记录写入时间：

```yaml
---
type: JS Syntax
title: Arrow Functions
description: 箭头函数是 ES2015 引入的简洁函数定义语法
timestamp: '2026-07-05T14:26:11+00:00'   ← 自动填充，每次重写都更新
---
```

这个时间戳让你可以一眼看出每个概念文档最后是什么时候被 AI 更新的。

### 2.2 增量更新：`read_existing_doc` 优先策略

Agent 遇到一个概念时，**第一个工具调用总是 `read_existing_doc()`**：

```
read_existing_doc("syntax/arrow_function")
    │
    ├── 返回 null  → 文档不存在，从头生成
    │
    └── 返回 {frontmatter, body}  → 文档已存在，在现有基础上增量改进
```

这意味着：
- **第一次运行**：从零生成所有文档
- **再次运行**：读取现有文档，LLM 只修改需要更新的部分，保留已有内容
- **局部更新**：可以只跑 `--concept syntax/arrow_function` 更新单个概念，不影响其他文档

### 2.3 防退化保护：Web Pass 写入守卫

在 Web Pass（增强 pass）里，`write_concept_doc` 有一道严格的保护逻辑：

```python
# bundle_tools.py 节选
if is_web_pass() and path.exists():
    existing = OKFDocument.parse(path.read_text())

    # 守卫 1：Schema 字段不能减少
    old_fields = _schema_field_names(existing.body)
    new_fields = _schema_field_names(body)
    missing = old_fields - new_fields
    if missing:
        return {"error": "Refusing to write: missing Schema fields ..."}

    # 守卫 2：Citations 条目数不能减少
    if citation_count(new) < citation_count(existing):
        return {"error": "Refusing to write: fewer Citations ..."}
```

这个机制保证了 **Pass 2 只能增加信息，不能删除 Pass 1 填充的内容**，避免 LLM "越改越差"的问题。

### 2.4 Git 版本控制（推荐工作流）

`bundles/` 目录就是一个标准的文件夹，可以直接纳入 Git 版本控制：

```bash
# 初始化知识库 Git 仓库
cd bundles/js_syntax
git init
git add .
git commit -m "feat: initial JS syntax knowledge graph (20 concepts, 94 edges)"

# 某次重跑更新后，查看哪些文档被更新了
git diff --name-only
# syntax/arrow_function.md
# builtin/promise.md

# 查看某个文档的修改历史
git log --oneline syntax/arrow_function.md

# 对比两个版本
git diff HEAD~1 syntax/arrow_function.md
```

**每次重跑 Agent** 相当于一次知识库的"版本升级"。由于文档是纯文本 Markdown，Git diff 能清晰地展示 AI 对文档做了哪些改动（新增了哪些 Key Points，补充了哪些 Examples 等）。

### 2.5 版本管理设计总结

| 机制 | 实现方式 | 保证了什么 |
|---|---|---|
| **时间戳** | frontmatter 里的 `timestamp` 字段 | 每个文档的最后更新时间可查 |
| **增量更新** | `read_existing_doc()` 优先读取现有内容 | 重跑不会覆盖已有信息 |
| **防退化守卫** | Web Pass 的 Schema/Citations 计数检查 | Pass 2 不能删除 Pass 1 的结果 |
| **Git 追踪** | bundles/ 目录纳入 Git | 任意历史版本可回溯，diff 可读 |
| **局部刷新** | `--concept` 参数指定单个概念 | 可以只更新特定文档，不影响整体 |

---

## 3. 本地化改造：新增文件说明

### 3.0 原始项目的问题

原始 `knowledge-catalog` 项目有三个硬性依赖，中国区用户均无法访问：

| 依赖 | 用途 | 问题 |
|---|---|---|
| `google-adk` | Agent 框架，驱动 LLM 调用工具 | 仅支持 Gemini 模型 |
| `google-cloud-bigquery` | 数据源，读取 BQ 表结构 | 需要 GCP 账号 + 认证 |
| `GEMINI_API_KEY` | LLM 推理 | aistudio.google.com 国内无法访问 |

### 3.0 改造后的架构

```
┌─────────────────────────────────────────────────────────────┐
│                    你的知识库生成流水线                        │
│                                                             │
│   数据源层               Agent 层              输出层        │
│  ┌──────────┐   元数据   ┌──────────────┐  写文件  ┌──────┐ │
│  │ 任意数据源│ ────────► │ ToolCallRunner│ ───────► │ OKF  │ │
│  │ SQLite   │           │ (llm_runner) │          │ .md  │ │
│  │ JS语法   │   工具调用  │              │          │ 文件 │ │
│  │ 自定义   │ ◄──────── │  DeepSeek /  │          └──────┘ │
│  └──────────┘           │  通义千问    │             │      │
│                         └──────────────┘             │      │
│                                                      ▼      │
│                                               ┌──────────┐  │
│                                               │ viz.html │  │
│                                               │ 知识图谱 │  │
│                                               └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**关键改造点**：
- 用 `openai` Python SDK（兼容所有国产 LLM）替代 `google-adk`
- 实现 `SQLiteSource` 替代 `BigQuerySource`
- 实现 `JSSyntaxSource` 示范如何用代码定义知识域
- 所有原有工具函数（bundle_tools、source_tools）**完全复用，零修改**

---

### 3.1 新增文件清单

```
okf/src/reference_agent/
├── llm_runner.py          ← ★ 核心：替代 google-adk 的 LLM 驱动引擎
├── local_runner.py        ← SQLite 数据库场景的运行器
├── local_main.py          ← SQLite 场景的 CLI 入口
├── js_main.py             ← JS 语法知识库场景的 CLI 入口
├── prompts/
│   └── js_instruction.md  ← JS 场景专用的 LLM 系统提示词
└── sources/
    ├── sqlite.py          ← SQLite 数据源（替代 BigQuery）
    └── js_syntax.py       ← JS 语法知识域定义
```

### 3.1 `llm_runner.py` — 核心引擎

**这是整个改造的心脏**，实现了一个轻量的 **ReAct（Reasoning + Acting）Agent 循环**。

原始项目用 `google-adk` 的 `Runner` 类来驱动 LLM 调用工具，本文件完全替代这个角色。

**核心类 `ToolCallRunner` 的工作原理**：

```
用户消息 ──► LLM（DeepSeek）──► 返回 tool_calls
                ▲                       │
                │                       ▼
           工具执行结果 ◄──── 查找并调用 Python 函数
                                        │
                              如果没有 tool_calls ──► 返回最终文本
```

**`_make_tool_schema()` 函数** 的作用：把普通 Python 函数自动转换成 OpenAI Function Calling 所需的 JSON Schema。例如：

```python
# 原始 Python 函数
def write_concept_doc(concept_id: str, frontmatter: dict[str, Any], body: str) -> dict:
    ...

# 自动转换成的 JSON Schema（发给 LLM）
{
  "type": "function",
  "function": {
    "name": "write_concept_doc",
    "description": "Write (or overwrite) the OKF markdown document...",
    "parameters": {
      "type": "object",
      "properties": {
        "concept_id": {"type": "string"},
        "frontmatter": {"type": "object", "description": "MUST be a JSON object..."},
        "body": {"type": "string"}
      },
      "required": ["concept_id", "frontmatter", "body"]
    }
  }
}
```

LLM 看到这个 schema 就知道有哪些工具可以调用，以及每个参数的类型。

**`_coerce_frontmatter()` 函数** 的作用：容错处理。DeepSeek 有时会把 `frontmatter` 传成 YAML 字符串而不是 JSON 对象，这个函数依次尝试 JSON 解析 → YAML 解析 → 手动按行解析，确保最终拿到一个 `dict`。

### 3.2 `sources/sqlite.py` — SQLite 数据源

**继承自 `Source` 抽象基类**，实现了三个方法：

| 方法 | 作用 | 返回内容示例 |
|---|---|---|
| `list_concepts()` | 列出数据库里所有"概念"（库 + 表） | `[datasets/demo, tables/users, tables/products, ...]` |
| `read_concept()` | 读取单个概念的结构化元数据 | 表的列名、类型、行数、索引 |
| `sample_rows()` | 采样前 N 行数据 | `[{"user_id": 1, "username": "alice", ...}]` |

LLM 通过调用工具函数（`read_concept_raw`、`sample_rows`）来获取这些信息，再据此生成文档。

### 3.3 `sources/js_syntax.py` — JS 语法知识域

**无需外部数据库**，直接在 Python 代码里定义知识域的"概念目录"：

```python
_CONCEPTS = [
    {
        "id": ("syntax", "arrow_function"),
        "type": "JS Syntax",
        "title": "Arrow Functions",
        "description": "简洁函数语法，词法 this 绑定",
        "hint": {
            "keywords": ["=>", "lexical this", "implicit return"],
            "related": ["topics/functions", "patterns/closure"],
            "mdn": "https://developer.mozilla.org/..."
        }
    },
    ...
]
```

`read_concept()` 返回这些元数据给 LLM，LLM 用这些作为"种子信息"，自主发挥生成完整文档。

**这说明 OKF Source 的本质**：任何能返回 `{id, type, metadata}` 列表的东西都能作为数据源，不一定是真实数据库。

### 3.4 `local_runner.py` — 本地运行器

对 `llm_runner.py` 的封装，提供更高层的 API：

```python
runner = LocalRunner(source=SQLiteSource("demo.db"), bundle_root="./bundles/demo")
runner.enrich_all()  # 处理所有概念
```

内部自动：
1. 初始化 `ToolCallRunner`（加载 BQ pass 工具集）
2. 按概念逐个调用 LLM
3. 如果有 web seeds，再跑 Web 增强 pass
4. 最后调用 `_regenerate_indexes_local()` 生成各级目录的 `index.md`

### 3.5 `prompts/js_instruction.md` — LLM 系统提示词

告诉 LLM **做什么、怎么做、输出什么格式**。关键部分：

```markdown
## Workflow
1. 调用 read_existing_doc(concept_id) — 检查是否已有文档
2. 调用 read_concept_raw(concept_id) — 获取元数据
3. 调用 list_concepts() — 了解其他概念以便交叉引用
4. 调用 write_concept_doc(...) — 写入最终文档

## Body Sections
1. 概述段落
2. ## Syntax — 代码语法示例
3. ## Examples — 2-4 个可运行示例
4. ## Key Points — 重要规则
5. ## Common Mistakes — 常见错误
6. ## Related Concepts — 关联概念链接
7. ## Citations — 引用来源
```

---

## 4. 完整执行流程详解

以生成 `syntax/arrow_function.md` 为例，追踪每一步发生了什么：

### Step 0：启动

```bash
PYTHONPATH=src .venv/bin/python -m reference_agent.js_main \
    --concept syntax/arrow_function
```

`js_main.py` 做了这些事：
1. 读取环境变量 `LLM_PROVIDER=deepseek`、`LLM_API_KEY=sk-xxx`
2. 创建 `JSSyntaxSource()` 实例（知识域定义）
3. 调用 `set_context(source, bundle_root)` — 把数据源和输出目录注入全局上下文
4. 加载 `js_instruction.md` 作为系统提示词
5. 为每个概念创建 `ToolCallRunner` 并调用 `run()`

### Step 1：LLM 收到任务

发给 DeepSeek 的消息：
```
[system]: You are a JavaScript knowledge documentation agent...
[user]:   Enrich the JavaScript concept with id: syntax/arrow_function
          Type: JS Syntax
          Write a comprehensive OKF document...
```

LLM 看到系统提示词里的工具列表，决定先调用工具收集信息。

### Step 2：LLM 调用工具 — Round 0

LLM 同时发出三个工具调用（并行）：

```
→ read_existing_doc("syntax/arrow_function")
→ read_concept_raw("syntax/arrow_function")  
→ list_concepts()
```

**`read_existing_doc`**：检查 `bundles/js_syntax/syntax/arrow_function.md` 是否已存在。第一次运行返回 `null`，说明需要从头生成（如果已有则返回现有内容，LLM 会在此基础上增量更新）。

**`read_concept_raw`**：返回 `JSSyntaxSource.read_concept()` 的结果：
```json
{
  "id": "syntax/arrow_function",
  "type": "JS Syntax",
  "title": "Arrow Functions",
  "description": "简洁函数语法，词法 this 绑定，不可用作构造函数",
  "keywords": ["=>", "lexical this", "concise body", "implicit return"],
  "related_concepts": ["topics/functions", "syntax/default_params", "patterns/closure"],
  "es_version": "ES2015 (ES6)",
  "mdn_url": "https://developer.mozilla.org/..."
}
```

**`list_concepts()`**：返回所有 20 个概念的 id 列表，让 LLM 知道可以链接哪些概念（避免发明不存在的链接）。

### Step 3：LLM 根据收集的信息写文档 — Round 1

LLM 拿到元数据后，组织好文档内容，调用最后一个工具：

```
→ write_concept_doc(
    concept_id = "syntax/arrow_function",
    frontmatter = {
      "type": "JS Syntax",
      "title": "Arrow Functions",
      "description": "箭头函数是 ES2015 引入的简洁函数定义语法...",
      "tags": ["=>", "lexical this", "ES6", "function"],
      "resource": "https://developer.mozilla.org/..."
    },
    body = "## 概述\n箭头函数（Arrow Function）...\n## Syntax\n```javascript\n...\n```\n..."
  )
```

**`write_concept_doc`** 在 `bundle_tools.py` 里（原始项目代码），它：
1. 验证 frontmatter 包含必填字段（type, title, description）
2. 自动填充 `timestamp`
3. 把内容序列化成标准 OKF Markdown 格式
4. 写入 `bundles/js_syntax/syntax/arrow_function.md`
5. 返回 `{"path": "syntax/arrow_function.md", "bytes": 6769}`

### Step 4：LLM 收到写入成功，结束

LLM 看到 `write_concept_doc` 返回了 `{"path": ..., "bytes": ...}`，说明文档写成功了，不再调用工具，直接返回一段确认文字，`ToolCallRunner.run()` 结束，进入下一个概念。

### Step 5：所有概念处理完后，生成 index

`_regenerate_indexes_local()` 扫描整个 bundle 目录，为每个子目录生成 `index.md`：

```markdown
# syntax

* [Arrow Functions](arrow_function.md) - 箭头函数是 ES2015 引入的简洁函数定义语法
* [async / await](async_await.md) - 基于 Promise 的语法糖
* [Class Syntax](class.md) - 基于原型的 class 语法糖
...
```

### Step 6：生成可视化 `viz.html`

`generate_visualization()` 做三件事：
1. **扫描**：递归读取所有 `.md` 文件，解析 frontmatter + body
2. **构图**：分析 body 里的 Markdown 链接（`[text](path.md)`），构建有向图
3. **渲染**：把图数据嵌入 HTML 模板（使用 Cytoscape.js），输出单文件 HTML

最终生成：**20 个节点，94 条关系边**的交互式知识图谱。

---

## 5. 核心概念：OKF 文档格式

每个生成的 `.md` 文件是一个 **OKF Concept Document**，格式如下：

```markdown
---
type: JS Syntax                          # 必填：概念类型
resource: https://developer.mozilla.org/... # 推荐：原始资源 URI
title: Arrow Functions                   # 推荐：显示名称
description: 箭头函数是 ES2015 引入的... # 推荐：一句话描述（出现在 index.md 里）
tags:                                    # 推荐：标签列表
- "=>"
- lexical this
- ES6
timestamp: '2026-07-05T14:26:11+00:00'  # 自动填充
---

## 概述
（正文内容...）

## Syntax
（语法说明...）

## Examples
（代码示例...）

## Related Concepts
- [Functions](../topics/functions.md)    ← 相对路径链接，viz.html 据此画边
- [Closure](../patterns/closure.md)

## Citations
- [MDN: Arrow Functions](https://...)
```

**关系边的原理**：viz.html 生成器扫描 body 里的所有 `[text](*.md)` 链接，每个指向另一个概念的链接就变成图中的一条有向边。这就是为什么 94 条边是自动产生的，而不是手动配置的。

### 5.2 生成文档的完整样例解析

以实际生成的 `syntax/arrow_function.md` 为例，逐段说明每块内容的来源：

```
┌────────────────────── frontmatter（YAML 头部）───────────────────────┐
│ ---                                                                  │
│ type: JS Syntax          ← 来自 js_syntax.py 里的 "type" 字段        │
│ resource: https://...    ← 来自 js_syntax.py 里的 "mdn" 字段         │
│ title: Arrow Functions   ← LLM 生成，参考元数据里的 title            │
│ description: 箭头函数是… ← LLM 生成，一句话概述（会出现在 index.md） │
│ tags:                    ← LLM 生成，参考 keywords 列表              │
│ - =>                                                                 │
│ - lexical this                                                       │
│ timestamp: '2026-07-05T14:30:22+00:00'  ← write_concept_doc 自动填充│
│ ---                                                                  │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────── body（Markdown 正文）──────────────────────────┐
│ ## 概述                                                              │
│   LLM 撰写的 2-4 句话总结，涵盖这个概念的核心特性和使用场景          │
│                                                                      │
│ ## Syntax                                                            │
│   代码块展示所有合法语法形式（0参数/1参数/多参数/简洁体/异步…）       │
│                                                                      │
│ ## Examples                                                          │
│   3-4 个完整可运行的代码示例，附有中文注释                           │
│   · 基础对比（传统函数 vs 箭头函数）                                 │
│   · 数组迭代应用（map/filter/reduce）                                │
│   · 词法 this 绑定场景（最关键用途）                                 │
│   · 常见陷阱（返回对象字面量需加括号）                               │
│                                                                      │
│ ## Key Points                                                        │
│   6 条核心规则的要点清单（词法 this、不能 new、没有 arguments…）      │
│                                                                      │
│ ## Common Mistakes                                                   │
│   3 个典型错误模式：❌ 错误写法 + ✅ 正确写法，带注释说明原因        │
│                                                                      │
│ ## Related Concepts                                                  │
│   指向其他概念的相对路径链接 ← 这些链接直接变成 viz.html 的关系边    │
│   - [Functions](../topics/functions.md)                              │
│   - [Closure](../patterns/closure.md)                               │
│   - [Async/Await](../syntax/async_await.md)                         │
│   · · ·（共 8 条链接）                                              │
│                                                                      │
│ ## Citations                                                         │
│   MDN 文档链接 + ECMAScript 规范链接                                 │
└──────────────────────────────────────────────────────────────────────┘
```

**frontmatter 是机器读的，body 是人读的**。两者分工明确：
- frontmatter 驱动 `index.md` 生成、`viz.html` 节点染色和标签筛选
- body 是文档的真正价值——可读的解释、可运行的代码、可追踪的引用

---

## 6. 新增 Python 文件详解：与原工程的对比

> 理解新增文件最好的方式是和原工程的对应文件**并排对比**，看清楚替换了什么、为什么要替换。

### 6.1 整体替换关系一览

```
原工程文件                         新增文件                     替换原因
─────────────────────────────────────────────────────────────────────────
agent.py          ──────────────► (无直接对应)                 ┐
runner.py         ──────────────► local_runner.py             ├ 替换整个
                                  llm_runner.py               │ google-adk
cli.py            ──────────────► js_main.py                  │ 驱动层
                                  local_main.py               ┘

sources/bigquery.py ────────────► sources/sqlite.py           替换数据源
                                  sources/js_syntax.py        （新增类型）

（tools/ bundle/ viewer/ 全部不变，一行未动）
```

---

### 6.2 `llm_runner.py` — 替换 `agent.py` + `runner.py`

#### 原工程怎么驱动 LLM

原工程用 Google 的 **`google-adk`** 框架（`agent.py` + `runner.py`）：

```python
# agent.py（原工程）
from google.adk import Agent
from google.adk.tools import FunctionTool

def build_bq_agent(model="gemini-flash-latest") -> Agent:
    return Agent(
        name="okf_bq_reference_agent",
        model=model,                          # ← 只支持 Gemini 模型名
        instruction=_load_prompt("reference_instruction.md"),
        tools=[
            FunctionTool(list_concepts),      # ← google-adk 专有的包装方式
            FunctionTool(read_concept_raw),
            FunctionTool(sample_rows),
            FunctionTool(read_existing_doc),
            FunctionTool(write_concept_doc),
        ],
    )

# runner.py（原工程）
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

class ReferenceRunner:
    def __init__(self, source, bundle_root, model="gemini-flash-latest", ...):
        self._bq_agent = build_bq_agent(model=model)
        self._bq_session_service = InMemorySessionService()    # ← google-adk 会话管理
        self._bq_runner = Runner(
            agent=self._bq_agent,
            app_name="reference_agent_bq",
            session_service=self._bq_session_service,
        )

    def enrich_concept(self, ref):
        session_id = f"enrich-{uuid.uuid4().hex[:12]}"
        self._bq_session_service.create_session_sync(...)     # ← google-adk 会话机制
        message = types.Content(role="user", parts=[types.Part(text=...)])  # ← Google 私有类型
        for event in self._bq_runner.run(...):                # ← google-adk event stream
            _log_event_parts(event, ...)
```

**问题**：`google.adk`、`google.genai`、`InMemorySessionService`、`FunctionTool` 全是 Google 私有包，只能配合 Gemini 使用，且国内无法访问 Gemini API。

#### `llm_runner.py` 怎么替换它

用标准 `openai` Python SDK 重新实现相同的逻辑：

```python
# llm_runner.py（新增）
from openai import OpenAI                                      # ← 标准 SDK，兼容所有国产 LLM

class ToolCallRunner:
    def __init__(self, system_prompt: str, tools: list[Callable]):
        self._client, self._model = _build_client()           # ← 读环境变量，支持 DeepSeek/Qwen
        self._tools = {fn.__name__: fn for fn in tools}
        self._schemas = [_make_tool_schema(fn) for fn in tools]  # ← 自动转 JSON Schema

    def run(self, user_message: str) -> str:
        messages = [{"role": "system", ...}, {"role": "user", ...}]
        for round_idx in range(self.MAX_ROUNDS):              # ← 简单循环代替 event stream
            response = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                tools=self._schemas,
                tool_choice="auto",
            )
            tool_calls = response.choices[0].message.tool_calls
            if not tool_calls:
                return response.choices[0].message.content    # ← 无工具调用即完成
            for tc in tool_calls:
                fn = self._tools[tc.function.name]
                result = fn(**json.loads(tc.function.arguments))  # ← 直接调用 Python 函数
                messages.append({"role": "tool", "content": json.dumps(result)})
```

**关键差异对比**：

| 维度 | 原工程 `runner.py` | 新增 `llm_runner.py` |
|---|---|---|
| LLM SDK | `google.adk` + `google.genai` | `openai`（标准，兼容所有） |
| 支持的模型 | 只有 Gemini | DeepSeek / Qwen / OpenAI / 任意兼容接口 |
| 工具注册方式 | `FunctionTool(fn)` 包装 | 直接传函数，自动提取签名生成 Schema |
| 会话管理 | `InMemorySessionService` | 简单 `messages` 列表（无状态） |
| 事件处理 | `for event in runner.run()` event stream | 简单 `for round in range(MAX_ROUNDS)` 循环 |
| 工具调用解析 | google-adk 内部处理 | 手动 `json.loads(tc.function.arguments)` |
| 国内可用 | ❌（需要 Gemini API Key，国内无法访问） | ✅（DeepSeek/Qwen 国内均可直接访问） |
| 额外容错 | 无 | `_coerce_frontmatter()`：自动修正 LLM 传错类型的参数 |

**一句话总结**：`llm_runner.py` 是把 google-adk 的 `Agent` + `Runner` + `SessionService` 这整套机制，用 100 行标准代码重新实现了一遍，功能等价但不依赖任何 Google 包。

---

### 6.3 `local_runner.py` — 替换 `runner.py` 中的 `ReferenceRunner`

#### 原工程 `ReferenceRunner` 做什么

```python
# runner.py（原工程）
class ReferenceRunner:
    def __init__(self, source, bundle_root, model="gemini-flash-latest",
                 web_seeds=None, web_max_pages=100, web_allowed_hosts=None,
                 web_allowed_path_prefixes=None, web_denied_path_substrings=None,
                 web_max_depth=2, verbose=False):
        # 初始化时就创建好 BQ Agent 和 Web Agent（各需要 google-adk）
        self._bq_agent = build_bq_agent(model=model)
        self._bq_runner = Runner(agent=self._bq_agent, ...)
        if web_seeds:
            self._web_agent = build_web_agent(model=model)
            self._web_runner = Runner(agent=self._web_agent, ...)

    def enrich_all(self, only=None) -> int:
        for ref in concepts:
            self.enrich_concept(ref)
        self.run_web_pass()
        regenerate_indexes(self.bundle_root, model=self.model)  # ← 用 Gemini 生成目录描述
        return count
```

注意最后一行：原工程的 `regenerate_indexes()` 还**额外调用了一次 Gemini** 来生成每个子目录的简要描述。

#### `local_runner.py` 怎么替换它

```python
# local_runner.py（新增）
class LocalRunner:
    def __init__(self, source, bundle_root, web_seeds=None, web_max_pages=20):
        # 不在初始化时创建 Runner，每个概念单独创建（隔离上下文）
        self._bq_tools = [list_concepts, read_concept_raw, sample_rows,
                          read_existing_doc, write_concept_doc]
        self._web_tools = [..., fetch_url]

    def enrich_concept(self, concept_id: str) -> None:
        runner = ToolCallRunner(                               # ← 用新的 ToolCallRunner
            system_prompt=_load_prompt("reference_instruction.md"),
            tools=self._bq_tools,
        )
        runner.run(f"Enrich the concept with id: {concept_id}")

    def enrich_all(self, only=None) -> int:
        for ref in concepts:
            self.enrich_concept(ref.id_str)
        self.run_web_pass()
        _regenerate_indexes_local(self.bundle_root)           # ← 纯 Python，不调用 LLM
        return count

def _regenerate_indexes_local(bundle_root):
    # 扫描目录，读 frontmatter 的 title/description，拼 Markdown 列表
    # 完全不依赖 LLM
    ...
```

**关键差异对比**：

| 维度 | 原工程 `ReferenceRunner` | 新增 `LocalRunner` |
|---|---|---|
| 依赖 | `google.adk.runners.Runner` | `llm_runner.ToolCallRunner`（自实现） |
| Agent 创建时机 | 初始化时全部创建（占内存） | 每个概念处理时动态创建 |
| 上下文隔离 | google-adk 用 Session ID 隔离 | 每次 `new ToolCallRunner()` 自然隔离 |
| index.md 生成 | `regenerate_indexes()` 额外调用 Gemini | `_regenerate_indexes_local()` 纯 Python，零 API 调用 |
| Web Pass 限制参数 | 支持 `allowed_path_prefixes`、`denied_path_substrings`、`max_depth` 等精细控制 | 简化版，只控制 `max_pages` |

---

### 6.4 `sources/sqlite.py` — 替换 `sources/bigquery.py`

#### 原工程 `BigQuerySource` 做什么

```python
# sources/bigquery.py（原工程）
from google.cloud import bigquery

class BigQuerySource(Source):
    def __init__(self, dataset: str, billing_project=None):
        self.client = bigquery.Client(project=billing_project)   # ← 需要 GCP 认证
        # dataset 必须是 "project.dataset" 格式

    def list_concepts(self):
        # 调用 BigQuery API 列出所有表
        for tbl in self.client.list_tables(self._dataset_ref):
            ...
        # 额外处理：自动识别分片表（table_20230101, table_20230102...）
        # 把同前缀的分片合并成一个 "table_*" 概念

    def read_concept(self, ref):
        tbl = self.client.get_table(...)                         # ← BigQuery API
        return {
            "num_rows": tbl.num_rows,
            "num_bytes": tbl.num_bytes,
            "time_partitioning": ...,
            "clustering_fields": ...,
            "schema": _schema_to_dict(tbl.schema),
        }

    def sample_rows(self, ref, n=5):
        row_iter = self.client.list_rows(table_ref, max_results=n)  # ← BigQuery API
        return [dict(r.items()) for r in row_iter]
```

**问题**：`google.cloud.bigquery` 需要 `GOOGLE_APPLICATION_CREDENTIALS` 环境变量认证，且数据存在 Google Cloud 上（不能用本地文件）。

#### `sources/sqlite.py` 怎么替换它

```python
# sources/sqlite.py（新增）
import sqlite3

class SQLiteSource(Source):
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)                           # ← 只需要本地文件路径

    def list_concepts(self):
        # 用标准 sqlite3 查询系统表
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        # 每张表 → 一个 ConceptRef（无分片识别，SQLite 一般不需要）

    def read_concept(self, ref):
        columns = conn.execute(
            f"PRAGMA table_info(`{table_name}`)"              # ← SQLite 内置命令
        ).fetchall()
        row_count = conn.execute(f"SELECT COUNT(*) FROM `{table_name}`").fetchone()[0]
        indexes = conn.execute(f"PRAGMA index_list(`{table_name}`)").fetchall()
        return {"schema": ..., "row_count": ..., "index_count": ...}

    def sample_rows(self, ref, n=5):
        rows = conn.execute(f"SELECT * FROM `{table_name}` LIMIT {n}").fetchall()
        return [dict(row) for row in rows]
```

**关键差异对比**：

| 维度 | 原工程 `BigQuerySource` | 新增 `SQLiteSource` |
|---|---|---|
| 依赖 | `google-cloud-bigquery`（需要 GCP 账号、API 认证） | Python 内置 `sqlite3`（零额外依赖） |
| 数据位置 | Google Cloud 云端 | 本地 `.db` 文件 |
| 认证方式 | `GOOGLE_APPLICATION_CREDENTIALS` 服务账号 | 无需认证 |
| 分片表处理 | ✅ 自动识别并合并（BigQuery 场景常见） | ❌ 不需要（SQLite 无此概念） |
| 额外元数据 | 分区字段、聚簇字段、存储大小（bytes） | 索引数量（通过 PRAGMA） |
| 视图/物化视图 | ✅ 特殊处理（用 SQL 查询代替直接读取） | ❌ 暂不支持 |

---

### 6.5 `sources/js_syntax.py` — 原工程没有对应文件（全新引入）

原工程只有 `BigQuerySource` 一种数据源，数据必须来自真实数据库。

`js_syntax.py` 演示了一种全新用法：**用代码本身作为知识域定义**，无需任何外部数据库。

```python
# sources/js_syntax.py（新增，无对应原工程文件）
_CONCEPTS = [
    {
        "id": ("syntax", "arrow_function"),     # ← 直接在代码里写好概念目录
        "type": "JS Syntax",
        "title": "Arrow Functions",
        "hint": {
            "keywords": ["=>", "lexical this"],
            "related": ["topics/functions"],    # ← 关系图的边来源
            "mdn": "https://developer.mozilla.org/...",
        }
    },
    # ... 20 个概念
]

class JSSyntaxSource(Source):
    def list_concepts(self):                    # ← 返回硬编码的列表，不查任何数据库
        return [ConceptRef(id=tuple(c["id"]), ...) for c in _CONCEPTS]

    def read_concept(self, ref):
        return {"keywords": ..., "related_concepts": ..., "es_version": ...}

    def sample_rows(self, ref, n=5):
        return None                              # ← JS 语法没有"数据行"，LLM 自己生成代码示例
```

**这说明了什么**：只要实现 `Source` 接口的三个方法，任何东西都能成为知识源——数据库、API 响应、代码注释、文档大纲，甚至是一个 JSON 文件。`js_syntax.py` 是这个思路最直接的演示。

---

### 6.6 `js_main.py` 和 `local_main.py` — 替换 `cli.py`

#### 原工程 `cli.py` 做什么

```python
# cli.py（原工程）
from reference_agent.sources.bigquery import BigQuerySource   # ← 硬绑定 BigQuery
from reference_agent.runner import ReferenceRunner            # ← 硬绑定 google-adk

def main():
    # 只有 bq 一种数据源可选
    if args.source == "bq":
        source = BigQuerySource(dataset=args.dataset,
                                billing_project=args.billing_project)
    runner = ReferenceRunner(
        source=source,
        model=args.model,                                      # ← 必须是 Gemini 模型名
        web_seeds=..., web_max_pages=..., ...
    )
    runner.enrich_all()
```

原工程的 `cli.py` 只支持一个 `enrich` 子命令，且数据源只有 `--source bq` 一种选项。

#### 新增的两个入口做什么

```
cli.py（原工程）               js_main.py（新增）            local_main.py（新增）
─────────────────────         ──────────────────────         ──────────────────────────
--source bq                   （无需指定数据源，               --db path/to.db
--dataset project.dataset      固定用 JSSyntaxSource）        （或自动创建 demo.db）
--billing-project xxx
--model gemini-flash-latest   （固定用环境变量 LLM_PROVIDER）  （固定用环境变量 LLM_PROVIDER）
--web-seed URL                （不支持 web pass，JS            --no-web 可跳过 web pass
--web-allowed-host HOST        语法不需要）
--web-max-depth 2
--web-allowed-path-prefix /
--web-denied-path-substring /login
```

**两个新入口都做了 `cli.py` 没有的一件事**：

`local_main.py` 内置了 `_ensure_demo_db()` 函数，**无需任何外部准备就能运行**。一行命令完成：创建数据库 → 读表结构 → 调 LLM → 生成文档 → 展示图谱。原工程没有这个，必须先有 BigQuery 数据集才能跑。

---

### 6.7 哪些原工程文件完全没动

以下文件**一行代码都没有修改**，直接复用：

| 文件 | 作用 | 为什么可以不改 |
|---|---|---|
| `tools/bundle_tools.py` | `read_existing_doc`、`write_concept_doc` | 只操作本地文件系统，无 LLM/Cloud 依赖 |
| `tools/source_tools.py` | `list_concepts`、`read_concept_raw`、`sample_rows` | 只调用 `Source` 接口，接口不变则不需改 |
| `tools/context.py` | 全局 context 注入 | 与 LLM 无关，纯 Python 数据结构 |
| `tools/web_tools.py` | `fetch_url` | 只用 `requests`/`markdownify`，无 Google 依赖 |
| `bundle/document.py` | `OKFDocument` 解析/序列化 | 纯文件格式处理 |
| `bundle/index.py` | `regenerate_indexes`（原版） | 原版依赖 Gemini，但我们用了新的简化版代替 |
| `bundle/paths.py` | concept_id ↔ 文件路径转换 | 纯字符串/路径操作 |
| `viewer/generator.py` | viz.html 生成 | 只读 `.md` 文件，无 LLM 依赖 |
| `sources/base.py` | `Source` 抽象基类 | 接口定义，不需要改 |

**结论**：改造只涉及最外面的两层（LLM 驱动层 + 数据源层），中间的工具函数层和文件格式层完全透明，这也是整个 OKF 架构设计最合理的地方。

---

## 8. 快速开始

### 环境准备

```bash
# 克隆项目
git clone https://github.com/GoogleCloudPlatform/knowledge-catalog.git
cd knowledge-catalog/okf

# 安装 Python 3.13（macOS）
brew install python@3.13

# 创建虚拟环境
/opt/homebrew/bin/python3.13 -m venv .venv

# 安装依赖（不需要 google-adk 和 google-cloud-bigquery）
.venv/bin/pip install openai pyyaml pydantic markdownify pytest
```

### 配置 API Key

```bash
# DeepSeek（推荐，国内可直接注册：https://platform.deepseek.com）
export LLM_PROVIDER=deepseek
export LLM_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# 或 通义千问（https://dashscope.console.aliyun.com）
export LLM_PROVIDER=qwen
export LLM_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 跑 JS 语法知识库（本 Demo）

```bash
cd knowledge-catalog/okf

# 跑全部 20 个概念（约 5-10 分钟）
PYTHONPATH=src .venv/bin/python -m reference_agent.js_main --visualize

# 只跑指定概念（测试用）
PYTHONPATH=src .venv/bin/python -m reference_agent.js_main \
    --concept syntax/arrow_function \
    --concept builtin/promise \
    --visualize

# 输出在 bundles/js_syntax/viz.html
open bundles/js_syntax/viz.html
```

### 跑 SQLite 数据库知识库

```bash
# 使用内置 demo 数据库（自动创建包含 5 张电商表的 SQLite）
PYTHONPATH=src .venv/bin/python -m reference_agent.local_main --visualize

# 使用自己的 SQLite 数据库
PYTHONPATH=src .venv/bin/python -m reference_agent.local_main \
    --db /path/to/your.db \
    --out ./bundles/my_project \
    --visualize
```

---

## 9. 扩展：如何创建自己的知识库

### 方式 A：用自己的 SQLite 数据库

直接指定 `--db` 参数，Agent 会自动分析所有表结构并生成文档：

```bash
PYTHONPATH=src .venv/bin/python -m reference_agent.local_main \
    --db ~/myapp/database.db \
    --out ./bundles/myapp \
    --visualize
```

### 方式 B：用代码定义新的知识域

参照 `sources/js_syntax.py`，新建一个 Source 类：

```python
# sources/my_domain.py
from reference_agent.sources.base import ConceptRef, Source

_CONCEPTS = [
    {
        "id": ("category", "concept_name"),
        "type": "My Type",
        "title": "概念标题",
        "description": "一句话描述",
        "hint": {
            "keywords": ["关键词1", "关键词2"],
            "related": ["category/other_concept"],
        }
    },
    ...
]

class MyDomainSource(Source):
    name = "my_domain"
    
    def list_concepts(self):
        return [ConceptRef(id=tuple(c["id"]), type=c["type"], hint=c["hint"]) for c in _CONCEPTS]
    
    def read_concept(self, ref):
        # 返回给 LLM 参考的元数据
        for c in _CONCEPTS:
            if tuple(c["id"]) == ref.id:
                return {"id": ref.id_str, **c["hint"]}
        return {}
```

然后写一个专属的提示词（参照 `prompts/js_instruction.md`）和 main 脚本（参照 `js_main.py`），就能为任何领域自动生成知识图谱。

---

## 10. 配置参考

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `LLM_PROVIDER` | 否 | `deepseek` | 模型提供商：`deepseek` / `qwen` / `openai` / `custom` |
| `LLM_API_KEY` | **是** | — | API Key |
| `LLM_MODEL` | 否 | 各提供商默认 | 指定模型名称，如 `deepseek-reasoner` |
| `LLM_BASE_URL` | 否 | 各提供商默认 | 自定义 API 地址（`LLM_PROVIDER=custom` 时必填） |

### 各提供商默认配置

| 提供商 | 默认模型 | API 地址 | 注册地址 |
|---|---|---|---|
| DeepSeek | `deepseek-chat` | `https://api.deepseek.com` | https://platform.deepseek.com |
| 通义千问 | `qwen-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | https://dashscope.console.aliyun.com |
| OpenAI | `gpt-4o-mini` | `https://api.openai.com/v1` | https://platform.openai.com |

### CLI 参数

**`js_main.py`**（JS 语法知识库）：

```
--concept    只处理指定概念（可重复），如 --concept syntax/arrow_function
--out        输出目录（默认 ./bundles/js_syntax）
--visualize  生成 viz.html 并自动打开
-v           详细日志（显示每轮 tool call）
```

**`local_main.py`**（SQLite 知识库）：

```
--db         SQLite 数据库路径（不填则自动创建 demo.db）
--concept    只处理指定概念（可重复）
--out        输出目录（默认 ./bundles/local_demo）
--visualize  生成 viz.html 并自动打开
-v           详细日志
```

---

## 附：文件结构总览

```
okf/
├── src/reference_agent/
│   ├── llm_runner.py          ← 新增：OpenAI-compatible LLM 驱动引擎
│   ├── local_runner.py        ← 新增：SQLite 场景 Runner
│   ├── local_main.py          ← 新增：SQLite CLI 入口
│   ├── js_main.py             ← 新增：JS 知识库 CLI 入口
│   ├── agent.py               ← 原始：google-adk Agent（未改动）
│   ├── runner.py              ← 原始：google-adk Runner（未改动）
│   ├── cli.py                 ← 原始：原始 CLI（未改动）
│   ├── prompts/
│   │   ├── js_instruction.md  ← 新增：JS 场景系统提示词
│   │   ├── reference_instruction.md   ← 原始：BQ 场景提示词
│   │   └── web_ingestion_instruction.md ← 原始：Web 爬取提示词
│   ├── sources/
│   │   ├── base.py            ← 原始：Source 抽象基类（未改动）
│   │   ├── bigquery.py        ← 原始：BigQuery 数据源（未改动）
│   │   ├── sqlite.py          ← 新增：SQLite 数据源
│   │   └── js_syntax.py       ← 新增：JS 语法知识域定义
│   ├── tools/                 ← 原始：工具函数（全部未改动）
│   │   ├── bundle_tools.py    ← read_existing_doc, write_concept_doc
│   │   ├── source_tools.py    ← list_concepts, read_concept_raw, sample_rows
│   │   ├── context.py         ← 全局上下文（数据源 + 输出路径）
│   │   └── web_tools.py       ← fetch_url
│   └── viewer/                ← 原始：viz.html 生成器（未改动）
│
├── bundles/
│   ├── js_syntax/             ← 新生成：JS 语法知识图谱
│   │   ├── topics/            ← 5 个顶层主题文档
│   │   ├── syntax/            ← 9 个具体语法文档
│   │   ├── builtin/           ← 3 个内置对象文档
│   │   ├── patterns/          ← 3 个模式文档
│   │   └── viz.html           ← 20 节点 94 边的交互式知识图谱
│   └── local_demo/            ← 新生成：SQLite 电商数据库知识图谱
│
├── LOCAL_SETUP.md             ← 本文档
└── pyproject.toml             ← Python 包配置
```
