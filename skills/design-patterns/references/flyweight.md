---
name: Flyweight
category: Structural
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/flyweight/typescript/example
---

# Flyweight

## Intent

Flyweight is a structural design pattern that lets you fit more objects into the available amount of RAM by sharing
common parts of state between multiple objects instead of keeping all of the data in each object.

## Applicability

- Your application needs to create vast numbers of similar objects that consume excessive memory
- Objects contain duplicate state that can be extracted and shared across instances
- The duplicate data cannot be meaningfully reduced through other optimization approaches
- RAM constraints are a genuine bottleneck preventing normal program execution

## Pros

- Significant RAM savings when managing huge quantities of similar objects
- Enables applications to function on devices with limited memory capacity
- Reduces overall memory footprint through shared intrinsic state

## Cons

- May trade RAM for CPU cycles when context data needs to be recalculated each call
- Code complexity increases substantially, making maintenance more difficult
- Team members may struggle understanding why object state was separated in this manner

## Don't use when

- Memory isn't actually a bottleneck → don't over-engineer
- Objects are few (<10000) → savings won't justify complexity
- The "shared" state changes frequently → flyweight breaks

## TypeScript Example

```typescript
/**
 * The Flyweight stores a common portion of the state (also called intrinsic
 * state) that belongs to multiple real business entities. The Flyweight accepts
 * the rest of the state (extrinsic state, unique for each entity) via its
 * method parameters.
 */
class Flyweight {
    private sharedState: any;

    constructor(sharedState: any) {
        this.sharedState = sharedState;
    }

    public operation(uniqueState): void {
        const s = JSON.stringify(this.sharedState);
        const u = JSON.stringify(uniqueState);
        console.log(`Flyweight: Displaying shared (${s}) and unique (${u}) state.`);
    }
}

/**
 * The Flyweight Factory creates and manages the Flyweight objects. It ensures
 * that flyweights are shared correctly. When the client requests a flyweight,
 * the factory either returns an existing instance or creates a new one, if it
 * doesn't exist yet.
 */
class FlyweightFactory {
    private flyweights: {[key: string]: Flyweight} = <any>{};

    constructor(initialFlyweights: string[][]) {
        for (const state of initialFlyweights) {
            this.flyweights[this.getKey(state)] = new Flyweight(state);
        }
    }

    /**
     * Returns a Flyweight's string hash for a given state.
     */
    private getKey(state: string[]): string {
        return state.join('_');
    }

    /**
     * Returns an existing Flyweight with a given state or creates a new one.
     */
    public getFlyweight(sharedState: string[]): Flyweight {
        const key = this.getKey(sharedState);

        if (!(key in this.flyweights)) {
            console.log('FlyweightFactory: Can\'t find a flyweight, creating new one.');
            this.flyweights[key] = new Flyweight(sharedState);
        } else {
            console.log('FlyweightFactory: Reusing existing flyweight.');
        }

        return this.flyweights[key];
    }

    public listFlyweights(): void {
        const count = Object.keys(this.flyweights).length;
        console.log(`\nFlyweightFactory: I have ${count} flyweights:`);
        for (const key in this.flyweights) {
            console.log(key);
        }
    }
}

/**
 * The client code usually creates a bunch of pre-populated flyweights in the
 * initialization stage of the application.
 */
const factory = new FlyweightFactory([
    ['Chevrolet', 'Camaro2018', 'pink'],
    ['Mercedes Benz', 'C300', 'black'],
    ['Mercedes Benz', 'C500', 'red'],
    ['BMW', 'M5', 'red'],
    ['BMW', 'X6', 'white'],
]);
factory.listFlyweights();

function addCarToPoliceDatabase(
    ff: FlyweightFactory, plates: string, owner: string,
    brand: string, model: string, color: string,
) {
    console.log('\nClient: Adding a car to database.');
    const flyweight = ff.getFlyweight([brand, model, color]);

    flyweight.operation([plates, owner]);
}

addCarToPoliceDatabase(factory, 'CL234IR', 'James Doe', 'BMW', 'M5', 'red');
addCarToPoliceDatabase(factory, 'CL234IR', 'James Doe', 'BMW', 'X1', 'red');

factory.listFlyweights();
```

