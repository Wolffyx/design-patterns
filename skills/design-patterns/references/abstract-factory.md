---
name: Abstract Factory
category: Creational
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/abstract-factory/typescript/example
---

# Abstract Factory

## Intent

Abstract Factory is a creational design pattern that lets you produce families of related objects without specifying
their concrete classes. It enables creation of compatible product sets while decoupling client code from concrete
implementations.

## Applicability

- Your code must work with multiple families of related products but shouldn't depend on their concrete classes
- You want to ensure that created products from the same family work together properly
- You need to allow future extensibility without modifying existing client code
- A class has numerous Factory Methods that obscure its primary responsibility

## Pros

- Guarantees compatibility among products created from the same factory
- Eliminates tight coupling between concrete products and client code
- Centralizes product creation logic, improving maintainability
- Supports the Open/Closed Principle by enabling new product variants without breaking existing code

## Cons

- Introduces significant complexity through additional interfaces and classes
- May be unnecessarily complicated for simple scenarios with few product families

## Don't use when

- You only need to create one product type → use Factory Method instead
- The "families" only have one member each → flat Factory Method is enough
- Variants will never be added → just instantiate concrete classes directly

## TypeScript Example

```typescript
/**
 * The Abstract Factory interface declares a set of methods that return
 * different abstract products. These products are called a family and are
 * related by a high-level theme or concept. Products of one family are usually
 * able to collaborate among themselves. A family of products may have several
 * variants, but the products of one variant are incompatible with products of
 * another.
 */
interface AbstractFactory {
    createProductA(): AbstractProductA;

    createProductB(): AbstractProductB;
}

/**
 * Concrete Factories produce a family of products that belong to a single
 * variant. The factory guarantees that resulting products are compatible. Note
 * that signatures of the Concrete Factory's methods return an abstract product,
 * while inside the method a concrete product is instantiated.
 */
class ConcreteFactory1 implements AbstractFactory {
    public createProductA(): AbstractProductA {
        return new ConcreteProductA1();
    }

    public createProductB(): AbstractProductB {
        return new ConcreteProductB1();
    }
}

/**
 * Each Concrete Factory has a corresponding product variant.
 */
class ConcreteFactory2 implements AbstractFactory {
    public createProductA(): AbstractProductA {
        return new ConcreteProductA2();
    }

    public createProductB(): AbstractProductB {
        return new ConcreteProductB2();
    }
}

/**
 * Each distinct product of a product family should have a base interface. All
 * variants of the product must implement this interface.
 */
interface AbstractProductA {
    usefulFunctionA(): string;
}

/**
 * These Concrete Products are created by corresponding Concrete Factories.
 */
class ConcreteProductA1 implements AbstractProductA {
    public usefulFunctionA(): string {
        return 'The result of the product A1.';
    }
}

class ConcreteProductA2 implements AbstractProductA {
    public usefulFunctionA(): string {
        return 'The result of the product A2.';
    }
}

/**
 * Here's the the base interface of another product. All products can interact
 * with each other, but proper interaction is possible only between products of
 * the same concrete variant.
 */
interface AbstractProductB {
    /**
     * Product B is able to do its own thing...
     */
    usefulFunctionB(): string;

    /**
     * ...but it also can collaborate with the ProductA.
     *
     * The Abstract Factory makes sure that all products it creates are of the
     * same variant and thus, compatible.
     */
    anotherUsefulFunctionB(collaborator: AbstractProductA): string;
}

/**
 * These Concrete Products are created by corresponding Concrete Factories.
 */
class ConcreteProductB1 implements AbstractProductB {
    public usefulFunctionB(): string {
        return 'The result of the product B1.';
    }

    /**
     * The variant, Product B1, is only able to work correctly with the variant,
     * Product A1. Nevertheless, it accepts any instance of AbstractProductA as
     * an argument.
     */
    public anotherUsefulFunctionB(collaborator: AbstractProductA): string {
        const result = collaborator.usefulFunctionA();
        return `The result of the B1 collaborating with the (${result})`;
    }
}

class ConcreteProductB2 implements AbstractProductB {
    public usefulFunctionB(): string {
        return 'The result of the product B2.';
    }

    /**
     * The variant, Product B2, is only able to work correctly with the variant,
     * Product A2. Nevertheless, it accepts any instance of AbstractProductA as
     * an argument.
     */
    public anotherUsefulFunctionB(collaborator: AbstractProductA): string {
        const result = collaborator.usefulFunctionA();
        return `The result of the B2 collaborating with the (${result})`;
    }
}

/**
 * The client code works with factories and products only through abstract
 * types: AbstractFactory and AbstractProduct. This lets you pass any factory or
 * product subclass to the client code without breaking it.
 */
function clientCode(factory: AbstractFactory) {
    const productA = factory.createProductA();
    const productB = factory.createProductB();

    console.log(productB.usefulFunctionB());
    console.log(productB.anotherUsefulFunctionB(productA));
}

/**
 * The client code can work with any concrete factory class.
 */
console.log('Client: Testing client code with the first factory type...');
clientCode(new ConcreteFactory1());

console.log('');

console.log('Client: Testing the same client code with the second factory type...');
clientCode(new ConcreteFactory2());
```

