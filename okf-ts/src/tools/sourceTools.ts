/**
 * tools/sourceTools.ts — 数据源查询工具（供 LLM 调用）
 *
 * 这里导出的不是普通函数，而是 ToolDef 对象：
 *   - name / description / parameters → 发给 LLM 的工具描述（JSON Schema）
 *   - fn → LLM 决定调用时执行的 Python/TS 函数逻辑
 *
 * 所有工具函数都通过 getContext() 访问当前数据源，
 * 不持有任何状态，上下文由 main.ts 在启动时通过 setContext() 注入。
 */

import { getContext } from "../context.js";
import type { ToolDef } from "../llmRunner.js";
import { parseConceptId } from "../bundle/paths.js";

/** 列出数据源中所有概念 */
export const listConceptsTool: ToolDef = {
  name: "list_concepts",
  description:
    "List every concept the active source advertises. Returns id, type, resource URL, and hint metadata.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  fn: (_args) => {
    const { source } = getContext();
    return source.listConcepts().map((r) => ({
      id: r.idStr,
      type: r.type,
      resource: r.resource ?? null,
      hint: r.hint,
    }));
  },
};

/** 读取单个概念的原始结构化元数据 */
export const readConceptRawTool: ToolDef = {
  name: "read_concept_raw",
  description:
    "Fetch raw structured metadata for a single concept from its source. " +
    "Returns keywords, related concepts, ES version, MDN URL, etc. " +
    'concept_id is the slash-joined id from list_concepts (e.g. "syntax/arrow_function").',
  parameters: {
    type: "object",
    properties: {
      concept_id: {
        type: "string",
        description: 'Slash-joined concept id, e.g. "syntax/arrow_function"',
      },
    },
    required: ["concept_id"],
  },
  fn: ({ concept_id }) => {
    const { source } = getContext();
    return source.readConcept(concept_id as string);
  },
};

/** 采样概念的行数据（用于有实际数据的 Source，如 SQLite / BigQuery） */
export const sampleRowsTool: ToolDef = {
  name: "sample_rows",
  description:
    "Pull a small sample of rows from the underlying asset, if supported by the source. " +
    "Returns {rows: [...], note: string}. rows is empty and note explains why if sampling is not supported. " +
    'concept_id is the slash-joined id from list_concepts (e.g. "tables/users"). ' +
    "n is the number of rows to sample (default 5).",
  parameters: {
    type: "object",
    properties: {
      concept_id: {
        type: "string",
        description: 'Slash-joined concept id, e.g. "tables/users"',
      },
      n: {
        type: "number",
        description: "Number of rows to sample (default 5)",
      },
    },
    required: ["concept_id"],
  },
  fn: ({ concept_id, n }) => {
    const { source } = getContext();
    const idParts = parseConceptId(concept_id as string);
    const ref = source.find(idParts);
    if (!ref) {
      return { rows: [], note: `Unknown concept: ${concept_id}` };
    }
    if (!source.sampleRows) {
      return { rows: [], note: "Sampling is not supported by this source." };
    }
    try {
      const rows = source.sampleRows(ref.idStr, typeof n === "number" ? n : 5);
      if (rows === null) {
        return { rows: [], note: "Sampling is not supported for this concept." };
      }
      // 所有值转为字符串（与 Python 版对齐）
      const coerced = rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))
      );
      return { rows: coerced, note: "" };
    } catch (e) {
      return { rows: [], note: `Sampling failed: ${String(e)}` };
    }
  },
};