## Python Example

```python
import json
from typing import Dict, List


class Flyweight:
    """
    The Flyweight stores a common portion of the state (intrinsic state) that
    belongs to multiple real business entities. The Flyweight accepts the rest
    of the state (extrinsic state, unique for each entity) via method params.
    """

    def __init__(self, shared_state: List[str]) -> None:
        self._shared_state = shared_state

    def operation(self, unique_state: List[str]) -> None:
        s = json.dumps(self._shared_state)
        u = json.dumps(unique_state)
        print(f"Flyweight: Displaying shared ({s}) and unique ({u}) state.")


class FlyweightFactory:
    """
    The Flyweight Factory creates and manages the Flyweight objects. It ensures
    that flyweights are shared correctly. When the client requests a flyweight,
    the factory either returns an existing instance or creates a new one.
    """

    _flyweights: Dict[str, Flyweight] = {}

    def __init__(self, initial_flyweights: List[List[str]]) -> None:
        for state in initial_flyweights:
            self._flyweights[self.get_key(state)] = Flyweight(state)

    def get_key(self, state: List[str]) -> str:
        return "_".join(state)

    def get_flyweight(self, shared_state: List[str]) -> Flyweight:
        key = self.get_key(shared_state)
        if key not in self._flyweights:
            print("FlyweightFactory: Can't find a flyweight, creating new one.")
            self._flyweights[key] = Flyweight(shared_state)
        else:
            print("FlyweightFactory: Reusing existing flyweight.")
        return self._flyweights[key]

    def list_flyweights(self) -> None:
        count = len(self._flyweights)
        print(f"\nFlyweightFactory: I have {count} flyweights:")
        print("\n".join(self._flyweights.keys()))


def add_car_to_police_database(
    factory: FlyweightFactory, plates: str, owner: str,
    brand: str, model: str, color: str,
) -> None:
    print("\nClient: Adding a car to database.")
    flyweight = factory.get_flyweight([brand, model, color])
    flyweight.operation([plates, owner])


if __name__ == "__main__":
    factory = FlyweightFactory([
        ["Chevrolet", "Camaro2018", "pink"],
        ["Mercedes Benz", "C300", "black"],
        ["Mercedes Benz", "C500", "red"],
        ["BMW", "M5", "red"],
        ["BMW", "X6", "white"],
    ])
    factory.list_flyweights()

    add_car_to_police_database(factory, "CL234IR", "James Doe", "BMW", "M5", "red")
    add_car_to_police_database(factory, "CL234IR", "James Doe", "BMW", "X1", "red")

    factory.list_flyweights()
```

## Java Example

