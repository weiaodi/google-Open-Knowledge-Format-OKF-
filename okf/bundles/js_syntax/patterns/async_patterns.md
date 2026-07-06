---
type: JS Pattern
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
title: Async Patterns
description: 常见的异步编排模式：并行执行、串行执行、竞速、超时控制与重试等实用组合技巧
tags:
- Promise.all
- Promise.allSettled
- Promise.race
- sequential
- parallel
- timeout
- retry
- concurrency
timestamp: '2026-07-05T14:35:13+00:00'
---

在现代 JavaScript 中，异步操作（如网络请求、文件读写、数据库查询）无处不在。仅掌握 `Promise` 和 `async/await` 的基础用法还不够，真正生产级的代码需要**对异步任务进行编排**：哪些任务并行执行？哪些需要串行等待？如果某个任务超时怎么办？失败了是否自动重试？

**Async Patterns** 就是针对这些场景总结出的几种可复用的组合模式。它们通常基于 `Promise.all`、`Promise.allSettled`、`Promise.race` 等静态方法实现，让你能以声明式的方式控制异步流程，从而写出更可读、更健壮的代码。

## Syntax

以下是五种核心异步模式的函数签名与使用示意：

```javascript
// 1. 并行执行 —— 所有 Promise 同时启动，全部成功才 resolve
Promise.all(iterable);

// 2. 带容错的并行 —— 等待所有完成，不因某个失败而中断
Promise.allSettled(iterable);

// 3. 竞速 —— 返回第一个 settle（resolve/reject）的结果
Promise.race(iterable);

// 4. 首个 fulfilled —— 只取第一个成功的结果，全部失败才 reject
Promise.any(iterable);

// 5. 串行执行 —— 逐个 await（无内置 API，通过循环或 reduce 实现）
async function serial(tasks) { /* 见示例 */ }
```

## Examples

### 示例 1：并行执行多个 API 请求

```javascript
const fetchUser = fetch('/api/user').then(res => res.json());
const fetchPosts = fetch('/api/posts').then(res => res.json());
const fetchComments = fetch('/api/comments').then(res => res.json());

// 三个请求同时发出，所有完成后统一处理
const [user, posts, comments] = await Promise.all([
  fetchUser, fetchPosts, fetchComments
]);
console.log(user, posts, comments);
// 如果任一个请求失败，Promise.all 会立即 reject
```

### 示例 2：Promise.allSettled —— 部分失败也不影响整体

```javascript
const promises = urls.map(url => fetch(url).then(res => res.json()));

const results = await Promise.allSettled(promises);

// 分别处理成功与失败的结果
const fulfilled = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

const rejected = results
  .filter(r => r.status === 'rejected')
  .map(r => r.reason);

console.log(`成功 ${fulfilled.length} 个，失败 ${rejected.length} 个`);
```

### 示例 3：Promise.race —— 实现超时控制

```javascript
/**
 * 给一个 Promise 设置超时
 * @param {Promise} promise   - 实际任务
 * @param {number}  ms        - 超时毫秒数
 * @returns {Promise}         - 谁先 settle 就返回谁
 */
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// 使用：如果 3 秒内未返回，则抛出超时错误
try {
  const data = await withTimeout(fetch('/api/slow'), 3000);
  console.log(data);
} catch (err) {
  console.error(err.message); // "Operation timed out after 3000ms"
}
```

### 示例 4：串行执行 —— 逐个 await

```javascript
// 场景：逐个上传文件，每个依赖前一个的结果
async function uploadSequentially(files) {
  const results = [];
  for (const file of files) {
    // 上一个上传完成之后，才开启下一个
    const result = await uploadFile(file);
    results.push(result);
    console.log(`已上传：${file.name}`);
  }
  return results;
}

// 或用 reduce 实现（更函数式）
async function serial(tasks) {
  return tasks.reduce((chain, task) =>
    chain.then(result =>
      task().then(next => [...result, next])
    ), Promise.resolve([]));
}
```

### 示例 5：带重试机制的异步调用

```javascript
/**
 * 异步调用失败后自动重试
 * @param {Function} fn       - 返回 Promise 的异步函数
 * @param {number}   retries  - 最大重试次数
 * @param {number}   delayMs  - 重试间隔（毫秒）
 */
async function retryAsync(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err; // 最后一次仍失败，向上抛出
      console.warn(`第 ${i + 1} 次失败，${delayMs}ms 后重试...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// 使用
const data = await retryAsync(() => fetch('/api/unstable').then(r => r.json()));
```

## Key Points

- **`Promise.all` 遵循"全有或全无"原则**：只要一个 Promise 被 reject，整个 `Promise.all` 立即 reject，不会等待其他任务完成。如果关心部分结果，用 `Promise.allSettled`。
- **`Promise.race` 关注的是"第一个 settle"**，无论 resolve 还是 reject。而 `Promise.any` 只关心"第一个 resolve"，全部 reject 才抛出 `AggregateError`。
- **并行 ≠ 无序**：`Promise.all` 返回的结果数组顺序与输入 iterable 的顺序一致，不管各任务实际完成先后。
- **串行执行没有内置 API**，需要通过 `for...of` + `await` 或 `reduce` + Promise 链手动实现。串行的总耗时 = 各任务耗时之和。
- **超时控制不会取消底层任务**：`Promise.race` 返回后，被超时抛弃的 Promise 仍会继续执行（可能还会修改外部状态），要注意避免副作用泄漏。
- **重试时要考虑幂等性**：只有对可重试的（幂等的）操作才应自动重试，例如 GET 请求；POST 等非幂等操作重试可能导致重复提交。

## Common Mistakes

- **误用 `Promise.all` 做串行**：把 `await` 放在 `map` 回调里，看起来像并行，实际上每次迭代都 await 等待，变成了串行且代码冗余。
  ```javascript
  // ❌ 错误：实际是串行
  const results = urls.map(async url => {
    const res = await fetch(url);
    return res.json();
  });
  // 这里 results 是 Promise 数组，根本没有 await 它们！

  // ✅ 正确：先启动所有请求，再统一 await
  const promises = urls.map(url => fetch(url).then(res => res.json()));
  const results = await Promise.all(promises);
  ```

- **忘记处理 `Promise.all` 的整体 reject**：`Promise.all` 抛出的是第一个 reject 的原因，其他 Promise 可能还有未捕获的 rejection，导致 "unhandled rejection" 警告。
  ```javascript
  // ✅ 添加整体的 catch
  try {
    await Promise.all([riskyTask1(), riskyTask2()]);
  } catch (err) {
    console.error('至少一个任务失败:', err);
  }
  ```

- **误以为 `Promise.race` 会终止其他任务**：`Promise.race` 只是"谁先到听谁的"，超时后慢任务仍在后台运行，可能引发意料之外的状态变更。需要结合 `AbortController` 才能真正取消。

## Related Concepts

- [Promise（内置对象）](../builtin/promise.md) — `Promise.all`、`Promise.race` 等静态方法的底层实现
- [async/await 语法](../syntax/async_await.md) — 异步模式的语法基础，所有模式均依赖 async/await 编写
- [异步编程总览](../topics/async.md) — JavaScript 异步编程的宏观理解，包括事件循环与微任务

## Citations

- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [MDN: Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [MDN: Promise.race()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race)
- [MDN: Promise.any()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)
