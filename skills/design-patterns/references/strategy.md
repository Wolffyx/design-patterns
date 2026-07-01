---
name: Strategy
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/strategy/typescript/example
---

# Strategy

## Intent

Strategy is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate
class, and make their objects interchangeable.

## Applicability

- You need different variations of an algorithm within an object and want runtime switching between them
- You have similar classes differing only in how they execute specific behaviors
- You want to isolate business logic from algorithm implementation details that may be less critical
- Your class contains massive conditionals selecting between algorithm variants
- You want to enable clients to select appropriate algorithms based on their specific needs

## Pros

- Swap algorithms at runtime without modifying the context object
- Isolate algorithm implementation from the code that uses it
- Replace inheritance hierarchies with composition-based design
- Adhere to the Open/Closed Principle by introducing new strategies without changing existing code

## Cons

- Adds unnecessary complexity for programs with few algorithms that rarely change
- Clients must understand strategy differences to select the appropriate one
- Modern functional programming languages reduce the pattern's value through anonymous functions (a function reference
  is a strategy)

## Don't use when

- You only have one algorithm and no plan for a second → just write the function
- The "strategies" are 1-line functions → pass a function instead of building a class hierarchy
- A simple `switch` over 2-3 cases is clearer than 3 strategy classes

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients.
 */
class Context {
    /**
     * @type {Strategy} The Context maintains a reference to one of the Strategy
     * objects. The Context does not know the concrete class of a strategy. It
     * should work with all strategies via the Strategy interface.
     */
    private strategy: Strategy;

    /**
     * Usually, the Context accepts a strategy through the constructor, but also
     * provides a setter to change it at runtime.
     */
    constructor(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * Usually, the Context allows replacing a Strategy object at runtime.
     */
    public setStrategy(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * The Context delegates some work to the Strategy object instead of
     * implementing multiple versions of the algorithm on its own.
     */
    public doSomeBusinessLogic(): void {
        // ...

        console.log('Context: Sorting data using the strategy (not sure how it\'ll do it)');
        const result = this.strategy.doAlgorithm(['a', 'b', 'c', 'd', 'e']);
        console.log(result.join(','));

        // ...
    }
}

/**
 * The Strategy interface declares operations common to all supported versions
 * of some algorithm.
 */
interface Strategy {
    doAlgorithm(data: string[]): string[];
}

/**
 * Concrete Strategies implement the algorithm while following the base Strategy
 * interface. The interface makes them interchangeable in the Context.
 */
class ConcreteStrategyA implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.sort();
    }
}

class ConcreteStrategyB implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.reverse();
    }
}

/**
 * The client code picks a concrete strategy and passes it to the context.
 */
const context = new Context(new ConcreteStrategyA());
console.log('Client: Strategy is set to normal sorting.');
context.doSomeBusinessLogic();

console.log('');

console.log('Client: Strategy is set to reverse sorting.');
context.setStrategy(new ConcreteStrategyB());
context.doSomeBusinessLogic();
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List


class Context:
    """
    The Context defines the interface of interest to clients.
    """

    def __init__(self, strategy: Strategy) -> None:
        # The Context accepts a strategy through the constructor, but also
        # provides a setter to change it at runtime.
        self._strategy = strategy

    @property
    def strategy(self) -> Strategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: Strategy) -> None:
        # The Context allows replacing a Strategy object at runtime.
        self._strategy = strategy

    def do_some_business_logic(self) -> None:
        # The Context delegates work to the Strategy object instead of
        # implementing multiple versions of the algorithm on its own.
        print("Context: Sorting data using the strategy (not sure how it'll do it)")
        result = self._strategy.do_algorithm(["a", "b", "c", "d", "e"])
        print(",".join(result))


class Strategy(ABC):
    """
    The Strategy interface declares operations common to all supported versions
    of some algorithm.
    """

    @abstractmethod
    def do_algorithm(self, data: List[str]) -> List[str]:
        ...


class ConcreteStrategyA(Strategy):
    def do_algorithm(self, data: List[str]) -> List[str]:
        return sorted(data)


class ConcreteStrategyB(Strategy):
    def do_algorithm(self, data: List[str]) -> List[str]:
        return list(reversed(data))


if __name__ == "__main__":
    # The client code picks a concrete strategy and passes it to the context.
    context = Context(ConcreteStrategyA())
    print("Client: Strategy is set to normal sorting.")
    context.do_some_business_logic()

    print()

    print("Client: Strategy is set to reverse sorting.")
    context.strategy = ConcreteStrategyB()
    context.do_some_business_logic()
