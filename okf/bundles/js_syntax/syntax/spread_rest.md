---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
title: Spread & Rest Operator (...)
description: 展开运算符(...)用于展开可迭代对象（数组、对象等），剩余参数语法用于收集函数参数中多余的参数为数组。
tags:
- '...'
- spread operator
- rest parameters
- shallow copy
- merge objects
- iterable
- ES6
- ES2018
timestamp: '2026-07-05T14:31:19+00:00'
---

## 概述

**Spread 展开运算符**（`...`）允许将可迭代对象（如数组、字符串、`Set`、`Map`）在需要零个或多个元素的位置"展开"，也支持在 ES2018+ 中将对象的可枚举属性展开。**Rest 剩余参数**使用同样的 `...` 语法，但在函数参数声明中扮演相反的角色——它将多余的参数收集到一个数组中。两者本质上是互补的：Spread 将 iterable **拆开**，Rest 将参数**收拢**。

实际开发中，Spread 常用于数组复制与合并、对象浅拷贝、函数传参解包；Rest 则用于处理可变参数函数（variadic functions）和解构剩余元素。

## Syntax

### Spread 展开 —— 在数组/函数调用/对象中使用

```javascript
// 数组展开
const newArray = [...iterable];

// 函数调用展开
func(...iterable);

// 对象展开 (ES2018+)
const newObj = { ...obj };
```

### Rest 剩余参数 —— 在函数形参中使用

```javascript
// 收集剩余参数为数组
function func(first, ...rest) {}

// 解构中的剩余元素
const [first, ...rest] = array;
const { a, ...rest } = obj;
```

## Examples

### 1. 数组复制与合并（浅拷贝）

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// 浅拷贝数组 —— 比 slice() 更直观
const copy = [...arr1];
console.log(copy); // [1, 2, 3]

// 合并数组 —— 替代 concat()
const merged = [...arr1, ...arr2];
console.log(merged); // [1, 2, 3, 4, 5, 6]

// 在中间插入元素
const withMiddle = [0, ...arr1, 10];
console.log(withMiddle); // [0, 1, 2, 3, 10]
```

### 2. 对象展开（浅合并）

```javascript
const base = { name: 'Alice', role: 'admin' };
const extras = { age: 30, active: true };

// 对象合并 —— 后展开的属性覆盖前展开的
const user = { ...base, ...extras };
console.log(user);
// { name: 'Alice', role: 'admin', age: 30, active: true }

// 提供默认值：将默认值放在后面，前面的值不会被覆盖
const config = { ...{ timeout: 1000, retry: 3 }, timeout: 5000 };
console.log(config); // { timeout: 5000, retry: 3 }
// ！注意：后面的 timeout 覆盖了前面的

// 不可变更新对象
const oldUser = { name: 'Bob', age: 25, city: 'NYC' };
const updatedUser = { ...oldUser, age: 26 }; // 只更新 age
console.log(updatedUser); // { name: 'Bob', age: 26, city: 'NYC' }
```

### 3. Rest 剩余参数 —— 可变参数函数

```javascript
// 收集所有多余参数为数组
function sum(prefix, ...numbers) {
  // numbers 是真正的 Array 实例，不是 arguments 对象
  const total = numbers.reduce((acc, n) => acc + n, 0);
  return `${prefix}: ${total}`;
}

console.log(sum('Total', 1, 2, 3, 4)); // "Total: 10"

// 与箭头函数配合
const logAll = (...args) => console.log(args);
logAll('a', 'b', 'c'); // ['a', 'b', 'c']
```

### 4. 解构中的 Rest 模式

```javascript
const [first, second, ...rest] = [10, 20, 30, 40, 50];
console.log(first);  // 10
console.log(second); // 20
console.log(rest);   // [30, 40, 50]

const { title, ...metadata } = { title: 'Doc', author: 'Alice', year: 2024 };
console.log(title);    // 'Doc'
console.log(metadata); // { author: 'Alice', year: 2024 }
```

### 5. 字符串转数组 & NodeList 转真数组

```javascript
// 字符串展开为字符数组
const chars = [...'hello'];
console.log(chars); // ['h', 'e', 'l', 'l', 'o']

// DOM 操作：NodeList → 真数组
// document.querySelectorAll('div') 返回 NodeList，不是 Array
// const divs = [...document.querySelectorAll('div')]; // 现在 divs 是真数组
```

## Key Points

- **Rest 参数必须是形参列表的最后一个**：`function(a, ...rest, b)` 是语法错误。
- **Spread 执行浅拷贝（shallow copy）**：嵌套对象或数组仍然是引用共享，修改嵌套内容会影响原始数据。
- **Spread 只能展开可迭代对象（iterable）**：普通对象（plain object）不能直接用 `[...obj]` 展开（会抛出 TypeError），但对象字面量中 `{...obj}` 是 ES2018 特性，使用枚举属性（enumerable own properties）而非迭代协议。
- **Rest 参数生成真正的 `Array` 实例**：与旧的 `arguments` 对象不同，`...rest` 拥有 `Array.prototype` 上的所有方法（如 `map`, `filter`, `reduce`）。
- **`...null` 或 `...undefined` 在对象 Spread 中静默忽略**：`{ ...null, ...undefined }` 返回 `{}`，不会报错。
- **Spread 的展开顺序决定最终值**：在对象合并时，后出现的同名属性会覆盖先出现的属性。

## Common Mistakes

- **误以为 Spread 是深拷贝（deep clone）**：`const copy = { ...original }` 只拷贝第一层属性。若 `original` 包含嵌套对象，修改 `copy.nested.prop` 会影响 `original.nested.prop`。深拷贝需要使用 `structuredClone()` 或递归工具。
  
  ```javascript
  const original = { a: 1, nested: { b: 2 } };
  const copy = { ...original };
  copy.nested.b = 999;
  console.log(original.nested.b); // 999 ❌ 被意外修改
  ```

- **在函数形参中混用了 Spread 而非 Rest**：`function foo(...args) {}` 正确（Rest）；但 `function foo(...[a, b]) {}` 虽然语法允许却不推荐，直接写 `function foo(a, b) {}` 更清晰。

- **在对象中尝试 `[...obj]` 展开非 iterable 对象**：普通对象不是 iterable，会抛出 `TypeError: obj is not iterable`。要用 `{...obj}` 展开对象属性，或用 `Object.keys()` / `Object.entries()` 遍历。

- **Rest 语法跟传统 `arguments` 混用**：箭头函数没有 `arguments` 对象，必须用 Rest 参数；同时在普通函数中，`...rest` 和 `arguments` 都可以访问参数，但 Rest 更灵活（可命名、可部分收集）。

## Related Concepts

- [数组与迭代](../topics/arrays_and_iteration.md) — Spread 常用于数组操作，与 `map`、`filter` 等迭代方法配合使用
- [解构赋值 (Destructuring)](./destructuring.md) — Rest 模式是解构的核心组成部分，与 Spread 语法密切配合
- [函数 (Functions)](../topics/functions.md) — Rest 参数用于可变参数函数，替代传统的 `arguments` 对象
- [对象与类](../topics/objects_and_classes.md) — 对象 Spread 用于不可变更新和浅合并对象
- [Array 内置对象](../builtin/array.md) — 常用 `Array.from()` 与 Spread 做对比，两者都可转换 iterable 为数组

## Citations

- MDN — Spread syntax: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
- MDN — Rest parameters: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters
- ECMAScript 2015 (ES6) — Rest & Spread: https://262.ecma-international.org/6.0/
- ECMAScript 2018 (ES9) — Object Rest/Spread Properties: https://github.com/tc39/proposal-object-rest-spread
