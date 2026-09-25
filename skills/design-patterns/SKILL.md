---
name: design-patterns
description: >
  Always-on software design skill for TypeScript, Python, Java, C#, Go, C++
  and Rust. Covers SOLID, composition and dependency injection; control-flow
  rules (no nested ifs, guard clauses, max nesting depth 2, no else after
  return, N+1 branches escalating to dispatch map / Strategy / State, N+1
  query prevention); Tier 0 language-native forms (dispatch map, null object,
  result type, repository, middleware); and the 22 GoF patterns from
  refactoring.guru. Use for: new class, interface, or function, conditional
  logic, if/else, switch, loops over DB or HTTP calls, refactoring,
  abstraction, architecture, design or code review, planning, inheritance,
  polymorphism, pattern check, factory method, abstract factory, builder,
  prototype, singleton, adapter, bridge, composite, decorator, facade,
  flyweight, proxy, chain of responsibility, command, iterator, mediator,
  memento, observer, state, strategy, template method, visitor. Try Tier 0
  first, then Tier 1. References include code in all seven languages.
---

# Design Patterns Skill

Write code that is easy to change, test and read. Decide in this order:

1. **Control flow** (§5): flat functions, guard clauses, no N+1s. Applies to
   every edit.
2. **Tier 0** (§7): what the language already gives you, like a function,
   a map, an enum + `match`, or a Result type.
3. **GoF patterns** (Tier 1 → 3): only when the problem matches one and
   §3 does not reject it.

Every Write/Edit on a source file (TypeScript, Python, Java, C#, Go, C++,
Rust) with substantive new logic must carry a *Pattern check* line, **even
bug fixes, new functions, and refactors that don't declare a class**. Most
answer `no GoF pattern — rejected`, and that is correct.

---

## 1. Required output format (DO THIS EVERY TIME)

**Default form.** Use it for most bug fixes, small edits, and single-caller
code:

```
Pattern check: no GoF pattern (-) — rejected — <reason ≥20 chars>.
```

**Only when a pattern genuinely applies** (Tier 0 names from §7 are valid):

```
Pattern check: <PatternName> (Tier <N>) — applied — <reason ≥20 chars>.
Pattern check: <PatternName> (Tier <N>) — extended — <cite existing project class>.
```

- `<decision>` is one of `applied` (new pattern instance), `extended` (extends
  existing project pattern family per
  `.claude/design-patterns-project-usage.md`), `rejected` (anti-overuse:
  inline code is correct here), or `refactor-suggest` (see
  `references/hook-protocol.md`).
- `<reason>` must be ≥ 20 chars. The hook rejects one-word reasons such as
  "bug fix" or "cleanup".
- The legacy form `Pattern check: <Name> (Tier N) — <reason>` still works.
  Prefer the structured form above: it enables aggregation and typo catching.

No silent class creation. No silent interface design. Always declare intent.

---

## 2. Multi-language coverage

The enforcement hooks detect substantive symbols in **TypeScript, Python,
Java, C#, Go, C++, and Rust**. The *Pattern check* line is identical across
languages. Only the trigger syntax and the skip-comment token differ:

| Language   | "New type" trigger                                          | Skip token |
|------------|------------------------------------------------------------|------------|
| TypeScript | class / interface / abstract / exported fn or arrow-const  | `//`       |
| Python     | class / Protocol·ABC / `@abstractmethod` / top-level `def` | `#`        |
| Java       | class / interface / record / enum / abstract               | `//`       |
| C#         | class / interface / record / struct / abstract             | `//`       |
| Go         | `type … struct` / `type … interface` / exported `func`     | `//`       |
| C++        | class / struct / pure-virtual (`… = 0;`)                    | `//`       |
| Rust       | struct / enum / trait / `pub fn`                            | `//`       |

Each pattern's `references/<slug>.md` has the canonical example in every
supported language, plus a *Lighter idiomatic forms* table. Read the block
for the language you are editing. Adding a language takes one entry in
`hooks/_languages.js`.

**Bypass** for mechanical codemods and bulk renames: add
`// pattern-check: skip <reason>` (or `# pattern-check: skip <reason>` in
Python) to the file payload. It does not replace the preamble on
substantive edits.

---

