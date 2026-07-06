---
type: JS Pattern
title: Closure
description: 闭包：函数记住并访问其词法作用域，即使在当前作用域外部执行。
tags:
  - lexical scope
  - encapsulation
  - data privacy
  - IIFE
  - factory function
  - ES5
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
timestamp: '2026-07-06T09:39:36.773Z'
---

## 概述

**闭包（Closure）** 是 JavaScript 中最核心也最常被问到的概念之一。简单来说，当一个内层函数引用了外层函数的变量，并且该内层函数被「记住」了（比如被返回或赋值），那么这个内层函数连同它引用的变量一起就构成了一个闭包。闭包让函数可以「记住」它被创建时的环境，即使那个环境已经执行完毕。实际开发中，闭包广泛用于数据私有化、工厂函数、事件回调以及模块模式。

## Syntax

闭包没有特定的语法关键字，它是一种语言特性。其模式骨架如下：

```javascript
function outerFunction(outerParam) {
  const outerVariable = '...';

  // 内层函数「捕获」了 outerVariable
  function innerFunction(innerParam) {
    // 可以访问 outerVariable / outerParam
    return outerVariable + innerParam;
  }

  return innerFunction;  // 返回内层函数 —— 闭包诞生
}
```

核心模式是：**在一个函数内部定义另一个函数，并将这个内层函数作为返回值（或参数）传递出去。**

## Examples

### 示例 1：基础闭包 —— 计数器工厂

```javascript
function createCounter() {
  let count = 0;  // 外层函数中的私有变量

  return function() {
    count += 1;   // 内层函数「捕获」了 count
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

// createCounter 已执行完毕，但 count 依然存活 —— 闭包在起作用
```

### 示例 2：数据私有化 —— 模拟私有属性

```javascript
function createPerson(name) {
  // secret 是私有变量，外部无法直接访问
  let secret = 'mySecret';

  return {
    getName: function() {
      return name;
    },
    getSecret: function() {
      return secret;
    },
    setSecret: function(newSecret) {
      secret = newSecret;
    }
  };
}

const person = createPerson('Alice');
console.log(person.getName());    // Alice
console.log(person.getSecret());  // mySecret
person.setSecret('newSecret');
console.log(person.getSecret());  // newSecret
// 无法直接访问 secret —— 闭包提供了封装
```

### 示例 3：循环中的经典闭包问题（var 陷阱）

```javascript
// 错误示范（使用 var）
for (var i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i);  // 输出 3, 3, 3 —— 所有闭包共享同一个 i
  }, 100);
}

// 修复方式一：IIFE 创建新作用域
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(function() {
      console.log(j);  // 输出 0, 1, 2 —— 每个闭包捕获不同的 j
    }, 100);
  })(i);
}

// 修复方式二：用 let 代替 var（ES6 推荐）
for (let i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i);  // 输出 0, 1, 2 —— let 每次迭代创建新绑定
  }, 100);
}
```

### 示例 4：高阶函数中的闭包

```javascript
function multiply(factor) {
  // 返回一个「记住了」factor 的新函数
  return function(number) {
    return number * factor;
  };
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5));   // 10
console.log(triple(5));   // 15
```

## Key Points

1. **闭包的三个必要条件**：存在外层函数 → 内层函数引用了外层变量 → 内层函数被传递到其词法作用域之外执行。
2. **每个闭包绑定的是变量的引用，而非变量的值**。这就是 `var` 循环陷阱的根源 —— 所有闭包都指向同一个 `i` 变量。
3. **闭包不会释放被捕获的变量**，直到该闭包本身被垃圾回收。过度使用闭包可能导致内存泄漏（尤其是在老旧浏览器中）。
4. **IIFE（Immediately Invoked Function Expression）** 是最经典的闭包应用之一，用于创建隔离作用域、避免全局污染。
5. **模块模式（Module Pattern）** 利用闭包实现公开 API + 私有状态，是 ES Module 出现前的主流封装方式。
6. **箭头函数与闭包**：箭头函数也形成闭包，但它不绑定自己的 `this`，其 `this` 由外层词法作用域决定。

## Common Mistakes

1. **误以为闭包会「快照」变量的值**
   - ❌ 认为闭包记录的是创建时的变量值
   - ✅ 闭包记录的是**变量的引用**，变量后续变化会反映在闭包中
   ```javascript
   let x = 10;
   const fn = () => x;
   x = 20;
   console.log(fn()); // 20（不是 10）
   ```

2. **在循环中创建闭包时忘记 `let` 或 IIFE**
   - ❌ 用 `var` 在循环中创建回调，预期每个回调捕获不同的值
   - ✅ 用 `let`（块级作用域）或 IIFE 为每次迭代创建独立作用域
   ```javascript
   // ❌ 错误
   var buttons = document.querySelectorAll('button');
   for (var i = 0; i < buttons.length; i++) {
     buttons[i].onclick = function() {
       console.log(i); // 始终是 buttons.length
     };
   }
   // ✅ 正确：用 let
   for (let i = 0; i < buttons.length; i++) {
     buttons[i].onclick = function() {
       console.log(i); // 正确索引
     };
   }
   ```

3. **闭包造成意外的内存泄漏**
   - ❌ 在事件监听或定时器中滥用闭包，导致 DOM 元素无法被 GC
   - ✅ 不再需要时及时解除引用（如 `removeEventListener`）
   ```javascript
   // ❌ 泄漏：闭包持有对 el 的引用
   function setupHandler(el) {
     el.addEventListener('click', function() {
       console.log(el.id); // el 无法被 GC
     });
   }
   // ✅ 防御：使用弱引用或在销毁时清理
   ```

## Related Concepts

- [Functions](../topics/functions.md) — 函数是一等公民，闭包的底层依赖函数作为值传递的能力
- [Variables](../topics/variables.md) — `let` / `const` 的块级作用域与 `var` 的函数作用域深刻影响闭包行为
- [Arrow Functions](../syntax/arrow_function.md) — 箭头函数的词法 `this` 绑定与闭包紧密结合

## Citations

- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [ECMAScript Specification — Lexical Environments](https://tc39.es/ecma262/#sec-lexical-environments)
- [MDN: Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
