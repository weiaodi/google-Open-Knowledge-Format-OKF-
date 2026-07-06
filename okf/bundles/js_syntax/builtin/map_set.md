---
type: JS Builtin
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
title: Map & Set
description: 键值对集合（Map）和唯一值集合（Set），支持任意键类型
tags:
- Map
- Set
- WeakMap
- WeakSet
- ES6
- has
- get
- set
- delete
- iteration
- collection
timestamp: '2026-07-05T14:34:07+00:00'
---

## 概述

**Map** 和 **Set** 是 ES2015（ES6）引入的两种全新集合类型。`Map` 是键值对集合，与普通对象（Object）最大的区别在于**键可以是任意数据类型**（包括对象、函数、NaN），而不仅是字符串或 Symbol。`Set` 是值（非重复）的集合，自动保证每个元素唯一。相比传统 Object 和 Array，两者在频繁增删查、需要迭代顺序保障、以及处理非字符串键的场景下有显著性能和语义优势。

---

## Syntax

### Map

```javascript
// 创建
new Map()
new Map(iterable)     // [[key, value], ...] 形式的可迭代对象

// 实例方法
map.set(key, value)   // 添加/更新键值对，返回 map 本身（支持链式调用）
map.get(key)          // 读取键对应的值，不存在返回 undefined
map.has(key)          // 检查键是否存在，返回 boolean
map.delete(key)       // 删除指定键，返回 boolean 表示是否成功删除
map.clear()           // 清空所有键值对

// 实例属性
map.size              // 返回键值对的数量

// 迭代方法
map.keys()            // 返回键的迭代器
map.values()          // 返回值的迭代器
map.entries()         // 返回 [key, value] 的迭代器（默认迭代器）
map.forEach(callbackFn, thisArg?)  // 按插入顺序遍历
```

### Set

```javascript
// 创建
new Set()
new Set(iterable)     // 从可迭代对象创建（重复值自动去重）

// 实例方法
set.add(value)        // 添加值，返回 set 本身（支持链式调用）
set.has(value)        // 检查值是否存在，返回 boolean
set.delete(value)     // 删除指定值，返回 boolean
set.clear()           // 清空所有值

// 实例属性
set.size              // 返回元素数量

// 迭代方法
set.values()          // 返回值的迭代器（keys() 是 values() 的别名）
set.entries()         // 返回 [value, value] 的迭代器（保持与 Map 接口一致）
set.forEach(callbackFn, thisArg?)  // 按插入顺序遍历
```

### WeakMap & WeakSet

```javascript
// 创建
new WeakMap()         // 键必须是对象（不能是原始类型），弱引用，不可迭代
new WeakSet()         // 值必须是对象，弱引用，不可迭代

// WeakMap 方法（没有 size、clear、迭代方法）
weakMap.set(key, value)
weakMap.get(key)
weakMap.has(key)
weakMap.delete(key)

// WeakSet 方法（没有 size、clear、迭代方法）
weakSet.add(value)
weakSet.has(value)
weakSet.delete(value)
```

---

## Examples

### 1. Map 基本用法 — 任意类型键

```javascript
const map = new Map();

// 键可以是各种类型
const objKey = { id: 1 };
const funcKey = () => {};
const nanKey = NaN;

map.set('name', 'Alice');
map.set(objKey, 'object value');
map.set(funcKey, 'function value');
map.set(nanKey, 'NaN is a valid key');
map.set(undefined, 'undefined is also valid');

console.log(map.get('name'));        // 'Alice'
console.log(map.get(objKey));        // 'object value'
console.log(map.get(nanKey));        // 'NaN is a valid key' — NaN 被视为同一个键
console.log(map.has(funcKey));       // true
console.log(map.size);               // 5

// 链式调用
map.set('a', 1).set('b', 2).set('c', 3);
```

### 2. Map vs Object — 真正的字典

```javascript
// Object 的限制：键会被转为字符串
const obj = {};
obj[true] = 1;
obj[{}] = 2;
console.log(Object.keys(obj));   // ['true', '[object Object]']

// Map 保留键的原始类型
const map = new Map();
map.set(true, 1);
map.set({}, 2);
console.log([...map.keys()]);    // [true, {}] — 键类型保留

// Object 没有顺序保障（ES6 虽然定义了枚举顺序，但有陷阱）
// Map 严格保证插入顺序
const m = new Map();
m.set('z', 1);
m.set('a', 2);
m.set('b', 3);
console.log([...m.keys()]);      // ['z', 'a', 'b'] — 严格按插入顺序
```

### 3. Set 基本用法 — 去重与集合运算

```javascript
// 数组去重
const numbers = [1, 2, 2, 3, 4, 4, 5];
const unique = [...new Set(numbers)];
console.log(unique);  // [1, 2, 3, 4, 5]

// Set 元素的唯一性使用 SameValueZero 比较
const set = new Set();
set.add(1);
set.add('1');     // 不同类型，不算重复
set.add(1);       // 重复，被忽略
set.add(NaN);
set.add(NaN);     // NaN 被视为相等，被忽略
console.log(set.size);  // 3 — 1, '1', NaN

// 集合操作：交集、差集、并集
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);

// 并集
const union = new Set([...setA, ...setB]);
console.log([...union]);  // [1, 2, 3, 4, 5, 6]

// 交集
const intersection = new Set([...setA].filter(x => setB.has(x)));
console.log([...intersection]);  // [3, 4]

// 差集（A - B）
const difference = new Set([...setA].filter(x => !setB.has(x)));
console.log([...difference]);  // [1, 2]
```

