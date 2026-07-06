---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
title: Destructuring Assignment
description: 从数组或对象中提取值，并直接赋给变量的简洁语法，是 ES2015 (ES6) 引入的重要特性。
tags:
- ES6
- destructuring
- array
- object
- default value
- rest pattern
- nested
- swap
timestamp: '2026-07-05T14:30:50+00:00'
---

解构赋值（Destructuring Assignment）允许你从**数组**或**对象**中提取值，并以一种简洁的语法直接赋值给变量。它本质上是 ES2015（ES6）引入的语法糖，让数据提取的代码更清晰、更少样板。解构在函数参数、变量声明、循环和模块导入等场景中都非常实用。

## Syntax

### 数组解构

```javascript
// 基本数组解构
const [a, b] = array;

// 跳过元素
const [a, , c] = array;

// 剩余元素（rest pattern）
const [first, ...rest] = array;

// 设置默认值
const [a = defaultA, b = defaultB] = array;

// 交换变量（无需临时变量）
[a, b] = [b, a];
```

### 对象解构

```javascript
// 基本对象解构（变量名与属性名一致）
const { name, age } = obj;

// 重命名（提取 age 并赋给变量 years）
const { age: years } = obj;

// 设置默认值
const { name = 'Anonymous' } = obj;

// 重命名 + 默认值
const { age: years = 18 } = obj;

// 嵌套解构
const { address: { city, zip } } = obj;

// 剩余属性（rest，ES2018+）
const { name, ...otherProps } = obj;
```

### 函数参数解构

```javascript
// 对象参数解构
function print({ name, age }) { ... }

// 数组参数解构
function sum([a, b, c]) { ... }

// 参数解构 + 默认值
function connect({ host = 'localhost', port = 8080 } = {}) { ... }
```

## Examples

```javascript
// ----- 示例 1：基本数组解构与变量交换 -----
const colors = ['red', 'green', 'blue'];
const [first, second, third] = colors;
console.log(first, second, third); // 'red' 'green' 'blue'

// 经典的变量交换 —— 无需临时变量
let x = 1, y = 2;
[x, y] = [y, x];
console.log(x, y); // 2 1
```

```javascript
// ----- 示例 2：从 API 响应对象中安全提取数据 -----
const response = {
  status: 200,
  data: {
    user: {
      id: 42,
      name: 'Alice',
      email: 'alice@example.com'
    },
    meta: { page: 1 }
  }
};

// 从深层嵌套结构中提取数据，同时设置默认值以防缺失
const {
  status,
  data: {
    user: { name, email, role = 'guest' },  // role 不存在，使用默认值 'guest'
    meta: { page }
  }
} = response;

console.log(`${name} (${email}), role: ${role}, page: ${page}`); 
// 'Alice (alice@example.com), role: guest, page: 1'
```

```javascript
// ----- 示例 3：函数参数解构 —— 命名参数模拟 -----
// 传统的参数顺序容易出错
// function createUser(name, age, email, role) { ... }
// createUser('Bob', 25, 'bob@test.com', 'admin');  // 参数顺序必须准确

// 使用对象解构模拟命名参数：顺序无关，调用时可读性高
function createUser({ name, age, email, role = 'viewer' }) {
  return { name, age, email, role, createdAt: new Date() };
}

const user1 = createUser({ email: 'bob@test.com', name: 'Bob', age: 25, role: 'admin' });
const user2 = createUser({ name: 'Charlie', age: 30, email: 'charlie@test.com' });
console.log(user2.role); // 'viewer'（默认值生效）
```

```javascript
// ----- 示例 4：for...of 循环中的解构 + 数组 rest 元素 -----
const entries = [
  ['apple', 1, 'fruit'],
  ['carrot', 2, 'vegetable'],
  ['banana', 3, 'fruit']
];

// 在循环中直接解构数组元素
for (const [name, quantity, category] of entries) {
  console.log(`${name}: ${quantity} kg (${category})`);
}

// 使用 rest 模式收集剩余元素
const [firstItem, ...otherItems] = entries;
console.log(otherItems.length); // 2
```

## Key Points

1. **数组解构按位置匹配，对象解构按属性名匹配。** 数组解构依赖元素的位置顺序；对象解构依赖属性名，与顺序无关。
2. **解构中的 rest 模式（`...rest`）必须是最后一个元素。** 对于数组，剩余元素收集为**新数组**；对于对象（ES2018+），收集剩余属性为**新对象**。
3. **默认值仅在目标值为 `undefined` 时生效。** 如果值为 `null`、`0`、`''` 或 `false`，默认值不会被应用。
4. **解构可以嵌套任意深度。** 适用于多层嵌套的对象或数组，但代码可读性会随嵌套深度下降。
5. **函数参数解构建议配合默认空对象/数组。** 如 `function foo({ x } = {})`，防止调用时传 `undefined` 导致 TypeError。
6. **`const` 与 `let` 都适用于解构，但变量不能重复声明。** 已声明的变量解构赋值需要用 `let` 或不用声明关键字（普通赋值）。

## Common Mistakes

1. **解构不存在的属性却忘记默认值，导致 `undefined` 或报错。**

   ```javascript
   const user = { name: 'Alice' };
   const { name, age } = user;
   console.log(age); // undefined —— 但不会报错（仅变量为 undefined）

   // 从 undefined 或 null 中解构会直接抛出 TypeError
   const { x } = null; // TypeError: Cannot destructure property 'x' of 'null'
   // ✅ 修复：确保被解构的值不是 null/undefined
   const { x } = (someValue ?? {});  // 使用 ?? 提供回退
   ```

2. **试图用 `{}` 解构数组的 `length` 属性——本身是可以的，但误解了解构机制。**

   ```javascript
   const arr = [1, 2, 3];
   // 以下代码实际上可以运行（数组也是对象），但通常不是你的意图
   const { length } = arr;
   console.log(length); // 3

   // ✅ 通常是想要数组元素：
   const [a, b, c] = arr;  // 这才是数组解构的正确用法
   ```

3. **函数参数解构时忘记提供默认参数值，导致调用时崩溃。**

   ```javascript
   function greet({ name }) {
     console.log(`Hello, ${name}!`);
   }
   greet(); // TypeError: Cannot destructure property 'name' of 'undefined'
   
   // ✅ 修复：参数默认值 = {}
   function greet({ name } = {}) {
     console.log(`Hello, ${name}!`);
   }
   greet(); // Hello, undefined!（至少不报错了）
   ```

## Related Concepts

- [Arrays and Iteration](../topics/arrays_and_iteration.md) — 数组解构常用于 for...of 循环和 array 方法中提取元素
- [Objects and Classes](../topics/objects_and_classes.md) — 对象解构是处理对象数据的核心模式
- [Spread / Rest Syntax](../syntax/spread_rest.md) — spread（展开）与 rest（剩余）操作符和解构紧密配合
- [Default Parameters](../syntax/default_params.md) — 默认参数与解构结合，处理函数参数的缺失场景
- [Variables](../topics/variables.md) — 解构赋值底层依赖变量的声明与绑定规则
- [Functions](../topics/functions.md) — 函数参数解构是常见的实际应用场景

## Citations

- MDN: Destructuring assignment — [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
- ECMAScript 2015 (ES6) Specification, Section 13.3.3: Destructuring Assignment Patterns
- MDN: Rest/Spread Properties (ES2018) — [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
