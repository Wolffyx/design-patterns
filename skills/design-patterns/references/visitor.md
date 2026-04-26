---
name: Visitor
category: Behavioral
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/visitor/typescript/example
---

# Visitor

## Intent

Visitor is a behavioral design pattern that lets you separate algorithms from the objects on which they operate. This
enables adding new behaviors to object structures without modifying the classes themselves.

## Applicability

- You need to perform operations on all elements of a complex object structure (such as object trees)
- You want to isolate auxiliary behaviors from primary business logic in main classes
- A behavior applies only to certain classes in a hierarchy, not all of them
- You want to avoid modifying existing classes while introducing new functionality

## Pros

- Follows the Open/Closed Principle by enabling new behaviors without changing element classes
- Supports the Single Responsibility Principle by consolidating related behavior variations
- Visitors can accumulate useful information while traversing complex structures

## Cons

- Requires updating all visitor implementations when element classes are added or removed
- Visitors may lack access to private fields and methods of the elements they process

## Don't use when

- The hierarchy has only 2-3 element classes → use a switch or polymorphic method
- You'd be adding a Visitor for a single operation → just add the method to the class
- Element classes change frequently → Visitor maintenance becomes painful
- A discriminated union with `switch` over `kind` field is clearer

## TypeScript Example

```typescript
/**
 * The Component interface declares an `accept` method that should take the base
 * visitor interface as an argument.
 */
interface Component {
    accept(visitor: Visitor): void;
}

/**
 * Each Concrete Component must implement the `accept` method in such a way that
 * it calls the visitor's method corresponding to the component's class.
 */
class ConcreteComponentA implements Component {
    /**
     * Note that we're calling `visitConcreteComponentA`, which matches the
     * current class name. This way we let the visitor know the class of the
     * component it works with.
     */
    public accept(visitor: Visitor): void {
        visitor.visitConcreteComponentA(this);
    }

    /**
     * Concrete Components may have special methods that don't exist in their
     * base class or interface. The Visitor is still able to use these methods
     * since it's aware of the component's concrete class.
     */
    public exclusiveMethodOfConcreteComponentA(): string {
        return 'A';
    }
}

class ConcreteComponentB implements Component {
    /**
     * Same here: visitConcreteComponentB => ConcreteComponentB
     */
    public accept(visitor: Visitor): void {
        visitor.visitConcreteComponentB(this);
    }

    public specialMethodOfConcreteComponentB(): string {
        return 'B';
    }
}

/**
 * The Visitor Interface declares a set of visiting methods that correspond to
 * component classes. The signature of a visiting method allows the visitor to
 * identify the exact class of the component that it's dealing with.
 */
interface Visitor {
    visitConcreteComponentA(element: ConcreteComponentA): void;

    visitConcreteComponentB(element: ConcreteComponentB): void;
}

/**
 * Concrete Visitors implement several versions of the same algorithm, which can
 * work with all concrete component classes.
 */
class ConcreteVisitor1 implements Visitor {
    public visitConcreteComponentA(element: ConcreteComponentA): void {
        console.log(`${element.exclusiveMethodOfConcreteComponentA()} + ConcreteVisitor1`);
    }

    public visitConcreteComponentB(element: ConcreteComponentB): void {
        console.log(`${element.specialMethodOfConcreteComponentB()} + ConcreteVisitor1`);
    }
}

class ConcreteVisitor2 implements Visitor {
    public visitConcreteComponentA(element: ConcreteComponentA): void {
        console.log(`${element.exclusiveMethodOfConcreteComponentA()} + ConcreteVisitor2`);
    }

    public visitConcreteComponentB(element: ConcreteComponentB): void {
        console.log(`${element.specialMethodOfConcreteComponentB()} + ConcreteVisitor2`);
    }
}

/**
 * The client code can run visitor operations over any set of elements without
 * figuring out their concrete classes. The accept operation directs a call to
 * the appropriate operation in the visitor object.
 */
function clientCode(components: Component[], visitor: Visitor) {
    for (const component of components) {
        component.accept(visitor);
    }
}

const components = [
    new ConcreteComponentA(),
    new ConcreteComponentB(),
];

console.log('The client code works with all visitors via the base Visitor interface:');
const visitor1 = new ConcreteVisitor1();
clientCode(components, visitor1);
console.log('');

console.log('It allows the same client code to work with different types of visitors:');
const visitor2 = new ConcreteVisitor2();
clientCode(components, visitor2);
```

## Pairs well with

Composite (Visitor walks Composite trees — the canonical pairing); Iterator (Visitor uses an Iterator to traverse).
