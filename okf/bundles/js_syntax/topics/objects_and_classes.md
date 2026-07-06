---
type: JS Topic
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects
title: Objects & Classes
description: 对象字面量、类语法、继承与原型链
tags:
- object
- class
- prototype
- extends
- constructor
- this
- inheritance
- ES6
timestamp: '2026-07-05T14:28:23+00:00'
---

JavaScript 中的对象（Object）是键值对集合，是这门语言最基本的数据结构。几乎所有值在 JavaScript 中都可以表现为对象——数组、函数、日期等底层都基于对象实现。类（Class）是 ES2015（ES6）引入的语法糖，底层仍基于原型链，但提供了更清晰、更接近传统 OOP 语言的声明方式。

理解对象与类的关键在于掌握三个层次：**对象字面量**（快速创建单例）、**构造函数与原型**（实现复用）、**class 语法**（更优雅的封装与继承）。

## Syntax

### 对象字面量

```javascript
// 基本对象字面量
const obj = {
  key: 'value',
  method() { return this.key; }
};

// 动态属性名（Computed property names）
const dynamicKey = 'score';
const player = {
  name: 'Alice',
  [dynamicKey]: 95       // 属性名由变量 dynamicKey 的值决定
};

// 简写属性（Shorthand property names）
const x = 10, y = 20;
const point = { x, y };   // 等价于 { x: x, y: y }
```

### 类语法（ES2015+）

```javascript
class ClassName {
  // 私有字段（ES2022 正式支持）
  #privateField = 'secret';

  constructor(param) {
    this.publicField = param;
  }

  // 实例方法
  methodName() { /* ... */ }

  // 静态方法（挂载在类本身上，而非实例）
  static staticMethod() { /* ... */ }

  // Getter / Setter
  get prop() { return this.#privateField; }
  set prop(val) { this.#privateField = val; }
}
```

## Examples

### 1️⃣ 对象字面量的常见用法

```javascript
// 表示一个用户实体
const user = {
  id: 1001,
  name: '张三',
  role: 'admin',
  // 方法简写
  greet() {
    console.log(`你好，我是 ${this.name}`);
  },
  // Getter
  get isAdmin() {
    return this.role === 'admin';
  }
};

user.greet();      // 输出: 你好，我是 张三
console.log(user.isAdmin); // true
```

### 2️⃣ 使用 class 实现类与继承

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} 发出声音`);
  }

  static classify() {
    return '动物界';
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);          // 必须先调用 super() 才能使用 this
    this.breed = breed;
  }

  // 覆写父类方法
  speak() {
    console.log(`${this.name}（${this.breed}）汪汪叫`);
  }

  fetch() {
    console.log(`${this.name} 去捡球了`);
  }
}

const d = new Dog('旺财', '金毛');
d.speak();      // 输出: 旺财（金毛）汪汪叫
d.fetch();      // 输出: 旺财 去捡球了
console.log(Dog.classify()); // 输出: 动物界（继承静态方法）
```

### 3️⃣ 使用 Object.create 和原型链（无 class 语法）

```javascript
// 传统原型继承方式（仍被大量生产代码使用）
const animalProto = {
  init(name) {
    this.name = name;
    return this;
  },
  speak() {
    console.log(`${this.name} 发出声音`);
  }
};

const dogProto = Object.create(animalProto);
dogProto.bark = function() {
  console.log(`${this.name} 汪汪！`);
};

const myDog = Object.create(dogProto).init('小黑');
myDog.bark();      // 输出: 小黑 汪汪！
myDog.speak();     // 输出: 小黑 发出声音（来自原型链）
```

### 4️⃣ 私有字段与 Getter/Setter

```javascript
class BankAccount {
  #balance = 0;       // 私有字段，外部不可直接访问

  constructor(owner) {
    this.owner = owner;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error('金额必须为正数');
    this.#balance += amount;
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error('余额不足');
    this.#balance -= amount;
  }

  // 只读暴露余额
  get balance() {
    return this.#balance;
  }
}

const account = new BankAccount('Alice');
account.deposit(1000);
account.withdraw(300);
console.log(account.balance); // 700
// console.log(account.#balance); // ❌ SyntaxError: 私有字段不可在类外访问
```

## Key Points

- **对象是引用类型**：比较两个对象时 `==` 和 `===` 都判断引用是否相同，而非结构是否相等。`{a:1} === {a:1}` 结果为 `false`。
- **class 本质是函数**：`typeof MyClass` 返回 `"function"`，class 语法只是构造函数加原型方法的语法糖。
- **必须先调用 super()**：在 `extends` 子类的 `constructor` 中，访问 `this` 之前必须先调用 `super()`，否则报 `ReferenceError`。
- **方法在 prototype 上，属性在实例上**：类中声明的方法存储在 `ClassName.prototype` 上共享给所有实例；字段（constructor 中赋值的属性）则属于每个实例自身。
- **私有字段**：`#` 前缀字段（ES2022 正式支持）是**真正的私有**，在前端运行时不通过遍历可获取，与 TypeScript `private` 关键字不同（后者仅编译时检查）。
- **静态方法不可通过实例调用**：`MyClass.staticMethod()` 正确；`instance.staticMethod()` 会抛出 `TypeError`。

## Common Mistakes

- **忘记 `new` 调用构造函数/类**：`const p = Person('Alice')` 不会报错但 `this` 指向全局对象（严格模式下为 `undefined`），导致属性泄漏。应始终使用 `new Person('Alice')`。
  ```javascript
  // 错误
  const p1 = Person('Alice');  // 没有 new，this 指向 window/global
  // 正确
  const p2 = new Person('Alice');
  ```

- **箭头函数与 `this` 的误解**：在类中使用箭头函数定义方法时，`this` 会**词法绑定**到实例，而非动态绑定。这在事件监听中很方便，但意味着该方法不在 prototype 上，每个实例都会独立创建一份。
  ```javascript
  class Counter {
    count = 0;
    // 箭头函数方法 — 每个实例自己有一份，不在 prototype 上
    increment = () => { this.count++; };
  }
  ```

- **直接修改原型导致所有实例受影响**：误修改 `Array.prototype` 或 `Object.prototype` 会影响全局所有对象，绝对避免在生产代码中这样做。
  ```javascript
  // ❌ 极度危险：会污染所有数组实例
  Array.prototype.customMethod = function() { return this.length; };
  ```

## Related Concepts

- [Class 语法](../syntax/class.md) — 详细了解 class 的 constructor、extends、super、static、私有字段等关键词。
- [原型链模式](../patterns/prototype_chain.md) — 深入原型链机制：`__proto__`、`Object.create`、`hasOwnProperty` 与 `instanceof`。
- [解构赋值](../syntax/destructuring.md) — 从对象中快速提取属性值。
- [展开与剩余语法](../syntax/spread_rest.md) — 使用 `...` 浅拷贝对象或合并多个对象。
- [变量声明](../topics/variables.md) — `let`/`const`/`var` 的作用域规则，理解对象与原始类型的区别。

## Citations

- [MDN: Working with Objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- [MDN: Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN: Private class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)
- [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
