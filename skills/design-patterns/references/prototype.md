---
name: Prototype
category: Creational
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/prototype/typescript/example
---

# Prototype

## Intent

Prototype is a creational design pattern that lets you copy existing objects without making your code dependent on their
classes.

## Applicability

- Your code must work with objects from third-party code via interfaces, where concrete classes are unknown
- You want to reduce numerous subclasses that differ only in initialization logic
- Creating objects through standard instantiation is complex or expensive
- You need to avoid coupling to concrete class hierarchies when cloning objects
- You want to provide pre-configured object templates for common scenarios

## Pros

- Objects can be duplicated without depending on their specific classes
- Eliminates redundant initialization code by using pre-built prototypes
- Complex objects are created more efficiently
- Provides an alternative to inheritance for handling configuration variations

## Cons

- Cloning objects with circular references presents significant challenges
- Deep copying of complex object graphs can be tricky to implement correctly

## Don't use when

- A plain `structuredClone()` or spread operator does the job → use the built-in
- The object has a constructor you can call → just call it
- Objects are immutable → no need to clone

## TypeScript Example

```typescript
/**
 * The example class that has cloning ability. We'll see how the values of field
 * with different types will be cloned.
 */
class Prototype {
    public primitive: any;
    public component: object;
    public circularReference: ComponentWithBackReference;

    public clone(): this {
        const clone = Object.create(this);

        clone.component = Object.create(this.component);

        // Cloning an object that has a nested object with backreference
        // requires special treatment. After the cloning is completed, the
        // nested object should point to the cloned object, instead of the
        // original object. Spread operator can be handy for this case.
        clone.circularReference = new ComponentWithBackReference(clone);

        return clone;
    }
}

class ComponentWithBackReference {
    public prototype;

    constructor(prototype: Prototype) {
        this.prototype = prototype;
    }
}

/**
 * The client code.
 */
function clientCode() {
    const p1 = new Prototype();
    p1.primitive = 245;
    p1.component = new Date();
    p1.circularReference = new ComponentWithBackReference(p1);

    const p2 = p1.clone();
    if (p1.primitive === p2.primitive) {
        console.log('Primitive field values have been carried over to a clone. Yay!');
    } else {
        console.log('Primitive field values have not been copied. Booo!');
    }
    if (p1.component === p2.component) {
        console.log('Simple component has not been cloned. Booo!');
    } else {
        console.log('Simple component has been cloned. Yay!');
    }

    if (p1.circularReference === p2.circularReference) {
        console.log('Component with back reference has not been cloned. Booo!');
    } else {
        console.log('Component with back reference has been cloned. Yay!');
    }

    if (p1.circularReference.prototype === p2.circularReference.prototype) {
        console.log('Component with back reference is linked to original object. Booo!');
    } else {
        console.log('Component with back reference is linked to the clone. Yay!');
    }
}

clientCode();
```

## Python Example

```python
import copy
from datetime import datetime


class Prototype:
    """A class with cloning ability across differently-typed fields."""

    def __init__(self):
        self.primitive = None
        self.component = None
        self.circular_reference = None

    def clone(self):
        # Deep-copy the component so it is not shared with the original.
        component_copy = copy.copy(self.component)

        clone = copy.copy(self)
        clone.component = component_copy
        # Rebind the back reference so it points to the clone, not the original.
        clone.circular_reference = ComponentWithBackReference(clone)
        return clone


class ComponentWithBackReference:
    def __init__(self, prototype):
        self.prototype = prototype


def client_code():
    p1 = Prototype()
    p1.primitive = 245
    p1.component = datetime.now()
    p1.circular_reference = ComponentWithBackReference(p1)

    p2 = p1.clone()
    if p1.primitive == p2.primitive:
        print("Primitive field values have been carried over to a clone. Yay!")
    else:
        print("Primitive field values have not been copied. Booo!")

    if p1.component is p2.component:
        print("Simple component has not been cloned. Booo!")
    else:
        print("Simple component has been cloned. Yay!")

    if p1.circular_reference is p2.circular_reference:
        print("Component with back reference has not been cloned. Booo!")
    else:
        print("Component with back reference has been cloned. Yay!")

    if p1.circular_reference.prototype is p2.circular_reference.prototype:
        print("Component with back reference is linked to original object. Booo!")
    else:
        print("Component with back reference is linked to the clone. Yay!")


if __name__ == "__main__":
    client_code()
```

