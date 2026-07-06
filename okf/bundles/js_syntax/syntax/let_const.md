---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let
title: let & const
description: ES2015 引入的块级作用域变量声明，let 用于可重新赋值的变量，const 用于不可重新绑定的常量绑定。
tags:
- ES6
- block scope
- TDZ
- temporal dead zone
- immutable binding
- let
- const
- variable declaration
timestamp: '2026-07-05T14:29:43+00:00'
---

## 概述

`let` 和 `const` 是 ES2015（ES6）引入的两种现代变量声明方式，从根本上解决了 `var` 长期存在的**函数作用域**和**变量提升（hoisting）** 带来的诸多问题。`let` 用于声明可重新赋值的变量，`const` 用于声明不可重新绑定的常量绑定。两者都具有**块级作用域（block scope）**，并且存在**暂时性死区（Temporal Dead Zone, TDZ）**，即在声明之前访问变量会抛出 `ReferenceError`。在现代 JavaScript 开发中，应默认使用 `const`，仅在需要重新赋值时使用 `let`，彻底摒弃 `var`。

## Syntax

```javascript
// let 声明 —— 可以声明时不初始化
let name;
let name = value;
let name1 = value1, name2 = value2; // 不推荐逗号分隔，建议分开声明

// const 声明 —— 必须立即初始化（声明即赋值）
const NAME = value;
// const NAME;            // SyntaxError: Missing initializer in const declaration

// 块级作用域示例
{
  let x = 10;
  const Y = 20;
  console.log(x, Y);     // ✅ 块内可访问
}
// console.log(x);        // ReferenceError: x is not defined
// console.log(Y);        // ReferenceError: Y is not defined
```

## Examples

### 基本用法：块级作用域 vs 函数作用域

```javascript
// var 是函数作用域 —— for 循环结束后 i 仍然存在且被共享
for (var i = 0; i < 3; i++) {
  // 循环体
}
console.log(i); // 3，var 泄露到循环外部，污染了外部作用域

// let 是块级作用域 —— 循环结束后变量被回收
for (let j = 0; j < 3; j++) {
  // 循环体
}
// console.log(j); // ReferenceError: j is not defined

// 独立块语句同样适用块级作用域
{
  let blockScoped = '仅在此块内可见';
  var functionScoped = '全局可见';
}
// console.log(blockScoped); // ReferenceError
console.log(functionScoped); // '全局可见'
```

### const 的不可重新绑定与可变性陷阱

```javascript
const PI = 3.14159;
// PI = 3;            // TypeError: Assignment to constant variable

// ✅ const 对象的内容可以被修改 —— const 只禁止重新绑定，不禁止内容变更
const user = { name: 'Alice', age: 30 };
user.age = 31;        // ✅ 属性修改是允许的
console.log(user);    // { name: 'Alice', age: 31 }

// user = {};         // TypeError: 重新赋值整个对象是不允许的

// 使用 Object.freeze() 实现浅层不可变
const frozen = Object.freeze({ name: 'Bob', address: { city: 'NYC' } });
// frozen.name = 'Charlie'; // 严格模式下 TypeError，非严格模式静默失败
// 注意：freeze 是浅层的，嵌套对象仍可修改
frozen.address.city = 'LA';  // ✅ 深层对象未被冻结！
```

### 暂时性死区（TDZ）演示

```javascript
// 理解 TDZ：从作用域顶部到声明语句之间的区域
{
  // TDZ 开始 —— 作用域顶部到声明语句之间
  // console.log(x);  // ReferenceError: Cannot access 'x' before initialization
  // console.log(y);  // ReferenceError: Cannot access 'y' before initialization

  let x = 'after TDZ';
  const y = 'also after TDZ';

  console.log(x); // ✅ 'after TDZ'
  console.log(y); // ✅ 'also after TDZ'
}

// typeof 在 TDZ 中也会抛出错误（与 var 不同）
// console.log(typeof undeclaredVar);        // 'undefined' —— 未声明的变量
// console.log(typeof myLet);               // ReferenceError: 在 TDZ 中
let myLet = 42;
```

### 循环中 let 的每次迭代独立绑定

```javascript
// 经典面试题：var 在 setTimeout 回调中捕获同一个变量引用
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var:', i), 100);
}
// 输出: var: 3, var: 3, var: 3
// 原因：所有回调共享同一个 i 变量，循环结束时 i = 3

// let 为每次循环创建独立的词法绑定
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let:', j), 100);
}
// 输出: let: 0, let: 1, let: 2
// 原因：每次迭代都会创建新的 j 绑定，回调捕获的是当前迭代的值
```