## 3. Anti-overuse rule (READ FIRST — overrides everything below)

**Most edits answer `Pattern check: no GoF pattern — rejected — <reason>`.
That is the right default.** The hook fires on every substantive edit because
*the decision* is required, not because a pattern is.

Patterns and SOLID exist to reduce complexity, not add it. Do NOT:

- add a pattern to code under 50 lines with one caller. Write it inline.
- build for one concrete type with no realistic second. Call `new` (YAGNI).
- use a pattern that adds more files than it saves (e.g. Visitor for 2 classes).
- fork what the codebase already solves differently. Extend it.
- restructure in a bug fix whose fix doesn't need it. Fix inline.
- create an interface with one implementation and no concrete reason (a
  real boundary, a second implementation that exists, a test seam you cannot
  get otherwise).
- create a wrapper class that only delegates.
- make everything a `Service` / `Manager` / `Helper`.
- introduce a factory for trivial construction.
- abstract for hypothetical future requirements.
- split five lines of coherent logic into five files.
- apply a pattern ceremonially, to show it was considered.

This rule overrides "always pick a Tier 1 pattern". Project ethos: three
similar lines of code beat a premature abstraction.

When the rule applies, emit:

```
Pattern check: no GoF pattern (-) — rejected — <specific reason, ≥20 chars>.
```

