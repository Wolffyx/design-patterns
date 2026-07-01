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

## Python Example

```python
from abc import ABC, abstractmethod


class Product(ABC):
    """Declares the operations that all concrete products must implement."""

    @abstractmethod
    def operation(self) -> str:
        pass


class ConcreteProduct1(Product):
    def operation(self) -> str:
        return "{Result of the ConcreteProduct1}"


class ConcreteProduct2(Product):
    def operation(self) -> str:
        return "{Result of the ConcreteProduct2}"


class Creator(ABC):
    """
    Declares the factory method that returns a Product. Subclasses provide the
    implementation. Note the Creator's primary responsibility is business logic,
    not creation.
    """

    @abstractmethod
    def factory_method(self) -> Product:
        pass

    def some_operation(self) -> str:
        product = self.factory_method()
        return f"Creator: The same creator's code has just worked with {product.operation()}"


class ConcreteCreator1(Creator):
    def factory_method(self) -> Product:
        return ConcreteProduct1()


class ConcreteCreator2(Creator):
    def factory_method(self) -> Product:
        return ConcreteProduct2()


def client_code(creator: Creator) -> None:
    print("Client: I'm not aware of the creator's class, but it still works.")
    print(creator.some_operation())


if __name__ == "__main__":
    print("App: Launched with the ConcreteCreator1.")
    client_code(ConcreteCreator1())
    print()
    print("App: Launched with the ConcreteCreator2.")
    client_code(ConcreteCreator2())
```

## Java Example

```java
// The Product interface declares the operations that all concrete products
// must implement.
interface Product {
    String operation();
}

class ConcreteProduct1 implements Product {
    public String operation() {
        return "{Result of the ConcreteProduct1}";
    }
}

class ConcreteProduct2 implements Product {
    public String operation() {
        return "{Result of the ConcreteProduct2}";
    }
}

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
abstract class Creator {
    public abstract Product factoryMethod();

    public String someOperation() {
        Product product = factoryMethod();
        return "Creator: The same creator's code has just worked with " + product.operation();
    }
}

class ConcreteCreator1 extends Creator {
    public Product factoryMethod() {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public Product factoryMethod() {
        return new ConcreteProduct2();
    }
}

public class Demo {
    static void clientCode(Creator creator) {
        System.out.println("Client: I'm not aware of the creator's class, but it still works.");
        System.out.println(creator.someOperation());
    }

    public static void main(String[] args) {
        System.out.println("App: Launched with the ConcreteCreator1.");
        clientCode(new ConcreteCreator1());
        System.out.println();
        System.out.println("App: Launched with the ConcreteCreator2.");
        clientCode(new ConcreteCreator2());
    }
}
```

## C# Example

