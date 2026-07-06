---
type: JS Topic
title: Variables & Scope
description: var/let/const 声明方式与作用域规则，以及提升（hoisting）、暂时性死区（TDZ）等核心机制。
tags:
  - var
  - let
  - const
  - hoisting
  - scope
  - temporal dead zone
  - ES6
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#declarations
timestamp: '2026-07-06T09:36:18.473Z'
---

## 概述

变量声明是 JavaScript 中最基础也最重要的概念之一。JavaScript 提供了三种变量声明方式：`var`（ES5 及之前）、`let` 和 `const`（ES6 引入）。三者在**作用域规则**、**提升（hoisting）行为**、**重复声明限制**以及**全局对象绑定**上有显著差异。理解这些差异是写出可预测、易维护代码的前提。

## Syntax

```javascript
// var 声明 —— 函数作用域，可重复声明，会被提升
var x = 10;
var x = 20; // ✅ 允许重复声明

// let 声明 —— 块级作用域，不可重复声明，存在暂时性死区
let y = 30;
// let y = 40; // ❌ SyntaxError: 重复声明

// const 声明 —— 块级作用域，声明时必须初始化，引用不可变
const z = 50;
// z = 60; // ❌ TypeError: 不能重新赋值

// const 对象 —— 引用不可变，但属性可变
const obj = { a: 1 };
obj.a = 2; // ✅ 允许修改属性
// obj = {}; // ❌ 不能重新赋值给 const
```

## Examples

### 1. 作用域对比：函数作用域 vs 块级作用域

```javascript
function scopeDemo() {
  if (true) {
    var a = '函数作用域';
    let b = '块级作用域';
    const c = '块级作用域（常量）';
  }
  console.log(a); // ✅ '函数作用域' —— var 不受块作用域限制
  // console.log(b); // ❌ ReferenceError: b is not defined
  // console.log(c); // ❌ ReferenceError: c is not defined
}
scopeDemo();
```

### 2. 提升（Hoisting）与暂时性死区（TDZ）

```javascript
console.log(varValue); // ✅ undefined —— var 被提升但未初始化
// console.log(letValue); // ❌ ReferenceError: 暂时性死区
// console.log(constValue); // ❌ ReferenceError: 暂时性死区

var varValue = 'var 已赋值';
let letValue = 'let 已赋值';
const constValue = 'const 已赋值';

// 底层解释：var 声明会被提升到作用域顶部并初始化为 undefined
// let/const 会被提升到顶部但不会初始化，进入 TDZ
```

### 3. 全局声明差异

```javascript
// 在全局作用域下
var globalVar = '我是 var';
let globalLet = '我是 let';
const globalConst = '我是 const';

console.log(window.globalVar);  // ✅ '我是 var' —— var 挂载到全局对象
console.log(window.globalLet);   // ✅ undefined —— let 不在全局对象上
console.log(window.globalConst); // ✅ undefined —— const 不在全局对象上
```

### 4. const 的"不可变性"误解

```javascript
const person = { name: 'Alice', hobbies: [] };

person.name = 'Bob';        // ✅ 修改属性合法
person.hobbies.push('JS');  // ✅ 修改嵌套数组合法

// 若要彻底冻结对象，使用 Object.freeze()
const frozen = Object.freeze({ name: 'Eve', hobbies: [] });
// frozen.name = 'Adam'; // ❌ 严格模式下 TypeError
// frozen.hobbies.push('X'); // ❌ 即使 Object.freeze 也只冻结一层！

function deepFreeze(obj) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  return Object.freeze(obj);
}
```

## Key Points

1. **优先使用 `const`，其次 `let`，避免使用 `var`** —— `const` 表明变量的引用不会被重新赋值，使代码意图更清晰。
2. **`let` 和 `const` 存在暂时性死区（TDZ）** —— 从作用域顶部到声明语句之间的区域，访问变量会抛出 `ReferenceError`。
3. **`var` 声明被提升并初始化为 `undefined`**，而 `let`/`const` 仅被提升但不初始化，这是 TDZ 的根本原因。
4. **`var` 是函数作用域，`let`/`const` 是块级作用域** —— `if`、`for`、`while` 等花括号会为 `let`/`const` 创建独立的作用域。
5. **`const` 保证的是"引用不可变"而非"值不可变"** —— 基本类型值确实不可变，但对象和数组的内部属性可以被修改。
6. **在 `for` 循环中，`var` 和 `let` 的行为截然不同** —— `let` 每次迭代都会创建一个新的绑定，这对闭包场景至关重要。

## Common Mistakes

1. **误以为 `const` 声明不可修改任何值**
   ```javascript
   const arr = [1, 2, 3];
   arr.push(4);     // ✅ 合法，数组被修改了
   // arr = [5, 6]; // ❌ 这才是 const 禁止的操作
   ```
   **解决方案**：如果需要彻底不可变，使用 `Object.freeze()` 或考虑 TypeScript/Immer 等工具。

2. **在循环中使用 `var` 导致闭包陷阱**
   ```javascript
   // ❌ 错误：所有 setTimeout 都输出 3
   for (var i = 0; i < 3; i++) {
     setTimeout(() => console.log(i), 100);
   }
   // ✅ 正确：每个迭代有自己的 i
   for (let i = 0; i < 3; i++) {
     setTimeout(() => console.log(i), 100);
   }
   ```
   **解决方案**：用 `let` 替换 `var`，或使用 IIFE（立即执行函数表达式）创建闭包。

3. **重复声明变量**
   ```javascript
   let count = 10;
   // let count = 20; // ❌ SyntaxError: 标识符 'count' 已被声明
   
   // 但在不同作用域中可以重复命名
   function outer() {
     let value = '外部';
     function inner() {
       let value = '内部'; // ✅ 不同作用域，允许
       console.log(value);
     }
     inner();
   }
   ```
   **解决方案**：使用 linter（如 ESLint）可以在编码时捕捉此类错误。

## Related Concepts

- [箭头函数与作用域](../syntax/arrow_function.md) —— 箭头函数不绑定 `this`，继承外层作用域的 `this` 值
- [解构赋值](../syntax/destructuring.md) —— 从数组或对象中快速提取值到变量
- [模板字面量](../syntax/template_literals.md) —— 使用反引号和 `${}` 在字符串中嵌入变量
- [闭包](../patterns/closure.md) —— 函数与其词法作用域的捆绑，依赖于变量的作用域规则
- [函数与提升](../topics/functions.md) —— 函数声明同样存在提升行为

## Citations

- [MDN: Grammar and types — Declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#declarations)
- [MDN: let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN: const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [MDN: var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [MDN: Temporal Dead Zone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz)
