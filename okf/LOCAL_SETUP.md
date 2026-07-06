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

## 6. Python 脚本功能说明

这一节把每个新增 Python 文件的"它做了什么"讲清楚，不涉及内部实现细节。

### 6.1 `llm_runner.py` — LLM 驱动引擎

**职责**：连接 LLM API，驱动工具调用循环，直到任务完成。

**它做的事**：
1. 读取环境变量（`LLM_PROVIDER` / `LLM_API_KEY`）决定连接哪个 API
2. 把传入的 Python 函数列表自动转成 OpenAI Function Calling 格式的 JSON Schema
3. 开始循环：发消息 → 等 LLM 回复 → 如果有 tool_calls 就执行对应 Python 函数 → 把结果反馈给 LLM → 重复
4. 直到 LLM 不再调用工具，把最终文字回复返回给调用方
5. 有容错处理：如果 LLM 把 `frontmatter` 传成字符串而非 JSON 对象，自动解析修正

**关键限制**：
- `MAX_ROUNDS = 40`：最多循环 40 轮，防止 LLM 陷入死循环
- 超过 40 轮后强制停止，返回空字符串并记录警告日志

**支持的提供商**：

| 环境变量值 | 连接地址 | 默认模型 |
|---|---|---|
| `deepseek` | `api.deepseek.com` | `deepseek-chat` |
| `qwen` | `dashscope.aliyuncs.com` | `qwen-plus` |
| `openai` | `api.openai.com` | `gpt-4o-mini` |
| `custom` | 由 `LLM_BASE_URL` 指定 | 由 `LLM_MODEL` 指定 |

---

### 6.2 `sources/js_syntax.py` — JS 语法知识域定义

**职责**：扮演"数据源"角色，告诉 Agent"这个知识库里有哪 20 个概念，每个概念的基本信息是什么"。

**它做的事**：
1. 在文件顶部用一个 Python 列表（`_CONCEPTS`）定义 20 个 JS 概念，每条记录包含：
   - `id`：路径元组，如 `("syntax", "arrow_function")`，决定最终写到哪个文件
   - `type`：概念类型（`JS Syntax` / `JS Topic` / `JS Builtin` / `JS Pattern`）
   - `title` / `description`：标题和一句话描述
   - `hint`：给 LLM 的参考信息（关键词、相关概念、ES 版本、MDN 地址）
2. 实现 `list_concepts()`：把 `_CONCEPTS` 列表转成 `ConceptRef` 对象列表返回
3. 实现 `read_concept()`：根据 `ConceptRef` 查找对应记录，把元数据打包成字典返回给 LLM

**注意**：这个文件本身不生成任何文档，它只是"知识目录"，告诉 Agent 有哪些东西要写。真正的文档由 LLM 根据这些元数据生成。

```
js_syntax.py 提供的元数据（种子）
        │
        ▼
DeepSeek 根据种子自主撰写完整文档
        │
        ▼
write_concept_doc() 写入磁盘
```

---

### 6.3 `sources/sqlite.py` — SQLite 数据源

**职责**：读取本地 SQLite 数据库，把数据库结构转成 Agent 可消费的"概念"。

**它做的事**：
1. 连接指定的 `.db` 文件
2. `list_concepts()`：
   - 创建一个 `SQLite Database` 类型的概念（代表整个数据库）
   - 查询 `sqlite_master` 表获取所有表名，每张表创建一个 `SQLite Table` 类型的概念
   - 例：`demo.db` 含 5 张表 → 返回 6 个概念（1 个数据库 + 5 个表）
3. `read_concept()`：
   - 对于 Database 概念：返回数据库名、路径、表数量、表名列表
   - 对于 Table 概念：执行 `PRAGMA table_info()` 返回所有列名/类型/约束，执行 `COUNT(*)` 返回行数，执行 `PRAGMA index_list()` 返回索引信息
4. `sample_rows()`：对指定表执行 `SELECT * FROM table LIMIT n`，返回前 n 行样本数据

**LLM 拿到这些信息后做什么**：根据列名（如 `user_id`, `email`, `created_at`）推断每列的业务含义，生成人类可读的表文档，说明这张表存什么数据、各列什么意思、典型使用场景。

---

### 6.4 `local_runner.py` — 本地运行器（SQLite 场景）

**职责**：编排 SQLite 场景下的完整生成流程，是 `js_main.py` 同类但针对数据库场景的版本。

**它做的事**：
1. 初始化时：接收 `SQLiteSource`、输出目录、可选的 web seeds URL 列表
2. 调用 `set_context(source, bundle_root)`：把数据源和输出路径注入全局上下文（原有工具函数依赖此）
3. `enrich_all()` 方法：
   - 调用 `source.list_concepts()` 获取所有概念
   - 如果指定了 `only` 参数（概念 id 列表），则只处理指定的概念
   - 逐个调用 `enrich_concept()`
