/**
 * context.ts — 全局上下文注入
 *
 * 工具函数（bundleTools / sourceTools / webTools）需要在执行时访问：
 *   - source: 当前数据源（JSSyntaxSource 等）
 *   - bundleRoot: OKF bundle 的输出根目录
 *
 * Web Pass 另需 WebState，追踪爬虫预算、已访问 URL、深度等状态。
 *
 * 通过模块级单例注入，避免将 context 作为参数层层传递。
 * 在 main.ts 启动时调用 setContext()，之后所有工具函数通过 getContext() 访问。
 */

import type { Source } from "./sources/base.js";

// ── ToolContext ─────────────────────────────────────────────────────────────

interface ToolContext {
  source: Source;
  bundleRoot: string;
}

let _ctx: ToolContext | null = null;

/** 在 main.ts 启动时调用，注入数据源和输出路径 */
export function setContext(source: Source, bundleRoot: string): void {
  _ctx = { source, bundleRoot };
}

/** 工具函数调用时获取当前上下文，未初始化则抛出 */
export function getContext(): ToolContext {
  if (!_ctx) {
    throw new Error(
      "Tool context not initialized. Call setContext() before running the agent."
    );
  }
  return _ctx;
}

// ── WebState ─────────────────────────────────────────────────────────────────

/**
 * Web Pass 期间的爬虫状态。
 * 对应 Python 版 tools/context.py 的 WebState dataclass。
 */
export interface WebState {
  /** 允许抓取的主机集合（空集 = 不限制） */
  allowedHosts: Set<string>;
  /** 最大抓取页数（硬上限） */
  maxPages: number;
  /** 允许的 URL path 前缀列表（空 = 不限制） */
  allowedPathPrefixes: string[];
  /** 拒绝的 URL path 子串列表 */
  deniedPathSubstrings: string[];
  /** 从任意 seed 出发的最大跳数 */
  maxDepth: number;
  /** 本次 session 已访问的 URL 集合 */
  visited: Set<string>;
  /** 已抓取的页数计数器 */
  fetchedCount: number;
  /**
   * URL → 深度（从最近的 seed 出发的跳数）
   * seed URL 注册为深度 0，通过链接发现的 URL 注册为 parent_depth + 1
   */
  urlDepth: Map<string, number>;
}

let _web: WebState | null = null;

/** 初始化 Web Pass 状态，在 runWebPass() 开始时调用 */
export function setWebState(opts: {
  allowedHosts?: string[];
  maxPages: number;
  seeds: string[];
  allowedPathPrefixes?: string[];
  deniedPathSubstrings?: string[];
  maxDepth?: number;
}): void {
  const state: WebState = {
    allowedHosts: new Set(opts.allowedHosts ?? []),
    maxPages: opts.maxPages,
    allowedPathPrefixes: opts.allowedPathPrefixes ?? [],
    deniedPathSubstrings: opts.deniedPathSubstrings ?? [],
    maxDepth: opts.maxDepth ?? 2,
    visited: new Set(),
    fetchedCount: 0,
    urlDepth: new Map(),
  };
  // seed URL 注册为深度 0
  for (const seed of opts.seeds) {
    state.urlDepth.set(seed, 0);
  }
  _web = state;
}

/** Web Pass 中的 fetchUrlTool 调用此函数获取爬虫状态 */
export function getWebState(): WebState {
  if (!_web) {
    throw new Error(
      "Web state not initialized. Call setWebState() before running the web pass."
    );
  }
  return _web;
}

/** Web Pass 结束后清理状态 */
export function clearWebState(): void {
  _web = null;
}

/** 当前是否处于 Web Pass 执行期间（_web != null） */
export function isWebPass(): boolean {
  return _web !== null;
}