```

## Java Example

```java
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * The Strategy interface declares operations common to all supported versions
 * of some algorithm.
 */
interface Strategy {
    List<String> doAlgorithm(List<String> data);
}

/**
 * The Context maintains a reference to one of the Strategy objects and works
 * with it only via the Strategy interface.
 */
class Context {
    private Strategy strategy;

    public Context(Strategy strategy) {
        this.strategy = strategy;
    }

    // The Context allows replacing a Strategy object at runtime.
    public void setStrategy(Strategy strategy) {
        this.strategy = strategy;
    }

    public void doSomeBusinessLogic() {
        System.out.println("Context: Sorting data using the strategy (not sure how it'll do it)");
        List<String> result = strategy.doAlgorithm(Arrays.asList("a", "b", "c", "d", "e"));
        System.out.println(String.join(",", result));
    }
}

class ConcreteStrategyA implements Strategy {
    public List<String> doAlgorithm(List<String> data) {
        List<String> result = new java.util.ArrayList<>(data);
        Collections.sort(result);
        return result;
    }
}

class ConcreteStrategyB implements Strategy {
    public List<String> doAlgorithm(List<String> data) {
        List<String> result = new java.util.ArrayList<>(data);
        Collections.reverse(result);
        return result;
    }
}

public class Demo {
    public static void main(String[] args) {
        // The client picks a concrete strategy and passes it to the context.
        Context context = new Context(new ConcreteStrategyA());
        System.out.println("Client: Strategy is set to normal sorting.");
        context.doSomeBusinessLogic();

        System.out.println();

        System.out.println("Client: Strategy is set to reverse sorting.");
        context.setStrategy(new ConcreteStrategyB());
        context.doSomeBusinessLogic();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

// The Strategy interface declares operations common to all supported versions
// of some algorithm.
public interface IStrategy
{
    List<string> DoAlgorithm(List<string> data);
}

// The Context maintains a reference to a Strategy object and works with it
// only via the Strategy interface.
public class Context
{
    private IStrategy _strategy;

    public Context(IStrategy strategy)
    {
        _strategy = strategy;
    }

    // The Context allows replacing a Strategy object at runtime.
    public void SetStrategy(IStrategy strategy)
    {
        _strategy = strategy;
    }

    public void DoSomeBusinessLogic()
    {
        Console.WriteLine("Context: Sorting data using the strategy (not sure how it'll do it)");
        var result = _strategy.DoAlgorithm(new List<string> { "a", "b", "c", "d", "e" });
        Console.WriteLine(string.Join(",", result));
    }
}

public class ConcreteStrategyA : IStrategy
{
    public List<string> DoAlgorithm(List<string> data)
    {
        var result = new List<string>(data);
        result.Sort();
        return result;
    }
}

public class ConcreteStrategyB : IStrategy
{
    public List<string> DoAlgorithm(List<string> data)
    {
        return data.AsEnumerable().Reverse().ToList();
    }
}

public class Program
{
    public static void Main()
    {
        // The client picks a concrete strategy and passes it to the context.
        var context = new Context(new ConcreteStrategyA());
        Console.WriteLine("Client: Strategy is set to normal sorting.");
        context.DoSomeBusinessLogic();

        Console.WriteLine();

        Console.WriteLine("Client: Strategy is set to reverse sorting.");
        context.SetStrategy(new ConcreteStrategyB());
        context.DoSomeBusinessLogic();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"sort"
	"strings"
)

// Strategy declares operations common to all supported versions of some
// algorithm.
type Strategy interface {
	DoAlgorithm(data []string) []string
}

// Context maintains a reference to a Strategy and works with it only via the
// Strategy interface.
type Context struct {
	strategy Strategy
}

// SetStrategy allows replacing a Strategy at runtime.
func (c *Context) SetStrategy(strategy Strategy) {
	c.strategy = strategy
}

func (c *Context) DoSomeBusinessLogic() {
	fmt.Println("Context: Sorting data using the strategy (not sure how it'll do it)")
	result := c.strategy.DoAlgorithm([]string{"a", "b", "c", "d", "e"})
	fmt.Println(strings.Join(result, ","))
}

type ConcreteStrategyA struct{}

func (ConcreteStrategyA) DoAlgorithm(data []string) []string {
	result := append([]string(nil), data...)
	sort.Strings(result)
	return result
}

type ConcreteStrategyB struct{}

func (ConcreteStrategyB) DoAlgorithm(data []string) []string {
	result := append([]string(nil), data...)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	return result
}

func main() {
	// The client picks a concrete strategy and passes it to the context.
	context := &Context{strategy: ConcreteStrategyA{}}
	fmt.Println("Client: Strategy is set to normal sorting.")
	context.DoSomeBusinessLogic()

	fmt.Println()

	fmt.Println("Client: Strategy is set to reverse sorting.")
	context.SetStrategy(ConcreteStrategyB{})
	context.DoSomeBusinessLogic()
}
```

## C++ Example

```cpp
#include <algorithm>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The Strategy interface declares operations common to all supported versions
// of some algorithm.
class Strategy {
public:
    virtual ~Strategy() = default;
    virtual std::vector<std::string> doAlgorithm(std::vector<std::string> data) const = 0;
};

// The Context works with a Strategy only via the Strategy interface.
class Context {
    std::unique_ptr<Strategy> strategy_;

public:
    explicit Context(std::unique_ptr<Strategy> strategy)
        : strategy_(std::move(strategy)) {}

    // Allows replacing a Strategy object at runtime.
    void setStrategy(std::unique_ptr<Strategy> strategy) {
        strategy_ = std::move(strategy);
    }

    void doSomeBusinessLogic() const {
        std::cout << "Context: Sorting data using the strategy (not sure how it'll do it)\n";
        auto result = strategy_->doAlgorithm({"a", "b", "c", "d", "e"});
        for (std::size_t i = 0; i < result.size(); ++i) {
            std::cout << (i ? "," : "") << result[i];
        }
        std::cout << "\n";
    }
};

class ConcreteStrategyA : public Strategy {
public:
    std::vector<std::string> doAlgorithm(std::vector<std::string> data) const override {
        std::sort(data.begin(), data.end());
        return data;
    }
};

class ConcreteStrategyB : public Strategy {
public:
    std::vector<std::string> doAlgorithm(std::vector<std::string> data) const override {
        std::reverse(data.begin(), data.end());
        return data;
    }
};

int main() {
    // The client picks a concrete strategy and passes it to the context.
    Context context(std::make_unique<ConcreteStrategyA>());
    std::cout << "Client: Strategy is set to normal sorting.\n";
    context.doSomeBusinessLogic();

    std::cout << "\n";

    std::cout << "Client: Strategy is set to reverse sorting.\n";
    context.setStrategy(std::make_unique<ConcreteStrategyB>());
    context.doSomeBusinessLogic();
}
```

## Rust Example

```rust
// The Strategy trait declares operations common to all supported versions of
// some algorithm.
trait Strategy {
    fn do_algorithm(&self, data: Vec<String>) -> Vec<String>;
}

// The Context works with a Strategy only via the Strategy trait.
struct Context {
    strategy: Box<dyn Strategy>,
}

impl Context {
    fn new(strategy: Box<dyn Strategy>) -> Self {
        Context { strategy }
    }

    // Allows replacing a Strategy object at runtime.
    fn set_strategy(&mut self, strategy: Box<dyn Strategy>) {
        self.strategy = strategy;
    }

    fn do_some_business_logic(&self) {
        println!("Context: Sorting data using the strategy (not sure how it'll do it)");
        let data = ["a", "b", "c", "d", "e"].iter().map(|s| s.to_string()).collect();
        let result = self.strategy.do_algorithm(data);
        println!("{}", result.join(","));
    }
}

struct ConcreteStrategyA;

impl Strategy for ConcreteStrategyA {
    fn do_algorithm(&self, mut data: Vec<String>) -> Vec<String> {
        data.sort();
        data
    }
}

struct ConcreteStrategyB;

impl Strategy for ConcreteStrategyB {
    fn do_algorithm(&self, mut data: Vec<String>) -> Vec<String> {
        data.reverse();
        data
    }
}

fn main() {
    // The client picks a concrete strategy and passes it to the context.
    let mut context = Context::new(Box::new(ConcreteStrategyA));
    println!("Client: Strategy is set to normal sorting.");
    context.do_some_business_logic();

    println!();

    println!("Client: Strategy is set to reverse sorting.");
    context.set_strategy(Box::new(ConcreteStrategyB));
    context.do_some_business_logic();
}
```

## Pairs well with

Factory Method (factory picks the concrete strategy); State (State picks Strategy based on internal mode); Adapter (
kernel/renderer strategies are also adapters over external libraries).
