---
name: Chain of Responsibility
category: Behavioral
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/chain-of-responsibility/typescript/example
---

# Chain of Responsibility

## Intent

A behavioral design pattern that lets you pass requests along a chain of handlers. Upon receiving a request, each
handler decides either to process the request or to pass it to the next handler.

## Applicability

- Your program must handle various request types sequentially, but exact types and order are unknown beforehand
- Multiple handlers must execute in a specific sequence
- The set of handlers and their arrangement may change during runtime

## Pros

- You can control the sequence in which requests are processed
- Decouples operation-invoking classes from operation-performing classes, following Single Responsibility
- New handlers can be added without modifying existing client code (Open/Closed Principle)

## Cons

- Some requests may remain unhandled if no handler in the chain processes them

## Don't use when

- Only one handler exists → call it directly
- All handlers always run regardless of result → use a flat list and `forEach`
- The chain is fixed at compile time and never reordered → just hardcode the call sequence

## TypeScript Example

```typescript
/**
 * The Handler interface declares a method for building the chain of handlers.
 * It also declares a method for executing a request.
 */
interface Handler<Request = string, Result = string> {
    setNext(handler: Handler<Request, Result>): Handler<Request, Result>;

    handle(request: Request): Result;
}

/**
 * The default chaining behavior can be implemented inside a base handler class.
 */
abstract class AbstractHandler implements Handler
{
    private nextHandler: Handler;

    public setNext(handler: Handler): Handler {
        this.nextHandler = handler;
        // Returning a handler from here will let us link handlers in a
        // convenient way like this:
        // monkey.setNext(squirrel).setNext(dog);
        return handler;
    }

    public handle(request: string): string {
        if (this.nextHandler) {
            return this.nextHandler.handle(request);
        }

        return null;
    }
}

/**
 * All Concrete Handlers either handle a request or pass it to the next handler
 * in the chain.
 */
class MonkeyHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'Banana') {
            return `Monkey: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

class SquirrelHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'Nut') {
            return `Squirrel: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

class DogHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'MeatBall') {
            return `Dog: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

/**
 * The client code is usually suited to work with a single handler. In most
 * cases, it is not even aware that the handler is part of a chain.
 */
function clientCode(handler: Handler) {
    const foods = ['Nut', 'Banana', 'Cup of coffee'];

    for (const food of foods) {
        console.log(`Client: Who wants a ${food}?`);

        const result = handler.handle(food);
        if (result) {
            console.log(`  ${result}`);
        } else {
            console.log(`  ${food} was left untouched.`);
        }
    }
}

/**
 * The other part of the client code constructs the actual chain.
 */
const monkey = new MonkeyHandler();
const squirrel = new SquirrelHandler();
const dog = new DogHandler();

monkey.setNext(squirrel).setNext(dog);

console.log('Chain: Monkey > Squirrel > Dog\n');
clientCode(monkey);
console.log('');

console.log('Subchain: Squirrel > Dog\n');
clientCode(squirrel);
```

## Pairs well with

Composite (commonly used together: handlers walk a Composite tree); Command (commands flow through a chain of middleware
handlers); Decorator (both stack behaviors, but Chain stops at first match).
