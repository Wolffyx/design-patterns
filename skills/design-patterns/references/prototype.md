---
name: Prototype
category: Creational
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/prototype/typescript/example
---

# Prototype

## Intent

Prototype is a creational design pattern that lets you copy existing objects without making your code dependent on their
classes.

## Applicability

- Your code must work with objects from third-party code via interfaces, where concrete classes are unknown
- You want to reduce numerous subclasses that differ only in initialization logic
- Creating objects through standard instantiation is complex or expensive
- You need to avoid coupling to concrete class hierarchies when cloning objects
- You want to provide pre-configured object templates for common scenarios

## Pros

- Objects can be duplicated without depending on their specific classes
- Eliminates redundant initialization code by using pre-built prototypes
- Complex objects are created more efficiently
- Provides an alternative to inheritance for handling configuration variations

## Cons

- Cloning objects with circular references presents significant challenges
- Deep copying of complex object graphs can be tricky to implement correctly

## Don't use when

- A plain `structuredClone()` or spread operator does the job → use the built-in
- The object has a constructor you can call → just call it
- Objects are immutable → no need to clone

## TypeScript Example

```typescript
/**
 * The example class that has cloning ability. We'll see how the values of field
 * with different types will be cloned.
 */
class Prototype {
    public primitive: any;
    public component: object;
    public circularReference: ComponentWithBackReference;

    public clone(): this {
        const clone = Object.create(this);

        clone.component = Object.create(this.component);

        // Cloning an object that has a nested object with backreference
        // requires special treatment. After the cloning is completed, the
        // nested object should point to the cloned object, instead of the
        // original object. Spread operator can be handy for this case.
        clone.circularReference = new ComponentWithBackReference(clone);

        return clone;
    }
}

class ComponentWithBackReference {
    public prototype;

    constructor(prototype: Prototype) {
        this.prototype = prototype;
    }
}

/**
 * The client code.
 */
function clientCode() {
    const p1 = new Prototype();
    p1.primitive = 245;
    p1.component = new Date();
    p1.circularReference = new ComponentWithBackReference(p1);

    const p2 = p1.clone();
    if (p1.primitive === p2.primitive) {
        console.log('Primitive field values have been carried over to a clone. Yay!');
    } else {
        console.log('Primitive field values have not been copied. Booo!');
    }
    if (p1.component === p2.component) {
        console.log('Simple component has not been cloned. Booo!');
    } else {
        console.log('Simple component has been cloned. Yay!');
    }

    if (p1.circularReference === p2.circularReference) {
        console.log('Component with back reference has not been cloned. Booo!');
    } else {
        console.log('Component with back reference has been cloned. Yay!');
    }

    if (p1.circularReference.prototype === p2.circularReference.prototype) {
        console.log('Component with back reference is linked to original object. Booo!');
    } else {
        console.log('Component with back reference is linked to the clone. Yay!');
    }
}

clientCode();
```

## Pairs well with

Composite (clone whole composite trees); Memento (memento + prototype = snapshot + restore with structural sharing).
