/**
 * sources/jsSyntax.ts — JavaScript 语法知识域数据源（内存实现）
 *
 * 这是一个"代码即数据源"的实现：
 *   - 不依赖任何外部数据库或文件
 *   - 概念列表硬编码在 _CONCEPTS 数组中
 *   - sampleRows() 返回 null，由 LLM 自行生成代码示例
 *
 * 包含 10 个精简的 JS 核心概念，涵盖：
 *   topics/ (3) — 核心主题概览
 *   syntax/ (4) — 语法特性
 *   builtin/ (2) — 内置对象
 *   patterns/ (1) — 编程模式
 */

import type { ConceptRef, Source } from "./base.js";

interface ConceptDef {
  id: string[];
  type: string;
  title: string;
  description: string;
  hint: {
    keywords: string[];
    related: string[];
    mdn?: string;
    esVersion?: string;
  };
}

/**
 * Demo 精简版：4 个概念，覆盖四种类型（Topic / Syntax / Builtin / Pattern）
 * 足以体现工具完整两步流程：Pass 1 生成文档 + Pass 2 Web 增强
 */
const _CONCEPTS: ConceptDef[] = [
  // ── topic ────────────────────────────────────────────────────────────────
  {
    id: ["topics", "async"],
    type: "JS Topic",
    title: "Asynchronous JavaScript",
    description: "事件循环、回调、Promise、async/await 构成的 JS 异步编程模型",
    hint: {
      keywords: ["event loop", "callback", "microtask", "macrotask", "non-blocking"],
      related: ["builtin/promise", "syntax/async_await"],
      mdn: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous",
      esVersion: "ES6",
    },
  },
  // ── syntax ───────────────────────────────────────────────────────────────
  {
    id: ["syntax", "arrow_function"],
    type: "JS Syntax",
    title: "Arrow Functions",
    description: "ES6 简洁函数语法，词法 this 绑定，不能用作构造函数",
    hint: {
      keywords: ["=>", "lexical this", "implicit return", "concise body"],
      related: ["builtin/promise", "patterns/closure"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      esVersion: "ES6",
    },
  },
  // ── builtin ──────────────────────────────────────────────────────────────
  {
    id: ["builtin", "promise"],
    type: "JS Builtin",
    title: "Promise",
    description: "代表异步操作最终完成或失败的对象，是 async/await 的底层机制",
    hint: {
      keywords: ["then", "catch", "finally", "Promise.all", "Promise.race", "pending/fulfilled/rejected"],
      related: ["syntax/async_await", "topics/async"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
      esVersion: "ES6",
    },
  },
  // ── pattern ──────────────────────────────────────────────────────────────
  {
    id: ["patterns", "closure"],
    type: "JS Pattern",
    title: "Closure",
    description: "闭包：函数记住并访问其词法作用域，即使在作用域外执行",
    hint: {
      keywords: ["lexical scope", "encapsulation", "data privacy", "IIFE", "factory function"],
      related: ["syntax/arrow_function", "topics/async"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
      esVersion: "ES5",
    },
  },
];

export class JSSyntaxSource implements Source {
  listConcepts(): ConceptRef[] {
    return _CONCEPTS.map((c) => ({
      id: c.id,
      idStr: c.id.join("/"),
      type: c.type,
      resource: c.hint.mdn,
      hint: {
        keywords: c.hint.keywords,
        related: c.hint.related,
        es_version: c.hint.esVersion,
      },
    }));
  }

  readConcept(idStr: string): Record<string, unknown> {
    const c = _CONCEPTS.find((def) => def.id.join("/") === idStr);
    if (!c) throw new Error(`Unknown concept: ${idStr}`);
    return {
      id: idStr,
      type: c.type,
      title: c.title,
      description: c.description,
      keywords: c.hint.keywords,
      related_concepts: c.hint.related,
      mdn_url: c.hint.mdn ?? null,
      es_version: c.hint.esVersion ?? null,
    };
  }

  sampleRows(_idStr: string, _n?: number): null {
    // 内存数据源无行数据，由 LLM 自行生成代码示例
    return null;
  }

  find(id: string[]): ConceptRef | undefined {
    const idStr = id.join("/");
    const c = _CONCEPTS.find((def) => def.id.join("/") === idStr);
    if (!c) return undefined;
    return {
      id: c.id,
      idStr,
      type: c.type,
      resource: c.hint.mdn,
      hint: {
        keywords: c.hint.keywords,
        related: c.hint.related,
        es_version: c.hint.esVersion,
      },
    };
  }
}
