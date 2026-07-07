---
type: JS Topic
title: Asynchronous JavaScript
description: 事件循环、回调、Promise、async/await 构成的 JS 异步编程模型
resource: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous
tags:
  - event loop
  - callback
  - microtask
  - macrotask
  - non-blocking
  - asynchronous
  - concurrency
  - Promise.allSettled
  - unhandledrejection
timestamp: '2026-07-07T03:23:13.365Z'
---


## 概述

JavaScript 是一门**单线程**语言，但通过事件循环（Event Loop）机制实现了非阻塞的异步编程。异步编程是 JavaScript 的核心能力，涵盖从传统的回调函数（Callback）到 Promise，再到现代的 async/await 语法，让开发者能够优雅地处理 I/O 操作、网络请求、定时器等耗时任务，而不会阻塞主线程。

理解异步 JavaScript 的关键在于掌握**调用栈（Call Stack）**、**任务队列（Task Queue）** 和 **事件循环（Event Loop）** 三者的协作关系。

## 核心机制：事件循环（Event Loop）

事件循环是 JS 运行时的调度引擎，其基本工作流程如下：

1. 执行调用栈中的同步代码。
2. 遇到异步操作（如 `setTimeout`、`fetch`），将其回调交给 Web API 处理，继续执行后续代码。
3. 当异步操作完成，回调被放入任务队列。
4. 当调用栈清空后，事件循环从任务队列取出回调执行。
5. **微任务（Microtask）** 优先于**宏任务（Macrotask）** 执行。

```
调用栈 (Call Stack)
    ↓
微任务队列 (Microtask Queue) — Promise.then / MutationObserver / queueMicrotask
    ↓
宏任务队列 (Macrotask Queue) — setTimeout / setInterval / I/O / UI 渲染
```

## 异步编程的三种方式

### 1. 回调函数（Callback）—— 最传统的方式

```javascript
// 回调方式：将后续逻辑作为参数传入
function loadData(url, onSuccess, onError) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  xhr.onload = () => {
    if (xhr.status === 200) {
      onSuccess(xhr.responseText) // 成功时调用回调
    } else {
      onError(new Error(`HTTP ${xhr.status}`))
    }
  }
  xhr.onerror = () => onError(new Error('Network error'))
  xhr.send()
}

// 使用回调 — 嵌套过深会形成"回调地狱"（callback hell）
loadData('/api/user', (userData) => {
  console.log('用户数据:', userData)
  // 需要继续嵌套下一个请求...
}, (err) => {
  console.error('加载失败:', err)
})
```

### 2. Promise —— 链式调用的革命

```javascript
// 使用 Promise 封装异步操作
function loadDataPromise(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onload = () => {
      xhr.status === 200
        ? resolve(xhr.responseText)  // 成功态
        : reject(new Error(`HTTP ${xhr.status}`))  // 失败态
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send()
  })
}

// Promise 链式调用 — 扁平化，不再嵌套
loadDataPromise('/api/user')
  .then((user) => {
    console.log('用户:', user)
    return loadDataPromise(`/api/orders/${user.id}`)
  })
  .then((orders) => {
    console.log('订单:', orders)
    return loadDataPromise(`/api/details/${orders[0].id}`)
  })
  .then((detail) => console.log('详情:', detail))
  .catch((err) => console.error('任何步骤出错都会被捕获:', err))
  .finally(() => console.log('无论成功失败都执行'))
```

### 3. async/await —— 同步风格的异步代码

```javascript
// async/await 让异步代码看起来像同步代码
async function loadUserOrders() {
  try {
    const user = await loadDataPromise('/api/user')
    console.log('用户:', user)

    const orders = await loadDataPromise(`/api/orders/${user.id}`)
    console.log('订单:', orders)

    const detail = await loadDataPromise(`/api/details/${orders[0].id}`)
    console.log('详情:', detail)

    return detail  // async 函数始终返回一个 Promise
  } catch (err) {
    console.error('出错:', err)
    throw err  // 可以重新抛出，让调用方继续 catch
  }
}

// 调用 async 函数得到的是 Promise
loadUserOrders().then((result) => {
  console.log('最终结果:', result)
})
```

## 微任务 vs 宏任务 —— 执行顺序的关键

```javascript
console.log('1 — 同步')

setTimeout(() => console.log('2 — 宏任务'), 0)

Promise.resolve().then(() => console.log('3 — 微任务'))

queueMicrotask(() => console.log('4 — 微任务 (queueMicrotask)'))

console.log('5 — 同步')

// 输出顺序：
// 1 — 同步
// 5 — 同步
// 3 — 微任务
// 4 — 微任务 (queueMicrotask)
// 2 — 宏任务
```

关键规则：**同步代码 → 所有微任务 → 一个宏任务 → 所有微任务 → 下一个宏任务...**

## 常见异步模式

