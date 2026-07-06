---
type: JS Builtin
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
title: Promise
description: 表示异步操作最终完成或失败的对象，提供链式调用的标准化异步编程模型。
tags:
- ES6
- resolve
- reject
- then
- catch
- finally
- Promise.all
- Promise.allSettled
- Promise.race
- Promise.any
- 异步
- 微任务
timestamp: '2026-07-05T14:33:15+00:00'
---

**Promise** 是 ES2015（ES6）引入的内建对象，用于表示一个异步操作的最终完成（或失败）及其结果值。它取代了传统的回调嵌套（Callback Hell），提供了一种可链式调用、错误处理统一的异步编程模型。Promise 的本质是一个**状态机**：初始为 `pending`（待定），可变为 `fulfilled`（已兑现）或 `rejected`（已拒绝），一旦状态变更就不可再逆转。从 ES2017 起，`async/await` 语法进一步简化了 Promise 的使用，但底层机制仍然是 Promise。

## Syntax

```javascript
// 构造一个 Promise
new Promise((resolve, reject) => {
  // 执行异步操作
  if (/* 操作成功 */) {
    resolve(value);   // 将状态切换为 fulfilled
  } else {
    reject(reason);   // 将状态切换为 rejected
  }
});

// 实例方法链
promise
  .then(onFulfilled, onRejected)   // 注册兑现/拒绝回调
  .catch(onRejected)               // 注册拒绝回调（语法糖）
  .finally(onFinally)              // 无论成败都会执行（ES2018）

// 静态方法
Promise.resolve(value)
Promise.reject(reason)
Promise.all(iterable)              // 全部兑现或任一拒绝
Promise.allSettled(iterable)       // ES2020：等待所有 Promise 完成（无论成功/失败）
Promise.race(iterable)             // 竞速：返回第一个完成的 Promise
Promise.any(iterable)              // ES2021：返回第一个兑现的 Promise
```

## Examples

### 基础：将回调包装为 Promise

```javascript
// 传统回调方式
function readFileCallback(path, callback) {
  // 模拟异步文件读取
  setTimeout(() => {
    if (path) {
      callback(null, `内容来自 ${path}`);
    } else {
      callback(new Error('路径不能为空'));
    }
  }, 100);
}

// Promise 化 — 将基于回调的 API 转换为返回 Promise 的版本
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (path) {
        resolve(`内容来自 ${path}`);
      } else {
        reject(new Error('路径不能为空'));
      }
    }, 100);
  });
}

readFilePromise('/data/file.txt')
  .then(content => console.log(content))   // "内容来自 /data/file.txt"
  .catch(err => console.error(err.message));
```

### 链式调用与值传递

```javascript
// then 返回一个新的 Promise，实现链式调用
fetch('/api/user/1')
  .then(response => response.json())       // 返回一个 Promise（解析 JSON）
  .then(user => user.id)                   // 上一个 then 的返回值 { id: 42, ... } → 42
  .then(id => `User ID is ${id}`)
  .then(msg => console.log(msg))           // "User ID is 42"
  .catch(err => console.error('请求失败:', err));
```

### Promise.all — 并发等待多个异步任务

```javascript
const fetchUser = fetch('/api/user/1').then(r => r.json());
const fetchPosts = fetch('/api/user/1/posts').then(r => r.json());
const fetchFriends = fetch('/api/user/1/friends').then(r => r.json());

// 三个请求并行发出，等全部完成后统一处理
Promise.all([fetchUser, fetchPosts, fetchFriends])
  .then(([user, posts, friends]) => {
    console.log(user.name, `有 ${posts.length} 篇文章`, `${friends.length} 位好友`);
  })
  .catch(err => {
    // 只要有一个 Promise 被 reject，整个 Promise.all 就会 reject
    console.error('至少一个请求失败了:', err);
  });
```

### Promise.allSettled — 等待所有任务完成，不关心结果

```javascript
const tasks = [
  fetch('/api/data/1').then(r => r.json()),
  fetch('/api/data/2').then(r => r.json()),
  fetch('/api/data/3').then(r => r.json()),
];

// 无论成功还是失败，都等所有请求完成
Promise.allSettled(tasks).then(results => {
  // results 是一个对象数组，每个对象有 status 和 value/reason 字段
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`任务 ${index} 成功:`, result.value);
    } else {
      console.warn(`任务 ${index} 失败:`, result.reason);
    }
  });
});
```

### Promise.race — 竞速（可用于超时控制）

```javascript
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('请求超时')), ms)
  );
  return Promise.race([promise, timeout]);
}

// 如果 API 在 3 秒内没有响应，则抛出超时错误
withTimeout(fetch('https://api.example.com/data'), 3000)
  .then(response => console.log('请求成功'))
  .catch(err => console.error(err.message));  // "请求超时" 或网络错误
```

### Promise.any — 取第一个成功的 Promise

```javascript
// 多个备用服务器，取最快成功响应的那个
const servers = [
  fetch('https://cdn1.example.com/data'),
  fetch('https://cdn2.example.com/data'),
  fetch('https://cdn3.example.com/data'),
];

Promise.any(servers)
  .then(最快响应 => console.log('最快成功响应来自:', 最快响应.url))
  .catch(err => {
    // 只有所有 Promise 都拒绝了才会走到这里
    console.error('所有备用服务器都不可用:', err.errors); // errors 是所有拒绝原因的数组
  });
```

