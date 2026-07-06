---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
title: Arrow Functions
description: 箭头函数是 ES2015 引入的简洁函数语法，提供词法 this 绑定，不可用作构造函数。
tags:
- =>
- lexical this
- concise body
- implicit return
- ES6
- function
- callback
timestamp: '2026-07-05T14:30:22+00:00'
---

## 概述

箭头函数（Arrow Function）是 ES2015 (ES6) 引入的一种更简洁的函数定义语法，使用 `=>` 代替 `function` 关键字。它最核心的特性是**词法 this 绑定**——箭头函数本身不绑定 `this`，而是从外围作用域继承 `this`，这解决了传统函数中 `this` 指向随调用方式变化而引发的常见问题。箭头函数常用于回调、数组迭代方法（`map`、`filter`、`reduce`）以及需要保持外层 `this` 的场景，但**不能用作构造函数**，也不适用于需要 `arguments` 对象或动态 `this` 的场合。

## Syntax

```javascript
// 1. 无参数：必须使用空括号
() => { ... }

// 2. 单参数：括号可选
param => { ... }
(param) => { ... }

// 3. 多参数：必须用括号
(param1, param2) => { ... }

// 4. 简洁体（表达式体）：省略 return 和花括号，隐式返回表达式结果
(param1, param2) => expression
// 等价于 (param1, param2) => { return expression; }

// 5. 返回对象字面量：必须用括号包裹对象
() => ({ key: value })

// 6. 与解构参数结合
({ name, age }) => { ... }
([first, second]) => { ... }

// 7. 异步箭头函数
async () => { ... }
async param => { ... }
```

## Examples

### 基础用法：传统函数 vs 箭头函数

```javascript
// 传统函数表达式
const add = function(a, b) {
  return a + b;
};

// 箭头函数 —— 一行搞定
const addArrow = (a, b) => a + b;

console.log(addArrow(3, 4)); // 7
```

### 数组迭代中的优雅应用

```javascript
const numbers = [1, 2, 3, 4, 5];

// map：每个元素加倍
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// filter：筛选偶数
const evens = numbers.filter(n => n % 2 === 0);
console.log(evens); // [2, 4]

// reduce：求和，多参数时必须用括号
const sum = numbers.reduce((acc, cur) => acc + cur, 0);
console.log(sum); // 15
```

### 词法 this 绑定 —— 最关键的用途

```javascript
// 传统函数的问题：setTimeout 中 this 丢失
function Timer() {
  this.seconds = 0;

  // ❌ 传统函数中 this 指向 window/undefined
  setInterval(function() {
    this.seconds++; // this 不是 Timer 实例！
    console.log(this.seconds); // NaN 或 undefined
  }, 1000);
}

// ✅ 箭头函数修复：this 继承自外围作用域
function TimerFixed() {
  this.seconds = 0;

  setInterval(() => {
    this.seconds++; // this 正确地指向 TimerFixed 实例
    console.log(this.seconds); // 1, 2, 3...
  }, 1000);
}

// 类方法中的场景更常见
class Counter {
  constructor() {
    this.count = 0;
  }

  start() {
    // ✅ 箭头函数自动捕获外围的 this（即 Counter 实例）
    setInterval(() => {
      console.log(this.count++);
    }, 1000);
  }
}
```

### 返回对象字面量的注意点

```javascript
// ❌ 错误：花括号被解析为函数体
const getObj = () => { name: 'Alice', age: 25 };
console.log(getObj()); // undefined —— 实际执行了空函数体

// ✅ 正确：用括号包裹对象字面量
const getObjFixed = () => ({ name: 'Alice', age: 25 });
console.log(getObjFixed()); // { name: 'Alice', age: 25 }
```

## Key Points

1. **词法 `this`**：箭头函数没有自己的 `this`，它会捕获定义时所在外层作用域的 `this` 值，且一旦绑定无法通过 `call()`、`apply()` 或 `bind()` 改变。
2. **不能用作构造函数**：箭头函数没有 `[[Construct]]` 内部方法，使用 `new` 调用会抛出 `TypeError: xxx is not a constructor`。
3. **没有 `arguments` 对象**：箭头函数不绑定 `arguments`，若需要可变参数应使用 rest 参数 `(...args) => { ... }`。
4. **不能用作 generator**：箭头函数体内不能使用 `yield` 关键字（除非嵌套在 generator 函数内）。
5. **简洁体与隐式返回**：当函数体只有单个表达式时，可省略花括号和 `return`，表达式结果自动返回；多语句体必须使用花括号并显式 `return`。
6. **返回对象字面量必须加括号**：`() => ({ key: value })`，否则花括号会被解析为函数体块。

## Common Mistakes

1. **在对象方法中使用箭头函数导致 `this` 错误**

```javascript
// ❌ 错误：箭头函数让 this 指向对象外的全局作用域
const user = {
  name: 'Alice',
  greet: () => {
    return `Hello, ${this.name}`; // this 是 window/undefined，不是 user
  }
};

// ✅ 正确：对象方法应使用传统函数表达式
const userFixed = {
  name: 'Alice',
  greet() {
    return `Hello, ${this.name}`; // this 正确地指向 user
  }
};
```

2. **在 DOM 事件监听中丢失 event 目标**

```javascript
// ❌ 错误：箭头函数中 this 不指向触发事件的元素
button.addEventListener('click', () => {
  this.textContent = 'Clicked'; // this !== button
  this.classList.add('active');  // 不会生效
});

// ✅ 正确：使用传统函数，或通过 event.target
button.addEventListener('click', function() {
  this.textContent = 'Clicked'; // this 指向 button
});
// 或使用 event 参数
button.addEventListener('click', (e) => {
  e.target.textContent = 'Clicked';
});
```

3. **需要动态 `this` 的场景错误使用箭头函数**

```javascript
// ❌ 错误：箭头函数的 this 无法被 bind 改变
function greet() {
  return this.name;
}

const obj1 = { name: 'Alice' };
const obj2 = { name: 'Bob' };

const boundGreet = greet.bind(obj1);
console.log(boundGreet()); // 'Alice' ✅ 传统函数 bind 有效

const arrowGreet = () => this.name;
const boundArrow = arrowGreet.bind(obj1);
console.log(boundArrow()); // ❌ 仍然是全局 this，bind 无效
```

## Related Concepts

- [Functions](../topics/functions.md) —— JavaScript 函数体系总览，箭头函数与传统函数的对比
- [Default Parameters](../syntax/default_params.md) —— 箭头函数同样支持默认参数语法
- [Closure](../patterns/closure.md) —— 箭头函数与词法作用域结合实现数据封装
- [Async/Await](../syntax/async_await.md) —— `async` 箭头函数的写法与异步回调
- [Destructuring](../syntax/destructuring.md) —— 箭头函数参数中常用解构模式提取对象/数组值
- [Spread/Rest](../syntax/spread_rest.md) —— 使用 rest 参数 `(...args)` 替代 `arguments` 对象
- [Variables](../topics/variables.md) —— `const`/`let` 定义箭头函数变量的作用域规则
- [Arrays and Iteration](../topics/arrays_and_iteration.md) —— `map`/`filter`/`reduce` 中箭头函数的典型应用

## Citations

- [MDN: Arrow Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [ECMAScript 2015 Specification: Arrow Function Definitions](https://262.ecma-international.org/6.0/#sec-arrow-function-definitions)
