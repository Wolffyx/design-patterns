---
name: Builder
category: Creational
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/builder/typescript/example
---

# Builder

## Intent

Builder is a creational design pattern that lets you construct complex objects step by step. It enables producing
different object types and representations through the same construction code.

## Applicability

- Use Builder to eliminate "telescoping constructors" with numerous optional parameters
- Use it when creating different representations of a product with similar construction steps
- Apply it to construct complex object trees or Composite structures incrementally
- Use Builder when you need to defer execution of certain construction steps
- Apply it when various product representations require extensive configuration

## Pros

- Construct objects progressively, defer steps, or execute them recursively
- Reuse identical construction code across different product variations
- Isolates intricate assembly logic from product business logic, supporting Single Responsibility Principle

## Cons

- Overall code complexity increases due to creating multiple new classes
- Introduces architectural overhead for simpler object constructions

## Don't use when

- Constructor takes ≤4 args and they are all required → just use a constructor
- Object has no optional or step-wise configuration → unnecessary
- A simple object literal `{ a, b, c }` would do the job

## TypeScript Example

```typescript
/**
 * The Builder interface specifies methods for creating the different parts of
 * the Product objects.
 */
interface Builder {
    producePartA(): void;

    producePartB(): void;

    producePartC(): void;
}

/**
 * The Concrete Builder classes follow the Builder interface and provide
 * specific implementations of the building steps. Your program may have several
 * variations of Builders, implemented differently.
 */
class ConcreteBuilder1 implements Builder {
    private product: Product1;

    /**
     * A fresh builder instance should contain a blank product object, which is
     * used in further assembly.
     */
    constructor() {
        this.reset();
    }

    public reset(): void {
        this.product = new Product1();
    }

    /**
     * All production steps work with the same product instance.
     */
    public producePartA(): void {
        this.product.parts.push('PartA1');
    }

    public producePartB(): void {
        this.product.parts.push('PartB1');
    }

    public producePartC(): void {
        this.product.parts.push('PartC1');
    }

    /**
     * Concrete Builders are supposed to provide their own methods for
     * retrieving results. That's because various types of builders may create
     * entirely different products that don't follow the same interface.
     * Therefore, such methods cannot be declared in the base Builder interface
     * (at least in a statically typed programming language).
     *
     * Usually, after returning the end result to the client, a builder instance
     * is expected to be ready to start producing another product. That's why
     * it's a usual practice to call the reset method at the end of the
     * `getProduct` method body. However, this behavior is not mandatory, and
     * you can make your builders wait for an explicit reset call from the
     * client code before disposing of the previous result.
     */
    public getProduct(): Product1 {
        const result = this.product;
        this.reset();
        return result;
    }
}

/**
 * It makes sense to use the Builder pattern only when your products are quite
 * complex and require extensive configuration.
 *
 * Unlike in other creational patterns, different concrete builders can produce
 * unrelated products. In other words, results of various builders may not
 * always follow the same interface.
 */
class Product1 {
    public parts: string[] = [];

    public listParts(): void {
        console.log(`Product parts: ${this.parts.join(', ')}\n`);
    }
}

/**
 * The Director is only responsible for executing the building steps in a
 * particular sequence. It is helpful when producing products according to a
 * specific order or configuration. Strictly speaking, the Director class is
 * optional, since the client can control builders directly.
 */
class Director {
    private builder: Builder;

    /**
     * The Director works with any builder instance that the client code passes
     * to it. This way, the client code may alter the final type of the newly
     * assembled product.
     */
    public setBuilder(builder: Builder): void {
        this.builder = builder;
    }

    /**
     * The Director can construct several product variations using the same
     * building steps.
     */
    public buildMinimalViableProduct(): void {
        this.builder.producePartA();
    }

    public buildFullFeaturedProduct(): void {
        this.builder.producePartA();
        this.builder.producePartB();
        this.builder.producePartC();
    }
}

/**
 * The client code creates a builder object, passes it to the director and then
 * initiates the construction process. The end result is retrieved from the
 * builder object.
 */
function clientCode(director: Director) {
    const builder = new ConcreteBuilder1();
    director.setBuilder(builder);

    console.log('Standard basic product:');
    director.buildMinimalViableProduct();
    builder.getProduct().listParts();

    console.log('Standard full featured product:');
    director.buildFullFeaturedProduct();
    builder.getProduct().listParts();

    // Remember, the Builder pattern can be used without a Director class.
    console.log('Custom product:');
    builder.producePartA();
    builder.producePartC();
    builder.getProduct().listParts();
}

const director = new Director();
clientCode(director);
```