## Python Example

```python
from abc import ABC, abstractmethod


class AbstractProductA(ABC):
    @abstractmethod
    def useful_function_a(self) -> str:
        pass


class AbstractProductB(ABC):
    @abstractmethod
    def useful_function_b(self) -> str:
        pass

    @abstractmethod
    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        pass


class ConcreteProductA1(AbstractProductA):
    def useful_function_a(self) -> str:
        return "The result of the product A1."


class ConcreteProductA2(AbstractProductA):
    def useful_function_a(self) -> str:
        return "The result of the product A2."


class ConcreteProductB1(AbstractProductB):
    def useful_function_b(self) -> str:
        return "The result of the product B1."

    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        result = collaborator.useful_function_a()
        return f"The result of the B1 collaborating with the ({result})"


class ConcreteProductB2(AbstractProductB):
    def useful_function_b(self) -> str:
        return "The result of the product B2."

    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        result = collaborator.useful_function_a()
        return f"The result of the B2 collaborating with the ({result})"


class AbstractFactory(ABC):
    @abstractmethod
    def create_product_a(self) -> AbstractProductA:
        pass

    @abstractmethod
    def create_product_b(self) -> AbstractProductB:
        pass


class ConcreteFactory1(AbstractFactory):
    def create_product_a(self) -> AbstractProductA:
        return ConcreteProductA1()

    def create_product_b(self) -> AbstractProductB:
        return ConcreteProductB1()


class ConcreteFactory2(AbstractFactory):
    def create_product_a(self) -> AbstractProductA:
        return ConcreteProductA2()

    def create_product_b(self) -> AbstractProductB:
        return ConcreteProductB2()


def client_code(factory: AbstractFactory) -> None:
    product_a = factory.create_product_a()
    product_b = factory.create_product_b()
    print(product_b.useful_function_b())
    print(product_b.another_useful_function_b(product_a))


if __name__ == "__main__":
    print("Client: Testing client code with the first factory type...")
    client_code(ConcreteFactory1())
    print()
    print("Client: Testing the same client code with the second factory type...")
    client_code(ConcreteFactory2())
```

## Java Example

