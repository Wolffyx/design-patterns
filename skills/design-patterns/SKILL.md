---
name: design-patterns
description: >
  Always-on GoF design pattern catalog (Gang of Four, refactoring.guru). Use
  for: new class, new interface, new abstract class, refactor, refactoring,
  abstraction, architecture, design review, code review, planning, feature
  design, system design, architectural decision, architectural trade-off,
  OOP design, inheritance, composition, polymorphism, SOLID, design pattern,
  pattern check, factory, factory method, abstract factory, builder,
  prototype, singleton, adapter, bridge, composite, decorator, facade,
  flyweight, proxy, chain of responsibility, command, iterator, mediator,
  memento, observer, state, strategy, template method, visitor, creational,
  structural, behavioral, python, java, c#, csharp, go, golang, c++, cpp, rust.
  Enforced on TypeScript, Python, Java, C#, Go, C++, and Rust source files.
  Sourced from refactoring.guru. Tier 1 (3-star) must be considered first:
  Factory Method, Abstract Factory, Builder, Singleton, Adapter, Facade,
  Strategy, Observer, Iterator, Template Method. Per-pattern references with
  code in TypeScript, Python, Java, C#, Go, C++, and Rust in references/.
---

# Design Patterns Skill

Canonical GoF catalog. 22 patterns, 3 tiers by popularity. Every Write/Edit
on a source file — TypeScript, Python, Java, C#, Go, C++, or Rust — with
substantive new logic must trigger a *Pattern check* — **even bug fixes, new
functions, and refactors that don't declare a class**. Most answer `no GoF
pattern — rejected`; that is correct.

---

## 1. Required output format (DO THIS EVERY TIME)

**Default form** — emit this for most bug fixes, small edits, and
single-caller code:

```
Pattern check: no GoF pattern (-) — rejected — <reason ≥20 chars>.
```

**Only when a pattern genuinely applies:**

```
Pattern check: <PatternName> (Tier <N>) — applied — <reason ≥20 chars>.
Pattern check: <PatternName> (Tier <N>) — extended — <cite existing project class>.
```

- `<decision>` is one of `applied` (new pattern instance), `extended` (extends
  existing project pattern family per
  `.claude/design-patterns-project-usage.md`), or `rejected` (anti-overuse —
  inline code is correct here).
- `<reason>` must be ≥ 20 chars. One-word reasons ("bug fix", "cleanup") are
  rejected by the hook.
- Legacy form `Pattern check: <Name> (Tier N) — <reason>` still works but the
  structured form above is preferred (enables aggregation and typo catching).

No silent class creation. No silent interface design. Always declare intent.

---

## 1.5 Multi-language coverage

The enforcement hooks detect substantive symbols in **TypeScript, Python,
Java, C#, Go, C++, and Rust**. The *Pattern check* line is identical across
languages; only the trigger syntax and the skip-comment token differ:

| Language   | "New type" trigger                                          | Skip token |
|------------|------------------------------------------------------------|------------|
| TypeScript | class / interface / abstract / exported fn or arrow-const  | `//`       |
| Python     | class / Protocol·ABC / `@abstractmethod` / top-level `def` | `#`        |
| Java       | class / interface / record / enum / abstract               | `//`       |
| C#         | class / interface / record / struct / abstract             | `//`       |
| Go         | `type … struct` / `type … interface` / exported `func`     | `//`       |
| C++        | class / struct / pure-virtual (`… = 0;`)                    | `//`       |
| Rust       | struct / enum / trait / `pub fn`                            | `//`       |

Each pattern's `references/<slug>.md` carries the canonical example in every
supported language — read the block for the language you are editing. Adding a
language is one entry in `hooks/_languages.js`.

**Bypass** for mechanical codemods / bulk renames: add
`// pattern-check: skip <reason>` (or `# pattern-check: skip <reason>` in
Python) to the file payload — not a replacement for the preamble on
substantive edits.

---

## 2. Anti-overuse rule (READ FIRST — overrides everything below)

