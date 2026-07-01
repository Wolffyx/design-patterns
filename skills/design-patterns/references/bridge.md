---
name: Bridge
category: Structural
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/bridge/typescript/example
---

# Bridge

## Intent

Bridge is a structural design pattern that lets you split a large class or a set of closely related classes into two
separate hierarchies—abstraction and implementation—which can be developed independently of each other.

## Applicability

- You have a monolithic class with multiple functional variants that need independent development and modification
- You want to extend a class across several independent dimensions to avoid exponential growth of subclasses
- You need flexibility to swap implementations at runtime without affecting client code

## Pros

- Enables creating platform-independent classes and applications
- Client code interacts with high-level abstractions without exposure to underlying platform details
- Supports the Open/Closed Principle by allowing new abstractions and implementations to be introduced independently
- Follows Single Responsibility Principle by separating high-level logic from platform-specific details

## Cons

- May unnecessarily complicate code when applied to highly cohesive classes that don't require separation

## Don't use when

- You only have one dimension of variation → use Strategy or Adapter
- The class isn't actually big → premature
- Adapter already solves your interop problem → don't add a second hierarchy

## TypeScript Example

```typescript
/**
 * The Abstraction defines the interface for the "control" part of the two class
 * hierarchies. It maintains a reference to an object of the Implementation
 * hierarchy and delegates all of the real work to this object.
 */
class Abstraction {
    protected implementation: Implementation;

    constructor(implementation: Implementation) {
        this.implementation = implementation;
    }

    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `Abstraction: Base operation with:\n${result}`;
    }
}

/**
 * You can extend the Abstraction without changing the Implementation classes.
 */
class ExtendedAbstraction extends Abstraction {
    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `ExtendedAbstraction: Extended operation with:\n${result}`;
    }
}

/**
 * The Implementation defines the interface for all implementation classes. It
 * doesn't have to match the Abstraction's interface. In fact, the two
 * interfaces can be entirely different. Typically the Implementation interface
 * provides only primitive operations, while the Abstraction defines higher-
 * level operations based on those primitives.
 */
interface Implementation {
    operationImplementation(): string;
}

/**
 * Each Concrete Implementation corresponds to a specific platform and
 * implements the Implementation interface using that platform's API.
 */
class ConcreteImplementationA implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationA: Here\'s the result on the platform A.';
    }
}

class ConcreteImplementationB implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationB: Here\'s the result on the platform B.';
    }
}

/**
 * Except for the initialization phase, where an Abstraction object gets linked
 * with a specific Implementation object, the client code should only depend on
 * the Abstraction class.
 */
function clientCode(abstraction: Abstraction) {
    console.log(abstraction.operation());
}

/**
 * The client code should be able to work with any pre-configured abstraction-
 * implementation combination.
 */
let implementation = new ConcreteImplementationA();
let abstraction = new Abstraction(implementation);
clientCode(abstraction);

console.log('');

implementation = new ConcreteImplementationB();
abstraction = new ExtendedAbstraction(implementation);
clientCode(abstraction);
```

## Python Example

```python
from abc import ABC, abstractmethod


class Implementation(ABC):
    """
    The Implementation defines the interface for all implementation classes. It
    doesn't have to match the Abstraction's interface. In fact, the two
    interfaces can be entirely different. Typically the Implementation interface
    provides only primitive operations, while the Abstraction defines higher-
    level operations based on those primitives.
    """

    @abstractmethod
    def operation_implementation(self) -> str:
        pass


class Abstraction:
    """
    The Abstraction defines the interface for the "control" part of the two
    class hierarchies. It maintains a reference to an object of the
    Implementation hierarchy and delegates all of the real work to this object.
    """

    def __init__(self, implementation: Implementation) -> None:
        self.implementation = implementation

    def operation(self) -> str:
        result = self.implementation.operation_implementation()
        return f"Abstraction: Base operation with:\n{result}"


class ExtendedAbstraction(Abstraction):
    """
    You can extend the Abstraction without changing the Implementation classes.
    """

    def operation(self) -> str:
        result = self.implementation.operation_implementation()
        return f"ExtendedAbstraction: Extended operation with:\n{result}"


class ConcreteImplementationA(Implementation):
    def operation_implementation(self) -> str:
        return "ConcreteImplementationA: Here's the result on the platform A."


class ConcreteImplementationB(Implementation):
    def operation_implementation(self) -> str:
        return "ConcreteImplementationB: Here's the result on the platform B."


def client_code(abstraction: Abstraction) -> None:
    """
    Except for the initialization phase, the client code should only depend on
    the Abstraction class.
    """
    print(abstraction.operation())


if __name__ == "__main__":
    implementation = ConcreteImplementationA()
    abstraction = Abstraction(implementation)
    client_code(abstraction)

    print("")

    implementation = ConcreteImplementationB()
    abstraction = ExtendedAbstraction(implementation)
    client_code(abstraction)
```