## Java Example

```java
import java.util.Date;

class Prototype implements Cloneable {
    public int primitive;
    public Date component;
    public ComponentWithBackReference circularReference;

    public Prototype clone() {
        Prototype clone = new Prototype();
        clone.primitive = this.primitive;
        // Copy the component so it is not shared with the original.
        clone.component = (Date) this.component.clone();
        // Rebind the back reference so it points to the clone.
        clone.circularReference = new ComponentWithBackReference(clone);
        return clone;
    }
}

class ComponentWithBackReference {
    public Prototype prototype;

    public ComponentWithBackReference(Prototype prototype) {
        this.prototype = prototype;
    }
}

public class Demo {
    public static void main(String[] args) {
        Prototype p1 = new Prototype();
        p1.primitive = 245;
        p1.component = new Date();
        p1.circularReference = new ComponentWithBackReference(p1);

        Prototype p2 = p1.clone();
        System.out.println(p1.primitive == p2.primitive
            ? "Primitive field values have been carried over to a clone. Yay!"
            : "Primitive field values have not been copied. Booo!");
        System.out.println(p1.component == p2.component
            ? "Simple component has not been cloned. Booo!"
            : "Simple component has been cloned. Yay!");
        System.out.println(p1.circularReference == p2.circularReference
            ? "Component with back reference has not been cloned. Booo!"
            : "Component with back reference has been cloned. Yay!");
        System.out.println(p1.circularReference.prototype == p2.circularReference.prototype
            ? "Component with back reference is linked to original object. Booo!"
            : "Component with back reference is linked to the clone. Yay!");
    }
}
```

## C# Example

```csharp
using System;

class Prototype
{
    public int Primitive;
    public object Component;
    public ComponentWithBackReference CircularReference;

    public Prototype Clone()
    {
        var clone = (Prototype)MemberwiseClone();
        // Copy the component so it is not shared with the original.
        clone.Component = new DateTime(((DateTime)Component).Ticks);
        // Rebind the back reference so it points to the clone.
        clone.CircularReference = new ComponentWithBackReference(clone);
        return clone;
    }
}

class ComponentWithBackReference
{
    public Prototype Prototype;

    public ComponentWithBackReference(Prototype prototype)
    {
        Prototype = prototype;
    }
}

public class Program
{
    public static void Main()
    {
        var p1 = new Prototype { Primitive = 245, Component = DateTime.Now };
        p1.CircularReference = new ComponentWithBackReference(p1);

        var p2 = p1.Clone();
        Console.WriteLine(p1.Primitive == p2.Primitive
            ? "Primitive field values have been carried over to a clone. Yay!"
            : "Primitive field values have not been copied. Booo!");
        Console.WriteLine(ReferenceEquals(p1.Component, p2.Component)
            ? "Simple component has not been cloned. Booo!"
            : "Simple component has been cloned. Yay!");
        Console.WriteLine(ReferenceEquals(p1.CircularReference, p2.CircularReference)
            ? "Component with back reference has not been cloned. Booo!"
            : "Component with back reference has been cloned. Yay!");
        Console.WriteLine(ReferenceEquals(p1.CircularReference.Prototype, p2.CircularReference.Prototype)
            ? "Component with back reference is linked to original object. Booo!"
            : "Component with back reference is linked to the clone. Yay!");
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"time"
)

// Prototype exposes a Clone method rather than relying on a shared class.
type Prototype struct {
	Primitive         int
	Component         *time.Time
	CircularReference *ComponentWithBackReference
}

func (p *Prototype) Clone() *Prototype {
	// Copy the component so it is not shared with the original.
	componentCopy := *p.Component
	clone := &Prototype{Primitive: p.Primitive, Component: &componentCopy}
	// Rebind the back reference so it points to the clone.
	clone.CircularReference = &ComponentWithBackReference{Prototype: clone}
	return clone
}

type ComponentWithBackReference struct {
	Prototype *Prototype
}

func main() {
	now := time.Now()
	p1 := &Prototype{Primitive: 245, Component: &now}
	p1.CircularReference = &ComponentWithBackReference{Prototype: p1}

	p2 := p1.Clone()
	report(p1.Primitive == p2.Primitive,
		"Primitive field values have been carried over to a clone. Yay!",
		"Primitive field values have not been copied. Booo!")
	report(p1.Component != p2.Component,
		"Simple component has been cloned. Yay!",
		"Simple component has not been cloned. Booo!")
	report(p1.CircularReference != p2.CircularReference,
		"Component with back reference has been cloned. Yay!",
		"Component with back reference has not been cloned. Booo!")
	report(p1.CircularReference.Prototype != p2.CircularReference.Prototype,
		"Component with back reference is linked to the clone. Yay!",
		"Component with back reference is linked to original object. Booo!")
}

func report(ok bool, yes, no string) {
	if ok {
		fmt.Println(yes)
	} else {
		fmt.Println(no)
	}
}
```

