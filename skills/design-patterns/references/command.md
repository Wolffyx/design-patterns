---
name: Command
category: Behavioral
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/command/typescript/example
---

# Command

## Intent

Command is a behavioral design pattern that turns a request into a stand-alone object that contains all information
about the request. This transformation enables passing requests as arguments, deferring execution, and supporting
reversible operations.

## Applicability

- You need to parameterize objects with operations or pass commands as method arguments
- You want to queue operations, schedule their execution, or execute them remotely
- You're implementing reversible operations and undo/redo functionality
- You want to decouple the objects that invoke operations from those that perform them

## Pros

- Separates request invocation from execution logic
- Enables new commands without modifying existing client code
- Supports undo/redo implementation
- Allows deferred execution of operations
- Enables combining simple commands into complex ones

## Cons

- Increases code complexity by introducing an additional layer between senders and receivers

## Don't use when

- You're calling a single method directly with no need for queueing/undo/logging → just call it
- The action has no state and never needs to be reified → use a function reference
- You'd be wrapping every UI event in a command class → too granular

## TypeScript Example

```typescript
/**
 * The Command interface declares a method for executing a command.
 */
interface Command {
    execute(): void;
}

/**
 * Some commands can implement simple operations on their own.
 */
class SimpleCommand implements Command {
    private payload: string;

    constructor(payload: string) {
        this.payload = payload;
    }

    public execute(): void {
        console.log(`SimpleCommand: See, I can do simple things like printing (${this.payload})`);
    }
}

/**
 * However, some commands can delegate more complex operations to other objects,
 * called "receivers."
 */
class ComplexCommand implements Command {
    private receiver: Receiver;

    /**
     * Context data, required for launching the receiver's methods.
     */
    private a: string;

    private b: string;

    /**
     * Complex commands can accept one or several receiver objects along with
     * any context data via the constructor.
     */
    constructor(receiver: Receiver, a: string, b: string) {
        this.receiver = receiver;
        this.a = a;
        this.b = b;
    }

    /**
     * Commands can delegate to any methods of a receiver.
     */
    public execute(): void {
        console.log('ComplexCommand: Complex stuff should be done by a receiver object.');
        this.receiver.doSomething(this.a);
        this.receiver.doSomethingElse(this.b);
    }
}

/**
 * The Receiver classes contain some important business logic. They know how to
 * perform all kinds of operations, associated with carrying out a request. In
 * fact, any class may serve as a Receiver.
 */
class Receiver {
    public doSomething(a: string): void {
        console.log(`Receiver: Working on (${a}.)`);
    }

    public doSomethingElse(b: string): void {
        console.log(`Receiver: Also working on (${b}.)`);
    }
}

/**
 * The Invoker is associated with one or several commands. It sends a request to
 * the command.
 */
class Invoker {
    private onStart: Command;

    private onFinish: Command;

    public setOnStart(command: Command): void {
        this.onStart = command;
    }

    public setOnFinish(command: Command): void {
        this.onFinish = command;
    }

    /**
     * The Invoker does not depend on concrete command or receiver classes. The
     * Invoker passes a request to a receiver indirectly, by executing a
     * command.
     */
    public doSomethingImportant(): void {
        console.log('Invoker: Does anybody want something done before I begin?');
        if (this.isCommand(this.onStart)) {
            this.onStart.execute();
        }

        console.log('Invoker: ...doing something really important...');

        console.log('Invoker: Does anybody want something done after I finish?');
        if (this.isCommand(this.onFinish)) {
            this.onFinish.execute();
        }
    }

    private isCommand(object): object is Command {
        return object.execute !== undefined;
    }
}

/**
 * The client code can parameterize an invoker with any commands.
 */
const invoker = new Invoker();
invoker.setOnStart(new SimpleCommand('Say Hi!'));
const receiver = new Receiver();
invoker.setOnFinish(new ComplexCommand(receiver, 'Send email', 'Save report'));

invoker.doSomethingImportant();
```

## Python Example

