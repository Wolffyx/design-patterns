---
name: Singleton
category: Creational
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/singleton/typescript/example
---

# Singleton

## Intent

Singleton is a creational design pattern that lets you ensure that a class has only one instance, while providing a
global access point to this instance.

## Applicability

- A class should have just one instance available to all clients (e.g. a shared database object across different program
  components)
- You need stricter control over global variables beyond standard practices
- You want to ensure nothing except the class itself can replace a cached instance
- You need to disable all other object creation methods except a special creation method
- Lazy initialization is desirable (object created only when first requested)

## Pros

- Guarantees a class has only a single instance
- Provides a global access point to that instance
- The singleton initializes only when first requested

## Cons

- Violates the Single Responsibility Principle by solving two problems simultaneously
- Can mask poor design when program components have excessive interdependencies
- Requires special handling in multithreaded environments to prevent multiple instantiations
- Difficult to unit test due to private constructors and static method limitations

## Don't use when

- A store slice or DI container would do
- The "singleton" is just stateless utility functions → export functions from a module
- You only need it for convenient access from anywhere → that's a smell, refactor to pass dependencies explicitly
- Tests need to swap implementations → Singleton makes mocking painful

## TypeScript Example

```typescript
/**
 * The Singleton class defines an `instance` getter, that lets clients access
 * the unique singleton instance.
 */
class Singleton {
    static #instance: Singleton;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor() { }

    /**
     * The static getter that controls access to the singleton instance.
     *
     * This implementation allows you to extend the Singleton class while
     * keeping just one instance of each subclass around.
     */
    public static get instance(): Singleton {
        if (!Singleton.#instance) {
            Singleton.#instance = new Singleton();
        }

        return Singleton.#instance;
    }

    /**
     * Finally, any singleton can define some business logic, which can be
     * executed on its instance.
     */
    public someBusinessLogic() {
        // ...
    }
}

/**
 * The client code.
 */
function clientCode() {
    const s1 = Singleton.instance;
    const s2 = Singleton.instance;

    if (s1 === s2) {
        console.log(
            'Singleton works, both variables contain the same instance.'
        );
    } else {
        console.log('Singleton failed, variables contain different instances.');
    }
}

clientCode();
```

## Pairs well with

Registry (Singleton-adjacent — usually preferred over a raw Singleton); Facade (Facades are often instantiated as
singletons by convention).
