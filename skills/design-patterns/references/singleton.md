---
name: Singleton
category: Creational
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/singleton/typescript/example
---

# Singleton

## Intent

Singleton is a creational design pattern that lets you ensure that a class has only one instance, while providing a
global access point to this instance.

## Applicability

- A class should have just one instance available to all clients (e.g. a shared database object across different program
  components)
- You need stricter control over global variables beyond standard practices
- You want to ensure nothing except the class itself can replace a cached instance
- You need to disable all other object creation methods except a special creation method
- Lazy initialization is desirable (object created only when first requested)

## Pros

- Guarantees a class has only a single instance
- Provides a global access point to that instance
- The singleton initializes only when first requested

## Cons

- Violates the Single Responsibility Principle by solving two problems simultaneously
- Can mask poor design when program components have excessive interdependencies
- Requires special handling in multithreaded environments to prevent multiple instantiations
- Difficult to unit test due to private constructors and static method limitations

## Don't use when

- A store slice or DI container would do
- The "singleton" is just stateless utility functions → export functions from a module
- You only need it for convenient access from anywhere → that's a smell, refactor to pass dependencies explicitly
- Tests need to swap implementations → Singleton makes mocking painful

## TypeScript Example

```typescript
/**
 * The Singleton class defines an `instance` getter, that lets clients access
 * the unique singleton instance.
 */
class Singleton {
    static #instance: Singleton;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor() { }

    /**
     * The static getter that controls access to the singleton instance.
     *
     * This implementation allows you to extend the Singleton class while
     * keeping just one instance of each subclass around.
     */
    public static get instance(): Singleton {
        if (!Singleton.#instance) {
            Singleton.#instance = new Singleton();
        }

        return Singleton.#instance;
    }

    /**
     * Finally, any singleton can define some business logic, which can be
     * executed on its instance.
     */
    public someBusinessLogic() {
        // ...
    }
}

/**
 * The client code.
 */
function clientCode() {
    const s1 = Singleton.instance;
    const s2 = Singleton.instance;

    if (s1 === s2) {
        console.log(
            'Singleton works, both variables contain the same instance.'
        );
    } else {
        console.log('Singleton failed, variables contain different instances.');
    }
}

clientCode();
```

## Python Example

```python
class Singleton:
    """Controls its own instantiation via __new__ so only one instance exists."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def some_business_logic(self):
        # ...
        ...


def client_code():
    s1 = Singleton()
    s2 = Singleton()

    if s1 is s2:
        print("Singleton works, both variables contain the same instance.")
    else:
        print("Singleton failed, variables contain different instances.")


if __name__ == "__main__":
    client_code()
```

## Java Example

```java
final class Singleton {
    private static Singleton instance;

    // Private constructor prevents direct construction with `new`.
    private Singleton() { }

    // Controls access to the singleton instance (lazy initialization).
    public static synchronized Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }

    public void someBusinessLogic() {
        // ...
    }
}

public class Demo {
    public static void main(String[] args) {
        Singleton s1 = Singleton.getInstance();
        Singleton s2 = Singleton.getInstance();

        if (s1 == s2) {
            System.out.println("Singleton works, both variables contain the same instance.");
        } else {
            System.out.println("Singleton failed, variables contain different instances.");
        }
    }
}
```

## C# Example

```csharp
public sealed class Singleton
{
    private static Singleton _instance;

    // Private constructor prevents direct construction with `new`.
    private Singleton() { }

    // Controls access to the singleton instance (lazy initialization).
    public static Singleton Instance
    {
        get
        {
            if (_instance == null)
            {
                _instance = new Singleton();
            }
            return _instance;
        }
    }

    public void SomeBusinessLogic()
    {
        // ...
    }
}

public class Program
{
    public static void Main()
    {
        Singleton s1 = Singleton.Instance;
        Singleton s2 = Singleton.Instance;

        if (s1 == s2)
        {
            System.Console.WriteLine("Singleton works, both variables contain the same instance.");
        }
        else
        {
            System.Console.WriteLine("Singleton failed, variables contain different instances.");
        }
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"sync"
)

// singleton holds the single instance; sync.Once guarantees one-time init.
type singleton struct{}

func (s *singleton) SomeBusinessLogic() {
	// ...
}

var (
	instance *singleton
	once     sync.Once
)

// GetInstance controls access to the unique singleton instance.
func GetInstance() *singleton {
	once.Do(func() {
		instance = &singleton{}
	})
	return instance
}

func main() {
	s1 := GetInstance()
	s2 := GetInstance()

	if s1 == s2 {
		fmt.Println("Singleton works, both variables contain the same instance.")
	} else {
		fmt.Println("Singleton failed, variables contain different instances.")
	}
}
```

## C++ Example

```cpp
#include <iostream>

// The Singleton controls its own instantiation and hands out one instance.
class Singleton {
private:
    // Private constructor prevents direct construction.
    Singleton() = default;

public:
    // Deleting copy operations keeps the instance unique.
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;

    // Meyers singleton: static local is initialized once, thread-safely.
    static Singleton& instance() {
        static Singleton instance;
        return instance;
    }

    void someBusinessLogic() {
        // ...
    }
};

int main() {
    Singleton& s1 = Singleton::instance();
    Singleton& s2 = Singleton::instance();

    if (&s1 == &s2) {
        std::cout << "Singleton works, both variables contain the same instance.\n";
    } else {
        std::cout << "Singleton failed, variables contain different instances.\n";
    }
}
```

## Rust Example

```rust
use std::sync::OnceLock;

// The Singleton holds shared state behind a process-wide OnceLock.
struct Singleton;

impl Singleton {
    fn some_business_logic(&self) {
        // ...
    }
}

// OnceLock provides safe, lazy, one-time initialization.
fn instance() -> &'static Singleton {
    static INSTANCE: OnceLock<Singleton> = OnceLock::new();
    INSTANCE.get_or_init(|| Singleton)
}

fn main() {
    let s1 = instance();
    let s2 = instance();

    if std::ptr::eq(s1, s2) {
        println!("Singleton works, both variables contain the same instance.");
    } else {
        println!("Singleton failed, variables contain different instances.");
    }
}
```

## Pairs well with

Registry (Singleton-adjacent — usually preferred over a raw Singleton); Facade (Facades are often instantiated as
singletons by convention).
