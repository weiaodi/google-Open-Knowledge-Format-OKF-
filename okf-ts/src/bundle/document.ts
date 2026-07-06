/**
 * bundle/document.ts — OKF 文档格式解析与序列化
 *
 * OKF Concept Document 格式：
 *   ---
 *   type: JS Syntax          ← YAML frontmatter（必填：type/title/description/timestamp）
 *   title: Arrow Functions
 *   description: 一句话描述
 *   timestamp: '2026-07-06T...'
 *   ---
 *
 *   ## 概述                   ← Markdown 正文
 *   ...
 *
 * 前置产物：字符串（.md 文件内容）
 * 后置产物：OKFDocument 对象（frontmatter dict + body string）
 */

import yaml from "js-yaml";

export interface OKFDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

const REQUIRED_KEYS = ["type", "title", "description", "timestamp"] as const;

/**
 * 解析 OKF Markdown 文本 → OKFDocument
 * 如果没有 frontmatter 分隔符，整段当作 body 处理
 */
export function parseOKF(text: string): OKFDocument {
  if (!text.startsWith("---")) {
    return { frontmatter: {}, body: text };
  }
  const end = text.indexOf("---", 3);
  if (end === -1) {
    throw new Error("Unterminated YAML frontmatter block");
  }
  const fmText = text.slice(3, end);
  const fm = yaml.load(fmText);
  if (!fm || typeof fm !== "object" || Array.isArray(fm)) {
    throw new Error("Frontmatter must be a YAML mapping");
  }
  let body = text.slice(end + 3);
  if (body.startsWith("\n")) body = body.slice(1);
  return { frontmatter: fm as Record<string, unknown>, body };
}

/**
 * OKFDocument → Markdown 文本
 */
export function serializeOKF(doc: OKFDocument): string {
  // js-yaml v4 DumpOptions 不含 allowUnicode，直接 dump 即可（v4 默认支持 Unicode）
  const fmText = (yaml.dump(doc.frontmatter) as string).trimEnd();
  const body = doc.body.endsWith("\n") ? doc.body : doc.body + "\n";
  return `---\n${fmText}\n---\n\n${body}`;
}

/**
 * 校验必填字段，缺失则抛出
 */
export function validateOKF(doc: OKFDocument): void {
  const missing = REQUIRED_KEYS.filter((k) => !doc.frontmatter[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required frontmatter keys: ${missing.join(", ")}`);
  }
}