### 4. WeakMap — 内存安全的对象键映射

```javascript
// WeakMap 避免内存泄露：当键对象被回收时，关联值也被回收
let user = { name: 'Bob' };
const cache = new WeakMap();

cache.set(user, { lastLogin: Date.now() });
console.log(cache.get(user));  // { lastLogin: ... }

user = null;  // 不再引用该对象
// WeakMap 中的条目会在下次 GC 时自动清除 — 无需手动 delete

// 典型应用：为 DOM 元素关联私有数据
// const elementMap = new WeakMap();
// elementMap.set(buttonElement, { clickCount: 0 });
// 当 buttonElement 从 DOM 中移除后，数据自动释放
```

### 5. 迭代 Map 和 Set

```javascript
const map = new Map([['a', 1], ['b', 2], ['c', 3]]);

// for...of 默认迭代 entries
for (const [key, value] of map) {
  console.log(`${key} = ${value}`);
}
// a = 1
// b = 2
// c = 3

// 转为数组
console.log([...map]);          // [['a', 1], ['b', 2], ['c', 3]]
console.log([...map.keys()]);   // ['a', 'b', 'c']
console.log([...map.values()]); // [1, 2, 3]

// Set 的 for...of 迭代 values
const set = new Set(['x', 'y', 'z']);
for (const val of set) {
  console.log(val);  // 'x', 'y', 'z'
}

// 转换为数组
console.log([...set]);  // ['x', 'y', 'z']
```

---

## Key Points

- **Map 的键可以是任意类型**：包括对象、函数、NaN、undefined。这与 Object（键只能是 string/Symbol）完全不同。
- **严格保持插入顺序**：Map 和 Set 遍历时一定按元素插入的先后顺序进行。Object 的枚举顺序则受到整数键和其他键排序规则影响。
- **SameValueZero 比较**：Map 的键相等性和 Set 的值唯一性使用 SameValueZero 算法（`===` 的变体，但 `NaN === NaN` 视为 true，`+0 === -0` 视为 true）。
- **`map.size` 和 `set.size` 是属性，不是方法**：直接读 `.size` 而不是 `.size()`，这点与数组 `.length` 一致。
- **WeakMap/WeakSet 的键/值必须是对象**：不能使用原始类型（number/string/boolean），否则抛 `TypeError`。
- **WeakMap/WeakSet 不可迭代**：没有 `keys()`、`values()`、`entries()` 方法，也没有 `size` 属性和 `forEach`。这是因其弱引用特性决定的。
- **`Map` 比 `Object` 更适合频繁增删的场景**：Map 的 `set/get` 操作在引擎级别做了优化，尤其在键数量较多时性能优于 Object。

---

## Common Mistakes

### ❌ 用 Object 做 Map 用途，键被隐式转字符串

```javascript
const obj = {};
obj[true] = 'yes';
obj[1] = 'number';
// obj['true'] 和 obj['1'] — 键全被转成了 string
console.log(obj[true]);   // 'number' — 与预期不符
console.log(Object.keys(obj));  // ['1', 'true']

// ✅ 正确做法：使用 Map
const map = new Map();
map.set(true, 'yes');
map.set(1, 'number');
console.log(map.get(true));  // 'yes' — 正确区分
```

### ❌ 认为 `map.size()` 是方法

```javascript
const m = new Map([['a', 1]]);
console.log(m.size());  // TypeError: m.size is not a function

// ✅ size 是属性，不是方法
console.log(m.size);    // 1
```

### ❌ 用引用对象直接查询 Map，忘记必须是同一个引用

```javascript
const map = new Map();
map.set({ id: 1 }, 'metadata');

// 虽然内容相同，但这是另一个对象引用
console.log(map.get({ id: 1 }));  // undefined

// ✅ 正确做法：保存引用
const key = { id: 1 };
map.set(key, 'metadata');
console.log(map.get(key));  // 'metadata'
```

---

## Related Concepts

- [Array（数组）](../builtin/array.md) — `[...map]` 和 `[...set]` 可以轻松在集合和数组间转换
- [数组与迭代](../topics/arrays_and_iteration.md) — `for...of` 迭代、解构 Map 条目
- [对象与类](../topics/objects_and_classes.md) — Object 作为键值对的限制，对比 Map 的优势
- [展开语法](../syntax/spread_rest.md) — `[...set]` 快速将 Set 转为数组
- [解构语法](../syntax/destructuring.md) — `for (const [k, v] of map)` 解构 Map 条目

---

## Citations

- [MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN: Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [MDN: WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [MDN: WeakSet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
- [ECMAScript® 2025 Language Specification — Map Objects](https://tc39.es/ecma262/#sec-map-objects)
- [ECMAScript® 2025 Language Specification — Set Objects](https://tc39.es/ecma262/#sec-set-objects)
