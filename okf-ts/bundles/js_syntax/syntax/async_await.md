---
type: JS Syntax
title: async / await
description: 基于 Promise 的同步风格异步语法糖，让异步代码像同步代码一样可读
tags:
  - ES2017
  - async
  - await
  - Promise
  - asynchronous
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
timestamp: '2026-07-06T09:38:30.570Z'
---

## 概述

`async` / `await` 是 ES2017（ES8）引入的语法糖，建立在 [Promise](../builtin/promise.md) 之上，旨在让异步代码像同步代码一样书写和阅读。当一个函数被声明为 `async`，它始终返回一个 Promise；在函数内部，使用 `await` 关键字可以暂停执行直到一个 Promise 完成，从而使异步流程摆脱"回调地狱"和长链的 `.then()` 调用。`async` / `await` 特别适合需要顺序执行多个异步操作、或需要在异步操作之间传递数据的场景。

---

## Syntax

```javascript
// 1. async 函数声明
async function foo() {
  // ...
}

// 2. async 函数表达式
const foo = async function() {
  // ...
};

// 3. async 箭头函数
const foo = async () => {
  // ...
};

// 4. 在类方法中使用
class MyClass {
  async myMethod() {
    // ...
  }
}

// 5. await 表达式（只能在 async 函数内部使用）
const result = await promiseExpression;
```

---

## Examples

### 示例 1：基本用法 — 替代 Promise.then()

```javascript
// 传统 Promise 链式调用
function fetchUser(id) {
  return fetch(`https://api.example.com/users/${id}`)
    .then(response => response.json());
}

// 使用 async/await 更直观
async function fetchUserAsync(id) {
  const response = await fetch(`https://api.example.com/users/${id}`);
  const user = await response.json();
  return user; // 自动包装成 Promise 返回
}

// 调用方式完全一致
fetchUserAsync(1).then(user => console.log(user));
```

### 示例 2：错误处理 — try/catch 捕获异步异常

```javascript
async function getWeather(city) {
  try {
    const response = await fetch(`https://api.weather.com/${city}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.temperature;
  } catch (error) {
    // 既可以捕获 await 中的 Promise rejection，也可以捕获 throw
    console.error('获取天气失败:', error.message);
    return null; // 降级返回默认值
  }
}

// 等价于 .catch() 方式:
// getWeather('Beijing').catch(err => ...)
```

### 示例 3：顺序执行 vs 并行执行

```javascript
// ❌ 低效：顺序等待，每个请求要等上一个完成
async function loadUsersSequential(ids) {
  const users = [];
  for (const id of ids) {
    const user = await fetch(`/users/${id}`).then(r => r.json());
    users.push(user);
  }
  return users;
}

// ✅ 高效：并行发起所有请求，使用 Promise.all
async function loadUsersParallel(ids) {
  const promises = ids.map(id => fetch(`/users/${id}`).then(r => r.json()));
  const users = await Promise.all(promises); // 同时等待所有
  return users;
}
```

### 示例 4：实际业务场景 — 先验证再提交

```javascript
async function submitOrder(cartId, paymentInfo) {
  try {
    // Step 1: 验证购物车
    const cart = await validateCart(cartId);
    if (cart.items.length === 0) {
      throw new Error('购物车为空');
    }

    // Step 2: 计算总价
    const total = await calculateTotal(cart);

    // Step 3: 处理支付
    const payment = await processPayment(paymentInfo, total);

    // Step 4: 创建订单
    const order = await createOrder(cart, payment);
    return order.id;

  } catch (error) {
    // 任何一步失败都会跳到这里
    console.error('订单提交失败:', error);
    throw error; // 向上传播错误
  }
}
```

---

## Key Points

1. **`async` 函数始终返回 Promise** — 即使内部显式返回了一个非 Promise 值，也会被 `Promise.resolve()` 包装。如果函数内部抛出异常，返回的 Promise 会被 reject。
2. **`await` 只能在 `async` 函数内部使用** — 在顶层代码（模块顶层除外）或非 async 函数中使用 `await` 会抛出 SyntaxError。现代浏览器和 Node.js 支持[Top-level await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#top_level_await)（ES2022）。
3. **`await` 会暂停当前 async 函数的执行** — 但不会阻塞事件循环，其他代码（如定时器、UI 事件）可以继续执行。
4. **没有依赖关系的异步操作应该并行执行** — 使用 `Promise.all()` 或 `Promise.allSettled()` 来并发执行，不要盲目地顺序 `await`。
5. **await 一个非 Promise 值会直接返回该值** — `await 42` 等价于 `Promise.resolve(42)`，是安全的无操作。
6. **错误传递** — `async` 函数中的 `throw` 等价于 reject Promise；`try/catch` 可以捕获 `await` 表达式的 rejection 以及 `throw` 语句。

---

## Common Mistakes

1. **忘记 await，导致比较的是 Promise 对象而非值**

```javascript
// ❌ 错误：条件永远为 true，因为 promise 是 truthy
async function isAdmin(userId) {
  const role = fetchUserRole(userId); // 忘记 await！
  if (role === 'admin') { /* 永远不会执行 */ }
}

// ✅ 正确
async function isAdmin(userId) {
  const role = await fetchUserRole(userId);
  return role === 'admin';
}
```

2. **在 forEach 中 await 不会按预期工作**

```javascript
// ❌ 错误：forEach 的回调是同步执行的，await 无效
async function processItems(items) {
  items.forEach(async (item) => {
    await process(item); // 这里的 await 不会暂停 forEach 循环
  });
  console.log('全部完成？'); // 这行会先执行！
}

// ✅ 正确：使用 for...of 实现顺序执行
async function processItems(items) {
  for (const item of items) {
    await process(item);
  }
  console.log('全部完成'); // 等所有处理完成才执行
}
```

3. **在 async 函数中捕获错误过于宽泛**

```javascript
// ❌ 错误：try/catch 包裹了整块代码，难以定位具体错误
async function fragile() {
  try {
    const a = await stepA();
    const b = await stepB(a);
    const c = await stepC(b);
    return c;
  } catch (err) {
    // 不知道是 A、B 还是 C 出错了
  }
}

// ✅ 推荐：对关键步骤单独 try/catch，或利用错误对象区分
async function robust() {
  let a, b;
  try { a = await stepA(); } catch (e) { throw new Error('StepA失败: ' + e.message); }
  try { b = await stepB(a); } catch (e) { throw new Error('StepB失败: ' + e.message); }
  return await stepC(b);
}
```

---

## Related Concepts

- [Promise](../builtin/promise.md) — `async`/`await` 的基础，理解 Promise 的状态和链式调用是掌握 async/await 的前提
- [Asynchronous JavaScript](../topics/async.md) — 更广泛的异步编程模型，包含事件循环、回调、微任务等概念
- [Arrow Functions](../syntax/arrow_function.md) — `async` 箭头函数是常见写法，注意箭头函数的 `this` 绑定规则
- [Functions](../topics/functions.md) — async 函数本质上仍然是 JavaScript 函数，遵循函数声明、表达式等规则

---

## Citations

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [ECMAScript 2017 Language Specification (ES2017)](https://262.ecma-international.org/8.0/)
