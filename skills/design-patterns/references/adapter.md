---
name: Adapter
category: Structural
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/adapter/typescript/example
---

# Adapter

## Intent

Adapter is a structural design pattern that allows objects with incompatible interfaces to collaborate. This pattern
functions as a translator between incompatible components, enabling them to work together seamlessly.

## Applicability

- You need to integrate an existing class whose interface doesn't align with your codebase
- You want to reuse multiple subclasses that lack common functionality without duplicating code across new child classes
- You're working with legacy code, third-party libraries, or components with incompatible interfaces that you cannot
  modify

## Pros

- Separates interface conversion logic from primary business logic (Single Responsibility Principle)
- Allows introduction of new adapter types without affecting existing client code (Open/Closed Principle)
- Enables incompatible components to work together without modifying their source code

## Cons

- Increases overall code complexity by requiring new interfaces and classes
- Sometimes simpler to modify the service class directly rather than introduce an adapter layer

## Don't use when

- You control both interfaces — just align them directly
- The "adaptation" is a one-line wrapper → inline it
- The codebase already has an adapter for this backend → extend or compose with the existing one

## TypeScript Example

```typescript
/**
 * The Target defines the domain-specific interface used by the client code.
 */
class Target {
    public request(): string {
        return 'Target: The default target\'s behavior.';
    }
}

/**
 * The Adaptee contains some useful behavior, but its interface is incompatible
 * with the existing client code. The Adaptee needs some adaptation before the
 * client code can use it.
 */
class Adaptee {
    public specificRequest(): string {
        return '.eetpadA eht fo roivaheb laicepS';
    }
}

/**
 * The Adapter makes the Adaptee's interface compatible with the Target's
 * interface.
 */
class Adapter extends Target {
    private adaptee: Adaptee;

    constructor(adaptee: Adaptee) {
        super();
        this.adaptee = adaptee;
    }

    public request(): string {
        const result = this.adaptee.specificRequest().split('').reverse().join('');
        return `Adapter: (TRANSLATED) ${result}`;
    }
}

/**
 * The client code supports all classes that follow the Target interface.
 */
function clientCode(target: Target) {
    console.log(target.request());
}

console.log('Client: I can work just fine with the Target objects:');
const target = new Target();
clientCode(target);

console.log('');

const adaptee = new Adaptee();
console.log('Client: The Adaptee class has a weird interface. See, I don\'t understand it:');
console.log(`Adaptee: ${adaptee.specificRequest()}`);

console.log('');

console.log('Client: But I can work with it via the Adapter:');
const adapter = new Adapter(adaptee);
clientCode(adapter);
```

## Pairs well with

Bridge (Adapter focuses on making existing things compatible; Bridge designs the abstraction up-front to support
multiple implementations); Strategy (kernel adapters are also strategies — runtime swappable).
