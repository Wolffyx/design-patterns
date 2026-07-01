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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Component(ABC):
    @abstractmethod
    def accept(self, visitor: Visitor) -> None: ...


class ConcreteComponentA(Component):
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_concrete_component_a(self)

    def exclusive_method_of_concrete_component_a(self) -> str:
        return "A"


class ConcreteComponentB(Component):
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_concrete_component_b(self)

    def special_method_of_concrete_component_b(self) -> str:
        return "B"


class Visitor(ABC):
    @abstractmethod
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None: ...

    @abstractmethod
    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None: ...


class ConcreteVisitor1(Visitor):
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None:
        print(f"{element.exclusive_method_of_concrete_component_a()} + ConcreteVisitor1")

    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None:
        print(f"{element.special_method_of_concrete_component_b()} + ConcreteVisitor1")


class ConcreteVisitor2(Visitor):
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None:
        print(f"{element.exclusive_method_of_concrete_component_a()} + ConcreteVisitor2")

    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None:
        print(f"{element.special_method_of_concrete_component_b()} + ConcreteVisitor2")


def client_code(components: list[Component], visitor: Visitor) -> None:
    for component in components:
        component.accept(visitor)


if __name__ == "__main__":
    components = [ConcreteComponentA(), ConcreteComponentB()]

    print("The client code works with all visitors via the base Visitor interface:")
    client_code(components, ConcreteVisitor1())
    print()

    print("It allows the same client code to work with different types of visitors:")
    client_code(components, ConcreteVisitor2())
```

## Java Example

```java
import java.util.List;

interface Component {
    void accept(Visitor visitor);
}

class ConcreteComponentA implements Component {
    public void accept(Visitor visitor) {
        visitor.visitConcreteComponentA(this);
    }

    public String exclusiveMethodOfConcreteComponentA() {
        return "A";
    }
}

class ConcreteComponentB implements Component {
    public void accept(Visitor visitor) {
        visitor.visitConcreteComponentB(this);
    }

    public String specialMethodOfConcreteComponentB() {
        return "B";
    }
}

interface Visitor {
    void visitConcreteComponentA(ConcreteComponentA element);
    void visitConcreteComponentB(ConcreteComponentB element);
}

