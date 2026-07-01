---
name: Mediator
category: Behavioral
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/mediator/typescript/example
---

# Mediator

## Intent

Mediator is a behavioral design pattern that lets you reduce chaotic dependencies between objects. It accomplishes this
by restricting direct communication and forcing collaboration through a mediator object instead.

## Applicability

- Classes are tightly coupled to many others, making changes difficult without affecting the entire system
- You need to reuse components in different programs but they're overly dependent on other classes
- You're creating numerous component subclasses just to handle different interaction contexts

## Pros

- Extracts relationships between classes into a separate mediator, making the system easier to understand and maintain
- Allows introducing new mediators without modifying actual components
- Reduces coupling between program components, improving modularity
- Enables easier reuse of individual components across different applications

## Cons

- Over time, a mediator can evolve into a "God Object" that becomes overly complex and difficult to manage

## Don't use when

- Two components only talk to each other → just let them
- You'd be introducing a mediator with one method that calls one component → premature
- Observer or event bus already does what you need → those are simpler

## TypeScript Example

```typescript
/**
 * The Mediator interface declares a method used by components to notify the
 * mediator about various events. The Mediator may react to these events and
 * pass the execution to other components.
 */
interface Mediator {
    notify(sender: object, event: string): void;
}

/**
 * Concrete Mediators implement cooperative behavior by coordinating several
 * components.
 */
class ConcreteMediator implements Mediator {
    private component1: Component1;

    private component2: Component2;

    constructor(c1: Component1, c2: Component2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }

    public notify(sender: object, event: string): void {
        if (event === 'A') {
            console.log('Mediator reacts on A and triggers following operations:');
            this.component2.doC();
        }

        if (event === 'D') {
            console.log('Mediator reacts on D and triggers following operations:');
            this.component1.doB();
            this.component2.doC();
        }
    }
}

/**
 * The Base Component provides the basic functionality of storing a mediator's
 * instance inside component objects.
 */
class BaseComponent {
    protected mediator: Mediator;

    constructor(mediator?: Mediator) {
        this.mediator = mediator!;
    }

    public setMediator(mediator: Mediator): void {
        this.mediator = mediator;
    }
}

/**
 * Concrete Components implement various functionality. They don't depend on
 * other components. They also don't depend on any concrete mediator classes.
 */
class Component1 extends BaseComponent {
    public doA(): void {
        console.log('Component 1 does A.');
        this.mediator.notify(this, 'A');
    }

    public doB(): void {
        console.log('Component 1 does B.');
        this.mediator.notify(this, 'B');
    }
}

class Component2 extends BaseComponent {
    public doC(): void {
        console.log('Component 2 does C.');
        this.mediator.notify(this, 'C');
    }

    public doD(): void {
        console.log('Component 2 does D.');
        this.mediator.notify(this, 'D');
    }
}

/**
 * The client code.
 */
const c1 = new Component1();
const c2 = new Component2();
const mediator = new ConcreteMediator(c1, c2);

console.log('Client triggers operation A.');
c1.doA();

console.log('');
console.log('Client triggers operation D.');
c2.doD();
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Mediator(ABC):
    @abstractmethod
    def notify(self, sender: object, event: str) -> None:
        ...


class ConcreteMediator(Mediator):
    def __init__(self, c1: Component1, c2: Component2) -> None:
        self._component1 = c1
        self._component1.mediator = self
        self._component2 = c2
        self._component2.mediator = self

    def notify(self, sender: object, event: str) -> None:
        if event == "A":
            print("Mediator reacts on A and triggers following operations:")
            self._component2.do_c()
        elif event == "D":
            print("Mediator reacts on D and triggers following operations:")
            self._component1.do_b()
            self._component2.do_c()


class BaseComponent:
    def __init__(self, mediator: Mediator | None = None) -> None:
        self._mediator = mediator

    @property
    def mediator(self) -> Mediator:
        return self._mediator

    @mediator.setter
    def mediator(self, mediator: Mediator) -> None:
        self._mediator = mediator


class Component1(BaseComponent):
    def do_a(self) -> None:
        print("Component 1 does A.")
        self.mediator.notify(self, "A")

    def do_b(self) -> None:
        print("Component 1 does B.")
        self.mediator.notify(self, "B")


class Component2(BaseComponent):
    def do_c(self) -> None:
        print("Component 2 does C.")
        self.mediator.notify(self, "C")

    def do_d(self) -> None:
        print("Component 2 does D.")
        self.mediator.notify(self, "D")


if __name__ == "__main__":
    c1 = Component1()
    c2 = Component2()
    ConcreteMediator(c1, c2)

    print("Client triggers operation A.")
    c1.do_a()

    print("\nClient triggers operation D.")
    c2.do_d()
```

