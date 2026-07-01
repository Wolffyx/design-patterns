---
name: State
category: Behavioral
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/state/typescript/example
---

# State

## Intent

State is a behavioral design pattern that lets an object alter its behavior when its internal state changes. It appears
as if the object changed its class.

## Applicability

- An object behaves differently based on its current state and the number of states is substantial with frequently
  changing state-specific code
- A class contains massive conditionals that alter behavior according to field values
- Similar states and transitions cause duplicate code across a condition-based state machine

## Pros

- Organizes state-related code into separate classes, adhering to Single Responsibility Principle
- Introduces new states without modifying existing state classes or context, following Open/Closed Principle
- Eliminates bulky conditional statements from the context class

## Cons

- May be excessive if the state machine has only a few states or rarely changes

## Don't use when

- Only 2-3 states with minor differences → a simple `state: 'a' | 'b' | 'c'` field with switch is clearer
- States never share a common interface meaningfully → it's not really a state machine
- A `useState` hook or store flag does the job → no class needed

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients. It also maintains a
 * reference to an instance of a State subclass, which represents the current
 * state of the Context.
 */
class Context {
    /**
     * @type {State} A reference to the current state of the Context.
     */
    private state: State;

    constructor(state: State) {
        this.transitionTo(state);
    }

    /**
     * The Context allows changing the State object at runtime.
     */
    public transitionTo(state: State): void {
        console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
        this.state = state;
        this.state.setContext(this);
    }

    /**
     * The Context delegates part of its behavior to the current State object.
     */
    public request1(): void {
        this.state.handle1();
    }

    public request2(): void {
        this.state.handle2();
    }
}

/**
 * The base State class declares methods that all Concrete State should
 * implement and also provides a backreference to the Context object, associated
 * with the State. This backreference can be used by States to transition the
 * Context to another State.
 */
abstract class State {
    protected context: Context;

    public setContext(context: Context) {
        this.context = context;
    }

    public abstract handle1(): void;

    public abstract handle2(): void;
}

/**
 * Concrete States implement various behaviors, associated with a state of the
 * Context.
 */
class ConcreteStateA extends State {
    public handle1(): void {
        console.log('ConcreteStateA handles request1.');
        console.log('ConcreteStateA wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateB());
    }

    public handle2(): void {
        console.log('ConcreteStateA handles request2.');
    }
}

class ConcreteStateB extends State {
    public handle1(): void {
        console.log('ConcreteStateB handles request1.');
    }

    public handle2(): void {
        console.log('ConcreteStateB handles request2.');
        console.log('ConcreteStateB wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateA());
    }
}

/**
 * The client code.
 */
const context = new Context(new ConcreteStateA());
context.request1();
context.request2();
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Context:
    """
    The Context defines the interface of interest to clients. It maintains a
    reference to an instance of a State subclass, representing the current state.
    """

    _state: State = None

    def __init__(self, state: State) -> None:
        self.transition_to(state)

    def transition_to(self, state: State) -> None:
        # The Context allows changing the State object at runtime.
        print(f"Context: Transition to {type(state).__name__}.")
        self._state = state
        self._state.context = self

    def request1(self) -> None:
        self._state.handle1()

    def request2(self) -> None:
        self._state.handle2()


class State(ABC):
    """
    The base State declares methods that all Concrete States should implement
    and provides a backreference to the Context object.
    """

    @property
    def context(self) -> Context:
        return self._context

    @context.setter
    def context(self, context: Context) -> None:
        self._context = context

    @abstractmethod
    def handle1(self) -> None:
        ...

    @abstractmethod
    def handle2(self) -> None:
        ...


class ConcreteStateA(State):
    def handle1(self) -> None:
        print("ConcreteStateA handles request1.")
        print("ConcreteStateA wants to change the state of the context.")
        self.context.transition_to(ConcreteStateB())

    def handle2(self) -> None:
        print("ConcreteStateA handles request2.")


class ConcreteStateB(State):
    def handle1(self) -> None:
        print("ConcreteStateB handles request1.")

    def handle2(self) -> None:
        print("ConcreteStateB handles request2.")
        print("ConcreteStateB wants to change the state of the context.")
        self.context.transition_to(ConcreteStateA())


if __name__ == "__main__":
    context = Context(ConcreteStateA())
    context.request1()
    context.request2()
```

## Java Example

```java
/**
 * The Context maintains a reference to an instance of a State subclass, which
 * represents the current state of the Context.
 */
class Context {
    private State state;

