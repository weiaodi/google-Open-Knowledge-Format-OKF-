---
type: JS Pattern
title: 闭包 (Closure)
description: 闭包是函数与其词法作用域的绑定，允许函数记住并访问外部函数的变量，即使外部函数已经执行完毕。
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
tags:
  - lexical scope
  - encapsulation
  - data privacy
  - IIFE
  - factory function
  - closure
  - module pattern
  - let
  - const
timestamp: '2026-07-07T03:22:44.062Z'
---


## 概述

**闭包（Closure）** 是 JavaScript 中最核心也最强大的特性之一。当一个内部函数被定义在外部函数内部，并且内部函数引用了外部函数的变量时，就形成了一个闭包。闭包使得内部函数能够 **记住并访问** 其创建时的词法作用域（lexical scope），即使外部函数已经执行结束并返回。闭包广泛用于 **数据封装与私有变量**、**工厂函数**、**事件处理器** 和 **函数柯里化** 等场景。理解闭包是掌握 JavaScript 高阶用法的关键一步。

## Syntax

闭包没有专属的语法关键字，它是由嵌套函数（nested function）配合作用域引用自然产生的模式。

```javascript
function outerFunction(outerVariable) {
  // 内部函数持有对外部变量 outerVariable 的引用
  function innerFunction(innerVariable) {
    // 这里可以同时访问 outerVariable 和 innerVariable
    return outerVariable + innerVariable;
  }
  // 返回内部函数，闭包随之形成
  return innerFunction;
}
```

更简洁的写法（内部函数作为返回值）：

```javascript
function createCounter() {
  let count = 0;
  return function() {
    count += 1;
    return count;
  };
}
```

## Examples

### 示例一：计数器（基本闭包）

```javascript
function createCounter() {
  let count = 0;          // count 是私有变量，外部无法直接访问

  return {
    increment: function() {
      count++;
      return count;
    },
    decrement: function() {
      count--;
      return count;
    },
    getCount: function() {
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount());  // 1
// console.log(counter.count);    // undefined — count 是私有的！
```

### 示例二：数据封装与私有变量（模块模式）

```javascript
function createPerson(name, age) {
  // name 和 age 通过闭包变为私有，提供受控的访问接口
  return {
    getName: function() {
      return name;
    },
    getAge: function() {
      return age;
    },
    setAge: function(newAge) {
      if (newAge > 0 && newAge < 150) {
        age = newAge;
      } else {
        console.error('Invalid age');
      }
    }
  };
}

const person = createPerson('张三', 30);
console.log(person.getName());      // 张三
person.setAge(35);
console.log(person.getAge());       // 35
// person.name = '李四';            // 不生效，name 不受外部影响
```

### 示例三：使用 IIFE 模拟私有方法

```javascript
const counter = (function () {
  let privateCounter = 0;
  function changeBy(val) {
    privateCounter += val;
  }

  return {
    increment() {
      changeBy(1);
    },
    decrement() {
      changeBy(-1);
    },
    value() {
      return privateCounter;
    },
  };
})();

console.log(counter.value()); // 0
counter.increment();
console.log(counter.value()); // 1
// counter.changeBy(5); — TypeError, changeBy 是私有的
```

### 示例四：循环中的闭包问题与修复

```javascript
// ❌ 经典问题：var 声明的 i 被所有闭包共享
for (var i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i); // 3, 3, 3 —— 循环结束时 i 已经是 3
  }, 100);
}

// ✅ 修复方式 1：使用 let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i); // 0, 1, 2 —— 每个迭代绑定独立的 i
  }, 100);
}

// ✅ 修复方式 2：使用 IIFE 创建独立闭包
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(function() {
      console.log(j); // 0, 1, 2
    }, 100);
  })(i);
}
```

### 示例五：函数工厂与柯里化

```javascript
function multiply(factor) {
  // 闭包捕获 factor 参数
  return function(number) {
    return number * factor;
  };
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15

// 实际应用：税率计算函数工厂
function createTaxCalculator(taxRate) {
  return function(amount) {
    return amount * (1 + taxRate);
  };
}

const calcVAT = createTaxCalculator(0.13);    // 13% VAT
const calcGST = createTaxCalculator(0.07);    // 7% GST

console.log(calcVAT(100)); // 113
console.log(calcGST(100)); // 107
```