The reason should explain *why this case is fine inline* (e.g. "single caller,
8 lines, no indication of second implementation" or "bug fix in guard clause,
no structural change"). Vague reasons like "bug fix" are rejected.

---

## 4. Principles

Apply these when they solve an actual design problem. Don't create classes or
interfaces just to satisfy them.

- **Single Responsibility.** One reason to change per module/class. Split
  when two unrelated change requests would touch the same unit.
- **Open/Closed.** When variants keep arriving, make adding one a new entry
  (a map key, a class, a registered handler) instead of an edit to every
  `switch`.
- **Liskov Substitution.** A subtype must work wherever its base does. No
  `throw NotSupported` overrides, no narrowed preconditions.
- **Interface Segregation.** Small, role-shaped interfaces owned by the
  caller, not one wide interface every implementer half-fills.
- **Dependency Inversion / Injection.** Inject what varies or does I/O (DB,
  HTTP, clock, randomness, filesystem, env). Don't inject pure helpers or
  value objects. See `references/extras.md` → Dependency Injection.
- **Composition over inheritance.** Use `extends` only for a true is-a with
  shared invariants. Reuse behavior by holding a collaborator (Strategy,
  Decorator), not by subclassing.
- **Domain separate from infrastructure.** Business rules don't build SQL,
  parse HTTP, or read env vars. Put those behind a boundary (Repository,
  Adapter) at the edge.
- **Testability.** If a unit test needs a real DB, network, or clock, a
  dependency is hard-wired. Inject it at the seam. Don't mock internals.

---

## 5. Control-flow rules (every edit)

Full rules, before/after code in all seven languages, and ORM-specific N+1
fixes are in `references/control-flow.md`. The smell detector checks these on
the lines each edit touches.

| # | Rule | Smell id |
|---|---|---|
| R1 | **No nested `if`.** Invert and exit early (guard clause), merge conditions, use `else if`, or extract a function. | `nested-if` |
| R2 | **Max control-flow depth 2** (if / loop / switch / try) inside a function. Depth 3 means extract. | `deep-nesting` |
| R3 | **No `else` after `return` / `throw` / `raise` / `continue` / `break`.** Drop the `else` and dedent. | `else-after-return` |
| R4 | **N+1 branches.** A conditional that selects behavior climbs a ladder: ≤ 2 branches `if`/`else` → 3rd branch: **dispatch map** (or exhaustive `match` on a closed enum) → branches need multiple operations or state: **Strategy / State**. The same discriminator compared at a 3rd site: centralize it. Refactor *before* adding branch N+1. | `conditional-ladder`, `scattered-discriminator` |
| R5 | **N+1 queries.** No DB / HTTP call per loop item. Batch (`IN`, bulk endpoint), eager-load relations, use a DataLoader, or run independent awaits concurrently. | `n-plus-one` |

Compound conditions with more than 2 terms go into a named predicate
(`isEligible(user)`). Repeated null checks call for optional chaining,
`Option`, or a Null Object.

Before adding an `if` / `else if` / `switch` branch, ask:

1. Does each branch represent a different *behavior*?
2. Will more variants likely be added?
3. Is the same condition checked elsewhere?
4. Would a dispatch map, polymorphic type, State, or Command make it clearer?

Any "yes" → move up the R4 ladder instead of adding the branch.

---

## 6. How to use this skill

1. Read this SKILL.md when starting design or coding work.
2. Apply §5 to the code you are about to write, whatever the pattern answer.
3. Apply the anti-overuse rule (§3). If it triggers, stop here and emit `rejected`.
4. Pick a candidate: Tier 0 (§7) first, then the decision tree (§9).
5. Read `references/<slug>.md` for the chosen pattern (intent, lighter forms,
   code, "Don't use when"). Cross-check `.claude/design-patterns-project-usage.md`.
6. Emit the *Pattern check* line (§1).
7. Write the code. Name the pattern in a code comment only when it isn't obvious.

---

## 7. Pattern selection

### Tiers

- **Tier 0: language-native and non-GoF** (`references/extras.md`,
  `references/control-flow.md`): Guard Clause, Dispatch Map, Null Object,
  Result type, Repository, Specification, Pipeline / Middleware, Dependency
  Injection. Also the *Lighter idiomatic forms* row of any GoF pattern
  (pass a function instead of a Strategy class, a generator instead of an
  Iterator class, a closed enum + `match` instead of a Visitor).
- **Tier 1: 3-star GoF.** Factory Method, Abstract Factory, Builder,
  Adapter, Facade, Strategy, Observer, Iterator, Template Method, and
  Singleton, which is well known but **rejected by default**: prefer DI, a
  module-level instance, or a container scope.
- **Tier 2** only when no Tier 1 fits (5 patterns).
- **Tier 3** needs explicit justification in the *Pattern check* reason (7 patterns).

### Default answer: `no GoF pattern`

Before running the decision tree, ask these three questions in order:

1. **Is this a bug fix that does not restructure logic?** → `no GoF pattern`
2. **Is the change < 50 lines with a single caller?** → `no GoF pattern`
3. **Does the project codebase already solve this elsewhere** (per
   `.claude/design-patterns-project-usage.md`)? → **extend** the existing
   pattern with `decision: extended` and cite the class.

If all three are "no", continue to §9.

### The three line thresholds (they are different things)

| Threshold | Owner | Meaning |
|---|---|---|
| `smallEditThreshold` (10) | hook | Edits under 10 changed lines with no new exported symbol **skip** the check entirely. |
| `diffLineThreshold` (40) | hook | Diffs over 40 lines (or any new class / interface / exported fn) **require** a *Pattern check* line. |
| < 50 lines, one caller | you | Judgement rule: such code **answers** `rejected`. The line is still required when the hook fires. |

---

## 8. Hook preflight (PATTERN-CONTEXT)

When a `PATTERN-CONTEXT:` block appears in hook output, read
`references/hook-protocol.md` before emitting the *Pattern check* line.
Summary:

- **Mode A** (advisory): Read 1–3 hinted sibling paths, then cite one
  (`applied` / `extended`), or say `scanned N siblings, no family match` to
  reject.
- **Mode B** (already-in-family): no Read needed. Emit `extended — continuing
  <family> via <path>`.
- **Mode C** (family-health degraded): if the family is misapplied, emit
  `refactor-suggest` as `<Current>→<Better>` with a reason ≥ 40 chars citing
  a real path.

§3 still dominates: the preflight gives you information, the judgement stays
yours.

---

## 9. Decision tree

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

## 10. Quick decision table

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

## 11. Full catalog

| Tier  | Pattern                 | Category   | Pop | Reference                                                                      |
|-------|-------------------------|------------|-----|--------------------------------------------------------------------------------|
| **0** | Control-flow rules      | Rules      | –   | [references/control-flow.md](references/control-flow.md)                       |
| **0** | Null Object, Result, Repository, Specification, Middleware, DI | Non-GoF | – | [references/extras.md](references/extras.md) |
| **1** | Factory Method          | Creational | 3   | [references/factory-method.md](references/factory-method.md)                   |
| **1** | Abstract Factory        | Creational | 3   | [references/abstract-factory.md](references/abstract-factory.md)               |
| **1** | Builder                 | Creational | 3   | [references/builder.md](references/builder.md)                                 |
| **1** | Singleton (default: reject) | Creational | 3 | [references/singleton.md](references/singleton.md)                           |
| **1** | Adapter                 | Structural | 3   | [references/adapter.md](references/adapter.md)                                 |
| **1** | Facade                  | Structural | 3   | [references/facade.md](references/facade.md)                                   |
| **1** | Strategy                | Behavioral | 3   | [references/strategy.md](references/strategy.md)                               |
| **1** | Observer                | Behavioral | 3   | [references/observer.md](references/observer.md)                               |
| **1** | Iterator                | Behavioral | 3   | [references/iterator.md](references/iterator.md)                               |
| **1** | Template Method         | Behavioral | 3   | [references/template-method.md](references/template-method.md)                 |
| **2** | Decorator               | Structural | 2   | [references/decorator.md](references/decorator.md)                             |
| **2** | Composite               | Structural | 2   | [references/composite.md](references/composite.md)                             |
| **2** | Command                 | Behavioral | 2   | [references/command.md](references/command.md)                                 |
| **2** | State                   | Behavioral | 2   | [references/state.md](references/state.md)                                     |
| **2** | Chain of Responsibility | Behavioral | 2   | [references/chain-of-responsibility.md](references/chain-of-responsibility.md) |
| **3** | Prototype               | Creational | 1   | [references/prototype.md](references/prototype.md)                             |
| **3** | Proxy                   | Structural | 1   | [references/proxy.md](references/proxy.md)                                     |
| **3** | Bridge                  | Structural | 1   | [references/bridge.md](references/bridge.md)                                   |
| **3** | Flyweight               | Structural | 1   | [references/flyweight.md](references/flyweight.md)                             |
| **3** | Mediator                | Behavioral | 1   | [references/mediator.md](references/mediator.md)                               |
| **3** | Memento                 | Behavioral | 1   | [references/memento.md](references/memento.md)                                 |
| **3** | Visitor                 | Behavioral | 1   | [references/visitor.md](references/visitor.md)                                 |

Hook-only material: [references/hook-protocol.md](references/hook-protocol.md).

---

## 12. Common pattern combinations

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

## 13. Anti-patterns to avoid (companion catalog)

- **Arrow code**: nested `if` pyramids, so the happy path drifts right →
  guard clauses (§5 R1–R3)
- **N+1 queries**: one query per loop item → batch / eager load (§5 R5)
- **Shotgun conditionals**: the same `status ==` check in many places →
  centralize via map / State / polymorphism (§5 R4)
- **God Object / God Class**: a class doing >5 unrelated things → split by responsibility
- **Anemic Domain Model**: data class with no behavior plus a service class
  holding all its rules → move invariants and rules onto the type that owns the data
- **Singleton abuse**: Singleton for state-passing convenience → use DI / context / a store slice
- **Pattern soup**: stacking 3+ patterns to do one job (Adapter+Decorator+Strategy where Adapter alone fits)
- **Premature Factory**: Factory for one concrete type → just call `new`
- **Stringly-typed dispatch**: `if (type === 'foo')` chains → enum + dispatch map, Strategy, or polymorphism
- **Inheritance-for-reuse**: `extends` to grab methods → composition / Strategy / Decorator
- **Speculative interface**: interface with one implementation and no boundary → use the concrete class

---

## 14. Plan workflow integration

When the planning workflow runs (Plan agent, ExitPlanMode plans, design discussions):

- **Every new abstraction in the plan must name its pattern by reference**
  (Tier 0 names count)
- The plan file must contain at least one *Pattern check:* line per new class/interface
- The plan must justify each Tier 2 or Tier 3 choice in one line
- Plans touching data access must say how lists of related records are
  loaded (batch / eager), not just "fetch X for each Y"

Plans without *Pattern check:* lines for new abstractions are incomplete.

---

## 15. Memory non-pollution rule

This skill's content lives in this skill, NOT in any user memory system. Do
not save pattern definitions, examples, or star ratings to memory. Memory is
for user preferences and project state, not catalogs.

If you find an existing memory entry that duplicates this skill's content,
delete it.
