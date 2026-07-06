---
type: JS Topic
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
title: Functions
description: 函数声明、表达式、箭头函数及参数处理方式的完整指南。
tags:
- function
- arrow
- parameters
- return
- callback
- IIFE
- hoisting
- scope
timestamp: '2026-07-05T14:27:55+00:00'
---

## 概述

**函数（Function）** 是 JavaScript 中最重要的构建块之一。函数是一段可复用的代码块，用于执行特定任务，可以接受输入（参数）并返回输出（返回值）。JavaScript 的函数是一等公民（first-class citizens），意味着函数可以被赋值给变量、作为参数传递给其他函数、以及作为返回值从其他函数返回。理解函数的工作机制——包括声明方式、作用域规则、`this` 绑定和参数处理——是掌握 JavaScript 的核心。

## Syntax

### 函数声明（Function Declaration）

```javascript
function 函数名(参数1, 参数2, ...) {
  // 函数体
  return 返回值; // 可选
}
```

### 函数表达式（Function Expression）

```javascript
const 函数名 = function(参数1, 参数2, ...) {
  // 函数体
};
```

### 箭头函数（Arrow Function）

```javascript
const 函数名 = (参数1, 参数2, ...) => {
  // 函数体
  return 返回值;
};

// 隐式返回（单表达式时省略 {} 和 return）
const 函数名 = (参数1, 参数2) => 表达式;

// 单参数时省略 ()
const 函数名 = 参数 => 表达式;
```

### 立即执行函数表达式（IIFE）

```javascript
(function() {
  // 函数体
})();

// 或使用箭头函数
(() => {
  // 函数体
})();
```

## Examples

### 基础：三种函数定义方式对比

```javascript
// 1. 函数声明 — 会被提升（hoisted）
function greet(name) {
  return `Hello, ${name}!`;
}

// 2. 函数表达式 — 不会被提升
const greetExpr = function(name) {
  return `Hello, ${name}!`;
};

// 3. 箭头函数 — 简洁语法，无自己的 this
const greetArrow = (name) => `Hello, ${name}!`;

console.log(greet('Alice'));      // "Hello, Alice!"
console.log(greetExpr('Bob'));    // "Hello, Bob!"
console.log(greetArrow('Charlie')); // "Hello, Charlie!"
```

### 参数处理：默认值与剩余参数

```javascript
// 默认参数 — 当参数为 undefined 时生效
function createUser(name, role = 'guest', isActive = true) {
  return { name, role, isActive };
}

console.log(createUser('Alice'));           // { name: 'Alice', role: 'guest', isActive: true }
console.log(createUser('Bob', 'admin'));    // { name: 'Bob', role: 'admin', isActive: true }

// 剩余参数 — 收集所有剩余参数为数组
function sum(prefix, ...numbers) {
  const total = numbers.reduce((acc, n) => acc + n, 0);
  return `${prefix}: ${total}`;
}

console.log(sum('Total', 1, 2, 3, 4, 5)); // "Total: 15"
```

### 回调函数与高阶函数

```javascript
// 函数作为参数传递（回调）
function processArray(arr, callback) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(callback(arr[i], i));
  }
  return result;
}

const numbers = [1, 2, 3, 4, 5];

// 传入不同的回调实现不同的行为
const doubled = processArray(numbers, n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

const descriptions = processArray(numbers, (n, idx) => `索引 ${idx} 的值是 ${n}`);
console.log(descriptions);
// ["索引 0 的值是 1", "索引 1 的值是 2", ...]

// 函数作为返回值（闭包）
function createCounter(start = 0) {
  let count = start;
  return function() {
    count += 1;
    return count;
  };
}

const counter = createCounter(10);
console.log(counter()); // 11
console.log(counter()); // 12
console.log(counter()); // 13
```

### IIFE 与模块模式

```javascript
// IIFE 创建私有作用域，避免全局污染
const calculator = (function() {
  // 私有变量 — 外部无法直接访问
  let result = 0;

  return {
    // 公开方法
    add(n) {
      result += n;
      return this;
    },
    subtract(n) {
      result -= n;
      return this;
    },
    getResult() {
      return result;
    },
    reset() {
      result = 0;
      return this;
    }
  };
})();

calculator.add(10).subtract(3).add(5);
console.log(calculator.getResult()); // 12
console.log(calculator.result);      // undefined — 无法直接访问私有变量
```

## Key Points

- **函数声明会被提升（hoisted）**：整个函数声明（包括函数体）会被提升到作用域顶部，因此可以在声明之前调用。函数表达式和箭头函数则不会。
- **箭头函数没有自己的 `this`**：箭头函数从包围它的作用域继承 `this`，不能用 `call`、`apply` 或 `bind` 改变。这使得它们在回调中特别有用，但不适合作为对象方法。
- **`return` 语句**：如果不写 `return`，函数默认返回 `undefined`。箭头函数使用 `=> 表达式` 语法时，表达式的结果会自动返回（隐式返回）。
- **参数按值传递**：基本类型按值传递，对象按引用传递（但引用本身是按值传递的）。函数内部修改对象属性会影响外部。
- **`arguments` 对象**：传统函数（非箭头）内部有 `arguments` 类数组对象，包含所有传入参数。推荐用剩余参数（`...rest`）替代。
- **函数是一等公民**：可以赋值给变量、存入数组/对象、作为参数传入、作为返回值返回，这构成了高阶函数和函数式编程的基础。

## Common Mistakes

- **把箭头函数当作对象方法**：箭头函数不绑定 `this`，用作对象方法时 `this` 指向外部作用域（通常是 `window` 或 `undefined` 严格模式下），而非对象本身。
  ```javascript
  const obj = {
    value: 42,
    // ❌ 错误：箭头函数的 this 指向外部，不是 obj
    getValue: () => this.value,
    // ✅ 正确：使用传统函数表达式
    getValueCorrect() { return this.value; }
  };
  ```

- **忘记 `return` 导致函数返回 `undefined`**：箭头函数使用 `{}` 时必须写 `return`。
  ```javascript
  // ❌ 错误：花括号 {} 不会自动返回
  const double = (n) => { n * 2 };
  console.log(double(5)); // undefined

  // ✅ 正确：省略花括号以隐式返回
  const doubleFixed = (n) => n * 2;
  console.log(doubleFixed(5)); // 10
  ```

- **在循环中创建回调时捕获了相同的变量**：用 `var` 声明的变量在循环中只有一份，导致所有回调共享同一变量。
  ```javascript
  // ❌ 错误：所有回调都输出 3
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
  }

  // ✅ 正确：用 let 创建每次迭代的块级作用域
  for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100); // 0, 1, 2
  }
  ```

## Related Concepts

- [箭头函数](../syntax/arrow_function.md) — 箭头函数的详细语法和 `this` 绑定规则
- [默认参数](../syntax/default_params.md) — 参数默认值的工作原理
- [变量](../topics/variables.md) — `var`、`let`、`const` 与函数作用域的关系
- [闭包](../patterns/closure.md) — 函数与其词法环境的组合模式
- [异步函数](../topics/async.md) — Promise、async/await 与回调的关系

## Citations

- [MDN: Functions guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN: Function declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)
- [MDN: Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN: Default parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)
- [MDN: Rest parameters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
- [MDN: IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)
