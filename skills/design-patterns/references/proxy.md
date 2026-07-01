---
name: Proxy
category: Structural
popularity: 1/3
tier: 3
source: refactoring.guru/design-patterns/proxy/typescript/example
---

# Proxy

## Intent

Proxy is a structural design pattern that lets you provide a substitute or placeholder for another object. A proxy
controls access to the original object, allowing you to perform something either before or after the request gets
through to the original object.

## Applicability

- You have a heavyweight service object that wastes resources by always running, though you only need it occasionally (
  lazy initialization)
- You want to restrict which clients can access the service object based on specific credentials or criteria (access
  control)
- The service object resides on a remote server and you need to handle network complexities transparently
- You need to maintain a history of requests made to the service object
- You must cache request results and manage that cache's lifecycle

## Pros

- Controls service object access without clients being aware of it
- Manages the service object's lifecycle independently of client concerns
- Works even when the service object is unavailable or not yet ready
- Supports the Open/Closed Principle—you can introduce new proxies without modifying services or clients

## Cons

- Code complexity increases due to introduction of numerous new classes
- Service responses may experience delayed delivery

## Don't use when

- You can use JavaScript's built-in `Proxy` global → use it directly, no class needed
- A simple lazy getter (`get foo() { return this._foo ??= compute() }`) suffices
- The "proxy" doesn't add behavior beyond delegation → just use the real object

## TypeScript Example

```typescript
/**
 * The Subject interface declares common operations for both RealSubject and the
 * Proxy. As long as the client works with RealSubject using this interface,
 * you'll be able to pass it a proxy instead of a real subject.
 */
interface Subject {
    request(): void;
}

/**
 * The RealSubject contains some core business logic. Usually, RealSubjects are
 * capable of doing some useful work which may also be very slow or sensitive -
 * e.g. correcting input data. A Proxy can solve these issues without any
 * changes to the RealSubject's code.
 */
class RealSubject implements Subject {
    public request(): void {
        console.log('RealSubject: Handling request.');
    }
}

/**
 * The Proxy has an interface identical to the RealSubject.
 */
class Proxy implements Subject {
    private realSubject: RealSubject;

    /**
     * The Proxy maintains a reference to an object of the RealSubject class. It
     * can be either lazy-loaded or passed to the Proxy by the client.
     */
    constructor(realSubject: RealSubject) {
        this.realSubject = realSubject;
    }

    /**
     * The most common applications of the Proxy pattern are lazy loading,
     * caching, controlling the access, logging, etc.
     */
    public request(): void {
        if (this.checkAccess()) {
            this.realSubject.request();
            this.logAccess();
        }
    }

    private checkAccess(): boolean {
        // Some real checks should go here.
        console.log('Proxy: Checking access prior to firing a real request.');

        return true;
    }

    private logAccess(): void {
        console.log('Proxy: Logging the time of request.');
    }
}

/**
 * The client code is supposed to work with all objects (both subjects and
 * proxies) via the Subject interface in order to support both real subjects and
 * proxies.
 */
function clientCode(subject: Subject) {
    subject.request();
}

console.log('Client: Executing the client code with a real subject:');
const realSubject = new RealSubject();
clientCode(realSubject);

console.log('');

console.log('Client: Executing the same client code with a proxy:');
const proxy = new Proxy(realSubject);
clientCode(proxy);
```

## Python Example

```python
from abc import ABC, abstractmethod


class Subject(ABC):
    """
    The Subject interface declares common operations for both RealSubject and
    the Proxy. As long as the client works with RealSubject using this
    interface, you'll be able to pass it a proxy instead of a real subject.
    """

    @abstractmethod
    def request(self) -> None:
        pass


class RealSubject(Subject):
    """
    The RealSubject contains some core business logic. Usually, RealSubjects are
    capable of doing some useful work which may also be very slow or sensitive -
    e.g. correcting input data. A Proxy can solve these issues without any
    changes to the RealSubject's code.
    """

    def request(self) -> None:
        print("RealSubject: Handling request.")


class Proxy(Subject):
    """
    The Proxy has an interface identical to the RealSubject.
    """

    def __init__(self, real_subject: RealSubject) -> None:
        self._real_subject = real_subject

    def request(self) -> None:
        if self.check_access():
            self._real_subject.request()
            self.log_access()

    def check_access(self) -> bool:
        print("Proxy: Checking access prior to firing a real request.")
        return True

    def log_access(self) -> None:
        print("Proxy: Logging the time of request.")


def client_code(subject: Subject) -> None:
    """
    The client code is supposed to work with all objects (both subjects and
    proxies) via the Subject interface in order to support both real subjects
    and proxies.
    """
    subject.request()


if __name__ == "__main__":
    print("Client: Executing the client code with a real subject:")
    real_subject = RealSubject()
    client_code(real_subject)

    print("")

    print("Client: Executing the same client code with a proxy:")
    proxy = Proxy(real_subject)
    client_code(proxy)
```

## Java Example

```java
// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
interface Subject {
    void request();
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
class RealSubject implements Subject {
    @Override
    public void request() {
        System.out.println("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
class Proxy implements Subject {
    private final RealSubject realSubject;

    public Proxy(RealSubject realSubject) {
        this.realSubject = realSubject;
    }

    @Override
    public void request() {
        if (checkAccess()) {
            realSubject.request();
            logAccess();
        }
    }

    private boolean checkAccess() {
        System.out.println("Proxy: Checking access prior to firing a real request.");
        return true;
    }

    private void logAccess() {
        System.out.println("Proxy: Logging the time of request.");
    }
}

// The client code is supposed to work with all objects via the Subject
// interface in order to support both real subjects and proxies.
public class Demo {
    static void clientCode(Subject subject) {
        subject.request();
    }

    public static void main(String[] args) {
        System.out.println("Client: Executing the client code with a real subject:");
        RealSubject realSubject = new RealSubject();
        clientCode(realSubject);

        System.out.println();

        System.out.println("Client: Executing the same client code with a proxy:");
        Proxy proxy = new Proxy(realSubject);
        clientCode(proxy);
    }
}
```