## Java Example

```java
// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
interface Implementation {
    String operationImplementation();
}

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It maintains a reference to an Implementation object and
// delegates all of the real work to this object.
class Abstraction {
    protected Implementation implementation;

    public Abstraction(Implementation implementation) {
        this.implementation = implementation;
    }

    public String operation() {
        return "Abstraction: Base operation with:\n" +
                implementation.operationImplementation();
    }
}

// You can extend the Abstraction without changing the Implementation classes.
class ExtendedAbstraction extends Abstraction {
    public ExtendedAbstraction(Implementation implementation) {
        super(implementation);
    }

    @Override
    public String operation() {
        return "ExtendedAbstraction: Extended operation with:\n" +
                implementation.operationImplementation();
    }
}

class ConcreteImplementationA implements Implementation {
    @Override
    public String operationImplementation() {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
}

class ConcreteImplementationB implements Implementation {
    @Override
    public String operationImplementation() {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
public class Demo {
    static void clientCode(Abstraction abstraction) {
        System.out.println(abstraction.operation());
    }

    public static void main(String[] args) {
        Implementation implementation = new ConcreteImplementationA();
        Abstraction abstraction = new Abstraction(implementation);
        clientCode(abstraction);

        System.out.println();

        implementation = new ConcreteImplementationB();
        abstraction = new ExtendedAbstraction(implementation);
        clientCode(abstraction);
    }
}
```

## C# Example

```csharp
using System;

// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
public interface IImplementation
{
    string OperationImplementation();
}

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It maintains a reference to an Implementation object and
// delegates all of the real work to this object.
public class Abstraction
{
    protected IImplementation _implementation;

    public Abstraction(IImplementation implementation)
    {
        _implementation = implementation;
    }

    public virtual string Operation()
    {
        return "Abstraction: Base operation with:\n" +
            _implementation.OperationImplementation();
    }
}

// You can extend the Abstraction without changing the Implementation classes.
public class ExtendedAbstraction : Abstraction
{
    public ExtendedAbstraction(IImplementation implementation)
        : base(implementation)
    {
    }

    public override string Operation()
    {
        return "ExtendedAbstraction: Extended operation with:\n" +
            _implementation.OperationImplementation();
    }
}

public class ConcreteImplementationA : IImplementation
{
    public string OperationImplementation()
    {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
}

public class ConcreteImplementationB : IImplementation
{
    public string OperationImplementation()
    {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
public class Demo
{
    static void ClientCode(Abstraction abstraction)
    {
        Console.WriteLine(abstraction.Operation());
    }

    public static void Main(string[] args)
    {
        IImplementation implementation = new ConcreteImplementationA();
        Abstraction abstraction = new Abstraction(implementation);
        ClientCode(abstraction);

        Console.WriteLine();

        implementation = new ConcreteImplementationB();
        abstraction = new ExtendedAbstraction(implementation);
        ClientCode(abstraction);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
type Implementation interface {
	OperationImplementation() string
}

// Abstraction defines the interface for the "control" part of the two class
// hierarchies. It holds a reference to an Implementation and delegates all of
// the real work to it.
type Abstraction struct {
	implementation Implementation
}

func (a *Abstraction) Operation() string {
	return "Abstraction: Base operation with:\n" +
		a.implementation.OperationImplementation()
}

// ExtendedAbstraction extends the Abstraction without changing implementations.
type ExtendedAbstraction struct {
	Abstraction
}

func (a *ExtendedAbstraction) Operation() string {
	return "ExtendedAbstraction: Extended operation with:\n" +
		a.implementation.OperationImplementation()
}

type ConcreteImplementationA struct{}

func (c *ConcreteImplementationA) OperationImplementation() string {
	return "ConcreteImplementationA: Here's the result on the platform A."
}

type ConcreteImplementationB struct{}

func (c *ConcreteImplementationB) OperationImplementation() string {
	return "ConcreteImplementationB: Here's the result on the platform B."
}

// Operationer captures the shared behavior so the client can accept either
// abstraction variant.
type Operationer interface {
	Operation() string
}

// clientCode should only depend on the Abstraction's behavior.
func clientCode(a Operationer) {
	fmt.Println(a.Operation())
}

func main() {
	implementation := &ConcreteImplementationA{}
	abstraction := &Abstraction{implementation: implementation}
	clientCode(abstraction)

	fmt.Println("")

	implementationB := &ConcreteImplementationB{}
	extended := &ExtendedAbstraction{Abstraction{implementation: implementationB}}
	clientCode(extended)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
class Implementation {
public:
    virtual ~Implementation() = default;
    virtual std::string OperationImplementation() const = 0;
};

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It holds a reference to an Implementation and delegates all of
// the real work to it.
class Abstraction {
protected:
    std::shared_ptr<Implementation> implementation_;

public:
    explicit Abstraction(std::shared_ptr<Implementation> implementation)
        : implementation_(std::move(implementation)) {}
    virtual ~Abstraction() = default;

    virtual std::string Operation() const {
        return "Abstraction: Base operation with:\n" +
               implementation_->OperationImplementation();
    }
};

// You can extend the Abstraction without changing the Implementation classes.
class ExtendedAbstraction : public Abstraction {
public:
    using Abstraction::Abstraction;

    std::string Operation() const override {
        return "ExtendedAbstraction: Extended operation with:\n" +
               implementation_->OperationImplementation();
    }
};

class ConcreteImplementationA : public Implementation {
public:
    std::string OperationImplementation() const override {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
};

class ConcreteImplementationB : public Implementation {
public:
    std::string OperationImplementation() const override {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
};

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
void ClientCode(const Abstraction& abstraction) {
    std::cout << abstraction.Operation() << "\n";
}

int main() {
    auto implementationA = std::make_shared<ConcreteImplementationA>();
    Abstraction abstraction(implementationA);
    ClientCode(abstraction);

    std::cout << "\n";

    auto implementationB = std::make_shared<ConcreteImplementationB>();
    ExtendedAbstraction extended(implementationB);
    ClientCode(extended);

    return 0;
}
```