## Java Example

```java
interface Mediator {
    void notify(Object sender, String event);
}

class ConcreteMediator implements Mediator {
    private final Component1 component1;
    private final Component2 component2;

    public ConcreteMediator(Component1 c1, Component2 c2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }

    @Override
    public void notify(Object sender, String event) {
        if (event.equals("A")) {
            System.out.println("Mediator reacts on A and triggers following operations:");
            component2.doC();
        } else if (event.equals("D")) {
            System.out.println("Mediator reacts on D and triggers following operations:");
            component1.doB();
            component2.doC();
        }
    }
}

abstract class BaseComponent {
    protected Mediator mediator;

    public void setMediator(Mediator mediator) {
        this.mediator = mediator;
    }
}

class Component1 extends BaseComponent {
    public void doA() {
        System.out.println("Component 1 does A.");
        mediator.notify(this, "A");
    }

    public void doB() {
        System.out.println("Component 1 does B.");
        mediator.notify(this, "B");
    }
}

class Component2 extends BaseComponent {
    public void doC() {
        System.out.println("Component 2 does C.");
        mediator.notify(this, "C");
    }

    public void doD() {
        System.out.println("Component 2 does D.");
        mediator.notify(this, "D");
    }
}

public class Demo {
    public static void main(String[] args) {
        Component1 c1 = new Component1();
        Component2 c2 = new Component2();
        new ConcreteMediator(c1, c2);

        System.out.println("Client triggers operation A.");
        c1.doA();

        System.out.println("\nClient triggers operation D.");
        c2.doD();
    }
}
```

## C# Example

```csharp
using System;

interface IMediator
{
    void Notify(object sender, string ev);
}

class ConcreteMediator : IMediator
{
    private readonly Component1 _component1;
    private readonly Component2 _component2;

    public ConcreteMediator(Component1 c1, Component2 c2)
    {
        _component1 = c1;
        _component1.Mediator = this;
        _component2 = c2;
        _component2.Mediator = this;
    }

    public void Notify(object sender, string ev)
    {
        if (ev == "A")
        {
            Console.WriteLine("Mediator reacts on A and triggers following operations:");
            _component2.DoC();
        }
        else if (ev == "D")
        {
            Console.WriteLine("Mediator reacts on D and triggers following operations:");
            _component1.DoB();
            _component2.DoC();
        }
    }
}

abstract class BaseComponent
{
    public IMediator Mediator { get; set; }
}

class Component1 : BaseComponent
{
    public void DoA()
    {
        Console.WriteLine("Component 1 does A.");
        Mediator.Notify(this, "A");
    }

    public void DoB()
    {
        Console.WriteLine("Component 1 does B.");
        Mediator.Notify(this, "B");
    }
}

class Component2 : BaseComponent
{
    public void DoC()
    {
        Console.WriteLine("Component 2 does C.");
        Mediator.Notify(this, "C");
    }

    public void DoD()
    {
        Console.WriteLine("Component 2 does D.");
        Mediator.Notify(this, "D");
    }
}

class Program
{
    static void Main()
    {
        var c1 = new Component1();
        var c2 = new Component2();
        _ = new ConcreteMediator(c1, c2);

        Console.WriteLine("Client triggers operation A.");
        c1.DoA();

        Console.WriteLine("\nClient triggers operation D.");
        c2.DoD();
    }
}
```

## Go Example

