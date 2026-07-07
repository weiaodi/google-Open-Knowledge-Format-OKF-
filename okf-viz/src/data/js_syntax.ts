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
  'depends-on':      '#ef4444',
  'syntactic-sugar': '#8b5cf6',
  'used-with':       '#1456f0',
  'param-pattern':   '#f59e0b',
  'enables':         '#10b981',
}

export interface KGNode {
  id: string
  label: string
  type: NodeType
  color: string
  reads: number          // 阅读次数（热度）
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
  'JS Syntax':  '#3d9fde',
  'JS Builtin': '#52c41a',
  'JS Pattern': '#fa8c16',
}

export const TYPE_BADGE: Record<NodeType, { bg: string; fg: string }> = {
  'JS Syntax':  { bg: '#e6f0ff', fg: '#1456f0' },
  'JS Builtin': { bg: '#e6fff0', fg: '#0d8050' },
  'JS Pattern': { bg: '#fff3e0', fg: '#c75000' },
}

// ─── Nodes ──────────────────────────────────────────────────────────────────
export const NODES: KGNode[] = [
  {
    id: 'async_await', label: 'async / await',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 2140,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
    description: '基于 Promise 的语法糖，让异步代码看起来像同步代码，避免回调地狱。ES2017 引入。',
    tags: ['async function', 'await', 'try/catch', 'Promise', 'ES2017', 'error handling'],
    code: `<span class="kw">async</span> <span class="kw">function</span> <span class="fn">fetchUser</span>(id) {\n  <span class="kw">try</span> {\n    <span class="kw">const</span> res  = <span class="kw">await</span> fetch(\`/api/users/\${id}\`);\n    <span class="kw">const</span> data = <span class="kw">await</span> res.json();\n    <span class="kw">return</span> data;\n  } <span class="kw">catch</span> (err) {\n    console.error(<span class="str">'请求失败:'</span>, err);\n    <span class="kw">return</span> <span class="kw">null</span>;\n  }\n}`,
    keyPoints: [
      '<code>async</code> 函数<strong>总是</strong>返回 Promise，即使 return 普通值',
      '<code>await</code> 暂停当前函数，不阻塞主线程',
      '多个独立 await 默认串行 — 并发用 <code>Promise.all</code>',
      '<code>await</code> 只能在 async 函数内使用',
    ],
    related: [
      { label: 'Promise',         id: 'promise',       desc: 'async/await 的底层机制' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: 'async 箭头函数写法' },
      { label: 'Closure',         id: 'closure',        desc: '回调中利用闭包捕获状态' },
      { label: 'async function',  id: 'async_fn_node',  desc: '声明异步函数的核心语法' },
    ],
    citations: [
      { label: 'MDN: async function', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
      { label: 'MDN: await',          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await' },
    ],
  },
  {
    id: 'promise', label: 'Promise',
    type: 'JS Builtin', color: TYPE_COLOR['JS Builtin'],
    reads: 1580,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
    description: '表示异步操作最终完成或失败的对象，提供链式调用的标准化异步编程模型（ES6 状态机）。',
    tags: ['ES6', 'resolve', 'reject', 'then', 'catch', 'Promise.all', 'Promise.allSettled', '微任务'],
    code: `<span class="cm">// 并发等待多个请求</span>\nPromise.<span class="fn">all</span>([<span class="fn">fetchUser</span>(), <span class="fn">fetchPosts</span>()])\n  .<span class="fn">then</span>(([user, posts]) => {\n    console.<span class="fn">log</span>(user.name, posts.length);\n  })\n  .<span class="fn">catch</span>(err => console.<span class="fn">error</span>(err));`,
    keyPoints: [
      '状态不可逆：pending → fulfilled / rejected',
      '<code>.then()</code> 始终返回新 Promise，支持链式调用',
      '回调在<strong>微任务队列</strong>执行，优先级高于 setTimeout',
      '链尾始终添加 <code>.catch()</code> 处理未捕获 rejection',
    ],
    related: [
      { label: 'async/await',     id: 'async_await',   desc: '基于 Promise 的语法糖' },
      { label: 'Arrow Functions', id: 'arrow_function', desc: '.then() 回调中常用' },
      { label: 'async function',  id: 'async_fn_node',  desc: 'async 函数返回 Promise' },
    ],
    citations: [
      { label: 'MDN: Promise',        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
      { label: 'MDN: Using Promises', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises' },
    ],
  },
  {
    id: 'arrow_function', label: 'Arrow Functions',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 980,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions',
    description: 'ES2015 引入的简洁函数语法，提供词法 this 绑定，不可用作构造函数。',
    tags: ['=>', 'lexical this', 'implicit return', 'ES6', 'callback', 'concise body'],
    code: `<span class="cm">// 词法 this 绑定</span>\n<span class="kw">class</span> <span class="fn">Counter</span> {\n  constructor() { <span class="kw">this</span>.n = 0; }\n  start() {\n    setInterval(<span class="kw">()</span> => {\n      console.log(<span class="kw">this</span>.n++); <span class="cm">// ✅ 正确</span>\n    }, 1000);\n  }\n}`,
    keyPoints: [
      '词法 <code>this</code>：继承定义时的外层作用域',
      '不能作为构造函数（new 报 TypeError）',
      '无 <code>arguments</code> 对象，用 <code>...args</code> 替代',
      '返回对象字面量需括号：<code>() => ({ key: val })</code>',
    ],
    related: [
      { label: 'Closure',        id: 'closure',       desc: '词法 this 通过闭包机制实现' },
      { label: 'async/await',    id: 'async_await',   desc: 'async 箭头函数写法' },
      { label: 'Destructuring',  id: 'destructuring', desc: '参数中常用解构提取值' },
    ],
    citations: [
      { label: 'MDN: Arrow Functions', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions' },
    ],
  },
  {
    id: 'closure', label: 'Closure',
    type: 'JS Pattern', color: TYPE_COLOR['JS Pattern'],
    reads: 1230,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
    description: '函数与其词法环境的组合，用于数据封装和状态保持。JavaScript 最核心特性之一。',
    tags: ['lexical scope', 'encapsulation', 'factory function', 'module pattern', 'memoization'],
    code: `<span class="kw">function</span> <span class="fn">createCounter</span>(init = 0) {\n  <span class="kw">let</span> count = init;\n  <span class="kw">return</span> {\n    increment() { <span class="kw">return</span> ++count; },\n    getValue()  { <span class="kw">return</span> count; },\n  };\n}\n<span class="kw">const</span> c = <span class="fn">createCounter</span>(10);\nc.<span class="fn">increment</span>(); <span class="cm">// 11</span>`,
    keyPoints: [
      '闭包捕获变量<strong>引用</strong>，不是快照',
      '每次函数调用创建独立闭包实例',
      '<code>let</code> 替代 <code>var</code> 避免循环陷阱',
      '<code>this</code> 不属于闭包，需用箭头函数保存',
    ],
    related: [
      { label: 'Arrow Functions', id: 'arrow_function', desc: '词法 this 通过闭包机制实现' },
      { label: 'let / const',     id: 'let_const',      desc: '块级作用域让闭包更可预测' },
    ],
    citations: [
      { label: 'MDN: Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures' },
    ],
  },
  {
    id: 'async_fn_node', label: 'async function',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 760,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
    description: 'async 关键字声明异步函数，内部可使用 await，总是返回一个 Promise 对象。',
    tags: ['async', 'ES2017', 'Promise', 'generator', 'return'],
    code: `<span class="cm">// 总是返回 Promise</span>\n<span class="kw">async</span> <span class="kw">function</span> <span class="fn">decl</span>() {}\n<span class="kw">const</span> arrow = <span class="kw">async</span> () => {};\n<span class="kw">class</span> <span class="fn">Foo</span> { <span class="kw">async</span> <span class="fn">method</span>() {} }\n\n<span class="fn">decl</span>() <span class="kw">instanceof</span> Promise; <span class="cm">// true</span>`,
    keyPoints: [
      '函数体内抛出异常 → 返回 rejected Promise',
      '相当于 Generator + Promise 的语法糖',
      '可以是声明式、表达式、箭头函数或类方法',
    ],
    related: [
      { label: 'async/await', id: 'async_await', desc: 'async/await 完整用法' },
      { label: 'Promise',     id: 'promise',     desc: 'async 函数底层返回类型' },
    ],
    citations: [
      { label: 'MDN: async function', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
    ],
  },
  {
    id: 'destructuring', label: 'Destructuring',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 870,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment',
    description: '解构赋值：从数组或对象中提取值赋给变量，让代码更简洁易读（ES2015）。',
    tags: ['ES6', 'array', 'object', 'default values', 'rest', 'alias'],
    code: `<span class="cm">// 对象解构 + 默认值 + 别名</span>\n<span class="kw">const</span> { name, age = 18, id: userId } = user;\n\n<span class="cm">// 配合 Promise.all 解构多个结果</span>\n<span class="kw">const</span> [user, posts] = <span class="kw">await</span> Promise.<span class="fn">all</span>([\n  <span class="fn">fetchUser</span>(), <span class="fn">fetchPosts</span>()\n]);`,
    keyPoints: [
      '对象解构按<strong>键名</strong>匹配；数组解构按<strong>位置</strong>匹配',
      '可设默认值、重命名（冒号语法）',
      '结合 rest: <code>{ a, ...rest }</code> 提取剩余属性',
    ],
    related: [
      { label: 'Arrow Functions', id: 'arrow_function', desc: '函数参数中常见解构用法' },
      { label: 'async/await',     id: 'async_await',    desc: '配合 Promise.all 解构结果' },
    ],
    citations: [
      { label: 'MDN: Destructuring', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment' },
    ],
  },
  {
    id: 'let_const', label: 'let / const',
    type: 'JS Syntax', color: TYPE_COLOR['JS Syntax'],
    reads: 640,
    resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
    description: 'ES2015 块级作用域变量声明。const 不可重新赋值；let 可变，每次循环创建独立绑定。',
    tags: ['block scope', 'const', 'let', 'TDZ', 'ES6', 'hoisting'],
    code: `<span class="cm">// let 修复循环闭包陷阱</span>\n<span class="kw">for</span> (<span class="kw">let</span> i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n} <span class="cm">// 0, 1, 2 ✅</span>\n\n<span class="kw">const</span> API = <span class="str">'https://api.example.com'</span>;`,
    keyPoints: [
      '<code>const</code> 禁止重新赋值，对象/数组内容仍可修改',
      '暂时性死区（TDZ）：声明前访问报 ReferenceError',
      '优先用 <code>const</code>，需重新赋值才用 <code>let</code>',
    ],
    related: [
      { label: 'Closure', id: 'closure', desc: '块级作用域让闭包行为可预测' },
    ],
    citations: [
      { label: 'MDN: let',   url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' },
      { label: 'MDN: const', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const' },
    ],
  },
]

// ─── Links (with edge type + description) ───────────────────────────────────
export const LINKS: KGLink[] = [
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
]

// ─── Compute in-degree ──────────────────────────────────────────────────────
export function computeInDegree(nodes: KGNode[], links: KGLink[]): KGNode[] {
  const degMap: Record<string, number> = {}
  nodes.forEach(n => { degMap[n.id] = 0 })
  links.forEach(l => { degMap[l.target] = (degMap[l.target] ?? 0) + 1 })
  return nodes.map(n => ({ ...n, inDegree: degMap[n.id] ?? 0 }))
}
