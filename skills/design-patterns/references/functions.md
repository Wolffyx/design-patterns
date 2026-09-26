---
name: Functions and Errors
category: Rules
tier: 0
source: project rules (function size, parameters, flags, CQS, error handling)
---

# Function and Error Rules

Applied to every edit, before any pattern. The smell detector checks the
lines each edit touches; a project can make any of these block the write
via `smells.severity`.

| Rule | Smell id | Default threshold |
|---|---|---|
| F1 Small functions, one level of abstraction | `long-function` | `maxFunctionLines: 50` |
| F2 Few parameters | `long-param-list`, `long-constructor` | `maxParams: 4`, `constructorMaxParams: 5` |
| F3 No boolean flag parameters | `boolean-flag-param` | on |
| F4 Low branch count | `complexity` | `maxComplexity: 10` |
| F5 Command / query separation | — | — |
| E1 Never swallow an error | `swallowed-exception` | on |
| E2 Expected failure → value; exceptional → exception | — | — |
| E3 Wrap errors at boundaries, with context | — | — |

---

## F1 — Small functions, one level of abstraction

A function reads like a paragraph: every line at the same level of detail.
When a function mixes "what" (`validate order, charge, ship`) with "how"
(byte parsing, SQL strings, retry loops), extract the "how" into named
functions. Past ~50 body lines there are almost always two or three
functions inside. Name them after *what* they do, not *how*.

Don't split cohesive logic just to get under a number. Five lines in five
files is worse than one clear 60-line function (SKILL.md §3).

## F2 — Few parameters

More than 4 parameters (5+ for constructors) means callers have to remember
the order, and the function probably does too much.

| Language | Instead |
|---|---|
| TypeScript | an options object `f({ id, retries, timeoutMs })` with a typed interface |
| Python | keyword-only args `def f(id, *, retries=3, timeout=5)` or a dataclass |
| Java | a record parameter object, or a Builder for construction |
| C# | a record parameter object; named / optional args for construction |
| Go | an options struct, or functional options `New(addr, WithTimeout(5*time.Second))` |
| C++ | a config struct with designated initializers (C++20) |
| Rust | a config struct with `..Default::default()`, or a builder |

## F3 — No boolean flag parameters

`render(items, true)` hides meaning at the call site and makes the function
do two things. Split it, or pass an enum when there are more than two modes.

```typescript
// before
render(items, true);
function render(items: Item[], compact: boolean) { /* two code paths */ }

// after
renderCompact(items);
renderFull(items);
```

```python
# before
export(rows, True)

# after
export(rows, fmt=Format.CSV)      # enum when modes will grow
```

Setters are fine: `setVisible(bool)`, `set_enabled(True)`, `with_retry(false)`,
`isX` / `hasX` / `canX` / `shouldX` / `enable` / `disable` / `toggle`.

## F4 — Low branch count

Cyclomatic complexity = 1 + every `if`, loop, `case`, `catch`, `&&`, `||`
and ternary. Above 10 the function has too many paths to test. Fix with
the control-flow rules first (guard clauses, `continue`), then extract
branches into functions, then a dispatch map for branch ladders
(`control-flow.md` R4).

## F5 — Command / query separation

A function either *changes state* (command, returns nothing or an id) or
*answers a question* (query, no side effects), not both. `getUser()` must
not create the user; `save()` shouldn't return a freshly computed report.
Exceptions: well-known atomic operations (`pop`, `getOrCreate`,
`compareAndSet`, `INSERT … RETURNING`) whose names say they do both.

---

## E1 — Never swallow an error

An empty `catch`, `except: pass`, `if err != nil {}`, `Err(_) => {}` or
`.catch(() => {})` turns a failure into silent wrong behavior. Do one of:

1. **Handle** it: retry, fall back to a documented default, or return an error value.
2. **Log** it with context (what was being done, which ids) and continue,
   only when continuing is correct.
3. **Rethrow / wrap** it with context (E3).

Ignoring on purpose is allowed, with a comment inside the block that says
why (`// file may not exist on first run`). The detector treats a block with
a comment as intentional.

Catch the narrowest error type you can handle. `catch (Exception e)` /
`except Exception:` / `catch (...)` belong at process or request
boundaries, not deep in business logic.

## E2 — Expected failure → value; exceptional → exception

| Language | Expected failure (callers branch on it) | Exceptional (bug, broken invariant) |
|---|---|---|
| TypeScript | a discriminated `Result` union, or `undefined` for "not found" | `throw new Error` |
| Python | `None` / a result object; a specific exception subclass is also idiomatic | raise |
| Java | `Optional` for "not found", a sealed `Result` for domain failures | unchecked exceptions |
| C# | `TryX(out T)`, nullable returns, a `Result` record | exceptions |
| Go | `(T, error)` — always; check with an early return | `panic` only for programmer errors |
| C++ | `std::optional`, `std::expected<T, E>` (C++23) | exceptions (where enabled) |
| Rust | `Result<T, E>` + `?`, `Option<T>` | `panic!` only for bugs |

## E3 — Wrap errors at boundaries, with context

Where an error crosses a layer (repository → service → handler), add what
was being attempted, and keep the cause:

```typescript
throw new OrderLoadError(`loading order ${id}`, { cause: err });
```

```python
raise OrderLoadError(f"loading order {order_id}") from err
```

```java
throw new OrderLoadException("loading order " + id, e);
```

```csharp
throw new OrderLoadException($"loading order {id}", ex);
```

```go
return fmt.Errorf("loading order %d: %w", id, err)
```

```cpp
std::throw_with_nested(OrderLoadError("loading order " + std::to_string(id)));
```

```rust
.with_context(|| format!("loading order {id}"))?   // anyhow / eyre
```

Don't log *and* rethrow the same error at every layer. Log once, where it
is finally handled.
