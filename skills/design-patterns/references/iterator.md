---
name: Iterator
category: Behavioral
popularity: 3/3
tier: 1
source: refactoring.guru/design-patterns/iterator/typescript/example
---

# Iterator

## Intent

Iterator is a behavioral design pattern that lets you traverse elements of a collection without exposing its underlying
representation (list, stack, tree, etc.).

## Applicability

- Your collection has complex internal structure but you want to hide that complexity from clients seeking access to
  elements
- You want to reduce duplication of traversal code across your application
- You need your code to work with different data structures or unknown collection types beforehand

## Pros

- Follows Single Responsibility Principle by extracting traversal algorithms into separate classes
- Adheres to Open/Closed Principle—new collection and iterator types can be added without modifying existing code
- Multiple iterators can traverse the same collection simultaneously with independent iteration states
- Iteration can be delayed and resumed as needed

## Cons

- May be excessive for applications working only with simple collections
- Iterator access can be less efficient than direct element access in specialized collections

## Don't use when

- A native `for...of` over an array or `Map` already works → use the built-in iterator
- The collection is a simple array → just `.map()`/`.filter()`/`.forEach()`
- You'd need an entire iterator class for one consumer → inline the loop

## TypeScript Example

```typescript
/**
 * Iterator Design Pattern
 *
 * Intent: Lets you traverse elements of a collection without exposing its
 * underlying representation (list, stack, tree, etc.).
 */

interface Iterator<T> {
    // Return the current element.
    current(): T;

    // Return the current element and move forward to next element.
    next(): T;

    // Return the key of the current element.
    key(): number;

    // Checks if current position is valid.
    valid(): boolean;

    // Rewind the Iterator to the first element.
    rewind(): void;
}

interface Aggregator {
    // Retrieve an external iterator.
    getIterator(): Iterator<string>;
}

/**
 * Concrete Iterators implement various traversal algorithms. These classes
 * store the current traversal position at all times.
 */

class AlphabeticalOrderIterator implements Iterator<string> {
    private collection: WordsCollection;

    /**
     * Stores the current traversal position. An iterator may have a lot of
     * other fields for storing iteration state, especially when it is supposed
     * to work with a particular kind of collection.
     */
    private position: number = 0;

    /**
     * This variable indicates the traversal direction.
     */
    private reverse: boolean = false;

    constructor(collection: WordsCollection, reverse: boolean = false) {
        this.collection = collection;
        this.reverse = reverse;

        if (reverse) {
            this.position = collection.getCount() - 1;
        }
    }

    public rewind() {
        this.position = this.reverse ?
            this.collection.getCount() - 1 :
            0;
    }

    public current(): string {
        return this.collection.getItems()[this.position];
    }

    public key(): number {
        return this.position;
    }

    public next(): string {
        const item = this.collection.getItems()[this.position];
        this.position += this.reverse ? -1 : 1;
        return item;
    }

    public valid(): boolean {
        if (this.reverse) {
            return this.position >= 0;
        }

        return this.position < this.collection.getCount();
    }
}

/**
 * Concrete Collections provide one or several methods for retrieving fresh
 * iterator instances, compatible with the collection class.
 */
class WordsCollection implements Aggregator {
    private items: string[] = [];

    public getItems(): string[] {
        return this.items;
    }

    public getCount(): number {
        return this.items.length;
    }

    public addItem(item: string): void {
        this.items.push(item);
    }

    public getIterator(): Iterator<string> {
        return new AlphabeticalOrderIterator(this);
    }

    public getReverseIterator(): Iterator<string> {
        return new AlphabeticalOrderIterator(this, true);
    }
}

/**
 * The client code may or may not know about the Concrete Iterator or Collection
 * classes, depending on the level of indirection you want to keep in your
 * program.
 */
const collection = new WordsCollection();
collection.addItem('First');
collection.addItem('Second');
collection.addItem('Third');

const iterator = collection.getIterator();

console.log('Straight traversal:');
while (iterator.valid()) {
    console.log(iterator.next());
}

console.log('');
console.log('Reverse traversal:');
const reverseIterator = collection.getReverseIterator();
while (reverseIterator.valid()) {
    console.log(reverseIterator.next());
}
```

