---
name: Factory Method
category: Creational
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/factory-method/typescript/example
---

# Factory Method

## Intent

Factory Method is a creational design pattern that provides an interface for creating objects in a superclass, but
allows subclasses to alter the type of objects that will be created.

## Applicability

- Use when your code must work with various object types whose exact classes aren't known beforehand
- Use when extending a library or framework and you want others to customize internal components through inheritance
- Use when you need to conserve system resources by reusing existing objects rather than constantly creating new
  instances
- Use when product construction logic should be decoupled from the code that actually uses products
- Use to reduce tight coupling between creators and the concrete product classes they instantiate

## Pros

- Eliminates direct dependencies between the creator and concrete product implementations
- Centralizes product creation code in one location, improving maintainability
- Enables introducing new product types without modifying existing client code
- Follows the Single Responsibility and Open/Closed principles

## Cons

- Increases code complexity by requiring numerous new subclasses to implement the pattern properly
- Works best when applied to existing class hierarchies rather than as an afterthought

## Don't use when

- You only have one concrete product type and no realistic plan for a second → just call `new`
- The "factory" would be a one-liner that returns `new Foo()` with no logic → premature
- The codebase already has a factory for this domain → extend it, do not create a parallel one

## TypeScript Example

```typescript
/**
 * The Creator class declares the factory method that is supposed to return an
 * object of a Product class. The Creator's subclasses usually provide the
 * implementation of this method.
 */
abstract class Creator {
    /**
     * Note that the Creator may also provide some default implementation of the
     * factory method.
     */
    public abstract factoryMethod(): Product;

    /**
     * Also note that, despite its name, the Creator's primary responsibility is
     * not creating products. Usually, it contains some core business logic that
     * relies on Product objects, returned by the factory method. Subclasses can
     * indirectly change that business logic by overriding the factory method
     * and returning a different type of product from it.
     */
    public someOperation(): string {
        // Call the factory method to create a Product object.
        const product = this.factoryMethod();
        // Now, use the product.
        return `Creator: The same creator's code has just worked with ${product.operation()}`;
    }
}

/**
 * Concrete Creators override the factory method in order to change the
 * resulting product's type.
 */
class ConcreteCreator1 extends Creator {
    /**
     * Note that the signature of the method still uses the abstract product
     * type, even though the concrete product is actually returned from the
     * method. This way the Creator can stay independent of concrete product
     * classes.
     */
    public factoryMethod(): Product {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct2();
    }
}

/**
 * The Product interface declares the operations that all concrete products must
 * implement.
 */
interface Product {
    operation(): string;
}

/**
 * Concrete Products provide various implementations of the Product interface.
 */
class ConcreteProduct1 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct1}';
    }
}

class ConcreteProduct2 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct2}';
    }
}

/**
 * The client code works with an instance of a concrete creator, albeit through
 * its base interface. As long as the client keeps working with the creator via
 * the base interface, you can pass it any creator's subclass.
 */
function clientCode(creator: Creator) {
    // ...
    console.log('Client: I\'m not aware of the creator\'s class, but it still works.');
    console.log(creator.someOperation());
    // ...
}

/**
 * The Application picks a creator's type depending on the configuration or
 * environment.
 */
console.log('App: Launched with the ConcreteCreator1.');
clientCode(new ConcreteCreator1());
console.log('');

console.log('App: Launched with the ConcreteCreator2.');
clientCode(new ConcreteCreator2());
```

## Pairs well with

Often combined with Strategy (factory picks the concrete strategy) and Abstract Factory (when families of related
products are needed instead of a single one).
