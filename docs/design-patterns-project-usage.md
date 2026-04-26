# Design patterns — project usage

Drop this file into `.claude/design-patterns-project-usage.md` of any
project where Pattern Check (Rule 0) is enforced.

The Rule 0 hooks reference this file in their guidance text. The file's
job is to be **the project's authoritative answer** to:

- "Does this project already solve this with an existing pattern family?"
- "If I write a new `*Factory` / `*Adapter` / `*Strategy`, what should it
  extend or plug into?"

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