### 全局声明不创建 window 属性

```javascript
var globalVar = '通过 var 声明';
let globalLet = '通过 let 声明';
const globalConst = '通过 const 声明';

console.log(window.globalVar);   // '通过 var 声明' —— var 会挂载到 window
console.log(window.globalLet);   // undefined —— let 不会
console.log(window.globalConst); // undefined —— const 不会
```

## Key Points

- **块级作用域**：`let` 和 `const` 只在声明所在的 `{ }` 块内有效，包括 `if`、`for`、`while`、`switch` 以及独立的块语句。这是与 `var`（函数作用域）最根本的区别。
- **暂时性死区（TDZ）**：从作用域顶部到声明语句之间的区域称为 TDZ，在此区域内访问变量会抛出 `ReferenceError`，包括使用 `typeof` 运算符也会报错。`var` 在此区域内则返回 `undefined`。
- **const 不是不可变**：`const` 禁止的是**重新绑定**（即不能重新赋值），但不保证值本身不可变。对象的属性、数组的元素仍然可以被修改。若需深层不可变，请使用 `Object.freeze()`（浅层）或 immutable 库。
- **必须初始化**：`const` 声明时必须同时赋值，不能先声明后赋值；`let` 可以声明而不赋值（值为 `undefined`）。
- **全局声明不创建 window 属性**：在全局作用域中用 `let` 或 `const` 声明的变量不会成为 `window` 对象的属性（`var` 则会），这避免了全局命名空间的意外污染。
- **不允许重复声明**：在同一作用域内用 `let` 或 `const` 重复声明同一变量会抛出 `SyntaxError`，而 `var` 允许重复声明（后者覆盖前者）。
- **推荐实践**：默认使用 `const`，只在确定需要重新赋值时使用 `let`。避免使用 `var`。这能减少意外副作用，让代码意图更清晰。

## Common Mistakes

- **混淆 const 的"不可变"含义**：认为 `const` 声明的对象或数组完全不可变。记住 `const` 只保证绑定不可变，不保证值不可变。若需要真正的常量，考虑 `Object.freeze()` 或 TypeScript 的 `as const`。
  ```javascript
  const arr = [1, 2, 3];
  arr.push(4);        // ✅ 允许 —— 数组被修改了
  // arr = [5, 6, 7]; // TypeError

  const obj = {};
  obj.key = 'value';  // ✅ 允许
  ```

- **在 TDZ 中访问变量**：特别是在有复杂依赖顺序的模块中，容易在 `let`/`const` 声明之前意外引用它们。使用 `class` 声明也会产生暂时性死区。
  ```javascript
  function foo() {
    console.log(value);   // ReferenceError（TDZ 内访问）
    let value = 42;
  }

  // 另一个常见场景：相互依赖的初始化
  const a = b + 1;  // ReferenceError: Cannot access 'b' before initialization
  const b = a + 1;
  ```

- **switch 语句中的块级作用域陷阱**：`switch` 的每个 `case` 共享同一个块，直接用 `let`/`const` 声明会导致重复声明错误。
  ```javascript
  switch (x) {
    case 1:
      let msg = 'one';   // SyntaxError: 重复声明
      break;
    case 2:
      let msg = 'two';   // 同上，msg 已在同一块中声明
      break;
  }
  // 修复：为每个 case 添加花括号，创建独立作用域
  switch (x) {
    case 1: { let msg = 'one'; console.log(msg); break; }
    case 2: { let msg = 'two'; console.log(msg); break; }
  }
  ```

## Related Concepts

- [var](../syntax/var.md) — 函数作用域、变量提升的旧式声明方式，了解其与 `let`/`const` 的区别至关重要。
- [变量](../topics/variables.md) — JavaScript 变量体系的全面概述，涵盖声明、作用域和命名规则。
- [闭包](../patterns/closure.md) — `let` 的块级作用域与每次迭代独立绑定特性，为闭包应用带来更直观的行为。
- [模板字面量](../syntax/template_literals.md) — 常与 `const` 配合使用，声明不可变的模板字符串。
- [解构赋值](../syntax/destructuring.md) — 与 `let` 和 `const` 配合使用，从数组或对象中提取值。
- [async/await](../syntax/async_await.md) — 异步函数中常使用 `const` 声明 Promise 结果变量。

## Citations

- [MDN: let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN: const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [ECMAScript 2015 Specification — Let and Const Declarations](https://262.ecma-international.org/6.0/#sec-let-and-const-declarations)
- [You Don't Know JS: Scope & Closures — Chapter 5](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/scope%20%26%20closures/ch5.md)
