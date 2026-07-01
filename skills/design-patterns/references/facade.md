---
name: Facade
category: Structural
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/facade/typescript/example
---

# Facade

## Intent

Facade is a structural design pattern that provides a simplified interface to a library, a framework, or any other
complex set of classes.

## Applicability

- You need a straightforward interface to a complex subsystem, shielding clients from implementation details
- A subsystem grows increasingly complex over time, requiring more configuration and boilerplate code
- You want to organize a subsystem into distinct layers with clear entry points for each level
- You need to reduce coupling between multiple subsystems by controlling their interactions

## Pros

- Isolates client code from subsystem complexity, improving maintainability
- Simplifies client code by hiding intricate interactions with multiple objects
- Allows changes to the subsystem without affecting client implementations

## Cons

- A facade can become a "god object" coupled to all classes in an application if not properly managed
- Overuse may hide important subsystem functionality clients might need

## Don't use when

- The subsystem already has a simple public API → no facade needed
- The facade would just re-export everything → that's a barrel file, not a facade
- You'd be creating a facade with one method that calls one underlying method → premature

## TypeScript Example

```typescript
/**
 * The Facade class provides a simple interface to the complex logic of one or
 * several subsystems. The Facade delegates the client requests to the
 * appropriate objects within the subsystem. The Facade is also responsible for
 * managing their lifecycle. All of this shields the client from the undesired
 * complexity of the subsystem.
 */
class Facade {
    protected subsystem1: Subsystem1;

    protected subsystem2: Subsystem2;

    /**
     * Depending on your application's needs, you can provide the Facade with
     * existing subsystem objects or force the Facade to create them on its own.
     */
    constructor(subsystem1?: Subsystem1, subsystem2?: Subsystem2) {
        this.subsystem1 = subsystem1 || new Subsystem1();
        this.subsystem2 = subsystem2 || new Subsystem2();
    }

    /**
     * The Facade's methods are convenient shortcuts to the sophisticated
     * functionality of the subsystems. However, clients get only to a fraction
     * of a subsystem's capabilities.
     */
    public operation(): string {
        let result = 'Facade initializes subsystems:\n';
        result += this.subsystem1.operation1();
        result += this.subsystem2.operation1();
        result += 'Facade orders subsystems to perform the action:\n';
        result += this.subsystem1.operationN();
        result += this.subsystem2.operationZ();

        return result;
    }
}

/**
 * The Subsystem can accept requests either from the facade or client directly.
 * In any case, to the Subsystem, the Facade is yet another client, and it's not
 * a part of the Subsystem.
 */
class Subsystem1 {
    public operation1(): string {
        return 'Subsystem1: Ready!\n';
    }

    // ...

    public operationN(): string {
        return 'Subsystem1: Go!\n';
    }
}

/**
 * Some facades can work with multiple subsystems at the same time.
 */
class Subsystem2 {
    public operation1(): string {
        return 'Subsystem2: Get ready!\n';
    }

    // ...

    public operationZ(): string {
        return 'Subsystem2: Fire!';
    }
}

/**
 * The client code works with complex subsystems through a simple interface
 * provided by the Facade. When a facade manages the lifecycle of the subsystem,
 * the client might not even know about the existence of the subsystem. This
 * approach lets you keep the complexity under control.
 */
function clientCode(facade: Facade) {
    // ...

    console.log(facade.operation());

    // ...
}

/**
 * The client code may have some of the subsystem's objects already created. In
 * this case, it might be worthwhile to initialize the Facade with these objects
 * instead of letting the Facade create new instances.
 */
const subsystem1 = new Subsystem1();
const subsystem2 = new Subsystem2();
const facade = new Facade(subsystem1, subsystem2);
clientCode(facade);
```

## Python Example

