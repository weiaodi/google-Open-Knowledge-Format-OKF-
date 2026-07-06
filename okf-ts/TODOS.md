# OKF-TS 待实现任务

## [ ] 概念发现阶段（Ingest Pipeline）

**背景**：当前工程缺少从原始文档自动提取概念的能力，`jsSyntax.ts` 里的概念清单是人工维护的。需要实现一套自动化 Pipeline，把一批原始文档变成结构化的概念文档集合。

---

### 推荐方案：GraphRAG（方案 C）

**核心思路**：用微软 GraphRAG 做概念发现（Phase 0+1），用现有 okf-ts 做文档生成和图谱构建（Phase 2+3），两者通过 `concept_manifest.json` 对接。

#### 为什么选 GraphRAG

- **Leiden 聚类算法**：自动把跨文档"穿插"的同义概念合并成一个节点（如 "Promise基础" + "Promise链式" + "Promise调度" → 统一为 "Promise"）
- **不靠标题划分边界**：基于实体共现频率和关系图拓扑，概念边界由数据自动决定
- **已解决的工程问题**：实体提取 / 指代消解 / 社区发现，不需要自己实现
- **可追溯性**：每个实体带 `source_file` 字段，知道结论来自哪篇原文

#### 完整流程

```
raw/**/*.md（原始知识库文档）
    ↓
[Phase 0+1: graphrag index --root ./graphrag_workspace]
    Python 工具，独立运行
    内部步骤：
      1. 切 TextUnit（约 300 token/块）
      2. LLM 提取实体 + 关系三元组（每个 TextUnit 一次调用）
      3. 合并跨文档同名实体
      4. Leiden 算法聚类 → Community（概念组）
      5. LLM 为每个 Community 生成 summary
    输出：entities.parquet / relationships.parquet / communities.parquet
    ↓
[转换脚本：graphrag_to_manifest.py]
    把 parquet 输出转换为 concept_manifest.json 格式
    字段映射：
      entity.name        → concept.title
      entity.type        → concept.type
      entity.description → concept.description
      community.id       → concept.topic_group（可选，用于分类）
      relationship.xxx   → concept.related[]
      text_unit.source   → concept.source_file
    ↓
concept_manifest.json（中间产物，可人工审核编辑）
    ↓
[Phase 2: npx tsx src/main.ts --enrich]
    现有 ToolCallRunner 流程，读 ManifestSource
    为每个概念生成标准化 OKF 文档
    ↓
bundles/**/*.md（结构化概念文档）
    ↓
[Phase 3: npx tsx src/main.ts --relate]
    扫描文档的 Related Concepts
    建立双向引用索引
    输出 graph.json + viz.html
```

#### 需要新增的文件

| 文件 | 说明 |
|---|---|
| `graphrag_workspace/settings.yaml` | GraphRAG 配置（api_base 指向 DeepSeek 兼容接口）|
| `scripts/graphrag_to_manifest.py` | parquet → concept_manifest.json 转换脚本 |
| `src/sources/manifest.ts` | ManifestSource（读 JSON 实现 Source 接口）|
| `src/relations/builder.ts` | Phase 3 关系建立（纯代码）|
| `concept_schema.json` | 允许的概念分类，graphrag 提取时的类型约束 |
| `raw/` | 存放原始知识库文档 |

#### GraphRAG 配置关键点

```yaml
# graphrag_workspace/settings.yaml
llm:
  api_key: ${LLM_API_KEY}
  type: openai_chat
  model: deepseek-chat
  api_base: https://api.deepseek.com/v1   # 兼容 OpenAI 接口
  max_tokens: 4096

chunks:
  size: 300
  overlap: 50

entity_extraction:
  prompt: "prompts/entity_extraction.txt"   # 可自定义提取提示词
  max_gleanings: 1

community_reports:
  prompt: "prompts/community_report.txt"
```

#### 实现时的注意事项

1. **DeepSeek 兼容性**：DeepSeek 兼容 OpenAI API，但需要测试 `function calling` 格式是否与 GraphRAG 的提取 prompt 兼容
2. **成本控制**：GraphRAG 对每个 TextUnit 都调用 LLM，原文越多成本越高；建议先用小量文档（5-10 篇）验证
3. **parquet 依赖**：转换脚本需要 `pandas` + `pyarrow`；或用 GraphRAG 的 `--output-format json` 选项直接输出 JSON（需确认版本支持）
4. **Leiden 算法**：`graspologic` 包（GraphRAG 依赖）会自动安装，无需单独处理

#### 替代方案（备用）

如果 GraphRAG 与 DeepSeek 兼容性有问题，可退回：

- **方案 B（TS 轻量版）**：用 `graphology` 包做图结构，自己实现实体提取 + 简单聚类（不用 Leiden，用 label propagation）
- **方案 BERTopic**：用 `bertopic` Python 包做主题聚类，不需要 LLM，成本为零，但精度低于 GraphRAG

---

## [ ] 其他待实现功能

### [ ] ManifestSource（配合 Ingest Pipeline 使用）

`src/sources/manifest.ts` — 读取 `concept_manifest.json` 实现 `Source` 接口，让 Phase 2（文档生成）可以直接消费 GraphRAG 的输出。

### [ ] RelationBuilder（Phase 3）

`src/relations/builder.ts` — 扫描已生成文档，建立双向引用索引，检测孤立概念，驱动 viz.html 节点大小按引用入度排列。

### [ ] log.md 操作日志

每次 `--ingest` / `--enrich` 操作追加记录到 `log.md`，格式：
```
## [2026-07-06T10:00:00Z] enrich | 8 concepts | 185s
```

### [ ] CLI 扩展

`main.ts` 新增参数：
- `--enrich` — 从 manifest 读取概念并生成文档（当前默认行为的显式版本）
- `--relate` — Phase 3 关系建立
- `--pipeline raw/` — 一键全流程（需要 graphrag 已完成）
