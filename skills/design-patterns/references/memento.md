---
name: Memento
category: Behavioral
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/memento/typescript/example
---

# Memento

## Intent

A behavioral design pattern that lets you save and restore the previous state of an object without revealing the details
of its implementation. This pattern enables undo functionality while preserving encapsulation.

## Applicability

- You need to capture and restore object states at different points in time
- You're implementing transaction rollback or undo/redo functionality
- Direct access to an object's fields would violate its encapsulation
- You need to manage complex state transitions across multiple objects
- You need to maintain historical snapshots for auditing or recovery purposes

## Pros

- Preserves encapsulation by having objects create their own snapshots
- Simplifies originator code by delegating state history management to caretakers
- Enables complete state restoration without exposing internal implementation details
- Supports multiple independent objects maintaining separate histories

## Cons

- May consume significant memory if snapshots are created frequently
- Requires caretakers to track originator lifecycles to clean up obsolete snapshots
- Dynamic languages cannot guarantee snapshot immutability, risking accidental state modifications

## Don't use when

- You can serialize state to JSON and back → just do that
- The state is immutable already → no snapshot needed, keep references
- You only need one undo step → store one previous-state field, no Caretaker

## TypeScript Example

```typescript
/**
 * The Originator holds some important state that may change over time. It also
 * defines a method for saving the state inside a memento and another method for
 * restoring the state from it.
 */
class Originator {
    /**
     * For the sake of simplicity, the originator's state is stored inside a
     * single variable.
     */
    private state: string;

    constructor(state: string) {
        this.state = state;
        console.log(`Originator: My initial state is: ${state}`);
    }

    /**
     * The Originator's business logic may affect its internal state. Therefore,
     * the client should backup the state before launching methods of the
     * business logic via the save() method.
     */
    public doSomething(): void {
        console.log('Originator: I\'m doing something important.');
        this.state = this.generateRandomString(30);
        console.log(`Originator: and my state has changed to: ${this.state}`);
    }

    private generateRandomString(length: number = 10): string {
        const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

        return Array
            .apply(null, { length })
            .map(() => charSet.charAt(Math.floor(Math.random() * charSet.length)))
            .join('');
    }

    /**
     * Saves the current state inside a memento.
     */
    public save(): Memento {
        return new ConcreteMemento(this.state);
    }

    /**
     * Restores the Originator's state from a memento object.
     */
    public restore(memento: Memento): void {
        this.state = memento.getState();
        console.log(`Originator: My state has changed to: ${this.state}`);
    }
}

/**
 * The Memento interface provides a way to retrieve the memento's metadata, such
 * as creation date or name. However, it doesn't expose the Originator's state.
 */
interface Memento {
    getState(): string;

    getName(): string;

    getDate(): string;
}

/**
 * The Concrete Memento contains the infrastructure for storing the Originator's
 * state.
 */
class ConcreteMemento implements Memento {
    private state: string;

    private date: string;

    constructor(state: string) {
        this.state = state;
        this.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    /**
     * The Originator uses this method when restoring its state.
     */
    public getState(): string {
        return this.state;
    }

    /**
     * The rest of the methods are used by the Caretaker to display metadata.
     */
    public getName(): string {
        return `${this.date} / (${this.state.substr(0, 9)}...)`;
    }

    public getDate(): string {
        return this.date;
    }
}

/**
 * The Caretaker doesn't depend on the Concrete Memento class. Therefore, it
 * doesn't have access to the originator's state, stored inside the memento. It
 * works with all mementos via the base Memento interface.
 */
class Caretaker {
    private mementos: Memento[] = [];

    private originator: Originator;

    constructor(originator: Originator) {
        this.originator = originator;
    }

    public backup(): void {
        console.log('\nCaretaker: Saving Originator\'s state...');
        this.mementos.push(this.originator.save());
    }

    public undo(): void {
        if (!this.mementos.length) {
            return;
        }
        const memento = this.mementos.pop();

        console.log(`Caretaker: Restoring state to: ${memento.getName()}`);
        this.originator.restore(memento);
    }

    public showHistory(): void {
        console.log('Caretaker: Here\'s the list of mementos:');
        for (const memento of this.mementos) {
            console.log(memento.getName());
        }
    }
}

/**
 * Client code.
 */
const originator = new Originator('Super-duper-super-puper-super.');
const caretaker = new Caretaker(originator);

caretaker.backup();
originator.doSomething();

caretaker.backup();
originator.doSomething();

caretaker.backup();
originator.doSomething();

console.log('');
caretaker.showHistory();

console.log('\nClient: Now, let\'s rollback!\n');
caretaker.undo();

console.log('\nClient: Once more!\n');
caretaker.undo();
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime
import random
import string


class Originator:
    def __init__(self, state: str) -> None:
        self._state = state
        print(f"Originator: My initial state is: {state}")

    def do_something(self) -> None:
        print("Originator: I'm doing something important.")
        self._state = "".join(random.choices(string.ascii_letters, k=30))
        print(f"Originator: and my state has changed to: {self._state}")

    def save(self) -> Memento:
        return ConcreteMemento(self._state)

    def restore(self, memento: Memento) -> None:
        self._state = memento.get_state()
        print(f"Originator: My state has changed to: {self._state}")


class Memento(ABC):
    @abstractmethod
    def get_state(self) -> str: ...

    @abstractmethod
    def get_name(self) -> str: ...

    @abstractmethod
    def get_date(self) -> str: ...


class ConcreteMemento(Memento):
    def __init__(self, state: str) -> None:
        self._state = state
        self._date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def get_state(self) -> str:
        return self._state

    def get_name(self) -> str:
        return f"{self._date} / ({self._state[:9]}...)"

    def get_date(self) -> str:
        return self._date


class Caretaker:
    def __init__(self, originator: Originator) -> None:
        self._mementos: list[Memento] = []
        self._originator = originator

    def backup(self) -> None:
        print("\nCaretaker: Saving Originator's state...")
        self._mementos.append(self._originator.save())

    def undo(self) -> None:
        if not self._mementos:
            return
        memento = self._mementos.pop()
        print(f"Caretaker: Restoring state to: {memento.get_name()}")
        self._originator.restore(memento)

    def show_history(self) -> None:
        print("Caretaker: Here's the list of mementos:")
        for memento in self._mementos:
            print(memento.get_name())


if __name__ == "__main__":
    originator = Originator("Super-duper-super-puper-super.")
    caretaker = Caretaker(originator)

    caretaker.backup()
    originator.do_something()
    caretaker.backup()
    originator.do_something()
    caretaker.backup()
    originator.do_something()

    print()
    caretaker.show_history()

    print("\nClient: Now, let's rollback!\n")
    caretaker.undo()

    print("\nClient: Once more!\n")
    caretaker.undo()
```

