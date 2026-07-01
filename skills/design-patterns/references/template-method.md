---
name: Template Method
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/template-method/typescript/example
---

# Template Method

## Intent

Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets
subclasses override specific steps of the algorithm without changing its structure.

## Applicability

- Let clients extend only particular steps of an algorithm, not the whole algorithm or its structure
- You have several classes containing nearly identical algorithms with minor variations, reducing the need to modify all
  classes when the algorithm changes
- Pull up common algorithm steps into a superclass while keeping varying implementations in subclasses

## Pros

- Clients can customize only specific parts of a large algorithm, reducing their exposure to unrelated changes
- Duplicate code can be consolidated into the base class
- The algorithm structure remains consistent across all implementations

## Cons

- Some clients may find the provided algorithm skeleton too restrictive
- Subclasses might violate the Liskov Substitution Principle by suppressing default step implementations
- Template methods become increasingly difficult to maintain as the number of steps grows

## Don't use when

- Steps are completely independent → use Strategy instead
- You only have one concrete subclass → just write the algorithm directly
- The "algorithm skeleton" is 3 lines → inheritance is overkill, use a function with callback parameters

## TypeScript Example

```typescript
/**
 * The Abstract Class defines a template method that contains a skeleton of some
 * algorithm, composed of calls to (usually) abstract primitive operations.
 *
 * Concrete subclasses should implement these operations, but leave the template
 * method itself intact.
 */
abstract class AbstractClass {
    /**
     * The template method defines the skeleton of an algorithm.
     */
    public templateMethod(): void {
        this.baseOperation1();
        this.requiredOperations1();
        this.baseOperation2();
        this.hook1();
        this.requiredOperation2();
        this.baseOperation3();
        this.hook2();
    }

    /**
     * These operations already have implementations.
     */
    protected baseOperation1(): void {
        console.log('AbstractClass says: I am doing the bulk of the work');
    }

    protected baseOperation2(): void {
        console.log('AbstractClass says: But I let subclasses override some operations');
    }

    protected baseOperation3(): void {
        console.log('AbstractClass says: But I am doing the bulk of the work anyway');
    }

    /**
     * These operations have to be implemented in subclasses.
     */
    protected abstract requiredOperations1(): void;

    protected abstract requiredOperation2(): void;

    /**
     * These are "hooks." Subclasses may override them, but it's not mandatory
     * since the hooks already have default (but empty) implementation. Hooks
     * provide additional extension points in some crucial places of the
     * algorithm.
     */
    protected hook1(): void { }

    protected hook2(): void { }
}

/**
 * Concrete classes have to implement all abstract operations of the base class.
 */
class ConcreteClass1 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass1 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass1 says: Implemented Operation2');
    }
}

/**
 * Usually, concrete classes override only a fraction of base class' operations.
 */
class ConcreteClass2 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass2 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass2 says: Implemented Operation2');
    }

    protected hook1(): void {
        console.log('ConcreteClass2 says: Overridden Hook1');
    }
}

/**
 * The client code calls the template method to execute the algorithm.
 */
function clientCode(abstractClass: AbstractClass) {
    abstractClass.templateMethod();
}

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass1());
console.log('');

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass2());
```

## Python Example

```python
from abc import ABC, abstractmethod


class AbstractClass(ABC):
    """Defines a template method with the skeleton of an algorithm."""

    def template_method(self) -> None:
        self.base_operation1()
        self.required_operations1()
        self.base_operation2()
        self.hook1()
        self.required_operation2()
        self.base_operation3()
        self.hook2()

    def base_operation1(self) -> None:
        print("AbstractClass says: I am doing the bulk of the work")

    def base_operation2(self) -> None:
        print("AbstractClass says: But I let subclasses override some operations")

    def base_operation3(self) -> None:
        print("AbstractClass says: But I am doing the bulk of the work anyway")

    @abstractmethod
    def required_operations1(self) -> None:
        pass

    @abstractmethod
    def required_operation2(self) -> None:
        pass

    # Hooks have empty default implementations; subclasses may override them.
    def hook1(self) -> None:
        pass

    def hook2(self) -> None:
        pass


class ConcreteClass1(AbstractClass):
    def required_operations1(self) -> None:
        print("ConcreteClass1 says: Implemented Operation1")

    def required_operation2(self) -> None:
        print("ConcreteClass1 says: Implemented Operation2")


class ConcreteClass2(AbstractClass):
    def required_operations1(self) -> None:
        print("ConcreteClass2 says: Implemented Operation1")

    def required_operation2(self) -> None:
        print("ConcreteClass2 says: Implemented Operation2")

    def hook1(self) -> None:
        print("ConcreteClass2 says: Overridden Hook1")


def client_code(abstract_class: AbstractClass) -> None:
    abstract_class.template_method()


if __name__ == "__main__":
    print("Same client code can work with different subclasses:")
    client_code(ConcreteClass1())
    print("")
    print("Same client code can work with different subclasses:")
    client_code(ConcreteClass2())
```

## Java Example

