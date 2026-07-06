---
type: JS Topic
resource: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous
title: Asynchronous JavaScript
description: Promise、async/await 及事件循环机制——JavaScript 异步编程的核心概念与执行模型
tags:
- Promise
- async
- await
- callback
- event loop
- microtask
- macrotask
timestamp: '2026-07-05T14:28:46+00:00'
---

JavaScript 是**单线程**语言，这意味着它同一时间只能执行一段代码。但通过**事件循环（Event Loop）**和**异步 API**，JavaScript 可以高效地处理 I/O 操作、网络请求和定时器等耗时任务，而不会阻塞主线程。异步编程是 JavaScript 运行时的核心机制，理解它对于写出高性能、无阻塞的代码至关重要。

从最早的**回调函数（Callback）**，到 ES2015 的 **Promise**，再到 ES2017 的 **async/await**，JavaScript 的异步编程语法不断演进，让异步代码的可读性和可维护性大幅提升。

## Syntax

异步编程没有单一的语法，而是由多种模式构成。以下列出核心的异步表达式形态：

```javascript
// 1. 回调模式（Callback）
setTimeout(() => { console.log('延迟执行'); }, 1000);
fs.readFile('file.txt', (err, data) => { /* 处理结果 */ });

// 2. Promise 链
fetch(url)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// 3. async/await（语法糖，底层仍是 Promise）
async function loadData() {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
```

## Examples

### 示例 1：从回调到 Promise 的演进

```javascript
// 回调地狱（Callback Hell）—— 难以维护
function getUserCallback(userId, callback) {
  setTimeout(() => {
    callback({ id: userId, name: 'Alice' });
  }, 100);
}
function getPostsCallback(user, callback) {
  setTimeout(() => {
    callback(['Post 1', 'Post 2']);
  }, 100);
}

// 嵌套层级越来越深，错误处理混乱
getUserCallback(1, (user) => {
  getPostsCallback(user, (posts) => {
    console.log(user.name, posts); // Alice ['Post 1', 'Post 2']
  });
});

// Promise 版本 —— 扁平化链式调用
function getUserPromise(userId) {
  return new Promise(resolve => {
    setTimeout(() => resolve({ id: userId, name: 'Alice' }), 100);
  });
}
function getPostsPromise(user) {
  return new Promise(resolve => {
    setTimeout(() => resolve(['Post 1', 'Post 2']), 100);
  });
}

getUserPromise(1)
  .then(user => getPostsPromise(user))
  .then(posts => console.log('Promise 链:', posts))
  .catch(err => console.error(err));
```

### 示例 2：async/await —— 以同步方式写异步代码

```javascript
// async/await 让异步读起来像同步代码
async function loadUserProfile(userId) {
  try {
    const user = await getUserPromise(userId);
    const posts = await getPostsPromise(user);
    console.log(`${user.name} 的帖子:`, posts);
    return { user, posts };
  } catch (err) {
    console.error('加载失败:', err);
    throw err; // 重新抛出，让调用者继续处理
  }
}

// 顶层 await（现代 JavaScript / 模块中可用）
// const profile = await loadUserProfile(1);
```

### 示例 3：事件循环 —— 理解执行顺序

```javascript
console.log('1: 同步代码 start');

setTimeout(() => {
  console.log('2: macrotask（宏任务）');
}, 0);

Promise.resolve().then(() => {
  console.log('3: microtask（微任务）');
});

console.log('4: 同步代码 end');

// 输出顺序：
// 1: 同步代码 start
// 4: 同步代码 end
// 3: microtask（微任务）
// 2: macrotask（宏任务）
// 注意：每个宏任务执行完后，会清空所有微任务队列，再取下一个宏任务
```

### 示例 4：并行 vs 串行

```javascript
// 串行执行 —— 逐个等待
async function serial() {
  const a = await fetch('/api/user').then(r => r.json());
  const b = await fetch(`/api/posts/${a.id}`).then(r => r.json());
  // 总耗时 = T(a) + T(b)
  return b;
}

// 并行执行 —— 同时发起
async function parallel() {
  const [user, config] = await Promise.all([
    fetch('/api/user').then(r => r.json()),
    fetch('/api/config').then(r => r.json())
  ]);
  // 总耗时 = max(T(user), T(config))
  return { user, config };
}
```

## Key Points

- **JavaScript 是单线程的**：一次只执行一个任务，异步靠的是事件循环将任务分阶段调度，而非多线程。
- **事件循环分为宏任务（macrotask）和微任务（microtask）**：宏任务包括 `setTimeout`、`setInterval`、I/O；微任务包括 `Promise.then/catch/finally`、`MutationObserver`。每个宏任务结束后会清空所有微任务队列。
- **Promise 有三种状态**：`pending`（等待）、`fulfilled`（成功）、`rejected`（失败），状态一旦确定就不可再变。
- **async 函数始终返回 Promise**：即使 `return 42`，外部拿到的也是一个 resolved 的 Promise，而非普通值。
- **await 只能在 async 函数内部使用**（除了模块顶层的 Top-level await）。
- **错误处理**：async 函数中的 `throw` 等同于 Promise 的 `reject`，未捕获的错误需要用 `try/catch` 或 `.catch()` 处理，否则会静默失败。

## Common Mistakes

- **忘记 await 导致 Bug**：在 async 函数中调用另一个 async 函数时忘记写 `await`，会拿到一个 Promise 对象而非实际值。
  ```javascript
  // 错误
  async function wrong() {
    const data = fetchData(); // data 是 Promise，不是实际数据！
    console.log(data); // Promise { <pending> }
  }
  // 正确
  async function right() {
    const data = await fetchData();
    console.log(data); // 实际数据
  }
  ```

- **滥用串行导致性能低下**：当多个异步操作彼此不依赖时，却用 `await` 逐个等待，浪费了并发能力。
  ```javascript
  // 差 —— 串行
  const a = await fetch(urlA);
  const b = await fetch(urlB); // 等 a 完成才发起

  // 好 —— 并行
  const [a, b] = await Promise.all([fetch(urlA), fetch(urlB)]);
  ```

- **未处理 Promise 拒绝**：没有 `.catch()` 或 `try/catch` 的 Promise 拒绝会触发 `unhandledrejection`，在 Node.js 中会导致进程退出。
  ```javascript
  // 危险
  fetch('/api').then(handle); // 如果失败，错误未被捕获

  // 安全
  fetch('/api').then(handle).catch(console.error);
  // 或
  try { await fetch('/api'); } catch (e) { /* 处理 */ }
  ```

## Related Concepts

- [Promise（内置对象）](../builtin/promise.md) —— JavaScript 异步编程的核心构建块
- [async/await（语法）](../syntax/async_await.md) —— 基于 Promise 的语法糖，让异步代码更简洁
- [异步编程模式](../patterns/async_patterns.md) —— 并发控制、超时、重试等进阶模式
- [函数（话题）](../topics/functions.md) —— 回调函数是异步编程的最早形式

## Citations

- [MDN: Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)
- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
