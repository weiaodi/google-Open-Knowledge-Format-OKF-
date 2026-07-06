---
type: JS Topic
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
title: Arrays & Iteration
description: 数组操作、迭代方法与迭代器协议，涵盖函数式数据转换与循环遍历模式。
tags:
- Array
- map
- filter
- reduce
- for...of
- spread
- destructuring
- iteration
- functional
timestamp: '2026-07-05T14:29:17+00:00'
---

数组（Array）是 JavaScript 中最核心的数据结构之一，而迭代则是操作数组的基本方式。JavaScript 提供了一系列**高阶迭代方法**（如 `map`、`filter`、`reduce`），让你以声明式、函数式风格处理数据，而无需手动管理索引或循环变量。此外，`for…of`、**展开运算符**（spread）和**解构赋值**（destructuring）进一步简化了数组的遍历、复制和提取操作。掌握这些工具可以写出更简洁、可读且不易出错的代码。

## Syntax

### 1. 函数式迭代方法（Array.prototype 上的方法）

```javascript
// map —— 将每个元素映射为新值，返回等长新数组
const newArray = arr.map((element, index, array) => newValue);

// filter —— 保留满足条件的元素，返回子集新数组
const filtered = arr.filter((element, index, array) => booleanCondition);

// reduce —— 从左到右归约，累计为单一值
const result = arr.reduce((accumulator, element, index, array) => newAccumulator, initialValue);

// forEach —— 遍历执行副作用，不返回新数组
arr.forEach((element, index, array) => void);

// find —— 返回第一个满足条件的元素（或 undefined）
const found = arr.find((element) => booleanCondition);

// some —— 是否至少有一个元素满足条件
const hasAny = arr.some((element) => booleanCondition);

// every —— 是否全部元素满足条件
const allMatch = arr.every((element) => booleanCondition);
```

### 2. `for…of` 循环（ES2015+）

```javascript
for (const element of iterable) {
  // 遍历任意可迭代对象（Array、Map、Set、String 等）
}
```

### 3. 展开运算符 `...`（ES2015+）

```javascript
// 浅拷贝 + 合并数组
const copy = [...arr];
const merged = [...arr1, ...arr2];
```

### 4. 数组解构（ES2015+）

```javascript
const [first, second, ...rest] = arr;   // 按位置提取
const [, , third] = arr;                // 跳过前两个
```

## Examples

### 基础：传统循环 vs. 函数式方法

```javascript
const numbers = [1, 2, 3, 4, 5];

// ❌ 传统 for 循环——容易出错，可读性差
const doubled1 = [];
for (let i = 0; i < numbers.length; i++) {
  doubled1.push(numbers[i] * 2);
}

// ✅ map —— 意图清晰，无索引管理
const doubled2 = numbers.map(n => n * 2);
// doubled2 → [2, 4, 6, 8, 10]
```

### 链式调用：filter → map → reduce

```javascript
const products = [
  { name: '鼠标', price: 80, inStock: true },
  { name: '键盘', price: 200, inStock: false },
  { name: '显示器', price: 1500, inStock: true },
  { name: '耳机', price: 300, inStock: true },
];

// 找出库存中价格 ≥ 100 的商品，计算总价
const total = products
  .filter(p => p.inStock)           // 先过滤库存
  .filter(p => p.price >= 100)      // 再过滤价格
  .map(p => p.price)                // 提取价格
  .reduce((sum, price) => sum + price, 0);  // 累加
// total → 1800 (1500 + 300)
```

### `for…of` 与解构结合

```javascript
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

// 同时获取索引和元素——使用 entries()
for (const [index, { name }] of users.entries()) {
  console.log(`${index + 1}. ${name}`);
}
// 输出:
// 1. Alice
// 2. Bob
// 3. Charlie
```

### 展开运算符的高级用法