```java
// Each distinct product of a family has a base interface.
interface AbstractProductA {
    String usefulFunctionA();
}

interface AbstractProductB {
    String usefulFunctionB();
    String anotherUsefulFunctionB(AbstractProductA collaborator);
}

class ConcreteProductA1 implements AbstractProductA {
    public String usefulFunctionA() {
        return "The result of the product A1.";
    }
}

class ConcreteProductA2 implements AbstractProductA {
    public String usefulFunctionA() {
        return "The result of the product A2.";
    }
}

class ConcreteProductB1 implements AbstractProductB {
    public String usefulFunctionB() {
        return "The result of the product B1.";
    }
    public String anotherUsefulFunctionB(AbstractProductA collaborator) {
        return "The result of the B1 collaborating with the (" + collaborator.usefulFunctionA() + ")";
    }
}

class ConcreteProductB2 implements AbstractProductB {
    public String usefulFunctionB() {
        return "The result of the product B2.";
    }
    public String anotherUsefulFunctionB(AbstractProductA collaborator) {
        return "The result of the B2 collaborating with the (" + collaborator.usefulFunctionA() + ")";
    }
}

// The Abstract Factory declares methods that return each abstract product.
interface AbstractFactory {
    AbstractProductA createProductA();
    AbstractProductB createProductB();
}

class ConcreteFactory1 implements AbstractFactory {
    public AbstractProductA createProductA() {
        return new ConcreteProductA1();
    }
    public AbstractProductB createProductB() {
        return new ConcreteProductB1();
    }
}

class ConcreteFactory2 implements AbstractFactory {
    public AbstractProductA createProductA() {
        return new ConcreteProductA2();
    }
    public AbstractProductB createProductB() {
        return new ConcreteProductB2();
    }
}

public class Demo {
    static void clientCode(AbstractFactory factory) {
        AbstractProductA productA = factory.createProductA();
        AbstractProductB productB = factory.createProductB();
        System.out.println(productB.usefulFunctionB());
        System.out.println(productB.anotherUsefulFunctionB(productA));
    }

    public static void main(String[] args) {
        System.out.println("Client: Testing client code with the first factory type...");
        clientCode(new ConcreteFactory1());
        System.out.println();
        System.out.println("Client: Testing the same client code with the second factory type...");
        clientCode(new ConcreteFactory2());
    }
}
```

## C# Example

