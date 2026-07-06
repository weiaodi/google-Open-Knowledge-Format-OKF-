---
type: JS Syntax
title: Arrow Functions
description: ES6 简洁函数语法，具有词法 this 绑定、隐式返回特性，不能用作构造函数
tags:
  - ES6
  - '=>'
  - lexical this
  - implicit return
  - concise body
  - arrow function
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
timestamp: '2026-07-06T09:37:23.234Z'
---

## 概述

**箭头函数（Arrow Function）** 是 ES6 引入的一种更简洁的函数书写方式，使用 `=>` 语法。它有两个核心特征：一是语法上比传统函数表达式更精简（支持单行隐式返回）；二是**词法 this 绑定**——它不会创建自己的 `this`，而是从外层作用域继承 `this`。箭头函数非常适合用于回调函数、数组方法（`map`、`filter`、`reduce`）以及需要保留外层上下文的场景。但它不能用作构造函数，也没有 `arguments` 对象和 `prototype` 属性。

## Syntax

```javascript
// 基础语法
(param1, param2, …, paramN) => { statements }

// 单一参数时可省略括号
singleParam => { statements }

// 无参数时必须写空括号
() => { statements }

// 单行表达式自动隐式返回（不加 {}）
(param1, param2) => expression
// 等价于 (param1, param2) => { return expression; }

// 返回对象字面量时，必须用 () 包裹
(param1, param2) => ({ key: value })
```

## Examples

### 基础用法 — 隐式返回与简化

```javascript
// 传统函数表达式
const numbers = [1, 2, 3, 4];
const doubled1 = numbers.map(function(n) {
  return n * 2;
});

// 箭头函数：单行隐式返回，极为简洁
const doubled2 = numbers.map(n => n * 2);

console.log(doubled2); // [2, 4, 6, 8]
```

### 词法 this 绑定 — 解决回调中 this 丢失问题

```javascript
function Timer() {
  this.seconds = 0;

  // 传统函数：setInterval 回调中的 this 指向 window/undefined
  setInterval(function() {
    this.seconds++; // ❌ 这里的 this 不是 Timer 实例
    console.log(this.seconds); // NaN
  }, 1000);

  // 箭头函数：从外层作用域继承 this
  setInterval(() => {
    this.seconds++; // ✅ this 指向 Timer 实例
    console.log(this.seconds); // 1, 2, 3...
  }, 1000);
}

new Timer();
```

### 与数组方法结合 — 函数式编程风格

```javascript
const users = [
  { name: 'Alice', age: 28 },
  { name: 'Bob', age: 22 },
  { name: 'Charlie', age: 32 }
];

// 链式调用：filter + map + sort
const result = users
  .filter(user => user.age >= 25)           // 筛选年龄 ≥25
  .map(user => ({ name: user.name, age: user.age }))  // 提取字段
  .sort((a, b) => a.age - b.age);           // 按年龄升序

console.log(result);
// [{ name: 'Alice', age: 28 }, { name: 'Charlie', age: 32 }]
```

### 解构参数与剩余参数

```javascript
// 参数解构
const fullNames = [
  { first: 'John', last: 'Doe' },
  { first: 'Jane', last: 'Smith' }
];
fullNames.forEach(({ first, last }) => {
  console.log(`${first} ${last}`); // John Doe, Jane Smith
});

// 剩余参数 + 默认值
const sum = (base = 0, ...nums) => nums.reduce((acc, n) => acc + n, base);
console.log(sum(10, 1, 2, 3)); // 16
```

## Key Points

1. **词法 this** — 箭头函数不绑定 `this`，它从包围它的最近的非箭头函数作用域继承 `this`。这意味着 `call`、`apply`、`bind` 无法改变箭头函数的 `this`。
2. **不能用作构造函数** — 使用 `new` 调用箭头函数会抛出 `TypeError: Foo is not a constructor`，因为它没有 `[[Construct]]` 内部方法。
3. **没有 `arguments` 对象** — 箭头函数内部没有 `arguments`。如需类数组参数，请使用**剩余参数**（`...args`）语法。
4. **没有 `prototype` 属性** — 箭头函数的 `prototype` 为 `undefined`，因此无法作为类或构造函数的基础。
5. **不能用作 generator** — 箭头函数中不能使用 `yield` 关键字（除非包裹在生成器函数内部）。
6. **隐式返回规则** — 当函数体为单行表达式（无 `{}`）时，该表达式的结果会被**自动返回**。返回对象字面量时必须加 `()` 包裹，否则花括号会被解释为函数体。

## Common Mistakes

1. **对象方法中使用箭头函数导致 this 指向错误**

```javascript
const counter = {
  count: 0,
  // ❌ 错误：箭头函数的 this 指向外层（全局/undefined），而非 counter 对象
  increment: () => {
    this.count++; // this 不是 counter
  },
  // ✅ 正确：使用传统函数表达式或方法简写
  increment() {
    this.count++;
  }
};
counter.increment();
console.log(counter.count); // 1（正确版本）或 NaN（错误版本）
```

2. **忘记给对象字面量加括号导致意外行为**

```javascript
const getPerson = () => { name: 'Alice', age: 28 };
// ❌ 错误！花括号被视为函数体，'name' 被当作 label，返回 undefined
console.log(getPerson()); // undefined

// ✅ 正确：用括号包裹对象字面量
const getPersonFixed = () => ({ name: 'Alice', age: 28 });
console.log(getPersonFixed()); // { name: 'Alice', age: 28 }
```

3. **在需要动态 this 的场景下使用箭头函数**

```javascript
// ❌ 错误：箭头函数无法绑定动态 this
button.addEventListener('click', () => {
  this.textContent = 'Clicked'; // this 不是 button 元素
});

// ✅ 正确：使用传统函数获取动态 this
button.addEventListener('click', function() {
  this.textContent = 'Clicked'; // this 指向 button
});
```

## Related Concepts

- [Functions](../topics/functions.md) — 函数声明、表达式与箭头函数的对比和区别
- [Closure](../patterns/closure.md) — 箭头函数的词法 this 本质上是闭包机制的体现
- [Variables](../topics/variables.md) — 箭头函数配合 `const`/`let` 声明函数变量的最佳实践
- [Array](../builtin/array.md) — 箭头函数在 `map`、`filter`、`reduce` 等数组方法中的高频应用
- [Destructuring](../syntax/destructuring.md) — 箭头函数参数中配合解构赋值的使用模式

## Citations

- [MDN: Arrow Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- ECMAScript 2015 (ES6) Specification — Section 14.2: Arrow Function Definitions
