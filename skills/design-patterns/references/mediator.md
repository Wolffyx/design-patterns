---
name: Mediator
category: Behavioral
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/mediator/typescript/example
---

# Mediator

## Intent

Mediator is a behavioral design pattern that lets you reduce chaotic dependencies between objects. It accomplishes this
by restricting direct communication and forcing collaboration through a mediator object instead.

## Applicability

- Classes are tightly coupled to many others, making changes difficult without affecting the entire system
- You need to reuse components in different programs but they're overly dependent on other classes
- You're creating numerous component subclasses just to handle different interaction contexts

## Pros

- Extracts relationships between classes into a separate mediator, making the system easier to understand and maintain
- Allows introducing new mediators without modifying actual components
- Reduces coupling between program components, improving modularity
- Enables easier reuse of individual components across different applications

## Cons

- Over time, a mediator can evolve into a "God Object" that becomes overly complex and difficult to manage

## Don't use when

- Two components only talk to each other → just let them
- You'd be introducing a mediator with one method that calls one component → premature
- Observer or event bus already does what you need → those are simpler

## TypeScript Example

```typescript
/**
 * The Mediator interface declares a method used by components to notify the
 * mediator about various events. The Mediator may react to these events and
 * pass the execution to other components.
 */
interface Mediator {
    notify(sender: object, event: string): void;
}

/**
 * Concrete Mediators implement cooperative behavior by coordinating several
 * components.
 */
class ConcreteMediator implements Mediator {
    private component1: Component1;

    private component2: Component2;

    constructor(c1: Component1, c2: Component2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }

    public notify(sender: object, event: string): void {
        if (event === 'A') {
            console.log('Mediator reacts on A and triggers following operations:');
            this.component2.doC();
        }

        if (event === 'D') {
            console.log('Mediator reacts on D and triggers following operations:');
            this.component1.doB();
            this.component2.doC();
        }
    }
}

/**
 * The Base Component provides the basic functionality of storing a mediator's
 * instance inside component objects.
 */
class BaseComponent {
    protected mediator: Mediator;

    constructor(mediator?: Mediator) {
        this.mediator = mediator!;
    }

    public setMediator(mediator: Mediator): void {
        this.mediator = mediator;
    }
}

/**
 * Concrete Components implement various functionality. They don't depend on
 * other components. They also don't depend on any concrete mediator classes.
 */
class Component1 extends BaseComponent {
    public doA(): void {
        console.log('Component 1 does A.');
        this.mediator.notify(this, 'A');
    }

    public doB(): void {
        console.log('Component 1 does B.');
        this.mediator.notify(this, 'B');
    }
}

class Component2 extends BaseComponent {
    public doC(): void {
        console.log('Component 2 does C.');
        this.mediator.notify(this, 'C');
    }

    public doD(): void {
        console.log('Component 2 does D.');
        this.mediator.notify(this, 'D');
    }
}

/**
 * The client code.
 */
const c1 = new Component1();
const c2 = new Component2();
const mediator = new ConcreteMediator(c1, c2);

console.log('Client triggers operation A.');
c1.doA();

console.log('');
console.log('Client triggers operation D.');
c2.doD();
```

## Pairs well with

Facade (both simplify interaction; Facade is one-way, Mediator is bidirectional); Observer (Mediator often dispatches
via Observer to components).
