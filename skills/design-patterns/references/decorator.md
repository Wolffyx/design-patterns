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

## Python Example

```python
from abc import ABC, abstractmethod


class Component(ABC):
    """The base Component interface defines operations that can be altered by
    decorators."""

    @abstractmethod
    def operation(self) -> str:
        pass


class ConcreteComponent(Component):
    """Concrete Components provide default implementations of the operations."""

    def operation(self) -> str:
        return "ConcreteComponent"


class Decorator(Component):
    """The base Decorator follows the same interface as the other components and
    stores a reference to a wrapped component, delegating all work to it."""

    def __init__(self, component: Component) -> None:
        self._component = component

    def operation(self) -> str:
        return self._component.operation()


class ConcreteDecoratorA(Decorator):
    """Concrete Decorators call the wrapped object and alter its result."""

    def operation(self) -> str:
        return f"ConcreteDecoratorA({self._component.operation()})"


class ConcreteDecoratorB(Decorator):
    """Decorators can execute their behavior before or after the wrapped call."""

    def operation(self) -> str:
        return f"ConcreteDecoratorB({self._component.operation()})"


def client_code(component: Component) -> None:
    """The client works with all objects using the Component interface."""
    print(f"RESULT: {component.operation()}")


if __name__ == "__main__":
    simple = ConcreteComponent()
    print("Client: I've got a simple component:")
    client_code(simple)
    print()

    # Note how decorators can wrap not only simple components but decorators too.
    decorator1 = ConcreteDecoratorA(simple)
    decorator2 = ConcreteDecoratorB(decorator1)
    print("Client: Now I've got a decorated component:")
    client_code(decorator2)
```

## Java Example

```java
// The base Component interface defines operations that can be altered.
interface Component {
    String operation();
}

// Concrete Components provide default implementations of the operations.
class ConcreteComponent implements Component {
    public String operation() {
        return "ConcreteComponent";
    }
}

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
class Decorator implements Component {
    protected Component component;

    public Decorator(Component component) {
        this.component = component;
    }

    public String operation() {
        return component.operation();
    }
}

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA extends Decorator {
    public ConcreteDecoratorA(Component component) {
        super(component);
    }

    public String operation() {
        return "ConcreteDecoratorA(" + super.operation() + ")";
    }
}

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB extends Decorator {
    public ConcreteDecoratorB(Component component) {
        super(component);
    }

    public String operation() {
        return "ConcreteDecoratorB(" + super.operation() + ")";
    }
}

public class Demo {
    // The client works with all objects using the Component interface.
    static void clientCode(Component component) {
        System.out.println("RESULT: " + component.operation());
    }

    public static void main(String[] args) {
        Component simple = new ConcreteComponent();
        System.out.println("Client: I've got a simple component:");
        clientCode(simple);
        System.out.println();

        Component decorator1 = new ConcreteDecoratorA(simple);
        Component decorator2 = new ConcreteDecoratorB(decorator1);
        System.out.println("Client: Now I've got a decorated component:");
        clientCode(decorator2);
    }
}
```

## C# Example

