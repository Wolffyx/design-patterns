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

1. **Control flow and functions** (§5, §6): flat, small functions, guard
   clauses, no N+1s, no swallowed errors. Applies to every edit.
2. **Tier 0** (§8): what the language already gives you, like a function,
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

**Only when a pattern genuinely applies** (Tier 0 names from §8 are valid):

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

Examples:

```
Pattern check: no GoF pattern (-) — rejected — bug fix in date parsing guard, 6 lines, no structural change.
Pattern check: Dispatch Map (Tier 0) — applied — 4th payment provider; replaced if/else ladder on provider with a handler map.
Pattern check: Repository (Tier 0) — extended — OrderRepository mirrors src/<feature>/user-repository.ts, adds byIds() batch read.
Pattern check: Strategy (Tier 1) — applied — 3 pricing rules with config + 2 operations each; map of functions got too wide.
Pattern check: Facade→Facade+Strategy (Tier 1) — refactor-suggest — 12-method facade; split per action via src/<feature>/dispatcher.ts.
```

No silent class creation. No silent interface design. Always declare intent.

---

## 2. Multi-language coverage

The hooks enforce this on **TypeScript, Python, Java, C#, Go, C++, and
Rust**. The *Pattern check* line is the same in every language. Each
`references/<slug>.md` has code for all seven plus a *Lighter idiomatic
forms* table — read the block for the language you are editing. What counts
as "substantive" per language: `references/hook-protocol.md`.

**Bypass** for mechanical codemods and bulk renames: add
`// pattern-check: skip <reason>` (`#` in Python) to the file payload. It
does not replace the preamble on substantive edits.

---

## 3. Anti-overuse rule (READ FIRST — overrides pattern selection, not §5–§6)

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

**Scope: GoF patterns only.** §3 decides whether to add a GoF pattern
(Tier 1–3). It never exempts code from the control-flow and function rules
(§5, §6) or the Tier 0 forms they call for, whatever the size of the code or
the number of callers. A chain that reaches three branches on one key gets a
dispatch map even in an 8-line function with one caller, and the line reads
`Pattern check: Dispatch Map (Tier 0) — applied — …`, not
`no GoF pattern — rejected`.

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
fixes are in `references/control-flow.md`.

| # | Rule | Smell id |
|---|---|---|
| R1 | **No nested `if`.** Invert and exit early (guard clause), merge conditions, use `else if`, or extract a function. | `nested-if` |
| R2 | **Max control-flow depth 2** (if / loop / switch / try) inside a function. Depth 3 means extract. | `deep-nesting` |
| R3 | **No `else` after `return` / `throw` / `raise` / `continue` / `break`.** Drop the `else` and dedent. | `else-after-return` |
| R4 | **N+1 branches.** A conditional that selects behavior climbs a ladder: ≤ 2 branches `if`/`else` → 3rd branch: **dispatch map** (or exhaustive `match` on a closed enum) → branches need multiple operations or state: **Strategy / State**. The same discriminator compared at a 3rd site: centralize it. Refactor *before* adding branch N+1, in the same change, even when the request only asks for the new variant; never add the branch and offer the refactor as a follow-up. Different call signatures per branch are no exception: each map entry adapts its own call. | `conditional-ladder`, `scattered-discriminator` |
| R5 | **N+1 queries.** Never one round-trip per item. A call that depends on the loop item → batch it (`IN` / `= ANY` / bulk endpoint) and join in memory; a call that doesn't → hoist it above the loop; a relation read per row → eager-load it; a write per item → bulk write; a GraphQL field resolver → DataLoader. `Promise.all` over N calls is still N round-trips. Sequential awaits in a loop are fine only when each step needs the previous one (pagination). | `n-plus-one`, `await-in-loop` |

Compound conditions with more than 2 terms go into a named predicate
(`isEligible(user)`). Repeated null checks call for optional chaining,
`Option`, or a Null Object.

Before adding an `if` / `else if` / `switch` branch, ask:

1. Does each branch represent a different *behavior*?
2. Will more variants likely be added?
3. Is the same condition checked elsewhere?
4. Would a dispatch map, polymorphic type, State, or Command make it clearer?

Any "yes" → move up the R4 ladder instead of adding the branch.

Before writing a loop that touches a database or an API, ask: *how many
round-trips does this make for 1 000 items?* If the answer is 1 000, restructure first.

---

## 6. Function and error rules (every edit)

Details and examples in `references/functions.md`.