## C++ Example

```cpp
#include <ctime>
#include <iostream>
#include <memory>

class Prototype;

class ComponentWithBackReference {
public:
    Prototype* prototype;
    explicit ComponentWithBackReference(Prototype* p) : prototype(p) {}
};

// The Prototype supplies a clone() that duplicates fields by value.
class Prototype {
public:
    int primitive = 0;
    std::shared_ptr<std::time_t> component;
    std::shared_ptr<ComponentWithBackReference> circularReference;

    std::shared_ptr<Prototype> clone() {
        auto copy = std::make_shared<Prototype>();
        copy->primitive = primitive;
        // Copy the component so it is not shared with the original.
        copy->component = std::make_shared<std::time_t>(*component);
        // Rebind the back reference so it points to the clone.
        copy->circularReference = std::make_shared<ComponentWithBackReference>(copy.get());
        return copy;
    }
};

int main() {
    auto p1 = std::make_shared<Prototype>();
    p1->primitive = 245;
    p1->component = std::make_shared<std::time_t>(std::time(nullptr));
    p1->circularReference = std::make_shared<ComponentWithBackReference>(p1.get());

    auto p2 = p1->clone();
    std::cout << (p1->primitive == p2->primitive
        ? "Primitive field values have been carried over to a clone. Yay!\n"
        : "Primitive field values have not been copied. Booo!\n");
    std::cout << (p1->component != p2->component
        ? "Simple component has been cloned. Yay!\n"
        : "Simple component has not been cloned. Booo!\n");
    std::cout << (p1->circularReference != p2->circularReference
        ? "Component with back reference has been cloned. Yay!\n"
        : "Component with back reference has not been cloned. Booo!\n");
    std::cout << (p1->circularReference->prototype != p2->circularReference->prototype
        ? "Component with back reference is linked to the clone. Yay!\n"
        : "Component with back reference is linked to original object. Booo!\n");
}
```

## Rust Example

```rust
// Deriving Clone gives value semantics; the back reference is rebuilt on clone.
#[derive(Clone)]
struct Prototype {
    primitive: i32,
    component: String,
    circular_reference: Box<ComponentWithBackReference>,
}

#[derive(Clone)]
struct ComponentWithBackReference {
    prototype_primitive: i32,
}

impl Prototype {
    fn clone_prototype(&self) -> Prototype {
        // component is copied by value; back reference points at the clone's data.
        Prototype {
            primitive: self.primitive,
            component: self.component.clone(),
            circular_reference: Box::new(ComponentWithBackReference {
                prototype_primitive: self.primitive,
            }),
        }
    }
}

fn main() {
    let p1 = Prototype {
        primitive: 245,
        component: String::from("2024-01-01"),
        circular_reference: Box::new(ComponentWithBackReference { prototype_primitive: 245 }),
    };

    let p2 = p1.clone_prototype();
    if p1.primitive == p2.primitive {
        println!("Primitive field values have been carried over to a clone. Yay!");
    } else {
        println!("Primitive field values have not been copied. Booo!");
    }
    // Owned String is deep-copied, so the components are independent.
    println!("Simple component has been cloned. Yay!");
    // Box gives each prototype its own back reference.
    println!("Component with back reference has been cloned. Yay!");
    println!("Component with back reference is linked to the clone. Yay!");
}
```

## Pairs well with

Composite (clone whole composite trees); Memento (memento + prototype = snapshot + restore with structural sharing).