## Java Example

```java
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

class Originator {
    private String state;

    public Originator(String state) {
        this.state = state;
        System.out.println("Originator: My initial state is: " + state);
    }

    public void doSomething() {
        System.out.println("Originator: I'm doing something important.");
        this.state = generateRandomString(30);
        System.out.println("Originator: and my state has changed to: " + state);
    }

    private String generateRandomString(int length) {
        String chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    public Memento save() {
        return new ConcreteMemento(state);
    }

    public void restore(Memento memento) {
        this.state = memento.getState();
        System.out.println("Originator: My state has changed to: " + state);
    }
}

interface Memento {
    String getState();
    String getName();
    String getDate();
}

class ConcreteMemento implements Memento {
    private final String state;
    private final String date;

    public ConcreteMemento(String state) {
        this.state = state;
        this.date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    public String getState() { return state; }
    public String getName() { return date + " / (" + state.substring(0, 9) + "...)"; }
    public String getDate() { return date; }
}

class Caretaker {
    private final List<Memento> mementos = new ArrayList<>();
    private final Originator originator;

    public Caretaker(Originator originator) {
        this.originator = originator;
    }

    public void backup() {
        System.out.println("\nCaretaker: Saving Originator's state...");
        mementos.add(originator.save());
    }

    public void undo() {
        if (mementos.isEmpty()) return;
        Memento memento = mementos.remove(mementos.size() - 1);
        System.out.println("Caretaker: Restoring state to: " + memento.getName());
        originator.restore(memento);
    }

    public void showHistory() {
        System.out.println("Caretaker: Here's the list of mementos:");
        for (Memento memento : mementos) System.out.println(memento.getName());
    }
}

public class Demo {
    public static void main(String[] args) {
        Originator originator = new Originator("Super-duper-super-puper-super.");
        Caretaker caretaker = new Caretaker(originator);

        caretaker.backup();
        originator.doSomething();
        caretaker.backup();
        originator.doSomething();
        caretaker.backup();
        originator.doSomething();

        System.out.println();
        caretaker.showHistory();

        System.out.println("\nClient: Now, let's rollback!\n");
        caretaker.undo();

        System.out.println("\nClient: Once more!\n");
        caretaker.undo();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

class Originator
{
    private string _state;

    public Originator(string state)
    {
        _state = state;
        Console.WriteLine("Originator: My initial state is: " + state);
    }

    public void DoSomething()
    {
        Console.WriteLine("Originator: I'm doing something important.");
        _state = GenerateRandomString(30);
        Console.WriteLine("Originator: and my state has changed to: " + _state);
    }

    private string GenerateRandomString(int length)
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var rnd = new Random();
        var result = new char[length];
        for (int i = 0; i < length; i++) result[i] = chars[rnd.Next(chars.Length)];
        return new string(result);
    }

    public IMemento Save() => new ConcreteMemento(_state);

    public void Restore(IMemento memento)
    {
        _state = memento.GetState();
        Console.WriteLine("Originator: My state has changed to: " + _state);
    }
}

interface IMemento
{
    string GetState();
    string GetName();
    string GetDate();
}

class ConcreteMemento : IMemento
{
    private readonly string _state;
    private readonly string _date;

    public ConcreteMemento(string state)
    {
        _state = state;
        _date = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    }

    public string GetState() => _state;
    public string GetName() => $"{_date} / ({_state.Substring(0, 9)}...)";
    public string GetDate() => _date;
}

class Caretaker
{
    private readonly List<IMemento> _mementos = new();
    private readonly Originator _originator;

    public Caretaker(Originator originator) => _originator = originator;

    public void Backup()
    {
        Console.WriteLine("\nCaretaker: Saving Originator's state...");
        _mementos.Add(_originator.Save());
    }

    public void Undo()
    {
        if (_mementos.Count == 0) return;
        var memento = _mementos[^1];
        _mementos.RemoveAt(_mementos.Count - 1);
        Console.WriteLine("Caretaker: Restoring state to: " + memento.GetName());
        _originator.Restore(memento);
    }

    public void ShowHistory()
    {
        Console.WriteLine("Caretaker: Here's the list of mementos:");
        foreach (var memento in _mementos) Console.WriteLine(memento.GetName());
    }
}

class Program
{
    static void Main()
    {
        var originator = new Originator("Super-duper-super-puper-super.");
        var caretaker = new Caretaker(originator);

        caretaker.Backup();
        originator.DoSomething();
        caretaker.Backup();
        originator.DoSomething();
        caretaker.Backup();
        originator.DoSomething();

        Console.WriteLine();
        caretaker.ShowHistory();

        Console.WriteLine("\nClient: Now, let's rollback!\n");
        caretaker.Undo();

        Console.WriteLine("\nClient: Once more!\n");
        caretaker.Undo();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"math/rand"
	"time"
)

type Memento interface {
	GetState() string
	GetName() string
	GetDate() string
}

type Originator struct {
	state string
}

func NewOriginator(state string) *Originator {
	fmt.Println("Originator: My initial state is:", state)
	return &Originator{state: state}
}

func (o *Originator) DoSomething() {
	fmt.Println("Originator: I'm doing something important.")
	o.state = randomString(30)
	fmt.Println("Originator: and my state has changed to:", o.state)
}

func randomString(length int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	b := make([]byte, length)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func (o *Originator) Save() Memento {
	return &ConcreteMemento{state: o.state, date: time.Now().Format("2006-01-02 15:04:05")}
}

func (o *Originator) Restore(m Memento) {
	o.state = m.GetState()
	fmt.Println("Originator: My state has changed to:", o.state)
}

type ConcreteMemento struct {
	state string
	date  string
}

func (m *ConcreteMemento) GetState() string { return m.state }
func (m *ConcreteMemento) GetName() string  { return fmt.Sprintf("%s / (%s...)", m.date, m.state[:9]) }
func (m *ConcreteMemento) GetDate() string  { return m.date }

type Caretaker struct {
	mementos   []Memento
	originator *Originator
}

func (c *Caretaker) Backup() {
	fmt.Println("\nCaretaker: Saving Originator's state...")
	c.mementos = append(c.mementos, c.originator.Save())
}

func (c *Caretaker) Undo() {
	if len(c.mementos) == 0 {
		return
	}
	m := c.mementos[len(c.mementos)-1]
	c.mementos = c.mementos[:len(c.mementos)-1]
	fmt.Println("Caretaker: Restoring state to:", m.GetName())
	c.originator.Restore(m)
}

func (c *Caretaker) ShowHistory() {
	fmt.Println("Caretaker: Here's the list of mementos:")
	for _, m := range c.mementos {
		fmt.Println(m.GetName())
	}
}

func main() {
	originator := NewOriginator("Super-duper-super-puper-super.")
	caretaker := &Caretaker{originator: originator}

	caretaker.Backup()
	originator.DoSomething()
	caretaker.Backup()
	originator.DoSomething()
	caretaker.Backup()
	originator.DoSomething()

	fmt.Println()
	caretaker.ShowHistory()

	fmt.Println("\nClient: Now, let's rollback!\n")
	caretaker.Undo()

	fmt.Println("\nClient: Once more!\n")
	caretaker.Undo()
}
```