```java
// The Abstract Class defines a template method and its primitive operations.
abstract class AbstractClass {
    // The template method defines the skeleton of an algorithm.
    public final void templateMethod() {
        baseOperation1();
        requiredOperations1();
        baseOperation2();
        hook1();
        requiredOperation2();
        baseOperation3();
        hook2();
    }

    protected void baseOperation1() {
        System.out.println("AbstractClass says: I am doing the bulk of the work");
    }

    protected void baseOperation2() {
        System.out.println("AbstractClass says: But I let subclasses override some operations");
    }

    protected void baseOperation3() {
        System.out.println("AbstractClass says: But I am doing the bulk of the work anyway");
    }

    protected abstract void requiredOperations1();

    protected abstract void requiredOperation2();

    // Hooks: default (empty) implementations subclasses may override.
    protected void hook1() { }

    protected void hook2() { }
}

class ConcreteClass1 extends AbstractClass {
    protected void requiredOperations1() {
        System.out.println("ConcreteClass1 says: Implemented Operation1");
    }

    protected void requiredOperation2() {
        System.out.println("ConcreteClass1 says: Implemented Operation2");
    }
}

class ConcreteClass2 extends AbstractClass {
    protected void requiredOperations1() {
        System.out.println("ConcreteClass2 says: Implemented Operation1");
    }

    protected void requiredOperation2() {
        System.out.println("ConcreteClass2 says: Implemented Operation2");
    }

    protected void hook1() {
        System.out.println("ConcreteClass2 says: Overridden Hook1");
    }
}

public class Demo {
    static void clientCode(AbstractClass abstractClass) {
        abstractClass.templateMethod();
    }

    public static void main(String[] args) {
        System.out.println("Same client code can work with different subclasses:");
        clientCode(new ConcreteClass1());
        System.out.println("");
        System.out.println("Same client code can work with different subclasses:");
        clientCode(new ConcreteClass2());
    }
}
```

## C# Example

```csharp
using System;

// The Abstract Class defines a template method and its primitive operations.
abstract class AbstractClass
{
    // The template method defines the skeleton of an algorithm.
    public void TemplateMethod()
    {
        BaseOperation1();
        RequiredOperations1();
        BaseOperation2();
        Hook1();
        RequiredOperation2();
        BaseOperation3();
        Hook2();
    }

    protected void BaseOperation1() =>
        Console.WriteLine("AbstractClass says: I am doing the bulk of the work");

    protected void BaseOperation2() =>
        Console.WriteLine("AbstractClass says: But I let subclasses override some operations");

    protected void BaseOperation3() =>
        Console.WriteLine("AbstractClass says: But I am doing the bulk of the work anyway");

    protected abstract void RequiredOperations1();

    protected abstract void RequiredOperation2();

    // Hooks: virtual with empty defaults subclasses may override.
    protected virtual void Hook1() { }

    protected virtual void Hook2() { }
}

class ConcreteClass1 : AbstractClass
{
    protected override void RequiredOperations1() =>
        Console.WriteLine("ConcreteClass1 says: Implemented Operation1");

    protected override void RequiredOperation2() =>
        Console.WriteLine("ConcreteClass1 says: Implemented Operation2");
}

class ConcreteClass2 : AbstractClass
{
    protected override void RequiredOperations1() =>
        Console.WriteLine("ConcreteClass2 says: Implemented Operation1");

    protected override void RequiredOperation2() =>
        Console.WriteLine("ConcreteClass2 says: Implemented Operation2");

    protected override void Hook1() =>
        Console.WriteLine("ConcreteClass2 says: Overridden Hook1");
}

class Program
{
    static void ClientCode(AbstractClass abstractClass) => abstractClass.TemplateMethod();

    static void Main()
    {
        Console.WriteLine("Same client code can work with different subclasses:");
        ClientCode(new ConcreteClass1());
        Console.WriteLine("");
        Console.WriteLine("Same client code can work with different subclasses:");
        ClientCode(new ConcreteClass2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Go has no inheritance, so the varying steps are expressed as an interface and
// the template method is a plain function that calls those steps in order.
type Operations interface {
	BaseOperation1()
	RequiredOperations1()
	BaseOperation2()
	Hook1()
	RequiredOperation2()
	BaseOperation3()
	Hook2()
}

// templateMethod defines the skeleton of the algorithm.
func templateMethod(o Operations) {
	o.BaseOperation1()
	o.RequiredOperations1()
	o.BaseOperation2()
	o.Hook1()
	o.RequiredOperation2()
	o.BaseOperation3()
	o.Hook2()
}

// Base holds the shared step implementations, embedded by concrete structs.
type Base struct{}

func (Base) BaseOperation1() {
	fmt.Println("AbstractClass says: I am doing the bulk of the work")
}
func (Base) BaseOperation2() {
	fmt.Println("AbstractClass says: But I let subclasses override some operations")
}
func (Base) BaseOperation3() {
	fmt.Println("AbstractClass says: But I am doing the bulk of the work anyway")
}
func (Base) Hook1() {} // empty default hooks
func (Base) Hook2() {}

type ConcreteClass1 struct{ Base }

func (ConcreteClass1) RequiredOperations1() {
	fmt.Println("ConcreteClass1 says: Implemented Operation1")
}
func (ConcreteClass1) RequiredOperation2() {
	fmt.Println("ConcreteClass1 says: Implemented Operation2")
}

type ConcreteClass2 struct{ Base }

func (ConcreteClass2) RequiredOperations1() {
	fmt.Println("ConcreteClass2 says: Implemented Operation1")
}
func (ConcreteClass2) RequiredOperation2() {
	fmt.Println("ConcreteClass2 says: Implemented Operation2")
}
func (ConcreteClass2) Hook1() {
	fmt.Println("ConcreteClass2 says: Overridden Hook1")
}

func clientCode(o Operations) { templateMethod(o) }

func main() {
	fmt.Println("Same client code can work with different subclasses:")
	clientCode(ConcreteClass1{})
	fmt.Println("")
	fmt.Println("Same client code can work with different subclasses:")
	clientCode(ConcreteClass2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>

// The Abstract Class defines a template method and its primitive operations.
class AbstractClass {
public:
    virtual ~AbstractClass() = default;

    // The template method defines the skeleton of an algorithm.
    void TemplateMethod() const {
        BaseOperation1();
        RequiredOperations1();
        BaseOperation2();
        Hook1();
        RequiredOperation2();
        BaseOperation3();
        Hook2();
    }

protected:
    void BaseOperation1() const {
        std::cout << "AbstractClass says: I am doing the bulk of the work\n";
    }
    void BaseOperation2() const {
        std::cout << "AbstractClass says: But I let subclasses override some operations\n";
    }
    void BaseOperation3() const {
        std::cout << "AbstractClass says: But I am doing the bulk of the work anyway\n";
    }

    virtual void RequiredOperations1() const = 0;
    virtual void RequiredOperation2() const = 0;

    // Hooks: empty default implementations subclasses may override.
    virtual void Hook1() const {}
    virtual void Hook2() const {}
};

class ConcreteClass1 : public AbstractClass {
protected:
    void RequiredOperations1() const override {
        std::cout << "ConcreteClass1 says: Implemented Operation1\n";
    }
    void RequiredOperation2() const override {
        std::cout << "ConcreteClass1 says: Implemented Operation2\n";
    }
};

class ConcreteClass2 : public AbstractClass {
protected:
    void RequiredOperations1() const override {
        std::cout << "ConcreteClass2 says: Implemented Operation1\n";
    }
    void RequiredOperation2() const override {
        std::cout << "ConcreteClass2 says: Implemented Operation2\n";
    }
    void Hook1() const override {
        std::cout << "ConcreteClass2 says: Overridden Hook1\n";
    }
};

void ClientCode(const AbstractClass& abstractClass) {
    abstractClass.TemplateMethod();
}

int main() {
    std::cout << "Same client code can work with different subclasses:\n";
    ClientCode(*std::make_unique<ConcreteClass1>());
    std::cout << "\n";
    std::cout << "Same client code can work with different subclasses:\n";
    ClientCode(*std::make_unique<ConcreteClass2>());
    return 0;
}
```

