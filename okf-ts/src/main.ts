/**
 * main.ts — CLI 入口
 *
 * 用法：
 *   # 处理全部 10 个 JS 概念
 *   LLM_PROVIDER=deepseek LLM_API_KEY=sk-xxx npx tsx src/main.ts
 *
 *   # 只处理指定概念
 *   npx tsx src/main.ts --concept syntax/arrow_function --concept builtin/promise
 *
 *   # 只生成 viz.html（不调 LLM）
 *   npx tsx src/main.ts --visualize
 *
 *   # 指定自定义输出目录
 *   npx tsx src/main.ts --bundle-dir ./my_bundles/js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { program } from "commander";
import { setContext } from "./context.js";
import { ToolCallRunner } from "./llmRunner.js";
import { JSSyntaxSource } from "./sources/jsSyntax.js";
import { listConceptsTool, readConceptRawTool } from "./tools/sourceTools.js";
import { readExistingDocTool, writeConceptDocTool } from "./tools/bundleTools.js";
import { regenerateIndexes } from "./bundle/indexer.js";
import { writeVizHtml } from "./viewer/generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI 参数解析 ─────────────────────────────────────────────────────────────

program
  .name("okf-ts")
  .description("OKF Knowledge Graph Generator — TypeScript edition")
  .option(
    "-c, --concept <id>",
    "Only process this concept id (can be repeated, e.g. --concept syntax/arrow_function)",
    (v, prev: string[]) => [...prev, v],
    [] as string[]
  )
  .option(
    "-b, --bundle-dir <path>",
    "Output bundle directory",
    path.join(process.cwd(), "bundles", "js_syntax")
  )
  .option("--visualize", "Only regenerate viz.html (skip LLM)", false)
  .parse(process.argv);

const opts = program.opts<{
  concept: string[];
  bundleDir: string;
  visualize: boolean;
}>();

const BUNDLE_ROOT = path.resolve(opts.bundleDir);

// ── 加载系统提示词 ────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  const promptPath = path.join(__dirname, "prompts", "jsInstruction.md");
  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt not found: ${promptPath}`);
  }
  return fs.readFileSync(promptPath, "utf-8");
}

// ── 主流程 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("OKF Knowledge Graph Generator — TypeScript Edition");
  console.log("=".repeat(60));

  // 初始化数据源 + 输出目录
  const source = new JSSyntaxSource();
  fs.mkdirSync(BUNDLE_ROOT, { recursive: true });
  setContext(source, BUNDLE_ROOT);

  // --visualize 模式：只生成图谱
  if (opts.visualize) {
    regenerateIndexes(BUNDLE_ROOT);
    writeVizHtml(BUNDLE_ROOT);
    return;
  }

  // 确定要处理的概念列表
  const allConcepts = source.listConcepts();
  const targets =
    opts.concept.length > 0
      ? allConcepts.filter((c) => opts.concept.includes(c.idStr))
      : allConcepts;

  if (targets.length === 0) {
    console.error("No concepts to process. Check --concept filter.");
    process.exit(1);
  }

  console.log(`\nProcessing ${targets.length} concept(s) → ${BUNDLE_ROOT}\n`);

  const systemPrompt = loadSystemPrompt();
  const tools = [listConceptsTool, readConceptRawTool, readExistingDocTool, writeConceptDocTool];

  let done = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const ref of targets) {
    const idx = done + failed + 1;
    console.log(`\n[${idx}/${targets.length}] Processing: ${ref.idStr} (${ref.type})`);
    console.log("-".repeat(50));

    try {
      const runner = new ToolCallRunner(systemPrompt, tools, { maxRounds: 20 });
      const userMessage =
        `Enrich the JavaScript concept with id: ${ref.idStr}\n` +
        `Type: ${ref.type}\n` +
        `Write a comprehensive OKF document. Include syntax, examples, key points, and common mistakes.`;
      await runner.run(userMessage);
      done++;
      console.log(`  ✓ Done (${done}/${targets.length})`);
    } catch (err) {
      failed++;
      console.error(`  ✗ Failed: ${String(err)}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`Completed: ${done} succeeded, ${failed} failed (${elapsed}s)`);
  console.log("=".repeat(60));

  // 生成索引 + 可视化
  console.log("\n[post] Regenerating indexes...");
  regenerateIndexes(BUNDLE_ROOT);

  console.log("[post] Generating viz.html...");
  const vizPath = writeVizHtml(BUNDLE_ROOT);

  console.log(`\nDone! Open the knowledge graph:\n  open ${vizPath}`);

  // macOS 自动打开
  if (process.platform === "darwin") {
    try {
      execSync(`open "${vizPath}"`);
    } catch {
      // 非致命错误，忽略
    }
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
