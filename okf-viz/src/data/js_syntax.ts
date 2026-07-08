// ─── Types ──────────────────────────────────────────────────────────────────

export type NodeType = 'JS Syntax' | 'JS Builtin' | 'JS Pattern'

/** 边的语义类型 */
export type EdgeType =
  | 'depends-on'      // 底层依赖：A 的实现建立在 B 之上
  | 'syntactic-sugar' // 语法糖：A 是 B 的语法糖
  | 'used-with'       // 搭配使用：A 和 B 经常一起出现
  | 'param-pattern'   // 参数模式：A 的参数/回调中常用 B
  | 'enables'         // 使能：A 的特性让 B 成为可能

export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  'depends-on':      '底层依赖',
  'syntactic-sugar': '语法糖',
  'used-with':       '搭配使用',
  'param-pattern':   '参数常用',
  'enables':         '使能',
}

export const EDGE_TYPE_COLOR: Record<EdgeType, string> = {
  'depends-on':      '#e34935',
  'syntactic-sugar': '#6d50d9',
  'used-with':       '#336aea',
  'param-pattern':   '#e07d22',
  'enables':         '#06a35a',
}

export interface KGNode {
  id: string
  label: string
  type: NodeType
  color: string
  reads: number          // 阅读次数（热度）
  year: number           // ES 规范加入年份（用于时间轴快照）
  learnMins: number      // 预估学习分钟数（学习路径用）
  resource: string
  description: string
  tags: string[]
  code: string           // HTML string with syntax highlighting spans
  keyPoints: string[]
  related: Array<{ label: string; id: string; desc: string }>
  citations: Array<{ label: string; url: string }>
  // computed after build
  inDegree?: number
}

export interface KGLink {
  source: string
  target: string
  type: EdgeType
  description: string    // 完整语义描述，点击节点后显示
}

// ─── Node Color Map ─────────────────────────────────────────────────────────
export const TYPE_COLOR: Record<NodeType, string> = {
  'JS Syntax':  '#336aea',
  'JS Builtin': '#06a35a',
  'JS Pattern': '#e07d22',
}

export const TYPE_BADGE: Record<NodeType, { bg: string; fg: string }> = {
  'JS Syntax':  { bg: '#eef3fe', fg: '#336aea' },
  'JS Builtin': { bg: '#e6f7ef', fg: '#06a35a' },
  'JS Pattern': { bg: '#fef4e8', fg: '#e07d22' },
}

