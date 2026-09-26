---
name: Control Flow
category: Rules
tier: 0
source: project rules (guard clauses, N+1 branches, N+1 queries)
---

# Control Flow Rules

Five rules, applied **before** any GoF pattern. Most conditional mess is fixed
by one of these, with no new types.

| Rule | Smell id (hook) | Default |
|---|---|---|
| R1 No nested `if`, guard clauses first | `nested-if` | on |
| R2 Max control-flow depth 2 | `deep-nesting` | `maxNestingDepth: 2` |
| R3 No `else` after an exit | `else-after-return` | on |
| R4 N+1 branches: escalate a growing conditional | `conditional-ladder`, `scattered-discriminator` | 3 branches / 3 sites |
| R5 N+1 queries: never one round-trip per item | `n-plus-one`, `await-in-loop` | on (`minConfidence: medium`) |

The smell detector reports these only on lines the current Edit touched
(`smells.scope: "edited"`), so legacy code elsewhere in the file stays quiet.
Suppress one site with `// pattern-smell: ignore <smell-id>` (`#` in Python)
on the line or the line above. To enforce a rule instead of advising, set its
severity to `block` (`"smells": { "severity": { "nested-if": "block" } }`):
the smell gate then rejects the write before it lands.

---

## R1 — No nested `if`: guard clauses first

An `if` directly inside another `if` (or inside a bare `else`) is not allowed.
Fix it one of these ways, in this order:

1. **Guard clause.** Invert the outer condition, exit early (`return`,
   `throw`, `continue`), then write the main path unindented.
2. **Merge.** Two conditions that only guard one action become one condition,
   or a named predicate when the result is hard to read.
3. **`else if` / `elif`.** An `if` as the only statement of an `else` block
   becomes `else if`.
4. **Extract.** The inner block becomes its own function, which then uses
   guard clauses itself.

A compound condition with more than 2 terms goes into a named predicate:
`if (isEligible(user))`, not `if (user.age > 18 && user.verified && !user.banned)`.

Repeated null checks down a chain (`if (a) { if (a.b) { if (a.b.c)`) call for
optional chaining (`a?.b?.c`), `Optional` / `Option`, or a **Null Object**
(see `extras.md`).

## R2 — Max control-flow depth 2

Count `if` / `else`, loops, `switch` / `match`, and `try` / `catch` blocks on
the path from the function body. A `for` containing an `if` is depth 2 and
fine. A third level means the function does too much: extract the inner
block, or switch to guard clauses and `continue`. Scope-only blocks don't
count: `with`, `using`, `lock`, `synchronized`, `unsafe`.

## R3 — No `else` after an exit

When a branch ends in `return` / `throw` / `raise` / `continue` / `break`,
the `else` is noise. Drop it and dedent its body. Python's `for … else` /
`while … else` are loop constructs and are exempt.

### R1–R3 before / after

**TypeScript**

```typescript
// before — depth 3, nested if, else after return
function ship(order: Order) {
  if (order) {
    if (order.paid) {
      if (order.items.length > 0) {
        return dispatch(order);
      } else {
        return reject('empty');
      }
    }
  }
  return reject('unpaid');
}

// after — guard clauses, depth 1
function ship(order: Order) {
  if (!order?.paid) return reject('unpaid');
  if (order.items.length === 0) return reject('empty');
  return dispatch(order);
}
```

**Python**

```python
def ship(order):
    if not order or not order.paid:
        return reject("unpaid")
    if not order.items:
        return reject("empty")
    return dispatch(order)
```

**Java**

```java
Result ship(Order order) {
    if (order == null || !order.isPaid()) return Result.reject("unpaid");
    if (order.items().isEmpty()) return Result.reject("empty");
    return dispatch(order);
}
```

**C#**

```csharp
Result Ship(Order? order)
{
    if (order is not { Paid: true }) return Result.Reject("unpaid");
    if (order.Items.Count == 0) return Result.Reject("empty");
    return Dispatch(order);
}
```

**Go** (early return is already idiomatic Go; keep the happy path unindented)

