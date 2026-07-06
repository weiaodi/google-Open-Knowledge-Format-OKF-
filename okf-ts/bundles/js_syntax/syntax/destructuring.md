---
type: JS Syntax
title: Destructuring Assignment
description: 从数组或对象中提取值到独立变量的简洁语法，支持默认值、嵌套解构和rest模式。
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
tags:
  - ES6
  - array destructuring
  - object destructuring
  - default values
  - rest
  - swap
timestamp: '2026-07-06T09:37:45.798Z'
---

## 概述

**解构赋值（Destructuring Assignment）** 是 ES6 引入的一种语法，允许从数组或对象中提取数据并直接赋值给独立的变量。它让数据提取变得更加简洁和声明式，广泛应用于函数参数、变量声明、模块导入等场景。核心特点是：**左侧是解构模式，右侧是要解构的数据源**。

---

## Syntax

```javascript
// 数组解构
const [a, b] = array;

// 对象解构
const { key1, key2 } = obj;

// 解构 + 默认值
const [a = defaultA] = array;
const { key = defaultVal } = obj;

// 嵌套解构
const { outer: { inner } } = obj;
const [a, [b, c]] = nestedArray;

// rest 模式
const [head, ...tail] = array;
const { a, ...rest } = obj;

// 重命名
const { originalName: newName } = obj;
```

---

## Examples

### 1. 数组解构 — 交换变量 & 忽略元素

```javascript
// 经典用法：交换两个变量的值（无需临时变量）
let x = 10;
let y = 20;
[x, y] = [y, x];
console.log(x, y); // 20 10

// 使用逗号跳过不需要的元素
const rgb = [255, 128, 64];
const [, , blue] = rgb;        // 跳过前两个，只取 blue
console.log(blue);             // 64

// 嵌套数组解构
const matrix = [[1, 2], [3, 4]];
const [[a, b], [c, d]] = matrix;
console.log(a, d); // 1 4
```

### 2. 对象解构 — 重命名 & 默认值

```javascript
const user = { name: 'Alice', age: 30, email: 'alice@example.com' };

// 解构并重命名
const { name: userName, email: userEmail } = user;
console.log(userName);  // Alice
console.log(userEmail); // alice@example.com

// 带默认值（当属性不存在时使用）
const { name, age, phone = 'N/A' } = user;
console.log(phone);     // N/A —— user 中没有 phone 属性

// 多层嵌套解构
const response = {
  data: { user: { id: 1, profile: { nickname: 'Ali', avatar: 'url.png' } } },
  status: 200
};
const { data: { user: { profile: { nickname } } } } = response;
console.log(nickname); // Ali
```

### 3. 函数参数中的解构 — 提取配置对象

```javascript
// 无需在函数体内部逐个取值
function createUser({ name, age = 18, role = 'user' }) {
  console.log(`创建用户: ${name}, ${age}岁, 角色: ${role}`);
  // 直接使用 name、age、role 变量
}

createUser({ name: 'Bob', age: 25 });        // 创建用户: Bob, 25岁, 角色: user
createUser({ name: 'Charlie', role: 'admin' }); // 创建用户: Charlie, 18岁, 角色: admin

// 结合 rest 参数 —— 分离已知属性与剩余属性
function logConfig({ url, ...options }) {
  console.log(`请求地址: ${url}`);
  console.log('其他选项:', options);
}
logConfig({ url: '/api', method: 'POST', timeout: 3000 });
// 请求地址: /api
// 其他选项: { method: 'POST', timeout: 3000 }
```

### 4. 循环中解构 & 返回值解构

```javascript
// 遍历 Map 时直接解构 [key, value]
const scoreMap = new Map([
  ['Alice', 95],
  ['Bob', 88],
  ['Charlie', 76]
]);
for (const [name, score] of scoreMap) {
  console.log(`${name}: ${score}分`);
}
// Alice: 95分
// Bob: 88分
// Charlie: 76分

// 从函数返回多个值
function getMinMax(arr) {
  return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = getMinMax([3, 1, 4, 1, 5, 9]);
console.log(min, max); // 1 9
```

---

## Key Points

1. **数组解构按位置匹配**，对象解构按**属性名**匹配。这是两者最核心的区别。
2. 解构失败时（数组越界或对象属性不存在），变量值为 `undefined`，务必用**默认值**兜底。
3. 默认值仅在**严格等于 `undefined`** 时才生效。`null` 不会触发默认值。
4. 对象解构的**重命名语法** `{ originalName: newVar }` 很容易混淆——冒号**左边**是原属性名，**右边**是新变量名。
5. 如果声明变量时解构已经声明的变量（如交换变量），必须用 `let` 重新声明或用**不带 `const/let` 的赋值表达式**，且需要外层加括号 `(...)` 避免被当作块级作用域。
6. Rest 模式 `...rest` **必须位于解构模式的最后**，且只能出现一次。

---

## Common Mistakes

1. **忘记为函数参数提供默认空对象，导致解构 `undefined` 报错**
   ```javascript
   // ❌ 错误：如果调用 getConfig() 不传参数，会抛出 TypeError
   function getConfig({ url, timeout }) {
     console.log(url, timeout);
   }

   // ✅ 正确：参数默认值设为空对象
   function getConfig({ url, timeout } = {}) {
     console.log(url, timeout); // undefined undefined（不会报错）
   }
   getConfig();
   ```

2. **对象重命名时搞反冒号左右位置**
   ```javascript
   const user = { id: 1, name: 'Alice' };

   // ❌ 错误理解：以为是把 name 改名为 id
   // const { name: id } = user; ✅ 这才是正确写法

   const { id: userId } = user;
   console.log(userId); // 1 —— 把 user.id 赋值给 userId
   ```

3. **在 `let` 声明语句左侧写异步解构或不存在的变量名**
   ```javascript
   // ❌ 错误：不能解构 Promise 对象
   // const { data } = fetch('/api');  // fetch 返回 Promise，不是已解构的对象

   // ✅ 正确：需要 await
   // const { data } = await fetch('/api').then(r => r.json());

   // ❌ 错误：变量名与解构模式冲突
   let a;
   // { a } = { a: 1 };  // ❌ 花括号被解析为块语句
   // ✅ 正确：加括号
   ({ a } = { a: 1 });
   ```

---

## Related Concepts

- [Variables](../topics/variables.md) — 解构赋值本质上是变量声明和赋值的语法糖
- [Functions](../topics/functions.md) — 函数参数中的解构模式是常用实践
- [Template Literals](../syntax/template_literals.md) — 常与解构结合构建字符串
- [Array](../builtin/array.md) — 数组方法返回的值经常使用解构接收
- [Arrow Functions](../syntax/arrow_function.md) — 与解构配合写出简洁的回调

---

## Citations

- [MDN: Destructuring Assignment](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
- [ECMAScript 2015 (ES6) Specification — Destructuring Assignment](https://262.ecma-international.org/6.0/#sec-destructuring-assignment)
