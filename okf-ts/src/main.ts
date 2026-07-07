/**
 * main.ts — CLI 入口
 *
 * 用法：
 *   # 处理全部 JS 概念（Pass 1: BQ Pass）
 *   LLM_PROVIDER=deepseek LLM_API_KEY=sk-xxx npx tsx src/main.ts
 *
 *   # 只处理指定概念
 *   npx tsx src/main.ts --concept syntax/arrow_function --concept builtin/promise
 *
 *   # Pass 1 后自动执行 Web Pass（Pass 2），从 MDN 抓取增强内容
 *   npx tsx src/main.ts --web-seed https://developer.mozilla.org/en-US/docs/Web/JavaScript
 *
 *   # 只跑 Web Pass（跳过 Pass 1，对已有文档做增量增强）
 *   npx tsx src/main.ts --skip-enrich --web-seed https://developer.mozilla.org/en-US/docs/Web/JavaScript
 *
 *   # 只生成 viz.html（不调 LLM）
 *   npx tsx src/main.ts --visualize
 *
 *   # 使用 MDN URL 作为默认 web seeds（从所有概念的 mdn 字段自动收集）
 *   npx tsx src/main.ts --web-pass
 *
 *   # 指定自定义输出目录
 *   npx tsx src/main.ts --bundle-dir ./my_bundles/js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { program } from "commander";
import { setContext, setWebState, clearWebState } from "./context.js";
import { ToolCallRunner } from "./llmRunner.js";
import { JSSyntaxSource } from "./sources/jsSyntax.js";
import { listConceptsTool, readConceptRawTool, sampleRowsTool } from "./tools/sourceTools.js";
import { readExistingDocTool, writeConceptDocTool } from "./tools/bundleTools.js";
import { fetchUrlTool } from "./tools/webTools.js";
import { regenerateIndexes } from "./bundle/indexer.js";
import { writeVizHtml } from "./viewer/generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI 参数解析 ─────────────────────────────────────────────────────────────

program
  .name("okf-ts")
  .description("OKF Knowledge Graph Generator — TypeScript edition")
  .option(
    "-c, --concept <id>",
    "Only process this concept id (can be repeated)",
    (v, prev: string[]) => [...prev, v],
    [] as string[]
  )
  .option(
    "-b, --bundle-dir <path>",
    "Output bundle directory",
    path.join(process.cwd(), "bundles", "js_syntax")
  )
  .option("--visualize", "Only regenerate viz.html (skip LLM)", false)
  .option("--skip-enrich", "Skip Pass 1 (concept enrichment), only run Web Pass", false)
  .option(
    "--web-seed <url>",
    "Add a seed URL for Web Pass (can be repeated). If omitted with --web-pass, uses each concept's MDN URL.",
    (v, prev: string[]) => [...prev, v],
    [] as string[]
  )
  .option("--web-pass", "Run Web Pass after enrichment (uses MDN URLs if no --web-seed given)", false)
  .option("--web-max-pages <n>", "Max pages to fetch in Web Pass (default 20)", "20")
  .option("--web-max-depth <n>", "Max hop depth from any seed in Web Pass (default 2)", "2")
  .parse(process.argv);

const opts = program.opts<{
  concept: string[];
  bundleDir: string;
  visualize: boolean;
  skipEnrich: boolean;
  webSeed: string[];
  webPass: boolean;
  webMaxPages: string;
  webMaxDepth: string;
}>();

const BUNDLE_ROOT = path.resolve(opts.bundleDir);

// ── 加载系统提示词 ────────────────────────────────────────────────────────────

function loadPrompt(filename: string): string {
  const promptPath = path.join(__dirname, "prompts", filename);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return fs.readFileSync(promptPath, "utf-8");
}

// ── Pass 2：Web Pass ─────────────────────────────────────────────────────────

async function runWebPass(seeds: string[], maxPages: number, maxDepth: number): Promise<void> {
  if (seeds.length === 0) {
    console.log("\n[web-pass] No seeds provided, skipping.");
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Pass 2: Web Ingestion");
  console.log(`  Seeds: ${seeds.length}`);
  console.log(`  Max pages: ${maxPages}, Max depth: ${maxDepth}`);
  console.log(`  Allowed hosts: ${[...new Set(seeds.map((s) => new URL(s).hostname))].join(", ")}`);
  console.log("=".repeat(60));

  // 从 seeds 中提取 allowed_hosts（与 Python 版行为一致）
  const allowedHosts = [...new Set(seeds.map((s) => {
    try { return new URL(s).hostname; } catch { return ""; }
  }).filter(Boolean))];

  setWebState({
    allowedHosts,
    maxPages,
    seeds,
    maxDepth,
  });

  try {
    const webPrompt = loadPrompt("webIngestionInstruction.md");

    const seedLines = seeds.map((s) => `- ${s}`).join("\n");
    const allowedLine = allowedHosts.join(", ") || "(any)";
    const webUserMessage =
      `Ingest the following seed URLs and crawl outward as your judgment directs.\n\n` +
      `Seed URLs:\n${seedLines}\n\n` +
      `Hard limits enforced by the fetch_url tool — do not retry rejected URLs:\n` +
      `- Max pages: ${maxPages}\n` +
      `- Max hop depth from any seed: ${maxDepth}\n` +
      `- Allowed hosts: ${allowedLine}\n\n` +
      `Follow the web-ingestion workflow. For each fetched page, decide whether it enriches ` +
      `an existing concept, deserves its own references/<slug> doc, or should be skipped. ` +
      `Prefer skipping over borderline fetches — the budget is small.`;

    const webTools = [
      listConceptsTool,
      readConceptRawTool,
      readExistingDocTool,
      writeConceptDocTool,
      fetchUrlTool,
    ];

    const runner = new ToolCallRunner(webPrompt, webTools, { maxRounds: 60 });
    await runner.run(webUserMessage);

    console.log("\n[web-pass] Completed.");
  } finally {
    clearWebState();
  }
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

  // ── Pass 1：概念文档生成 ───────────────────────────────────────────────────

  if (!opts.skipEnrich) {
    const allConcepts = source.listConcepts();
    const targets =
      opts.concept.length > 0
        ? allConcepts.filter((c) => opts.concept.includes(c.idStr))
        : allConcepts;

    if (targets.length === 0) {
      console.error("No concepts to process. Check --concept filter.");
      process.exit(1);
    }

    console.log(`\nPass 1: Enriching ${targets.length} concept(s) → ${BUNDLE_ROOT}\n`);

    const systemPrompt = loadPrompt("jsInstruction.md");
    const tools = [listConceptsTool, readConceptRawTool, sampleRowsTool, readExistingDocTool, writeConceptDocTool];

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
    console.log(`Pass 1 Completed: ${done} succeeded, ${failed} failed (${elapsed}s)`);
    console.log("=".repeat(60));
  } else {
    console.log("\n[Pass 1] Skipped (--skip-enrich)");
  }

  // ── Pass 2：Web Pass ───────────────────────────────────────────────────────

  const shouldRunWebPass = opts.webPass || opts.webSeed.length > 0;
  if (shouldRunWebPass) {
    const allConcepts = source.listConcepts();

    // 收集 seeds：优先用 --web-seed，否则从所有概念的 resource 字段自动收集（MDN URL）
    let webSeeds: string[] = opts.webSeed;
    if (webSeeds.length === 0) {
      webSeeds = allConcepts
        .map((c) => c.resource)
        .filter((url): url is string => Boolean(url));
      console.log(`\n[web-pass] Using resource URLs from concepts as seeds (${webSeeds.length} total)`);
    }

    await runWebPass(
      webSeeds,
      parseInt(opts.webMaxPages, 10),
      parseInt(opts.webMaxDepth, 10)
    );
  }

  // ── 生成索引 + 可视化 ──────────────────────────────────────────────────────

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