class ConcreteVisitor1 implements Visitor {
    public void visitConcreteComponentA(ConcreteComponentA element) {
        System.out.println(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor1");
    }

    public void visitConcreteComponentB(ConcreteComponentB element) {
        System.out.println(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor1");
    }
}

class ConcreteVisitor2 implements Visitor {
    public void visitConcreteComponentA(ConcreteComponentA element) {
        System.out.println(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor2");
    }

    public void visitConcreteComponentB(ConcreteComponentB element) {
        System.out.println(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor2");
    }
}

public class Demo {
    static void clientCode(List<Component> components, Visitor visitor) {
        for (Component component : components) {
            component.accept(visitor);
        }
    }

    public static void main(String[] args) {
        List<Component> components = List.of(new ConcreteComponentA(), new ConcreteComponentB());

        System.out.println("The client code works with all visitors via the base Visitor interface:");
        clientCode(components, new ConcreteVisitor1());
        System.out.println();

        System.out.println("It allows the same client code to work with different types of visitors:");
        clientCode(components, new ConcreteVisitor2());
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

interface IComponent
{
    void Accept(IVisitor visitor);
}

class ConcreteComponentA : IComponent
{
    public void Accept(IVisitor visitor) => visitor.VisitConcreteComponentA(this);
    public string ExclusiveMethodOfConcreteComponentA() => "A";
}

class ConcreteComponentB : IComponent
{
    public void Accept(IVisitor visitor) => visitor.VisitConcreteComponentB(this);
    public string SpecialMethodOfConcreteComponentB() => "B";
}

interface IVisitor
{
    void VisitConcreteComponentA(ConcreteComponentA element);
    void VisitConcreteComponentB(ConcreteComponentB element);
}

class ConcreteVisitor1 : IVisitor
{
    public void VisitConcreteComponentA(ConcreteComponentA element) =>
        Console.WriteLine(element.ExclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor1");

    public void VisitConcreteComponentB(ConcreteComponentB element) =>
        Console.WriteLine(element.SpecialMethodOfConcreteComponentB() + " + ConcreteVisitor1");
}

class ConcreteVisitor2 : IVisitor
{
    public void VisitConcreteComponentA(ConcreteComponentA element) =>
        Console.WriteLine(element.ExclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor2");

    public void VisitConcreteComponentB(ConcreteComponentB element) =>
        Console.WriteLine(element.SpecialMethodOfConcreteComponentB() + " + ConcreteVisitor2");
}

class Program
{
    static void ClientCode(List<IComponent> components, IVisitor visitor)
    {
        foreach (var component in components)
            component.Accept(visitor);
    }

    static void Main()
    {
        var components = new List<IComponent> { new ConcreteComponentA(), new ConcreteComponentB() };

        Console.WriteLine("The client code works with all visitors via the base Visitor interface:");
        ClientCode(components, new ConcreteVisitor1());
        Console.WriteLine();

        Console.WriteLine("It allows the same client code to work with different types of visitors:");
        ClientCode(components, new ConcreteVisitor2());
    }
}
```

## Go Example

```go
package main

import "fmt"

type Visitor interface {
	VisitConcreteComponentA(element *ConcreteComponentA)
	VisitConcreteComponentB(element *ConcreteComponentB)
}

type Component interface {
	Accept(visitor Visitor)
}

type ConcreteComponentA struct{}

func (c *ConcreteComponentA) Accept(visitor Visitor) {
	visitor.VisitConcreteComponentA(c)
}

func (c *ConcreteComponentA) ExclusiveMethod() string { return "A" }

type ConcreteComponentB struct{}

func (c *ConcreteComponentB) Accept(visitor Visitor) {
	visitor.VisitConcreteComponentB(c)
}

func (c *ConcreteComponentB) SpecialMethod() string { return "B" }

type ConcreteVisitor1 struct{}

func (v *ConcreteVisitor1) VisitConcreteComponentA(element *ConcreteComponentA) {
	fmt.Println(element.ExclusiveMethod() + " + ConcreteVisitor1")
}

func (v *ConcreteVisitor1) VisitConcreteComponentB(element *ConcreteComponentB) {
	fmt.Println(element.SpecialMethod() + " + ConcreteVisitor1")
}

type ConcreteVisitor2 struct{}

func (v *ConcreteVisitor2) VisitConcreteComponentA(element *ConcreteComponentA) {
	fmt.Println(element.ExclusiveMethod() + " + ConcreteVisitor2")
}

func (v *ConcreteVisitor2) VisitConcreteComponentB(element *ConcreteComponentB) {
	fmt.Println(element.SpecialMethod() + " + ConcreteVisitor2")
}

func clientCode(components []Component, visitor Visitor) {
	for _, component := range components {
		component.Accept(visitor)
	}
}

func main() {
	components := []Component{&ConcreteComponentA{}, &ConcreteComponentB{}}

	fmt.Println("The client code works with all visitors via the base Visitor interface:")
	clientCode(components, &ConcreteVisitor1{})
	fmt.Println()

	fmt.Println("It allows the same client code to work with different types of visitors:")
	clientCode(components, &ConcreteVisitor2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class ConcreteComponentA;
class ConcreteComponentB;

class Visitor {
public:
    virtual ~Visitor() = default;
    virtual void VisitConcreteComponentA(const ConcreteComponentA* element) const = 0;
    virtual void VisitConcreteComponentB(const ConcreteComponentB* element) const = 0;
};

class Component {
public:
    virtual ~Component() = default;
    virtual void Accept(const Visitor* visitor) const = 0;
};

class ConcreteComponentA : public Component {
public:
    void Accept(const Visitor* visitor) const override {
        visitor->VisitConcreteComponentA(this);
    }
    std::string ExclusiveMethod() const { return "A"; }
};

class ConcreteComponentB : public Component {
public:
    void Accept(const Visitor* visitor) const override {
        visitor->VisitConcreteComponentB(this);
    }
    std::string SpecialMethod() const { return "B"; }
};

class ConcreteVisitor1 : public Visitor {
public:
    void VisitConcreteComponentA(const ConcreteComponentA* element) const override {
        std::cout << element->ExclusiveMethod() << " + ConcreteVisitor1\n";
    }
    void VisitConcreteComponentB(const ConcreteComponentB* element) const override {
        std::cout << element->SpecialMethod() << " + ConcreteVisitor1\n";
    }
};

class ConcreteVisitor2 : public Visitor {
public:
    void VisitConcreteComponentA(const ConcreteComponentA* element) const override {
        std::cout << element->ExclusiveMethod() << " + ConcreteVisitor2\n";
    }
    void VisitConcreteComponentB(const ConcreteComponentB* element) const override {
        std::cout << element->SpecialMethod() << " + ConcreteVisitor2\n";
    }
};

void ClientCode(const std::vector<std::unique_ptr<Component>>& components, const Visitor* visitor) {
    for (const auto& component : components) {
        component->Accept(visitor);
    }
}

int main() {
    std::vector<std::unique_ptr<Component>> components;
    components.push_back(std::make_unique<ConcreteComponentA>());
    components.push_back(std::make_unique<ConcreteComponentB>());

    std::cout << "The client code works with all visitors via the base Visitor interface:\n";
    ConcreteVisitor1 visitor1;
    ClientCode(components, &visitor1);
    std::cout << "\n";

    std::cout << "It allows the same client code to work with different types of visitors:\n";
    ConcreteVisitor2 visitor2;
    ClientCode(components, &visitor2);
}
```

## Rust Example

```rust
enum Component {
    ConcreteComponentA,
    ConcreteComponentB,
}

impl Component {
    fn exclusive_method(&self) -> &str {
        match self {
            Component::ConcreteComponentA => "A",
            Component::ConcreteComponentB => "B",
        }
    }

    fn accept(&self, visitor: &dyn Visitor) {
        match self {
            Component::ConcreteComponentA => visitor.visit_concrete_component_a(self),
            Component::ConcreteComponentB => visitor.visit_concrete_component_b(self),
        }
    }
}

trait Visitor {
    fn visit_concrete_component_a(&self, element: &Component);
    fn visit_concrete_component_b(&self, element: &Component);
}

struct ConcreteVisitor1;

impl Visitor for ConcreteVisitor1 {
    fn visit_concrete_component_a(&self, element: &Component) {
        println!("{} + ConcreteVisitor1", element.exclusive_method());
    }
    fn visit_concrete_component_b(&self, element: &Component) {
        println!("{} + ConcreteVisitor1", element.exclusive_method());
    }
}

struct ConcreteVisitor2;

impl Visitor for ConcreteVisitor2 {
    fn visit_concrete_component_a(&self, element: &Component) {
        println!("{} + ConcreteVisitor2", element.exclusive_method());
    }
    fn visit_concrete_component_b(&self, element: &Component) {
        println!("{} + ConcreteVisitor2", element.exclusive_method());
    }
}

fn client_code(components: &[Component], visitor: &dyn Visitor) {
    for component in components {
        component.accept(visitor);
    }
}

fn main() {
    let components = vec![Component::ConcreteComponentA, Component::ConcreteComponentB];

    println!("The client code works with all visitors via the base Visitor interface:");
    client_code(&components, &ConcreteVisitor1);
    println!();

    println!("It allows the same client code to work with different types of visitors:");
    client_code(&components, &ConcreteVisitor2);
}
```

## Pairs well with

Composite (Visitor walks Composite trees — the canonical pairing); Iterator (Visitor uses an Iterator to traverse).
