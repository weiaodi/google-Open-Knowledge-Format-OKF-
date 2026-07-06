---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var
title: var declaration
description: 函数作用域变量声明，存在变量提升（hoisting），是 ES1 以来的传统声明方式。
tags:
- function scope
- hoisting
- global scope
- ES1
- variable declaration
timestamp: '2026-07-05T14:30:05+00:00'
---

`var` 是 JavaScript 中最古老的变量声明关键字（自 ES1 起）。它声明的变量具有**函数作用域**而非块级作用域，并且存在**变量提升（hoisting）** 行为——声明会被提升到当前作用域顶部，但赋值保留在原位。在 ES2015（ES6）引入 `let` 和 `const` 之后，`var` 在日常开发中已逐渐被取代，但在理解遗留代码、全局变量声明以及提升机制时仍然必不可少。

## Syntax

```javascript
var variableName;           // 声明，初始值为 undefined
var variableName = value;   // 声明并赋值
var name1 = val1, name2;    // 同时声明多个变量
var x = 1, y = 2, z = 3;   // 多变量声明并赋值
```

- `variableName` — 变量名，遵循标识符命名规则（字母、`_`、`$`、数字，数字不能开头）
- `value` — 任意 JavaScript 表达式的值
- 变量声明在任何实际代码执行之前被处理（提升）
- 未经初始化时，默认值为 `undefined`

## Examples

```javascript
// 示例 1: 基本声明与赋值
var name = 'Alice';
console.log(name); // 输出 "Alice"

var age;           // 只声明不赋值
console.log(age);  // 输出 undefined
```

```javascript
// 示例 2: 变量提升（hoisting）—— 声明的提升
console.log(message);   // 输出 undefined，而不是 ReferenceError
var message = 'Hello';  // 赋值仍然在原位执行

// 上面代码实际被引擎理解为：
// var message;           // 声明被提升到顶部
// console.log(message);  // undefined
// message = 'Hello';     // 赋值保留在原处
```

```javascript
// 示例 3: 函数作用域 —— var 没有块级作用域
function example() {
  if (true) {
    var x = 10;   // x 在整个 example 函数内都可见
  }
  console.log(x); // 输出 10 —— 块没有隔离 var

  for (var i = 0; i < 3; i++) {
    // i 在整个函数内可见
  }
  console.log(i); // 输出 3 —— 循环结束后的 i 仍然存在
}

example();
```

```javascript
// 示例 4: 在循环中重复声明同一个变量不会报错
var counter = 0;
var counter = 1;  // ✅ 允许重复声明
var counter;      // ✅ 重复声明不会重置值
console.log(counter); // 输出 1

// 对比：let 不允许重复声明
// let a = 1;
// let a = 2; // SyntaxError: Identifier 'a' has already been declared
```

## Key Points

- **函数作用域**：`var` 声明的变量在整个函数内（而不是块内）可见，这是它与 `let`/`const` 最本质的区别。
- **变量提升（Hoisting）**：声明被提升到当前作用域顶部，但赋值顺序不变。因此在声明前访问变量不会报错，只会得到 `undefined`。
- **全局对象的属性**：在全局作用域使用 `var` 声明的变量会成为 `window`（浏览器）或 `global`（Node.js）的属性。`let` 和 `const` 则不会。
- **允许重复声明**：在同一作用域内，`var` 可以重复声明同名变量，不会触发错误。这在大型项目中容易导致意外覆盖。
- **没有暂时性死区（TDZ）**：与 `let`/`const` 不同，`var` 不存在暂时性死区——在声明前访问得到的是 `undefined` 而非 `ReferenceError`。
- **默认值为 `undefined`**：只声明不赋值的 `var` 变量，初始值一律为 `undefined`。

## Common Mistakes

- **误以为 `var` 有块级作用域而写出意外行为**
  ```javascript
  // 错误：认为 if 块会限制变量的可见范围
  if (false) {
    var status = 'active';
  }
  console.log(status); // 输出 undefined（不会报错），因为 var 声明被提升

  // 修正：使用 let 获得块级作用域
  if (false) {
    let status = 'active';
  }
  // console.log(status); // ReferenceError: status is not defined
  ```

- **在循环中误用 `var` 导致闭包捕获同一个变量**
  ```javascript
  // 错误：所有回调都捕获同一个 i
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100); // 3, 3, 3
  }

  // 修正：使用 let（块级作用域）或 IIFE 创建新作用域
  for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100); // 0, 1, 2
  }

  // 或者用 IIFE 包裹（老式写法）
  for (var i = 0; i < 3; i++) {
    (function(j) {
      setTimeout(() => console.log(j), 100); // 0, 1, 2
    })(i);
  }
  ```

- **在全局作用域意外覆盖已有属性**
  ```javascript
  // 错误：var 声明会覆盖 window 上的属性
  var name = 'MyApp';       // window.name 被覆盖
  var top = 'something';    // window.top 被覆盖（可能破坏页面！）

  // 修正：使用 let 或 const 不影响全局对象
  let name = 'MyApp';       // 不会变成 window.name
  const top = 'something';  // 不会变成 window.top
  ```

## Related Concepts

- [let 和 const 声明](../syntax/let_const.md) — ES6 引入的块级作用域变量声明，推荐在现代 JavaScript 中替代 `var`
- [变量](../topics/variables.md) — JavaScript 变量声明方式的全面概述，涵盖作用域、提升和最佳实践

## Citations

- [MDN: var statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [MDN: Variable hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- [ECMAScript Specification — var statement](https://tc39.es/ecma262/#sec-variable-statement)
