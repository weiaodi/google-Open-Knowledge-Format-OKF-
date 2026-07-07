---
type: JS Builtin
title: Promise
description: 代表异步操作最终完成或失败的对象，是 async/await 的底层机制
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
tags:
  - ES6
  - then
  - catch
  - finally
  - Promise.all
  - Promise.race
  - pending
  - fulfilled
  - rejected
  - asynchronous
  - Promise.allSettled
  - Promise.any
  - microtask
  - thenable
timestamp: '2026-07-07T03:23:29.142Z'
---


## 概述

Promise 是 ES6 引入的异步编程核心机制，代表一个尚未完成但**未来会确定**的值。它有三种状态：`pending`（待定）、`fulfilled`（已完成）和 `rejected`（已拒绝）。Promise 的出现解决了传统回调嵌套（Callback Hell）的问题，提供了链式调用的优雅语法，同时也是 `async/await` 语法的底层基石。当你需要处理网络请求、文件读取、定时器或其他异步操作时，Promise 是标准的选择。

## Syntax

```javascript
// 创建一个 Promise
new Promise(executor);

// executor 签名
function(resolve, reject) {
  // 异步操作
  // 成功时调用 resolve(value)
  // 失败时调用 reject(reason)
}
```

**Promise 实例方法：**

```javascript
promise.then(onFulfilled, onRejected);
promise.catch(onRejected);
promise.finally(onFinally);
```

**静态方法：**

```javascript
Promise.all(iterable);
Promise.allSettled(iterable);
Promise.race(iterable);
Promise.any(iterable);
Promise.resolve(value);
Promise.reject(reason);
Promise.try(callback);     // ES2025 — 包装任意回调（同步/异步）为 Promise
Promise.withResolvers();   // ES2024 — 返回 { promise, resolve, reject }
```

## Examples

### 基础用法：模拟网络请求

```javascript
// 模拟一个异步 API 请求
function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id > 0) {
        resolve({ id, name: '张三', age: 25 });
      } else {
        reject(new Error('无效的用户 ID'));
      }
    }, 1000);
  });
}

// 使用 Promise
fetchUser(1)
  .then(user => console.log('用户:', user))
  .catch(err => console.error('错误:', err.message));
// 1 秒后输出: 用户: { id: 1, name: '张三', age: 25 }
```

### Promise 链式调用

```javascript
// 链式调用避免回调地狱
function step1(value) {
  return Promise.resolve(value + 1);
}

function step2(value) {
  return Promise.resolve(value * 2);
}

function step3(value) {
  return Promise.resolve(value - 3);
}

step1(5)
  .then(result => step2(result))  // 6 → 12
  .then(result => step3(result))  // 12 → 9
  .then(final => console.log('最终结果:', final))  // 输出: 9
  .catch(err => console.error('出错了:', err));
```

### Promise.all 与 Promise.race

```javascript
// 模拟多个并发的 API 请求
const fetchUser = Promise.resolve({ id: 1, name: 'Alice' });
const fetchPosts = new Promise(resolve =>
  setTimeout(() => resolve(['post1', 'post2']), 500)
);
const fetchComments = new Promise(resolve =>
  setTimeout(() => resolve(['comment1']), 1000)
);

// Promise.all: 等待所有 Promise 完成（一个失败则整体失败）
Promise.all([fetchUser, fetchPosts, fetchComments])
  .then(([user, posts, comments]) => {
    console.log('全部完成:', { user, posts, comments });
  })
  .catch(err => console.error('有请求失败:', err));

// Promise.race: 返回最先完成的 Promise（无论成功或失败）
Promise.race([fetchPosts, fetchComments])
  .then(first => console.log('最快返回的数据:', first));
// 输出: 最快返回的数据: ['post1', 'post2'] (因为 500ms < 1000ms)
```

### 错误处理的最佳实践

```javascript
// 在链式末尾统一处理错误
fetch('https://api.example.com/data')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态码: ${response.status}`);
    }
    return response.json();
  })
  .then(data => console.log('数据:', data))
  // 一个 catch 捕获链中任何位置的错误
  .catch(err => console.error('请求失败:', err.message))
  // finally 总会执行（无论成功/失败），适合做清理工作
  .finally(() => console.log('请求结束，关闭加载状态'));
```

### 浮空 Promise 问题（Floating Promises）

```javascript
// ❌ 错误：没有 return，下一个 then 无法追踪结果
doSomething()
  .then((url) => {
    fetch(url);  // 缺少 return！
  })
  .then((result) => {
    console.log(result); // undefined — fetch 的结果丢失了
  });

// ✅ 正确：始终 return Promise
doSomething()
  .then((url) => {
    return fetch(url);
  })
  .then((result) => {
    console.log(result); // Response 对象
  });
```

### 使用 thenable 互操作

```javascript
// thenable 是具有 .then() 方法的对象，可与原生 Promise 互操作
const thenable = {
  then(onFulfilled, onRejected) {
    onFulfilled(42);
  },
};