```csharp
using System;

// Each distinct product of a family has a base interface.
public interface IAbstractProductA
{
    string UsefulFunctionA();
}

public interface IAbstractProductB
{
    string UsefulFunctionB();
    string AnotherUsefulFunctionB(IAbstractProductA collaborator);
}

public class ConcreteProductA1 : IAbstractProductA
{
    public string UsefulFunctionA() => "The result of the product A1.";
}

public class ConcreteProductA2 : IAbstractProductA
{
    public string UsefulFunctionA() => "The result of the product A2.";
}

public class ConcreteProductB1 : IAbstractProductB
{
    public string UsefulFunctionB() => "The result of the product B1.";
    public string AnotherUsefulFunctionB(IAbstractProductA collaborator) =>
        "The result of the B1 collaborating with the (" + collaborator.UsefulFunctionA() + ")";
}

public class ConcreteProductB2 : IAbstractProductB
{
    public string UsefulFunctionB() => "The result of the product B2.";
    public string AnotherUsefulFunctionB(IAbstractProductA collaborator) =>
        "The result of the B2 collaborating with the (" + collaborator.UsefulFunctionA() + ")";
}

// The Abstract Factory declares methods that return each abstract product.
public interface IAbstractFactory
{
    IAbstractProductA CreateProductA();
    IAbstractProductB CreateProductB();
}

public class ConcreteFactory1 : IAbstractFactory
{
    public IAbstractProductA CreateProductA() => new ConcreteProductA1();
    public IAbstractProductB CreateProductB() => new ConcreteProductB1();
}

public class ConcreteFactory2 : IAbstractFactory
{
    public IAbstractProductA CreateProductA() => new ConcreteProductA2();
    public IAbstractProductB CreateProductB() => new ConcreteProductB2();
}

public class Program
{
    static void ClientCode(IAbstractFactory factory)
    {
        var productA = factory.CreateProductA();
        var productB = factory.CreateProductB();
        Console.WriteLine(productB.UsefulFunctionB());
        Console.WriteLine(productB.AnotherUsefulFunctionB(productA));
    }

    public static void Main()
    {
        Console.WriteLine("Client: Testing client code with the first factory type...");
        ClientCode(new ConcreteFactory1());
        Console.WriteLine();
        Console.WriteLine("Client: Testing the same client code with the second factory type...");
        ClientCode(new ConcreteFactory2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Each distinct product of a family has a base interface.
type AbstractProductA interface {
	UsefulFunctionA() string
}

type AbstractProductB interface {
	UsefulFunctionB() string
	AnotherUsefulFunctionB(collaborator AbstractProductA) string
}

type ConcreteProductA1 struct{}

func (p *ConcreteProductA1) UsefulFunctionA() string { return "The result of the product A1." }

type ConcreteProductA2 struct{}

func (p *ConcreteProductA2) UsefulFunctionA() string { return "The result of the product A2." }

type ConcreteProductB1 struct{}

func (p *ConcreteProductB1) UsefulFunctionB() string { return "The result of the product B1." }
func (p *ConcreteProductB1) AnotherUsefulFunctionB(c AbstractProductA) string {
	return "The result of the B1 collaborating with the (" + c.UsefulFunctionA() + ")"
}

type ConcreteProductB2 struct{}

func (p *ConcreteProductB2) UsefulFunctionB() string { return "The result of the product B2." }
func (p *ConcreteProductB2) AnotherUsefulFunctionB(c AbstractProductA) string {
	return "The result of the B2 collaborating with the (" + c.UsefulFunctionA() + ")"
}

// AbstractFactory declares methods that return each abstract product.
type AbstractFactory interface {
	CreateProductA() AbstractProductA
	CreateProductB() AbstractProductB
}

type ConcreteFactory1 struct{}

func (f *ConcreteFactory1) CreateProductA() AbstractProductA { return &ConcreteProductA1{} }
func (f *ConcreteFactory1) CreateProductB() AbstractProductB { return &ConcreteProductB1{} }

type ConcreteFactory2 struct{}

func (f *ConcreteFactory2) CreateProductA() AbstractProductA { return &ConcreteProductA2{} }
func (f *ConcreteFactory2) CreateProductB() AbstractProductB { return &ConcreteProductB2{} }

func clientCode(factory AbstractFactory) {
	productA := factory.CreateProductA()
	productB := factory.CreateProductB()
	fmt.Println(productB.UsefulFunctionB())
	fmt.Println(productB.AnotherUsefulFunctionB(productA))
}

func main() {
	fmt.Println("Client: Testing client code with the first factory type...")
	clientCode(&ConcreteFactory1{})
	fmt.Println()
	fmt.Println("Client: Testing the same client code with the second factory type...")
	clientCode(&ConcreteFactory2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// Each distinct product of a family has a base interface.
class AbstractProductA {
public:
    virtual ~AbstractProductA() = default;
    virtual std::string usefulFunctionA() const = 0;
};

class ConcreteProductA1 : public AbstractProductA {
public:
    std::string usefulFunctionA() const override { return "The result of the product A1."; }
};

class ConcreteProductA2 : public AbstractProductA {
public:
    std::string usefulFunctionA() const override { return "The result of the product A2."; }
};

class AbstractProductB {
public:
    virtual ~AbstractProductB() = default;
    virtual std::string usefulFunctionB() const = 0;
    virtual std::string anotherUsefulFunctionB(const AbstractProductA& collaborator) const = 0;
};

class ConcreteProductB1 : public AbstractProductB {
public:
    std::string usefulFunctionB() const override { return "The result of the product B1."; }
    std::string anotherUsefulFunctionB(const AbstractProductA& c) const override {
        return "The result of the B1 collaborating with the (" + c.usefulFunctionA() + ")";
    }
};

class ConcreteProductB2 : public AbstractProductB {
public:
    std::string usefulFunctionB() const override { return "The result of the product B2."; }
    std::string anotherUsefulFunctionB(const AbstractProductA& c) const override {
        return "The result of the B2 collaborating with the (" + c.usefulFunctionA() + ")";
    }
};

// The Abstract Factory declares methods that return each abstract product.
class AbstractFactory {
public:
    virtual ~AbstractFactory() = default;
    virtual std::unique_ptr<AbstractProductA> createProductA() const = 0;
    virtual std::unique_ptr<AbstractProductB> createProductB() const = 0;
};

class ConcreteFactory1 : public AbstractFactory {
public:
    std::unique_ptr<AbstractProductA> createProductA() const override {
        return std::make_unique<ConcreteProductA1>();
    }
    std::unique_ptr<AbstractProductB> createProductB() const override {
        return std::make_unique<ConcreteProductB1>();
    }
};

class ConcreteFactory2 : public AbstractFactory {
public:
    std::unique_ptr<AbstractProductA> createProductA() const override {
        return std::make_unique<ConcreteProductA2>();
    }
    std::unique_ptr<AbstractProductB> createProductB() const override {
        return std::make_unique<ConcreteProductB2>();
    }
};

void clientCode(const AbstractFactory& factory) {
    auto productA = factory.createProductA();
    auto productB = factory.createProductB();
    std::cout << productB->usefulFunctionB() << "\n";
    std::cout << productB->anotherUsefulFunctionB(*productA) << "\n";
}

int main() {
    std::cout << "Client: Testing client code with the first factory type...\n";
    clientCode(ConcreteFactory1());
    std::cout << "\n";
    std::cout << "Client: Testing the same client code with the second factory type...\n";
    clientCode(ConcreteFactory2());
    return 0;
}
```

