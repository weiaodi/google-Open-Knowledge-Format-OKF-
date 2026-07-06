---
type: JS Builtin
title: Array Methods
description: Array 的核心方法：map/filter/reduce/find/forEach 等函数式操作方法详解。
tags:
  - map
  - filter
  - reduce
  - forEach
  - find
  - flat
  - flatMap
  - spread
  - Array
  - ES5
  - ES6
  - ES2019
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
timestamp: '2026-07-06T09:39:16.327Z'
---

## 概述

Array（数组）是 JavaScript 中最核心的数据结构之一。ES5 起 JavaScript 为 `Array.prototype` 添加了一套强大的**函数式操作方法**（`map`、`filter`、`reduce`、`forEach`、`find` 等），使得开发者可以用声明式的风格处理数据，而不再依赖传统 `for` 循环。这些方法不可变（不修改原数组）或按约定返回新数组，代码更简洁、更少出错、更易维护。ES6 及后续版本又补充了 `flat`、`flatMap`、`from` 等实用方法。

## Syntax

```javascript
// 常见迭代方法的通用签名
arr.map(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.filter(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.reduce(callbackFn(accumulator, currentValue, index, array) { /* ... */ }, initialValue?)
arr.forEach(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.find(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.findIndex(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.some(callbackFn(element, index, array) { /* ... */ }, thisArg?)
arr.every(callbackFn(element, index, array) { /* ... */ }, thisArg?)

// ES6+ 方法
arr.flat(depth = 1)
arr.flatMap(callbackFn(element, index, array) { /* ... */ })
Array.from(arrayLike, mapFn?)
Array.isArray(value)
```

> **注意**：`callbackFn` 接收三个参数：当前元素、索引（可选）、原数组引用（可选）。`thisArg` 用于指定回调内部的 `this` 值。

## Examples

### 1. `map`——一对一映射转换

```javascript
const nums = [1, 2, 3, 4];

// 基本用法：每个元素平方
const squares = nums.map(n => n * n);
console.log(squares); // [1, 4, 9, 16]

// 提取对象数组中的特定字段
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
const names = users.map(user => user.name);
console.log(names); // ['Alice', 'Bob']

// map 不修改原数组
console.log(nums); // [1, 2, 3, 4] — 原数组不变
```

### 2. `filter` + `reduce`——筛选与聚合

```javascript
const transactions = [120, -45, 300, -20, 500, -100];

// filter: 筛选出所有收入（正数）
const incomes = transactions.filter(t => t > 0);
console.log(incomes); // [120, 300, 500]

// reduce: 计算总余额
const balance = transactions.reduce((acc, cur) => acc + cur, 0);
console.log(balance); // 755

// reduce 实现分组
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
const grouped = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
console.log(grouped); // { apple: 3, banana: 2, orange: 1 }
```

### 3. `find` / `some` / `every`——条件查找与断言

```javascript
const products = [
  { id: 1, name: 'Laptop', price: 899, inStock: true },
  { id: 2, name: 'Mouse', price: 29, inStock: false },
  { id: 3, name: 'Keyboard', price: 79, inStock: true },
];

// find: 找到第一个符合条件的元素
const cheapProduct = products.find(p => p.price < 50);
console.log(cheapProduct); // { id: 2, name: 'Mouse', ... }

// some: 是否存在至少一个缺货商品
const hasOutOfStock = products.some(p => !p.inStock);
console.log(hasOutOfStock); // true

// every: 是否所有商品都有库存
const allInStock = products.every(p => p.inStock);
console.log(allInStock); // false
```

### 4. `flatMap` + 展开运算——处理嵌套数据

```javascript
// flatMap: map 之后自动展平一层
const sentences = ['Hello world', 'JavaScript is fun'];
const words = sentences.flatMap(s => s.split(' '));
console.log(words); // ['Hello', 'world', 'JavaScript', 'is', 'fun']

// 等价于先 map 再 flat(1)，但 flatMap 更高效
// sentences.map(s => s.split(' ')).flat(1)

// 展开运算 ... 复制与合并
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const merged = [...arr1, ...arr2];
console.log(merged); // [1, 2, 3, 4, 5, 6]

// 快速去重（配合 Set）
const dup = [1, 2, 2, 3, 3, 4];
const unique = [...new Set(dup)];
console.log(unique); // [1, 2, 3, 4]
```

