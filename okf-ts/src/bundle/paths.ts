/**
 * bundle/paths.ts — concept_id ↔ 文件路径互转
 *
 * concept_id 是斜杠分隔的字符串，如 "syntax/arrow_function"
 * 对应文件路径：<bundleRoot>/syntax/arrow_function.md
 */

import path from "node:path";

const SEGMENT_RE = /^[A-Za-z0-9_][A-Za-z0-9_.\-]*$/;

function validateSegment(seg: string): void {
  if (!SEGMENT_RE.test(seg)) {
    throw new Error(`Invalid concept id segment: "${seg}"`);
  }
}

/**
 * "syntax/arrow_function" → ["syntax", "arrow_function"]
 */
export function parseConceptId(idStr: string): string[] {
  const parts = idStr.split("/").filter(Boolean);
  if (parts.length === 0) throw new Error(`Empty concept id: "${idStr}"`);
  parts.forEach(validateSegment);
  return parts;
}

/**
 * ["syntax", "arrow_function"] → "<bundleRoot>/syntax/arrow_function.md"
 */
export function conceptIdToPath(bundleRoot: string, id: string[]): string {
  if (id.length === 0) throw new Error("concept id must have at least one segment");
  id.forEach(validateSegment);
  return path.join(bundleRoot, ...id.slice(0, -1), `${id[id.length - 1]}.md`);
}

/**
 * "<bundleRoot>/syntax/arrow_function.md" → "syntax/arrow_function"
 */
export function pathToConceptId(bundleRoot: string, filePath: string): string {
  const rel = path.relative(bundleRoot, filePath);
  return rel.replace(/\.md$/, "").split(path.sep).join("/");
}
