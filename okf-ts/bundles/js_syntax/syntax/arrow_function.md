---
type: JS Syntax
title: Arrow Functions
description: ES6 引入的简洁函数语法，具备词法 this 绑定，不能用作构造函数。
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
tags:
  - '=>'
  - lexical this
  - implicit return
  - concise body
  - ES6
  - function
  - class field
  - auto-bound method
timestamp: '2026-07-07T03:22:28.195Z'
---


## 概述

**箭头函数（Arrow Function）** 是 ES6 引入的一种更简洁的函数书写方式，使用 `=>` 语法。与传统的 `function` 关键字不同，箭头函数不绑定自己的 `this`、`arguments`、`super` 或 `new.target`，它会从外围（封闭的）作用域捕获 `this` 值（即**词法 this 绑定**）。箭头函数最适合用于简短的回调函数、数组方法（如 `map`、`filter`、`reduce`）以及需要保留外部上下文 `this` 的场景。但要注意，箭头函数**不能**用作构造函数，也没有 `prototype` 属性。

---

## 语法

```javascript
// 1. 无参数 —— 必须使用空括号
() => { ... }

// 2. 单个参数 —— 括号可以省略
param => { ... }

// 3. 多个参数 —— 括号必须保留
(param1, param2) => { ... }

// 4. 函数体为单个表达式 —— 隐式返回（省略 return 和花括号）
(param1, param2) => expression

// 5. 返回对象字面量 —— 需要用括号包裹
(param1, param2) => ({ key: value })
```

---

## 示例

### 示例 1：基本用法与隐式返回

```javascript
// 传统函数
const squares1 = [1, 2, 3].map(function (x) {
  return x * x;
});

// 箭头函数 —— 同一逻辑，更简洁
const squares2 = [1, 2, 3].map(x => x * x);

console.log(squares2); // [1, 4, 9]
```

### 示例 2：词法 this 绑定 —— 解决经典问题

```javascript
function Timer() {
  this.seconds = 0;

  // 传统函数：this 指向全局对象（或 undefined 严格模式）
  setInterval(function () {
    this.seconds++; // ❌ this 不是 Timer 实例
  }, 1000);

  // 箭头函数：this 继承自外围 Timer 函数
  setInterval(() => {
    this.seconds++; // ✅ this 正确指向 Timer 实例
  }, 1000);
}

const t = new Timer();
// 1 秒后 t.seconds 为 1
```

### 示例 3：回调与数组方法

```javascript
const users = [
  { name: 'Alice', age: 28 },
  { name: 'Bob', age: 35 },
  { name: 'Charlie', age: 22 },
];

// 使用箭头函数链式操作
const names = users
  .filter(user => user.age >= 25) // 过滤出年龄 >= 25 的用户
  .map(user => user.name)          // 提取名字
  .sort((a, b) => a.localeCompare(b)); // 按字母排序

console.log(names); // ['Alice', 'Bob']
```

### 示例 4：返回对象字面量

```javascript
// ❌ 错误写法：花括号被解析为函数体
// const getPerson = (name, age) => { name, age };

// ✅ 正确写法：用圆括号包裹对象字面量
const getPerson = (name, age) => ({ name, age });

console.log(getPerson('Dave', 42));
// { name: 'Dave', age: 42 }
```

### 示例 5：箭头函数作为类字段（auto-bound methods）

```javascript
class C {
  a = 1;
  // 箭头函数类字段：每个实例创建时获得自己的函数副本
  autoBoundMethod = () => {
    console.log(this.a);
  };
}

const c = new C();
c.autoBoundMethod(); // 1

// 即使解构出来使用，this 仍然指向实例
const { autoBoundMethod } = c;
autoBoundMethod(); // 1（普通方法在此场景会丢失 this）

// 注意：类字段定义在实例上而非原型上，每个实例创建新的闭包
```

---

## 关键点

1. **词法 this 绑定**：箭头函数没有自己的 `this`，它使用封闭执行上下文中的 `this`。`call()`、`apply()`、`bind()` 对箭头函数的 `this` 无效。
2. **不能用作构造函数**：使用 `new` 调用箭头函数会抛出 `TypeError: arrow_function is not a constructor`。
3. **无 `arguments` 对象**：箭头函数内访问 `arguments` 会引用外围函数的 `arguments`。如果需要类数组参数，请使用 rest 参数 `(...args)`。
4. **不能作为生成器**：箭头函数中不能使用 `yield` 关键字（除非在外围函数内）。
5. **隐式返回**：当函数体是单个表达式时，自动返回该表达式的值，无需 `return` 关键字和 `{}`。
6. **方法定义中的陷阱**：在对象方法中使用箭头函数，`this` 不会指向该对象，而是指向对象所在的外围作用域（通常是全局或 undefined）。
7. **箭头前后不能换行**：参数和 `=>` 之间不能有换行符，否则会触发自动分号插入导致语法错误。
8. **优先级问题**：`=>` 优先级低于大多数运算符，将箭头函数作为表达式值时需要用括号包裹，例如 `callback = callback || (() => {})`。

---

## 常见错误

### 错误 1：在对象方法中误用箭头函数

```javascript
const counter = {
  count: 0,
  // ❌ 错误：this 不指向 counter
  increment: () => {
    this.count++; // this → 全局对象（或 undefined）
  },
  // ✅ 正确：使用传统函数或方法简写
  increment() {
    this.count++;
  },
};

counter.increment();
console.log(counter.count); // 0（错误用法下未改变）
```

### 错误 2：试图用 `new` 调用箭头函数

```javascript
const Person = (name) => {
  this.name = name;
};

// ❌ TypeError: Person is not a constructor
const p = new Person('Alice');

// ✅ 正确：使用传统函数定义构造函数
function Person(name) {
  this.name = name;
}
const p = new Person('Alice');
```

### 错误 3：箭头函数内使用 `arguments`

```javascript
function outer() {
  const innerArrow = () => {
    // ❌ 这里的 arguments 是 outer 函数的 arguments，不是 innerArrow 的参数
    console.log(arguments);
  };

  // ✅ 正确：使用 rest 参数
  const innerRest = (...args) => {
    console.log(args);
  };

  innerArrow(1, 2); // 输出 outer 的 arguments
  innerRest(1, 2);  // 输出 [1, 2]
}

outer('a', 'b');
```

### 错误 4：箭头函数与运算符优先级

```javascript
let callback;

// ❌ SyntaxError: 解析为 callback || () 作为参数列表
// callback = callback || () => {};

// ✅ 正确：用括号包裹箭头函数
callback = callback || (() => {});
```

---

## 相关概念

- [闭包（Closure）](../patterns/closure.md) —— 箭头函数与闭包常结合使用，理解作用域链对掌握箭头函数的 `this` 行为至关重要。
- [Promise](../builtin/promise.md) —— 箭头函数广泛用于 Promise 链式调用（`.then()`、`.catch()`）中，使代码更简洁。

---

## 参考资料

- [MDN: Arrow Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [ECMAScript 2015 (ES6) Specification — Arrow Function Definitions](https://262.ecma-international.org/6.0/#sec-arrow-function-definitions)
