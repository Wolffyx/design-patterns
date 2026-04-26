---
name: Decorator
category: Structural
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/decorator/typescript/example
---

# Decorator

## Intent

Decorator is a structural design pattern that lets you attach new behaviors to objects by placing these objects inside
special wrapper objects that contain the behaviors.

## Applicability

- Assign extra behaviors to objects at runtime without breaking existing code
- Structure business logic into composable layers that can be combined in various ways
- Extend an object's behavior when inheritance is awkward or impossible (e.g., with final classes)
- Avoid combinatorial explosion from creating many subclass combinations

## Pros

- Extend object behavior without creating new subclasses
- Add or remove responsibilities dynamically at runtime
- Combine multiple behaviors by wrapping objects in multiple decorators
- Apply Single Responsibility Principle by dividing monolithic classes into smaller ones

## Cons

- Difficult to remove a specific wrapper from a stack of decorators
- Hard to implement decorators whose behavior doesn't depend on decorator order
- Initial configuration code for layering can become unwieldy

## Don't use when

- Behavior is fixed and known at compile time → just use inheritance or composition
- Higher-order functions or middleware patterns already solve it (e.g. Redux/Zustand middleware)
- Only one wrapper layer is needed → just call the wrapper function directly

## TypeScript Example

```typescript
/**
 * The base Component interface defines operations that can be altered by
 * decorators.
 */
interface Component {
    operation(): string;
}

/**
 * Concrete Components provide default implementations of the operations. There
 * might be several variations of these classes.
 */
class ConcreteComponent implements Component {
    public operation(): string {
        return 'ConcreteComponent';
    }
}

/**
 * The base Decorator class follows the same interface as the other components.
 * The primary purpose of this class is to define the wrapping interface for all
 * concrete decorators. The default implementation of the wrapping code might
 * include a field for storing a wrapped component and the means to initialize
 * it.
 */
class Decorator implements Component {
    protected component: Component;

    constructor(component: Component) {
        this.component = component;
    }

    /**
     * The Decorator delegates all work to the wrapped component.
     */
    public operation(): string {
        return this.component.operation();
    }
}

/**
 * Concrete Decorators call the wrapped object and alter its result in some way.
 */
class ConcreteDecoratorA extends Decorator {
    /**
     * Decorators may call parent implementation of the operation, instead of
     * calling the wrapped object directly. This approach simplifies extension
     * of decorator classes.
     */
    public operation(): string {
        return `ConcreteDecoratorA(${super.operation()})`;
    }
}

/**
 * Decorators can execute their behavior either before or after the call to a
 * wrapped object.
 */
class ConcreteDecoratorB extends Decorator {
    public operation(): string {
        return `ConcreteDecoratorB(${super.operation()})`;
    }
}

/**
 * The client code works with all objects using the Component interface. This
 * way it can stay independent of the concrete classes of components it works
 * with.
 */
function clientCode(component: Component) {
    console.log(`RESULT: ${component.operation()}`);
}

const simple = new ConcreteComponent();
console.log('Client: I\'ve got a simple component:');
clientCode(simple);
console.log('');

/**
 * Note how decorators can wrap not only simple components but the other
 * decorators as well.
 */
const decorator1 = new ConcreteDecoratorA(simple);
const decorator2 = new ConcreteDecoratorB(decorator1);
console.log('Client: Now I\'ve got a decorated component:');
clientCode(decorator2);
```

## Pairs well with

Strategy (decorate a strategy with cross-cutting behavior); Composite (decorators have similar tree-of-wrappers shape).