## Key Points

1. **不可变性（Immutability）**：`map`、`filter`、`reduce`、`flat`、`flatMap` 都**返回新数组**，不修改原数组。`forEach` 和 `sort`（会原地修改）除外。
2. **链式调用（Chaining）**：可以连续调用多个方法，例如 `arr.filter(x => x > 0).map(x => x * 2).reduce(...)`，但要注意链太长可能影响可读性。
3. **稀疏数组（Sparse Arrays）**：`forEach`、`map`、`filter` 会跳过空槽位（`empty`），而 `reduce` 不会正确处理稀疏数组，应避免使用。
4. **回调函数返回值**：`map` 需要返回转换后的值，`filter` 需要返回布尔值，`reduce` 的返回值会成为下次迭代的 `accumulator`。忘记 `return` 是常见错误。
5. **`reduce` 的初始值**：强烈建议始终提供 `initialValue`。若数组为空且未提供初始值，会抛出 `TypeError`。
6. **性能考量**：对于超大数组（>10万项），链式调用每次都会创建新数组，可能产生 GC 压力。极端场景可考虑用 `for` 循环 + 手动聚合优化。

## Common Mistakes

1. **`map` 中忘记 return**——花括号 `{}` 会使箭头函数从隐式返回变为显式返回，漏写 `return` 会得到 `[undefined, undefined, ...]`。

   ```javascript
   // ❌ 错误：花括号需要显式 return
   [1, 2, 3].map(n => { n * 2 });   // [undefined, undefined, undefined]

   // ✅ 正确：省略花括号实现隐式返回
   [1, 2, 3].map(n => n * 2);       // [2, 4, 6]

   // ✅ 正确：花括号 + return
   [1, 2, 3].map(n => { return n * 2; });
   ```

2. **在 `forEach` 中用 `return` 或 `break` 试图提前退出**——`forEach` 不支持提前终止，`return` 只跳过当前迭代。

   ```javascript
   // ❌ 错误：return 无法停止 forEach
   [1, 2, 3, 4, 5].forEach(n => {
     if (n > 3) return;   // 只是跳过 >3 的元素，不是停止
     console.log(n);
   }); // 输出 1 2 3

   // ✅ 正确：用 for...of 或 find/some 提前终止
   for (const n of [1, 2, 3, 4, 5]) {
     if (n > 3) break;
     console.log(n);
   } // 输出 1 2 3
   ```

3. **`Array.isArray` 误用**——`typeof []` 返回 `"object"`，不可靠；始终用 `Array.isArray()` 判断。

   ```javascript
   // ❌ 错误：typeof 无法区分数组和对象
   console.log(typeof []);           // "object" — 不准确
   console.log(typeof { length: 0 }); // "object"

   // ✅ 正确
   console.log(Array.isArray([]));   // true
   console.log(Array.isArray({}));   // false
   ```

## Related Concepts

- [函数（Functions）](../topics/functions.md) — 数组方法的回调本质上是高阶函数的核心应用。
- [箭头函数（Arrow Functions）](../syntax/arrow_function.md) — 在数组方法中广泛使用箭头函数简化回调写法。
- [解构赋值（Destructuring）](../syntax/destructuring.md) — 在 `map`/`filter` 的回调参数中配合解构提取对象字段。
- [变量声明（Variables）](../topics/variables.md) — 理解 `const`/`let` 在数组操作中的作用域。

## Citations

- [MDN: Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN: Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- [MDN: Array.prototype.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
- [MDN: Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
- [MDN: Array.prototype.flatMap()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap)
- [ECMAScript Language Specification — Array Objects](https://tc39.es/ecma262/#sec-array-objects)
