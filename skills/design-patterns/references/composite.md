---
name: Composite
category: Structural
popularity: 2/3
tier: 2
source: refactoring.guru/design-patterns/composite/typescript/example
---

# Composite

## Intent

Composite is a structural design pattern that lets you compose objects into tree structures and then work with these
structures as if they were individual objects.

## Applicability

- Your app's core model can be represented as a hierarchical tree structure with both simple and complex elements
- You want client code to handle simple and complex elements uniformly through a shared interface
- You need to avoid tight coupling between clients and concrete component classes in a tree structure

## Pros

- Work with complex tree structures more conveniently using polymorphism and recursion
- Open/Closed Principle: introduce new element types without breaking existing code
- Clients treat all elements equally regardless of complexity

## Cons

- Difficult to establish common interfaces when component functionalities differ significantly
- May require overgeneralizing the component interface, reducing clarity
- Can be unnecessarily complex for simple, non-hierarchical object structures

## Don't use when

- The hierarchy is one or two levels deep → flat array is enough
- Leaves and composites have nothing meaningful in common → forcing a shared interface hurts clarity
- A simple recursive function over a plain object tree would suffice

## TypeScript Example

```typescript
/**
 * The base Component class declares common operations for both simple and
 * complex objects of a composition.
 */
abstract class Component {
    protected parent!: Component | null;

    /**
     * Optionally, the base Component can declare an interface for setting and
     * accessing a parent of the component in a tree structure. It can also
     * provide some default implementation for these methods.
     */
    public setParent(parent: Component | null) {
        this.parent = parent;
    }

    public getParent(): Component | null {
        return this.parent;
    }

    /**
     * In some cases, it would be beneficial to define the child-management
     * operations right in the base Component class. This way, you won't need to
     * expose any concrete component classes to the client code, even during the
     * object tree assembly. The downside is that these methods will be empty
     * for the leaf-level components.
     */
    public add(component: Component): void {
    }

    public remove(component: Component): void {
    }

    /**
     * You can provide a method that lets the client code figure out whether a
     * component can bear children.
     */
    public isComposite(): boolean {
        return false;
    }

    /**
     * The base Component may implement some default behavior or leave it to
     * concrete classes (by declaring the method containing the behavior as
     * "abstract").
     */
    public abstract operation(): string;
}

/**
 * The Leaf class represents the end objects of a composition. A leaf can't have
 * any children.
 *
 * Usually, it's the Leaf objects that do the actual work, whereas Composite
 * objects only delegate to their sub-components.
 */
class Leaf extends Component {
    public operation(): string {
        return 'Leaf';
    }
}

/**
 * The Composite class represents the complex components that may have children.
 * Usually, the Composite objects delegate the actual work to their children and
 * then "sum-up" the result.
 */
class Composite extends Component {
    protected children: Component[] = [];

    public add(component: Component): void {
        this.children.push(component);
        component.setParent(this);
    }

    public remove(component: Component): void {
        const componentIndex = this.children.indexOf(component);
        this.children.splice(componentIndex, 1);

        component.setParent(null);
    }

    public isComposite(): boolean {
        return true;
    }

    /**
     * The Composite executes its primary logic in a particular way. It
     * traverses recursively through all its children, collecting and summing
     * their results. Since the composite's children pass these calls to their
     * children and so forth, the whole object tree is traversed as a result.
     */
    public operation(): string {
        const results = [];
        for (const child of this.children) {
            results.push(child.operation());
        }

        return `Branch(${results.join('+')})`;
    }
}

function clientCode(component: Component) {
    console.log(`RESULT: ${component.operation()}`);
}

const simple = new Leaf();
console.log('Client: I\'ve got a simple component:');
clientCode(simple);
console.log('');

const tree = new Composite();
const branch1 = new Composite();
branch1.add(new Leaf());
branch1.add(new Leaf());
const branch2 = new Composite();
branch2.add(new Leaf());
tree.add(branch1);
tree.add(branch2);
console.log('Client: Now I\'ve got a composite tree:');
clientCode(tree);
```

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional


class Component(ABC):
    """The base Component declares common operations for both simple and complex
    objects of a composition."""

    @property
    def parent(self) -> Optional[Component]:
        return self._parent

    @parent.setter
    def parent(self, parent: Optional[Component]) -> None:
        self._parent = parent

    def add(self, component: Component) -> None:
        pass

    def remove(self, component: Component) -> None:
        pass

    def is_composite(self) -> bool:
        return False

    @abstractmethod
    def operation(self) -> str:
        pass


