---
name: Strategy
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/strategy/typescript/example
---

# Strategy

## Intent

Strategy is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate
class, and make their objects interchangeable.

## Applicability

- You need different variations of an algorithm within an object and want runtime switching between them
- You have similar classes differing only in how they execute specific behaviors
- You want to isolate business logic from algorithm implementation details that may be less critical
- Your class contains massive conditionals selecting between algorithm variants
- You want to enable clients to select appropriate algorithms based on their specific needs

## Pros

- Swap algorithms at runtime without modifying the context object
- Isolate algorithm implementation from the code that uses it
- Replace inheritance hierarchies with composition-based design
- Adhere to the Open/Closed Principle by introducing new strategies without changing existing code

## Cons

- Adds unnecessary complexity for programs with few algorithms that rarely change
- Clients must understand strategy differences to select the appropriate one
- Modern functional programming languages reduce the pattern's value through anonymous functions (a function reference
  is a strategy)

## Don't use when

- You only have one algorithm and no plan for a second → just write the function
- The "strategies" are 1-line functions → pass a function instead of building a class hierarchy
- A simple `switch` over 2-3 cases is clearer than 3 strategy classes

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients.
 */
class Context {
    /**
     * @type {Strategy} The Context maintains a reference to one of the Strategy
     * objects. The Context does not know the concrete class of a strategy. It
     * should work with all strategies via the Strategy interface.
     */
    private strategy: Strategy;

    /**
     * Usually, the Context accepts a strategy through the constructor, but also
     * provides a setter to change it at runtime.
     */
    constructor(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * Usually, the Context allows replacing a Strategy object at runtime.
     */
    public setStrategy(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * The Context delegates some work to the Strategy object instead of
     * implementing multiple versions of the algorithm on its own.
     */
    public doSomeBusinessLogic(): void {
        // ...

        console.log('Context: Sorting data using the strategy (not sure how it\'ll do it)');
        const result = this.strategy.doAlgorithm(['a', 'b', 'c', 'd', 'e']);
        console.log(result.join(','));

        // ...
    }
}

/**
 * The Strategy interface declares operations common to all supported versions
 * of some algorithm.
 */
interface Strategy {
    doAlgorithm(data: string[]): string[];
}

/**
 * Concrete Strategies implement the algorithm while following the base Strategy
 * interface. The interface makes them interchangeable in the Context.
 */
class ConcreteStrategyA implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.sort();
    }
}

class ConcreteStrategyB implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.reverse();
    }
}

/**
 * The client code picks a concrete strategy and passes it to the context.
 */
const context = new Context(new ConcreteStrategyA());
console.log('Client: Strategy is set to normal sorting.');
context.doSomeBusinessLogic();

console.log('');

console.log('Client: Strategy is set to reverse sorting.');
context.setStrategy(new ConcreteStrategyB());
context.doSomeBusinessLogic();
```

## Pairs well with

Factory Method (factory picks the concrete strategy); State (State picks Strategy based on internal mode); Adapter (
kernel/renderer strategies are also adapters over external libraries).
