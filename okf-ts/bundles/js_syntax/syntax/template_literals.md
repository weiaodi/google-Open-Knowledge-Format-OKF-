---
type: JS Syntax
title: Template Literals
description: 模板字符串：使用反引号（`）创建的字符串，支持多行文本、嵌入表达式（${}）和标签模板（tagged templates）。
tags:
  - ES6
  - backtick
  - interpolation
  - template literal
  - tagged template
  - multi-line string
  - string interpolation
resource: >-
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
timestamp: '2026-07-06T09:38:07.428Z'
---

## 概述

**Template Literals（模板字符串）** 是 ES6 引入的一种字符串语法，使用反引号（`` ` ``）替代传统的单引号或双引号。它解决了三个常见痛点：字符串拼接冗长、多行文本难以书写、以及需要对字符串内容进行自定义处理。核心能力包括 **嵌入表达式（interpolation）**、**多行字符串支持** 以及 **标签模板（tagged templates）**。在现代 JavaScript 项目中，模板字符串已基本取代了传统的字符串拼接操作。

---

## Syntax

```javascript
// 基本模板字符串
`string text`

// 嵌入表达式
`string text ${expression} string text`

// 多行字符串
`line 1
line 2`

// 标签模板
tagFunction`string text ${expression} string text`
```

其中：
- `${expression}` — 花括号内的任意 JavaScript 表达式会被求值并转为字符串
- `tagFunction` — 一个函数，用于对模板字符串进行自定义处理

---

## Examples

### 1. 基本字符串插值 — 告别繁琐的 `+` 拼接

```javascript
const name = 'Alice';
const age = 30;

// ❌ 传统方式
const msg1 = 'My name is ' + name + ', I am ' + age + ' years old.';

// ✅ 模板字符串方式
const msg2 = `My name is ${name}, I am ${age} years old.`;

console.log(msg2);
// 输出: My name is Alice, I am 30 years old.
```

### 2. 嵌入任意表达式

`${}` 中可以是任意 JavaScript 表达式：运算、函数调用、三元运算符等。

```javascript
const a = 10;
const b = 20;

// 算术表达式
console.log(`${a} + ${b} = ${a + b}`);
// 输出: 10 + 20 = 30

// 三元运算符
const score = 85;
console.log(`成绩: ${score >= 60 ? '及格' : '不及格'}`);
// 输出: 成绩: 及格

// 方法调用
const user = { firstName: 'John', lastName: 'Doe' };
console.log(`Full name: ${user.firstName.toUpperCase()} ${user.lastName}`);
// 输出: Full name: JOHN Doe
```

### 3. 多行字符串 — 保留换行与缩进

```javascript
// ✅ 模板字符串天然支持多行
const html = `
  <div class="card">
    <h2>${title}</h2>
    <p>${description}</p>
  </div>
`;

console.log(html);
// 输出（保留缩进和换行）:
//   <div class="card">
//     <h2>Hello</h2>
//     <p>World</p>
//   </div>

// ❌ 传统方式需要手动加 \n 和拼接，非常痛苦
const oldHtml = '<div class="card">\n' +
  '  <h2>' + title + '</h2>\n' +
  '  <p>' + description + '</p>\n' +
  '</div>';
```

### 4. 标签模板（Tagged Templates）— 自定义字符串处理

标签模板允许你用一个函数处理模板字符串的各个部分，常用于 SQL 防注入、国际化、样式化等场景。

```javascript
// 一个简单的标签函数：将所有嵌入值包裹为 <strong>
function highlight(strings, ...values) {
  // strings: 静态文本片段数组
  // values:  所有嵌入表达式的值
  let result = '';
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      result += `<strong>${values[i]}</strong>`;
    }
  });
  return result;
}

const name = 'TypeScript';
const year = 2012;
const output = highlight`${name} was first released in ${year}.`;

console.log(output);
// 输出: <strong>TypeScript</strong> was first released in <strong>2012</strong>.
```

### 5. 嵌套模板 — 动态构建复杂结构

```javascript
const items = ['Apple', 'Banana', 'Cherry'];

// 利用模板字符串动态生成 HTML 列表
const list = `
  <ul>
    ${items.map(item => `    <li>${item}</li>`).join('\n')}
  </ul>
`;

console.log(list);
// 输出:
//   <ul>
//     <li>Apple</li>
//     <li>Banana</li>
//     <li>Cherry</li>
//   </ul>
```

---

## Key Points

1. **反引号是关键标识** — 模板字符串必须使用反引号（`` ` ``），不能用单引号或双引号替代。键盘上通常位于 Esc 键下方。
2. **`${}` 内可放任意表达式** — 支持变量、运算、函数调用、三元运算符等。但不能直接放语句（如 `if`、`for`）。
3. **多行文本保留格式** — 模板字符串中的换行、空格和缩进都会被保留在输出中，不会再像传统字符串那样报语法错误。
4. **标签模板不一定要返回字符串** — 标签函数可以返回任何值（如对象、数组、HTML 节点等）。
5. **原始字符串访问** — 通过 `String.raw` 标签模板可以获取未处理转义序列的原始字符串：`String.raw`\`Hello\\nWorld\`` 会输出 `Hello\\nWorld`（反斜杠未被转义）。
6. **性能与普通字符串无异** — 模板字符串在运行时被正确编译，不存在性能劣势，可以放心使用。

---

## Common Mistakes

### 1. 忘记使用反引号，仍用引号导致插值失效

```javascript
const name = 'Alice';

// ❌ 错误：使用了双引号，${name} 不会被解析
const msg = "Hello, ${name}!";
console.log(msg);
// 输出: Hello, ${name}!  （原样输出）

// ✅ 正确：使用反引号
const msg = `Hello, ${name}!`;
console.log(msg);
// 输出: Hello, Alice!
```

### 2. 在 `${}` 中放入语句而非表达式

```javascript
const items = [1, 2, 3];

// ❌ 错误：if 是语句，不能放在 ${} 中
// const result = `${if (items.length > 0) 'yes' else 'no'}`;
// SyntaxError: Unexpected token 'if'

// ✅ 正确：使用三元表达式
const result = `${items.length > 0 ? 'yes' : 'no'}`;

// 或者用 IIFE（立即执行函数）
const result2 = `${(() => {
  if (items.length > 0) return 'yes';
  return 'no';
})()}`;
```

### 3. 标签模板中忽略 `strings.raw` 与 `strings` 的区别

传递给标签函数的第一个参数 `strings` 还有一个 `raw` 属性，包含原始（未处理转义）的字符串片段。

```javascript
function inspect(strings, ...values) {
  console.log(strings);       // ['Hello\n', ' world']
  console.log(strings.raw);   // ['Hello\\n', ' world']
}

// 注意字符串中的 \n
inspect`Hello\n${'and'} world`;
```

忘记使用 `strings.raw` 在处理文件路径或正则表达式时可能导致意外的转义行为。

---

## Related Concepts

- [Variables](../topics/variables.md) — 模板字符串中嵌入的变量声明和作用域规则
- [Destructuring](../syntax/destructuring.md) — 常与模板字符串搭配使用的解构赋值语法
- [Arrow Functions](../syntax/arrow_function.md) — 在模板字符串嵌入表达式中常用于回调函数
- [Functions](../topics/functions.md) — 标签模板本质上是对函数的调用

---

## Citations

- [MDN: Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- [ECMAScript 2015 (ES6) Specification — Template Literal Lexical Components](https://262.ecma-international.org/6.0/#sec-template-literal-lexical-components)
- [MDN: String.raw](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw)