## Python Example

```python
from abc import ABC, abstractmethod
from typing import List


class Product1:
    """The complex object under construction."""

    def __init__(self) -> None:
        self.parts: List[str] = []

    def list_parts(self) -> None:
        print(f"Product parts: {', '.join(self.parts)}\n")


class Builder(ABC):
    @abstractmethod
    def produce_part_a(self) -> None:
        pass

    @abstractmethod
    def produce_part_b(self) -> None:
        pass

    @abstractmethod
    def produce_part_c(self) -> None:
        pass


class ConcreteBuilder1(Builder):
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._product = Product1()

    def produce_part_a(self) -> None:
        self._product.parts.append("PartA1")

    def produce_part_b(self) -> None:
        self._product.parts.append("PartB1")

    def produce_part_c(self) -> None:
        self._product.parts.append("PartC1")

    def get_product(self) -> Product1:
        product = self._product
        self.reset()
        return product


class Director:
    """Executes the building steps in a particular sequence."""

    def __init__(self) -> None:
        self._builder: Builder = None

    def set_builder(self, builder: Builder) -> None:
        self._builder = builder

    def build_minimal_viable_product(self) -> None:
        self._builder.produce_part_a()

    def build_full_featured_product(self) -> None:
        self._builder.produce_part_a()
        self._builder.produce_part_b()
        self._builder.produce_part_c()


def client_code(director: Director) -> None:
    builder = ConcreteBuilder1()
    director.set_builder(builder)

    print("Standard basic product:")
    director.build_minimal_viable_product()
    builder.get_product().list_parts()

    print("Standard full featured product:")
    director.build_full_featured_product()
    builder.get_product().list_parts()

    # The Builder pattern can be used without a Director class.
    print("Custom product:")
    builder.produce_part_a()
    builder.produce_part_c()
    builder.get_product().list_parts()


if __name__ == "__main__":
    client_code(Director())
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;

// The complex object under construction.
class Product1 {
    public List<String> parts = new ArrayList<>();

    public void listParts() {
        System.out.println("Product parts: " + String.join(", ", parts) + "\n");
    }
}

// The Builder interface specifies methods for creating the parts of a product.
interface Builder {
    void producePartA();
    void producePartB();
    void producePartC();
}

class ConcreteBuilder1 implements Builder {
    private Product1 product;

    public ConcreteBuilder1() {
        reset();
    }

    public void reset() {
        product = new Product1();
    }

    public void producePartA() {
        product.parts.add("PartA1");
    }

    public void producePartB() {
        product.parts.add("PartB1");
    }

    public void producePartC() {
        product.parts.add("PartC1");
    }

    public Product1 getProduct() {
        Product1 result = product;
        reset();
        return result;
    }
}

// The Director executes building steps in a particular sequence.
class Director {
    private Builder builder;

    public void setBuilder(Builder builder) {
        this.builder = builder;
    }

    public void buildMinimalViableProduct() {
        builder.producePartA();
    }

    public void buildFullFeaturedProduct() {
        builder.producePartA();
        builder.producePartB();
        builder.producePartC();
    }
}

public class Demo {
    static void clientCode(Director director) {
        ConcreteBuilder1 builder = new ConcreteBuilder1();
        director.setBuilder(builder);

        System.out.println("Standard basic product:");
        director.buildMinimalViableProduct();
        builder.getProduct().listParts();

        System.out.println("Standard full featured product:");
        director.buildFullFeaturedProduct();
        builder.getProduct().listParts();

        System.out.println("Custom product:");
        builder.producePartA();
        builder.producePartC();
        builder.getProduct().listParts();
    }

    public static void main(String[] args) {
        clientCode(new Director());
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The complex object under construction.
public class Product1
{
    public List<string> Parts = new List<string>();

    public void ListParts()
    {
        Console.WriteLine("Product parts: " + string.Join(", ", Parts) + "\n");
    }
}

// The Builder interface specifies methods for creating the parts of a product.
public interface IBuilder
{
    void ProducePartA();
    void ProducePartB();
    void ProducePartC();
}

public class ConcreteBuilder1 : IBuilder
{
    private Product1 _product = new Product1();

    public ConcreteBuilder1() => Reset();

    public void Reset() => _product = new Product1();

    public void ProducePartA() => _product.Parts.Add("PartA1");
    public void ProducePartB() => _product.Parts.Add("PartB1");
    public void ProducePartC() => _product.Parts.Add("PartC1");

    public Product1 GetProduct()
    {
        var result = _product;
        Reset();
        return result;
    }
}

// The Director executes building steps in a particular sequence.
public class Director
{
    private IBuilder _builder;

    public void SetBuilder(IBuilder builder) => _builder = builder;

    public void BuildMinimalViableProduct() => _builder.ProducePartA();

    public void BuildFullFeaturedProduct()
    {
        _builder.ProducePartA();
        _builder.ProducePartB();
        _builder.ProducePartC();
    }
}

public class Program
{
    static void ClientCode(Director director)
    {
        var builder = new ConcreteBuilder1();
        director.SetBuilder(builder);

        Console.WriteLine("Standard basic product:");
        director.BuildMinimalViableProduct();
        builder.GetProduct().ListParts();

        Console.WriteLine("Standard full featured product:");
        director.BuildFullFeaturedProduct();
        builder.GetProduct().ListParts();

        Console.WriteLine("Custom product:");
        builder.ProducePartA();
        builder.ProducePartC();
        builder.GetProduct().ListParts();
    }

    public static void Main()
    {
        ClientCode(new Director());
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

// Product1 is the complex object under construction.
type Product1 struct {
	parts []string
}

func (p *Product1) ListParts() {
	fmt.Printf("Product parts: %s\n\n", strings.Join(p.parts, ", "))
}

// Builder specifies methods for creating the parts of a product.
type Builder interface {
	ProducePartA()
	ProducePartB()
	ProducePartC()
}

type ConcreteBuilder1 struct {
	product *Product1
}

func NewConcreteBuilder1() *ConcreteBuilder1 {
	b := &ConcreteBuilder1{}
	b.Reset()
	return b
}

func (b *ConcreteBuilder1) Reset() {
	b.product = &Product1{}
}

func (b *ConcreteBuilder1) ProducePartA() {
	b.product.parts = append(b.product.parts, "PartA1")
}

func (b *ConcreteBuilder1) ProducePartB() {
	b.product.parts = append(b.product.parts, "PartB1")
}

func (b *ConcreteBuilder1) ProducePartC() {
	b.product.parts = append(b.product.parts, "PartC1")
}

func (b *ConcreteBuilder1) GetProduct() *Product1 {
	result := b.product
	b.Reset()
	return result
}

// Director executes building steps in a particular sequence.
type Director struct {
	builder Builder
}

func (d *Director) SetBuilder(builder Builder) {
	d.builder = builder
}

func (d *Director) BuildMinimalViableProduct() {
	d.builder.ProducePartA()
}

func (d *Director) BuildFullFeaturedProduct() {
	d.builder.ProducePartA()
	d.builder.ProducePartB()
	d.builder.ProducePartC()
}

func clientCode(director *Director) {
	builder := NewConcreteBuilder1()
	director.SetBuilder(builder)

	fmt.Println("Standard basic product:")
	director.BuildMinimalViableProduct()
	builder.GetProduct().ListParts()

	fmt.Println("Standard full featured product:")
	director.BuildFullFeaturedProduct()
	builder.GetProduct().ListParts()

	fmt.Println("Custom product:")
	builder.ProducePartA()
	builder.ProducePartC()
	builder.GetProduct().ListParts()
}

func main() {
	clientCode(&Director{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The complex object under construction.
class Product1 {
public:
    std::vector<std::string> parts;

    void listParts() const {
        std::cout << "Product parts: ";
        for (size_t i = 0; i < parts.size(); ++i) {
            std::cout << parts[i];
            if (i + 1 < parts.size()) std::cout << ", ";
        }
        std::cout << "\n\n";
    }
};

// The Builder interface specifies methods for creating the parts of a product.
class Builder {
public:
    virtual ~Builder() = default;
    virtual void producePartA() = 0;
    virtual void producePartB() = 0;
    virtual void producePartC() = 0;
};

class ConcreteBuilder1 : public Builder {
    std::unique_ptr<Product1> product;

public:
    ConcreteBuilder1() { reset(); }

    void reset() { product = std::make_unique<Product1>(); }

    void producePartA() override { product->parts.push_back("PartA1"); }
    void producePartB() override { product->parts.push_back("PartB1"); }
    void producePartC() override { product->parts.push_back("PartC1"); }

    std::unique_ptr<Product1> getProduct() {
        auto result = std::move(product);
        reset();
        return result;
    }
};

// The Director executes building steps in a particular sequence.
class Director {
    Builder* builder = nullptr;

public:
    void setBuilder(Builder* b) { builder = b; }

    void buildMinimalViableProduct() { builder->producePartA(); }

    void buildFullFeaturedProduct() {
        builder->producePartA();
        builder->producePartB();
        builder->producePartC();
    }
};

void clientCode(Director& director) {
    ConcreteBuilder1 builder;
    director.setBuilder(&builder);

    std::cout << "Standard basic product:\n";
    director.buildMinimalViableProduct();
    builder.getProduct()->listParts();

    std::cout << "Standard full featured product:\n";
    director.buildFullFeaturedProduct();
    builder.getProduct()->listParts();

    std::cout << "Custom product:\n";
    builder.producePartA();
    builder.producePartC();
    builder.getProduct()->listParts();
}

int main() {
    Director director;
    clientCode(director);
    return 0;
}
```

