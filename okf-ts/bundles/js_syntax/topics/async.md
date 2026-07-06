---
type: JS Topic
title: Asynchronous JavaScript
description: 事件循环、回调、Promise、async/await 构成的异步编程模型，让 JavaScript 以非阻塞方式处理耗时操作。
tags:
  - event loop
  - callback
  - microtask
  - macrotask
  - non-blocking
  - Promise
  - async/await
resource: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous
timestamp: '2026-07-06T09:37:02.815Z'
---

## 概述

JavaScript 是**单线程**语言，但通过异步编程模型实现了非阻塞（non-blocking）并发。核心思想是：将耗时操作（网络请求、文件读写、定时器等）交给宿主环境（浏览器/Node.js）处理，完成后通过**事件循环（Event Loop）** 将回调任务放回主线程执行。从最早的**回调函数（Callback）**，到 ES6 的 **Promise**，再到 ES2017 的 **async/await**，JavaScript 异步编程经历了从"回调地狱"到"同步风格"的演进。理解事件循环和微任务/宏任务队列是掌握异步编程的关键。

## 事件循环模型

```
┌──────────────────────────────┐
│          Call Stack           │  ← 主线程执行栈
└────────────┬─────────────────┘
             │ 空栈时检查
┌────────────▼─────────────────┐
│       Microtask Queue         │  ← 微任务队列（Promise.then, MutationObserver）
└────────────┬─────────────────┘
             │ 清空微任务后取一个
┌────────────▼─────────────────┐
│       Macrotask Queue         │  ← 宏任务队列（setTimeout, setInterval, I/O）
└──────────────────────────────┘
```

事件循环每次迭代：执行一个宏任务 → 清空所有微任务 → 渲染（浏览器）→ 取下一个宏任务。

## 异步的三种形态

### 1. 回调函数（Callback）

最早期的异步模式，将函数作为参数传入，在操作完成后调用。

```javascript
function fetchData(callback) {
  setTimeout(() => {
    callback('数据已加载');
  }, 1000);
}

fetchData((result) => {
  console.log(result); // 1秒后输出：数据已加载
});
```

**问题**：多层嵌套形成"回调地狱"（Callback Hell）。

```javascript
// ❌ 回调地狱
getUser(id, (user) => {
  getPosts(user.id, (posts) => {
    getComments(posts[0].id, (comments) => {
      console.log(comments);
    });
  });
});
```

### 2. Promise（ES6）

Promise 是一个代表未来完成值的对象。三种状态：`pending`（待定）、`fulfilled`（已完成）、`rejected`（已拒绝）。

```javascript
const fetchData = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = true;
      if (success) {
        resolve('数据已加载');
      } else {
        reject(new Error('加载失败'));
      }
    }, 1000);
  });
};

// 链式调用，告别嵌套
fetchData()
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('完成'));
```

### 3. async/await（ES2017）

语法糖，让异步代码写起来像同步代码。

```javascript
const fetchData = () => new Promise(resolve => {
  setTimeout(() => resolve('数据已加载'), 1000);
});

async function loadData() {
  try {
    const result = await fetchData();
    console.log(result); // 数据已加载
  } catch (error) {
    console.error('出错了:', error);
  }
}

loadData();
```

## 微任务（Microtask）vs 宏任务（Macrotask）

| 类型 | 包含 | 执行时机 |
|------|------|----------|
| **宏任务** | `setTimeout`, `setInterval`, `setImmediate`, I/O, UI 渲染 | 每次事件循环取一个 |
| **微任务** | `Promise.then/catch/finally`, `MutationObserver`, `queueMicrotask` | 当前宏任务结束后、下一个宏任务前，**全部清空** |

```javascript
console.log('1: 同步');

setTimeout(() => console.log('2: 宏任务'), 0);

Promise.resolve().then(() => console.log('3: 微任务'));

console.log('4: 同步');

// 输出顺序：1 → 4 → 3 → 2
// 同步代码最先 → 微任务清空 → 下一个宏任务
```