```javascript
const a = [1, 2, 3];
const b = [4, 5, 6];

// 合并并去重（配合 Set）
const unique = [...new Set([...a, ...b, 1, 2])];
// unique → [1, 2, 3, 4, 5, 6]

// 找出两个数组的交集
const intersection = a.filter(x => b.includes(x)); // [4, 5]... 不对，a/b没有交集

// 实际例子：找到共同喜欢的书籍
const aliceBooks = ['红与黑', '百年孤独', '1984'];
const bobBooks   = ['百年孤独', '挪威的森林', '1984'];
const common = aliceBooks.filter(book => bobBooks.includes(book));
// common → ['百年孤独', '1984']
```

## Key Points

1. **`map`、`filter`、`reduce` 返回新数组，不修改原数组**。这是函数式编程的重要原则——避免副作用。如果需要原数组，请使用 `arr[index] = newValue` 或 `splice`。
2. **`forEach` 不返回新数组**，只用于副作用（如打印日志）。如果你在 `forEach` 里 push 到一个外部数组，99% 的场景应该改用 `map` 或 `filter`。
3. **回调函数的参数签名**：几乎所有迭代方法都接受 `(element, index, array)` 三个参数。`reduce` 例外：它的前两个参数是累计值 `(accumulator, currentValue)`。
4. **`for…of` 遍历可迭代对象，不局限于数组**。它支持 `Map`、`Set`、`String`、`TypedArray`、`arguments` 以及实现了 `[Symbol.iterator]` 协议的任何对象。与 `for…in`（遍历键名）有本质区别。
5. **展开运算符只做浅拷贝**。嵌套数组或对象中的引用仍然共享，修改内层会影响原数据。深拷贝需要 `structuredClone()` 或第三方库。
6. **`reduce` 一定要传初始值 `initialValue`**，否则空数组会抛出 `TypeError`。当数组只有一个元素且未传初始值时，该元素直接成为累计值而不会调用回调，可能引发意料之外的结果。

## Common Mistakes

1. **在 `forEach` 中使用 `return` 或 `break` 企图提前退出**

```javascript
const arr = [1, 2, 3, 4, 5];

// ❌ 错误：return 只是结束当前回调，不会跳出循环
arr.forEach((n) => {
  if (n > 3) return;  // 只是跳过 n > 3 的元素
  console.log(n);     // 仍然输出 1,2,3
});

// ✅ 正确：使用 for...of + break，或 find()/some() 替代
for (const n of arr) {
  if (n > 3) break;   // 确实跳出循环
  console.log(n);     // 只输出 1,2,3
}

// 或用 find() 替代查找语义
const found = arr.find(n => n > 3); // 返回第一个 >3 的元素
```

2. **`map` 回调中直接修改原数组**

```javascript
// ❌ 不良实践：同时修改原数组
const items = [{ count: 1 }, { count: 2 }];
items.map(item => {
  item.count *= 2;   // 副作用！修改了原对象
  return item;
});

// ✅ 正确：返回新对象
const updated = items.map(item => ({
  ...item,            // 展开原属性
  count: item.count * 2,
}));
```

3. **混淆 `map` 和 `forEach` 的返回值**

```javascript
const numbers = [1, 2, 3];

// ❌ 以为 forEach 返回了新数组
const result = numbers.forEach(n => n * 2);
console.log(result);  // undefined！

// ✅ 用 map
const result2 = numbers.map(n => n * 2);
console.log(result2); // [2, 4, 6]
```

## Related Concepts

- [Array (Builtin)](../builtin/array.md) — 本主题聚焦的 `Array` 内置对象及其所有核心方法
- [Destructuring](../syntax/destructuring.md) — 从数组和对象中快速提取值的语法糖
- [Spread & Rest](../syntax/spread_rest.md) — 展开与剩余参数运算符的完整用法
- [Map & Set (Builtin)](../builtin/map_set.md) — 同样支持迭代的集合类型，配合 `for…of` 效果更佳
- [Functions](../topics/functions.md) — 回调函数、箭头函数与 `this` 绑定如何与迭代方法交互
- [Async Patterns](../patterns/async_patterns.md) — 异步场景下数组迭代的常见模式（串行 vs 并行）

## Citations

- [MDN: Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN: Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [MDN: for…of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)
- [MDN: Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
