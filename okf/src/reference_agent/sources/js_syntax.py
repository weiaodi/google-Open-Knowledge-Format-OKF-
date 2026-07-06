"""
JavaScript 基础语法知识源 —— 模拟一个"JS 语法目录"数据源。

每个语法概念对应一个 ConceptRef，分为以下类别：
  - topics/    顶层主题（变量、函数、对象…）
  - syntax/    具体语法点（let/const、箭头函数、解构…）
  - builtin/   内置对象和方法（Array、Promise、Map…）
  - patterns/  常见模式（闭包、原型链、异步模式…）
"""
from __future__ import annotations

from typing import Any

from reference_agent.sources.base import ConceptRef, Source

# ── 知识概念定义 ────────────────────────────────────────────────────────────

_CONCEPTS: list[dict[str, Any]] = [
    # ── 顶层主题 ──────────────────────────────────────────────────────────
    {
        "id": ("topics", "variables"),
        "type": "JS Topic",
        "title": "Variables & Scope",
        "description": "JavaScript 中声明变量的方式以及作用域规则",
        "hint": {
            "keywords": ["var", "let", "const", "scope", "hoisting", "TDZ"],
            "related": ["syntax/let_const", "syntax/var", "patterns/closure"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables",
        },
    },
    {
        "id": ("topics", "functions"),
        "type": "JS Topic",
        "title": "Functions",
        "description": "函数声明、表达式、箭头函数及参数处理",
        "hint": {
            "keywords": ["function", "arrow", "parameters", "return", "callback", "IIFE"],
            "related": ["syntax/arrow_function", "syntax/default_params", "patterns/closure"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
        },
    },
    {
        "id": ("topics", "objects_and_classes"),
        "type": "JS Topic",
        "title": "Objects & Classes",
        "description": "对象字面量、类语法、继承与原型链",
        "hint": {
            "keywords": ["object", "class", "prototype", "extends", "constructor", "this"],
            "related": ["syntax/class", "syntax/destructuring", "patterns/prototype_chain"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects",
        },
    },
    {
        "id": ("topics", "async"),
        "type": "JS Topic",
        "title": "Asynchronous JavaScript",
        "description": "Promise、async/await 及事件循环机制",
        "hint": {
            "keywords": ["Promise", "async", "await", "callback", "event loop", "microtask"],
            "related": ["builtin/promise", "syntax/async_await", "patterns/async_patterns"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous",
        },
    },
    {
        "id": ("topics", "arrays_and_iteration"),
        "type": "JS Topic",
        "title": "Arrays & Iteration",
        "description": "数组操作、迭代方法与迭代器协议",
        "hint": {
            "keywords": ["Array", "map", "filter", "reduce", "for...of", "spread", "destructuring"],
            "related": ["builtin/array", "syntax/destructuring", "syntax/spread_rest"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
        },
    },

    # ── 具体语法 ──────────────────────────────────────────────────────────
    {
        "id": ("syntax", "let_const"),
        "type": "JS Syntax",
        "title": "let & const",
        "description": "块级作用域变量声明，const 表示不可重新绑定",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["block scope", "TDZ", "temporal dead zone", "immutable binding"],
            "related": ["syntax/var", "topics/variables"],
        },
    },
    {
        "id": ("syntax", "var"),
        "type": "JS Syntax",
        "title": "var declaration",
        "description": "函数作用域变量声明，存在变量提升（hoisting）",
        "hint": {
            "es_version": "ES1",
            "keywords": ["function scope", "hoisting", "global scope"],
            "related": ["syntax/let_const", "topics/variables"],
        },
    },
    {
        "id": ("syntax", "arrow_function"),
        "type": "JS Syntax",
        "title": "Arrow Functions",
        "description": "简洁函数语法，词法 this 绑定，不可用作构造函数",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["=>", "lexical this", "concise body", "implicit return"],
            "related": ["topics/functions", "syntax/default_params"],
        },
    },
    {
        "id": ("syntax", "destructuring"),
        "type": "JS Syntax",
        "title": "Destructuring Assignment",
        "description": "从数组或对象中提取值，赋给变量的简洁语法",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["array destructuring", "object destructuring", "default value", "rename", "nested"],
            "related": ["topics/arrays_and_iteration", "topics/objects_and_classes", "syntax/spread_rest"],
        },
    },
    {
        "id": ("syntax", "spread_rest"),
        "type": "JS Syntax",
        "title": "Spread & Rest Operator (...)",
        "description": "展开运算符用于展开可迭代对象，剩余参数收集多余参数",
        "hint": {
            "es_version": "ES2015/ES2018",
            "keywords": ["...", "spread", "rest params", "shallow copy", "merge objects"],
            "related": ["syntax/destructuring", "topics/arrays_and_iteration"],
        },
    },
    {
        "id": ("syntax", "template_literals"),
        "type": "JS Syntax",
        "title": "Template Literals",
        "description": "反引号字符串，支持插值表达式和多行文本",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["backtick", "interpolation", "${}", "tagged template", "multiline"],
            "related": ["topics/variables"],
        },
    },
    {
        "id": ("syntax", "class"),
        "type": "JS Syntax",
        "title": "Class Syntax",
        "description": "基于原型的 class 语法糖，支持 extends、super、static",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["class", "constructor", "extends", "super", "static", "private field #"],
            "related": ["topics/objects_and_classes", "patterns/prototype_chain"],
        },
    },
    {
        "id": ("syntax", "async_await"),
        "type": "JS Syntax",
        "title": "async / await",
        "description": "基于 Promise 的语法糖，让异步代码看起来像同步代码",
        "hint": {
            "es_version": "ES2017",
            "keywords": ["async function", "await", "error handling", "try/catch", "Promise"],
            "related": ["builtin/promise", "topics/async"],
        },
    },
    {
        "id": ("syntax", "default_params"),
        "type": "JS Syntax",
        "title": "Default Parameters",
        "description": "函数参数默认值，当实参为 undefined 时生效",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["default value", "undefined", "parameters"],
            "related": ["topics/functions", "syntax/arrow_function"],
        },
    },

    # ── 内置对象 ──────────────────────────────────────────────────────────
    {
        "id": ("builtin", "promise"),
        "type": "JS Builtin",
        "title": "Promise",
        "description": "表示异步操作最终结果的对象，支持链式调用",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["resolve", "reject", "then", "catch", "finally", "Promise.all", "Promise.race"],
            "related": ["syntax/async_await", "topics/async"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
        },
    },
    {
        "id": ("builtin", "array"),
        "type": "JS Builtin",
        "title": "Array",
        "description": "有序集合，提供 map/filter/reduce 等高阶方法",
        "hint": {
            "es_version": "ES1+",
            "keywords": ["map", "filter", "reduce", "find", "some", "every", "flat", "forEach", "indexOf"],
            "related": ["topics/arrays_and_iteration", "syntax/destructuring", "syntax/spread_rest"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
        },
    },
    {
        "id": ("builtin", "map_set"),
        "type": "JS Builtin",
        "title": "Map & Set",
        "description": "键值对集合（Map）和唯一值集合（Set），支持任意键类型",
        "hint": {
            "es_version": "ES2015 (ES6)",
            "keywords": ["Map", "Set", "WeakMap", "WeakSet", "has", "get", "set", "delete", "iteration"],
            "related": ["topics/arrays_and_iteration", "topics/objects_and_classes"],
            "mdn": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map",
        },
    },

    # ── 常见模式 ──────────────────────────────────────────────────────────
    {
        "id": ("patterns", "closure"),
        "type": "JS Pattern",
        "title": "Closure",
        "description": "函数与其词法环境的组合，用于数据封装和状态保持",
        "hint": {
            "keywords": ["lexical scope", "encapsulation", "factory function", "module pattern", "memoization"],
            "related": ["topics/variables", "topics/functions", "syntax/let_const"],
        },
    },
    {
        "id": ("patterns", "prototype_chain"),
        "type": "JS Pattern",
        "title": "Prototype Chain",
        "description": "JavaScript 的继承机制，对象通过 __proto__ 链查找属性",
        "hint": {
            "keywords": ["__proto__", "prototype", "Object.create", "hasOwnProperty", "instanceof"],
            "related": ["topics/objects_and_classes", "syntax/class"],
        },
    },
    {
        "id": ("patterns", "async_patterns"),
        "type": "JS Pattern",
        "title": "Async Patterns",
        "description": "常见异步编程模式：并行、串行、竞速、超时处理",
        "hint": {
            "keywords": ["Promise.all", "Promise.allSettled", "Promise.race", "sequential", "parallel", "timeout"],
            "related": ["builtin/promise", "syntax/async_await", "topics/async"],
        },
    },
]