```python
from abc import ABC, abstractmethod


class Command(ABC):
    """Declares a method for executing a command."""

    @abstractmethod
    def execute(self) -> None:
        pass


class SimpleCommand(Command):
    """Some commands implement simple operations on their own."""

    def __init__(self, payload: str) -> None:
        self._payload = payload

    def execute(self) -> None:
        print(f"SimpleCommand: See, I can do simple things like printing ({self._payload})")


class ComplexCommand(Command):
    """Delegates more complex operations to a receiver object."""

    def __init__(self, receiver: "Receiver", a: str, b: str) -> None:
        self._receiver = receiver
        self._a = a
        self._b = b

    def execute(self) -> None:
        print("ComplexCommand: Complex stuff should be done by a receiver object.")
        self._receiver.do_something(self._a)
        self._receiver.do_something_else(self._b)


class Receiver:
    """Contains the business logic; any class may serve as a receiver."""

    def do_something(self, a: str) -> None:
        print(f"Receiver: Working on ({a}.)")

    def do_something_else(self, b: str) -> None:
        print(f"Receiver: Also working on ({b}.)")


class Invoker:
    """Associated with commands; sends requests to them."""

    _on_start: Command = None
    _on_finish: Command = None

    def set_on_start(self, command: Command) -> None:
        self._on_start = command

    def set_on_finish(self, command: Command) -> None:
        self._on_finish = command

    def do_something_important(self) -> None:
        print("Invoker: Does anybody want something done before I begin?")
        if isinstance(self._on_start, Command):
            self._on_start.execute()

        print("Invoker: ...doing something really important...")

        print("Invoker: Does anybody want something done after I finish?")
        if isinstance(self._on_finish, Command):
            self._on_finish.execute()


if __name__ == "__main__":
    invoker = Invoker()
    invoker.set_on_start(SimpleCommand("Say Hi!"))
    receiver = Receiver()
    invoker.set_on_finish(ComplexCommand(receiver, "Send email", "Save report"))
    invoker.do_something_important()
```

## Java Example

```java
// The Command interface declares a method for executing a command.
interface Command {
    void execute();
}

// Some commands implement simple operations on their own.
class SimpleCommand implements Command {
    private String payload;

    public SimpleCommand(String payload) {
        this.payload = payload;
    }

    public void execute() {
        System.out.println("SimpleCommand: See, I can do simple things like printing (" + payload + ")");
    }
}

// Some commands delegate more complex operations to a receiver.
class ComplexCommand implements Command {
    private Receiver receiver;
    private String a;
    private String b;

    public ComplexCommand(Receiver receiver, String a, String b) {
        this.receiver = receiver;
        this.a = a;
        this.b = b;
    }

    public void execute() {
        System.out.println("ComplexCommand: Complex stuff should be done by a receiver object.");
        receiver.doSomething(a);
        receiver.doSomethingElse(b);
    }
}

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver {
    public void doSomething(String a) {
        System.out.println("Receiver: Working on (" + a + ".)");
    }

    public void doSomethingElse(String b) {
        System.out.println("Receiver: Also working on (" + b + ".)");
    }
}

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker {
    private Command onStart;
    private Command onFinish;

    public void setOnStart(Command command) {
        this.onStart = command;
    }

    public void setOnFinish(Command command) {
        this.onFinish = command;
    }

    public void doSomethingImportant() {
        System.out.println("Invoker: Does anybody want something done before I begin?");
        if (onStart != null) {
            onStart.execute();
        }

        System.out.println("Invoker: ...doing something really important...");

        System.out.println("Invoker: Does anybody want something done after I finish?");
        if (onFinish != null) {
            onFinish.execute();
        }
    }
}

public class Demo {
    public static void main(String[] args) {
        Invoker invoker = new Invoker();
        invoker.setOnStart(new SimpleCommand("Say Hi!"));
        Receiver receiver = new Receiver();
        invoker.setOnFinish(new ComplexCommand(receiver, "Send email", "Save report"));
        invoker.doSomethingImportant();
    }
}
```

## C# Example

