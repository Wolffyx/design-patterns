---
name: Adapter
category: Structural
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/adapter/typescript/example
---

# Adapter

## Intent

Adapter is a structural design pattern that allows objects with incompatible interfaces to collaborate. This pattern
functions as a translator between incompatible components, enabling them to work together seamlessly.

## Applicability

- You need to integrate an existing class whose interface doesn't align with your codebase
- You want to reuse multiple subclasses that lack common functionality without duplicating code across new child classes
- You're working with legacy code, third-party libraries, or components with incompatible interfaces that you cannot
  modify

## Pros

- Separates interface conversion logic from primary business logic (Single Responsibility Principle)
- Allows introduction of new adapter types without affecting existing client code (Open/Closed Principle)
- Enables incompatible components to work together without modifying their source code

## Cons

- Increases overall code complexity by requiring new interfaces and classes
- Sometimes simpler to modify the service class directly rather than introduce an adapter layer

## Don't use when

- You control both interfaces — just align them directly
- The "adaptation" is a one-line wrapper → inline it
- The codebase already has an adapter for this backend → extend or compose with the existing one

## TypeScript Example

```typescript
/**
 * The Target defines the domain-specific interface used by the client code.
 */
class Target {
    public request(): string {
        return 'Target: The default target\'s behavior.';
    }
}

/**
 * The Adaptee contains some useful behavior, but its interface is incompatible
 * with the existing client code. The Adaptee needs some adaptation before the
 * client code can use it.
 */
class Adaptee {
    public specificRequest(): string {
        return '.eetpadA eht fo roivaheb laicepS';
    }
}

/**
 * The Adapter makes the Adaptee's interface compatible with the Target's
 * interface.
 */
class Adapter extends Target {
    private adaptee: Adaptee;

    constructor(adaptee: Adaptee) {
        super();
        this.adaptee = adaptee;
    }

    public request(): string {
        const result = this.adaptee.specificRequest().split('').reverse().join('');
        return `Adapter: (TRANSLATED) ${result}`;
    }
}

/**
 * The client code supports all classes that follow the Target interface.
 */
function clientCode(target: Target) {
    console.log(target.request());
}

console.log('Client: I can work just fine with the Target objects:');
const target = new Target();
clientCode(target);

console.log('');

const adaptee = new Adaptee();
console.log('Client: The Adaptee class has a weird interface. See, I don\'t understand it:');
console.log(`Adaptee: ${adaptee.specificRequest()}`);

console.log('');

console.log('Client: But I can work with it via the Adapter:');
const adapter = new Adapter(adaptee);
clientCode(adapter);
```

## Python Example

```python
from abc import ABC, abstractmethod


class Target(ABC):
    """The domain-specific interface used by the client code."""

    @abstractmethod
    def request(self) -> str:
        ...


class DefaultTarget(Target):
    def request(self) -> str:
        return "Target: The default target's behavior."


class Adaptee:
    """Useful behavior with an interface incompatible with the client."""

    def specific_request(self) -> str:
        return ".eetpadA eht fo roivaheb laicepS"


class Adapter(Target):
    """Makes the Adaptee's interface compatible with the Target's."""

    def __init__(self, adaptee: Adaptee):
        self._adaptee = adaptee

    def request(self) -> str:
        result = self._adaptee.specific_request()[::-1]
        return f"Adapter: (TRANSLATED) {result}"


def client_code(target: Target) -> None:
    print(target.request())


if __name__ == "__main__":
    print("Client: I can work just fine with the Target objects:")
    client_code(DefaultTarget())
    print()

    adaptee = Adaptee()
    print("Client: The Adaptee class has a weird interface. See, I don't understand it:")
    print(f"Adaptee: {adaptee.specific_request()}")
    print()

    print("Client: But I can work with it via the Adapter:")
    client_code(Adapter(adaptee))
```

## Java Example

```java
interface Target {
    // The domain-specific interface used by the client code.
    String request();
}

class DefaultTarget implements Target {
    public String request() {
        return "Target: The default target's behavior.";
    }
}

// Useful behavior with an interface incompatible with the client.
class Adaptee {
    public String specificRequest() {
        return ".eetpadA eht fo roivaheb laicepS";
    }
}

// Makes the Adaptee's interface compatible with the Target's.
class Adapter implements Target {
    private final Adaptee adaptee;

    public Adapter(Adaptee adaptee) {
        this.adaptee = adaptee;
    }

    public String request() {
        String result = new StringBuilder(adaptee.specificRequest()).reverse().toString();
        return "Adapter: (TRANSLATED) " + result;
    }
}

public class Demo {
    static void clientCode(Target target) {
        System.out.println(target.request());
    }

    public static void main(String[] args) {
        System.out.println("Client: I can work just fine with the Target objects:");
        clientCode(new DefaultTarget());
        System.out.println();

        Adaptee adaptee = new Adaptee();
        System.out.println("Client: The Adaptee class has a weird interface. See, I don't understand it:");
        System.out.println("Adaptee: " + adaptee.specificRequest());
        System.out.println();

        System.out.println("Client: But I can work with it via the Adapter:");
        clientCode(new Adapter(adaptee));
    }
}
```

## C# Example

