---
name: Observer
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/observer/typescript/example
---

# Observer

## Intent

Observer is a behavioral design pattern that lets you define a subscription mechanism to notify multiple objects about
any events that happen to the object they're observing.

## Applicability

- Changes to one object's state may require changing others, and the set of affected objects is unknown beforehand or
  changes dynamically
- Working with GUI classes where custom code needs to execute in response to user interactions
- Some objects must monitor others, but only temporarily or under specific conditions
- You need to establish loose coupling between event producers and event consumers

## Pros

- Supports the Open/Closed Principle by allowing new subscriber classes without modifying publisher code
- Enables runtime establishment of relationships between objects
- Promotes loose coupling through interface-based communication

## Cons

- Subscribers receive notifications in unpredictable order
- Performance overhead when managing large numbers of subscribers
- Risk of memory leaks if subscribers aren't properly unsubscribed

## Don't use when

- A single store subscription would do
- Only one consumer needs the event → just call the consumer directly
- Static, compile-time known dependencies → wire them directly

## TypeScript Example

```typescript
/**
 * The Subject interface declares a set of methods for managing subscribers.
 */
interface Subject {
    // Attach an observer to the subject.
    attach(observer: Observer): void;

    // Detach an observer from the subject.
    detach(observer: Observer): void;

    // Notify all observers about an event.
    notify(): void;
}

/**
 * The Subject owns some important state and notifies observers when the state
 * changes.
 */
class ConcreteSubject implements Subject {
    /**
     * @type {number} For the sake of simplicity, the Subject's state, essential
     * to all subscribers, is stored in this variable.
     */
    public state: number;

    /**
     * @type {Observer[]} List of subscribers. In real life, the list of
     * subscribers can be stored more comprehensively (categorized by event
     * type, etc.).
     */
    private observers: Observer[] = [];

    /**
     * The subscription management methods.
     */
    public attach(observer: Observer): void {
        const isExist = this.observers.includes(observer);
        if (isExist) {
            return console.log('Subject: Observer has been attached already.');
        }

        console.log('Subject: Attached an observer.');
        this.observers.push(observer);
    }

    public detach(observer: Observer): void {
        const observerIndex = this.observers.indexOf(observer);
        if (observerIndex === -1) {
            return console.log('Subject: Nonexistent observer.');
        }

        this.observers.splice(observerIndex, 1);
        console.log('Subject: Detached an observer.');
    }

    /**
     * Trigger an update in each subscriber.
     */
    public notify(): void {
        console.log('Subject: Notifying observers...');
        for (const observer of this.observers) {
            observer.update(this);
        }
    }

    /**
     * Usually, the subscription logic is only a fraction of what a Subject can
     * really do. Subjects commonly hold some important business logic, that
     * triggers a notification method whenever something important is about to
     * happen (or after it).
     */
    public someBusinessLogic(): void {
        console.log('\nSubject: I\'m doing something important.');
        this.state = Math.floor(Math.random() * (10 + 1));

        console.log(`Subject: My state has just changed to: ${this.state}`);
        this.notify();
    }
}

/**
 * The Observer interface declares the update method, used by subjects.
 */
interface Observer {
    // Receive update from subject.
    update(subject: Subject): void;
}

/**
 * Concrete Observers react to the updates issued by the Subject they had been
 * attached to.
 */
class ConcreteObserverA implements Observer {
    public update(subject: Subject): void {
        if (subject instanceof ConcreteSubject && subject.state < 3) {
            console.log('ConcreteObserverA: Reacted to the event.');
        }
    }
}

class ConcreteObserverB implements Observer {
    public update(subject: Subject): void {
        if (subject instanceof ConcreteSubject && (subject.state === 0 || subject.state >= 2)) {
            console.log('ConcreteObserverB: Reacted to the event.');
        }
    }
}

/**
 * The client code.
 */

const subject = new ConcreteSubject();

const observer1 = new ConcreteObserverA();
subject.attach(observer1);

const observer2 = new ConcreteObserverB();
subject.attach(observer2);

subject.someBusinessLogic();
subject.someBusinessLogic();

subject.detach(observer2);

subject.someBusinessLogic();
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from random import randrange
from typing import List


class Subject(ABC):
    """
    The Subject interface declares a set of methods for managing subscribers.
    """

    @abstractmethod
    def attach(self, observer: Observer) -> None:
        ...

    @abstractmethod
    def detach(self, observer: Observer) -> None:
        ...

    @abstractmethod
    def notify(self) -> None:
        ...


class ConcreteSubject(Subject):
    """
    The Subject owns some important state and notifies observers when it changes.
    """

    state: int = 0
    _observers: List[Observer] = []

    def attach(self, observer: Observer) -> None:
        if observer in self._observers:
            print("Subject: Observer has been attached already.")
            return
        print("Subject: Attached an observer.")
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        if observer not in self._observers:
            print("Subject: Nonexistent observer.")
            return
        self._observers.remove(observer)
        print("Subject: Detached an observer.")

    def notify(self) -> None:
        print("Subject: Notifying observers...")
        for observer in self._observers:
            observer.update(self)

    def some_business_logic(self) -> None:
        print("\nSubject: I'm doing something important.")
        self.state = randrange(0, 10)
        print(f"Subject: My state has just changed to: {self.state}")
        self.notify()


class Observer(ABC):
    """
    The Observer interface declares the update method, used by subjects.
    """

    @abstractmethod
    def update(self, subject: Subject) -> None:
        ...


class ConcreteObserverA(Observer):
    def update(self, subject: Subject) -> None:
        if subject.state < 3:
            print("ConcreteObserverA: Reacted to the event.")


class ConcreteObserverB(Observer):
    def update(self, subject: Subject) -> None:
        if subject.state == 0 or subject.state >= 2:
            print("ConcreteObserverB: Reacted to the event.")


if __name__ == "__main__":
    subject = ConcreteSubject()

    observer_a = ConcreteObserverA()
    subject.attach(observer_a)

    observer_b = ConcreteObserverB()
    subject.attach(observer_b)

    subject.some_business_logic()
    subject.some_business_logic()

    subject.detach(observer_b)

    subject.some_business_logic()
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * The Subject interface declares a set of methods for managing subscribers.
 */
interface Subject {
    void attach(Observer observer);
    void detach(Observer observer);
    void notifyObservers();
}

/**
 * The Observer interface declares the update method, used by subjects.
 */
interface Observer {
    void update(ConcreteSubject subject);
}

/**
 * The ConcreteSubject owns state and notifies observers when it changes.
 */
class ConcreteSubject implements Subject {
    public int state;
    private final List<Observer> observers = new ArrayList<>();

    public void attach(Observer observer) {
        if (observers.contains(observer)) {
            System.out.println("Subject: Observer has been attached already.");
            return;
        }
        System.out.println("Subject: Attached an observer.");
        observers.add(observer);
    }

    public void detach(Observer observer) {
        if (!observers.remove(observer)) {
            System.out.println("Subject: Nonexistent observer.");
            return;
        }
        System.out.println("Subject: Detached an observer.");
    }

    public void notifyObservers() {
        System.out.println("Subject: Notifying observers...");
        for (Observer observer : observers) {
            observer.update(this);
        }
    }

    public void someBusinessLogic() {
        System.out.println("\nSubject: I'm doing something important.");
        state = new Random().nextInt(11);
        System.out.println("Subject: My state has just changed to: " + state);
        notifyObservers();
    }
}

class ConcreteObserverA implements Observer {
    public void update(ConcreteSubject subject) {
        if (subject.state < 3) {
            System.out.println("ConcreteObserverA: Reacted to the event.");
        }
    }
}

class ConcreteObserverB implements Observer {
    public void update(ConcreteSubject subject) {
        if (subject.state == 0 || subject.state >= 2) {
            System.out.println("ConcreteObserverB: Reacted to the event.");
        }
    }
}

public class Demo {
    public static void main(String[] args) {
        ConcreteSubject subject = new ConcreteSubject();

        Observer observerA = new ConcreteObserverA();
        subject.attach(observerA);

        Observer observerB = new ConcreteObserverB();
        subject.attach(observerB);

        subject.someBusinessLogic();
        subject.someBusinessLogic();

        subject.detach(observerB);

        subject.someBusinessLogic();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Subject interface declares a set of methods for managing subscribers.
public interface ISubject
{
    void Attach(IObserver observer);
    void Detach(IObserver observer);
    void Notify();
}

// The Observer interface declares the update method, used by subjects.
public interface IObserver
{
    void Update(ConcreteSubject subject);
}

// The ConcreteSubject owns state and notifies observers when it changes.
public class ConcreteSubject : ISubject
{
    public int State;
    private readonly List<IObserver> _observers = new List<IObserver>();

    public void Attach(IObserver observer)
    {
        if (_observers.Contains(observer))
        {
            Console.WriteLine("Subject: Observer has been attached already.");
            return;
        }
        Console.WriteLine("Subject: Attached an observer.");
        _observers.Add(observer);
    }

    public void Detach(IObserver observer)
    {
        if (!_observers.Remove(observer))
        {
            Console.WriteLine("Subject: Nonexistent observer.");
            return;
        }
        Console.WriteLine("Subject: Detached an observer.");
    }

    public void Notify()
    {
        Console.WriteLine("Subject: Notifying observers...");
        foreach (var observer in _observers)
        {
            observer.Update(this);
        }
    }

    public void SomeBusinessLogic()
    {
        Console.WriteLine("\nSubject: I'm doing something important.");
        State = new Random().Next(0, 11);
        Console.WriteLine($"Subject: My state has just changed to: {State}");
        Notify();
    }
}

public class ConcreteObserverA : IObserver
{
    public void Update(ConcreteSubject subject)
    {
        if (subject.State < 3)
            Console.WriteLine("ConcreteObserverA: Reacted to the event.");
    }
}

public class ConcreteObserverB : IObserver
{
    public void Update(ConcreteSubject subject)
    {
        if (subject.State == 0 || subject.State >= 2)
            Console.WriteLine("ConcreteObserverB: Reacted to the event.");
    }
}

public class Program
{
    public static void Main()
    {
        var subject = new ConcreteSubject();

        var observerA = new ConcreteObserverA();
        subject.Attach(observerA);

        var observerB = new ConcreteObserverB();
        subject.Attach(observerB);

        subject.SomeBusinessLogic();
        subject.SomeBusinessLogic();

        subject.Detach(observerB);

        subject.SomeBusinessLogic();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"math/rand"
)

// Observer declares the update method, used by subjects.
type Observer interface {
	Update(subject *ConcreteSubject)
}

// Subject declares a set of methods for managing subscribers.
type Subject interface {
	Attach(observer Observer)
	Detach(observer Observer)
	Notify()
}

// ConcreteSubject owns state and notifies observers when it changes.
type ConcreteSubject struct {
	State     int
	observers []Observer
}

func (s *ConcreteSubject) Attach(observer Observer) {
	for _, o := range s.observers {
		if o == observer {
			fmt.Println("Subject: Observer has been attached already.")
			return
		}
	}
	fmt.Println("Subject: Attached an observer.")
	s.observers = append(s.observers, observer)
}

func (s *ConcreteSubject) Detach(observer Observer) {
	for i, o := range s.observers {
		if o == observer {
			s.observers = append(s.observers[:i], s.observers[i+1:]...)
			fmt.Println("Subject: Detached an observer.")
			return
		}
	}
	fmt.Println("Subject: Nonexistent observer.")
}

func (s *ConcreteSubject) Notify() {
	fmt.Println("Subject: Notifying observers...")
	for _, o := range s.observers {
		o.Update(s)
	}
}

func (s *ConcreteSubject) SomeBusinessLogic() {
	fmt.Println("\nSubject: I'm doing something important.")
	s.State = rand.Intn(11)
	fmt.Printf("Subject: My state has just changed to: %d\n", s.State)
	s.Notify()
}

type ConcreteObserverA struct{}

func (ConcreteObserverA) Update(subject *ConcreteSubject) {
	if subject.State < 3 {
		fmt.Println("ConcreteObserverA: Reacted to the event.")
	}
}

type ConcreteObserverB struct{}

func (ConcreteObserverB) Update(subject *ConcreteSubject) {
	if subject.State == 0 || subject.State >= 2 {
		fmt.Println("ConcreteObserverB: Reacted to the event.")
	}
}

func main() {
	subject := &ConcreteSubject{}

	observerA := &ConcreteObserverA{}
	subject.Attach(observerA)

	observerB := &ConcreteObserverB{}
	subject.Attach(observerB)

	subject.SomeBusinessLogic()
	subject.SomeBusinessLogic()

	subject.Detach(observerB)

	subject.SomeBusinessLogic()
}
```