## Python Example

```python
from __future__ import annotations
from collections.abc import Iterable, Iterator
from typing import Any, List


class AlphabeticalOrderIterator(Iterator):
    """
    Concrete Iterators implement various traversal algorithms. These classes
    store the current traversal position at all times.
    """

    _position: int = None
    _reverse: bool = False

    def __init__(self, collection: WordsCollection, reverse: bool = False) -> None:
        self._collection = collection
        self._reverse = reverse
        self._position = -1 if reverse else 0

    def __next__(self) -> Any:
        try:
            value = self._collection[self._position]
            self._position += -1 if self._reverse else 1
        except IndexError:
            raise StopIteration()
        return value


class WordsCollection(Iterable):
    """
    Concrete Collections provide one or several methods for retrieving fresh
    iterator instances, compatible with the collection class.
    """

    def __init__(self, collection: List[Any] = None) -> None:
        self._collection = collection or []

    def __getitem__(self, index: int) -> Any:
        return self._collection[index]

    def __iter__(self) -> AlphabeticalOrderIterator:
        return AlphabeticalOrderIterator(self)

    def get_reverse_iterator(self) -> AlphabeticalOrderIterator:
        return AlphabeticalOrderIterator(self, True)

    def add_item(self, item: Any) -> None:
        self._collection.append(item)


if __name__ == "__main__":
    collection = WordsCollection()
    collection.add_item("First")
    collection.add_item("Second")
    collection.add_item("Third")

    print("Straight traversal:")
    for item in collection:
        print(item)

    print("")
    print("Reverse traversal:")
    for item in collection.get_reverse_iterator():
        print(item)
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;

/**
 * The Iterator interface declares the traversal operations.
 */
interface Iterator<T> {
    boolean valid();
    T next();
}

/**
 * The Aggregator interface retrieves an external iterator.
 */
interface Aggregator {
    Iterator<String> getIterator();
}

/**
 * Concrete Iterators implement various traversal algorithms and store the
 * current traversal position.
 */
class AlphabeticalOrderIterator implements Iterator<String> {
    private final WordsCollection collection;
    private int position;
    private final boolean reverse;

    public AlphabeticalOrderIterator(WordsCollection collection, boolean reverse) {
        this.collection = collection;
        this.reverse = reverse;
        this.position = reverse ? collection.getCount() - 1 : 0;
    }

    public boolean valid() {
        return reverse ? position >= 0 : position < collection.getCount();
    }

    public String next() {
        String item = collection.getItems().get(position);
        position += reverse ? -1 : 1;
        return item;
    }
}

/**
 * Concrete Collections return iterators compatible with the collection.
 */
class WordsCollection implements Aggregator {
    private final List<String> items = new ArrayList<>();

    public List<String> getItems() {
        return items;
    }

    public int getCount() {
        return items.size();
    }

    public void addItem(String item) {
        items.add(item);
    }

    public Iterator<String> getIterator() {
        return new AlphabeticalOrderIterator(this, false);
    }

    public Iterator<String> getReverseIterator() {
        return new AlphabeticalOrderIterator(this, true);
    }
}

public class Demo {
    public static void main(String[] args) {
        WordsCollection collection = new WordsCollection();
        collection.addItem("First");
        collection.addItem("Second");
        collection.addItem("Third");

        System.out.println("Straight traversal:");
        Iterator<String> iterator = collection.getIterator();
        while (iterator.valid()) {
            System.out.println(iterator.next());
        }

        System.out.println();
        System.out.println("Reverse traversal:");
        Iterator<String> reverseIterator = collection.getReverseIterator();
        while (reverseIterator.valid()) {
            System.out.println(reverseIterator.next());
        }
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Iterator interface declares the traversal operations.
public interface IIterator<T>
{
    bool Valid();
    T Next();
}

// The Aggregator interface retrieves an external iterator.
public interface IAggregator
{
    IIterator<string> GetIterator();
}

// Concrete Iterators implement various traversal algorithms and store the
// current traversal position.
public class AlphabeticalOrderIterator : IIterator<string>
{
    private readonly WordsCollection _collection;
    private int _position;
    private readonly bool _reverse;

    public AlphabeticalOrderIterator(WordsCollection collection, bool reverse)
    {
        _collection = collection;
        _reverse = reverse;
        _position = reverse ? collection.GetCount() - 1 : 0;
    }

    public bool Valid()
    {
        return _reverse ? _position >= 0 : _position < _collection.GetCount();
    }

    public string Next()
    {
        string item = _collection.GetItems()[_position];
        _position += _reverse ? -1 : 1;
        return item;
    }
}

// Concrete Collections return iterators compatible with the collection.
public class WordsCollection : IAggregator
{
    private readonly List<string> _items = new List<string>();

    public List<string> GetItems() => _items;

    public int GetCount() => _items.Count;

    public void AddItem(string item) => _items.Add(item);

    public IIterator<string> GetIterator() => new AlphabeticalOrderIterator(this, false);

    public IIterator<string> GetReverseIterator() => new AlphabeticalOrderIterator(this, true);
}

public class Program
{
    public static void Main()
    {
        var collection = new WordsCollection();
        collection.AddItem("First");
        collection.AddItem("Second");
        collection.AddItem("Third");

        Console.WriteLine("Straight traversal:");
        var iterator = collection.GetIterator();
        while (iterator.Valid())
            Console.WriteLine(iterator.Next());

        Console.WriteLine();
        Console.WriteLine("Reverse traversal:");
        var reverseIterator = collection.GetReverseIterator();
        while (reverseIterator.Valid())
            Console.WriteLine(reverseIterator.Next());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Iterator declares the traversal operations.
type Iterator interface {
	Valid() bool
	Next() string
}

// Aggregator retrieves an external iterator.
type Aggregator interface {
	GetIterator() Iterator
}

// AlphabeticalOrderIterator implements a traversal algorithm and stores the
// current traversal position.
type AlphabeticalOrderIterator struct {
	collection *WordsCollection
	position   int
	reverse    bool
}

func (it *AlphabeticalOrderIterator) Valid() bool {
	if it.reverse {
		return it.position >= 0
	}
	return it.position < it.collection.GetCount()
}

func (it *AlphabeticalOrderIterator) Next() string {
	item := it.collection.items[it.position]
	if it.reverse {
		it.position--
	} else {
		it.position++
	}
	return item
}

// WordsCollection returns iterators compatible with the collection.
type WordsCollection struct {
	items []string
}

func (c *WordsCollection) GetCount() int {
	return len(c.items)
}

func (c *WordsCollection) AddItem(item string) {
	c.items = append(c.items, item)
}

func (c *WordsCollection) GetIterator() Iterator {
	return &AlphabeticalOrderIterator{collection: c, position: 0, reverse: false}
}

func (c *WordsCollection) GetReverseIterator() Iterator {
	return &AlphabeticalOrderIterator{collection: c, position: len(c.items) - 1, reverse: true}
}

func main() {
	collection := &WordsCollection{}
	collection.AddItem("First")
	collection.AddItem("Second")
	collection.AddItem("Third")

	fmt.Println("Straight traversal:")
	for it := collection.GetIterator(); it.Valid(); {
		fmt.Println(it.Next())
	}

	fmt.Println("")
	fmt.Println("Reverse traversal:")
	for it := collection.GetReverseIterator(); it.Valid(); {
		fmt.Println(it.Next())
	}
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class WordsCollection;

// The Iterator interface declares the traversal operations.
class Iterator {
public:
    virtual ~Iterator() = default;
    virtual bool valid() const = 0;
    virtual std::string next() = 0;
};

// A Concrete Iterator implements a traversal algorithm and stores the current
// traversal position.
class AlphabeticalOrderIterator : public Iterator {
    const WordsCollection& collection_;
    int position_;
    bool reverse_;

public:
    AlphabeticalOrderIterator(const WordsCollection& collection, bool reverse);
    bool valid() const override;
    std::string next() override;
};

// Concrete Collections return iterators compatible with the collection.
class WordsCollection {
    std::vector<std::string> items_;

public:
    const std::vector<std::string>& getItems() const { return items_; }
    int getCount() const { return static_cast<int>(items_.size()); }
    void addItem(const std::string& item) { items_.push_back(item); }

    std::unique_ptr<Iterator> getIterator() {
        return std::make_unique<AlphabeticalOrderIterator>(*this, false);
    }
    std::unique_ptr<Iterator> getReverseIterator() {
        return std::make_unique<AlphabeticalOrderIterator>(*this, true);
    }
};

AlphabeticalOrderIterator::AlphabeticalOrderIterator(const WordsCollection& collection, bool reverse)
    : collection_(collection), reverse_(reverse) {
    position_ = reverse ? collection.getCount() - 1 : 0;
}

bool AlphabeticalOrderIterator::valid() const {
    return reverse_ ? position_ >= 0 : position_ < collection_.getCount();
}

std::string AlphabeticalOrderIterator::next() {
    std::string item = collection_.getItems()[position_];
    position_ += reverse_ ? -1 : 1;
    return item;
}

int main() {
    WordsCollection collection;
    collection.addItem("First");
    collection.addItem("Second");
    collection.addItem("Third");

    std::cout << "Straight traversal:\n";
    auto iterator = collection.getIterator();
    while (iterator->valid()) {
        std::cout << iterator->next() << "\n";
    }

    std::cout << "\nReverse traversal:\n";
    auto reverseIterator = collection.getReverseIterator();
    while (reverseIterator->valid()) {
        std::cout << reverseIterator->next() << "\n";
    }
}
```