```java
import java.util.HashMap;
import java.util.Map;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
class Flyweight {
    private final String[] sharedState;

    public Flyweight(String[] sharedState) {
        this.sharedState = sharedState;
    }

    public void operation(String[] uniqueState) {
        System.out.println("Flyweight: Displaying shared (" +
                String.join(",", sharedState) + ") and unique (" +
                String.join(",", uniqueState) + ") state.");
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
class FlyweightFactory {
    private final Map<String, Flyweight> flyweights = new HashMap<>();

    public FlyweightFactory(String[][] initialFlyweights) {
        for (String[] state : initialFlyweights) {
            flyweights.put(getKey(state), new Flyweight(state));
        }
    }

    private String getKey(String[] state) {
        return String.join("_", state);
    }

    public Flyweight getFlyweight(String[] sharedState) {
        String key = getKey(sharedState);
        if (!flyweights.containsKey(key)) {
            System.out.println("FlyweightFactory: Can't find a flyweight, creating new one.");
            flyweights.put(key, new Flyweight(sharedState));
        } else {
            System.out.println("FlyweightFactory: Reusing existing flyweight.");
        }
        return flyweights.get(key);
    }

    public void listFlyweights() {
        System.out.println("\nFlyweightFactory: I have " + flyweights.size() + " flyweights:");
        flyweights.keySet().forEach(System.out::println);
    }
}

public class Demo {
    static void addCarToPoliceDatabase(FlyweightFactory ff, String plates,
            String owner, String brand, String model, String color) {
        System.out.println("\nClient: Adding a car to database.");
        Flyweight flyweight = ff.getFlyweight(new String[]{brand, model, color});
        flyweight.operation(new String[]{plates, owner});
    }

    public static void main(String[] args) {
        FlyweightFactory factory = new FlyweightFactory(new String[][]{
                {"Chevrolet", "Camaro2018", "pink"},
                {"Mercedes Benz", "C300", "black"},
                {"Mercedes Benz", "C500", "red"},
                {"BMW", "M5", "red"},
                {"BMW", "X6", "white"},
        });
        factory.listFlyweights();

        addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
        addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

        factory.listFlyweights();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
public class Flyweight
{
    private readonly string[] _sharedState;

    public Flyweight(string[] sharedState)
    {
        _sharedState = sharedState;
    }

    public void Operation(string[] uniqueState)
    {
        Console.WriteLine($"Flyweight: Displaying shared ({string.Join(",", _sharedState)}) " +
            $"and unique ({string.Join(",", uniqueState)}) state.");
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
public class FlyweightFactory
{
    private readonly Dictionary<string, Flyweight> _flyweights = new();

    public FlyweightFactory(string[][] initialFlyweights)
    {
        foreach (var state in initialFlyweights)
            _flyweights[GetKey(state)] = new Flyweight(state);
    }

    private string GetKey(string[] state) => string.Join("_", state);

    public Flyweight GetFlyweight(string[] sharedState)
    {
        var key = GetKey(sharedState);
        if (!_flyweights.ContainsKey(key))
        {
            Console.WriteLine("FlyweightFactory: Can't find a flyweight, creating new one.");
            _flyweights[key] = new Flyweight(sharedState);
        }
        else
        {
            Console.WriteLine("FlyweightFactory: Reusing existing flyweight.");
        }
        return _flyweights[key];
    }

    public void ListFlyweights()
    {
        Console.WriteLine($"\nFlyweightFactory: I have {_flyweights.Count} flyweights:");
        foreach (var key in _flyweights.Keys)
            Console.WriteLine(key);
    }
}

public class Demo
{
    static void AddCarToPoliceDatabase(FlyweightFactory ff, string plates,
        string owner, string brand, string model, string color)
    {
        Console.WriteLine("\nClient: Adding a car to database.");
        var flyweight = ff.GetFlyweight(new[] { brand, model, color });
        flyweight.Operation(new[] { plates, owner });
    }

    public static void Main(string[] args)
    {
        var factory = new FlyweightFactory(new[]
        {
            new[] { "Chevrolet", "Camaro2018", "pink" },
            new[] { "Mercedes Benz", "C300", "black" },
            new[] { "Mercedes Benz", "C500", "red" },
            new[] { "BMW", "M5", "red" },
            new[] { "BMW", "X6", "white" },
        });
        factory.ListFlyweights();

        AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
        AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

        factory.ListFlyweights();
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

// Flyweight stores a common portion of the state (intrinsic state) that belongs
// to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
type Flyweight struct {
	sharedState []string
}

func (f *Flyweight) Operation(uniqueState []string) {
	fmt.Printf("Flyweight: Displaying shared (%s) and unique (%s) state.\n",
		strings.Join(f.sharedState, ","), strings.Join(uniqueState, ","))
}

// FlyweightFactory creates and manages the Flyweight objects. When the client
// requests a flyweight, the factory returns an existing instance or creates one.
type FlyweightFactory struct {
	flyweights map[string]*Flyweight
}

func NewFlyweightFactory(initialFlyweights [][]string) *FlyweightFactory {
	factory := &FlyweightFactory{flyweights: make(map[string]*Flyweight)}
	for _, state := range initialFlyweights {
		factory.flyweights[factory.getKey(state)] = &Flyweight{sharedState: state}
	}
	return factory
}

func (f *FlyweightFactory) getKey(state []string) string {
	return strings.Join(state, "_")
}

func (f *FlyweightFactory) GetFlyweight(sharedState []string) *Flyweight {
	key := f.getKey(sharedState)
	if _, ok := f.flyweights[key]; !ok {
		fmt.Println("FlyweightFactory: Can't find a flyweight, creating new one.")
		f.flyweights[key] = &Flyweight{sharedState: sharedState}
	} else {
		fmt.Println("FlyweightFactory: Reusing existing flyweight.")
	}
	return f.flyweights[key]
}

func (f *FlyweightFactory) ListFlyweights() {
	fmt.Printf("\nFlyweightFactory: I have %d flyweights:\n", len(f.flyweights))
	for key := range f.flyweights {
		fmt.Println(key)
	}
}

func addCarToPoliceDatabase(ff *FlyweightFactory, plates, owner, brand, model, color string) {
	fmt.Println("\nClient: Adding a car to database.")
	flyweight := ff.GetFlyweight([]string{brand, model, color})
	flyweight.Operation([]string{plates, owner})
}

func main() {
	factory := NewFlyweightFactory([][]string{
		{"Chevrolet", "Camaro2018", "pink"},
		{"Mercedes Benz", "C300", "black"},
		{"Mercedes Benz", "C500", "red"},
		{"BMW", "M5", "red"},
		{"BMW", "X6", "white"},
	})
	factory.ListFlyweights()

	addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red")
	addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red")

	factory.ListFlyweights()
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
class Flyweight {
private:
    std::vector<std::string> shared_state_;

    static std::string Join(const std::vector<std::string>& parts, const std::string& sep) {
        std::string result;
        for (size_t i = 0; i < parts.size(); ++i) {
            if (i) result += sep;
            result += parts[i];
        }
        return result;
    }

public:
    explicit Flyweight(std::vector<std::string> shared_state)
        : shared_state_(std::move(shared_state)) {}

    void Operation(const std::vector<std::string>& unique_state) const {
        std::cout << "Flyweight: Displaying shared (" << Join(shared_state_, ",")
                  << ") and unique (" << Join(unique_state, ",") << ") state.\n";
    }

    const std::vector<std::string>& GetState() const { return shared_state_; }
};

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
class FlyweightFactory {
private:
    std::unordered_map<std::string, Flyweight> flyweights_;

    static std::string GetKey(const std::vector<std::string>& state) {
        std::string key;
        for (size_t i = 0; i < state.size(); ++i) {
            if (i) key += "_";
            key += state[i];
        }
        return key;
    }

public:
    explicit FlyweightFactory(std::initializer_list<std::vector<std::string>> initial) {
        for (const auto& state : initial)
            flyweights_.emplace(GetKey(state), Flyweight(state));
    }

    Flyweight& GetFlyweight(const std::vector<std::string>& shared_state) {
        std::string key = GetKey(shared_state);
        if (flyweights_.find(key) == flyweights_.end()) {
            std::cout << "FlyweightFactory: Can't find a flyweight, creating new one.\n";
            flyweights_.emplace(key, Flyweight(shared_state));
        } else {
            std::cout << "FlyweightFactory: Reusing existing flyweight.\n";
        }
        return flyweights_.at(key);
    }

    void ListFlyweights() const {
        std::cout << "\nFlyweightFactory: I have " << flyweights_.size() << " flyweights:\n";
        for (const auto& pair : flyweights_)
            std::cout << pair.first << "\n";
    }
};

void AddCarToPoliceDatabase(FlyweightFactory& ff, const std::string& plates,
        const std::string& owner, const std::string& brand,
        const std::string& model, const std::string& color) {
    std::cout << "\nClient: Adding a car to database.\n";
    Flyweight& flyweight = ff.GetFlyweight({brand, model, color});
    flyweight.Operation({plates, owner});
}

int main() {
    FlyweightFactory factory{
        {"Chevrolet", "Camaro2018", "pink"},
        {"Mercedes Benz", "C300", "black"},
        {"Mercedes Benz", "C500", "red"},
        {"BMW", "M5", "red"},
        {"BMW", "X6", "white"},
    };
    factory.ListFlyweights();

    AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
    AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

    factory.ListFlyweights();

    return 0;
}
```

