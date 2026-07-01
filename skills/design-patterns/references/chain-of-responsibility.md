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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional


class Handler(ABC):
    """Declares methods for building the chain and executing a request."""

    @abstractmethod
    def set_next(self, handler: "Handler") -> "Handler":
        pass

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        pass


class AbstractHandler(Handler):
    """Implements the default chaining behavior."""

    _next_handler: Handler = None

    def set_next(self, handler: Handler) -> Handler:
        self._next_handler = handler
        # Returning the handler lets us link calls like:
        # monkey.set_next(squirrel).set_next(dog)
        return handler

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        if self._next_handler:
            return self._next_handler.handle(request)
        return None


class MonkeyHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "Banana":
            return f"Monkey: I'll eat the {request}."
        return super().handle(request)


class SquirrelHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "Nut":
            return f"Squirrel: I'll eat the {request}."
        return super().handle(request)


class DogHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "MeatBall":
            return f"Dog: I'll eat the {request}."
        return super().handle(request)


def client_code(handler: Handler) -> None:
    for food in ["Nut", "Banana", "Cup of coffee"]:
        print(f"Client: Who wants a {food}?")
        result = handler.handle(food)
        if result:
            print(f"  {result}")
        else:
            print(f"  {food} was left untouched.")


if __name__ == "__main__":
    monkey = MonkeyHandler()
    squirrel = SquirrelHandler()
    dog = DogHandler()
    monkey.set_next(squirrel).set_next(dog)

    print("Chain: Monkey > Squirrel > Dog\n")
    client_code(monkey)
    print("")
    print("Subchain: Squirrel > Dog\n")
    client_code(squirrel)
```

## Java Example

```java
// The Handler interface declares chaining and request-handling methods.
interface Handler {
    Handler setNext(Handler handler);

    String handle(String request);
}

// The default chaining behavior lives in a base handler class.
abstract class AbstractHandler implements Handler {
    private Handler nextHandler;

    public Handler setNext(Handler handler) {
        this.nextHandler = handler;
        // Returning the handler lets us link calls like:
        // monkey.setNext(squirrel).setNext(dog);
        return handler;
    }

    public String handle(String request) {
        if (nextHandler != null) {
            return nextHandler.handle(request);
        }
        return null;
    }
}

class MonkeyHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("Banana")) {
            return "Monkey: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

class SquirrelHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("Nut")) {
            return "Squirrel: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

class DogHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("MeatBall")) {
            return "Dog: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

public class Demo {
    static void clientCode(Handler handler) {
        for (String food : new String[] {"Nut", "Banana", "Cup of coffee"}) {
            System.out.println("Client: Who wants a " + food + "?");
            String result = handler.handle(food);
            if (result != null) {
                System.out.println("  " + result);
            } else {
                System.out.println("  " + food + " was left untouched.");
            }
        }
    }

    public static void main(String[] args) {
        MonkeyHandler monkey = new MonkeyHandler();
        SquirrelHandler squirrel = new SquirrelHandler();
        DogHandler dog = new DogHandler();
        monkey.setNext(squirrel).setNext(dog);

        System.out.println("Chain: Monkey > Squirrel > Dog\n");
        clientCode(monkey);
        System.out.println("");
        System.out.println("Subchain: Squirrel > Dog\n");
        clientCode(squirrel);
    }
}
```

## C# Example

```csharp
using System;

// The Handler interface declares chaining and request-handling methods.
interface IHandler
{
    IHandler SetNext(IHandler handler);

    string Handle(string request);
}

// The default chaining behavior lives in a base handler class.
abstract class AbstractHandler : IHandler
{
    private IHandler _nextHandler;

    public IHandler SetNext(IHandler handler)
    {
        _nextHandler = handler;
        // Returning the handler lets us link calls like:
        // monkey.SetNext(squirrel).SetNext(dog);
        return handler;
    }

    public virtual string Handle(string request) => _nextHandler?.Handle(request);
}

class MonkeyHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "Banana" ? $"Monkey: I'll eat the {request}." : base.Handle(request);
}

class SquirrelHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "Nut" ? $"Squirrel: I'll eat the {request}." : base.Handle(request);
}

class DogHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "MeatBall" ? $"Dog: I'll eat the {request}." : base.Handle(request);
}

class Program
{
    static void ClientCode(IHandler handler)
    {
        foreach (var food in new[] { "Nut", "Banana", "Cup of coffee" })
        {
            Console.WriteLine($"Client: Who wants a {food}?");
            var result = handler.Handle(food);
            if (result != null)
                Console.WriteLine($"  {result}");
            else
                Console.WriteLine($"  {food} was left untouched.");
        }
    }

