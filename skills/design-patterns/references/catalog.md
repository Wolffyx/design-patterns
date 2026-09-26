---
name: Pattern Catalog
category: Catalog
source: SKILL.md (moved out to keep the always-on skill small)
---

# Pattern Catalog

Decision tree, quick lookup table, the full tiered catalog, common
combinations and anti-patterns. Read this when SKILL.md §8 says a pattern
may fit and you need to pick one.

## Decision tree

```
Choosing behavior by a kind / type / status?          (control-flow R4)
  ├─ ≤ 2 variants → if / else, guard clauses
  ├─ 3+ variants, one operation each → Dispatch Map (Tier 0) / exhaustive match
  ├─ Variants carry several operations or config → Strategy
  ├─ Behavior changes as the object moves through states → State
  └─ New operations over a fixed closed set of types → Visitor (or match per op)

Need to create objects?
  ├─ One concrete type, no swap → just `new`, no pattern
  ├─ Pick concrete type at runtime → Factory Method (or a map of constructors)
  ├─ Families of related types → Abstract Factory
  ├─ Many optional params / step-by-step build → Builder (or options object / named args)
  ├─ Exactly one instance globally → Singleton (last resort — DI / module instance)
  └─ Cheap clone of an existing instance → Prototype (or language clone / copy)

Need to compose / wrap / bridge structures?
  ├─ Incompatible interfaces → Adapter
  ├─ Hide a complex subsystem → Facade
  ├─ Add behavior without subclass explosion → Decorator (or higher-order fn)
  ├─ Tree of part-whole → Composite
  ├─ Lazy / access control / remote stand-in → Proxy
  ├─ Two independent dimensions of variation → Bridge
  ├─ Many small objects sharing intrinsic state → Flyweight
  └─ Persistence leaking into domain logic → Repository (Tier 0)

Need objects to communicate?
  ├─ Swap algorithms at runtime → Strategy (or pass a function)
  ├─ Notify N listeners on event → Observer
  ├─ Walk a collection without exposing internals → Iterator (or generator)
  ├─ Algorithm skeleton with overridable steps → Template Method
  ├─ Encapsulate request as object (queue / undo / log) → Command
  ├─ Pass request through handler chain → Chain of Responsibility / Middleware
  ├─ Hub coordinating N peer objects → Mediator
  ├─ Snapshot for undo without exposing internals → Memento
  └─ Add operations to a class hierarchy without modifying it → Visitor

Handling absence or failure?
  ├─ Many call sites null-check the same collaborator → Null Object (Tier 0)
  └─ Expected failure callers must branch on → Result type (Tier 0)
```

---

## Quick decision table

| If you need...                            | Use                         |
|-------------------------------------------|-----------------------------|
| Flatten nested ifs                        | **Guard clauses** (Tier 0)  |
| Pick behavior by key, 3+ variants         | **Dispatch Map** (Tier 0)   |
| Load related rows for a list              | **Batch / eager load** (R5) |
| Swap algorithms at runtime                | **Strategy**                |
| Wrap an incompatible API                  | **Adapter**                 |
| Hide a complex subsystem                  | **Facade**                  |
| Pick concrete class at runtime            | **Factory Method**          |
| Notify N subscribers on event             | **Observer**                |
| Walk a collection opaquely                | **Iterator**                |
| Algorithm skeleton with overridable steps | **Template Method**         |
| Build complex object step-by-step         | **Builder**                 |
| Families of related products              | **Abstract Factory**        |
| Encapsulate a request (undo/queue/log)    | **Command**                 |
| State-dependent behavior                  | **State**                   |
| Tree of part-whole, treated uniformly     | **Composite**               |
| Stack runtime behaviors on object         | **Decorator**               |
| Pipeline of handlers                      | **Chain of Responsibility** |
| Single global instance                    | **Singleton** (last resort) |

---

## Full catalog

