---
type: JS Syntax
resource: ''
title: 默认参数 (Default Parameters)
description: 在函数定义时为参数指定默认值，当实参为 undefined 或未传入时自动生效。
tags:
- default value
- undefined
- parameters
- ES6
- ES2015
timestamp: '2026-07-05T14:32:53+00:00'
---

## 概述

默认参数（Default Parameters）是 ES2015（ES6）引入的特性，允许在函数声明时为形参指定一个默认值。当调用函数时，如果某个参数未传入或显式传入 `undefined`，则默认值会被使用。这一特性极大简化了旧时代手动检测 `typeof arg === 'undefined'` 的样板代码，让函数签名更清晰、可读性更强。

使用默认参数的场景包括：为配置对象的可选属性提供兜底值、设置分页查询的默认页码与条数、为回调函数提供空操作的默认实现等。

## 语法

```javascript
function name(param1 = defaultValue1, param2 = defaultValue2, ...) {
  // function body
}
```

- 默认值可以是任意 JavaScript 表达式，甚至是函数调用。
- 默认值仅在**实参为 `undefined`** 时生效——`null`、`false`、`0` 等 falsy 值不会触发默认值。
- 默认参数会按从左到右的顺序求值，前面的参数可以在后面参数的默认值表达式中引用。

## 示例

### 基础用法

```javascript
// 基本场景：设置默认值
function greet(name = '访客') {
  return `你好，${name}！`;
}

console.log(greet('小明'));   // "你好，小明！"
console.log(greet());        // "你好，访客！" — 未传参，使用默认值
console.log(greet(undefined)); // "你好，访客！" — undefined 触发默认值
console.log(greet(null));    // "你好，null！" — null 不会触发默认值！
```

### 分页函数中的实际应用

```javascript
// 实际开发场景：分页查询
function fetchUsers(page = 1, pageSize = 20) {
  console.log(`正在请求第 ${page} 页，每页 ${pageSize} 条`);
  // 模拟 API 调用
  return { page, pageSize, data: [] };
}

fetchUsers();           // 第 1 页，每页 20 条
fetchUsers(3);          // 第 3 页，每页 20 条
fetchUsers(2, 50);      // 第 2 页，每页 50 条
```

### 引用前面的参数作为默认值

```javascript
// 后面的参数可以引用前面的参数
function createRectangle(width, height = width) {
  // 如果 height 未传，视为正方形
  return { width, height };
}

console.log(createRectangle(10));     // { width: 10, height: 10 }
console.log(createRectangle(10, 20)); // { width: 10, height: 20 }
```

### 使用函数调用作为默认值

```javascript
// 默认值可以是函数调用的结果（按需求值）
function getDefaultId() {
  console.log('计算默认 ID...');
  return Math.floor(Math.random() * 10000);
}

function createUser(name, id = getDefaultId()) {
  return { name, id };
}

// 只有当 id 未传入时，getDefaultId 才会被调用
console.log(createUser('Alice'));        // getDefaultId 被调用
console.log(createUser('Bob', 9999));    // getDefaultId 不被调用
```

## 关键要点

- **默认值只对 `undefined` 生效**：`null`、`NaN`、`false`、`0`、`''` 等 falsy 值都不会触发默认值替换，这一点与许多人直觉相反。
- **默认值**在每次函数调用时**惰性求值**：如果默认值是一个表达式或函数调用，它只会在需要时（参数为 `undefined`）执行一次，不是定义时求值。
- **默认参数会创建一个新的作用域**（称为「参数作用域」），与函数体作用域隔离。这意味着函数体内用 `var` 声明的变量不会影响参数默认值中的同名变量。
- **默认参数会改变函数的 `length` 属性**：`function.length` 返回的是没有默认值的参数个数（从第一个有默认值的参数开始，后续参数不计入）。
- **默认参数可以与解构（Destructuring）结合使用**：为解构出的属性设置默认值，或为整个解构参数设置空对象兜底。
- **默认参数不影响 arguments 对象**：`arguments` 对象仍然反映实际传入的值，而不是默认值填充后的值（严格模式下）。

## 常见错误

- **将 `null` 误认为能触发默认值**
  ```javascript
  function setVolume(level = 50) {
    console.log(level);
  }
  setVolume(null); // 输出 null，不是 50！
  // 修正：如果需要将 null 也视为未传入，手动检查：
  function setVolumeFixed(level = 50) {
    if (level === null) level = 50;
    console.log(level);
  }
  ```

- **默认参数放在中间导致无法省略后续必传参数**
  ```javascript
  function log(message, level = 'INFO', timestamp) {
    console.log(`[${level}] ${timestamp}: ${message}`);
  }
  // 如果想用默认 level 但指定 timestamp，必须传 undefined：
  log('出错啦', undefined, new Date()); // 可行但丑陋
  // 最佳实践：将必传参数放在前面，有默认值的参数放在后面
  function logBetter(message, timestamp, level = 'INFO') {
    console.log(`[${level}] ${timestamp}: ${message}`);
  }
  ```

- **默认值中使用前面的参数但忽略了参数求值顺序**
  ```javascript
  function badExample(a = b, b = 1) {
    return [a, b];
  }
  // ReferenceError: Cannot access 'b' before initialization
  // 原因：a 的默认值求值时，b 还未初始化（TDZ）
  // 修正：确保引用顺序正确——被引用的参数必须先声明
  ```

## 相关概念

- [函数 (Functions)](../topics/functions.md) — 函数的完整指南，包括声明、表达式与调用
- [箭头函数 (Arrow Functions)](../syntax/arrow_function.md) — 箭头函数同样支持默认参数语法
- [解构赋值 (Destructuring)](../syntax/destructuring.md) — 结合解构与默认值处理嵌套对象
- [变量 (Variables)](../topics/variables.md) — 理解块级作用域与 TDZ，有助于理解默认参数的参数作用域

## 参考资源

- MDN: [Default parameters](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Default_parameters)
- ECMAScript 2015 (ES6) Specification — Function Definitions