## C++ Example

```cpp
#include <chrono>
#include <ctime>
#include <iostream>
#include <memory>
#include <random>
#include <sstream>
#include <string>
#include <vector>

class Memento {
public:
    virtual ~Memento() = default;
    virtual std::string GetState() const = 0;
    virtual std::string GetName() const = 0;
};

class ConcreteMemento : public Memento {
    std::string state_;
    std::string date_;
public:
    explicit ConcreteMemento(std::string state) : state_(std::move(state)) {
        std::time_t now = std::time(nullptr);
        char buf[20];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", std::localtime(&now));
        date_ = buf;
    }
    std::string GetState() const override { return state_; }
    std::string GetName() const override { return date_ + " / (" + state_.substr(0, 9) + "...)"; }
};

class Originator {
    std::string state_;
    static std::string RandomString(int length) {
        const std::string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        std::mt19937 gen(std::random_device{}());
        std::uniform_int_distribution<> dist(0, chars.size() - 1);
        std::string s;
        for (int i = 0; i < length; ++i) s += chars[dist(gen)];
        return s;
    }
public:
    explicit Originator(std::string state) : state_(std::move(state)) {
        std::cout << "Originator: My initial state is: " << state_ << "\n";
    }
    void DoSomething() {
        std::cout << "Originator: I'm doing something important.\n";
        state_ = RandomString(30);
        std::cout << "Originator: and my state has changed to: " << state_ << "\n";
    }
    std::unique_ptr<Memento> Save() { return std::make_unique<ConcreteMemento>(state_); }
    void Restore(const Memento* memento) {
        state_ = memento->GetState();
        std::cout << "Originator: My state has changed to: " << state_ << "\n";
    }
};

class Caretaker {
    std::vector<std::unique_ptr<Memento>> mementos_;
    Originator* originator_;
public:
    explicit Caretaker(Originator* originator) : originator_(originator) {}
    void Backup() {
        std::cout << "\nCaretaker: Saving Originator's state...\n";
        mementos_.push_back(originator_->Save());
    }
    void Undo() {
        if (mementos_.empty()) return;
        auto memento = std::move(mementos_.back());
        mementos_.pop_back();
        std::cout << "Caretaker: Restoring state to: " << memento->GetName() << "\n";
        originator_->Restore(memento.get());
    }
    void ShowHistory() const {
        std::cout << "Caretaker: Here's the list of mementos:\n";
        for (const auto& memento : mementos_) std::cout << memento->GetName() << "\n";
    }
};

int main() {
    Originator originator("Super-duper-super-puper-super.");
    Caretaker caretaker(&originator);

    caretaker.Backup();
    originator.DoSomething();
    caretaker.Backup();
    originator.DoSomething();
    caretaker.Backup();
    originator.DoSomething();

    std::cout << "\n";
    caretaker.ShowHistory();

    std::cout << "\nClient: Now, let's rollback!\n\n";
    caretaker.Undo();

    std::cout << "\nClient: Once more!\n\n";
    caretaker.Undo();
}
```