// ─── Nodes ──────────────────────────────────────────────────────────────────
export const NODES: KGNode[] = [
  // ── 已有节点（内容扩充）────────────────────────────────────────────────────
  {
    id: 'async_await', label: 'async / await',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 2140, year: 2017, learnMins: 45,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
    description: '基于 Promise 的语法糖，让异步代码看起来像同步代码，避免回调地狱。async 函数总是返回 Promise，await 表达式等待 Promise 状态落定后才继续执行后续代码。ES2017 (ES8) 引入。',
    tags: ['async function', 'await', 'try/catch', 'Promise', 'ES2017', 'error handling', 'serial', 'parallel'],
    code: `<span class="cm">// 串行 vs 并行写法对比</span>
<span class="kw">async</span> <span class="kw">function</span> <span class="fn">serial</span>() {
  <span class="kw">const</span> a = <span class="kw">await</span> <span class="fn">fetchA</span>(); <span class="cm">// 等待 A 完成</span>
  <span class="kw">const</span> b = <span class="kw">await</span> <span class="fn">fetchB</span>(); <span class="cm">// 再等待 B</span>
}

<span class="kw">async</span> <span class="kw">function</span> <span class="fn">parallel</span>() {
  <span class="kw">const</span> [a, b] = <span class="kw">await</span> Promise.<span class="fn">all</span>([<span class="fn">fetchA</span>(), <span class="fn">fetchB</span>()]);
}`,
    keyPoints: [
      '<code>async</code> 函数<strong>总是</strong>返回 Promise，即使 return 普通值',
      '<code>await</code> 暂停当前函数，不阻塞主线程（Event Loop 持续运行）',
      '多个独立 await 默认串行 — 并发用 <code>Promise.all</code> 或 <code>Promise.allSettled</code>',
      '<code>await</code> 只能在 async 函数内使用（顶层 await 需 ESM 模块）',
      'try/catch 捕获 reject — 相当于 <code>.catch()</code>',
      'async 生成器：<code>async function*</code> 结合 <code>for await...of</code> 处理异步流',
    ],
    related: [
      { label: 'Promise',         id: 'promise',       desc: 'async/await 的底层机制' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: 'async 箭头函数写法' },
      { label: 'async function',  id: 'async_fn_node',  desc: '声明异步函数的核心语法' },
      { label: 'Generator',       id: 'generator',      desc: 'async/await 编译后的本质' },
      { label: 'Event Loop',      id: 'event_loop',     desc: 'await 背后的调度机制' },
    ],
    citations: [
      { label: 'MDN: async function', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
      { label: 'MDN: await',          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await' },
      { label: 'ES2017 Spec',         url: 'https://tc39.es/ecma262/#sec-async-function-objects' },
    ],
  },
  {
    id: 'promise', label: 'Promise',
    type: 'JS Builtin', color: TYPE_COLOR['JS Builtin'],
    reads: 1580, year: 2015, learnMins: 60,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
    description: '表示异步操作最终完成或失败的对象，提供链式调用的标准化异步编程模型（ES6 状态机）。Promise 是 JS 异步编程的核心基石，async/await、fetch API、许多 Node.js 内置模块都基于它构建。',
    tags: ['ES6', 'resolve', 'reject', 'then', 'catch', 'Promise.all', 'Promise.allSettled', '微任务', 'Microtask', 'thenable'],
    code: `<span class="cm">// 创建 Promise</span>
<span class="kw">const</span> p = <span class="kw">new</span> Promise((resolve, reject) => {
  setTimeout(() => resolve(<span class="str">'done'</span>), 1000);
});

<span class="cm">// 组合器方法</span>
Promise.<span class="fn">allSettled</span>([p1, p2]).then(results =>
  results.forEach(r => console.log(r.status))
);

<span class="cm">// Promise.race — 最先完成的获胜</span>
Promise.<span class="fn">race</span>([<span class="fn">fetch</span>(url), <span class="fn">timeout</span>(5000)]);`,
    keyPoints: [
      '状态不可逆：pending → fulfilled / rejected，一旦落定无法更改',
      '<code>.then()</code> 始终返回<strong>新</strong> Promise，支持链式调用',
      '回调在<strong>微任务队列</strong>（Microtask Queue）执行，优先级高于 setTimeout',
      '链尾始终添加 <code>.catch()</code> 处理未捕获 rejection',
      '<code>Promise.all</code> — 全部成功才 resolve；<code>Promise.allSettled</code> — 全部落定才 resolve',
      '<code>Promise.any</code> — 第一个成功就 resolve；<code>Promise.race</code> — 第一个落定就 settle',
    ],
    related: [
      { label: 'async/await',     id: 'async_await',   desc: '基于 Promise 的语法糖' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: '.then() 回调中常用' },
      { label: 'async function',  id: 'async_fn_node',  desc: 'async 函数返回 Promise' },
      { label: 'Event Loop',      id: 'event_loop',     desc: 'Promise 回调进入微任务队列' },
    ],
    citations: [
      { label: 'MDN: Promise',        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
      { label: 'MDN: Using Promises', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises' },
    ],
  },
  {
    id: 'arrow_function', label: 'Arrow Functions',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 980, year: 2015, learnMins: 30,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions',
    description: 'ES2015 引入的简洁函数语法，提供词法 this 绑定，不可用作构造函数。是现代 JS 中最常用的函数书写方式，广泛出现在回调、高阶函数、React 组件等场景。',
    tags: ['=>', 'lexical this', 'implicit return', 'ES6', 'callback', 'concise body', 'higher-order'],
    code: `<span class="cm">// 词法 this 绑定</span>
<span class="kw">class</span> <span class="fn">Counter</span> {
  constructor() { <span class="kw">this</span>.n = 0; }
  start() {
    setInterval(<span class="kw">()</span> => {
      console.log(<span class="kw">this</span>.n++); <span class="cm">// ✅ 正确</span>
    }, 1000);
  }
}

<span class="cm">// 隐式返回对象</span>
<span class="kw">const</span> toPoint = (x, y) => ({ x, y });`,
    keyPoints: [
      '词法 <code>this</code>：继承定义时的外层作用域，不随调用方式改变',
      '不能作为构造函数（<code>new</code> 报 TypeError）',
      '无 <code>arguments</code> 对象，用 <code>...args</code> 替代',
      '返回对象字面量需括号：<code>() => ({ key: val })</code>',
      '适合高阶函数：<code>arr.map(x => x * 2)</code>',
    ],
    related: [
      { label: 'Closure',        id: 'closure',       desc: '词法 this 通过闭包机制实现' },
      { label: 'async/await',    id: 'async_await',   desc: 'async 箭头函数写法' },
      { label: 'Destructuring',  id: 'destructuring', desc: '参数中常用解构提取值' },
      { label: 'Prototype Chain', id: 'prototype',    desc: '箭头函数无 prototype 属性' },
    ],
    citations: [
      { label: 'MDN: Arrow Functions', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions' },
    ],
  },
  {
    id: 'closure', label: 'Closure',
    type: 'JS Pattern', color: TYPE_COLOR['JS Pattern'],
    reads: 1230, year: 2009, learnMins: 90,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
    description: '函数与其词法环境的组合，用于数据封装和状态保持。JavaScript 最核心特性之一，也是模块模式、偏函数、memoization 等高级模式的基础。',
    tags: ['lexical scope', 'encapsulation', 'factory function', 'module pattern', 'memoization', 'partial application'],
    code: `<span class="cm">// 工厂函数 + 私有状态</span>
<span class="kw">function</span> <span class="fn">createCounter</span>(init = 0) {
  <span class="kw">let</span> count = init; <span class="cm">// 私有变量</span>
  <span class="kw">return</span> {
    increment() { <span class="kw">return</span> ++count; },
    reset()     { count = init; },
    getValue()  { <span class="kw">return</span> count; },
  };
}

<span class="cm">// Memoization</span>
<span class="kw">function</span> <span class="fn">memoize</span>(fn) {
  <span class="kw">const</span> cache = <span class="kw">new</span> Map();
  <span class="kw">return</span> (...args) => {
    <span class="kw">const</span> key = JSON.<span class="fn">stringify</span>(args);
    <span class="kw">if</span> (!cache.<span class="fn">has</span>(key)) cache.<span class="fn">set</span>(key, <span class="fn">fn</span>(...args));
    <span class="kw">return</span> cache.<span class="fn">get</span>(key);
  };
}`,
    keyPoints: [
      '闭包捕获变量<strong>引用</strong>，不是快照（注意 var 循环陷阱）',
      '每次函数调用创建独立闭包实例，互不干扰',
      '<code>let</code> 替代 <code>var</code> 在循环中创建独立绑定，避免经典陷阱',
      '<code>this</code> 不属于闭包，需用箭头函数或 <code>.bind()</code> 保存',
      '过度使用闭包持有大对象引用会导致内存泄漏',
    ],
    related: [
      { label: 'Arrow Functions', id: 'arrow_function', desc: '词法 this 通过闭包机制实现' },
      { label: 'let / const',     id: 'let_const',      desc: '块级作用域让闭包更可预测' },
      { label: 'Map / Set',       id: 'map_set',        desc: 'memoize 模式常用 Map 作缓存' },
      { label: 'Prototype Chain', id: 'prototype',      desc: '闭包是封装的另一种途径' },
    ],
    citations: [
      { label: 'MDN: Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures' },
    ],
  },
  {
    id: 'async_fn_node', label: 'async function',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 760, year: 2017, learnMins: 20,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
    description: 'async 关键字声明异步函数，内部可使用 await，总是返回一个 Promise 对象。可用于函数声明、函数表达式、箭头函数和类方法四种形式。',
    tags: ['async', 'ES2017', 'Promise', 'generator', 'return', 'async arrow', 'class method'],
    code: `<span class="cm">// 四种声明形式</span>
<span class="kw">async</span> <span class="kw">function</span> <span class="fn">declaration</span>() {}
<span class="kw">const</span> expr  = <span class="kw">async</span> <span class="kw">function</span>() {};
<span class="kw">const</span> arrow = <span class="kw">async</span> () => {};
<span class="kw">class</span> <span class="fn">Foo</span> { <span class="kw">async</span> <span class="fn">method</span>() {} }

<span class="fn">declaration</span>() <span class="kw">instanceof</span> Promise; <span class="cm">// true</span>`,
    keyPoints: [
      '函数体内抛出异常 → 返回 rejected Promise',
      '相当于 Generator + Promise 自动执行器的语法糖',
      '可以是声明式、表达式、箭头函数或类方法',
      '顶层 await（无需 async 包裹）仅在 ES Module 中可用',
    ],
    related: [
      { label: 'async/await', id: 'async_await', desc: 'async/await 完整用法' },
      { label: 'Promise',     id: 'promise',     desc: 'async 函数底层返回类型' },
      { label: 'Generator',   id: 'generator',   desc: 'async function 是 Generator 的语法糖' },
    ],
    citations: [
      { label: 'MDN: async function', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
    ],
  },
  {
    id: 'destructuring', label: 'Destructuring',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 870, year: 2015, learnMins: 35,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment',
    description: '解构赋值：从数组或对象中提取值赋给变量，让代码更简洁易读（ES2015）。在函数参数、模块导入、Promise.all 结果处理中大量使用。',
    tags: ['ES6', 'array', 'object', 'default values', 'rest', 'alias', 'swap', 'import'],
    code: `<span class="cm">// 对象解构 + 默认值 + 别名</span>
<span class="kw">const</span> { name, age = 18, id: userId } = user;

<span class="cm">// 配合 Promise.all 解构多个结果</span>
<span class="kw">const</span> [user, posts] = <span class="kw">await</span> Promise.<span class="fn">all</span>([
  <span class="fn">fetchUser</span>(), <span class="fn">fetchPosts</span>()
]);

<span class="cm">// 函数参数解构</span>
<span class="kw">const</span> greet = ({ name, role = <span class="str">'user'</span> }) =>
  \`Hello \${name} (\${role})\`;`,
    keyPoints: [
      '对象解构按<strong>键名</strong>匹配；数组解构按<strong>位置</strong>匹配',
      '可设默认值（undefined 时生效，null 不生效）',
      '重命名：<code>{ original: alias }</code>',
      'rest 收集剩余：<code>const { a, ...rest } = obj</code>',
      '嵌套解构：<code>const { address: { city } } = user</code>',
    ],
    related: [
      { label: 'Arrow Functions', id: 'arrow_function', desc: '函数参数中常见解构用法' },
      { label: 'async/await',     id: 'async_await',    desc: '配合 Promise.all 解构结果' },
      { label: 'ES Modules',      id: 'esm',            desc: 'import { a, b } 是对象解构的语法' },
    ],
    citations: [
      { label: 'MDN: Destructuring', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment' },
    ],
  },
  {
    id: 'let_const', label: 'let / const',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 640, year: 2015, learnMins: 20,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
    description: 'ES2015 块级作用域变量声明。const 不可重新赋值；let 可变，每次循环创建独立绑定，是修复循环闭包陷阱的核心工具。',
    tags: ['block scope', 'const', 'let', 'TDZ', 'ES6', 'hoisting', 'temporal dead zone'],
    code: `<span class="cm">// let 修复循环闭包陷阱</span>
<span class="kw">for</span> (<span class="kw">let</span> i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
} <span class="cm">// 0, 1, 2 ✅</span>

<span class="cm">// const 对象属性可变</span>
<span class="kw">const</span> user = { name: <span class="str">'Alice'</span> };
user.name = <span class="str">'Bob'</span>; <span class="cm">// ✅ 属性可修改</span>
<span class="cm">// user = {};    // ❌ 重新赋值报错</span>`,
    keyPoints: [
      '<code>const</code> 禁止重新赋值，但对象/数组内容仍可修改',
      '暂时性死区（TDZ）：声明前访问报 ReferenceError，不会 undefined',
      '<code>let</code> 在循环中每次迭代创建新绑定，修复 var 闭包陷阱',
      '优先用 <code>const</code>，需要重新赋值才用 <code>let</code>，避免 <code>var</code>',
    ],
    related: [
      { label: 'Closure',  id: 'closure', desc: '块级作用域让闭包行为可预测' },
      { label: 'Prototype Chain', id: 'prototype', desc: 'var 声明提升到函数作用域，了解作用域链差异' },
    ],
    citations: [
      { label: 'MDN: let',   url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' },
      { label: 'MDN: const', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const' },
    ],
  },

  // ── 新增节点 ─────────────────────────────────────────────────────────────────
  {
    id: 'event_loop', label: 'Event Loop',
    type: 'JS Builtin', color: TYPE_COLOR['JS Builtin'],
    reads: 1820, year: 2009, learnMins: 75,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
    description: 'JavaScript 运行时的核心调度机制。单线程模型下通过调用栈、任务队列（Macrotask）和微任务队列（Microtask）协调同步/异步代码执行顺序，是理解所有异步行为的基础。',
    tags: ['call stack', 'task queue', 'microtask', 'macrotask', 'setTimeout', 'requestAnimationFrame', 'queueMicrotask', 'non-blocking'],
    code: `<span class="cm">// 执行顺序演示</span>
console.log(<span class="str">'1 同步'</span>);

setTimeout(() => console.log(<span class="str">'3 宏任务'</span>), 0);

Promise.<span class="fn">resolve</span>().<span class="fn">then</span>(() =>
  console.log(<span class="str">'2 微任务'</span>)
);

console.log(<span class="str">'1 同步（继续）'</span>);
<span class="cm">// 输出: 1同步 → 1同步继续 → 2微任务 → 3宏任务</span>`,
    keyPoints: [
      'Call Stack 执行完毕后，先清空<strong>所有</strong>微任务，再取一个宏任务',
      'Promise.then / queueMicrotask / MutationObserver → 微任务',
      'setTimeout / setInterval / I/O / requestAnimationFrame → 宏任务',
      '浏览器每帧（~16ms）在宏任务间隙执行渲染',
      '长同步任务会阻塞渲染，考虑用 setTimeout(0) 或 Worker 拆分',
    ],
    related: [
      { label: 'Promise',     id: 'promise',     desc: '.then() 回调进入微任务队列' },
      { label: 'async/await', id: 'async_await', desc: 'await 背后的 Event Loop 调度' },
      { label: 'Generator',   id: 'generator',   desc: 'Generator 暂停与 Event Loop 协作' },
    ],
    citations: [
      { label: 'MDN: Event Loop',          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop' },
      { label: 'What the heck is Event Loop? (talk)', url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ' },
    ],
  },
  {
    id: 'generator', label: 'Generator',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 690, year: 2015, learnMins: 80,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*',
    description: 'function* 声明的特殊函数，通过 yield 暂停/恢复执行，返回 Iterator 对象。是 async/await 的底层实现机制，也是惰性序列、协程、Redux-Saga 等模式的基础。',
    tags: ['function*', 'yield', 'iterator', 'iterable', 'lazy', 'co', 'saga', 'ES6', 'coroutine'],
    code: `<span class="cm">// 无限惰性序列</span>
<span class="kw">function</span>* <span class="fn">range</span>(start = 0, step = 1) {
  <span class="kw">let</span> i = start;
  <span class="kw">while</span> (<span class="kw">true</span>) <span class="kw">yield</span> (i += step);
}

<span class="kw">const</span> evens = <span class="fn">range</span>(0, 2);
evens.<span class="fn">next</span>().value; <span class="cm">// 2</span>
evens.<span class="fn">next</span>().value; <span class="cm">// 4</span>

<span class="cm">// for...of 消费</span>
<span class="kw">for</span> (<span class="kw">const</span> n <span class="kw">of</span> <span class="fn">range</span>(1, 1)) {
  <span class="kw">if</span> (n > 5) <span class="kw">break</span>;
  console.log(n); <span class="cm">// 1 2 3 4 5</span>
}`,
    keyPoints: [
      '<code>yield</code> 暂停函数，<code>next(value)</code> 恢复并传入值',
      'Generator 函数返回 Iterator，同时也是 Iterable',
      '<code>yield*</code> 委托给另一个 Iterable',
      'async/await 本质是：Generator + Promise + 自动 runner（co 库思路）',
      '<code>return(value)</code> 提前终止；<code>throw(err)</code> 注入异常',
    ],
    related: [
      { label: 'async function', id: 'async_fn_node', desc: 'async function 是 Generator 的语法糖' },
      { label: 'async/await',    id: 'async_await',   desc: 'async/await 编译后的本质' },
      { label: 'Event Loop',     id: 'event_loop',    desc: 'Generator 暂停与 Event Loop 协作' },
    ],
    citations: [
      { label: 'MDN: function*',  url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*' },
      { label: 'MDN: Iterators and generators', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators' },
    ],
  },
  {
    id: 'esm', label: 'ES Modules',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 1050, year: 2015, learnMins: 40,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules',
    description: 'ECMAScript 官方模块系统（ES6）。通过 import/export 静态声明依赖，支持 Tree Shaking、循环依赖处理和动态导入（import()）。是浏览器原生模块化的标准方案。',
    tags: ['import', 'export', 'default export', 'named export', 'dynamic import', 'tree shaking', 'ES6', 'module scope', 'strict mode'],
    code: `<span class="cm">// math.js</span>
<span class="kw">export const</span> PI = 3.14159;
<span class="kw">export function</span> <span class="fn">add</span>(a, b) { <span class="kw">return</span> a + b; }
<span class="kw">export default class</span> <span class="fn">Calculator</span> {}

<span class="cm">// main.js</span>
<span class="kw">import</span> Calculator, { PI, add <span class="kw">as</span> sum } <span class="kw">from</span> <span class="str">'./math.js'</span>;

<span class="cm">// 动态导入（懒加载）</span>
<span class="kw">const</span> { heavy } = <span class="kw">await</span> <span class="kw">import</span>(<span class="str">'./heavy.js'</span>);`,
    keyPoints: [
      'ESM 是<strong>静态</strong>分析的，import 必须在顶层（不能在 if/function 内）',
      '模块有自己的作用域，顶层变量不污染全局',
      '自动开启严格模式（use strict）',
      '动态 <code>import()</code> 返回 Promise，支持代码分割',
      '循环依赖：ESM 能处理，但初始化顺序需注意',
      'Tree Shaking：打包工具可移除未使用的 export',
    ],
    related: [
      { label: 'Destructuring', id: 'destructuring', desc: 'import { a, b } 语法借鉴对象解构' },
      { label: 'async/await',   id: 'async_await',   desc: '顶层 await 仅在 ESM 中可用' },
      { label: 'Closure',       id: 'closure',       desc: '模块作用域是闭包的工业级实现' },
    ],
    citations: [
      { label: 'MDN: JavaScript Modules', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules' },
      { label: 'ES2015 Module Spec',      url: 'https://tc39.es/ecma262/#sec-modules' },
    ],
  },
  {
    id: 'prototype', label: 'Prototype Chain',
    type: 'JS Pattern', color: TYPE_COLOR['JS Pattern'],
    reads: 1420, year: 2009, learnMins: 100,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain',
    description: 'JavaScript 的继承机制基础。每个对象有一个内部 [[Prototype]] 指向其原型，属性查找沿原型链向上，直到 null。class 语法是原型链的语法糖，理解原型链是理解 JS OOP 的关键。',
    tags: ['__proto__', 'prototype', 'Object.create', 'class', 'inheritance', 'OOP', 'hasOwnProperty', 'ES6 class'],
    code: `<span class="cm">// 原型链查找</span>
<span class="kw">const</span> animal = { breathe() { console.log(<span class="str">'...'</span>); } };
<span class="kw">const</span> dog    = Object.<span class="fn">create</span>(animal);
dog.<span class="fn">breathe</span>(); <span class="cm">// 沿原型链找到 animal.breathe</span>

<span class="cm">// class 是语法糖</span>
<span class="kw">class</span> <span class="fn">Animal</span> {
  <span class="fn">breathe</span>() {}
}
<span class="kw">class</span> <span class="fn">Dog</span> <span class="kw">extends</span> <span class="fn">Animal</span> {
  <span class="fn">bark</span>() {}
}
Object.<span class="fn">getPrototypeOf</span>(Dog.prototype) === Animal.prototype; <span class="cm">// true</span>`,
    keyPoints: [
      '属性查找：先自身 → 原型 → 原型的原型 → Object.prototype → null',
      '<code>class extends</code> 是设置原型链的语法糖',
      '<code>Object.create(null)</code> 创建无原型对象（纯字典）',
      '<code>hasOwnProperty</code> 只检查自身属性，排除原型链',
      '箭头函数无 <code>prototype</code> 属性，不能用 new',
    ],
    related: [
      { label: 'Closure',         id: 'closure',       desc: '闭包是封装私有状态的替代方案' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: '箭头函数无 prototype，不能作构造函数' },
    ],
    citations: [
      { label: 'MDN: Prototype Chain', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain' },
    ],
  },
  {
    id: 'map_set', label: 'Map / Set',
    type: 'JS Builtin', color: TYPE_COLOR['JS Builtin'],
    reads: 820, year: 2015, learnMins: 30,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
    description: 'ES6 内置集合类型。Map 是任意键类型的键值对集合（有序，O(1) 查找）；Set 是不重复值的集合。相比对象更适合频繁增删的场景，WeakMap/WeakSet 提供弱引用版本避免内存泄漏。',
    tags: ['Map', 'Set', 'WeakMap', 'WeakSet', 'ES6', 'iterable', 'has', 'delete', 'size', 'dedup'],
    code: `<span class="cm">// Map — 任意键类型</span>
<span class="kw">const</span> cache = <span class="kw">new</span> Map();
cache.<span class="fn">set</span>(objKey, heavyData);
cache.<span class="fn">get</span>(objKey);

<span class="cm">// Set — 去重</span>
<span class="kw">const</span> unique = [...<span class="kw">new</span> Set([1, 2, 2, 3])]; <span class="cm">// [1,2,3]</span>

<span class="cm">// WeakMap — 对象私有数据，不阻止 GC</span>
<span class="kw">const</span> privateData = <span class="kw">new</span> WeakMap();
privateData.<span class="fn">set</span>(<span class="kw">this</span>, { secret: 42 });`,
    keyPoints: [
      'Map 键可以是<strong>任意值</strong>（对象、函数、NaN），对象键只能是字符串/Symbol',
      'Map 保留插入顺序，可用 for...of 迭代',
      'Set 值唯一，可快速判重（<code>has()</code> 是 O(1)）',
      'WeakMap/WeakSet 键必须是对象，不阻止垃圾回收，适合私有数据缓存',
      '<code>Map.size</code> vs 对象的 <code>Object.keys().length</code>',
    ],
    related: [
      { label: 'Closure',    id: 'closure',    desc: 'Map 常在闭包中用作缓存容器' },
      { label: 'Generator',  id: 'generator',  desc: 'Map/Set 都是可迭代对象，可与 Generator 配合' },
      { label: 'Proxy',      id: 'proxy',      desc: 'Proxy 可拦截 Map-like 对象的访问' },
    ],
    citations: [
      { label: 'MDN: Map', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map' },
      { label: 'MDN: Set', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set' },
    ],
  },
  {
    id: 'proxy', label: 'Proxy / Reflect',
    type: 'JS Builtin', color: TYPE_COLOR['JS Builtin'],
    reads: 540, year: 2015, learnMins: 60,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy',
    description: 'Proxy 允许拦截并自定义对象的基本操作（get/set/has/delete 等）；Reflect 提供与 Proxy 陷阱一一对应的静态方法，用于转发默认行为。是 Vue 3 响应式系统、ORM 验证等的核心机制。',
    tags: ['Proxy', 'Reflect', 'trap', 'handler', 'get', 'set', 'has', 'Vue 3', 'reactive', 'validation', 'ES6'],
    code: `<span class="cm">// 属性访问拦截 + 验证</span>
<span class="kw">const</span> validator = <span class="kw">new</span> Proxy({}, {
  <span class="fn">set</span>(target, key, value) {
    <span class="kw">if</span> (key === <span class="str">'age'</span> && <span class="kw">typeof</span> value !== <span class="str">'number'</span>)
      <span class="kw">throw</span> <span class="kw">new</span> TypeError(<span class="str">'age 必须是数字'</span>);
    <span class="kw">return</span> Reflect.<span class="fn">set</span>(target, key, value);
  },
  <span class="fn">get</span>(target, key) {
    <span class="kw">return</span> key <span class="kw">in</span> target
      ? Reflect.<span class="fn">get</span>(target, key)
      : <span class="str">\`属性 \${key} 不存在\`</span>;
  },
});`,
    keyPoints: [
      'Proxy 包裹目标对象，不修改原对象',
      '共 13 种 trap：get/set/has/deleteProperty/apply/construct 等',
      'Reflect 方法与 trap 一一对应，用于安全转发默认行为',
      'Vue 3 的响应式（reactive）就是 Proxy 实现的依赖追踪',
      '无法代理不可扩展对象（frozen）的部分操作',
    ],
    related: [
      { label: 'Prototype Chain', id: 'prototype', desc: 'Proxy 可拦截原型链查找（getPrototypeOf trap）' },
      { label: 'Map / Set',       id: 'map_set',   desc: 'WeakMap 是 Proxy 私有数据的替代方案' },
    ],
    citations: [
      { label: 'MDN: Proxy',   url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy' },
      { label: 'MDN: Reflect', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect' },
    ],
  },
  {
    id: 'spread_rest', label: 'Spread / Rest',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 760, year: 2015, learnMins: 25,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
    description: 'Spread（...）将可迭代对象展开为独立元素；Rest 收集剩余参数为数组。ES2015 引入，ES2018 扩展至对象。是函数式风格、不可变更新的核心语法。',
    tags: ['...', 'spread', 'rest', 'ES6', 'immutable', 'shallow copy', 'variadic', 'ES2018 object spread'],
    code: `<span class="cm">// Spread — 展开</span>
<span class="kw">const</span> arr2 = [...arr1, 4, 5];       <span class="cm">// 数组浅拷贝+扩展</span>
<span class="kw">const</span> obj2 = { ...obj1, name: <span class="str">'B'</span> }; <span class="cm">// 对象浅合并（ES2018）</span>
<span class="fn">fn</span>(...args);                         <span class="cm">// 展开为参数</span>

<span class="cm">// Rest — 收集</span>
<span class="kw">function</span> <span class="fn">sum</span>(first, ...rest) {
  <span class="kw">return</span> rest.<span class="fn">reduce</span>((acc, n) => acc + n, first);
}`,
    keyPoints: [
      'Spread 是<strong>浅拷贝</strong>，嵌套对象仍共享引用',
      'Rest 参数必须是最后一个，且每个函数只能有一个',
      '对象 Spread 后面的属性会覆盖前面的（同名键）',
      '<code>Math.max(...arr)</code> 替代 <code>apply</code> 写法',
      '与解构结合：<code>const [first, ...tail] = arr</code>',
    ],
    related: [
      { label: 'Destructuring', id: 'destructuring', desc: 'rest 是解构的收集模式' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: '箭头函数用 rest 替代 arguments 对象' },
    ],
    citations: [
      { label: 'MDN: Spread syntax', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax' },
      { label: 'MDN: Rest parameters', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters' },
    ],
  },
]

// ─── Links (with edge type + description) ───────────────────────────────────
export const LINKS: KGLink[] = [
  // 原有边
  {
    source: 'async_await', target: 'promise',
    type: 'syntactic-sugar',
    description: 'async/await 是 Promise 的语法糖，底层完全基于 Promise 状态机，await 表达式会等待 Promise resolve/reject。',
  },
  {
    source: 'async_await', target: 'async_fn_node',
    type: 'depends-on',
    description: 'async/await 语法必须配合 async function 关键字使用，async function 是其声明载体。',
  },
  {
    source: 'async_await', target: 'arrow_function',
    type: 'used-with',
    description: 'async 箭头函数（async () => {}）是常见写法，在 Promise 链和事件回调中大量出现。',
  },
  {
    source: 'async_await', target: 'closure',
    type: 'used-with',
    description: '异步函数中经常通过闭包捕获外部变量（如请求参数、状态标志），在 await 前后保持引用。',
  },
  {
    source: 'async_await', target: 'destructuring',
    type: 'param-pattern',
    description: 'await Promise.all([...]) 的结果通常用解构赋值提取：const [a, b] = await Promise.all([...])。',
  },
  {
    source: 'promise', target: 'arrow_function',
    type: 'param-pattern',
    description: 'Promise 的 .then()/.catch() 回调几乎都用箭头函数书写，利用词法 this 避免 this 指向问题。',
  },
  {
    source: 'closure', target: 'arrow_function',
    type: 'enables',
    description: '箭头函数的词法 this 绑定本质上是闭包机制的应用：函数捕获定义时所在作用域的 this 引用。',
  },
  {
    source: 'arrow_function', target: 'destructuring',
    type: 'param-pattern',
    description: '箭头函数参数中常用解构语法直接提取所需字段：({ name, age }) => `${name} is ${age}`。',
  },
  {
    source: 'closure', target: 'let_const',
    type: 'depends-on',
    description: 'let/const 的块级作用域使循环内的闭包行为可预测（每次迭代创建独立绑定），是现代闭包正确运行的基础。',
  },

  // 新增边
  {
    source: 'async_fn_node', target: 'generator',
    type: 'syntactic-sugar',
    description: 'async function 本质上是 Generator + Promise 自动执行器的语法糖，Babel 编译 async 代码可看到等效 Generator 实现。',
  },
  {
    source: 'promise', target: 'event_loop',
    type: 'depends-on',
    description: 'Promise 的回调（.then/.catch）在微任务队列中执行，其调度顺序完全由 Event Loop 决定。',
  },
  {
    source: 'async_await', target: 'event_loop',
    type: 'depends-on',
    description: 'await 暂停函数的背后是 Event Loop：当前 microtask 完成后，Event Loop 才恢复 async 函数的执行。',
  },
  {
    source: 'generator', target: 'event_loop',
    type: 'used-with',
    description: 'Generator 的暂停/恢复机制与 Event Loop 协作，早期的 co 库通过 Generator + Promise 模拟了 async/await 行为。',
  },
  {
    source: 'destructuring', target: 'esm',
    type: 'enables',
    description: 'ES Modules 的 import { a, b } 语法借鉴了对象解构，理解解构有助于理解命名导入的语义。',
  },
  {
    source: 'closure', target: 'esm',
    type: 'enables',
    description: 'ES Module 的模块作用域本质上是一个模块级闭包，模块内顶层变量对外不可见，只通过 export 暴露。',
  },
  {
    source: 'closure', target: 'prototype',
    type: 'used-with',
    description: '闭包与原型链是 JS 两大封装机制：闭包通过函数作用域实现私有状态，原型链通过对象链实现方法共享。',
  },
  {
    source: 'prototype', target: 'arrow_function',
    type: 'used-with',
    description: '箭头函数没有 prototype 属性，不能作为构造函数使用 new，理解原型链有助于理解为何箭头函数有此限制。',
  },
  {
    source: 'closure', target: 'map_set',
    type: 'used-with',
    description: 'Map 和 WeakMap 常在闭包中用作缓存或私有数据容器，WeakMap 特别适合关联到外部对象而不阻止垃圾回收。',
  },
  {
    source: 'proxy', target: 'prototype',
    type: 'used-with',
    description: 'Proxy 的 getPrototypeOf/setPrototypeOf trap 可拦截原型链相关操作，代理对象与原型链交互需特别注意。',
  },
  {
    source: 'destructuring', target: 'spread_rest',
    type: 'used-with',
    description: '解构与 rest/spread 常配合使用：const { a, ...rest } = obj 中的 ...rest 就是 rest 收集模式。',
  },
  {
    source: 'arrow_function', target: 'spread_rest',
    type: 'param-pattern',
    description: '箭头函数使用 rest 参数替代 arguments 对象：const fn = (...args) => args.reduce(...)。',
  },
  {
    source: 'generator', target: 'map_set',
    type: 'used-with',
    description: 'Map/Set 都是可迭代对象，可直接与 Generator、for...of、Spread 协作使用。',
  },
]

// ─── Compute in-degree ──────────────────────────────────────────────────────
export function computeInDegree(nodes: KGNode[], links: KGLink[]): KGNode[] {
  const degMap: Record<string, number> = {}
  nodes.forEach(n => { degMap[n.id] = 0 })
  links.forEach(l => { degMap[l.target] = (degMap[l.target] ?? 0) + 1 })
  return nodes.map(n => ({ ...n, inDegree: degMap[n.id] ?? 0 }))
}
