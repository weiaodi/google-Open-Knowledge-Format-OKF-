---
type: JS Syntax
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
title: Class Syntax
description: 基于原型的 class 语法糖，支持 extends、super、static 成员和私有字段 (#)。
tags:
- class
- constructor
- extends
- super
- static
- private field
- ES6
timestamp: '2026-07-05T14:32:09+00:00'
---

## 概述

`class` 是 ES2015 (ES6) 引入的语法糖，底层仍是基于原型链（prototype chain）的继承机制。它提供了一种更清晰、更接近传统 OOP 语言的方式来定义构造函数和原型方法。class 语法**不会创建新的面向对象模型**，而是让原型继承的写法更直观。当你需要创建具有共享方法和层次结构的对象时，class 是首选的表达方式。

## Syntax

```javascript
// 基本类声明
class ClassName {
  constructor(param1, param2) {
    this.property1 = param1;
    this.property2 = param2;
  }

  method1() { /* 原型方法 */ }
  static staticMethod() { /* 静态方法 */ }
  get getterName() { /* getter */ }
  set setterName(value) { /* setter */ }
}

// 类表达式（匿名或具名）
const MyClass = class { /* ... */ };
const NamedClass = class Named { /* ... */ };

// 继承
class ChildClass extends ParentClass {
  constructor(...args) {
    super(...args);  // 必须先调用 super()
    this.childProp = '额外属性';
  }

  // 重写父类方法
  overriddenMethod() {
    super.overriddenMethod(); // 调用父类版本
    // 子类逻辑
  }
}
```

## Examples

### 基本用法 — 实例属性与方法

```javascript
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }

  // 原型方法，所有实例共享
  greet() {
    return `你好，我是 ${this.name}`;
  }

  // getter
  get emailDomain() {
    return this.email.split('@')[1];
  }

  // setter
  set emailDomain(domain) {
    this.email = this.email.replace(/@.+$/, `@${domain}`);
  }
}

const user = new User('Alice', 'alice@example.com');
console.log(user.greet());       // "你好，我是 Alice"
console.log(user.emailDomain);   // "example.com"
user.emailDomain = 'company.org';
console.log(user.email);         // "alice@company.org"
```

### 静态成员与私有字段 (ES2022+)

```javascript
class Counter {
  // 私有字段 — 以 # 开头，类外部无法访问
  #count = 0;

  // 静态私有字段
  static #totalCounters = 0;

  constructor() {
    Counter.#totalCounters++;
  }

  increment() {
    this.#count++;
  }

  get value() {
    return this.#count;
  }

  // 静态方法
  static get totalCreated() {
    return Counter.#totalCounters;
  }
}

const a = new Counter();
const b = new Counter();
a.increment();
a.increment();
b.increment();
console.log(a.value);            // 2
console.log(Counter.totalCreated); // 2
// console.log(a.#count);        // SyntaxError: 私有字段不可在类外访问
```

### 继承与 super

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} 发出声音`;
  }

  static classify() {
    return '动物';
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 必须调用 super() 才能使用 this
    this.breed = breed;
  }

  // 重写 speak 方法
  speak() {
    // 先调用父类版本，再追加子类逻辑
    return `${super.speak()} — 汪汪！`;
  }

  static classify() {
    return `犬科 (${super.classify()})`;
  }
}

const dog = new Dog('旺财', '柴犬');
console.log(dog.speak());          // "旺财 发出声音 — 汪汪！"
console.log(Dog.classify());       // "犬科 (动物)"
console.log(dog instanceof Animal); // true
console.log(dog instanceof Dog);    // true
```

### 类表达式与混入 (Mixin) 模式

```javascript
// 类表达式：动态创建类
function createLogger(BaseClass) {
  return class extends BaseClass {
    log(message) {
      console.log(`[${new Date().toISOString()}] ${message}`);
    }
  };
}

class Person {
  constructor(name) { this.name = name; }
}

// 混入：组合多个类的能力
class Employee extends createLogger(Person) {
  constructor(name, role) {
    super(name);
    this.role = role;
  }
}

const emp = new Employee('Bob', '工程师');
emp.log('上班打卡'); // "[2025-01-01T08:00:00.000Z] 上班打卡"
```

## Key Points

- **`class` 本质是函数**：`typeof MyClass === 'function'`，`class` 声明的构造函数就是 `constructor` 方法本身。
- **必须先调用 `super()` 才能访问 `this`**：在派生类的构造函数中，调用 `super()` 之前使用 `this` 会抛出 `ReferenceError`。
- **class 方法不可枚举**：class 的原型方法默认 `enumerable: false`，这与传统构造函数不同（传统方法写在 prototype 上是可枚举的）。
- **class 声明不会提升**：与 `function` 不同，`class` 声明存在暂时性死区（TDZ），必须在声明后才能使用。
- **私有字段 `#` 是真正的硬私密**：ES2022 正式支持的 `#field` 语法在语言层面保证不可从外部访问，无法通过 `Object.keys()` 或 `Reflect` 获取。
- **`static` 成员属于类本身**：静态方法和属性只能通过类名调用，实例无法访问。静态方法中的 `this` 指向类本身。

## Common Mistakes

- **忘记调用 `super()` 或放错顺序**：派生类构造函数中，`super()` 必须是第一行（在 `this` 使用之前）。忘记调用会抛出 `ReferenceError`。
  ```javascript
  // ❌ 错误
  class Child extends Parent {
    constructor(x, y) {
      this.x = x;  // ReferenceError: 必须先调用 super()
      super(y);
    }
  }
  ```

- **箭头函数在 class 中作为方法的误解**：箭头函数定义在字段中（如 `method = () => {}`）会为**每个实例**创建独立函数副本。若希望将方法放在原型上共享，应使用标准方法语法。
  ```javascript
  class MyClass {
    // 每个实例独立创建，占用更多内存
    arrowMethod = () => { /* ... */ };
    // 原型上的共享方法
    standardMethod() { /* ... */ };
  }
  ```

- **误以为 class 是值类型**：class 仍然是引用类型，比较两个实例必须比较引用或自定义 `equals` 方法，不要使用 `===`。
  ```javascript
  new User('a') === new User('a'); // false，两个不同对象
  ```

## Related Concepts

- [对象与类](../topics/objects_and_classes.md) — class 的底层机制，对象创建与属性描述符
- [原型链模式](../patterns/prototype_chain.md) — class 背后的原型继承原理
- [函数](../topics/functions.md) — 构造函数与普通函数的区别
- [变量声明](../topics/variables.md) — let/const 的暂时性死区 (TDZ) 与 class 的提升行为一致

## Citations

- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [ECMAScript 2015: Class Definitions](https://262.ecma-international.org/6.0/#sec-class-definitions)
- [ECMAScript 2022: Private Class Fields](https://tc39.es/ecma262/#sec-private-static-methods-and-accessors)
