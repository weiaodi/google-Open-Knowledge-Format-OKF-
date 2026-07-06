---
type: JS Pattern
resource: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
title: Prototype Chain
description: JavaScript 的继承机制，对象通过 __proto__ 链查找属性和方法
tags:
- prototype
- inheritance
- __proto__
- Object.create
- hasOwnProperty
- instanceof
timestamp: '2026-07-05T14:34:49+00:00'
---

## 概述

**Prototype Chain（原型链）** 是 JavaScript 实现继承的核心机制。每个 JavaScript 对象都有一个内部链接指向另一个对象——它的 **prototype（原型）**。当访问一个对象的属性时，如果该对象自身没有这个属性，JavaScript 引擎会沿着 `__proto__` 链向上查找，直到找到该属性或到达 `null` 为止。理解原型链是掌握 JS 对象系统、编写高效继承代码的基础，也是理解 `class` 语法糖背后原理的关键。

## Syntax

原型链并没有固定的"语法"，而是通过以下三种方式建立对象之间的原型关系：

```javascript
// 方式一：通过构造函数 prototype 属性（传统方式）
function Constructor() {}
Constructor.prototype.method = function() {};
const obj = new Constructor();
// obj.__proto__ === Constructor.prototype

// 方式二：Object.create()（ES5，推荐）
const parent = { greet() { return 'Hi'; } };
const child = Object.create(parent);
// child.__proto__ === parent

// 方式三：class extends 语法糖（ES6）
class Animal {}
class Dog extends Animal {}
```

## Examples

### 示例 1：理解原型链查找过程

```javascript
const animal = { eat: true };
const dog = Object.create(animal);  // dog → animal → Object.prototype → null
dog.bark = true;

console.log(dog.bark);  // true（自身属性）
console.log(dog.eat);   // true（沿原型链找到 animal.eat）
console.log(dog.toString); // 沿原型链找到 Object.prototype.toString
console.log(dog.nonexistent); // undefined（整条链都找不到）

// 使用 hasOwnProperty 区分自身属性与继承属性
console.log(dog.hasOwnProperty('bark')); // true
console.log(dog.hasOwnProperty('eat'));  // false
```

### 示例 2：构造函数 + prototype 实现共享方法

```javascript
function Person(name) {
  this.name = name;  // 实例独有属性
}

// 方法挂载在 prototype 上，所有实例共享同一个函数
Person.prototype.sayHi = function() {
  return `Hi, I'm ${this.name}`;
};

const alice = new Person('Alice');
const bob = new Person('Bob');

console.log(alice.sayHi());           // "Hi, I'm Alice"
console.log(alice.sayHi === bob.sayHi); // true —— 共享同一个方法
console.log(alice.__proto__ === Person.prototype); // true
```

### 示例 3：原型链的层级继承

```javascript
function Animal(type) {
  this.type = type;
}
Animal.prototype.getType = function() { return this.type; };

function Dog(name) {
  Animal.call(this, 'mammal');  // 调用父构造函数初始化
  this.name = name;
}

// 建立继承：Dog.prototype → Animal.prototype → Object.prototype
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;  // 修复 constructor 引用

Dog.prototype.bark = function() {
  return `${this.name} says woof!`;
};

const d = new Dog('Buddy');
console.log(d.bark());      // "Buddy says woof!" —— Dog.prototype
console.log(d.getType());   // "mammal" —— Animal.prototype
console.log(d.toString());  // "[object Object]" —— Object.prototype
```

### 示例 4：使用 class 语法糖（本质仍是原型链）

```javascript
class Vehicle {
  constructor(speed) {
    this.speed = speed;
  }
  move() { return `Moving at ${this.speed} km/h`; }
}

class Car extends Vehicle {
  constructor(speed, brand) {
    super(speed);
    this.brand = brand;
  }
  honk() { return `${this.brand} beeps!`; }
}

const myCar = new Car(120, 'Toyota');
console.log(myCar.move());  // "Moving at 120 km/h" —— 原型链查找
console.log(myCar.honk());  // "Toyota beeps!"

// 验证原型链关系
console.log(myCar.__proto__ === Car.prototype);            // true
console.log(Car.prototype.__proto__ === Vehicle.prototype); // true
console.log(Vehicle.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__);                   // null —— 链的终点
```

## Key Points

- **原型链的终点是 `null`**：`Object.prototype.__proto__` 为 `null`，如果一直找到 `null` 仍未找到属性，返回 `undefined`。
- **`hasOwnProperty` 是区分自身属性与继承属性的唯一可靠方式**：`for...in` 循环会遍历继承的可枚举属性，配合 `hasOwnProperty` 使用才能过滤。
- **`Object.create(null)` 创建无原型的纯净对象**：这种对象没有 `toString`、`hasOwnProperty` 等方法，适合用作纯字典（Map 出现之前的替代方案）。
- **`instanceof` 运算符遍历原型链做判断**：`obj instanceof Constructor` 检查 `Constructor.prototype` 是否出现在 `obj` 的原型链上。
- **`class` 语法只是语法糖**：ES6 的 `class` / `extends` 底层仍然是原型链，`typeof` 一个 class 仍然是 `"function"`。
- **修改 `prototype` 会影响所有已创建的实例**：因为实例只持有对 prototype 对象的引用，修改 prototype 上的属性会立即反映到所有实例。

## Common Mistakes

- **误用 `__proto__` 直接修改原型**：`__proto__` 是历史遗留的非标准属性（部分环境甚至不支持），应使用 `Object.getPrototypeOf()` 读取原型，使用 `Object.setPrototypeOf()` 或 `Object.create()` 设置原型。
  ```javascript
  // ❌ 不推荐
  obj.__proto__ = parent;

  // ✅ 推荐
  const obj = Object.create(parent);
  // 或（性能开销大，避免在运行时使用）
  Object.setPrototypeOf(obj, parent);
  ```

- **忘记修复 constructor 引用**：当用 `Child.prototype = Object.create(Parent.prototype)` 重写 prototype 时，`Child.prototype.constructor` 会指向 `Parent`，导致 `instanceof` 和行为异常。
  ```javascript
  function Parent() {}
  function Child() {}
  Child.prototype = Object.create(Parent.prototype);
  // ❌ Child.prototype.constructor === Parent
  // ✅ 修复
  Child.prototype.constructor = Child;
  ```

- **误以为 `prototype` 是实例的属性**：`prototype` 是**构造函数**的属性，不是实例的属性。实例通过 `__proto__`（或 `Object.getPrototypeOf(instance)`）访问其原型。
  ```javascript
  function Foo() {}
  const f = new Foo();
  // ❌ f.prototype → undefined
  // ✅ f.__proto__ → Foo.prototype
  // ✅ Object.getPrototypeOf(f) → Foo.prototype
  ```

## Related Concepts

- [对象与类 (Objects & Classes)](../topics/objects_and_classes.md) — 原型链是 JS 对象系统的底层机制
- [class 语法](../syntax/class.md) — `class` / `extends` 是原型链的语法糖封装
- [闭包 (Closure)](../patterns/closure.md) — 另一种实现数据封装和"私有"属性的模式

## Citations

- [MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- [MDN: Object.create()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- [MDN: instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)
- [ECMAScript Spec: Object Internal Methods and Internal Slots](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots)
