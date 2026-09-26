# Design patterns — project usage

Drop this file into `.claude/design-patterns-project-usage.md` of any
project where Pattern Check (Rule 0) is enforced.

The Rule 0 hooks reference this file in their guidance text. The file's
job is to be **the project's authoritative answer** to:

- "Does this project already solve this with an existing pattern family?"
- "If I write a new `*Factory` / `*Adapter` / `*Strategy`, what should it
  extend or plug into?"
- "What are this project's conventions for dispatch maps, repositories and
  errors, and where are the rules deliberately relaxed?"

Without project-specific entries, the section below stays as a template.
The hooks still work — they just can't suggest "extend X" hints.

---

## Existing project usage

> Update this section as the project's pattern catalog stabilises. Each
> entry should answer: which family lives here, where, and how to extend it.

### Strategy (e.g. renderer / formatter)

- **Where:** `<src/path/...>`
- **Base / interface:** `<ClassName>` in `<src/path/...>`
- **How to extend:** add a new concrete `<ClassName>Impl` in the same dir
  and register via `<RegistryName>`.
- **Don't fork:** prefer extending over creating a parallel hierarchy.

### Adapter (e.g. third-party SDK boundary)

- **Where:** `<src/path/adapters/...>`
- **Base / interface:** `<PortName>` in `<src/path/...>`
- **Guarded path:** `<src/path/...>` may not import `<vendor-package>`
  directly. Route through the adapter.

### Factory Method / Abstract Factory

- **Where:** `<src/path/factories/...>`
- **Discriminator:** `<field name>` of `<DiscriminatedUnion>`
- **How to extend:** add a new case + concrete in the union and the
  factory's switch — both at once.

### Facade

- **Where:** `<src/path/...>`
- **Surface:** `<FacadeName>` exposes `<list of operations>`. Keep it
  narrow — if you find yourself adding methods #9+, split by responsibility.

### Observer / Subject

- **Where:** `<src/path/events/...>`
- **Implementation:** `<EventEmitter or Subject library>`. Prefer this
  over hand-rolling `addListener` / `emit` clusters.

---

## Tier 0 conventions

> Tier 0 (guard clauses, dispatch maps, Null Object, Result types,
> Repository, DI) is tried before any GoF pattern, so projects need
> conventions for it too. Fill these in so every agent writes them the same way.

### Dispatch maps

- **Where handler maps live:** `<src/path/...>` (one map per discriminator,
  next to the type that defines the keys)
- **Key type:** closed enum / union `<KindName>` — adding a key must be a
  compile error until every map handles it (`satisfies Record<Kind, …>`,
  exhaustive `match`, …)
- **Missing key:** `<throw UnknownKindError | fall back to X>`

### Repositories / data access

- **Where:** `<src/path/repositories/...>`, one per aggregate
- **Batch reads are mandatory:** every `byId(id)` has a `byIds(ids)`
  sibling — loops call the batch method (control-flow.md R5)
- **Eager loading:** relations needed by list views are loaded in the list
  query (`<include / select_related / JOIN FETCH convention>`)
- **GraphQL:** field resolvers go through the DataLoaders in `<src/path/loaders/...>`

### Errors

- **Expected failures:** `<Result type / (value, error) / Option>` defined in `<src/path/...>`
- **Wrapping:** errors crossing `<layer>` are wrapped with `<Error type / fmt.Errorf("…: %w")>`
- **Logging:** logged once, at `<request handler / job runner>` — not at every layer

---

## Approved exceptions to the rules

> Places where a smell is expected and allowed. Suppress there with a reason
> (`// pattern-smell: ignore <smell-id> — <reason>`), or exclude the path in
> `pattern-check.config.json` → `perPathRules`.

| Path / pattern | Smell | Why it's fine |
|---|---|---|
| `<src/clients/*-paginator.ts>` | `n-plus-one`, `await-in-loop` | cursor pagination: each page needs the previous cursor |
| `<migrations/**>` | `long-function` | generated, never edited by hand |
| `<src/parsers/**>` | `complexity` | table-driven parser; branches mirror the grammar |

## Smell severity policy

> Which smells this project *blocks* (pattern-smell-gate.js rejects the
> write) vs only *advises*. Mirror this in `pattern-check.config.json` →
> `smells.severity`.

| Smell | Severity | Reason |
|---|---|---|
| `n-plus-one` | `<block / advise>` | |
| `nested-if` | `<block / advise>` | |
| `swallowed-exception` | `<block / advise>` | |

---

## Anti-patterns specific to this project

> Document patterns the project has explicitly chosen NOT to use, and why.
> Listing them in `forbiddenPatterns` of `pattern-check.config.json` will
> make `Pattern check: <Name> — applied` blocked at the hook level.

- (none yet)

---

## How to add a new entry

When introducing a new family for the first time:

1. Land the first concrete instance.
2. Update this file with a `### <Pattern>` section.
3. (Optional) add `pattern-check.config.json` →
   `validation.requireCitationOnExtended: true` so future siblings must
   cite the base path.