Promise.resolve(thenable); // 解析为 Promise fulfilled with 42
```

### 使用 Promise.withResolvers（ES2024）

```javascript
// 无需在构造函数中嵌套，可直接从外部控制
const { promise, resolve, reject } = Promise.withResolvers();

setTimeout(() => resolve('完成!'), 1000);
await promise; // 1 秒后返回 '完成!'
```

## 并发组合方法

Promise 提供了四种并发工具来组合多个异步操作：

| 方法 | 完成条件 | 失败条件 |
|------|----------|----------|
| `Promise.all()` | 所有 Promise 完成 | 任意一个拒绝 |
| `Promise.allSettled()` | 所有 Promise 敲定（settled） | 永不拒绝 |
| `Promise.any()` | 任意一个完成 | 全部拒绝 |
| `Promise.race()` | 任意一个敲定（settled） | 任意一个拒绝 |

```javascript
// 顺序执行：用 reduce 构建链式调用
[func1, func2, func3]
  .reduce((p, f) => p.then(f), Promise.resolve())
  .then((result3) => { /* use result3 */ });
```

## Promise 拒绝事件

Web 平台会在全局作用域派发两种事件，用于捕获未处理的 Promise 拒绝：

```javascript
// 捕获未被 catch 的拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason);
  event.preventDefault(); // 阻止默认的控制台警告
});

// 当拒绝被延迟处理时触发
window.addEventListener('rejectionhandled', (event) => {
  console.log('拒绝已被处理:', event.reason);
});
```

Node.js 中对应 `process.on('unhandledRejection', ...)`。

## Key Points

1. **状态不可逆**：Promise 一旦从 `pending` 变为 `fulfilled` 或 `rejected`，就**永久锁定**在该状态，无法再次改变。
2. **then/catch 始终返回新 Promise**：每次调用 `.then()` 或 `.catch()` 都会创建并返回一个新的 Promise，这才是链式调用的基础。
3. **微任务执行**：`then/catch/finally` 的回调在**微任务队列**中执行，优先级高于 `setTimeout` 等宏任务。
4. **错误穿透**：链式调用中，如果某个 `.then()` 没有提供 `onRejected` 处理器，异常会**自动传递**到下一个 `.catch()`。
5. **值透传**：如果 `.then()` 传入的不是函数（如 `null`），Promise 会把接收到的值**直接透传**到下一个 `.then()`。
6. **`new Promise` 内的代码会同步执行**：executor 函数是**立即执行**的（synchronous），只有 `.then()` 的回调才是异步执行的。
7. **回调保证**：`.then()` 的回调永远不会在当前同步代码完成前被调用，即使 Promise 已经 settled——这避免了一致性问题（Zalgo 状态）。

## Common Mistakes

1. **忘记 return Promise 导致链式断裂**

```javascript
// ❌ 错误：忘记 return，下一个 then 收到的值是 undefined
fetchUser(1)
  .then(data => {
    processUser(data);  // 这里没有 return
  })
  .then(result => {
    console.log(result); // undefined!
  });

// ✅ 正确：始终 return Promise
fetchUser(1)
  .then(data => {
    return processUser(data); // 返回 Promise
  })
  .then(result => {
    console.log(result); // 正确处理结果
  });
```

2. **在 Promise 中抛出非 Error 对象**

```javascript
// ❌ 错误：抛出普通字符串，丢失调用栈信息
new Promise((_, reject) => {
  reject('出错了'); // 字符串，非 Error 对象
}).catch(err => {
  console.log(err.name); // undefined
  console.log(err.stack); // undefined
});

// ✅ 正确：始终 reject Error 对象
new Promise((_, reject) => {
  reject(new Error('出错了')); // Error 对象，保留调用栈
}).catch(err => {
  console.log(err.message); // '出错了'
  console.log(err.stack);   // 完整的堆栈追踪
});
```

3. **没有 catch 导致未捕获的 Promise 异常**

```javascript
// ❌ 危险：rejected 的 Promise 没有被捕获
new Promise((_, reject) => {
  reject(new Error('失败'));
})
  .then(data => console.log(data));
// UnhandledPromiseRejectionWarning! 在 Node.js 中会导致进程退出

// ✅ 正确：始终添加 catch 处理器
new Promise((_, reject) => {
  reject(new Error('失败'));
})
  .then(data => console.log(data))
  .catch(err => console.error('已处理:', err.message));
```

## Related Concepts

- [Async/Await 参考](../references/async_function.md) — `async function` 声明语法与执行模型
- [异步编程](../topics/async.md) —— 深入理解事件循环、微任务与宏任务
- [箭头函数](../syntax/arrow_function.md) —— 常用在 Promise 链中保持 `this` 绑定

## Citations

- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [ECMAScript 2015 (ES6) Specification — Promise Objects](https://262.ecma-international.org/6.0/#sec-promise-objects)