```csharp
using System;

// The Product interface declares the operations that all concrete products
// must implement.
public interface IProduct
{
    string Operation();
}

public class ConcreteProduct1 : IProduct
{
    public string Operation() => "{Result of the ConcreteProduct1}";
}

public class ConcreteProduct2 : IProduct
{
    public string Operation() => "{Result of the ConcreteProduct2}";
}

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
public abstract class Creator
{
    public abstract IProduct FactoryMethod();

    public string SomeOperation()
    {
        var product = FactoryMethod();
        return "Creator: The same creator's code has just worked with " + product.Operation();
    }
}

public class ConcreteCreator1 : Creator
{
    public override IProduct FactoryMethod() => new ConcreteProduct1();
}

public class ConcreteCreator2 : Creator
{
    public override IProduct FactoryMethod() => new ConcreteProduct2();
}

public class Program
{
    static void ClientCode(Creator creator)
    {
        Console.WriteLine("Client: I'm not aware of the creator's class, but it still works.");
        Console.WriteLine(creator.SomeOperation());
    }

    public static void Main()
    {
        Console.WriteLine("App: Launched with the ConcreteCreator1.");
        ClientCode(new ConcreteCreator1());
        Console.WriteLine();
        Console.WriteLine("App: Launched with the ConcreteCreator2.");
        ClientCode(new ConcreteCreator2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Product declares the operations that all concrete products must implement.
type Product interface {
	Operation() string
}

type ConcreteProduct1 struct{}

func (p *ConcreteProduct1) Operation() string {
	return "{Result of the ConcreteProduct1}"
}

type ConcreteProduct2 struct{}

func (p *ConcreteProduct2) Operation() string {
	return "{Result of the ConcreteProduct2}"
}

// Creator declares the factory method. Concrete creators supply the product.
type Creator interface {
	FactoryMethod() Product
	SomeOperation() string
}

// baseCreator embeds the shared business logic that relies on the product.
type baseCreator struct {
	factory func() Product
}

func (c *baseCreator) SomeOperation() string {
	product := c.factory()
	return "Creator: The same creator's code has just worked with " + product.Operation()
}

type ConcreteCreator1 struct{ baseCreator }

func NewConcreteCreator1() *ConcreteCreator1 {
	c := &ConcreteCreator1{}
	c.factory = c.FactoryMethod
	return c
}

func (c *ConcreteCreator1) FactoryMethod() Product { return &ConcreteProduct1{} }

type ConcreteCreator2 struct{ baseCreator }

func NewConcreteCreator2() *ConcreteCreator2 {
	c := &ConcreteCreator2{}
	c.factory = c.FactoryMethod
	return c
}

func (c *ConcreteCreator2) FactoryMethod() Product { return &ConcreteProduct2{} }

func clientCode(creator Creator) {
	fmt.Println("Client: I'm not aware of the creator's class, but it still works.")
	fmt.Println(creator.SomeOperation())
}

func main() {
	fmt.Println("App: Launched with the ConcreteCreator1.")
	clientCode(NewConcreteCreator1())
	fmt.Println()
	fmt.Println("App: Launched with the ConcreteCreator2.")
	clientCode(NewConcreteCreator2())
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Product interface declares the operations that all concrete products
// must implement.
class Product {
public:
    virtual ~Product() = default;
    virtual std::string operation() const = 0;
};

class ConcreteProduct1 : public Product {
public:
    std::string operation() const override {
        return "{Result of the ConcreteProduct1}";
    }
};

class ConcreteProduct2 : public Product {
public:
    std::string operation() const override {
        return "{Result of the ConcreteProduct2}";
    }
};

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
class Creator {
public:
    virtual ~Creator() = default;
    virtual std::unique_ptr<Product> factoryMethod() const = 0;

    std::string someOperation() const {
        auto product = factoryMethod();
        return "Creator: The same creator's code has just worked with " + product->operation();
    }
};

class ConcreteCreator1 : public Creator {
public:
    std::unique_ptr<Product> factoryMethod() const override {
        return std::make_unique<ConcreteProduct1>();
    }
};

class ConcreteCreator2 : public Creator {
public:
    std::unique_ptr<Product> factoryMethod() const override {
        return std::make_unique<ConcreteProduct2>();
    }
};

void clientCode(const Creator& creator) {
    std::cout << "Client: I'm not aware of the creator's class, but it still works.\n";
    std::cout << creator.someOperation() << "\n";
}

int main() {
    std::cout << "App: Launched with the ConcreteCreator1.\n";
    clientCode(ConcreteCreator1());
    std::cout << "\n";
    std::cout << "App: Launched with the ConcreteCreator2.\n";
    clientCode(ConcreteCreator2());
    return 0;
}
```

## Rust Example

```rust
// The Product trait declares the operations that all concrete products must
// implement.
trait Product {
    fn operation(&self) -> String;
}

struct ConcreteProduct1;

impl Product for ConcreteProduct1 {
    fn operation(&self) -> String {
        "{Result of the ConcreteProduct1}".to_string()
    }
}

struct ConcreteProduct2;

impl Product for ConcreteProduct2 {
    fn operation(&self) -> String {
        "{Result of the ConcreteProduct2}".to_string()
    }
}

// The Creator declares the factory method that returns a Product. Implementors
// change the resulting product's type. some_operation holds the business logic.
trait Creator {
    fn factory_method(&self) -> Box<dyn Product>;

    fn some_operation(&self) -> String {
        let product = self.factory_method();
        format!(
            "Creator: The same creator's code has just worked with {}",
            product.operation()
        )
    }
}

struct ConcreteCreator1;

impl Creator for ConcreteCreator1 {
    fn factory_method(&self) -> Box<dyn Product> {
        Box::new(ConcreteProduct1)
    }
}

struct ConcreteCreator2;

impl Creator for ConcreteCreator2 {
    fn factory_method(&self) -> Box<dyn Product> {
        Box::new(ConcreteProduct2)
    }
}

fn client_code(creator: &dyn Creator) {
    println!("Client: I'm not aware of the creator's class, but it still works.");
    println!("{}", creator.some_operation());
}

fn main() {
    println!("App: Launched with the ConcreteCreator1.");
    client_code(&ConcreteCreator1);
    println!();
    println!("App: Launched with the ConcreteCreator2.");
    client_code(&ConcreteCreator2);
}
```

## Pairs well with

Often combined with Strategy (factory picks the concrete strategy) and Abstract Factory (when families of related
products are needed instead of a single one).