```csharp
using System;
using System.Linq;

// The domain-specific interface used by the client code.
interface ITarget
{
    string Request();
}

class DefaultTarget : ITarget
{
    public string Request() => "Target: The default target's behavior.";
}

// Useful behavior with an interface incompatible with the client.
class Adaptee
{
    public string SpecificRequest() => ".eetpadA eht fo roivaheb laicepS";
}

// Makes the Adaptee's interface compatible with the Target's.
class Adapter : ITarget
{
    private readonly Adaptee _adaptee;

    public Adapter(Adaptee adaptee) => _adaptee = adaptee;

    public string Request()
    {
        var result = new string(_adaptee.SpecificRequest().Reverse().ToArray());
        return $"Adapter: (TRANSLATED) {result}";
    }
}

public class Program
{
    static void ClientCode(ITarget target) => Console.WriteLine(target.Request());

    public static void Main()
    {
        Console.WriteLine("Client: I can work just fine with the Target objects:");
        ClientCode(new DefaultTarget());
        Console.WriteLine();

        var adaptee = new Adaptee();
        Console.WriteLine("Client: The Adaptee class has a weird interface. See, I don't understand it:");
        Console.WriteLine($"Adaptee: {adaptee.SpecificRequest()}");
        Console.WriteLine();

        Console.WriteLine("Client: But I can work with it via the Adapter:");
        ClientCode(new Adapter(adaptee));
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"strings"
)

// Target is the domain-specific interface used by the client code.
type Target interface {
	Request() string
}

type DefaultTarget struct{}

func (t *DefaultTarget) Request() string {
	return "Target: The default target's behavior."
}

// Adaptee has useful behavior but an incompatible interface.
type Adaptee struct{}

func (a *Adaptee) SpecificRequest() string {
	return ".eetpadA eht fo roivaheb laicepS"
}

// Adapter makes the Adaptee's interface compatible with Target.
type Adapter struct {
	adaptee *Adaptee
}

func (a *Adapter) Request() string {
	runes := []rune(a.adaptee.SpecificRequest())
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return fmt.Sprintf("Adapter: (TRANSLATED) %s", string(runes))
}

func clientCode(target Target) {
	fmt.Println(target.Request())
}

func main() {
	fmt.Println("Client: I can work just fine with the Target objects:")
	clientCode(&DefaultTarget{})
	fmt.Println()

	adaptee := &Adaptee{}
	fmt.Println("Client: The Adaptee class has a weird interface. See, I don't understand it:")
	fmt.Printf("Adaptee: %s\n", adaptee.SpecificRequest())
	fmt.Println()

	fmt.Println("Client: But I can work with it via the Adapter:")
	clientCode(&Adapter{adaptee: adaptee})
	_ = strings.TrimSpace
}
```

## C++ Example

```cpp
#include <algorithm>
#include <iostream>
#include <memory>
#include <string>

// The domain-specific interface used by the client code.
class Target {
public:
    virtual ~Target() = default;
    virtual std::string request() const {
        return "Target: The default target's behavior.";
    }
};

// Useful behavior with an interface incompatible with the client.
class Adaptee {
public:
    std::string specificRequest() const {
        return ".eetpadA eht fo roivaheb laicepS";
    }
};

// Makes the Adaptee's interface compatible with the Target's.
class Adapter : public Target {
private:
    std::shared_ptr<Adaptee> adaptee_;

public:
    explicit Adapter(std::shared_ptr<Adaptee> adaptee) : adaptee_(std::move(adaptee)) {}

    std::string request() const override {
        std::string result = adaptee_->specificRequest();
        std::reverse(result.begin(), result.end());
        return "Adapter: (TRANSLATED) " + result;
    }
};

void clientCode(const Target& target) {
    std::cout << target.request() << "\n";
}

int main() {
    std::cout << "Client: I can work just fine with the Target objects:\n";
    Target target;
    clientCode(target);
    std::cout << "\n";

    auto adaptee = std::make_shared<Adaptee>();
    std::cout << "Client: The Adaptee class has a weird interface. See, I don't understand it:\n";
    std::cout << "Adaptee: " << adaptee->specificRequest() << "\n\n";

    std::cout << "Client: But I can work with it via the Adapter:\n";
    Adapter adapter(adaptee);
    clientCode(adapter);
}
```

## Rust Example

```rust
// Target is the domain-specific interface used by the client code.
trait Target {
    fn request(&self) -> String;
}

struct DefaultTarget;

impl Target for DefaultTarget {
    fn request(&self) -> String {
        String::from("Target: The default target's behavior.")
    }
}

// Adaptee has useful behavior but an incompatible interface.
struct Adaptee;

impl Adaptee {
    fn specific_request(&self) -> String {
        String::from(".eetpadA eht fo roivaheb laicepS")
    }
}

// Adapter makes the Adaptee's interface compatible with Target.
struct Adapter {
    adaptee: Adaptee,
}

impl Target for Adapter {
    fn request(&self) -> String {
        let result: String = self.adaptee.specific_request().chars().rev().collect();
        format!("Adapter: (TRANSLATED) {}", result)
    }
}

fn client_code(target: &dyn Target) {
    println!("{}", target.request());
}

fn main() {
    println!("Client: I can work just fine with the Target objects:");
    client_code(&DefaultTarget);
    println!();

    let adaptee = Adaptee;
    println!("Client: The Adaptee class has a weird interface. See, I don't understand it:");
    println!("Adaptee: {}", adaptee.specific_request());
    println!();

    println!("Client: But I can work with it via the Adapter:");
    client_code(&Adapter { adaptee });
}
```

## Pairs well with

Bridge (Adapter focuses on making existing things compatible; Bridge designs the abstraction up-front to support
multiple implementations); Strategy (kernel adapters are also strategies — runtime swappable).