```python
class Subsystem1:
    """A subsystem can accept requests either from the facade or client directly.
    To the subsystem, the facade is yet another client."""

    def operation1(self) -> str:
        return "Subsystem1: Ready!\n"

    def operation_n(self) -> str:
        return "Subsystem1: Go!\n"


class Subsystem2:
    """Some facades can work with multiple subsystems at the same time."""

    def operation1(self) -> str:
        return "Subsystem2: Get ready!\n"

    def operation_z(self) -> str:
        return "Subsystem2: Fire!"


class Facade:
    """The Facade provides a simple interface to the complex logic of one or
    several subsystems, delegating client requests to the appropriate objects
    and managing their lifecycle."""

    def __init__(self, subsystem1: Subsystem1 = None, subsystem2: Subsystem2 = None) -> None:
        self._subsystem1 = subsystem1 or Subsystem1()
        self._subsystem2 = subsystem2 or Subsystem2()

    def operation(self) -> str:
        result = "Facade initializes subsystems:\n"
        result += self._subsystem1.operation1()
        result += self._subsystem2.operation1()
        result += "Facade orders subsystems to perform the action:\n"
        result += self._subsystem1.operation_n()
        result += self._subsystem2.operation_z()
        return result


def client_code(facade: Facade) -> None:
    """The client works with complex subsystems through the simple Facade
    interface, keeping the complexity under control."""
    print(facade.operation())


if __name__ == "__main__":
    subsystem1 = Subsystem1()
    subsystem2 = Subsystem2()
    facade = Facade(subsystem1, subsystem2)
    client_code(facade)
```

## Java Example

```java
// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1 {
    public String operation1() {
        return "Subsystem1: Ready!\n";
    }

    public String operationN() {
        return "Subsystem1: Go!\n";
    }
}

// Some facades can work with multiple subsystems at the same time.
class Subsystem2 {
    public String operation1() {
        return "Subsystem2: Get ready!\n";
    }

    public String operationZ() {
        return "Subsystem2: Fire!";
    }
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
class Facade {
    protected Subsystem1 subsystem1;
    protected Subsystem2 subsystem2;

    public Facade(Subsystem1 subsystem1, Subsystem2 subsystem2) {
        this.subsystem1 = subsystem1 != null ? subsystem1 : new Subsystem1();
        this.subsystem2 = subsystem2 != null ? subsystem2 : new Subsystem2();
    }

    public String operation() {
        String result = "Facade initializes subsystems:\n";
        result += subsystem1.operation1();
        result += subsystem2.operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1.operationN();
        result += subsystem2.operationZ();
        return result;
    }
}

public class Demo {
    // The client works with complex subsystems through the simple Facade.
    static void clientCode(Facade facade) {
        System.out.println(facade.operation());
    }

    public static void main(String[] args) {
        Subsystem1 subsystem1 = new Subsystem1();
        Subsystem2 subsystem2 = new Subsystem2();
        Facade facade = new Facade(subsystem1, subsystem2);
        clientCode(facade);
    }
}
```

## C# Example