```go
package main

import "fmt"

type Mediator interface {
	Notify(sender any, event string)
}

type ConcreteMediator struct {
	component1 *Component1
	component2 *Component2
}

func NewConcreteMediator(c1 *Component1, c2 *Component2) *ConcreteMediator {
	m := &ConcreteMediator{component1: c1, component2: c2}
	c1.mediator = m
	c2.mediator = m
	return m
}

func (m *ConcreteMediator) Notify(sender any, event string) {
	switch event {
	case "A":
		fmt.Println("Mediator reacts on A and triggers following operations:")
		m.component2.DoC()
	case "D":
		fmt.Println("Mediator reacts on D and triggers following operations:")
		m.component1.DoB()
		m.component2.DoC()
	}
}

type Component1 struct {
	mediator Mediator
}

func (c *Component1) DoA() {
	fmt.Println("Component 1 does A.")
	c.mediator.Notify(c, "A")
}

func (c *Component1) DoB() {
	fmt.Println("Component 1 does B.")
	c.mediator.Notify(c, "B")
}

type Component2 struct {
	mediator Mediator
}

func (c *Component2) DoC() {
	fmt.Println("Component 2 does C.")
	c.mediator.Notify(c, "C")
}

func (c *Component2) DoD() {
	fmt.Println("Component 2 does D.")
	c.mediator.Notify(c, "D")
}

func main() {
	c1 := &Component1{}
	c2 := &Component2{}
	NewConcreteMediator(c1, c2)

	fmt.Println("Client triggers operation A.")
	c1.DoA()

	fmt.Println("\nClient triggers operation D.")
	c2.DoD()
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>

class Component1;
class Component2;

class Mediator {
public:
    virtual ~Mediator() = default;
    virtual void Notify(const std::string& event) = 0;
};

class BaseComponent {
protected:
    Mediator* mediator_ = nullptr;
public:
    void SetMediator(Mediator* mediator) { mediator_ = mediator; }
};

class Component1 : public BaseComponent {
public:
    void DoA() {
        std::cout << "Component 1 does A.\n";
        mediator_->Notify("A");
    }
    void DoB() {
        std::cout << "Component 1 does B.\n";
        mediator_->Notify("B");
    }
};

class Component2 : public BaseComponent {
public:
    void DoC() {
        std::cout << "Component 2 does C.\n";
        mediator_->Notify("C");
    }
    void DoD() {
        std::cout << "Component 2 does D.\n";
        mediator_->Notify("D");
    }
};

class ConcreteMediator : public Mediator {
    Component1* component1_;
    Component2* component2_;
public:
    ConcreteMediator(Component1* c1, Component2* c2)
        : component1_(c1), component2_(c2) {
        component1_->SetMediator(this);
        component2_->SetMediator(this);
    }
    void Notify(const std::string& event) override {
        if (event == "A") {
            std::cout << "Mediator reacts on A and triggers following operations:\n";
            component2_->DoC();
        } else if (event == "D") {
            std::cout << "Mediator reacts on D and triggers following operations:\n";
            component1_->DoB();
            component2_->DoC();
        }
    }
};

int main() {
    Component1 c1;
    Component2 c2;
    ConcreteMediator mediator(&c1, &c2);

    std::cout << "Client triggers operation A.\n";
    c1.DoA();

    std::cout << "\nClient triggers operation D.\n";
    c2.DoD();
}
```

## Rust Example

```rust
use std::cell::RefCell;
use std::rc::Rc;

trait Mediator {
    fn notify(&self, event: &str);
}

#[derive(Default)]
struct Component1 {
    mediator: RefCell<Option<Rc<ConcreteMediator>>>,
}

impl Component1 {
    fn do_a(&self) {
        println!("Component 1 does A.");
        self.mediator.borrow().as_ref().unwrap().notify("A");
    }
    fn do_b(&self) {
        println!("Component 1 does B.");
    }
}

#[derive(Default)]
struct Component2 {
    mediator: RefCell<Option<Rc<ConcreteMediator>>>,
}

impl Component2 {
    fn do_c(&self) {
        println!("Component 2 does C.");
    }
    fn do_d(&self) {
        println!("Component 2 does D.");
        self.mediator.borrow().as_ref().unwrap().notify("D");
    }
}

struct ConcreteMediator {
    component1: Rc<Component1>,
    component2: Rc<Component2>,
}

impl Mediator for ConcreteMediator {
    fn notify(&self, event: &str) {
        match event {
            "A" => {
                println!("Mediator reacts on A and triggers following operations:");
                self.component2.do_c();
            }
            "D" => {
                println!("Mediator reacts on D and triggers following operations:");
                self.component1.do_b();
                self.component2.do_c();
            }
            _ => {}
        }
    }
}

fn main() {
    let c1 = Rc::new(Component1::default());
    let c2 = Rc::new(Component2::default());
    let mediator = Rc::new(ConcreteMediator {
        component1: Rc::clone(&c1),
        component2: Rc::clone(&c2),
    });
    *c1.mediator.borrow_mut() = Some(Rc::clone(&mediator));
    *c2.mediator.borrow_mut() = Some(Rc::clone(&mediator));

    println!("Client triggers operation A.");
    c1.do_a();

    println!("\nClient triggers operation D.");
    c2.do_d();
}
```

## Pairs well with

Facade (both simplify interaction; Facade is one-way, Mediator is bidirectional); Observer (Mediator often dispatches
via Observer to components).