```go
func Ship(o *Order) error {
	if o == nil || !o.Paid {
		return ErrUnpaid
	}
	if len(o.Items) == 0 {
		return ErrEmpty
	}
	return dispatch(o)
}
```

**C++**

```cpp
Result ship(const Order* order) {
    if (!order || !order->paid) return Result::reject("unpaid");
    if (order->items.empty()) return Result::reject("empty");
    return dispatch(*order);
}
```

**Rust** (`let … else` and `?` are guard clauses)

```rust
fn ship(order: Option<&Order>) -> Result<Receipt, ShipError> {
    let Some(order) = order.filter(|o| o.paid) else {
        return Err(ShipError::Unpaid);
    };
    if order.items.is_empty() {
        return Err(ShipError::Empty);
    }
    dispatch(order)
}
```

Loops: use `continue` as the guard.

```python
for user in users:
    if not user.active:
        continue
    if user.email is None:
        continue
    notify(user)
```

---

## R4 — N+1 branches: escalate a growing conditional

A conditional that picks *behavior* by a discriminator (`kind`, `type`,
`status`, `role`, `provider`…) climbs a fixed ladder. When you are about to
add branch N+1, check the rung first. Refactor before adding the branch, not
after.

The refactor is part of the change that adds the branch. Make it in the same
edit even when the request only names the new variant ("add the adyen
provider"). Adding the branch and offering the refactor as a follow-up breaks
the rule: the ladder is what the new variant costs.

| Rung | Shape | Move up when |
|---|---|---|
| 1 | `if` / `else` (≤ 2 branches) | a 3rd branch arrives |
| 2 | **Dispatch map** — `Record<Kind, Fn>` / `dict` / `Map<K, Supplier>` / `map[K]func` / `match` on a closed enum | branches need more than one operation each, or carry state |
| 3 | **Strategy** (varies the algorithm) or **State** (varies by lifecycle state, with transitions) | — |

Two more triggers skip straight to rung 2 or 3:

- **Same discriminator, third site.** The same `x.status == …` check
  appearing at a *third* site (N+1 over the 2 you can tolerate) means the
  knowledge is scattered. Centralize it: a map, polymorphic
  method, or State object that owns the per-variant decision.
- **Variants will keep coming.** Integrations, payment providers, file
  formats, message types. Use rung 2 or 3 from the start.

Exhaustive `switch` / `match` over a **closed** union (TS `never` check,
Java sealed + pattern switch, Rust `enum` + `match`, C# switch expression
with a discard throw) is a legitimate rung-2 form: the compiler lists every
site to update when a variant is added. The hooks skip switches marked with
`assertNever` / `: never` / `unreachable`, and Rust `match` entirely.

Before adding an `if` / `else if` / `switch` branch, ask:

1. Does each branch represent a different *behavior*, not just a value?
2. Will more variants likely be added?
3. Is the same condition checked elsewhere?
4. Would a dispatch map, polymorphic type, State, or Command make it clearer?

Any "yes" → move up a rung instead of adding the branch.

### Dispatch map in each language

```typescript
const handlers: Record<Kind, (e: Event) => void> = {
  created: onCreated,
  paid: onPaid,
  shipped: onShipped,
};
handlers[event.kind](event);
```

```python
HANDLERS: dict[Kind, Callable[[Event], None]] = {
    Kind.CREATED: on_created,
    Kind.PAID: on_paid,
    Kind.SHIPPED: on_shipped,
}
HANDLERS[event.kind](event)
```

```java
private static final Map<Kind, Consumer<Event>> HANDLERS = Map.of(
    Kind.CREATED, Handlers::onCreated,
    Kind.PAID, Handlers::onPaid,
    Kind.SHIPPED, Handlers::onShipped);
HANDLERS.get(event.kind()).accept(event);
```

```csharp
private static readonly Dictionary<Kind, Action<Event>> Handlers = new()
{
    [Kind.Created] = OnCreated,
    [Kind.Paid] = OnPaid,
    [Kind.Shipped] = OnShipped,
};
Handlers[evt.Kind](evt);
```

```go
var handlers = map[Kind]func(Event){
	KindCreated: onCreated,
	KindPaid:    onPaid,
	KindShipped: onShipped,
}
handlers[e.Kind](e)
```

```cpp
static const std::unordered_map<Kind, void (*)(const Event&)> handlers{
    {Kind::Created, onCreated},
    {Kind::Paid, onPaid},
    {Kind::Shipped, onShipped},
};
handlers.at(e.kind)(e);
```

```rust
// a closed enum + match IS the dispatch map in Rust: exhaustive, zero-cost
match event.kind {
    Kind::Created => on_created(&event),
    Kind::Paid => on_paid(&event),
    Kind::Shipped => on_shipped(&event),
}
```

Handle the missing key explicitly (`?? fallback`, `.get(k, default)`,
`getOrDefault`, `TryGetValue`, `, ok`) unless the key type is a closed enum.

---

## R5 — N+1 queries: never one round-trip per item

One query to load N parents, then one query per parent for its children, is
N+1 round-trips: fine with 3 rows in dev, a timeout with 3 000 in production.
The same holds for HTTP calls, cache lookups over the network, and writes.

### How to think about it

Before writing a loop that touches a database or an API, answer four
questions. They also decide the fix:

| Question | If yes | Fix |
|---|---|---|
| Does the call depend on the loop item? | **per-item** — the classic N+1 | Collect the keys, load all rows in **one** call (`IN` / `= ANY` / `findMany({ id: { in } })` / bulk endpoint) *before* the loop, then look up in a map inside it. |
| Does the call *not* depend on the loop item? | **loop-invariant** — same call N times | Hoist it above the loop and reuse the result. |
| Is it a relation read on ORM rows (`order.customer.name`)? | **lazy load** — invisible N+1 | Eager-load in the original query (`select_related` / `selectinload` / `JOIN FETCH` / `.Include` / `include:` / `Preload`). |
| Is it a write (`save` / `insert` / `update`) per item? | **N writes** | One bulk write (`saveAll`, `bulk_create`, `executemany`, `AddRange` + one `SaveChanges`, `insertMany`, `COPY`). |

Two things are **not** fixes:

- `Promise.all` / `asyncio.gather` / `Task.WhenAll` over N calls is still N
  round-trips. It hides latency but multiplies load, and it gets rate-limited.
  Use it only when no batch API exists, and then bound the concurrency
  (`p-limit`, a semaphore, `errgroup.SetLimit`).
- Caching per item inside the loop. Batch first; cache the batch if needed.

A **GraphQL field resolver** that queries per parent object is an N+1 with
no visible loop: the executor loops for you. Use a DataLoader (batch + per-request cache).

Loops where I/O per iteration is correct: **cursor pagination** (each page
needs the previous page's cursor), **polling / retry** loops, and
**order-dependent writes** (each step reads what the previous one wrote).
These are `while`-shaped by nature. Suppress with the reason when a
`for`-loop genuinely needs it:
`// pattern-smell: ignore n-plus-one — rate-limited API, sequential by contract`.

### Fixes by stack

| Instead of (inside the loop) | Do |
|---|---|
| `repo.findById(id)` per id | `findAllById(ids)` / `WHERE id IN (…)` / `= ANY($1)` |
| lazy relation access (`order.customer.name`) | eager load: SQLAlchemy `selectinload` / `joinedload`, Django `select_related` / `prefetch_related`, JPA `JOIN FETCH` / `@EntityGraph`, EF Core `.Include()`, Prisma `include`, TypeORM `relations`, GORM `Preload` |
| per-row `save()` / `insert` | bulk insert / `saveAll` / `executemany` / `bulk_create` / `AddRange` + one `SaveChanges` / `COPY` |
| `fetch(url)` per item | a bulk endpoint; else bounded concurrency |
| per-field resolver queries (GraphQL) | DataLoader (batch + per-request cache) |
| `await x` per item, items independent | `Promise.all` / `asyncio.gather` / `Task.WhenAll` / `errgroup` / `join_all`, bounded by a semaphore or `p-limit` |

**TypeScript**

```typescript
// before — N+1
for (const order of orders) {
  order.customer = await db.customer.findUnique({ where: { id: order.customerId } });
}

// after — 1 query + in-memory join
const ids = [...new Set(orders.map(o => o.customerId))];
const customers = await db.customer.findMany({ where: { id: { in: ids } } });
const byId = new Map(customers.map(c => [c.id, c]));
for (const order of orders) order.customer = byId.get(order.customerId);
```

**Python (Django / SQLAlchemy)**

```python
orders = Order.objects.select_related("customer")          # FK: one JOIN
orders = Order.objects.prefetch_related("items")           # reverse/M2M: 2 queries total
stmt = select(Order).options(selectinload(Order.items))    # SQLAlchemy
```

**Java (JPA)**

```java
@Query("select o from Order o join fetch o.customer where o.id in :ids")
List<Order> findWithCustomer(@Param("ids") Collection<Long> ids);
```

**C# (EF Core)**

```csharp
var orders = await db.Orders
    .Include(o => o.Customer)
    .Where(o => ids.Contains(o.Id))
    .ToListAsync();
```

**Go**

```go
rows, err := db.QueryContext(ctx,
	`SELECT id, name FROM customers WHERE id = ANY($1)`, pq.Array(ids))
```

**C++**

```cpp
// build one parameterized IN (...) / = ANY($1) statement; never execute per element
auto rows = conn.exec_params("SELECT id, name FROM customers WHERE id = ANY($1)", ids);
```

**Rust (sqlx)**

```rust
let customers = sqlx::query_as!(Customer,
    "SELECT id, name FROM customers WHERE id = ANY($1)", &ids[..])
    .fetch_all(&pool).await?;
```

### What the detector reports

`n-plus-one` findings carry a confidence; `smells.nPlusOne.minConfidence`
(default `medium`) sets the floor.

| Confidence | Evidence |
|---|---|
| high | a known driver / ORM / HTTP API: `.findUnique(`, `.findById(`, `cursor.execute(sql`, `.objects.get(`, `session.get(Model`, `db.QueryRowContext(`, `.FirstOrDefaultAsync(`, `fetch(`, `requests.get(`, `sqlx::query!`, … plus `nPlusOne.extraCallPatterns` |
| medium | any method on a data-access receiver (`userRepo.x(`, `this.apiClient.x(`, `db.x(`; override with `nPlusOne.dataAccessReceivers`); a function that (transitively) does I/O — in this file **or another one**: imported functions, namespace calls (`users.load(`, `users::load(`), methods of injected services (`this.userService.getUser(`); a lazy relation read on ORM rows fetched without eager loading; a resolver querying per parent |
| low | a sequential `await` with no recognised I/O call — reported as the separate `await-in-loop` smell (`nPlusOne.flagAwaitInLoop`) |

A cross-file finding names where the round-trip really happens:

```
N+1: `this.userService.getUser()` (does `.findUnique(`, src/user-store.ts:3) once per `id` (loop line 9)
```

Fix it at the call site: add a batch method along the chain
(`UserStore.byIds(ids)` → `UserService.getUsers(ids)`), call it once before
the loop, and look results up in a map. Imports are followed up to
`nPlusOne.crossFile.maxDepth` (2) files deep.

Each finding says which case it is: **per-item** (batch it),
**loop-invariant** (hoist it), **N writes** (bulk write), **concurrent**
(inside `Promise.all`: still N round-trips), or **nested** (N×M).

Skipped by default: `while` / `do` / `loop` bodies (pagination, polling,
retry — enable with `nPlusOne.includeWhileLoops`), and loops over literal
collections or literal ranges ≤ `nPlusOne.smallLoopMax` (10).

Project-specific I/O (an internal SDK, a custom repository base) goes in
`nPlusOne.extraCallPatterns` (regex sources, high confidence) or
`nPlusOne.dataAccessReceivers` (a regex for receiver names, medium).