```csharp
using System;

// The base Component interface defines operations that can be altered.
abstract class Component
{
    public abstract string Operation();
}

// Concrete Components provide default implementations of the operations.
class ConcreteComponent : Component
{
    public override string Operation() => "ConcreteComponent";
}

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
abstract class Decorator : Component
{
    protected Component component;

    public Decorator(Component component)
    {
        this.component = component;
    }

    public override string Operation() => component.Operation();
}

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA : Decorator
{
    public ConcreteDecoratorA(Component component) : base(component) { }

    public override string Operation() => $"ConcreteDecoratorA({base.Operation()})";
}

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB : Decorator
{
    public ConcreteDecoratorB(Component component) : base(component) { }

    public override string Operation() => $"ConcreteDecoratorB({base.Operation()})";
}

class Program
{
    // The client works with all objects using the Component interface.
    static void ClientCode(Component component)
    {
        Console.WriteLine($"RESULT: {component.Operation()}");
    }

    static void Main(string[] args)
    {
        Component simple = new ConcreteComponent();
        Console.WriteLine("Client: I've got a simple component:");
        ClientCode(simple);
        Console.WriteLine();

        Component decorator1 = new ConcreteDecoratorA(simple);
        Component decorator2 = new ConcreteDecoratorB(decorator1);
        Console.WriteLine("Client: Now I've got a decorated component:");
        ClientCode(decorator2);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Component defines operations that can be altered by decorators.
type Component interface {
	Operation() string
}

// ConcreteComponent provides a default implementation of the operations.
type ConcreteComponent struct{}

func (c *ConcreteComponent) Operation() string {
	return "ConcreteComponent"
}

// ConcreteDecoratorA wraps a component and alters its result.
type ConcreteDecoratorA struct {
	component Component
}

func (d *ConcreteDecoratorA) Operation() string {
	return fmt.Sprintf("ConcreteDecoratorA(%s)", d.component.Operation())
}

// ConcreteDecoratorB can execute its behavior before or after the wrapped call.
type ConcreteDecoratorB struct {
	component Component
}

func (d *ConcreteDecoratorB) Operation() string {
	return fmt.Sprintf("ConcreteDecoratorB(%s)", d.component.Operation())
}

// clientCode works with all objects using the Component interface.
func clientCode(component Component) {
	fmt.Printf("RESULT: %s\n", component.Operation())
}

func main() {
	simple := &ConcreteComponent{}
	fmt.Println("Client: I've got a simple component:")
	clientCode(simple)
	fmt.Println()

	// Decorators can wrap not only simple components but decorators too.
	decorator1 := &ConcreteDecoratorA{component: simple}
	decorator2 := &ConcreteDecoratorB{component: decorator1}
	fmt.Println("Client: Now I've got a decorated component:")
	clientCode(decorator2)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The base Component interface defines operations that can be altered.
class Component {
public:
    virtual ~Component() = default;
    virtual std::string Operation() const = 0;
};

// Concrete Components provide default implementations of the operations.
class ConcreteComponent : public Component {
public:
    std::string Operation() const override { return "ConcreteComponent"; }
};

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
class Decorator : public Component {
protected:
    std::shared_ptr<Component> component_;

public:
    explicit Decorator(std::shared_ptr<Component> component)
        : component_(std::move(component)) {}

    std::string Operation() const override { return component_->Operation(); }
};

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA : public Decorator {
public:
    using Decorator::Decorator;
    std::string Operation() const override {
        return "ConcreteDecoratorA(" + Decorator::Operation() + ")";
    }
};

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB : public Decorator {
public:
    using Decorator::Decorator;
    std::string Operation() const override {
        return "ConcreteDecoratorB(" + Decorator::Operation() + ")";
    }
};

// The client works with all objects using the Component interface.
void ClientCode(const std::shared_ptr<Component>& component) {
    std::cout << "RESULT: " << component->Operation() << "\n";
}

int main() {
    auto simple = std::make_shared<ConcreteComponent>();
    std::cout << "Client: I've got a simple component:\n";
    ClientCode(simple);
    std::cout << "\n";

    auto decorator1 = std::make_shared<ConcreteDecoratorA>(simple);
    auto decorator2 = std::make_shared<ConcreteDecoratorB>(decorator1);
    std::cout << "Client: Now I've got a decorated component:\n";
    ClientCode(decorator2);
    return 0;
}
```

## Rust Example

```rust
// The base Component trait defines operations that can be altered by decorators.
trait Component {
    fn operation(&self) -> String;
}

// Concrete Components provide default implementations of the operations.
struct ConcreteComponent;

impl Component for ConcreteComponent {
    fn operation(&self) -> String {
        "ConcreteComponent".to_string()
    }
}

// Concrete Decorators wrap a component and alter its result.
struct ConcreteDecoratorA {
    component: Box<dyn Component>,
}

impl Component for ConcreteDecoratorA {
    fn operation(&self) -> String {
        format!("ConcreteDecoratorA({})", self.component.operation())
    }
}

// Decorators can execute their behavior before or after the wrapped call.
struct ConcreteDecoratorB {
    component: Box<dyn Component>,
}

impl Component for ConcreteDecoratorB {
    fn operation(&self) -> String {
        format!("ConcreteDecoratorB({})", self.component.operation())
    }
}

// The client works with all objects using the Component trait.
fn client_code(component: &dyn Component) {
    println!("RESULT: {}", component.operation());
}

fn main() {
    let simple = ConcreteComponent;
    println!("Client: I've got a simple component:");
    client_code(&simple);
    println!();

    // Decorators can wrap not only simple components but decorators too.
    let decorator1 = ConcreteDecoratorA { component: Box::new(ConcreteComponent) };
    let decorator2 = ConcreteDecoratorB { component: Box::new(decorator1) };
    println!("Client: Now I've got a decorated component:");
    client_code(&decorator2);
}
```

## Pairs well with

Strategy (decorate a strategy with cross-cutting behavior); Composite (decorators have similar tree-of-wrappers shape).