## Rust Example

```rust
// The trait defines the template method plus its primitive operations. Default
// methods supply the shared steps and the empty hooks.
trait AbstractClass {
    // The template method defines the skeleton of an algorithm.
    fn template_method(&self) {
        self.base_operation1();
        self.required_operations1();
        self.base_operation2();
        self.hook1();
        self.required_operation2();
        self.base_operation3();
        self.hook2();
    }

    fn base_operation1(&self) {
        println!("AbstractClass says: I am doing the bulk of the work");
    }
    fn base_operation2(&self) {
        println!("AbstractClass says: But I let subclasses override some operations");
    }
    fn base_operation3(&self) {
        println!("AbstractClass says: But I am doing the bulk of the work anyway");
    }

    fn required_operations1(&self);
    fn required_operation2(&self);

    // Hooks: default (empty) implementations implementors may override.
    fn hook1(&self) {}
    fn hook2(&self) {}
}

struct ConcreteClass1;

impl AbstractClass for ConcreteClass1 {
    fn required_operations1(&self) {
        println!("ConcreteClass1 says: Implemented Operation1");
    }
    fn required_operation2(&self) {
        println!("ConcreteClass1 says: Implemented Operation2");
    }
}

struct ConcreteClass2;

impl AbstractClass for ConcreteClass2 {
    fn required_operations1(&self) {
        println!("ConcreteClass2 says: Implemented Operation1");
    }
    fn required_operation2(&self) {
        println!("ConcreteClass2 says: Implemented Operation2");
    }
    fn hook1(&self) {
        println!("ConcreteClass2 says: Overridden Hook1");
    }
}

fn client_code(abstract_class: &dyn AbstractClass) {
    abstract_class.template_method();
}

fn main() {
    println!("Same client code can work with different subclasses:");
    client_code(&ConcreteClass1);
    println!();
    println!("Same client code can work with different subclasses:");
    client_code(&ConcreteClass2);
}
```

## Pairs well with

Factory Method (Factory Method is itself a specialization of Template Method); Strategy (Strategy lets you change the
entire algorithm; Template Method only specific steps).
