---
type: JS Pattern
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
title: Closure
description: 函数与其词法环境的组合，用于数据封装和状态保持
tags:
- lexical scope
- encapsulation
- factory function
- module pattern
- memoization
timestamp: '2026-07-05T14:34:28+00:00'
---

## 概述

**闭包（Closure）** 是 JavaScript 中最核心、最强大的特性之一。当一个函数能够"记住"并访问它被创建时所处的词法作用域（Lexical Scope）——即使该函数在作用域之外执行——这个函数及其引用的变量环境共同构成了一个闭包。简单来说：**闭包 = 函数 + 它创建时所能访问的外部变量**。

闭包的实际应用无处不在：数据私有化（封装）、工厂函数、模块模式、事件回调、记忆化（Memoization）等。理解闭包是掌握 JavaScript 的关键里程碑。

## 语法

闭包不是一种显式的语法结构，而是函数嵌套引用外部变量时自然产生的行为。其"模式"如下：

```javascript
function outer(outerParam) {
  const outerVar = '我在外层作用域';

  // 内部函数引用了外部变量 → 形成闭包
  function inner(innerParam) {
    // inner 可以访问：innerParam、outerParam、outerVar
    return `${outerVar} + ${outerParam} + ${innerParam}`;
  }

  return inner;  // 将闭包返回给外部使用
}
```

核心要点：嵌套函数 + 引用外部变量 + 在外部作用域中被调用 = 闭包。

## 示例

### 示例 1：计数器工厂函数（数据封装）

```javascript
function createCounter(initialValue = 0) {
  let count = initialValue;  // 被闭包捕获的私有变量

  return {
    increment() {
      count++;
      return count;
    },
    decrement() {
      count--;
      return count;
    },
    getValue() {
      return count;
    }
  };
}

const counter = createCounter(10);
console.log(counter.increment());  // 11
console.log(counter.increment());  // 12
console.log(counter.decrement());  // 11
console.log(counter.getValue());   // 11
// 外部无法直接访问 count 变量——它是真正"私有"的
```

### 示例 2：函数记忆化（性能优化）

```javascript
function memoize(fn) {
  const cache = {};  // 缓存对象被闭包捕获

  return function(...args) {
    const key = JSON.stringify(args);

    // 如果已有缓存结果，直接返回，避免重复计算
    if (key in cache) {
      console.log(`命中缓存: ${key}`);
      return cache[key];
    }

    const result = fn(...args);
    cache[key] = result;
    return result;
  };
}

// 耗时的计算函数
function expensiveComputation(n) {
  console.log(`计算: ${n}`);
  return n * n;
}

const memoizedCompute = memoize(expensiveComputation);
console.log(memoizedCompute(5));  // 计算: 5 → 25
console.log(memoizedCompute(5));  // 命中缓存: [5] → 25 （不重复计算）
console.log(memoizedCompute(10)); // 计算: 10 → 100
```

### 示例 3：循环中的闭包陷阱与 let 解法

```javascript
// ❌ 错误写法：使用 var （函数作用域）
for (var i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i);  // 输出 3, 3, 3  —— 所有回调共享同一个 i
  }, 100);
}

// ✅ 正确写法：使用 let （块级作用域，每次迭代创建独立绑定）
for (let j = 0; j < 3; j++) {
  setTimeout(function() {
    console.log(j);  // 输出 0, 1, 2 —— 每个闭包捕获不同的 j
  }, 100);
}

// ✅ 另一种解法：IIFE 创建新作用域
for (var k = 0; k < 3; k++) {
  (function(lockedK) {
    setTimeout(function() {
      console.log(lockedK);  // 输出 0, 1, 2
    }, 100);
  })(k);
}
```

### 示例 4：模块模式（信息隐藏）

```javascript
const UserModule = (function() {
  // 私有变量和方法（外部不可访问）
  const users = [];
  let nextId = 1;

  function validateUser(name) {
    return typeof name === 'string' && name.trim().length > 0;
  }

  // 返回公共 API —— 这些方法通过闭包访问私有成员
  return {
    add(name) {
      if (!validateUser(name)) {
        throw new Error('无效的用户名');
      }
      const user = { id: nextId++, name: name.trim() };
      users.push(user);
      return user;
    },
    getAll() {
      // 返回副本防止外部篡改内部数据
      return [...users];
    },
    findById(id) {
      return users.find(u => u.id === id) || null;
    }
  };
})();

UserModule.add('Alice');
UserModule.add('Bob');
console.log(UserModule.getAll());   // [{id:1, name:'Alice'}, {id:2, name:'Bob'}]
console.log(UserModule.users);      // undefined —— 外部无法直接访问私有数据
```

## 关键要点

- **闭包捕获的是变量的引用，而非变量的值**。这意味着闭包看到的是变量的最新值，而不是创建时的快照（这也是循环陷阱的根源）。
- **每次函数调用都会创建新的闭包**。`createCounter()` 返回的两个计数器实例各自持有独立的 `count` 变量。
- **垃圾回收与内存**：如果一个闭包还在被引用，它所捕获的整个作用域链上的变量都不会被 GC 回收。过度使用闭包可能导致内存泄漏。
- **`let` 和 `const` 的块级作用域**让循环中创建闭包更安全——每次迭代都创建独立的词法环境。
- **闭包不一定要返回函数**——作为参数传递给 `setTimeout`、事件监听器或 Promise 回调时也会形成闭包。
- **`this` 不是闭包的一部分**。闭包捕获的是变量环境（VariableEnvironment），而 `this` 是函数调用时绑定的。箭头函数通过词法 `this` （本质上也是闭包机制）解决了这一问题。

## 常见错误

- **循环中使用 `var` 创建闭包**：所有回调捕获的是同一个 `i`，循环结束后的值为最终值。**解决方案**：使用 `let`、IIFE 或在 `forEach` 等拥有独立回调作用域的方法中处理。
- **无意中创建大闭包导致内存泄漏**：一个闭包引用了大型对象（如 DOM 节点、大数据数组），即使闭包只需要其中的一个小字段，整个对象也无法被回收。**解决方案**：只暴露必要的数据，或及时将大型引用设为 `null`。
- **混淆闭包与 `this` 绑定**：在对象方法中嵌套函数时，嵌套函数的 `this` 默认指向全局对象（非严格模式）或 `undefined`（严格模式）。**解决方案**：使用箭头函数（继承外层 `this`），或用 `const self = this` 保存引用。

## 相关概念

- [变量作用域](../topics/variables.md) —— 闭包的基础：理解词法作用域
- [函数](../topics/functions.md) —— 函数是第一等公民，闭包的存在前提
- [let 与 const](../syntax/let_const.md) —— 块级作用域变量让闭包行为更可预测
- [箭头函数](../syntax/arrow_function.md) —— 词法 `this` 绑定，内部通过闭包实现

## 引用

- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN: Lexical Scoping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#function_scope)
- [ECMAScript Specification — Lexical Environments](https://tc39.es/ecma262/#sec-lexical-environments)
