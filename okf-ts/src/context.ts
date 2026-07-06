/**
 * context.ts — 全局上下文注入
 *
 * 工具函数（bundleTools / sourceTools）需要在执行时访问：
 *   - source: 当前数据源（JSSyntaxSource 等）
 *   - bundleRoot: OKF bundle 的输出根目录
 *
 * 通过模块级单例注入，避免将 context 作为参数层层传递。
 * 在 main.ts 启动时调用 setContext()，之后所有工具函数通过 getContext() 访问。
 */

import type { Source } from "./sources/base.js";

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