## Rust Example

```rust
// Each distinct product of a family has a base trait.
trait AbstractProductA {
    fn useful_function_a(&self) -> String;
}

trait AbstractProductB {
    fn useful_function_b(&self) -> String;
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String;
}

struct ConcreteProductA1;
impl AbstractProductA for ConcreteProductA1 {
    fn useful_function_a(&self) -> String {
        "The result of the product A1.".to_string()
    }
}

struct ConcreteProductA2;
impl AbstractProductA for ConcreteProductA2 {
    fn useful_function_a(&self) -> String {
        "The result of the product A2.".to_string()
    }
}

struct ConcreteProductB1;
impl AbstractProductB for ConcreteProductB1 {
    fn useful_function_b(&self) -> String {
        "The result of the product B1.".to_string()
    }
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String {
        format!(
            "The result of the B1 collaborating with the ({})",
            collaborator.useful_function_a()
        )
    }
}

struct ConcreteProductB2;
impl AbstractProductB for ConcreteProductB2 {
    fn useful_function_b(&self) -> String {
        "The result of the product B2.".to_string()
    }
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String {
        format!(
            "The result of the B2 collaborating with the ({})",
            collaborator.useful_function_a()
        )
    }
}

// The Abstract Factory declares methods that return each abstract product.
trait AbstractFactory {
    fn create_product_a(&self) -> Box<dyn AbstractProductA>;
    fn create_product_b(&self) -> Box<dyn AbstractProductB>;
}

struct ConcreteFactory1;
impl AbstractFactory for ConcreteFactory1 {
    fn create_product_a(&self) -> Box<dyn AbstractProductA> { Box::new(ConcreteProductA1) }
    fn create_product_b(&self) -> Box<dyn AbstractProductB> { Box::new(ConcreteProductB1) }
}

struct ConcreteFactory2;
impl AbstractFactory for ConcreteFactory2 {
    fn create_product_a(&self) -> Box<dyn AbstractProductA> { Box::new(ConcreteProductA2) }
    fn create_product_b(&self) -> Box<dyn AbstractProductB> { Box::new(ConcreteProductB2) }
}

fn client_code(factory: &dyn AbstractFactory) {
    let product_a = factory.create_product_a();
    let product_b = factory.create_product_b();
    println!("{}", product_b.useful_function_b());
    println!("{}", product_b.another_useful_function_b(product_a.as_ref()));
}

fn main() {
    println!("Client: Testing client code with the first factory type...");
    client_code(&ConcreteFactory1);
    println!();
    println!("Client: Testing the same client code with the second factory type...");
    client_code(&ConcreteFactory2);
}
```

## Pairs well with

Factory Method (each factory method inside an Abstract Factory is itself a Factory Method); Singleton (concrete factory
often instantiated once and reused).