**Most edits answer `Pattern check: no GoF pattern — rejected — <reason>`. That
is the right default.** The enforcement hook fires on every substantive edit,
but firing ≠ a pattern is required. It means *the decision* is required.

Patterns are tools, not goals. Do NOT introduce a pattern when:

- Code is <50 lines and has one caller → write inline
- Only one concrete type, no realistic second on the horizon → just `new` (YAGNI)
- Pattern adds more files than it saves (e.g. Visitor for 2 classes) → skip
- The codebase already solves this differently → extend, don't fork
- The change is a bug fix and the fix doesn't restructure anything → inline

This rule overrides "always pick a Tier 1 pattern". Project ethos: three
similar lines of code beats a premature abstraction.

When the rule applies, emit:

```
Pattern check: no GoF pattern (-) — rejected — <specific reason, ≥20 chars>.
```

The reason should explain *why this case is fine inline* (e.g. "single caller,
8 lines, no indication of second implementation" or "bug fix in guard clause,
no structural change"). Vague reasons like "bug fix" are rejected.

---

## 3. How to use this skill

1. Read this SKILL.md whenever starting design/coding work
2. Run the decision tree in §5 to pick a candidate
3. Apply the anti-overuse rule (§2). If it triggers, stop here
4. Read `references/<slug>.md` for the chosen pattern (full intent, code, "Don't use when"). Cross-check project-specific guidance in `.claude/design-patterns-project-usage.md`
5. Emit the *Pattern check* line (§1)
6. Write the code, citing the pattern in code comments only when the pattern is non-obvious

---

## 4. Pattern selection rule

- **Try Tier 1 first** (10 patterns, 3 stars — well-known, high-leverage)
- **Drop to Tier 2** only when no Tier 1 fits (5 patterns)
- **Tier 3** needs explicit justification in the *Pattern check* reason (7 patterns)

---

## 4.5 Default answer: `no GoF pattern`

Before running the full decision tree, ask these three questions in order:

1. **Is this a bug fix that does not restructure logic?** → `no GoF pattern`
2. **Is the change < 50 lines with a single caller?** → `no GoF pattern`
3. **Does the project codebase already solve this elsewhere** (per
   `.claude/design-patterns-project-usage.md`)? → **extend** existing pattern;
   use `decision: extended` and cite the class.

If all three are "no", continue to §5.

---

## 4.6 Cross-file preflight (when PATTERN-CONTEXT appears)

The `pattern-context-prep.js` PreToolUse hook runs before the blocking
preamble validator. On substantive edits it emits a `PATTERN-CONTEXT:`
stderr block with candidate sibling paths, the matching project pattern
family, recent decisions on this file, and imports already present. Three
modes — the agent's response rules depend on which mode fired:

### Mode A — full preflight

```
PATTERN-CONTEXT: advisory — read 1–3 siblings before Pattern check
  triggered-by: new class, diff 62 lines
  family-hint: src/<feature>/base.ts (Adapter + Strategy — example family)
  siblings:
    - src/<feature>/base.ts
    - src/<feature>/impl-a.ts
  recent-decisions-on-file:
    - 2026-04-18 extended Adapter — "impl-b.ts mirrors impl-a.ts shape"
  imports-in-payload:
    - ../<feature>/base (looks like family extension)
  action: Read 1–3 of the listed paths, then emit Pattern check citing one.
END-PATTERN-CONTEXT
```

**Rule 1**: agent MUST Read 1–3 hinted paths (family-hint first, then
siblings) before emitting `Pattern check:`. The preamble must either:

- cite one of those paths in the reason (→ `applied` or `extended`), OR
- explicitly say `scanned N siblings, no family match` plus an
  anti-extended phrase (`isolated`, `no-siblings`, `unrelated domain`) to
  justify `rejected`.

### Mode B — already-in-family short-circuit

```
PATTERN-CONTEXT: already-in-family
  family: Adapter + Strategy (example family) — via src/<feature>/base.ts
  last-extend: 2026-04-18 — impl-a.ts shape
  note: no re-read required; emit `Pattern check: <pattern> — extended —
        continuing existing integration via <path>`.
END-PATTERN-CONTEXT
```

**Rule 2**: NO sibling Read required. Emit `extended — continuing <family>
via <cached-path>` directly. Saves tokens on routine edits to files already
confirmed in a family. The citation/anti-extended validators are
auto-satisfied by the session cache for this file.

### Mode C — family-health: degraded

Appears as an additional line inside a Mode A block when the decision log
shows ≥3 `refactor-suggest` or `refactor-candidate` entries against the
same family within the last 30 days.

**Rule 3**: after Reading one of the hinted paths, if the existing family
is misapplied or a better pattern fits, emit `refactor-suggest` with
`<CurrentPattern>→<BetterPattern>` and a cited path. The current edit
still proceeds minimally — the suggestion lands in the decision log as an
`open` entry that `/pattern-review --backlog` surfaces.

Required form for `refactor-suggest`:

```
Pattern check: Facade→Facade+Strategy (Tier 1) — refactor-suggest —
  current facade has 12 methods (god-class risk); splitting by action-type
  Strategy keyed on src/<feature>/dispatcher.ts would isolate dispatch.
```

Validator requirements: arrow `→` in pattern name, reason ≥ 40 chars,
cite a real `.ts`/`.tsx` path.

### Worked examples

**Example A (Mode A → extended)**. PATTERN-CONTEXT lists
`src/<feature>/base.ts` + siblings. Agent Reads `base.ts`, sees the
`IPort` interface, emits:

```
Pattern check: Adapter (Tier 1) — extended — new impl-b.ts implements
  IPort from src/<feature>/base.ts; mirrors impl-a.ts shape.
```

**Example B (Mode A → rejected after scan)**. PATTERN-CONTEXT lists three
`*Handler.ts` siblings for a utility file. Agent Reads one, finds no
shared base:

```
Pattern check: no GoF pattern (-) — rejected — scanned 3 siblings, no
  family match; isolated 22-line helper for date parsing.
```

**Example C (Mode B → extended short)**. PATTERN-CONTEXT already-in-family:

```
Pattern check: Adapter (Tier 1) — extended — continuing existing
  integration via src/<feature>/base.ts.
```

**Example D (Mode C → refactor-suggest)**. PATTERN-CONTEXT shows
`family-health: degraded` on a 12-method facade:

```
Pattern check: Facade→Facade+Strategy (Tier 1) — refactor-suggest —
  facade has 12 public methods (god-class); splitting verbs into
  strategies keyed on action via src/<feature>/dispatcher.ts would
  isolate dispatch.
```

### Anti-overuse rule still dominates

§2 overrides this preflight. Do NOT emit `refactor-suggest` for <50-line
single-caller code just because the hook offered siblings. The preflight
gives you information; judgement stays yours.

---

## 5. Decision tree

```
Need to create objects?
  ├─ One concrete type, no swap → just `new`, no pattern
  ├─ Pick concrete type at runtime → Factory Method
  ├─ Families of related types → Abstract Factory
  ├─ Many constructor params / step-by-step build → Builder
  ├─ Exactly one instance globally → Singleton (last resort — usually a registry)
  └─ Cheap clone of an existing instance → Prototype

Need to compose / wrap / bridge structures?
  ├─ Incompatible interfaces → Adapter
  ├─ Hide a complex subsystem → Facade
  ├─ Add behavior without subclass explosion → Decorator
  ├─ Tree of part-whole → Composite
  ├─ Lazy / access control / remote stand-in → Proxy
  ├─ Two independent dimensions of variation → Bridge
  └─ Many small objects sharing intrinsic state → Flyweight

Need objects to communicate?
  ├─ Swap algorithms at runtime → Strategy
  ├─ Notify N listeners on event → Observer
  ├─ Walk a collection without exposing internals → Iterator
  ├─ Algorithm skeleton with overridable steps → Template Method
  ├─ Encapsulate request as object (queue / undo / log) → Command
  ├─ Object behavior depends on internal state → State
  ├─ Pass request through handler chain → Chain of Responsibility
  ├─ Hub coordinating N peer objects → Mediator
  ├─ Snapshot for undo without exposing internals → Memento
  └─ Add operations to a class hierarchy without modifying it → Visitor
```

---

## 6. Quick decision table

| If you need...                            | Use                         |
|-------------------------------------------|-----------------------------|
| Swap algorithms at runtime                | **Strategy**                |
| Wrap an incompatible API                  | **Adapter**                 |
| Hide a complex subsystem                  | **Facade**                  |
| Pick concrete class at runtime            | **Factory Method**          |
| Notify N subscribers on event             | **Observer**                |
| Walk a collection opaquely                | **Iterator**                |
| Algorithm skeleton with overridable steps | **Template Method**         |
| Single global instance                    | **Singleton** (last resort) |
| Build complex object step-by-step         | **Builder**                 |
| Families of related products              | **Abstract Factory**        |
| Encapsulate a request (undo/queue/log)    | **Command**                 |
| State-dependent behavior                  | **State**                   |
| Tree of part-whole, treated uniformly     | **Composite**               |
| Stack runtime behaviors on object         | **Decorator**               |
| Pipeline of handlers                      | **Chain of Responsibility** |

---

## 7. Full 22-pattern catalog

| Tier  | Pattern                 | Category   | Pop | Reference                                                                      |
|-------|-------------------------|------------|-----|--------------------------------------------------------------------------------|
| **1** | Factory Method          | Creational | 3   | [references/factory-method.md](references/factory-method.md)                   |
| **1** | Abstract Factory        | Creational | 3   | [references/abstract-factory.md](references/abstract-factory.md)               |
| **1** | Builder                 | Creational | 3   | [references/builder.md](references/builder.md)                                 |
| **1** | Singleton               | Creational | 3   | [references/singleton.md](references/singleton.md)                             |
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

---

## 8. Common pattern combinations

| Combo                     | Use case                                                          |
|---------------------------|-------------------------------------------------------------------|
| Strategy + Factory Method | Pluggable algorithm where the factory picks the concrete strategy |
| Command + Memento         | Undo/redo                                                         |
| Observer + Mediator       | Event bus where the mediator dispatches to observers              |
| Composite + Iterator      | Tree walking                                                      |
| Facade + Adapter          | Facade hiding multiple Adapters over different backends           |
| State + Strategy          | Strategy for the active behavior, State for switching strategies  |
| Decorator + Strategy      | Stack decorators on top of a base strategy                        |

---

## 9. Anti-patterns to avoid (companion catalog)

- **God Object / God Class** — class doing >5 unrelated things → split by responsibility
- **Anemic Domain Model** — data class with no behavior + service class with all logic → merge them
- **Singleton abuse** — Singleton for state-passing convenience → use DI / Context / store slice
- **Pattern soup** — stacking 3+ patterns to do one job (Adapter+Decorator+Strategy where Adapter alone fits)
- **Premature Factory** — Factory for one concrete type → just call `new`
- **Stringly-typed dispatch** — `if (type === 'foo')` chain → use Strategy or polymorphism
- **Inheritance-for-reuse** — `extends` to grab methods → use composition / Strategy / Decorator

---

## 10. Plan workflow integration

When the planning workflow runs (Plan agent, ExitPlanMode plans, design discussions):

- **Every new abstraction in the plan must name its GoF pattern by reference**
- The plan file must contain at least one *Pattern check:* line per new class/interface
- The plan must justify each Tier 2 or Tier 3 choice in one line

Plans without *Pattern check:* lines for new abstractions are incomplete.

---

## 11. Memory non-pollution rule

This skill's content lives in this skill, NOT in any user memory system. Do
not save pattern definitions, examples, or star ratings to memory. Memory is
for user preferences and project state, not catalogs.

If you find an existing memory entry that duplicates this skill's content,
delete it.