| Rule | Smell id |
|---|---|
| A function does one thing at one level of abstraction; ≤ ~50 lines of body. | `long-function` |
| ≤ 4 parameters. More → a parameter / options object, or split the function. Constructors with ≥ 5 → Builder / options / named args. | `long-param-list`, `long-constructor` |
| No boolean flag parameters that switch behavior (`render(x, true)`) → two intention-revealing functions, or an enum. Setters (`setVisible(bool)`) are fine. | `boolean-flag-param` |
| Cyclomatic complexity ≤ 10 per function → guard clauses, extract, dispatch map. | `complexity` |
| Commands change state, queries return data — not both (command/query separation). | — |
| Never swallow an error: handle it, log it with context, or rethrow / wrap it at the boundary. Ignoring on purpose needs a comment saying why. | `swallowed-exception` |
| Expected failures that callers branch on → a Result / `(value, error)` / `Option` return; truly exceptional ones → exceptions. Follow the language's idiom. | — |

---

## 7. How to use this skill

1. Read this SKILL.md when starting design or coding work.
2. Apply §5 and §6 to the code you are about to write, whatever the pattern answer.
3. Apply the anti-overuse rule (§3) to the GoF question. If it triggers, emit `rejected`
   and skip steps 4–5; the §5 and §6 rules from step 2 still apply.
4. Pick a candidate: Tier 0 first, then the decision tree in `references/catalog.md`.
5. Read `references/<slug>.md` for the chosen pattern (intent, lighter forms,
   code, "Don't use when"). Cross-check `.claude/design-patterns-project-usage.md`.
6. Emit the *Pattern check* line (§1).
7. Write the code. Name the pattern in a code comment only when it isn't obvious.

---

## 8. Pattern selection

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
- **Tier 2** only when no Tier 1 fits: Decorator, Composite, Command, State,
  Chain of Responsibility.
- **Tier 3** needs explicit justification in the *Pattern check* reason:
  Prototype, Proxy, Bridge, Flyweight, Mediator, Memento, Visitor.

Decision tree, quick-lookup table, the full catalog with reference links,
common combinations and anti-patterns: **`references/catalog.md`**.

### Default answer: `no GoF pattern`

Before running the decision tree, ask these three questions in order:

1. **Is this a bug fix that does not restructure logic?** → `no GoF pattern`
2. **Is the change < 50 lines with a single caller?** → `no GoF pattern`
3. **Does the project codebase already solve this elsewhere** (per
   `.claude/design-patterns-project-usage.md`)? → **extend** the existing
   pattern with `decision: extended` and cite the class.

If all three are "no", continue to the decision tree.

The hook thresholds (`smallEditThreshold`, `diffLineThreshold`) and how
they differ from the 50-line judgement rule: `references/hook-protocol.md`.

---

## 9. Hook output you will see

**`PATTERN-CONTEXT:` block** (before the write). Read
`references/hook-protocol.md` before emitting the *Pattern check* line.

- **Mode A** (advisory): Read 1–3 hinted sibling paths, then cite one
  (`applied` / `extended`), or say `scanned N siblings, no family match` to
  reject.
- **Mode B** (already-in-family): no Read needed. Emit `extended — continuing
  <family> via <path>`.
- **Mode C** (family-health degraded): if the family is misapplied, emit
  `refactor-suggest` as `<Current>→<Better>` with a reason ≥ 40 chars citing
  a real path.

**`[pattern-smell]` lines** (after the write, advisory). They cover only the
lines your edit touched. An N+1 finding may point into another file
(`does .findUnique(, src/user-store.ts:3`): add a batch method along that
chain and call it once, before the loop. Fix the smell in the same change when it is yours
to fix. When it is intentional, add `// pattern-smell: ignore <smell-id>`
(`#` in Python) with a reason on the line or the line above. Don't
suppress to make the message go away.

**`BLOCKED by smell gate`** (before the write). The project configured that
smell as `block`. Rewrite the code (the message links the guide) and retry.

§3 still dominates: the hooks give you information, the judgement stays yours.

---

## 10. Plan workflow integration

When the planning workflow runs (Plan agent, ExitPlanMode plans, design discussions):

- **Every new abstraction in the plan must name its pattern by reference**
  (Tier 0 names count)
- The plan file must contain at least one *Pattern check:* line per new class/interface
- The plan must justify each Tier 2 or Tier 3 choice in one line
- Plans touching data access must say how lists of related records are
  loaded (batch / eager), not just "fetch X for each Y"

Plans without *Pattern check:* lines for new abstractions are incomplete.

---

## 11. Memory non-pollution rule

This skill's content lives in this skill, NOT in any user memory system. Do
not save pattern definitions, examples, or star ratings to memory. Memory is
for user preferences and project state, not catalogs.

If you find an existing memory entry that duplicates this skill's content,
delete it.