| Tier  | Pattern                 | Category   | Pop | Reference                                                                      |
|-------|-------------------------|------------|-----|--------------------------------------------------------------------------------|
| **0** | Control-flow rules      | Rules      | –   | [control-flow.md](control-flow.md)                       |
| **0** | Null Object, Result, Repository, Specification, Middleware, DI | Non-GoF | – | [extras.md](extras.md) |
| **1** | Factory Method          | Creational | 3   | [factory-method.md](factory-method.md)                   |
| **1** | Abstract Factory        | Creational | 3   | [abstract-factory.md](abstract-factory.md)               |
| **1** | Builder                 | Creational | 3   | [builder.md](builder.md)                                 |
| **1** | Singleton (default: reject) | Creational | 3 | [singleton.md](singleton.md)                           |
| **1** | Adapter                 | Structural | 3   | [adapter.md](adapter.md)                                 |
| **1** | Facade                  | Structural | 3   | [facade.md](facade.md)                                   |
| **1** | Strategy                | Behavioral | 3   | [strategy.md](strategy.md)                               |
| **1** | Observer                | Behavioral | 3   | [observer.md](observer.md)                               |
| **1** | Iterator                | Behavioral | 3   | [iterator.md](iterator.md)                               |
| **1** | Template Method         | Behavioral | 3   | [template-method.md](template-method.md)                 |
| **2** | Decorator               | Structural | 2   | [decorator.md](decorator.md)                             |
| **2** | Composite               | Structural | 2   | [composite.md](composite.md)                             |
| **2** | Command                 | Behavioral | 2   | [command.md](command.md)                                 |
| **2** | State                   | Behavioral | 2   | [state.md](state.md)                                     |
| **2** | Chain of Responsibility | Behavioral | 2   | [chain-of-responsibility.md](chain-of-responsibility.md) |
| **3** | Prototype               | Creational | 1   | [prototype.md](prototype.md)                             |
| **3** | Proxy                   | Structural | 1   | [proxy.md](proxy.md)                                     |
| **3** | Bridge                  | Structural | 1   | [bridge.md](bridge.md)                                   |
| **3** | Flyweight               | Structural | 1   | [flyweight.md](flyweight.md)                             |
| **3** | Mediator                | Behavioral | 1   | [mediator.md](mediator.md)                               |
| **3** | Memento                 | Behavioral | 1   | [memento.md](memento.md)                                 |
| **3** | Visitor                 | Behavioral | 1   | [visitor.md](visitor.md)                                 |

Hook-only material: [hook-protocol.md](hook-protocol.md).

---

## Common pattern combinations

| Combo                     | Use case                                                          |
|---------------------------|-------------------------------------------------------------------|
| Strategy + Factory Method | Pluggable algorithm where the factory picks the concrete strategy |
| Dispatch Map + Strategy   | Map from key to strategy instance: registration without `switch`  |
| Command + Memento         | Undo/redo                                                         |
| Observer + Mediator       | Event bus where the mediator dispatches to observers              |
| Composite + Iterator      | Tree walking                                                      |
| Facade + Adapter          | Facade hiding multiple Adapters over different backends           |
| Repository + Adapter      | Domain-shaped repository over a vendor SDK / ORM                  |
| State + Strategy          | Strategy for the active behavior, State for switching strategies  |
| Decorator + Strategy      | Stack decorators on top of a base strategy                        |

---

## Anti-patterns to avoid (companion catalog)

- **Arrow code**: nested `if` pyramids, so the happy path drifts right →
  guard clauses (control-flow.md R1–R3)
- **N+1 queries**: one query per loop item → batch / eager load (control-flow.md R5)
- **Shotgun conditionals**: the same `status ==` check in many places →
  centralize via map / State / polymorphism (control-flow.md R4)
- **God Object / God Class**: a class doing >5 unrelated things → split by responsibility
- **Anemic Domain Model**: data class with no behavior plus a service class
  holding all its rules → move invariants and rules onto the type that owns the data
- **Singleton abuse**: Singleton for state-passing convenience → use DI / context / a store slice
- **Pattern soup**: stacking 3+ patterns to do one job (Adapter+Decorator+Strategy where Adapter alone fits)
- **Premature Factory**: Factory for one concrete type → just call `new`
- **Stringly-typed dispatch**: `if (type === 'foo')` chains → enum + dispatch map, Strategy, or polymorphism
- **Inheritance-for-reuse**: `extends` to grab methods → composition / Strategy / Decorator
- **Speculative interface**: interface with one implementation and no boundary → use the concrete class