## Rust Example

```rust
// A Concrete Iterator implements a traversal algorithm and stores the current
// traversal position.
struct AlphabeticalOrderIterator<'a> {
    collection: &'a WordsCollection,
    position: i32,
    reverse: bool,
}

impl<'a> AlphabeticalOrderIterator<'a> {
    fn new(collection: &'a WordsCollection, reverse: bool) -> Self {
        let position = if reverse { collection.get_count() - 1 } else { 0 };
        AlphabeticalOrderIterator { collection, position, reverse }
    }

    fn valid(&self) -> bool {
        if self.reverse {
            self.position >= 0
        } else {
            self.position < self.collection.get_count()
        }
    }

    fn next(&mut self) -> String {
        let item = self.collection.items[self.position as usize].clone();
        self.position += if self.reverse { -1 } else { 1 };
        item
    }
}

// The Concrete Collection returns iterators compatible with the collection.
struct WordsCollection {
    items: Vec<String>,
}

impl WordsCollection {
    fn new() -> Self {
        WordsCollection { items: Vec::new() }
    }

    fn get_count(&self) -> i32 {
        self.items.len() as i32
    }

    fn add_item(&mut self, item: &str) {
        self.items.push(item.to_string());
    }

    fn get_iterator(&self) -> AlphabeticalOrderIterator {
        AlphabeticalOrderIterator::new(self, false)
    }

    fn get_reverse_iterator(&self) -> AlphabeticalOrderIterator {
        AlphabeticalOrderIterator::new(self, true)
    }
}

fn main() {
    let mut collection = WordsCollection::new();
    collection.add_item("First");
    collection.add_item("Second");
    collection.add_item("Third");

    println!("Straight traversal:");
    let mut iterator = collection.get_iterator();
    while iterator.valid() {
        println!("{}", iterator.next());
    }

    println!();
    println!("Reverse traversal:");
    let mut reverse_iterator = collection.get_reverse_iterator();
    while reverse_iterator.valid() {
        println!("{}", reverse_iterator.next());
    }
}
```

## Pairs well with

Composite (iterators traverse Composite trees); Visitor (Visitor walks the structure via an Iterator); Memento (capture
iteration state for resumable traversal).
