---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
title: Template Literals
description: 反引号字符串，支持嵌入表达式插值、多行文本和标签模板函数。
tags:
- backtick
- interpolation
- ${}
- tagged template
- multiline
- ES6
timestamp: '2026-07-05T14:31:44+00:00'
---

## 概述

Template Literals（模板字面量）是 ES2015（ES6）引入的一种新型字符串语法，使用反引号（`` ` ``）替代传统的单引号或双引号。它解决了三个核心痛点：字符串插值（无需 `+` 拼接）、多行文本（无需 `\n` 换行符）和标签模板（自定义字符串处理函数）。在现代 JavaScript 项目中，Template Literals 已基本取代传统字符串拼接，是日常开发中最常用的 ES6 特性之一。

## Syntax

```javascript
// 基本语法：反引号包裹
`字符串内容`

// 插值表达式：${expression}
`Hello, ${name}!`

// 多行字符串：直接换行
`第一行
第二行
第三行`

// 标签模板
tagFunction`字符串 ${expr} 内容`

// 原始字符串（String.raw）
String.raw`C:\path\to\file`
```

- 插值表达式 `\${...}` 中可以放置任意合法的 JavaScript 表达式（变量、运算、函数调用、三元表达式等）
- 标签模板（Tagged Template）是 Template Literal 前紧跟一个函数名，该函数接收字符串片段和插值表达式作为参数

## Examples

### 1. 基本插值 — 告别字符串拼接

```javascript
const name = 'Alice';
const age = 30;

// 传统方式（难以阅读）
const msg1 = '我叫 ' + name + '，今年 ' + age + ' 岁。';

// Template Literal（清晰直观）
const msg2 = `我叫 ${name}，今年 ${age} 岁。`;

console.log(msg2); // 输出：我叫 Alice，今年 30 岁。
```

### 2. 嵌入任意表达式

```javascript
const price = 29.99;
const quantity = 3;
const taxRate = 0.08;

// 支持运算、三元表达式、方法调用
const invoice = `总价：¥${(price * quantity).toFixed(2)}
税费：¥${(price * quantity * taxRate).toFixed(2)}
应付：¥${(price * quantity * (1 + taxRate)).toFixed(2)}`;

console.log(invoice);
// 输出：
// 总价：¥89.97
// 税费：¥7.20
// 应付：¥97.17
```

### 3. 多行模板字符串 — 生成 HTML 或 SQL

```javascript
const user = { name: '张三', role: '管理员' };

// 无需 \n，直接换行，保留缩进
const card = `
  <div class="user-card">
    <h2>${user.name}</h2>
    <span class="role">${user.role}</span>
  </div>
`.trim(); // .trim() 去掉首尾空白

console.log(card);
// <div class="user-card">
//   <h2>张三</h2>
//   <span class="role">管理员</span>
// </div>
```

### 4. 标签模板 — 自定义字符串处理

```javascript
// 标签函数：接收字符串片段数组和插值参数
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const value = values[i] ? `<strong>${values[i]}</strong>` : '';
    return result + str + value;
  }, '');
}

const product = '笔记本电脑';
const price = 5999;

const result = highlight`今日特惠：${product}，仅需 ¥${price}！`;
console.log(result);
// 输出：今日特惠：<strong>笔记本电脑</strong>，仅需 ¥<strong>5999</strong>！
```

### 5. 嵌套模板 — 动态构建复杂字符串

```javascript
const items = ['苹果', '香蕉', '橘子'];

// 在模板中嵌套 map 调用
const list = `
  <ul>
    ${items.map(item => `    <li>${item}</li>`).join('\n')}
  </ul>
`;

console.log(list);
// <ul>
//   <li>苹果</li>
//   <li>香蕉</li>
//   <li>橘子</li>
// </ul>
```

## Key Points

1. **反引号（`` ` ``）是唯一的分隔符** — 不能在 Template Literal 内部使用反引号而不转义（用 `\`` 转义）。
2. **插值支持任意表达式** — `\${...}` 内部可以是变量、运算、三元表达式、函数调用、甚至嵌套 Template Literal。
3. **保留换行和缩进** — Template Literal 中的换行符和空格会被原样保留，常用 `.trim()` 去除首尾多余空白。
4. **标签模板是函数调用的语法糖** — `` tag`...` `` 等价于 `tag(['字符串片段...'], ...值)`，用于实现国际化、SQL 转义、样式组件等高级功能。
5. **`String.raw` 获取原始字符串** — `String.raw` 是一个内置标签函数，返回不处理转义序列的原始字符串（反斜杠保持原样），适合处理文件路径或正则表达式。
6. **性能通常优于拼接** — 现代 V8 引擎对 Template Literal 做了优化，执行效率与字符串拼接相当或更好。

## Common Mistakes

1. **忘记使用反引号，仍然用 `+` 拼接**

   ❌ 错误：
   ```javascript
   const greeting = 'Hello, ' + name + '!';
   ```

   ✅ 正确：
   ```javascript
   const greeting = `Hello, ${name}!`;
   ```

2. **在插值中直接嵌入对象或数组未处理格式**

   ❌ 错误：
   ```javascript
   const items = [1, 2, 3];
   console.log(`Items: ${items}`); // 输出："Items: 1,2,3" — 自动调用了 toString()
   ```

   ✅ 正确：
   ```javascript
   const items = [1, 2, 3];
   console.log(`Items: ${items.join(', ')}`); // 输出："Items: 1, 2, 3"
   ```

3. **标签模板中误用普通字符串作为标签函数**

   ❌ 错误：
   ```javascript
   const tag = 'highlight'; // 字符串，不是函数
   tag`Hello`; // TypeError: tag is not a function
   ```

   ✅ 正确：
   ```javascript
   function highlight(strings, ...values) { /* ... */ }
   highlight`Hello`; // 正常工作
   ```

## Related Concepts

- [变量声明（let/const）](../topics/variables.md) — 常与 Template Literal 配合使用，模板中引用的变量建议优先使用 `const` 或 `let`
- [箭头函数](../syntax/arrow_function.md) — 在模板插值中频繁使用箭头函数进行数组转换（如 `.map()`）
- [解构赋值](../syntax/destructuring.md) — 与 Template Literal 结合使用时，可从对象中提取字段直接用于插值
- [展开运算符](../syntax/spread_rest.md) — 在标签模板的参数处理中常与剩余参数 `...` 配合使用
- [函数](../topics/functions.md) — 标签模板本质上是函数的特殊调用形式

## Citations

- [MDN: Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- [ECMAScript 2015 (ES6) Specification — Template Literal Lexical Components](https://262.ecma-international.org/6.0/#sec-template-literal-lexical-components)
- [MDN: String.raw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw)