## Rust Example

```rust
// The Implementation trait defines the interface for all implementation types.
// It doesn't have to match the Abstraction's interface. Typically it provides
// only primitive operations, while the Abstraction defines higher-level ones.
trait Implementation {
    fn operation_implementation(&self) -> String;
}

struct ConcreteImplementationA;

impl Implementation for ConcreteImplementationA {
    fn operation_implementation(&self) -> String {
        String::from("ConcreteImplementationA: Here's the result on the platform A.")
    }
}

struct ConcreteImplementationB;

impl Implementation for ConcreteImplementationB {
    fn operation_implementation(&self) -> String {
        String::from("ConcreteImplementationB: Here's the result on the platform B.")
    }
}

// The Abstraction trait defines the "control" part of the two hierarchies.
trait Abstraction {
    fn operation(&self) -> String;
}

// The base Abstraction holds a reference to an Implementation and delegates the
// real work to it.
struct BaseAbstraction {
    implementation: Box<dyn Implementation>,
}

impl Abstraction for BaseAbstraction {
    fn operation(&self) -> String {
        format!(
            "Abstraction: Base operation with:\n{}",
            self.implementation.operation_implementation()
        )
    }
}

// You can extend the Abstraction without changing the Implementation types.
struct ExtendedAbstraction {
    implementation: Box<dyn Implementation>,
}

impl Abstraction for ExtendedAbstraction {
    fn operation(&self) -> String {
        format!(
            "ExtendedAbstraction: Extended operation with:\n{}",
            self.implementation.operation_implementation()
        )
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction trait.
fn client_code(abstraction: &dyn Abstraction) {
    println!("{}", abstraction.operation());
}

fn main() {
    let abstraction = BaseAbstraction {
        implementation: Box::new(ConcreteImplementationA),
    };
    client_code(&abstraction);

    println!();

    let abstraction = ExtendedAbstraction {
        implementation: Box::new(ConcreteImplementationB),
    };
    client_code(&abstraction);
}
```

## Pairs well with

Adapter (Adapter retrofits incompatible interfaces; Bridge designs the split up-front); Abstract Factory (Bridge often
gets its implementation from an Abstract Factory).