## C++ Example

```cpp
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <vector>

class ConcreteSubject;

// The Observer interface declares the update method, used by subjects.
class Observer {
public:
    virtual ~Observer() = default;
    virtual void update(const ConcreteSubject& subject) = 0;
};

// The Subject owns state and notifies observers when it changes.
class ConcreteSubject {
    std::vector<Observer*> observers_;

public:
    int state = 0;

    void attach(Observer* observer) {
        if (std::find(observers_.begin(), observers_.end(), observer) != observers_.end()) {
            std::cout << "Subject: Observer has been attached already.\n";
            return;
        }
        std::cout << "Subject: Attached an observer.\n";
        observers_.push_back(observer);
    }

    void detach(Observer* observer) {
        auto it = std::find(observers_.begin(), observers_.end(), observer);
        if (it == observers_.end()) {
            std::cout << "Subject: Nonexistent observer.\n";
            return;
        }
        observers_.erase(it);
        std::cout << "Subject: Detached an observer.\n";
    }

    void notify() {
        std::cout << "Subject: Notifying observers...\n";
        for (Observer* observer : observers_) {
            observer->update(*this);
        }
    }

    void someBusinessLogic() {
        std::cout << "\nSubject: I'm doing something important.\n";
        state = std::rand() % 11;
        std::cout << "Subject: My state has just changed to: " << state << "\n";
        notify();
    }
};

class ConcreteObserverA : public Observer {
public:
    void update(const ConcreteSubject& subject) override {
        if (subject.state < 3) {
            std::cout << "ConcreteObserverA: Reacted to the event.\n";
        }
    }
};

class ConcreteObserverB : public Observer {
public:
    void update(const ConcreteSubject& subject) override {
        if (subject.state == 0 || subject.state >= 2) {
            std::cout << "ConcreteObserverB: Reacted to the event.\n";
        }
    }
};

int main() {
    ConcreteSubject subject;

    ConcreteObserverA observerA;
    subject.attach(&observerA);

    ConcreteObserverB observerB;
    subject.attach(&observerB);

    subject.someBusinessLogic();
    subject.someBusinessLogic();

    subject.detach(&observerB);

    subject.someBusinessLogic();
}
```