class JSSyntaxSource(Source):
    """JavaScript 基础语法知识源。"""
    name = "js_syntax"

    def __init__(self):
        self._cache: list[ConceptRef] | None = None

    def list_concepts(self) -> list[ConceptRef]:
        if self._cache is not None:
            return self._cache
        self._cache = [
            ConceptRef(
                id=tuple(c["id"]),
                type=c["type"],
                resource=c["hint"].get("mdn"),
                hint=c["hint"],
            )
            for c in _CONCEPTS
        ]
        return self._cache

    def read_concept(self, ref: ConceptRef) -> dict[str, Any]:
        """返回概念的完整元数据，供 LLM 参考生成文档。"""
        # 找到原始定义
        for c in _CONCEPTS:
            if tuple(c["id"]) == ref.id:
                return {
                    "id": ref.id_str,
                    "type": ref.type,
                    "title": c["title"],
                    "description": c["description"],
                    "keywords": c["hint"].get("keywords", []),
                    "related_concepts": c["hint"].get("related", []),
                    "es_version": c["hint"].get("es_version", ""),
                    "mdn_url": c["hint"].get("mdn", ""),
                }
        return {"id": ref.id_str, "type": ref.type}

    def sample_rows(self, ref, n: int = 5):
        """返回该概念的代码示例种子（当作 sample_rows 给 LLM 参考）。"""
        return None  # LLM 自己生成代码示例