```csharp
using System;

// The Command interface declares a method for executing a command.
interface ICommand
{
    void Execute();
}

// Some commands implement simple operations on their own.
class SimpleCommand : ICommand
{
    private string _payload;

    public SimpleCommand(string payload) => _payload = payload;

    public void Execute() =>
        Console.WriteLine($"SimpleCommand: See, I can do simple things like printing ({_payload})");
}

// Some commands delegate more complex operations to a receiver.
class ComplexCommand : ICommand
{
    private Receiver _receiver;
    private string _a;
    private string _b;

    public ComplexCommand(Receiver receiver, string a, string b)
    {
        _receiver = receiver;
        _a = a;
        _b = b;
    }

    public void Execute()
    {
        Console.WriteLine("ComplexCommand: Complex stuff should be done by a receiver object.");
        _receiver.DoSomething(_a);
        _receiver.DoSomethingElse(_b);
    }
}

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver
{
    public void DoSomething(string a) => Console.WriteLine($"Receiver: Working on ({a}.)");

    public void DoSomethingElse(string b) => Console.WriteLine($"Receiver: Also working on ({b}.)");
}

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker
{
    private ICommand _onStart;
    private ICommand _onFinish;

    public void SetOnStart(ICommand command) => _onStart = command;

    public void SetOnFinish(ICommand command) => _onFinish = command;

    public void DoSomethingImportant()
    {
        Console.WriteLine("Invoker: Does anybody want something done before I begin?");
        _onStart?.Execute();

        Console.WriteLine("Invoker: ...doing something really important...");

        Console.WriteLine("Invoker: Does anybody want something done after I finish?");
        _onFinish?.Execute();
    }
}

class Program
{
    static void Main()
    {
        var invoker = new Invoker();
        invoker.SetOnStart(new SimpleCommand("Say Hi!"));
        var receiver = new Receiver();
        invoker.SetOnFinish(new ComplexCommand(receiver, "Send email", "Save report"));
        invoker.DoSomethingImportant();
    }
}
```

## Go Example

```go
package main

import "fmt"

// The Command interface declares a method for executing a command.
type Command interface {
	Execute()
}

// SimpleCommand implements a simple operation on its own.
type SimpleCommand struct {
	payload string
}

func (c *SimpleCommand) Execute() {
	fmt.Printf("SimpleCommand: See, I can do simple things like printing (%s)\n", c.payload)
}

// ComplexCommand delegates more complex operations to a receiver.
type ComplexCommand struct {
	receiver *Receiver
	a, b     string
}

func (c *ComplexCommand) Execute() {
	fmt.Println("ComplexCommand: Complex stuff should be done by a receiver object.")
	c.receiver.DoSomething(c.a)
	c.receiver.DoSomethingElse(c.b)
}

// Receiver contains the business logic; any type may serve as a receiver.
type Receiver struct{}

func (r *Receiver) DoSomething(a string) {
	fmt.Printf("Receiver: Working on (%s.)\n", a)
}
func (r *Receiver) DoSomethingElse(b string) {
	fmt.Printf("Receiver: Also working on (%s.)\n", b)
}

// Invoker sends requests to a command without depending on concrete types.
type Invoker struct {
	onStart  Command
	onFinish Command
}

func (i *Invoker) SetOnStart(c Command)  { i.onStart = c }
func (i *Invoker) SetOnFinish(c Command) { i.onFinish = c }

func (i *Invoker) DoSomethingImportant() {
	fmt.Println("Invoker: Does anybody want something done before I begin?")
	if i.onStart != nil {
		i.onStart.Execute()
	}

	fmt.Println("Invoker: ...doing something really important...")

	fmt.Println("Invoker: Does anybody want something done after I finish?")
	if i.onFinish != nil {
		i.onFinish.Execute()
	}
}

func main() {
	invoker := &Invoker{}
	invoker.SetOnStart(&SimpleCommand{payload: "Say Hi!"})
	receiver := &Receiver{}
	invoker.SetOnFinish(&ComplexCommand{receiver: receiver, a: "Send email", b: "Save report"})
	invoker.DoSomethingImportant()
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Command interface declares a method for executing a command.
class Command {
public:
    virtual ~Command() = default;
    virtual void Execute() const = 0;
};

// Some commands implement simple operations on their own.
class SimpleCommand : public Command {
    std::string payload_;

public:
    explicit SimpleCommand(std::string payload) : payload_(std::move(payload)) {}

    void Execute() const override {
        std::cout << "SimpleCommand: See, I can do simple things like printing ("
                  << payload_ << ")\n";
    }
};

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver {
public:
    void DoSomething(const std::string& a) {
        std::cout << "Receiver: Working on (" << a << ".)\n";
    }
    void DoSomethingElse(const std::string& b) {
        std::cout << "Receiver: Also working on (" << b << ".)\n";
    }
};

// Some commands delegate more complex operations to a receiver.
class ComplexCommand : public Command {
    Receiver* receiver_;
    std::string a_;
    std::string b_;

public:
    ComplexCommand(Receiver* receiver, std::string a, std::string b)
        : receiver_(receiver), a_(std::move(a)), b_(std::move(b)) {}

    void Execute() const override {
        std::cout << "ComplexCommand: Complex stuff should be done by a receiver object.\n";
        receiver_->DoSomething(a_);
        receiver_->DoSomethingElse(b_);
    }
};

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker {
    std::unique_ptr<Command> on_start_;
    std::unique_ptr<Command> on_finish_;

public:
    void SetOnStart(std::unique_ptr<Command> command) { on_start_ = std::move(command); }
    void SetOnFinish(std::unique_ptr<Command> command) { on_finish_ = std::move(command); }

    void DoSomethingImportant() {
        std::cout << "Invoker: Does anybody want something done before I begin?\n";
        if (on_start_) on_start_->Execute();

        std::cout << "Invoker: ...doing something really important...\n";

        std::cout << "Invoker: Does anybody want something done after I finish?\n";
        if (on_finish_) on_finish_->Execute();
    }
};

int main() {
    Invoker invoker;
    invoker.SetOnStart(std::make_unique<SimpleCommand>("Say Hi!"));
    Receiver receiver;
    invoker.SetOnFinish(std::make_unique<ComplexCommand>(&receiver, "Send email", "Save report"));
    invoker.DoSomethingImportant();
    return 0;
}
```

