---
name: State
category: Behavioral
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/state/typescript/example
---

# State

## Intent

State is a behavioral design pattern that lets an object alter its behavior when its internal state changes. It appears
as if the object changed its class.

## Applicability

- An object behaves differently based on its current state and the number of states is substantial with frequently
  changing state-specific code
- A class contains massive conditionals that alter behavior according to field values
- Similar states and transitions cause duplicate code across a condition-based state machine

## Pros

- Organizes state-related code into separate classes, adhering to Single Responsibility Principle
- Introduces new states without modifying existing state classes or context, following Open/Closed Principle
- Eliminates bulky conditional statements from the context class

## Cons

- May be excessive if the state machine has only a few states or rarely changes

## Don't use when

- Only 2-3 states with minor differences → a simple `state: 'a' | 'b' | 'c'` field with switch is clearer
- States never share a common interface meaningfully → it's not really a state machine
- A `useState` hook or store flag does the job → no class needed

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients. It also maintains a
 * reference to an instance of a State subclass, which represents the current
 * state of the Context.
 */
class Context {
    /**
     * @type {State} A reference to the current state of the Context.
     */
    private state: State;

    constructor(state: State) {
        this.transitionTo(state);
    }

    /**
     * The Context allows changing the State object at runtime.
     */
    public transitionTo(state: State): void {
        console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
        this.state = state;
        this.state.setContext(this);
    }

    /**
     * The Context delegates part of its behavior to the current State object.
     */
    public request1(): void {
        this.state.handle1();
    }

    public request2(): void {
        this.state.handle2();
    }
}

/**
 * The base State class declares methods that all Concrete State should
 * implement and also provides a backreference to the Context object, associated
 * with the State. This backreference can be used by States to transition the
 * Context to another State.
 */
abstract class State {
    protected context: Context;

    public setContext(context: Context) {
        this.context = context;
    }

    public abstract handle1(): void;

    public abstract handle2(): void;
}

/**
 * Concrete States implement various behaviors, associated with a state of the
 * Context.
 */
class ConcreteStateA extends State {
    public handle1(): void {
        console.log('ConcreteStateA handles request1.');
        console.log('ConcreteStateA wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateB());
    }

    public handle2(): void {
        console.log('ConcreteStateA handles request2.');
    }
}

class ConcreteStateB extends State {
    public handle1(): void {
        console.log('ConcreteStateB handles request1.');
    }

    public handle2(): void {
        console.log('ConcreteStateB handles request2.');
        console.log('ConcreteStateB wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateA());
    }
}

/**
 * The client code.
 */
const context = new Context(new ConcreteStateA());
context.request1();
context.request2();
```

## Pairs well with

Strategy (Strategy is "do this thing different ways"; State is "I am in different modes"); Memento (snapshot state for
undo); Command (commands trigger state transitions).