    public Context(State state) {
        transitionTo(state);
    }

    // The Context allows changing the State object at runtime.
    public void transitionTo(State state) {
        System.out.println("Context: Transition to " + state.getClass().getSimpleName() + ".");
        this.state = state;
        this.state.setContext(this);
    }

    public void request1() {
        state.handle1();
    }

    public void request2() {
        state.handle2();
    }
}

/**
 * The base State declares methods that Concrete States implement and holds a
 * backreference to the Context.
 */
abstract class State {
    protected Context context;

    public void setContext(Context context) {
        this.context = context;
    }

    public abstract void handle1();
    public abstract void handle2();
}

class ConcreteStateA extends State {
    public void handle1() {
        System.out.println("ConcreteStateA handles request1.");
        System.out.println("ConcreteStateA wants to change the state of the context.");
        context.transitionTo(new ConcreteStateB());
    }

    public void handle2() {
        System.out.println("ConcreteStateA handles request2.");
    }
}

class ConcreteStateB extends State {
    public void handle1() {
        System.out.println("ConcreteStateB handles request1.");
    }

    public void handle2() {
        System.out.println("ConcreteStateB handles request2.");
        System.out.println("ConcreteStateB wants to change the state of the context.");
        context.transitionTo(new ConcreteStateA());
    }
}

public class Demo {
    public static void main(String[] args) {
        Context context = new Context(new ConcreteStateA());
        context.request1();
        context.request2();
    }
}
```

## C# Example

```csharp
using System;

// The Context maintains a reference to an instance of a State subclass, which
// represents the current state of the Context.
public class Context
{
    private State _state;

    public Context(State state)
    {
        TransitionTo(state);
    }

    // The Context allows changing the State object at runtime.
    public void TransitionTo(State state)
    {
        Console.WriteLine($"Context: Transition to {state.GetType().Name}.");
        _state = state;
        _state.SetContext(this);
    }

    public void Request1() => _state.Handle1();

    public void Request2() => _state.Handle2();
}

// The base State declares methods that Concrete States implement and holds a
// backreference to the Context.
public abstract class State
{
    protected Context _context;

    public void SetContext(Context context) => _context = context;

    public abstract void Handle1();
    public abstract void Handle2();
}

public class ConcreteStateA : State
{
    public override void Handle1()
    {
        Console.WriteLine("ConcreteStateA handles request1.");
        Console.WriteLine("ConcreteStateA wants to change the state of the context.");
        _context.TransitionTo(new ConcreteStateB());
    }

    public override void Handle2()
    {
        Console.WriteLine("ConcreteStateA handles request2.");
    }
}

public class ConcreteStateB : State
{
    public override void Handle1()
    {
        Console.WriteLine("ConcreteStateB handles request1.");
    }