## Rust Example

```rust
use std::rc::Rc;

// The Observer trait declares the update method, used by subjects.
trait Observer {
    fn update(&self, state: i32);
}

// The Subject owns state and notifies observers when it changes.
struct ConcreteSubject {
    state: i32,
    observers: Vec<Rc<dyn Observer>>,
}

impl ConcreteSubject {
    fn new() -> Self {
        ConcreteSubject { state: 0, observers: Vec::new() }
    }

    fn attach(&mut self, observer: Rc<dyn Observer>) {
        if self.observers.iter().any(|o| Rc::ptr_eq(o, &observer)) {
            println!("Subject: Observer has been attached already.");
            return;
        }
        println!("Subject: Attached an observer.");
        self.observers.push(observer);
    }

    fn detach(&mut self, observer: &Rc<dyn Observer>) {
        let len = self.observers.len();
        self.observers.retain(|o| !Rc::ptr_eq(o, observer));
        if self.observers.len() == len {
            println!("Subject: Nonexistent observer.");
        } else {
            println!("Subject: Detached an observer.");
        }
    }

    fn notify(&self) {
        println!("Subject: Notifying observers...");
        for observer in &self.observers {
            observer.update(self.state);
        }
    }

    fn some_business_logic(&mut self, next_state: i32) {
        println!("\nSubject: I'm doing something important.");
        self.state = next_state;
        println!("Subject: My state has just changed to: {}", self.state);
        self.notify();
    }
}

struct ConcreteObserverA;

impl Observer for ConcreteObserverA {
    fn update(&self, state: i32) {
        if state < 3 {
            println!("ConcreteObserverA: Reacted to the event.");
        }
    }
}

struct ConcreteObserverB;

impl Observer for ConcreteObserverB {
    fn update(&self, state: i32) {
        if state == 0 || state >= 2 {
            println!("ConcreteObserverB: Reacted to the event.");
        }
    }
}

fn main() {
    let mut subject = ConcreteSubject::new();

    let observer_a: Rc<dyn Observer> = Rc::new(ConcreteObserverA);
    subject.attach(Rc::clone(&observer_a));

    let observer_b: Rc<dyn Observer> = Rc::new(ConcreteObserverB);
    subject.attach(Rc::clone(&observer_b));

    subject.some_business_logic(2);
    subject.some_business_logic(5);

    subject.detach(&observer_b);

    subject.some_business_logic(1);
}
```

## Pairs well with

Mediator (Observer broadcasts; Mediator also routes); Command (commands often emit events through Observer); Memento (
snapshot triggered by state-change observation).