    static void Main()
    {
        var monkey = new MonkeyHandler();
        var squirrel = new SquirrelHandler();
        var dog = new DogHandler();
        monkey.SetNext(squirrel).SetNext(dog);

        Console.WriteLine("Chain: Monkey > Squirrel > Dog\n");
        ClientCode(monkey);
        Console.WriteLine("");
        Console.WriteLine("Subchain: Squirrel > Dog\n");
        ClientCode(squirrel);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Handler declares chaining and request-handling methods.
type Handler interface {
	SetNext(handler Handler) Handler
	Handle(request string) string
}

// BaseHandler implements the default chaining behavior; concrete handlers embed
// it and provide a next() so the base can forward requests along the chain.
type BaseHandler struct {
	next Handler
}

func (h *BaseHandler) SetNext(handler Handler) Handler {
	h.next = handler
	// Returning the handler lets us link calls like:
	// monkey.SetNext(squirrel).SetNext(dog)
	return handler
}

func (h *BaseHandler) Handle(request string) string {
	if h.next != nil {
		return h.next.Handle(request)
	}
	return ""
}

type MonkeyHandler struct{ BaseHandler }

func (h *MonkeyHandler) Handle(request string) string {
	if request == "Banana" {
		return fmt.Sprintf("Monkey: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

type SquirrelHandler struct{ BaseHandler }

func (h *SquirrelHandler) Handle(request string) string {
	if request == "Nut" {
		return fmt.Sprintf("Squirrel: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

type DogHandler struct{ BaseHandler }

func (h *DogHandler) Handle(request string) string {
	if request == "MeatBall" {
		return fmt.Sprintf("Dog: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

func clientCode(handler Handler) {
	for _, food := range []string{"Nut", "Banana", "Cup of coffee"} {
		fmt.Printf("Client: Who wants a %s?\n", food)
		if result := handler.Handle(food); result != "" {
			fmt.Printf("  %s\n", result)
		} else {
			fmt.Printf("  %s was left untouched.\n", food)
		}
	}
}

func main() {
	monkey := &MonkeyHandler{}
	squirrel := &SquirrelHandler{}
	dog := &DogHandler{}
	monkey.SetNext(squirrel).SetNext(dog)

	fmt.Print("Chain: Monkey > Squirrel > Dog\n\n")
	clientCode(monkey)
	fmt.Println("")
	fmt.Print("Subchain: Squirrel > Dog\n\n")
	clientCode(squirrel)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The Handler interface declares chaining and request-handling methods.
class Handler {
public:
    virtual ~Handler() = default;
    virtual Handler* SetNext(Handler* handler) = 0;
    virtual std::string Handle(const std::string& request) = 0;
};

// The default chaining behavior lives in a base handler class.
class AbstractHandler : public Handler {
    Handler* next_handler_ = nullptr;

public:
    Handler* SetNext(Handler* handler) override {
        next_handler_ = handler;
        // Returning the handler lets us link calls like:
        // monkey->SetNext(squirrel)->SetNext(dog);
        return handler;
    }

    std::string Handle(const std::string& request) override {
        if (next_handler_) return next_handler_->Handle(request);
        return {};
    }
};

class MonkeyHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "Banana") return "Monkey: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

class SquirrelHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "Nut") return "Squirrel: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

class DogHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "MeatBall") return "Dog: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

void ClientCode(Handler& handler) {
    for (const std::string& food : {"Nut", "Banana", "Cup of coffee"}) {
        std::cout << "Client: Who wants a " << food << "?\n";
        std::string result = handler.Handle(food);
        if (!result.empty())
            std::cout << "  " << result << "\n";
        else
            std::cout << "  " << food << " was left untouched.\n";
    }
}

int main() {
    auto monkey = std::make_unique<MonkeyHandler>();
    auto squirrel = std::make_unique<SquirrelHandler>();
    auto dog = std::make_unique<DogHandler>();
    monkey->SetNext(squirrel.get())->SetNext(dog.get());

    std::cout << "Chain: Monkey > Squirrel > Dog\n\n";
    ClientCode(*monkey);
    std::cout << "\n";
    std::cout << "Subchain: Squirrel > Dog\n\n";
    ClientCode(*squirrel);
    return 0;
}
```

## Rust Example

```rust
// The Handler trait declares chaining and request-handling methods. The default
// handle() forwards to the next handler, mirroring the base-class behavior.
trait Handler {
    fn set_next(&mut self, next: Box<dyn Handler>);
    fn next(&self) -> Option<&dyn Handler>;

    fn handle(&self, request: &str) -> Option<String> {
        self.next().and_then(|h| h.handle(request))
    }
}

// A small macro-free helper: each concrete handler stores its successor.
#[derive(Default)]
struct Chained {
    next: Option<Box<dyn Handler>>,
}

struct MonkeyHandler {
    base: Chained,
}
struct SquirrelHandler {
    base: Chained,
}
struct DogHandler {
    base: Chained,
}

macro_rules! impl_link {
    ($ty:ty) => {
        fn set_next(&mut self, next: Box<dyn Handler>) {
            self.base.next = Some(next);
        }
        fn next(&self) -> Option<&dyn Handler> {
            self.base.next.as_deref()
        }
    };
}

impl Handler for MonkeyHandler {
    impl_link!(MonkeyHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "Banana" {
            return Some(format!("Monkey: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

impl Handler for SquirrelHandler {
    impl_link!(SquirrelHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "Nut" {
            return Some(format!("Squirrel: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

impl Handler for DogHandler {
    impl_link!(DogHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "MeatBall" {
            return Some(format!("Dog: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

fn client_code(handler: &dyn Handler) {
    for food in ["Nut", "Banana", "Cup of coffee"] {
        println!("Client: Who wants a {}?", food);
        match handler.handle(food) {
            Some(result) => println!("  {}", result),
            None => println!("  {} was left untouched.", food),
        }
    }
}

fn main() {
    let mut dog = DogHandler { base: Chained::default() };
    let _ = &mut dog;
    let mut squirrel = SquirrelHandler { base: Chained::default() };
    squirrel.set_next(Box::new(dog));
    let mut monkey = MonkeyHandler { base: Chained::default() };
    monkey.set_next(Box::new(squirrel));

    println!("Chain: Monkey > Squirrel > Dog\n");
    client_code(&monkey);
}
```

## Pairs well with

Composite (commonly used together: handlers walk a Composite tree); Command (commands flow through a chain of middleware
handlers); Decorator (both stack behaviors, but Chain stops at first match).