    public override void Handle2()
    {
        Console.WriteLine("ConcreteStateB handles request2.");
        Console.WriteLine("ConcreteStateB wants to change the state of the context.");
        _context.TransitionTo(new ConcreteStateA());
    }
}

public class Program
{
    public static void Main()
    {
        var context = new Context(new ConcreteStateA());
        context.Request1();
        context.Request2();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"reflect"
)

// State declares methods that Concrete States implement and holds a
// backreference to the Context.
type State interface {
	SetContext(context *Context)
	Handle1()
	Handle2()
}

// Context maintains a reference to the current State.
type Context struct {
	state State
}

func NewContext(state State) *Context {
	c := &Context{}
	c.TransitionTo(state)
	return c
}

// TransitionTo allows changing the State object at runtime.
func (c *Context) TransitionTo(state State) {
	fmt.Printf("Context: Transition to %s.\n", reflect.TypeOf(state).Elem().Name())
	c.state = state
	c.state.SetContext(c)
}

func (c *Context) Request1() { c.state.Handle1() }
func (c *Context) Request2() { c.state.Handle2() }

type BaseState struct {
	context *Context
}

func (s *BaseState) SetContext(context *Context) { s.context = context }

type ConcreteStateA struct {
	BaseState
}

func (s *ConcreteStateA) Handle1() {
	fmt.Println("ConcreteStateA handles request1.")
	fmt.Println("ConcreteStateA wants to change the state of the context.")
	s.context.TransitionTo(&ConcreteStateB{})
}

func (s *ConcreteStateA) Handle2() {
	fmt.Println("ConcreteStateA handles request2.")
}

type ConcreteStateB struct {
	BaseState
}

func (s *ConcreteStateB) Handle1() {
	fmt.Println("ConcreteStateB handles request1.")
}

func (s *ConcreteStateB) Handle2() {
	fmt.Println("ConcreteStateB handles request2.")
	fmt.Println("ConcreteStateB wants to change the state of the context.")
	s.context.TransitionTo(&ConcreteStateA{})
}

func main() {
	context := NewContext(&ConcreteStateA{})
	context.Request1()
	context.Request2()
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <typeinfo>

class Context;

// The base State declares methods that Concrete States implement and holds a
// backreference to the Context.
class State {
protected:
    Context* context_ = nullptr;

public:
    virtual ~State() = default;
    void setContext(Context* context) { context_ = context; }
    virtual void handle1() = 0;
    virtual void handle2() = 0;
};

// The Context maintains a reference to the current State.
class Context {
    std::unique_ptr<State> state_;

public:
    explicit Context(std::unique_ptr<State> state) {
        transitionTo(std::move(state));
    }

    // Allows changing the State object at runtime.
    void transitionTo(std::unique_ptr<State> state) {
        std::cout << "Context: Transition to " << typeid(*state).name() << ".\n";
        state_ = std::move(state);
        state_->setContext(this);
    }

    void request1() { state_->handle1(); }
    void request2() { state_->handle2(); }
};

class ConcreteStateB;

class ConcreteStateA : public State {
public:
    void handle1() override;
    void handle2() override {
        std::cout << "ConcreteStateA handles request2.\n";
    }
};

class ConcreteStateB : public State {
public:
    void handle1() override {
        std::cout << "ConcreteStateB handles request1.\n";
    }
    void handle2() override {
        std::cout << "ConcreteStateB handles request2.\n";
        std::cout << "ConcreteStateB wants to change the state of the context.\n";
        context_->transitionTo(std::make_unique<ConcreteStateA>());
    }
};

void ConcreteStateA::handle1() {
    std::cout << "ConcreteStateA handles request1.\n";
    std::cout << "ConcreteStateA wants to change the state of the context.\n";
    context_->transitionTo(std::make_unique<ConcreteStateB>());
}

int main() {
    Context context(std::make_unique<ConcreteStateA>());
    context.request1();
    context.request2();
}
```

## Rust Example

```rust
// Each state is a struct implementing the State trait. handle methods return an
// optional next state so the Context can perform the transition.
trait State {
    fn handle1(self: Box<Self>) -> Box<dyn State>;
    fn handle2(self: Box<Self>) -> Box<dyn State>;
    fn name(&self) -> &'static str;
}

// The Context owns the current State and delegates behavior to it.
struct Context {
    state: Option<Box<dyn State>>,
}

impl Context {
    fn new(state: Box<dyn State>) -> Self {
        println!("Context: Transition to {}.", state.name());
        Context { state: Some(state) }
    }

    fn transition_to(&mut self, state: Box<dyn State>) {
        println!("Context: Transition to {}.", state.name());
        self.state = Some(state);
    }

    fn request1(&mut self) {
        if let Some(state) = self.state.take() {
            let next = state.handle1();
            self.transition_to(next);
        }
    }

    fn request2(&mut self) {
        if let Some(state) = self.state.take() {
            let next = state.handle2();
            self.transition_to(next);
        }
    }
}

struct ConcreteStateA;

impl State for ConcreteStateA {
    fn handle1(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateA handles request1.");
        println!("ConcreteStateA wants to change the state of the context.");
        Box::new(ConcreteStateB)
    }
    fn handle2(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateA handles request2.");
        self
    }
    fn name(&self) -> &'static str {
        "ConcreteStateA"
    }
}

struct ConcreteStateB;

impl State for ConcreteStateB {
    fn handle1(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateB handles request1.");
        self
    }
    fn handle2(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateB handles request2.");
        println!("ConcreteStateB wants to change the state of the context.");
        Box::new(ConcreteStateA)
    }
    fn name(&self) -> &'static str {
        "ConcreteStateB"
    }
}

fn main() {
    let mut context = Context::new(Box::new(ConcreteStateA));
    context.request1();
    context.request2();
}
```

## Pairs well with

Strategy (Strategy is "do this thing different ways"; State is "I am in different modes"); Memento (snapshot state for
undo); Command (commands trigger state transitions).
