/**
 * bundle/indexer.ts — 目录索引生成器
 *
 * 扫描 bundle 目录，为每个子目录生成 index.md，
 * 列出该目录下所有概念的标题和描述，
 * 并在 bundle 根目录生成顶层 index.md。
 *
 * 纯 TypeScript 实现，不调用 LLM。
 */

import fs from "node:fs";
import path from "node:path";
import { parseOKF } from "./document.js";
import { pathToConceptId } from "./paths.js";

/** 扫描目录下所有 .md 文件（递归），排除 index.md */
function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md") {
      results.push(full);
    }
  }
  return results;
}

/** 生成某个子目录的 index.md */
function buildSubIndex(dir: string, bundleRoot: string): string {
  const files = findMdFiles(dir);
  if (files.length === 0) return "";

  const subName = path.basename(dir);
  const lines: string[] = [`# ${subName} Index\n`];

  for (const f of files.sort()) {
    try {
      const text = fs.readFileSync(f, "utf-8");
      const doc = parseOKF(text);
      const title = (doc.frontmatter.title as string) ?? path.basename(f, ".md");
      const desc = (doc.frontmatter.description as string) ?? "";
      const conceptId = pathToConceptId(bundleRoot, f);
      const relPath = path.relative(dir, f);
      lines.push(`- [${title}](./${relPath}) — ${desc}`);
      void conceptId; // 保留用于 future use
    } catch {
      lines.push(`- ${path.basename(f, ".md")}`);
    }
  }

  return lines.join("\n") + "\n";
}

/** 生成 bundle 根目录的顶层 index.md */
function buildRootIndex(bundleRoot: string): string {
  const entries = fs.readdirSync(bundleRoot, { withFileTypes: true });
  const subDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const lines: string[] = ["# Knowledge Base Index\n"];

  for (const sub of subDirs) {
    const subDir = path.join(bundleRoot, sub);
    const files = findMdFiles(subDir);
    lines.push(`## ${sub} (${files.length} concepts)\n`);
    for (const f of files.sort()) {
      try {
        const text = fs.readFileSync(f, "utf-8");
        const doc = parseOKF(text);
        const title = (doc.frontmatter.title as string) ?? path.basename(f, ".md");
        const desc = (doc.frontmatter.description as string) ?? "";
        const relPath = path.relative(bundleRoot, f);
        lines.push(`- [${title}](./${relPath}) — ${desc}`);
      } catch {
        lines.push(`- ${path.basename(f, ".md")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 为 bundleRoot 及其所有子目录生成 index.md 文件
 */
export function regenerateIndexes(bundleRoot: string): void {
  if (!fs.existsSync(bundleRoot)) return;

  // 子目录 index
  for (const entry of fs.readdirSync(bundleRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(bundleRoot, entry.name);
    const content = buildSubIndex(subDir, bundleRoot);
    if (content) {
      fs.writeFileSync(path.join(subDir, "index.md"), content, "utf-8");
    }
  }

  // 根目录 index
  const rootContent = buildRootIndex(bundleRoot);
  fs.writeFileSync(path.join(bundleRoot, "index.md"), rootContent, "utf-8");

  console.log(`[indexer] Indexes regenerated for ${bundleRoot}`);
}