4. `enrich_concept()` 方法：
   - 创建 `ToolCallRunner`，加载 `reference_instruction.md`（原始提示词）
   - 工具集：`list_concepts` + `read_concept_raw` + `sample_rows` + `read_existing_doc` + `write_concept_doc`
   - 发出任务消息，启动 LLM 循环
5. `run_web_pass()` 方法（可选）：
   - 加载 Web 增强提示词（`web_ingestion_instruction.md`）
   - 工具集额外增加 `fetch_url`
   - LLM 会自主抓取 seed URL，从网页提取信息补充到现有文档
6. 流程结束后调用 `_regenerate_indexes_local()`：扫描所有 `.md`，为每个目录生成 `index.md`

**`_regenerate_indexes_local()` 函数单独说明**：
不依赖 LLM，纯 Python 实现的 index 生成器。扫描每个目录下的 `.md` 文件，读取 frontmatter 里的 `title` 和 `description`，生成如下格式的 `index.md`：
```markdown
# syntax

* [Arrow Functions](arrow_function.md) - 箭头函数是 ES2015 引入的简洁函数语法
* [async / await](async_await.md) - 基于 Promise 的语法糖
* [Class Syntax](class.md) - 基于原型的 class 语法糖
```

---

### 6.5 `js_main.py` — JS 知识库 CLI 入口

**职责**：命令行程序，是整个 JS 知识库生成流程的启动点。

**它做的事**（顺序执行）：

```
python -m reference_agent.js_main --visualize
         │
         ├── 1. 解析命令行参数（--concept / --out / --visualize / -v）
         │
         ├── 2. 创建 JSSyntaxSource()（20 个 JS 概念的目录）
         │
         ├── 3. set_context(source, bundle_root)
         │      把数据源和输出路径注入全局，所有工具函数均可访问
         │
         ├── 4. 读取 js_instruction.md 作为系统提示词
         │
         ├── 5. for 循环处理每个概念：
         │      创建 ToolCallRunner → runner.run(任务消息) → 等待完成
         │      进度: [1/20] [2/20] ... [20/20]
         │
         ├── 6. _regenerate_indexes_local(bundle_root)
         │      为每个子目录生成 index.md
         │
         └── 7. 如果 --visualize：
                generate_visualization() → 写 viz.html
                open viz.html（macOS 自动打开浏览器）
```

**关键设计**：每个概念使用**独立的 `ToolCallRunner` 实例**，每次对话历史相互隔离，避免上一个概念的上下文污染下一个概念的生成。

---

### 6.6 `local_main.py` — SQLite 知识库 CLI 入口

**职责**：命令行程序，SQLite 数据库场景的启动点，是 `js_main.py` 的"数据库版本"。

**它做的事**（顺序执行）：

```
python -m reference_agent.local_main --db mydb.db --visualize
         │
         ├── 1. 解析命令行参数（--db / --out / --concept / --no-web / --visualize）
         │
         ├── 2. 如果没有指定 --db：
         │      _ensure_demo_db() 自动创建 demo.db
         │      内含电商场景 5 张表：users / products / orders / order_items / events
         │      并插入 3 条用户、5 种商品、3 笔订单、5 个行为事件的样本数据
         │
         ├── 3. 创建 SQLiteSource(db_path)
         │
         ├── 4. 创建 LocalRunner(source, bundle_root, web_seeds)
         │      · web_seeds 默认为 None（跳过 Web Pass，避免访问外网）
         │      · --no-web 参数同样跳过 Web Pass
         │
         ├── 5. runner.enrich_all(only=args.concept)
         │      内部依次：BQ Pass → Web Pass（可选）→ 生成 index.md
         │
         └── 6. 如果 --visualize：
                generate_visualization() → 写 viz.html
                open viz.html（macOS 自动打开浏览器）
```

**`_ensure_demo_db()` 函数**：如果 `demo.db` 不存在，自动创建包含完整电商业务数据的 SQLite 数据库，用于演示和测试，无需任何外部数据。

---

### 6.7 各脚本的关系总览

```
┌────────────────────────────────────────────────────────────────┐
│                       你运行的命令                              │
│                                                                │
│  js_main.py              local_main.py                        │
│  (JS 知识库入口)           (SQLite 知识库入口)                  │
│       │                        │                              │
│       │                        ▼                              │
│       │               local_runner.py                         │
│       │               (流程编排器)                             │
│       │                        │                              │
│       └────────────┬───────────┘                              │
│                    ▼                                          │
│             llm_runner.py                                     │
│             (LLM 驱动引擎)                                     │
│                    │  工具调用                                 │
│             ┌──────┴──────────────────┐                       │
│             ▼                        ▼                        │
│    bundle_tools.py            source_tools.py                 │
│    (读/写 .md 文件)            (读数据源元数据)                  │
│             │                        │                        │
│             ▼                        ▼                        │
│    OKFDocument.parse/         js_syntax.py                    │
│    serialize                  sqlite.py                       │
│    (文件格式解析)               (数据源实现)                    │
└────────────────────────────────────────────────────────────────┘
```

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