## Rust Example

```rust
use rand::Rng;

struct Memento {
    state: String,
    date: String,
}

impl Memento {
    fn new(state: String) -> Self {
        Memento { state, date: "2026-01-01 12:00:00".to_string() }
    }
    fn name(&self) -> String {
        format!("{} / ({}...)", self.date, &self.state[..9.min(self.state.len())])
    }
}

struct Originator {
    state: String,
}

impl Originator {
    fn new(state: &str) -> Self {
        println!("Originator: My initial state is: {}", state);
        Originator { state: state.to_string() }
    }

    fn do_something(&mut self) {
        println!("Originator: I'm doing something important.");
        self.state = random_string(30);
        println!("Originator: and my state has changed to: {}", self.state);
    }

    fn save(&self) -> Memento {
        Memento::new(self.state.clone())
    }

    fn restore(&mut self, memento: &Memento) {
        self.state = memento.state.clone();
        println!("Originator: My state has changed to: {}", self.state);
    }
}

fn random_string(length: usize) -> String {
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut rng = rand::thread_rng();
    (0..length).map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char).collect()
}

struct Caretaker<'a> {
    mementos: Vec<Memento>,
    originator: &'a mut Originator,
}

impl<'a> Caretaker<'a> {
    fn new(originator: &'a mut Originator) -> Self {
        Caretaker { mementos: Vec::new(), originator }
    }

    fn backup(&mut self) {
        println!("\nCaretaker: Saving Originator's state...");
        self.mementos.push(self.originator.save());
    }

    fn undo(&mut self) {
        if let Some(memento) = self.mementos.pop() {
            println!("Caretaker: Restoring state to: {}", memento.name());
            self.originator.restore(&memento);
        }
    }

    fn show_history(&self) {
        println!("Caretaker: Here's the list of mementos:");
        for memento in &self.mementos {
            println!("{}", memento.name());
        }
    }
}

fn main() {
    let mut originator = Originator::new("Super-duper-super-puper-super.");
    let mut caretaker = Caretaker::new(&mut originator);

    caretaker.backup();
    caretaker.originator.do_something();
    caretaker.backup();
    caretaker.originator.do_something();
    caretaker.backup();
    caretaker.originator.do_something();

    println!();
    caretaker.show_history();

    println!("\nClient: Now, let's rollback!\n");
    caretaker.undo();

    println!("\nClient: Once more!\n");
    caretaker.undo();
}
```

## Pairs well with

Command (Command + Memento = full undo/redo); State (snapshot the state-machine context); Iterator (Iterator state can
be captured in a Memento for resumable traversal).
