---
name: Template Method
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/template-method/typescript/example
---

# Template Method

## Intent

Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets
subclasses override specific steps of the algorithm without changing its structure.

## Applicability

- Let clients extend only particular steps of an algorithm, not the whole algorithm or its structure
- You have several classes containing nearly identical algorithms with minor variations, reducing the need to modify all
  classes when the algorithm changes
- Pull up common algorithm steps into a superclass while keeping varying implementations in subclasses

## Pros

- Clients can customize only specific parts of a large algorithm, reducing their exposure to unrelated changes
- Duplicate code can be consolidated into the base class
- The algorithm structure remains consistent across all implementations

## Cons

- Some clients may find the provided algorithm skeleton too restrictive
- Subclasses might violate the Liskov Substitution Principle by suppressing default step implementations
- Template methods become increasingly difficult to maintain as the number of steps grows

## Don't use when

- Steps are completely independent → use Strategy instead
- You only have one concrete subclass → just write the algorithm directly
- The "algorithm skeleton" is 3 lines → inheritance is overkill, use a function with callback parameters

## TypeScript Example

```typescript
/**
 * The Abstract Class defines a template method that contains a skeleton of some
 * algorithm, composed of calls to (usually) abstract primitive operations.
 *
 * Concrete subclasses should implement these operations, but leave the template
 * method itself intact.
 */
abstract class AbstractClass {
    /**
     * The template method defines the skeleton of an algorithm.
     */
    public templateMethod(): void {
        this.baseOperation1();
        this.requiredOperations1();
        this.baseOperation2();
        this.hook1();
        this.requiredOperation2();
        this.baseOperation3();
        this.hook2();
    }

    /**
     * These operations already have implementations.
     */
    protected baseOperation1(): void {
        console.log('AbstractClass says: I am doing the bulk of the work');
    }

    protected baseOperation2(): void {
        console.log('AbstractClass says: But I let subclasses override some operations');
    }

    protected baseOperation3(): void {
        console.log('AbstractClass says: But I am doing the bulk of the work anyway');
    }

    /**
     * These operations have to be implemented in subclasses.
     */
    protected abstract requiredOperations1(): void;

    protected abstract requiredOperation2(): void;

    /**
     * These are "hooks." Subclasses may override them, but it's not mandatory
     * since the hooks already have default (but empty) implementation. Hooks
     * provide additional extension points in some crucial places of the
     * algorithm.
     */
    protected hook1(): void { }

    protected hook2(): void { }
}

/**
 * Concrete classes have to implement all abstract operations of the base class.
 */
class ConcreteClass1 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass1 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass1 says: Implemented Operation2');
    }
}

/**
 * Usually, concrete classes override only a fraction of base class' operations.
 */
class ConcreteClass2 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass2 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass2 says: Implemented Operation2');
    }

    protected hook1(): void {
        console.log('ConcreteClass2 says: Overridden Hook1');
    }
}

/**
 * The client code calls the template method to execute the algorithm.
 */
function clientCode(abstractClass: AbstractClass) {
    abstractClass.templateMethod();
}

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass1());
console.log('');

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass2());
```

## Pairs well with

Factory Method (Factory Method is itself a specialization of Template Method); Strategy (Strategy lets you change the
entire algorithm; Template Method only specific steps).
