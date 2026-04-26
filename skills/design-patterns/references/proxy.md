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

## Pairs well with

Adapter (proxies often look like adapters; the difference is intent — proxy controls access, adapter changes interface);
Decorator (decorator adds behavior, proxy controls access).
