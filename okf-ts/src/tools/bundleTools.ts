/**
 * tools/bundleTools.ts — OKF Bundle 读写工具（供 LLM 调用）
 *
 * readExistingDoc：在 LLM 撰写文档前先读取现有文档
 *   - 若文档存在，返回完整内容，LLM 可在此基础上增量更新
 *   - 若文档不存在，返回 null，LLM 从零撰写
 *
 * writeConceptDoc：将 LLM 生成的文档写入磁盘
 *   - 自动填充 timestamp
 *   - 自动创建中间目录
 *   - 包含反退化保护（新文档 body 不能比现有文档短太多）
 *
 * 前置产物：LLM 决策结果（concept_id + frontmatter dict + body string）
 * 后置产物：磁盘上的 .md 文件
 */

import fs from "node:fs";
import path from "node:path";
import { getContext } from "../context.js";
import { parseOKF, serializeOKF } from "../bundle/document.js";
import { conceptIdToPath, parseConceptId } from "../bundle/paths.js";
import type { ToolDef } from "../llmRunner.js";

/** 读取已有的 OKF 文档（用于增量更新） */
export const readExistingDocTool: ToolDef = {
  name: "read_existing_doc",
  description:
    "Read the existing OKF markdown document for a concept, if it exists. " +
    "Returns the full document text so you can augment it rather than overwrite from scratch. " +
    "Returns null if the document does not exist yet.",
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
    const { bundleRoot } = getContext();
    const idParts = parseConceptId(concept_id as string);
    const filePath = conceptIdToPath(bundleRoot, idParts);
    if (!fs.existsSync(filePath)) return null;
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  },
};

/** 将 LLM 生成的文档写入磁盘 */
export const writeConceptDocTool: ToolDef = {
  name: "write_concept_doc",
  description:
    "Write (or overwrite) the OKF markdown document for a concept. " +
    "frontmatter MUST be a JSON object (not a string) with at least: type, title, description. " +
    "body is the full Markdown content after the frontmatter block.",
  parameters: {
    type: "object",
    properties: {
      concept_id: {
        type: "string",
        description: 'Slash-joined concept id, e.g. "syntax/arrow_function"',
      },
      frontmatter: {
        type: "object",
        description:
          "MUST be a JSON object. Required keys: type (string), title (string), description (string). " +
          "Optional: resource (string), tags (array of strings). " +
          'Example: {"type": "JS Syntax", "title": "Arrow Functions", "description": "Concise syntax with lexical this."}',
        additionalProperties: true,
      },
      body: {
        type: "string",
        description: "Markdown body content (sections: 概述, Syntax, Examples, Key Points, etc.)",
      },
    },
    required: ["concept_id", "frontmatter", "body"],
  },
  fn: ({ concept_id, frontmatter, body }) => {
    const { bundleRoot } = getContext();

    // 兼容处理：LLM 可能错误地把 frontmatter 传成字符串
    let fm = frontmatter as Record<string, unknown>;
    if (typeof fm === "string") {
      try {
        fm = JSON.parse(fm as unknown as string) as Record<string, unknown>;
      } catch {
        fm = { type: "Unknown", title: "Unknown", description: String(fm).slice(0, 100) };
      }
    }

    // 自动填充 timestamp
    fm.timestamp = new Date().toISOString();

    const idParts = parseConceptId(concept_id as string);
    const filePath = conceptIdToPath(bundleRoot, idParts);

    // 反退化保护：新 body 不能比现有 body 短超过 30%
    if (fs.existsSync(filePath)) {
      try {
        const existing = parseOKF(fs.readFileSync(filePath, "utf-8"));
        const existingLen = existing.body.length;
        const newLen = (body as string).length;
        if (newLen < existingLen * 0.7) {
          return {
            status: "rejected",
            reason: `New body (${newLen} chars) is significantly shorter than existing (${existingLen} chars). Aborting to prevent regression.`,
          };
        }
      } catch {
        // 如果读取失败就跳过退化检查
      }
    }

    const doc = serializeOKF({ frontmatter: fm, body: body as string });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, doc, "utf-8");

    return {
      status: "ok",
      path: path.relative(bundleRoot, filePath),
      bytes: Buffer.byteLength(doc, "utf-8"),
    };
  },
};