## Rust Example

```rust
use std::collections::HashMap;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
struct Flyweight {
    shared_state: Vec<String>,
}

impl Flyweight {
    fn new(shared_state: Vec<String>) -> Self {
        Flyweight { shared_state }
    }

    fn operation(&self, unique_state: &[String]) {
        println!(
            "Flyweight: Displaying shared ({}) and unique ({}) state.",
            self.shared_state.join(","),
            unique_state.join(",")
        );
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
struct FlyweightFactory {
    flyweights: HashMap<String, Flyweight>,
}

impl FlyweightFactory {
    fn new(initial_flyweights: Vec<Vec<String>>) -> Self {
        let mut flyweights = HashMap::new();
        for state in initial_flyweights {
            flyweights.insert(Self::get_key(&state), Flyweight::new(state));
        }
        FlyweightFactory { flyweights }
    }

    fn get_key(state: &[String]) -> String {
        state.join("_")
    }

    fn get_flyweight(&mut self, shared_state: Vec<String>) -> &Flyweight {
        let key = Self::get_key(&shared_state);
        if !self.flyweights.contains_key(&key) {
            println!("FlyweightFactory: Can't find a flyweight, creating new one.");
            self.flyweights.insert(key.clone(), Flyweight::new(shared_state));
        } else {
            println!("FlyweightFactory: Reusing existing flyweight.");
        }
        &self.flyweights[&key]
    }

    fn list_flyweights(&self) {
        println!("\nFlyweightFactory: I have {} flyweights:", self.flyweights.len());
        for key in self.flyweights.keys() {
            println!("{}", key);
        }
    }
}

fn add_car_to_police_database(
    factory: &mut FlyweightFactory, plates: &str, owner: &str,
    brand: &str, model: &str, color: &str,
) {
    println!("\nClient: Adding a car to database.");
    let flyweight = factory.get_flyweight(vec![
        brand.to_string(), model.to_string(), color.to_string(),
    ]);
    flyweight.operation(&[plates.to_string(), owner.to_string()]);
}

fn main() {
    let s = |v: &[&str]| v.iter().map(|x| x.to_string()).collect::<Vec<_>>();
    let mut factory = FlyweightFactory::new(vec![
        s(&["Chevrolet", "Camaro2018", "pink"]),
        s(&["Mercedes Benz", "C300", "black"]),
        s(&["Mercedes Benz", "C500", "red"]),
        s(&["BMW", "M5", "red"]),
        s(&["BMW", "X6", "white"]),
    ]);
    factory.list_flyweights();

    add_car_to_police_database(&mut factory, "CL234IR", "James Doe", "BMW", "M5", "red");
    add_car_to_police_database(&mut factory, "CL234IR", "James Doe", "BMW", "X1", "red");

    factory.list_flyweights();
}
```

## Pairs well with

Composite (flyweights as leaves in a Composite); Factory (Flyweight Factory is the gatekeeper that enforces sharing);
Strategy (flyweight-shared strategies).
