---
type: JS Topic
resource: https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables
title: Variables & Scope
description: JavaScript 中声明变量的方式（var、let、const）以及作用域与提升规则
tags:
- var
- let
- const
- scope
- hoisting
- TDZ
- block scope
- function scope
timestamp: '2026-07-05T14:27:28+00:00'
---

## 概述

**变量（Variable）** 是 JavaScript 中存储数据的命名容器。JavaScript 提供了三种声明变量的关键字：`var`（ES1 起）、`let` 和 `const`（ES2015/ES6 起）。三者的核心区别在于**作用域（scope）**、**提升（hoisting）** 行为和**可否重新赋值**。理解这些差异是写出可预测、无 Bug 代码的基础——现代 JavaScript 开发中应优先使用 `const`，仅在需要重新赋值时使用 `let`，并避免使用 `var`。

## 声明语法

```javascript
// 基本声明形式
var    name = value;   // 函数作用域，可重新声明，可重新赋值
let    name = value;   // 块作用域，不可重新声明，可重新赋值
const  name = value;   // 块作用域，不可重新声明，不可重新赋值（必须初始化）

// 同时声明多个变量（逗号分隔）
let a = 1, b = 2, c;

// 只声明不赋值（const 不允许）
let x;        // ✅ x === undefined
var y;        // ✅ y === undefined
// const z;   // ❌ SyntaxError: Missing initializer
```

## 示例

### 示例 1：`var` vs `let` 的作用域差异

```javascript
function scopeDemo() {
  if (true) {
    var a = '我是 var';    // var 无视块
    let b = '我是 let';    // let 仅在块内
  }
  console.log(a);  // ✅ "我是 var" — var 穿透了 if 块
  console.log(b);  // ❌ ReferenceError: b is not defined
}
scopeDemo();
```

### 示例 2：`const` 不能重新绑定，但可以修改对象的属性

```javascript
const person = { name: 'Alice', age: 25 };

person.age = 26;          // ✅ 修改属性允许
console.log(person.age);  // 26

// person = { name: 'Bob' };  // ❌ TypeError: Assignment to constant variable

const arr = [1, 2, 3];
arr.push(4);              // ✅ 数组方法可以修改内容
console.log(arr);         // [1, 2, 3, 4]

// arr = [5, 6, 7];       // ❌ 不能重新赋值
```

### 示例 3：暂时性死区（Temporal Dead Zone, TDZ）

```javascript
console.log(myVar);   // ✅ undefined — var 提升并初始化为 undefined
var myVar = 10;

console.log(myLet);   // ❌ ReferenceError: Cannot access 'myLet' before initialization
let myLet = 20;

// TDZ 区间：从块开始到 let/const 声明位置之间的区域
{
  // TDZ 开始 — 此处访问 name 会报错
  // console.log(name);  // ❌ ReferenceError
  const name = 'TDZ';
  // TDZ 结束 — 此处之后可安全访问
  console.log(name);   // ✅ "TDZ"
}
```

### 示例 4：全局对象属性挂载差异

```javascript
var globalVar = '我是 var';       // 成为 window 的属性
let globalLet = '我是 let';       // 不成为 window 的属性
const globalConst = '我是 const'; // 不成为 window 的属性

console.log(window.globalVar);   // ✅ "我是 var"
console.log(window.globalLet);   // ❌ undefined
console.log(window.globalConst); // ❌ undefined
```

## 关键要点

1. **优先使用 `const`，需要重新赋值时用 `let`，避免使用 `var`** — 这是现代 JavaScript 的最佳实践（lint 工具如 ESLint 的推荐规则）。
2. **`const` 防止的是「重新绑定」，而不是「不可变」** — `const obj = {}` 仍然可以修改 `obj.key`，若需深度不可变请使用 `Object.freeze()` 或 TypeScript 的 `readonly`。
3. **`let` 和 `const` 存在暂时性死区（TDZ）** — 在声明之前访问会抛出 `ReferenceError`，而 `var` 会被提升并初始化为 `undefined`。
4. **在全局作用域下，`var` 声明的变量会成为 `window`（或 `globalThis`）的属性**，而 `let` 和 `const` 不会污染全局对象。
5. **同一作用域内 `let` 和 `const` 不允许重复声明**，而 `var` 允许重复声明（后者会覆盖前者）。
6. **`switch` 语句的 `case` 块中声明 `let`/`const` 需要显式包裹大括号**，否则会报重复声明错误。

## 常见错误

### 错误 1：误以为 `const` 的值完全不可变

```javascript
const data = [1, 2, 3];
data[0] = 99;     // ✅ 允许 — const 只保证引用不变
console.log(data); // [99, 2, 3]

// ❌ 正确理解：const 禁止重新赋值，不禁止修改内容
```

### 错误 2：在循环中使用 `var` 导致闭包共享同一变量

```javascript
// ❌ 反模式
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 打印: 3, 3, 3（不是 0, 1, 2）

// ✅ 正确修复：使用 let
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 打印: 0, 1, 2
```

### 错误 3：意外创建全局变量（省略声明关键字）

```javascript
function oops() {
  message = '我不小心成了全局变量';  // ❌ 没有 var/let/const
}
oops();
console.log(window.message);  // ✅ "我不小心成了全局变量" — 污染了全局空间

// ✅ 正确方式：始终使用 let 或 const
function correct() {
  const msg = '我是局部变量';
  return msg;
}
```

## 相关概念

- [let & const 声明](../syntax/let_const.md) — 深入理解块作用域、不可重复声明和 TDZ 规则
- [var 声明](../syntax/var.md) — 函数作用域、变量提升和全局对象挂载
- [闭包](../patterns/closure.md) — 变量作用域与函数结合的经典模式
- [模板字面量](../syntax/template_literals.md) — 在字符串中嵌入变量表达式 `${variable}`
- [函数](../topics/functions.md) — 函数内部的变量作用域规则

## 引用

- [MDN: JavaScript Variables](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables)
- [MDN: let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN: const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [MDN: var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [MDN: Temporal Dead Zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)