## 并发模式

### 并行执行（Promise.all）

```javascript
const fetchUser = fetch('/api/user').then(r => r.json());
const fetchPosts = fetch('/api/posts').then(r => r.json());

// 两个请求同时发起，等待全部完成
const [user, posts] = await Promise.all([fetchUser, fetchPosts]);
console.log(user, posts);
```

### 竞速模式（Promise.race）

```javascript
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('请求超时')), 3000)
);

const request = fetch('/api/data').then(r => r.json());

// 请求3秒未完成则超时
try {
  const data = await Promise.race([request, timeout]);
  console.log(data);
} catch (err) {
  console.error('超时或失败:', err.message);
}
```

### 顺序执行

```javascript
// 等上一个完成再执行下一个
const ids = [1, 2, 3];
for (const id of ids) {
  const data = await fetch(`/api/item/${id}`).then(r => r.json());
  console.log(data); // 依次输出
}
```

### 批量并发（Promise.allSettled）

```javascript
const results = await Promise.allSettled([
  fetch('/api/ok'),
  fetch('/api/error'),
  fetch('/api/ok2')
]);

results.forEach((r, i) => {
  if (r.status === 'fulfilled') {
    console.log(`请求 ${i} 成功`);
  } else {
    console.log(`请求 ${i} 失败:`, r.reason);
  }
});
```

## 关键要点

- **JavaScript 是单线程的** — 异步并不等于多线程，而是通过事件循环调度任务。
- **微任务优先于宏任务** — 每次事件循环先清空微任务队列，再取一个宏任务。
- **Promise 状态不可逆** — 一旦 `fulfilled` 或 `rejected`，状态永久锁定。
- **async 函数永远返回 Promise** — 即使 `return 42`，外部拿到的是 `Promise<42>`。
- **await 只能在 async 函数内使用** — 顶层 await 仅在 ES2022 模块中支持。
- **未捕获的 Promise 错误不会抛出** — 务必用 `.catch()` 或 `try/catch` 处理拒绝。

## 常见错误

### 1. 忘记 await 导致拿到 Promise 对象

```javascript
// ❌ 错误
async function getData() {
  const result = fetch('/api/data'); // 忘了 await！result 是 Promise
  console.log(result); // Promise { <pending> }
}

// ✅ 正确
async function getData() {
  const result = await fetch('/api/data');
  const data = await result.json();
  console.log(data);
}
```

### 2. 在 forEach 中使用 async/await 导致并发失控

```javascript
// ❌ 错误：forEach 不会等待 Promise
[1, 2, 3].forEach(async (id) => {
  const data = await fetch(`/api/${id}`);
  console.log(data); // 输出顺序不确定！
});

// ✅ 正确：顺序执行用 for...of
for (const id of [1, 2, 3]) {
  const data = await fetch(`/api/${id}`);
  console.log(data);
}

// ✅ 或真正并行用 Promise.all
await Promise.all([1, 2, 3].map(id => fetch(`/api/${id}`)));
```

### 3. 忽略 Promise 错误导致静默失败

```javascript
// ❌ 错误：没有错误处理
async function risky() {
  const data = await fetch('/api/might-fail');
  // 如果 fetch 失败，错误被吞掉
}

// ✅ 正确：始终处理拒绝
async function safe() {
  try {
    const res = await fetch('/api/might-fail');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('请求失败:', err);
    return null; // 返回降级值
  }
}
```

## 相关概念

- [Promise](../builtin/promise.md) — Promise 对象的完整 API 与链式调用模式
- [async/await](../syntax/async_await.md) — async 函数与 await 表达式的语法详解
- [函数](../topics/functions.md) — 回调函数作为一等公民的基础知识

## 引用

- [MDN: Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)
- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [HTML Standard: Event Loop Processing Model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)