## Rust Example

```rust
// The complex object under construction.
#[derive(Default)]
struct Product1 {
    parts: Vec<String>,
}

impl Product1 {
    fn list_parts(&self) {
        println!("Product parts: {}\n", self.parts.join(", "));
    }
}

// The Builder trait specifies methods for creating the parts of a product.
trait Builder {
    fn produce_part_a(&mut self);
    fn produce_part_b(&mut self);
    fn produce_part_c(&mut self);
}

#[derive(Default)]
struct ConcreteBuilder1 {
    product: Product1,
}

impl ConcreteBuilder1 {
    fn new() -> Self {
        Self::default()
    }

    fn reset(&mut self) {
        self.product = Product1::default();
    }

    // Returns the built product and resets for the next build.
    fn get_product(&mut self) -> Product1 {
        std::mem::take(&mut self.product)
    }
}

impl Builder for ConcreteBuilder1 {
    fn produce_part_a(&mut self) {
        self.product.parts.push("PartA1".to_string());
    }
    fn produce_part_b(&mut self) {
        self.product.parts.push("PartB1".to_string());
    }
    fn produce_part_c(&mut self) {
        self.product.parts.push("PartC1".to_string());
    }
}

// The Director executes building steps in a particular sequence.
#[derive(Default)]
struct Director;

impl Director {
    fn build_minimal_viable_product(&self, builder: &mut dyn Builder) {
        builder.produce_part_a();
    }

    fn build_full_featured_product(&self, builder: &mut dyn Builder) {
        builder.produce_part_a();
        builder.produce_part_b();
        builder.produce_part_c();
    }
}

fn main() {
    let director = Director;
    let mut builder = ConcreteBuilder1::new();

    println!("Standard basic product:");
    director.build_minimal_viable_product(&mut builder);
    builder.get_product().list_parts();

    println!("Standard full featured product:");
    director.build_full_featured_product(&mut builder);
    builder.get_product().list_parts();

    // The Builder pattern can be used without a Director.
    println!("Custom product:");
    builder.produce_part_a();
    builder.produce_part_c();
    builder.get_product().list_parts();
}
```

## Pairs well with

Composite (Builder constructs Composite trees); Abstract Factory (Builder may produce parts via an Abstract Factory);
Director (separates step ordering from build steps).