class Leaf(Component):
    """The Leaf represents the end objects of a composition; it can't have
    children and usually does the actual work."""

    def operation(self) -> str:
        return "Leaf"


class Composite(Component):
    """The Composite represents complex components that may have children,
    delegating the actual work to them and summing up the result."""

    def __init__(self) -> None:
        self._children: List[Component] = []

    def add(self, component: Component) -> None:
        self._children.append(component)
        component.parent = self

    def remove(self, component: Component) -> None:
        self._children.remove(component)
        component.parent = None

    def is_composite(self) -> bool:
        return True

    def operation(self) -> str:
        results = [child.operation() for child in self._children]
        return f"Branch({'+'.join(results)})"


def client_code(component: Component) -> None:
    print(f"RESULT: {component.operation()}")


if __name__ == "__main__":
    simple = Leaf()
    print("Client: I've got a simple component:")
    client_code(simple)
    print()

    tree = Composite()
    branch1 = Composite()
    branch1.add(Leaf())
    branch1.add(Leaf())
    branch2 = Composite()
    branch2.add(Leaf())
    tree.add(branch1)
    tree.add(branch2)
    print("Client: Now I've got a composite tree:")
    client_code(tree)
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

// The base Component declares common operations for simple and complex objects.
abstract class Component {
    protected Component parent;

    public void setParent(Component parent) { this.parent = parent; }
    public Component getParent() { return parent; }

    public void add(Component component) {}
    public void remove(Component component) {}
    public boolean isComposite() { return false; }

    public abstract String operation();
}

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf extends Component {
    public String operation() {
        return "Leaf";
    }
}

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite extends Component {
    protected List<Component> children = new ArrayList<>();

    public void add(Component component) {
        children.add(component);
        component.setParent(this);
    }

    public void remove(Component component) {
        children.remove(component);
        component.setParent(null);
    }

    public boolean isComposite() { return true; }

    public String operation() {
        StringJoiner joiner = new StringJoiner("+");
        for (Component child : children) {
            joiner.add(child.operation());
        }
        return "Branch(" + joiner + ")";
    }
}

public class Demo {
    static void clientCode(Component component) {
        System.out.println("RESULT: " + component.operation());
    }

