---
name: Tier 0 and Non-GoF Patterns
category: Catalog
tier: 0
source: project catalog (language-native forms + widely used non-GoF patterns)
---

# Tier 0 and Non-GoF Patterns

**Tier 0** = what the language already gives you. Try it before any Tier 1
pattern. Every GoF reference also has a *Lighter idiomatic forms* table. This
file covers the non-GoF patterns you will reach for most often.

Use the same *Pattern check* line with `(Tier 0)`:

```
Pattern check: Dispatch Map (Tier 0) — applied — 4 export formats keyed on Format enum; each is one function.
Pattern check: Repository (Tier 0) — extended — new OrderRepository mirrors src/<feature>/user-repository.ts.
```

| Pattern | Use when | Details |
|---|---|---|
| Guard Clause | nested `if`, `else` after exit | [control-flow.md](control-flow.md) R1–R3 |
| Dispatch Map | ≥ 3 branches pick behavior by key | [control-flow.md](control-flow.md) R4 |
| Null Object | repeated `if (x != null)` before the same calls | below |
| Result type | expected failures handled by callers | below |
| Repository | persistence details leaking into domain logic | below |
| Specification | the same business rule combined / reused in many queries | below |
| Pipeline / Middleware | ordered, composable processing steps | below |
| Dependency Injection | a dependency varies or does I/O | below |

---

## Null Object

**Intent.** Replace "absent" with an object that does nothing, so callers
drop their null checks.

**Use when** many call sites guard the same optional collaborator
(`if (logger) logger.log(…)`), and "do nothing" is a correct default.

**Don't use when**

- Absence must be handled differently at each call site → use `Optional` / `Option` / `?.`
- Silently doing nothing hides a real error → fail fast instead
- There is only one call site → a single null check is simpler

```typescript
interface Logger { log(msg: string): void }
const noopLogger: Logger = { log: () => {} };

class Service {
  constructor(private logger: Logger = noopLogger) {}
  run() { this.logger.log('run'); }          // no null check anywhere
}
```

| Language | Form |
|---|---|
| Python | a `NullX` class or `lambda *_: None` default; `contextlib.nullcontext()` for context managers |
| Java | a stateless `NoOpX` implementation; `Optional` when absence is meaningful |
| C# | `NullLogger.Instance`-style singleton; nullable reference types for real absence |
| Go | a zero-value struct whose methods are no-ops; `io.Discard` |
| C++ | a no-op implementation behind a reference; `std::optional` for real absence |
| Rust | `Option<T>` is usually better; a no-op trait impl when a default is correct |

---

## Result type

**Intent.** Return expected failures as values, not exceptions, so the type
system makes callers handle them and control flow stays flat.

**Use when** failure is part of the domain (validation, not found, conflict)
and callers branch on it.

**Don't use when**

- The language's idiom is exceptions and the failure is truly exceptional (Java/C# I/O errors)
- Every caller just re-throws → let it propagate
- It would wrap an API that already returns `(value, error)` (Go) or `Result` (Rust)

```typescript
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parseAge(s: string): Result<number> {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: 'invalid age' };
  return { ok: true, value: n };
}
```

| Language | Form |
|---|---|
| Python | return `T \| None` or a small dataclass; raise for truly exceptional cases |
| Java | sealed interface `Result<T>` with `Ok` / `Err` records; `Optional` for "not found" |
| C# | `OneOf` / a `Result<T>` record; `bool TryX(out T)` for simple cases |
| Go | `(T, error)` — already idiomatic; check with an early return |
| C++ | `std::expected<T, E>` (C++23) |
| Rust | `Result<T, E>` + `?` — native |

---

## Repository

**Intent.** Put persistence behind a collection-like interface, so domain
logic never builds queries or touches the ORM directly.

**Use when** domain / service code is mixing business rules with SQL / ORM
calls, or you need to unit-test logic without a database.

**Don't use when**

- A thin CRUD app where the ORM already *is* the repository (Django models, ActiveRecord, EF `DbSet`)
- It would be a one-implementation interface that only forwards to the ORM with no query logic → skip the interface, keep the class
- It hides N+1 queries: repositories must expose batch methods (`findByIds`), see control-flow.md R5

```typescript
interface OrderRepository {
  byId(id: OrderId): Promise<Order | undefined>;
  byIds(ids: OrderId[]): Promise<Order[]>;          // batch — avoids N+1
  save(order: Order): Promise<void>;
}
```

Keep repository methods named after domain questions (`overdueFor(customer)`),
not generic `query(filter)` passthroughs.

---

## Specification

**Intent.** Name a business rule as an object or predicate that can be
combined (`and` / `or` / `not`) and reused in memory and in queries.

**Use when** the same eligibility / filter rule appears in several queries or
code paths, and rules are combined in different ways.

**Don't use when**

- The rule is used once → a named predicate function is enough
- Combinations are fixed → write the combined predicate directly

```typescript
type Spec<T> = (x: T) => boolean;
const and = <T>(...s: Spec<T>[]): Spec<T> => x => s.every(f => f(x));
const isActive: Spec<User> = u => u.active;
const isVerified: Spec<User> = u => u.verified;
const canOrder = and(isActive, isVerified);
```

---

## Pipeline / Middleware

**Intent.** Process a request through an ordered list of small steps, each of
which can transform the request, short-circuit it, or wrap the next step.

**Use when** cross-cutting steps (auth, logging, validation, retry, caching)
wrap a core handler, and their order or membership changes per route or
configuration.

**Don't use when**

- There are 1–2 fixed steps → call them in sequence
- Steps don't share one input/output shape

This is Chain of Responsibility + Decorator in function form. Use the
framework's native mechanism when there is one (Express / Koa middleware,
ASP.NET Core middleware, Go `func(http.Handler) http.Handler`, Rust
tower `Layer`, Python ASGI middleware).

---

## Dependency Injection

**Intent.** Pass collaborators in (constructor / parameter) instead of
constructing or importing them inside, so they can vary and be replaced in
tests.

**Inject** anything that does I/O (DB, HTTP, clock, random, filesystem, env)
or has more than one real implementation.

**Don't inject** pure helpers, value objects, or stable utilities. Import and
call them directly.

**Don't build** an interface for every class "for DI". Most languages can
substitute a concrete class in tests (fakes, test doubles, module mocking).
Add the interface once there is a second implementation or a boundary you
must decouple.

Prefer constructor injection with explicit parameters over service locators
and global containers reached from inside business code.