```csharp
using System;

// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1
{
    public string Operation1() => "Subsystem1: Ready!\n";

    public string OperationN() => "Subsystem1: Go!\n";
}

// Some facades can work with multiple subsystems at the same time.
class Subsystem2
{
    public string Operation1() => "Subsystem2: Get ready!\n";

    public string OperationZ() => "Subsystem2: Fire!";
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
class Facade
{
    protected Subsystem1 subsystem1;
    protected Subsystem2 subsystem2;

    public Facade(Subsystem1 subsystem1 = null, Subsystem2 subsystem2 = null)
    {
        this.subsystem1 = subsystem1 ?? new Subsystem1();
        this.subsystem2 = subsystem2 ?? new Subsystem2();
    }

    public string Operation()
    {
        string result = "Facade initializes subsystems:\n";
        result += subsystem1.Operation1();
        result += subsystem2.Operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1.OperationN();
        result += subsystem2.OperationZ();
        return result;
    }
}

class Program
{
    // The client works with complex subsystems through the simple Facade.
    static void ClientCode(Facade facade)
    {
        Console.WriteLine(facade.Operation());
    }

    static void Main(string[] args)
    {
        Subsystem1 subsystem1 = new Subsystem1();
        Subsystem2 subsystem2 = new Subsystem2();
        Facade facade = new Facade(subsystem1, subsystem2);
        ClientCode(facade);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Subsystem1 can accept requests either from the facade or client directly.
type Subsystem1 struct{}

func (s *Subsystem1) Operation1() string { return "Subsystem1: Ready!\n" }
func (s *Subsystem1) OperationN() string { return "Subsystem1: Go!\n" }

// Subsystem2 shows that a facade can work with multiple subsystems.
type Subsystem2 struct{}

func (s *Subsystem2) Operation1() string { return "Subsystem2: Get ready!\n" }
func (s *Subsystem2) OperationZ() string { return "Subsystem2: Fire!" }

// Facade provides a simple interface to the complex logic of the subsystems,
// delegating client requests and managing their lifecycle.
type Facade struct {
	subsystem1 *Subsystem1
	subsystem2 *Subsystem2
}

func NewFacade(s1 *Subsystem1, s2 *Subsystem2) *Facade {
	if s1 == nil {
		s1 = &Subsystem1{}
	}
	if s2 == nil {
		s2 = &Subsystem2{}
	}
	return &Facade{subsystem1: s1, subsystem2: s2}
}

func (f *Facade) Operation() string {
	result := "Facade initializes subsystems:\n"
	result += f.subsystem1.Operation1()
	result += f.subsystem2.Operation1()
	result += "Facade orders subsystems to perform the action:\n"
	result += f.subsystem1.OperationN()
	result += f.subsystem2.OperationZ()
	return result
}

// clientCode works with complex subsystems through the simple Facade.
func clientCode(facade *Facade) {
	fmt.Println(facade.Operation())
}

func main() {
	subsystem1 := &Subsystem1{}
	subsystem2 := &Subsystem2{}
	facade := NewFacade(subsystem1, subsystem2)
	clientCode(facade)
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>

// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1 {
public:
    std::string Operation1() const { return "Subsystem1: Ready!\n"; }
    std::string OperationN() const { return "Subsystem1: Go!\n"; }
};

// Some facades can work with multiple subsystems at the same time.
class Subsystem2 {
public:
    std::string Operation1() const { return "Subsystem2: Get ready!\n"; }
    std::string OperationZ() const { return "Subsystem2: Fire!"; }
};

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests to the appropriate objects.
class Facade {
protected:
    Subsystem1* subsystem1_;
    Subsystem2* subsystem2_;

public:
    Facade(Subsystem1* s1 = nullptr, Subsystem2* s2 = nullptr)
        : subsystem1_(s1 ? s1 : new Subsystem1()),
          subsystem2_(s2 ? s2 : new Subsystem2()) {}

    std::string Operation() const {
        std::string result = "Facade initializes subsystems:\n";
        result += subsystem1_->Operation1();
        result += subsystem2_->Operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1_->OperationN();
        result += subsystem2_->OperationZ();
        return result;
    }
};

// The client works with complex subsystems through the simple Facade.
void ClientCode(const Facade& facade) {
    std::cout << facade.Operation() << "\n";
}

int main() {
    Subsystem1* subsystem1 = new Subsystem1();
    Subsystem2* subsystem2 = new Subsystem2();
    Facade facade(subsystem1, subsystem2);
    ClientCode(facade);
    return 0;
}
```

## Rust Example

```rust
// A subsystem can accept requests either from the facade or client directly.
struct Subsystem1;

impl Subsystem1 {
    fn operation1(&self) -> String {
        "Subsystem1: Ready!\n".to_string()
    }
    fn operation_n(&self) -> String {
        "Subsystem1: Go!\n".to_string()
    }
}

// Some facades can work with multiple subsystems at the same time.
struct Subsystem2;

impl Subsystem2 {
    fn operation1(&self) -> String {
        "Subsystem2: Get ready!\n".to_string()
    }
    fn operation_z(&self) -> String {
        "Subsystem2: Fire!".to_string()
    }
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
struct Facade {
    subsystem1: Subsystem1,
    subsystem2: Subsystem2,
}

impl Facade {
    fn new() -> Self {
        Facade {
            subsystem1: Subsystem1,
            subsystem2: Subsystem2,
        }
    }

    fn operation(&self) -> String {
        let mut result = String::from("Facade initializes subsystems:\n");
        result += &self.subsystem1.operation1();
        result += &self.subsystem2.operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += &self.subsystem1.operation_n();
        result += &self.subsystem2.operation_z();
        result
    }
}

// The client works with complex subsystems through the simple Facade.
fn client_code(facade: &Facade) {
    println!("{}", facade.operation());
}

fn main() {
    let facade = Facade::new();
    client_code(&facade);
}
```

## Pairs well with

Adapter (facades often wrap multiple adapters); Singleton (facades are commonly accessed as singletons by convention);
Mediator (Mediator coordinates peers, Facade provides a one-way simplified interface).
