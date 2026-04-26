---
name: Facade
category: Structural
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/facade/typescript/example
---

# Facade

## Intent

Facade is a structural design pattern that provides a simplified interface to a library, a framework, or any other
complex set of classes.

## Applicability

- You need a straightforward interface to a complex subsystem, shielding clients from implementation details
- A subsystem grows increasingly complex over time, requiring more configuration and boilerplate code
- You want to organize a subsystem into distinct layers with clear entry points for each level
- You need to reduce coupling between multiple subsystems by controlling their interactions

## Pros

- Isolates client code from subsystem complexity, improving maintainability
- Simplifies client code by hiding intricate interactions with multiple objects
- Allows changes to the subsystem without affecting client implementations

## Cons

- A facade can become a "god object" coupled to all classes in an application if not properly managed
- Overuse may hide important subsystem functionality clients might need

## Don't use when

- The subsystem already has a simple public API → no facade needed
- The facade would just re-export everything → that's a barrel file, not a facade
- You'd be creating a facade with one method that calls one underlying method → premature

## TypeScript Example

```typescript
/**
 * The Facade class provides a simple interface to the complex logic of one or
 * several subsystems. The Facade delegates the client requests to the
 * appropriate objects within the subsystem. The Facade is also responsible for
 * managing their lifecycle. All of this shields the client from the undesired
 * complexity of the subsystem.
 */
class Facade {
    protected subsystem1: Subsystem1;

    protected subsystem2: Subsystem2;

    /**
     * Depending on your application's needs, you can provide the Facade with
     * existing subsystem objects or force the Facade to create them on its own.
     */
    constructor(subsystem1?: Subsystem1, subsystem2?: Subsystem2) {
        this.subsystem1 = subsystem1 || new Subsystem1();
        this.subsystem2 = subsystem2 || new Subsystem2();
    }

    /**
     * The Facade's methods are convenient shortcuts to the sophisticated
     * functionality of the subsystems. However, clients get only to a fraction
     * of a subsystem's capabilities.
     */
    public operation(): string {
        let result = 'Facade initializes subsystems:\n';
        result += this.subsystem1.operation1();
        result += this.subsystem2.operation1();
        result += 'Facade orders subsystems to perform the action:\n';
        result += this.subsystem1.operationN();
        result += this.subsystem2.operationZ();

        return result;
    }
}

/**
 * The Subsystem can accept requests either from the facade or client directly.
 * In any case, to the Subsystem, the Facade is yet another client, and it's not
 * a part of the Subsystem.
 */
class Subsystem1 {
    public operation1(): string {
        return 'Subsystem1: Ready!\n';
    }

    // ...

    public operationN(): string {
        return 'Subsystem1: Go!\n';
    }
}

/**
 * Some facades can work with multiple subsystems at the same time.
 */
class Subsystem2 {
    public operation1(): string {
        return 'Subsystem2: Get ready!\n';
    }

    // ...

    public operationZ(): string {
        return 'Subsystem2: Fire!';
    }
}

/**
 * The client code works with complex subsystems through a simple interface
 * provided by the Facade. When a facade manages the lifecycle of the subsystem,
 * the client might not even know about the existence of the subsystem. This
 * approach lets you keep the complexity under control.
 */
function clientCode(facade: Facade) {
    // ...

    console.log(facade.operation());

    // ...
}

/**
 * The client code may have some of the subsystem's objects already created. In
 * this case, it might be worthwhile to initialize the Facade with these objects
 * instead of letting the Facade create new instances.
 */
const subsystem1 = new Subsystem1();
const subsystem2 = new Subsystem2();
const facade = new Facade(subsystem1, subsystem2);
clientCode(facade);
```

## Pairs well with

Adapter (facades often wrap multiple adapters); Singleton (facades are commonly accessed as singletons by convention);
Mediator (Mediator coordinates peers, Facade provides a one-way simplified interface).
