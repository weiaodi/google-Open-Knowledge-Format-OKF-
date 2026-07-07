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
import { getContext, isWebPass } from "../context.js";
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

// ── Web Pass 增量保护工具函数 ─────────────────────────────────────────────────

/** 统计 Markdown body 中某个顶级 `# Heading` 下的非空行数 */
function sectionLineCount(body: string, heading: string): number {
  let inSection = false;
  let count = 0;
  for (const line of body.split("\n")) {
    const stripped = line.trim();
    if (stripped.startsWith("# ")) {
      inSection = stripped === heading;
      continue;
    }
    if (inSection && stripped) count++;
  }
  return count;
}

/** 统计 # Citations 下的条目数 */
function citationCount(body: string): number {
  return sectionLineCount(body, "# Citations");
}

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

    // 反退化保护 + Web Pass 增量保护
    if (fs.existsSync(filePath)) {
      try {
        const existing = parseOKF(fs.readFileSync(filePath, "utf-8"));
        const existingLen = existing.body.length;
        const newLen = (body as string).length;

        // 通用退化保护：新 body 不能比现有 body 短超过 30%
        if (newLen < existingLen * 0.7) {
          return {
            status: "rejected",
            reason: `New body (${newLen} chars) is significantly shorter than existing (${existingLen} chars). Aborting to prevent regression.`,
          };
        }

        // Web Pass 增量保护：# Citations 数量不能减少（对应 Python bundle_tools.py）
        if (isWebPass()) {
          const oldCites = citationCount(existing.body);
          const newCites = citationCount(body as string);
          if (newCites < oldCites) {
            return {
              status: "rejected",
              reason:
                `Refusing to write: the existing # Citations section had ${oldCites} entries, ` +
                `but your new # Citations has only ${newCites}. ` +
                `Append your new citation rather than replacing the list. ` +
                `Re-call write_concept_doc with every existing entry preserved plus the new one.`,
            };
          }
        }
      } catch {
        // 如果读取失败就跳过保护检查
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
