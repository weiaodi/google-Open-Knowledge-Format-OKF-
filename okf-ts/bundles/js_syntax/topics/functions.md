---
type: JS Topic
title: Functions
description: 函数声明、表达式、箭头函数与高阶函数 — JavaScript 中以函数为第一公民的核心编程范式
tags:
  - function declaration
  - function expression
  - higher-order
  - first-class
  - callback
  - scope
  - ES5
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
timestamp: '2026-07-06T09:36:39.537Z'
---

## 概述

**Functions（函数）** 是 JavaScript 中最核心的构建块。JavaScript 中的函数是**第一公民（first-class citizens）**，意味着函数可以赋值给变量、作为参数传递给其他函数、作为返回值从其他函数中返回。这种特性让 JavaScript 天然支持**高阶函数（Higher-Order Functions）** 和**回调（callbacks）** 模式。函数定义了可复用的代码块，拥有自己的作用域，并能通过 `return` 返回值。理解函数的不同定义方式、执行上下文和 `this` 绑定是掌握 JavaScript 的关键。

## Syntax

### 1. 函数声明（Function Declaration）

```javascript
function functionName(param1, param2, ...) {
  // 函数体
  return value; // 可选
}
```

### 2. 函数表达式（Function Expression）

```javascript
const functionName = function(param1, param2, ...) {
  // 函数体
};

// 具名函数表达式
const named = function myName(param) {
  // myName 仅在函数内部可访问
};
```

### 3. 箭头函数

```javascript
const fn = (param1, param2) => {
  return param1 + param2;
};

// 隐式返回（单表达式时）
const add = (a, b) => a + b;

// 单参数可省略括号
const double = x => x * 2;
```

### 4. 参数默认值与剩余参数

```javascript
function greet(name = 'Guest', ...args) {
  console.log(name, args);
}
```

## Examples

### 基本示例：多种函数定义方式

```javascript
// 函数声明——会被提升（hoisted）
function square(x) {
  return x * x;
}

// 函数表达式——不会提升
const cube = function(x) {
  return x * x * x;
};

// 箭头函数——简洁，无 this 绑定
const absolute = (x) => (x < 0 ? -x : x);

console.log(square(4));    // 16
console.log(cube(3));      // 27
console.log(absolute(-5)); // 5
```

### 高阶函数：函数作为参数与返回值

```javascript
// 函数作为参数——回调模式
function repeat(n, action) {
  for (let i = 0; i < n; i++) {
    action(i);
  }
}

repeat(3, console.log); // 0 1 2

// 函数作为返回值——闭包工厂
function createMultiplier(factor) {
  return function(number) {
    return number * factor;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(10)); // 20
console.log(triple(10)); // 30
```

### 闭包与数据封装

```javascript
function createCounter(initial = 0) {
  let count = initial; // 私有变量

  return {
    increment: () => ++count,
    decrement: () => --count,
    getValue: () => count
  };
}

const counter = createCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.decrement(); // 11
console.log(counter.getValue()); // 11
// count 变量对外不可直接访问，实现了封装
```

### 方法与 this 绑定

```javascript
const person = {
  name: 'Alice',
  // 方法简写 (ES6)
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  },
  // 箭头函数不会绑定自己的 this
  greetArrow: () => {
    console.log(`Hello, I'm ${this.name}`);
  }
};

person.greet();      // "Hello, I'm Alice"
person.greetArrow(); // "Hello, I'm undefined"（箭头函数的 this 指向外层作用域）

// 使用 call / apply / bind 显式绑定 this
function introduce(prefix) {
  console.log(`${prefix} ${this.name}`);
}

introduce.call(person, 'Hi!');  // "Hi! Alice"
const boundIntroduce = introduce.bind(person);
boundIntroduce('Hey!');          // "Hey! Alice"
```

## Key Points

1. **函数声明会被提升（hoisted）**，可以在声明之前调用；函数表达式则不会，必须先赋值后调用。
2. **箭头函数没有自己的 `this`、`arguments`、`super` 和 `new.target`**，它从外层作用域继承 `this`。不适合用作对象方法或构造函数。
3. **JavaScript 函数总是会返回值**：如果没有 `return` 语句，默认返回 `undefined`。箭头函数单表达式形式会隐式返回。
4. **`arguments` 对象**（类数组）只在普通函数中可用，箭头函数中没有。推荐使用剩余参数 `...args` 替代。
5. **函数是对象**，可以拥有属性（如 `function.name`、`function.length`），也可以被动态添加属性。
6. **每个函数在调用时都会创建新的执行上下文**，闭包就是利用这一机制让内部函数"记住"外部函数的变量。

## Common Mistakes

### 在对象方法中使用箭头函数丢失 this

```javascript
const user = {
  name: 'Bob',
  // ❌ 错误：箭头函数不绑定 this
  sayHi: () => `Hi, ${this.name}`,
  // ✅ 正确：使用普通函数或方法简写
  sayHiCorrect() {
    return `Hi, ${this.name}`;
  }
};
console.log(user.sayHi());       // "Hi, undefined"
console.log(user.sayHiCorrect());// "Hi, Bob"
```

### 忘记函数默认返回 undefined

```javascript
function multiply(a, b) {
  // ❌ 忘记写 return
  a * b;
}
console.log(multiply(3, 4)); // undefined —— 不是 12!

// ✅ 修复
function multiplyFixed(a, b) {
  return a * b;
}
```

### 混淆函数声明和函数表达式的提升行为

```javascript
// ✅ 函数声明可以在定义前调用
console.log(add(2, 3)); // 5
function add(a, b) { return a + b; }

// ❌ 函数表达式在定义前调用会报错
console.log(sub(5, 2)); // TypeError: sub is not a function
const sub = function(a, b) { return a - b; };
```

## Related Concepts

- [箭头函数](../syntax/arrow_function.md) — 更简洁的函数语法，词法 `this` 绑定
- [闭包](../patterns/closure.md) — 函数保留对外部作用域变量引用的能力
- [变量作用域](../topics/variables.md) — `var`、`let`、`const` 在函数中的作用域规则
- [异步编程](../topics/async.md) — 回调函数、事件循环与异步函数模式
- [Promise](../builtin/promise.md) — 基于回调的异步管理模式的演进
- [数组高阶方法](../builtin/array.md) — `map`、`filter`、`reduce` 等函数式编程工具

## Citations

- [MDN: Functions guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN: Function declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)
- [MDN: Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [ECMAScript® Language Specification — Function Definitions](https://tc39.es/ecma262/#sec-function-definitions)
