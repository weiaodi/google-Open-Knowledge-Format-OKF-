---
type: JS Builtin
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
title: Array
description: 有序集合，提供 map/filter/reduce 等高阶方法用于数据转换和迭代。
tags:
- map
- filter
- reduce
- find
- some
- every
- flat
- forEach
- indexOf
timestamp: '2026-07-05T14:33:38+00:00'
---

## 概述

**Array（数组）** 是 JavaScript 中最核心的有序集合类型，用于存储和操作一组按索引排列的数据。数组从 ES1 起就已存在，历经 ES5 的函数式方法（`map`、`filter`、`reduce`）到 ES2015+ 的扩展算子（`...`、`flat`、`flatMap`），逐步成为数据管线的基石。几乎所有涉及列表、集合或序列的场景都应首先考虑 Array，而不是手动管理对象属性。数组是零索引的（zero-indexed），且长度可动态变化。

## Syntax

```javascript
// 字面量创建（推荐）
const arr = [1, 2, 3];

// 构造函数创建（少用，有陷阱）
const arr2 = new Array(3);       // 创建一个长度为 3 的空数组
const arr3 = new Array(1, 2, 3); // 创建 [1, 2, 3]

// 静态工厂方法
const arr4 = Array.from('hello');          // ['h', 'e', 'l', 'l', 'o']
const arr5 = Array.of(1, 2, 3);            // [1, 2, 3]

// 访问元素
arr[0];   // 1 — 第一个元素
arr[arr.length - 1]; // 3 — 最后一个元素

// 修改元素
arr[1] = 42; // arr → [1, 42, 3]

// 常见操作
arr.length;       // 3
arr.push(4);      // 末尾追加，返回新长度 4
arr.pop();        // 移除末尾元素，返回 4
arr.unshift(0);   // 头部插入，返回新长度
arr.shift();      // 移除头部元素
```

## Examples

### 1. 基本增删改查

```javascript
const fruits = ['apple', 'banana', 'cherry'];

// 查
console.log(fruits.indexOf('banana'));  // 1
console.log(fruits.includes('grape'));  // false

// 增
fruits.push('date');            // ['apple', 'banana', 'cherry', 'date']
fruits.splice(1, 0, 'blueberry'); // 在索引1处插入：['apple', 'blueberry', 'banana', 'cherry', 'date']

// 删
fruits.splice(2, 1);            // 删除索引2的'banana'
console.log(fruits);            // ['apple', 'blueberry', 'cherry', 'date']
```

### 2. 函数式管道：map → filter → reduce

```javascript
const orders = [
  { id: 1, amount: 350, paid: true },
  { id: 2, amount: 120, paid: false },
  { id: 3, amount: 580, paid: true },
  { id: 4, amount: 90,  paid: true },
];

// 链式调用：找出所有已支付订单的金额总和
const totalPaid = orders
  .filter(order => order.paid)        // 第一步：筛选已支付
  .map(order => order.amount)         // 第二步：只取金额
  .reduce((sum, amt) => sum + amt, 0); // 第三步：累加

console.log(totalPaid); // 350 + 580 + 90 = 1020
```

### 3. 复杂数据转换

```javascript
const students = [
  { name: 'Alice', scores: [88, 92, 75] },
  { name: 'Bob',   scores: [65, 70, 80] },
  { name: 'Carol', scores: [95, 98, 100] },
];

// flatMap：先映射再打平，一步完成
const allScores = students.flatMap(s => s.scores);
console.log(allScores);
// [88, 92, 75, 65, 70, 80, 95, 98, 100]

// 找出所有平均分 >= 90 的学生
const topStudents = students
  .map(s => ({
    name: s.name,
    avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length,
  }))
  .filter(s => s.avg >= 90);

console.log(topStudents);
// [{ name: 'Carol', avg: 97.666... }]
```

### 4. 展开运算符与解构

```javascript
// 浅拷贝
const original = [1, 2, 3];
const copy = [...original];
copy.push(4);
console.log(original); // [1, 2, 3] — 原数组不受影响

// 合并数组
const a = [1, 2];
const b = [3, 4];
const merged = [...a, ...b]; // [1, 2, 3, 4]

// 解构赋值
const [first, second, ...rest] = [10, 20, 30, 40, 50];
console.log(first);  // 10
console.log(second); // 20
console.log(rest);   // [30, 40, 50]
```

## Key Points

1. **数组是对象，`typeof []` 返回 `'object'`** — 用 `Array.isArray(arr)` 来判断是否为数组，不要用 `typeof`。
2. **`map` / `filter` / `reduce` 返回新数组，不修改原数组**；而 `push` / `pop` / `splice` / `sort` 会修改原数组（变异方法）。
3. **`forEach` 无法被 `break` 或 `return` 提前退出** — 需要提前退出时用 `for...of`、`some()` 或 `every()`。
4. **稀疏数组（sparse array）容易带来意外**：`const arr = [1,,3]` 有空洞，`forEach` 会跳过空位，但 `Array.from` 会填充 `undefined`。
5. **`sort()` 默认按字符串字典序排序** — 对数字排序必须传入比较函数：`arr.sort((a, b) => a - b)`。
6. **`Array(length)` 构造函数仅传一个数字时创建空槽数组**，并非 `[length]`；用 `Array.from({length}, () => val)` 或 `Array(length).fill(val)` 来初始化。

## Common Mistakes

1. **混淆 `find()` 与 `filter()`** — `find()` 返回第一个匹配的**元素**（或 `undefined`），`filter()` 返回所有匹配的**新数组**。
   ```javascript
   const nums = [10, 20, 30, 40];
   const found = nums.find(n => n > 25);  // 30
   const filtered = nums.filter(n => n > 25); // [30, 40]
   ```

2. **直接给 `length` 赋值截断数组，而不是删除元素**。
   ```javascript
   let arr = [1, 2, 3, 4, 5];
   arr.length = 3;   // arr → [1, 2, 3] — 元素被永久丢弃！
   // 正确做法：arr.splice(3) 或 arr.pop() 逐个移除
   ```

3. **在 `map` 的回调中忘记返回值** — 如果箭头函数用了花括号 `{}`，必须显式 `return`，否则返回 `undefined`。
   ```javascript
   const nums = [1, 2, 3];
   const bad = nums.map(n => { n * 2 });   // [undefined, undefined, undefined]
   const good = nums.map(n => n * 2);      // [2, 4, 6] — 无花括号时隐式返回
   ```

## Related Concepts

- [Arrays and Iteration（数组与迭代）](../topics/arrays_and_iteration.md) — 更深入的迭代器协议与 for...of 循环
- [Destructuring（解构赋值）](../syntax/destructuring.md) — 从数组中提取值到变量
- [Spread / Rest（展开与剩余运算符）](../syntax/spread_rest.md) — 数组的浅拷贝、合并与参数收集
- [Map / Set（映射与集合）](../builtin/map_set.md) — 与 Array 互补的集合类型
- [Functions（函数）](../topics/functions.md) — 回调函数与高阶函数的基础

## Citations

- MDN: [Array - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- ECMAScript Specification: [Array Objects](https://tc39.es/ecma262/#sec-array-objects)
