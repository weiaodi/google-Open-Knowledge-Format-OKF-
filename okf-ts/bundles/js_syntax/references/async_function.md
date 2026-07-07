---
type: Reference
title: async function
description: 声明一个异步函数，该函数隐式返回 Promise 并允许在函数体中使用 await 关键字。
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
tags:
  - async
  - await
  - Promise
  - asynchronous
  - ES2017
  - function declaration
timestamp: '2026-07-07T03:22:54.660Z'
---


## 概述

`async function` 声明创建一个异步函数，该函数始终返回一个 [`Promise`](../builtin/promise.md)。在函数体内可以使用 `await` 关键字来暂停执行，等待 Promise 解决后再继续，从而以同步风格编写异步代码。

## 语法

```javascript
async function name(param0) {
  statements
}
async function name(param0, param1, /* …, */ paramN) {
  statements
}
```

**注意：** `async` 和 `function` 之间不能有换行符，否则自动分号插入会导致 `async` 成为独立标识符。

## 行为

### 返回值

异步函数始终返回一个 Promise：

```javascript
async function foo() {
  return 1;
}
// 等价于：
function foo() {
  return Promise.resolve(1);
}
```

**重要差异：** 如果返回一个已有的 Promise，`async` 函数返回的是一个新的引用（不同于 `Promise.resolve` 的同一引用复用）：

```javascript
const p = new Promise((res) => res(1));

async function asyncReturn() {
  return p;
}

function basicReturn() {
  return Promise.resolve(p);
}

console.log(p === basicReturn()); // true — 同一引用
console.log(p === asyncReturn()); // false — 不同引用
```

### 执行模型

异步函数的执行体被 `await` 表达式分割成多个阶段：

1. **同步阶段**：从函数开始到第一个 `await` 之前的代码同步执行
2. **异步阶段**：每个 `await` 之后的部分相当于 `.then()` 回调

```javascript
async function foo() {
  const result1 = await new Promise((resolve) =>
    setTimeout(() => resolve('1'))
  );
  const result2 = await new Promise((resolve) =>
    setTimeout(() => resolve('2'))
  );
}
```

### 并发与顺序

```javascript
// ❌ 危险：分别 await 并发启动的 Promise 可能导致未捕获拒绝
async function risky() {
  const p1 = fetch('/api/a');
  const p2 = fetch('/api/b'); // 可能在 p1 await 之前就拒绝
  return [await p1, await p2];
}

// ✅ 安全：使用 Promise.all
async function safe() {
  return Promise.all([fetch('/api/a'), fetch('/api/b')]);
}
```

## 与 Promise 链的对比

```javascript
// Promise 链风格
function getProcessedData(url) {
  return downloadData(url)
    .catch((e) => downloadFallbackData(url))
    .then((v) => processDataInWorker(v));
}

// async/await 风格
async function getProcessedData(url) {
  let v;
  try {
    v = await downloadData(url);
  } catch (e) {
    v = await downloadFallbackData(url);
  }
  return processDataInWorker(v);
}
```

## 参见

- [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) — 暂停异步函数执行直到 Promise 解决
- [`AsyncFunction`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction) — 异步函数的构造函数
- [异步编程](../topics/async.md) — 事件循环与异步模型

## 引用来源

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [ECMAScript Specification — sec-async-function-definitions](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-async-function-definitions)