## Key Points

- **状态不可逆**：Promise 一旦从 `pending` 变为 `fulfilled` 或 `rejected`，状态就永久锁定，不会再次改变。任何对 `resolve` 或 `reject` 的后续调用都会被忽略。
- **then 始终返回新 Promise**：`.then()` 和 `.catch()` 都返回一个新的 Promise，而非原 Promise，这才使得链式调用成为可能。
- **值穿透 & 隐式返回**：如果 `.then()` 传入的不是函数（例如 `null` 或普通值），该值会透传到下一个 `.then()`；如果 `onFulfilled` 返回一个非 Promise 值，它会被自动包装为 `Promise.resolve()`。
- **微任务（Microtask）**：Promise 的回调（`then`/`catch`/`finally`）在**微任务队列**中执行，优先级高于 `setTimeout`、`setInterval` 等宏任务。这意味着 Promise 回调会在 DOM 渲染之前执行。
- **错误冒泡**：链式调用中，如果一个 `.then()` 没有提供 `onRejected` 参数，错误会一直向后冒泡到最近的 `.catch()`。这类似于同步代码中 `try/catch` 的异常传播行为。
- **`finally` 不改变值**：`finally` 的回调不接受参数，且它的返回值不会被下一个 `.then()` 接收（除非返回一个 rejected Promise）。它最常用于清理操作（如关闭加载状态）。
- **静态方法都是 Promise 实例工厂**：`Promise.resolve()` 将任意值包装为已兑现的 Promise；`Promise.reject()` 创建一个立即拒绝的 Promise。它们常用于将非 Promise 值统一为 Promise 形式。

## Common Mistakes

- **忘记 return Promise**：在 `.then()` 中执行异步操作时忘记 `return`，导致下一个 `.then()` 拿不到预期的值。
  ```javascript
  // ❌ 错误：没有 return fetch 返回的 Promise
  fetch('/api/data')
    .then(response => {
      fetch('/api/log');       // 这只是一个 fetch 调用，但没有返回
    })
    .then(logResult => {
      console.log(logResult);  // undefined，不是期望的响应数据
    });

  // ✅ 正确：return 返回 Promise
  fetch('/api/data')
    .then(response => {
      return fetch('/api/log');
    })
    .then(logResult => {
      console.log(logResult);  // ✅ 实际的响应对象
    });
  ```

- **在 Promise 外部使用 try/catch 捕获拒绝**：Promise 的异步特性意味着它抛出的错误无法被外部的同步 `try/catch` 捕获。
  ```javascript
  // ❌ 错误：try/catch 无法捕获异步抛出的错误
  try {
    new Promise((_, reject) => reject(new Error('失败了')));
  } catch (e) {
    console.log('永远不会执行到这里');
  }

  // ✅ 正确：使用 .catch() 或 await + try/catch
  new Promise((_, reject) => reject(new Error('失败了')))
    .catch(e => console.log(e.message));  // "失败了"

  // 或者在 async 函数中用 try/catch
  async function handleIt() {
    try {
      await new Promise((_, reject) => reject(new Error('失败了')));
    } catch (e) {
      console.log(e.message); // "失败了"
    }
  }
  ```

- **在 `forEach` 中串行执行异步操作**：用 `forEach` 遍历 Promise 数组时，所有 Promise 实际上会并发启动，而非按顺序执行。
  ```javascript
  const urls = ['/api/1', '/api/2', '/api/3'];

  // ❌ 错误：三个请求几乎同时发出（并发），不是串行
  urls.forEach(async url => {
    const data = await fetch(url);
    console.log(data);
  });

  // ✅ 正确：使用 reduce 或 for...of 实现串行
  async function sequentialFetch() {
    for (const url of urls) {
      const data = await fetch(url);
      console.log(data);
    }
  }
  ```

- **未处理的 Promise 拒绝（Unhandled Rejection）**：创建了一个 Promise 但没有挂载 `.catch()`，当它被拒绝时会在全局抛出一个 `unhandledrejection` 事件，Node.js 甚至会导致进程退出。始终为 Promise 链添加错误处理。

## Related Concepts

- [Async/Await 语法](../syntax/async_await.md) — 基于 Promise 的语法糖，用同步风格写异步代码
- [异步编程概述](../topics/async.md) — JavaScript 异步模型和事件循环的完整介绍
- [异步编程模式](../patterns/async_patterns.md) — Promise.all、Promise.allSettled、Promise.race 等并发模式的最佳实践
- [Array](../builtin/array.md) — 常与 Promise.all 配合处理批量异步任务
- [Arrow Functions](../syntax/arrow_function.md) — 在 Promise 链中常用，简洁且自动绑定 `this`
- [Template Literals](../syntax/template_literals.md) — 用于构建 Promise 链中的动态字符串输出

## Citations

- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [ECMAScript® 2015 Specification: Promise Objects](https://262.ecma-international.org/6.0/#sec-promise-objects)