## C# Example

```csharp
using System;

// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
public interface ISubject
{
    void Request();
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
public class RealSubject : ISubject
{
    public void Request()
    {
        Console.WriteLine("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
public class Proxy : ISubject
{
    private readonly RealSubject _realSubject;

    public Proxy(RealSubject realSubject)
    {
        _realSubject = realSubject;
    }

    public void Request()
    {
        if (CheckAccess())
        {
            _realSubject.Request();
            LogAccess();
        }
    }

    private bool CheckAccess()
    {
        Console.WriteLine("Proxy: Checking access prior to firing a real request.");
        return true;
    }

    private void LogAccess()
    {
        Console.WriteLine("Proxy: Logging the time of request.");
    }
}

// The client code is supposed to work with all objects via the ISubject
// interface in order to support both real subjects and proxies.
public class Demo
{
    static void ClientCode(ISubject subject)
    {
        subject.Request();
    }

    public static void Main(string[] args)
    {
        Console.WriteLine("Client: Executing the client code with a real subject:");
        var realSubject = new RealSubject();
        ClientCode(realSubject);

        Console.WriteLine();

        Console.WriteLine("Client: Executing the same client code with a proxy:");
        var proxy = new Proxy(realSubject);
        ClientCode(proxy);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Subject declares common operations for both RealSubject and the Proxy. As
// long as the client works with RealSubject using this interface, you'll be
// able to pass it a proxy instead of a real subject.
type Subject interface {
	Request()
}

// RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
type RealSubject struct{}

func (r *RealSubject) Request() {
	fmt.Println("RealSubject: Handling request.")
}

// Proxy has an interface identical to the RealSubject.
type Proxy struct {
	realSubject *RealSubject
}

func (p *Proxy) Request() {
	if p.checkAccess() {
		p.realSubject.Request()
		p.logAccess()
	}
}

func (p *Proxy) checkAccess() bool {
	fmt.Println("Proxy: Checking access prior to firing a real request.")
	return true
}

func (p *Proxy) logAccess() {
	fmt.Println("Proxy: Logging the time of request.")
}

// clientCode works with all objects via the Subject interface in order to
// support both real subjects and proxies.
func clientCode(subject Subject) {
	subject.Request()
}

func main() {
	fmt.Println("Client: Executing the client code with a real subject:")
	realSubject := &RealSubject{}
	clientCode(realSubject)

	fmt.Println("")

	fmt.Println("Client: Executing the same client code with a proxy:")
	proxy := &Proxy{realSubject: realSubject}
	clientCode(proxy)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>

// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
class Subject {
public:
    virtual ~Subject() = default;
    virtual void Request() const = 0;
};

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
class RealSubject : public Subject {
public:
    void Request() const override {
        std::cout << "RealSubject: Handling request.\n";
    }
};

// The Proxy has an interface identical to the RealSubject.
class Proxy : public Subject {
private:
    std::shared_ptr<RealSubject> real_subject_;

    bool CheckAccess() const {
        std::cout << "Proxy: Checking access prior to firing a real request.\n";
        return true;
    }

    void LogAccess() const {
        std::cout << "Proxy: Logging the time of request.\n";
    }

public:
    explicit Proxy(std::shared_ptr<RealSubject> real_subject)
        : real_subject_(std::move(real_subject)) {}

    void Request() const override {
        if (CheckAccess()) {
            real_subject_->Request();
            LogAccess();
        }
    }
};

// The client code works with all objects via the Subject interface in order to
// support both real subjects and proxies.
void ClientCode(const Subject& subject) {
    subject.Request();
}

int main() {
    std::cout << "Client: Executing the client code with a real subject:\n";
    auto real_subject = std::make_shared<RealSubject>();
    ClientCode(*real_subject);

    std::cout << "\n";

    std::cout << "Client: Executing the same client code with a proxy:\n";
    Proxy proxy(real_subject);
    ClientCode(proxy);

    return 0;
}
```

## Rust Example

```rust
// The Subject trait declares common operations for both RealSubject and the
// Proxy. As long as the client works with RealSubject using this trait, you'll
// be able to pass it a proxy instead of a real subject.
trait Subject {
    fn request(&self);
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
struct RealSubject;

impl Subject for RealSubject {
    fn request(&self) {
        println!("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
struct Proxy {
    real_subject: RealSubject,
}

impl Proxy {
    fn new(real_subject: RealSubject) -> Self {
        Proxy { real_subject }
    }

    fn check_access(&self) -> bool {
        println!("Proxy: Checking access prior to firing a real request.");
        true
    }

    fn log_access(&self) {
        println!("Proxy: Logging the time of request.");
    }
}

impl Subject for Proxy {
    fn request(&self) {
        if self.check_access() {
            self.real_subject.request();
            self.log_access();
        }
    }
}

// The client code works with all objects via the Subject trait in order to
// support both real subjects and proxies.
fn client_code(subject: &dyn Subject) {
    subject.request();
}

fn main() {
    println!("Client: Executing the client code with a real subject:");
    let real_subject = RealSubject;
    client_code(&real_subject);

    println!();

    println!("Client: Executing the same client code with a proxy:");
    let proxy = Proxy::new(RealSubject);
    client_code(&proxy);
}
```

## Pairs well with

Adapter (proxies often look like adapters; the difference is intent — proxy controls access, adapter changes interface);
Decorator (decorator adds behavior, proxy controls access).