    public static void main(String[] args) {
        Component simple = new Leaf();
        System.out.println("Client: I've got a simple component:");
        clientCode(simple);
        System.out.println();

        Composite tree = new Composite();
        Composite branch1 = new Composite();
        branch1.add(new Leaf());
        branch1.add(new Leaf());
        Composite branch2 = new Composite();
        branch2.add(new Leaf());
        tree.add(branch1);
        tree.add(branch2);
        System.out.println("Client: Now I've got a composite tree:");
        clientCode(tree);
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The base Component declares common operations for simple and complex objects.
abstract class Component
{
    public Component Parent { get; set; }

    public virtual void Add(Component component) { }
    public virtual void Remove(Component component) { }
    public virtual bool IsComposite() => false;

    public abstract string Operation();
}

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf : Component
{
    public override string Operation() => "Leaf";
}

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite : Component
{
    protected List<Component> children = new List<Component>();

    public override void Add(Component component)
    {
        children.Add(component);
        component.Parent = this;
    }

    public override void Remove(Component component)
    {
        children.Remove(component);
        component.Parent = null;
    }

    public override bool IsComposite() => true;

    public override string Operation()
    {
        var results = new List<string>();
        foreach (var child in children)
            results.Add(child.Operation());
        return $"Branch({string.Join("+", results)})";
    }
}

class Program
{
    static void ClientCode(Component component)
    {
        Console.WriteLine($"RESULT: {component.Operation()}");
    }

    static void Main(string[] args)
    {
        Component simple = new Leaf();
        Console.WriteLine("Client: I've got a simple component:");
        ClientCode(simple);
        Console.WriteLine();

        Composite tree = new Composite();
        Composite branch1 = new Composite();
        branch1.Add(new Leaf());
        branch1.Add(new Leaf());
        Composite branch2 = new Composite();
        branch2.Add(new Leaf());
        tree.Add(branch1);
        tree.Add(branch2);
        Console.WriteLine("Client: Now I've got a composite tree:");
        ClientCode(tree);
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

// Component declares common operations for simple and complex objects.
type Component interface {
	Operation() string
	Add(component Component)
	IsComposite() bool
}

// Leaf represents the end objects; it can't have children and does the work.
type Leaf struct{}

func (l *Leaf) Operation() string      { return "Leaf" }
func (l *Leaf) Add(component Component) {}
func (l *Leaf) IsComposite() bool      { return false }

// Composite represents complex components that may have children, delegating
// the actual work to them and summing up the result.
type Composite struct {
	children []Component
}

func (c *Composite) Add(component Component) {
	c.children = append(c.children, component)
}

func (c *Composite) IsComposite() bool { return true }

func (c *Composite) Operation() string {
	results := make([]string, 0, len(c.children))
	for _, child := range c.children {
		results = append(results, child.Operation())
	}
	return fmt.Sprintf("Branch(%s)", strings.Join(results, "+"))
}

func clientCode(component Component) {
	fmt.Printf("RESULT: %s\n", component.Operation())
}

func main() {
	simple := &Leaf{}
	fmt.Println("Client: I've got a simple component:")
	clientCode(simple)
	fmt.Println()

	tree := &Composite{}
	branch1 := &Composite{}
	branch1.Add(&Leaf{})
	branch1.Add(&Leaf{})
	branch2 := &Composite{}
	branch2.Add(&Leaf{})
	tree.Add(branch1)
	tree.Add(branch2)
	fmt.Println("Client: Now I've got a composite tree:")
	clientCode(tree)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The base Component declares common operations for simple and complex objects.
class Component {
public:
    virtual ~Component() = default;
    virtual void Add(std::shared_ptr<Component> component) {}
    virtual bool IsComposite() const { return false; }
    virtual std::string Operation() const = 0;
};

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf : public Component {
public:
    std::string Operation() const override { return "Leaf"; }
};

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite : public Component {
protected:
    std::vector<std::shared_ptr<Component>> children_;

public:
    void Add(std::shared_ptr<Component> component) override {
        children_.push_back(std::move(component));
    }

    bool IsComposite() const override { return true; }

    std::string Operation() const override {
        std::string result;
        for (size_t i = 0; i < children_.size(); ++i) {
            if (i > 0) result += "+";
            result += children_[i]->Operation();
        }
        return "Branch(" + result + ")";
    }
};

void ClientCode(const std::shared_ptr<Component>& component) {
    std::cout << "RESULT: " << component->Operation() << "\n";
}

int main() {
    auto simple = std::make_shared<Leaf>();
    std::cout << "Client: I've got a simple component:\n";
    ClientCode(simple);
    std::cout << "\n";

    auto tree = std::make_shared<Composite>();
    auto branch1 = std::make_shared<Composite>();
    branch1->Add(std::make_shared<Leaf>());
    branch1->Add(std::make_shared<Leaf>());
    auto branch2 = std::make_shared<Composite>();
    branch2->Add(std::make_shared<Leaf>());
    tree->Add(branch1);
    tree->Add(branch2);
    std::cout << "Client: Now I've got a composite tree:\n";
    ClientCode(tree);
    return 0;
}
```

## Rust Example

```rust
// The base Component trait declares common operations for simple and complex
// objects of a composition.
trait Component {
    fn operation(&self) -> String;
    fn add(&mut self, _component: Box<dyn Component>) {}
    fn is_composite(&self) -> bool {
        false
    }
}

// The Leaf represents the end objects; it can't have children and does the work.
struct Leaf;

impl Component for Leaf {
    fn operation(&self) -> String {
        "Leaf".to_string()
    }
}

// The Composite represents complex components that may have children, delegating
// the actual work to them and summing up the result.
struct Composite {
    children: Vec<Box<dyn Component>>,
}

impl Composite {
    fn new() -> Self {
        Composite { children: Vec::new() }
    }
}

impl Component for Composite {
    fn add(&mut self, component: Box<dyn Component>) {
        self.children.push(component);
    }

    fn is_composite(&self) -> bool {
        true
    }

    fn operation(&self) -> String {
        let results: Vec<String> = self.children.iter().map(|c| c.operation()).collect();
        format!("Branch({})", results.join("+"))
    }
}

fn client_code(component: &dyn Component) {
    println!("RESULT: {}", component.operation());
}

fn main() {
    let simple = Leaf;
    println!("Client: I've got a simple component:");
    client_code(&simple);
    println!();

    let mut tree = Composite::new();
    let mut branch1 = Composite::new();
    branch1.add(Box::new(Leaf));
    branch1.add(Box::new(Leaf));
    let mut branch2 = Composite::new();
    branch2.add(Box::new(Leaf));
    tree.add(Box::new(branch1));
    tree.add(Box::new(branch2));
    println!("Client: Now I've got a composite tree:");
    client_code(&tree);
}
```

## Pairs well with

Iterator (Iterator walks the Composite); Visitor (Visitor performs operations across the whole tree); Decorator (both
share the recursive wrapping shape).