### 示例六：闭包与模块作用域

```javascript
// myModule.js
let x = 5;
export const getX = () => x;
export const setX = (val) => { x = val; };

// 闭包捕获了模块作用域的变量 x，外部只能通过 getter/setter 访问
```

### 示例七：闭包作用域链

```javascript
const e = 10;
function sum(a) {
  return function (b) {
    return function (c) {
      return function (d) {
        // 可以访问外部所有作用域的变量 a, b, c, d, e
        return a + b + c + d + e;
      };
    };
  };
}

console.log(sum(1)(2)(3)(4)); // 20
```

## Key Points

1. **闭包的本质**：闭包不是开发者手动"创建"的，而是 JavaScript 词法作用域规则的自然产物——每个函数在定义时都会记住它所在的作用域链。
2. **内存管理**：闭包会保持对外部变量的引用，导致这些变量无法被垃圾回收（GC），直到闭包本身不再被引用。过度使用闭包可能导致 **内存泄漏**。
3. **`var` 与 `let` 的区别**：用 `var` 声明的变量只有函数作用域，在循环中使用闭包容易产生"共享变量"问题；使用 `let`（块级作用域）或 IIFE 可以轻松解决。
4. **闭包与 `this`**：闭包中的 `this` 指向调用时的上下文，而非定义时的上下文。箭头函数（[Arrow Functions](../syntax/arrow_function.md)）没有自己的 `this`，它会捕获外层词法作用域的 `this`。
5. **模块模式**：闭包是实现 JavaScript 模块化的基础，通过返回一个包含方法的对象，可以对外暴露有限接口，隐藏内部实现细节。
6. **性能考虑**：每个闭包都会占用额外内存来存储其引用的外部变量。在高频调用场景中，避免在热路径中不必要地创建闭包。更好的做法是将方法定义在原型上而非构造函数内部。
7. **闭包可以捕获块作用域和模块作用域**：ES6 的 `let`/`const` 让闭包能捕获块级变量，ES2015 的模块系统也让闭包能捕获模块级变量。
8. **闭包可以捕获 import 的实时绑定**：模块中 export 的变量是 live binding，闭包捕获 import 的值会随原模块变化。

## Common Mistakes

1. **循环中误用 `var` 导致所有闭包共享同一个变量**
   ```javascript
   // ❌ 错误
   for (var i = 0; i < 5; i++) {
     buttons[i].onclick = function() {
       console.log(i); // 无论点哪个按钮，都输出 5
     };
   }
   // ✅ 正确：使用 let 或 IIFE
   for (let i = 0; i < 5; i++) {
     buttons[i].onclick = function() {
       console.log(i); // 输出对应的 0, 1, 2, 3, 4
     };
   }
   ```

2. **误以为闭包会"捕获"变量的值，而不是变量本身**
   ```javascript
   let funcs = [];
   for (var i = 0; i < 3; i++) {
     funcs.push(function() { return i; });
   }
   console.log(funcs[0]()); // 3 —— 不是 0！
   // 闭包捕获的是变量 i 的引用，而非创建时的值 0。
   ```

3. **闭包造成意外的内存泄漏**
   ```javascript
   // ❌ 大型对象被闭包意外持有，无法被 GC
   function setupHandler() {
     let hugeData = new Array(1000000).fill('data');
     let element = document.getElementById('myButton');
     element.onclick = function() {
       console.log('clicked'); // 虽然没有引用 hugeData，
       // 但闭包保留了整个作用域，hugeData 无法被回收
     };
   }
   // ✅ 解决：只捕获需要的变量
   function setupHandlerFixed() {
     let element = document.getElementById('myButton');
     element.onclick = function() {
       console.log('clicked');
     };
     // hugeData 不再在闭包的作用域链中，可被 GC
   }
   ```

## Related Concepts

- [箭头函数 (Arrow Functions)](../syntax/arrow_function.md) — 箭头函数没有自己的 `this` 和 `arguments`，其闭包行为与传统函数不同
- [异步编程 (Async)](../topics/async.md) — 回调函数和 Promise 中广泛使用闭包来保持上下文状态

## Citations

- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN: Lexical scoping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#lexical_scoping)
- [MDN: Closures Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- ECMAScript Language Specification — Lexical Environments (Section 8.1)