## Rust Example

```rust
// The Command trait declares a method for executing a command.
trait Command {
    fn execute(&self);
}

// Some commands implement simple operations on their own.
struct SimpleCommand {
    payload: String,
}

impl Command for SimpleCommand {
    fn execute(&self) {
        println!(
            "SimpleCommand: See, I can do simple things like printing ({})",
            self.payload
        );
    }
}

// The Receiver contains the business logic; any type may serve as a receiver.
struct Receiver;

impl Receiver {
    fn do_something(&self, a: &str) {
        println!("Receiver: Working on ({}.)", a);
    }
    fn do_something_else(&self, b: &str) {
        println!("Receiver: Also working on ({}.)", b);
    }
}

// Some commands delegate more complex operations to a receiver.
struct ComplexCommand {
    receiver: Receiver,
    a: String,
    b: String,
}

impl Command for ComplexCommand {
    fn execute(&self) {
        println!("ComplexCommand: Complex stuff should be done by a receiver object.");
        self.receiver.do_something(&self.a);
        self.receiver.do_something_else(&self.b);
    }
}

// The Invoker sends requests to commands without knowing their concrete types.
#[derive(Default)]
struct Invoker {
    on_start: Option<Box<dyn Command>>,
    on_finish: Option<Box<dyn Command>>,
}

impl Invoker {
    fn set_on_start(&mut self, command: Box<dyn Command>) {
        self.on_start = Some(command);
    }
    fn set_on_finish(&mut self, command: Box<dyn Command>) {
        self.on_finish = Some(command);
    }

    fn do_something_important(&self) {
        println!("Invoker: Does anybody want something done before I begin?");
        if let Some(command) = &self.on_start {
            command.execute();
        }

        println!("Invoker: ...doing something really important...");

        println!("Invoker: Does anybody want something done after I finish?");
        if let Some(command) = &self.on_finish {
            command.execute();
        }
    }
}

fn main() {
    let mut invoker = Invoker::default();
    invoker.set_on_start(Box::new(SimpleCommand {
        payload: String::from("Say Hi!"),
    }));
    invoker.set_on_finish(Box::new(ComplexCommand {
        receiver: Receiver,
        a: String::from("Send email"),
        b: String::from("Save report"),
    }));
    invoker.do_something_important();
}
```

## Pairs well with

Memento (Command + Memento = undo/redo); Composite (macro commands composed of sub-commands); Chain of Responsibility (
commands routed through middleware chain).
