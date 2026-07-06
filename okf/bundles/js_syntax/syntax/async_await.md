---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
title: async / await
description: 基于 Promise 的语法糖，让异步代码看起来像同步代码，避免回调地狱
tags:
- async function
- await
- error handling
- try/catch
- Promise
- ES2017
timestamp: '2026-07-05T14:32:32+00:00'
---

`async/await` 是 ES2017 引入的语法糖，建立在 Promise 之上。它允许你以编写同步代码的方式编写异步逻辑，使代码更易读、更易维护。核心思想是：用 `async` 声明一个异步函数，在函数内部用 `await` 等待一个 Promise 的决议（resolve/reject），期间不会阻塞主线程。

## Syntax

```javascript
// async 函数声明
async function functionName(param1, param2) {
  // 函数体
  const result = await somePromise;
  return result;
}

// async 箭头函数
const functionName = async (param1, param2) => {
  const result = await somePromise;
  return result;
}

// async 作为对象方法
const obj = {
  async method() {
    return await fetchData();
  }
};

// async 作为 class 方法
class MyClass {
  async fetchData() {
    return await api.call();
  }
}
```

**要点**：
- `async` 关键字放在函数定义之前
- `await` 只能在 `async` 函数内部使用（顶层 await 除外，某些环境支持）
- `await` 后面通常跟一个 Promise 对象，但也可以跟任意值（会被自动包装为 resolved Promise）

## Examples

### 基本用法 — 代替 Promise.then 链

```javascript
// 模拟一个异步操作
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function greet() {
  console.log('准备打招呼...');
  await delay(1000);          // 等待 1 秒，不会阻塞主线程
  console.log('你好，世界！');
  return '完成';
}

greet().then(msg => console.log(msg));
// 输出（间隔 1 秒）：
// 准备打招呼...
// 你好，世界！
// 完成
```

### 错误处理 — try/catch 捕获异步异常

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`);
    }
    const userData = await response.json();  // 等待 JSON 解析
    return userData;
  } catch (error) {
    // 网络错误、HTTP 错误、JSON 解析错误都会被捕获到这里
    console.error('获取用户数据失败:', error.message);
    return null;  // 返回一个安全的默认值
  }
}

// 调用
const user = await fetchUserData(42);
```

### 并发执行 — 不需要逐个等待

```javascript
async function loadDashboard() {
  // ❌ 错误做法：逐个等待，总耗时 = 所有请求时间之和
  // const user = await fetchUser();
  // const posts = await fetchPosts();
  // const notifications = await fetchNotifications();

  // ✅ 正确做法：用 Promise.all 并发执行
  const [user, posts, notifications] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchNotifications()
  ]);
  // 总耗时 ≈ 最慢的那个请求的耗时

  return { user, posts, notifications };
}

// 辅助函数
function fetchUser() {
  return new Promise(resolve => setTimeout(() => resolve({ id: 1, name: 'Alice' }), 500));
}
function fetchPosts() {
  return new Promise(resolve => setTimeout(() => resolve([{ title: 'Post 1' }]), 300));
}
function fetchNotifications() {
  return new Promise(resolve => setTimeout(() => resolve([{ text: 'Hello!' }]), 400));
}
```

### 串行 vs 并行 — 理解执行顺序

```javascript
async function sequentialDemo() {
  console.time('串行');
  const a = await delayAndReturn(500, 'A');   // 等待 500ms
  const b = await delayAndReturn(300, 'B');   // 再等待 300ms → 总计 800ms
  console.timeEnd('串行');                     // ~800ms
  return [a, b];
}

async function parallelDemo() {
  console.time('并行');
  const [a, b] = await Promise.all([
    delayAndReturn(500, 'A'),                  // 同时开始
    delayAndReturn(300, 'B')                   // 同时开始
  ]);                                          // 总计 ~500ms（取最大值）
  console.timeEnd('并行');
  return [a, b];
}

function delayAndReturn(ms, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}
```

## Key Points

1. **`async` 函数总是返回一个 Promise** — 即使你 `return 42`，外部拿到的也是一个 resolved 值为 `42` 的 Promise。如果函数内抛出异常，返回的是一个 rejected Promise。
2. **`await` 暂停当前 `async` 函数的执行** — 它不会阻塞事件循环或主线程，只是让出执行权，Promise 决议后恢复执行。
3. **`await` 只能在 `async` 函数内部使用** — 在普通函数中使用 `await` 会抛出 `SyntaxError`。顶层 await 仅在 ES2022 模块中支持。
4. **`await` 后面跟非 Promise 值时自动包装** — `await 42` 等价于 `await Promise.resolve(42)`，立即返回 42。
5. **`async/await` 本质是 Promise 的语法糖** — `.then()`、`.catch()`、`.finally()` 方法依然可用，且可以混合使用。
6. **多个独立的 `await` 默认是串行的** — 如果 B 不依赖 A 的结果，应该用 `Promise.all` 并行执行，否则会浪费等待时间。

## Common Mistakes

1. **忘记 `await`，导致得到的是 Promise 对象而非值**
   ```javascript
   async function main() {
     const data = fetchData();    // ❌ 没有 await！data 是一个 Promise，不是实际数据
     console.log(data.length);    // undefined（Promise 没有 .length 属性）
     
     const data2 = await fetchData();  // ✅ 正确：data2 是实际的值
     console.log(data2.length);        // 正常工作
   }
   ```

2. **在循环中对独立操作使用 `await`，导致不必要的串行执行**
   ```javascript
   // ❌ 低效：逐个发送请求
   async function fetchAll(urls) {
     const results = [];
     for (const url of urls) {
       const res = await fetch(url);   // 等上一个完成才发下一个
       results.push(await res.json());
     }
     return results;
   }

   // ✅ 高效：全部并发
   async function fetchAll(urls) {
     const promises = urls.map(url => fetch(url).then(r => r.json()));
     return Promise.all(promises);
   }
   ```

3. **在 `async` 函数中不用 try/catch，导致未处理的 Promise rejection**
   ```javascript
   async function risky() {
     const data = await mightReject();  // ❌ 如果 reject，错误会变成未捕获的 Promise rejection
     return data;
   }

   // ✅ 正确做法：用 try/catch 包裹
   async function safe() {
     try {
       const data = await mightReject();
       return data;
     } catch (error) {
       console.error('发生错误:', error);
       throw error;  // 可以重新抛出，让调用方继续处理
     }
   }
   ```

## Related Concepts

- [Promise](../builtin/promise.md) — async/await 的底层基础，理解 Promise 能帮你更好地掌握 async/await
- [异步编程](../topics/async.md) — JavaScript 异步编程的全面概览，包括事件循环、回调、Promise 等
- [异步模式](../patterns/async_patterns.md) — 高级异步模式：Promise.all、Promise.race、超时控制等

## Citations

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- ECMAScript 2017 (ES8) Specification — Async Functions
