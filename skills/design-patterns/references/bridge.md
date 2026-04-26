---
name: Bridge
category: Structural
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/bridge/typescript/example
---

# Bridge

## Intent

Bridge is a structural design pattern that lets you split a large class or a set of closely related classes into two
separate hierarchies—abstraction and implementation—which can be developed independently of each other.

## Applicability

- You have a monolithic class with multiple functional variants that need independent development and modification
- You want to extend a class across several independent dimensions to avoid exponential growth of subclasses
- You need flexibility to swap implementations at runtime without affecting client code

## Pros

- Enables creating platform-independent classes and applications
- Client code interacts with high-level abstractions without exposure to underlying platform details
- Supports the Open/Closed Principle by allowing new abstractions and implementations to be introduced independently
- Follows Single Responsibility Principle by separating high-level logic from platform-specific details

## Cons

- May unnecessarily complicate code when applied to highly cohesive classes that don't require separation

## Don't use when

- You only have one dimension of variation → use Strategy or Adapter
- The class isn't actually big → premature
- Adapter already solves your interop problem → don't add a second hierarchy

## TypeScript Example

```typescript
/**
 * The Abstraction defines the interface for the "control" part of the two class
 * hierarchies. It maintains a reference to an object of the Implementation
 * hierarchy and delegates all of the real work to this object.
 */
class Abstraction {
    protected implementation: Implementation;

    constructor(implementation: Implementation) {
        this.implementation = implementation;
    }

    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `Abstraction: Base operation with:\n${result}`;
    }
}

/**
 * You can extend the Abstraction without changing the Implementation classes.
 */
class ExtendedAbstraction extends Abstraction {
    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `ExtendedAbstraction: Extended operation with:\n${result}`;
    }
}

/**
 * The Implementation defines the interface for all implementation classes. It
 * doesn't have to match the Abstraction's interface. In fact, the two
 * interfaces can be entirely different. Typically the Implementation interface
 * provides only primitive operations, while the Abstraction defines higher-
 * level operations based on those primitives.
 */
interface Implementation {
    operationImplementation(): string;
}

/**
 * Each Concrete Implementation corresponds to a specific platform and
 * implements the Implementation interface using that platform's API.
 */
class ConcreteImplementationA implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationA: Here\'s the result on the platform A.';
    }
}

class ConcreteImplementationB implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationB: Here\'s the result on the platform B.';
    }
}

/**
 * Except for the initialization phase, where an Abstraction object gets linked
 * with a specific Implementation object, the client code should only depend on
 * the Abstraction class.
 */
function clientCode(abstraction: Abstraction) {
    console.log(abstraction.operation());
}

/**
 * The client code should be able to work with any pre-configured abstraction-
 * implementation combination.
 */
let implementation = new ConcreteImplementationA();
let abstraction = new Abstraction(implementation);
clientCode(abstraction);

console.log('');

implementation = new ConcreteImplementationB();
abstraction = new ExtendedAbstraction(implementation);
clientCode(abstraction);
```

## Pairs well with

Adapter (Adapter retrofits incompatible interfaces; Bridge designs the split up-front); Abstract Factory (Bridge often
gets its implementation from an Abstract Factory).