```javascript
// 并行执行 — Promise.all（所有成功才成功）
async function loadAllUsers() {
  const urls = ['/api/user/1', '/api/user/2', '/api/user/3']
  // 三个请求同时发出，等待所有完成
  const results = await Promise.all(urls.map(loadDataPromise))
  console.log('所有用户:', results)
  return results
}

// 竞速执行 — Promise.race（谁先到用谁）
async function fetchWithTimeout(url, ms = 3000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('请求超时')), ms)
  )
  // 请求和超时谁先触发就取谁的结果
  return Promise.race([loadDataPromise(url), timeout])
}

// 顺序执行 — 用 for...of 配合 await
async function processSequentially(items) {
  const results = []
  for (const item of items) {
    // 注意：这里每次 await 都会等待上一个完成
    const result = await processItem(item)
    results.push(result)
  }
  return results
}

// 并发启动 + 顺序等待结果
async function concurrentWait() {
  // 两个 Promise 同时启动
  const slow = resolveAfter2Seconds()
  const fast = resolveAfter1Second()

  // 按 await 的顺序拿结果，但总耗时 = max(2s, 1s) = 2s
  console.log(await slow)  // 2 秒后输出
  console.log(await fast)  // 立即输出（已经完成）
}
```

## 未处理的 Promise 拒绝

如果一个 Promise 被拒绝但没有对应的 `.catch()` 处理器，浏览器或 Node.js 会触发全局事件：

```javascript
// 浏览器中监听未处理的拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理拒绝:', event.reason)
  event.preventDefault()
})

// Node.js 中
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理拒绝:', reason)
})
```

## 关键要点

1. **`async` 函数始终返回 Promise** — 即使你 return 一个普通值，它也会被包装成 `Promise.resolve(value)`。
2. **`await` 只能在 `async` 函数内部使用**（顶层 await 在 ES2022 模块中可用）。
3. **微任务（Microtask）优先于宏任务（Macrotask）** — 包括 `Promise.then`、`queueMicrotask`、`MutationObserver`。
4. **`setTimeout(fn, 0)` 不是立即执行** — 它至少会被延迟到当前所有同步代码和微任务执行完毕。
5. **错误处理必须显式** — 在 async 函数中用 `try/catch`，在 Promise 链中用 `.catch()`，否则错误会被静默吞掉。
6. **`Promise.all` 是"全有或全无"** — 任何一个 Promise rejected，整个 `Promise.all` 立即 rejected。
7. **并发启动 vs 串行等待** — 同时启动多个 Promise 再分别 `await` 比串行 `await` 更快，但要注意未捕获拒绝的风险。

## 常见错误

### ❌ 在 forEach 中使用 await 不会等待

```javascript
// 错误：forEach 中的回调是同步执行的，await 不起作用
async function badProcess(items) {
  items.forEach(async (item) => {
    await processItem(item)  // 不会等待！所有 processItem 同时触发
  })
  console.log('这里的代码会在所有 processItem 完成之前执行')
}

// 正确：使用 for...of
async function goodProcess(items) {
  for (const item of items) {
    await processItem(item)  // 每次等待上一个完成
  }
}

// 或使用 Promise.all（如果不需要顺序执行）
async function parallelProcess(items) {
  await Promise.all(items.map(processItem))
}
```

### ❌ 忘记 async 函数返回的是 Promise

```javascript
// 错误：认为 async 函数返回值是普通值
async function getUserName() {
  return 'Alice'
}

const name = getUserName() // name 是 Promise，不是 'Alice'
console.log(name)          // Promise { 'Alice' }
console.log(name.length)   // undefined — Promise 没有 .length

// 正确：用 await 或 .then 获取值
const name = await getUserName()
console.log(name)          // 'Alice'
console.log(name.length)   // 5
```

### ❌ Promise 错误未被捕获

```javascript
// 错误：没有 catch，错误被静默吞掉
async function risky() {
  throw new Error('出错了')
}
risky()  // UnhandledPromiseRejection — Node.js 会打印警告，未来版本可能崩溃

// 正确：始终处理错误
async function safe() {
  try {
    await risky()
  } catch (err) {
    console.error('捕获到错误:', err.message)
  }
}
```

### ❌ 并发启动 Promise 时未处理中间拒绝

```javascript
// 危险模式：同时启动两个 Promise 再分别 await
async function risky() {
  const p1 = new Promise((resolve) => setTimeout(() => resolve('1'), 1000))
  const p2 = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('失败')), 500)
  )
  const results = [await p1, await p2] // p2 在 500ms 拒绝时 p1 尚未 await!
  // 可能导致 UnhandledPromiseRejection
}

// 安全模式：使用 Promise.all
async function safe() {
  const results = await Promise.all([
    new Promise((resolve) => setTimeout(() => resolve('1'), 1000)),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('失败')), 500)
    ),
  ])
}
```

## 相关概念

- [Promise](../builtin/promise.md) — 异步操作的标准化容器，支持链式调用和错误冒泡。
- [Async/Await 参考](../references/async_function.md) — `async function` 声明语法、执行模型与常见陷阱。
- [闭包](../patterns/closure.md) — 回调函数中常用的变量保持机制，捕获外部作用域。
- [箭头函数](../syntax/arrow_function.md) — 回调函数中常用的简写语法，且不绑定 `this`。

## 引用来源

- [MDN: Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous) — 异步编程概述与教程。
- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop) — 事件循环机制的详细说明。
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) — Promise 使用指南。
- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) — async/await 语法参考。
