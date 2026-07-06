---
type: JS Builtin
title: Promise
description: 代表异步操作最终完成或失败的对象，是 JavaScript 异步编程的核心构建块
tags:
  - ES6
  - async
  - then
  - catch
  - 微任务
  - 异步
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
timestamp: '2026-07-06T09:38:52.049Z'
---

## 概述

`Promise` 是 ES6 引入的异步编程核心机制，用于表示一个尚未完成但预期在未来完成的异步操作的结果。它解决了传统回调地狱（callback hell）问题，提供了统一的 `.then()`、`.catch()` 和 `.finally()` 链式调用接口。Promise 有三种状态：**pending**（待定）、**fulfilled**（已兑现）和 **rejected**（已拒绝），状态一旦确定便不可逆转。

在实际开发中，Promise 广泛用于网络请求（`fetch`）、文件读写、定时器、数据库查询等场景。自 ES2017 起，`async/await` 语法进一步简化了 Promise 的使用，但理解 Promise 本身的机制仍是掌握 JavaScript 异步编程的关键。

## Syntax

### 创建 Promise

```javascript
new Promise((resolve, reject) => {
  // 异步操作
  if (/* 成功 */) {
    resolve(value);   // 将状态切换为 fulfilled
  } else {
    reject(error);    // 将状态切换为 rejected
  }
});
```

### 消费 Promise

```javascript
promise
  .then(onFulfilled)       // 处理兑现状态
  .catch(onRejected)       // 处理拒绝状态
  .finally(onFinally);     // 无论兑现或拒绝都会执行
```

### 静态方法

```javascript
Promise.all(iterable);      // 全部兑现才兑现，任一拒绝即拒绝
Promise.allSettled(iterable); // 等待所有完成，不关心兑现或拒绝
Promise.race(iterable);     // 第一个完成的 Promise 的结果
Promise.any(iterable);      // 第一个兑现的 Promise 的结果
Promise.resolve(value);     // 包装一个值成为已兑现的 Promise
Promise.reject(reason);     // 创建一个已拒绝的 Promise
```

## Examples

### 示例 1：基础用法 —— 用 Promise 封装 setTimeout

```javascript
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`等待了 ${ms} 毫秒`);
    }, ms);
  });
}

// 使用
delay(1000).then((message) => {
  console.log(message); // 1 秒后输出: "等待了 1000 毫秒"
});
```

### 示例 2：链式调用与错误处理

```javascript
// 模拟一个可能失败的网络请求
function fetchUserData(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId > 0) {
        resolve({ id: userId, name: 'Alice' });
      } else {
        reject(new Error('无效的用户 ID'));
      }
    }, 500);
  });
}

fetchUserData(1)
  .then((user) => {
    console.log('用户数据:', user);
    // 返回一个新 Promise 来继续链式调用
    return fetchUserData(user.id + 1);
  })
  .then((nextUser) => {
    console.log('下一个用户:', nextUser);
  })
  .catch((error) => {
    console.error('出错了:', error.message); // 如果 userId <= 0，这里捕获错误
  })
  .finally(() => {
    console.log('请求结束（无论成功与否）');
  });
```

### 示例 3：Promise.all 并发请求

```javascript
function fetchData(url) {
  // 模拟 fetch API
  return new Promise((resolve) => {
    setTimeout(() => resolve(`来自 ${url} 的数据`), Math.random() * 1000);
  });
}

// 同时发起三个请求，等待全部完成
Promise.all([
  fetchData('/api/users'),
  fetchData('/api/posts'),
  fetchData('/api/comments'),
])
  .then(([users, posts, comments]) => {
    console.log('全部数据已就绪:');
    console.log(users);
    console.log(posts);
    console.log(comments);
  })
  .catch((error) => {
    // 只要任意一个请求失败，整个 Promise.all 就会拒绝
    console.error('请求失败:', error);
  });
```

### 示例 4：Promise.race 实现超时控制

```javascript
function fetchWithTimeout(url, timeoutMs) {
  const fetchPromise = new Promise((resolve) => {
    setTimeout(() => resolve(`从 ${url} 获取的数据`), 2000);
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('请求超时')), timeoutMs);
  });

  // 谁先完成就用谁的结果
  return Promise.race([fetchPromise, timeoutPromise]);
}

fetchWithTimeout('/api/data', 1000)
  .then((data) => console.log(data))
  .catch((err) => console.error(err.message)); // 1 秒后输出: "请求超时"
```

## Key Points

1. **状态不可逆**：Promise 只能从 `pending` 变为 `fulfilled` 或 `rejected`，一旦改变就永远固定，不可再次变更。
2. **微任务（microtask）执行**：`.then()`、`.catch()` 和 `.finally()` 的回调在微任务队列中执行，优先级高于宏任务（如 `setTimeout`）。
3. **值穿透**：在 `.then()` 中返回一个普通值（非 Promise），该值会被自动包裹成 `Promise.resolve(value)`，传递给下一个 `.then()`。
4. **错误冒泡**：链式调用中，如果某个 `.then()` 没有 catch 住错误，错误会一直向下冒泡，直到被 `.catch()` 捕获。
5. **`finally` 不接收参数**：`.finally()` 的回调不接受任何参数，也无法知道 Promise 是兑现还是拒绝，它只用于执行收尾工作。
6. **`then` 返回新 Promise**：每次调用 `.then()` 都会返回一个新的 Promise，这是链式调用的基础。

## Common Mistakes

1. **忘记 `return` 导致链断裂**

```javascript
// ❌ 错误：没有 return，下一个 then 拿到的值是 undefined
Promise.resolve(1)
  .then((val) => {
    val + 1; // 忘记 return
  })
  .then((val) => {
    console.log(val); // undefined！
  });

// ✅ 正确：显式 return
Promise.resolve(1)
  .then((val) => {
    return val + 1;
  })
  .then((val) => {
    console.log(val); // 2
  });
```

2. **在 Promise 外部同步抛出错误无法被 catch**

```javascript
// ❌ 错误：new Promise 中的同步 throw 不会被外层 try/catch 捕获
try {
  new Promise(() => {
    throw new Error('失败');
  });
} catch (e) {
  // 这里捕获不到！
}

// ✅ 正确：使用 .catch() 或在 executor 中调用 reject()
new Promise((_, reject) => {
  reject(new Error('失败'));
}).catch((e) => {
  console.error(e.message); // "失败"
});
```

3. **在 `forEach` / `for` 循环中错误地串行化请求**

```javascript
const urls = ['/a', '/b', '/c'];

// ❌ 错误：forEach 不会等待 Promise 完成，所有请求同时发出
urls.forEach(async (url) => {
  const data = await fetch(url);
  console.log(data);
});

// ✅ 正确：使用 reduce 链式串行
await urls.reduce(async (prevPromise, url) => {
  await prevPromise;
  const data = await fetch(url);
  console.log(data);
}, Promise.resolve());

// 或者使用 for...of（推荐）
for (const url of urls) {
  const data = await fetch(url);
  console.log(data);
}
```

## Related Concepts

- [Async/Await](../syntax/async_await.md) —— 基于 Promise 的语法糖，用同步风格编写异步代码
- [异步编程基础](../topics/async.md) —— 事件循环、微任务与宏任务、回调机制
- [函数](../topics/functions.md) —— Promise executor 中函数作为一等公民的使用方式

## Citations

- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [ECMAScript 2015 (ES6) Specification - Promise Objects](https://262.ecma-international.org/6.0/#sec-promise-objects)
- [JavaScript 事件循环: 微任务与宏任务 - HTML Standard](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)
