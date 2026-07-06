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

const _CONCEPTS: ConceptDef[] = [
  // ── topics ──────────────────────────────────────────────────────────────
  {
    id: ["topics", "variables"],
    type: "JS Topic",
    title: "Variables & Scope",
    description: "var/let/const 声明方式与作用域规则",
    hint: {
      keywords: ["var", "let", "const", "hoisting", "scope", "temporal dead zone"],
      related: ["syntax/arrow_function", "patterns/closure"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#declarations",
      esVersion: "ES6",
    },
  },
  {
    id: ["topics", "functions"],
    type: "JS Topic",
    title: "Functions",
    description: "函数声明、表达式、箭头函数与高阶函数",
    hint: {
      keywords: ["function declaration", "function expression", "higher-order", "first-class"],
      related: ["syntax/arrow_function", "patterns/closure", "builtin/array"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
      esVersion: "ES5",
    },
  },
  {
    id: ["topics", "async"],
    type: "JS Topic",
    title: "Asynchronous JavaScript",
    description: "事件循环、回调、Promise、async/await 异步编程模型",
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
      related: ["topics/functions", "patterns/closure"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      esVersion: "ES6",
    },
  },
  {
    id: ["syntax", "destructuring"],
    type: "JS Syntax",
    title: "Destructuring Assignment",
    description: "解构赋值：从数组或对象中提取值到独立变量",
    hint: {
      keywords: ["array destructuring", "object destructuring", "default values", "rest", "swap"],
      related: ["topics/variables", "syntax/template_literals"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment",
      esVersion: "ES6",
    },
  },
  {
    id: ["syntax", "template_literals"],
    type: "JS Syntax",
    title: "Template Literals",
    description: "模板字符串：反引号语法，支持嵌入表达式和多行文本",
    hint: {
      keywords: ["backtick", "interpolation", "${}", "tagged template", "multi-line"],
      related: ["topics/variables", "syntax/destructuring"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals",
      esVersion: "ES6",
    },
  },
  {
    id: ["syntax", "async_await"],
    type: "JS Syntax",
    title: "async / await",
    description: "基于 Promise 的同步风格异步语法糖",
    hint: {
      keywords: ["async function", "await", "try/catch", "sequential", "parallel"],
      related: ["builtin/promise", "topics/async"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
      esVersion: "ES2017",
    },
  },
  // ── builtin ──────────────────────────────────────────────────────────────
  {
    id: ["builtin", "promise"],
    type: "JS Builtin",
    title: "Promise",
    description: "代表异步操作最终完成或失败的对象",
    hint: {
      keywords: ["then", "catch", "finally", "Promise.all", "Promise.race", "pending/fulfilled/rejected"],
      related: ["syntax/async_await", "topics/async"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
      esVersion: "ES6",
    },
  },
  {
    id: ["builtin", "array"],
    type: "JS Builtin",
    title: "Array Methods",
    description: "Array 的核心方法：map/filter/reduce/find 等函数式操作",
    hint: {
      keywords: ["map", "filter", "reduce", "forEach", "find", "flat", "flatMap", "spread"],
      related: ["topics/functions", "syntax/arrow_function", "syntax/destructuring"],
      mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
      esVersion: "ES5",
    },
  },
  // ── patterns ─────────────────────────────────────────────────────────────
  {
    id: ["patterns", "closure"],
    type: "JS Pattern",
    title: "Closure",
    description: "闭包：函数记住并访问其词法作用域，即使在作用域外执行",
    hint: {
      keywords: ["lexical scope", "encapsulation", "data privacy", "IIFE", "factory function"],
      related: ["topics/functions", "topics/variables", "syntax/arrow_function"],
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
