# Design Patterns — Bundled Catalog

> Generated from `claude-design-patterns` v1.0.0.
> Self-contained markdown — paste into your agent's rules/system-prompt.
> Hooks (Pattern Check enforcement) are Claude Code-only and not included here.

---

# Design Patterns Skill

Canonical GoF catalog. 22 patterns, 3 tiers by popularity. Every Write/Edit
on a `.ts`/`.tsx` source file with substantive new logic must trigger a
*Pattern check* — **even bug fixes, new functions, and refactors that don't
declare a class**. Most answer `no GoF pattern — rejected`; that is correct.

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

**Bypass** for mechanical codemods / bulk renames: add
`// pattern-check: skip <reason>` to the file payload (not a replacement for
the preamble on substantive edits).

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
  family-hint: src/main/adapters/base.ts (Adapter + Strategy — repo backends)
  siblings:
    - src/main/adapters/base.ts
    - src/main/adapters/github.ts
  recent-decisions-on-file:
    - 2026-04-18 extended Adapter — "gitea.ts mirrors github.ts shape"
  imports-in-payload:
    - ../adapters/base (looks like family extension)
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
  family: Adapter + Strategy (repo backends) — via src/main/adapters/base.ts
  last-extend: 2026-04-18 — github.ts shape
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
  Strategy keyed on src/main/services/foo.ts would isolate dispatch.
```

Validator requirements: arrow `→` in pattern name, reason ≥ 40 chars,
cite a real `.ts`/`.tsx` path.

### Worked examples

**Example A (Mode A → extended)**. PATTERN-CONTEXT lists
`src/main/adapters/base.ts` + siblings. Agent Reads `base.ts`, sees the
`IRepoAdapter` interface, emits:

```
Pattern check: Adapter (Tier 1) — extended — new gitea.ts implements
  IRepoAdapter from src/main/adapters/base.ts; mirrors github.ts shape.
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
  integration via src/main/adapters/base.ts.
```

**Example D (Mode C → refactor-suggest)**. PATTERN-CONTEXT shows
`family-health: degraded` on a 12-method facade:

```
Pattern check: Facade→Facade+Strategy (Tier 1) — refactor-suggest —
  worktree-manager has 12 public methods (god-class); splitting
  branch/commit/cleanup into strategies keyed on action via
  src/main/services/git-worktree-manager.ts would isolate dispatch.
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
| **1** | Factory Method          | Creational | 3   | [references/factory-method.md](see "factory-method" section below)                   |
| **1** | Abstract Factory        | Creational | 3   | [references/abstract-factory.md](see "abstract-factory" section below)               |
| **1** | Builder                 | Creational | 3   | [references/builder.md](see "builder" section below)                                 |
| **1** | Singleton               | Creational | 3   | [references/singleton.md](see "singleton" section below)                             |
| **1** | Adapter                 | Structural | 3   | [references/adapter.md](see "adapter" section below)                                 |
| **1** | Facade                  | Structural | 3   | [references/facade.md](see "facade" section below)                                   |
| **1** | Strategy                | Behavioral | 3   | [references/strategy.md](see "strategy" section below)                               |
| **1** | Observer                | Behavioral | 3   | [references/observer.md](see "observer" section below)                               |
| **1** | Iterator                | Behavioral | 3   | [references/iterator.md](see "iterator" section below)                               |
| **1** | Template Method         | Behavioral | 3   | [references/template-method.md](see "template-method" section below)                 |
| **2** | Decorator               | Structural | 2   | [references/decorator.md](see "decorator" section below)                             |
| **2** | Composite               | Structural | 2   | [references/composite.md](see "composite" section below)                             |
| **2** | Command                 | Behavioral | 2   | [references/command.md](see "command" section below)                                 |
| **2** | State                   | Behavioral | 2   | [references/state.md](see "state" section below)                                     |
| **2** | Chain of Responsibility | Behavioral | 2   | [references/chain-of-responsibility.md](see "chain-of-responsibility" section below) |
| **3** | Prototype               | Creational | 1   | [references/prototype.md](see "prototype" section below)                             |
| **3** | Proxy                   | Structural | 1   | [references/proxy.md](see "proxy" section below)                                     |
| **3** | Bridge                  | Structural | 1   | [references/bridge.md](see "bridge" section below)                                   |
| **3** | Flyweight               | Structural | 1   | [references/flyweight.md](see "flyweight" section below)                             |
| **3** | Mediator                | Behavioral | 1   | [references/mediator.md](see "mediator" section below)                               |
| **3** | Memento                 | Behavioral | 1   | [references/memento.md](see "memento" section below)                                 |
| **3** | Visitor                 | Behavioral | 1   | [references/visitor.md](see "visitor" section below)                                 |

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

---

<a id="abstract-factory"></a>

# Abstract Factory

## Intent

Abstract Factory is a creational design pattern that lets you produce families of related objects without specifying
their concrete classes. It enables creation of compatible product sets while decoupling client code from concrete
implementations.

## Applicability

- Your code must work with multiple families of related products but shouldn't depend on their concrete classes
- You want to ensure that created products from the same family work together properly
- You need to allow future extensibility without modifying existing client code
- A class has numerous Factory Methods that obscure its primary responsibility

## Pros

- Guarantees compatibility among products created from the same factory
- Eliminates tight coupling between concrete products and client code
- Centralizes product creation logic, improving maintainability
- Supports the Open/Closed Principle by enabling new product variants without breaking existing code

## Cons

- Introduces significant complexity through additional interfaces and classes
- May be unnecessarily complicated for simple scenarios with few product families

## Don't use when

- You only need to create one product type → use Factory Method instead
- The "families" only have one member each → flat Factory Method is enough
- Variants will never be added → just instantiate concrete classes directly

## TypeScript Example

```typescript
/**
 * The Abstract Factory interface declares a set of methods that return
 * different abstract products. These products are called a family and are
 * related by a high-level theme or concept. Products of one family are usually
 * able to collaborate among themselves. A family of products may have several
 * variants, but the products of one variant are incompatible with products of
 * another.
 */
interface AbstractFactory {
    createProductA(): AbstractProductA;

    createProductB(): AbstractProductB;
}

/**
 * Concrete Factories produce a family of products that belong to a single
 * variant. The factory guarantees that resulting products are compatible. Note
 * that signatures of the Concrete Factory's methods return an abstract product,
 * while inside the method a concrete product is instantiated.
 */
class ConcreteFactory1 implements AbstractFactory {
    public createProductA(): AbstractProductA {
        return new ConcreteProductA1();
    }

    public createProductB(): AbstractProductB {
        return new ConcreteProductB1();
    }
}

/**
 * Each Concrete Factory has a corresponding product variant.
 */
class ConcreteFactory2 implements AbstractFactory {
    public createProductA(): AbstractProductA {
        return new ConcreteProductA2();
    }

    public createProductB(): AbstractProductB {
        return new ConcreteProductB2();
    }
}

/**
 * Each distinct product of a product family should have a base interface. All
 * variants of the product must implement this interface.
 */
interface AbstractProductA {
    usefulFunctionA(): string;
}

/**
 * These Concrete Products are created by corresponding Concrete Factories.
 */
class ConcreteProductA1 implements AbstractProductA {
    public usefulFunctionA(): string {
        return 'The result of the product A1.';
    }
}

class ConcreteProductA2 implements AbstractProductA {
    public usefulFunctionA(): string {
        return 'The result of the product A2.';
    }
}

/**
 * Here's the the base interface of another product. All products can interact
 * with each other, but proper interaction is possible only between products of
 * the same concrete variant.
 */
interface AbstractProductB {
    /**
     * Product B is able to do its own thing...
     */
    usefulFunctionB(): string;

    /**
     * ...but it also can collaborate with the ProductA.
     *
     * The Abstract Factory makes sure that all products it creates are of the
     * same variant and thus, compatible.
     */
    anotherUsefulFunctionB(collaborator: AbstractProductA): string;
}

/**
 * These Concrete Products are created by corresponding Concrete Factories.
 */
class ConcreteProductB1 implements AbstractProductB {
    public usefulFunctionB(): string {
        return 'The result of the product B1.';
    }

    /**
     * The variant, Product B1, is only able to work correctly with the variant,
     * Product A1. Nevertheless, it accepts any instance of AbstractProductA as
     * an argument.
     */
    public anotherUsefulFunctionB(collaborator: AbstractProductA): string {
        const result = collaborator.usefulFunctionA();
        return `The result of the B1 collaborating with the (${result})`;
    }
}

class ConcreteProductB2 implements AbstractProductB {
    public usefulFunctionB(): string {
        return 'The result of the product B2.';
    }

    /**
     * The variant, Product B2, is only able to work correctly with the variant,
     * Product A2. Nevertheless, it accepts any instance of AbstractProductA as
     * an argument.
     */
    public anotherUsefulFunctionB(collaborator: AbstractProductA): string {
        const result = collaborator.usefulFunctionA();
        return `The result of the B2 collaborating with the (${result})`;
    }
}

/**
 * The client code works with factories and products only through abstract
 * types: AbstractFactory and AbstractProduct. This lets you pass any factory or
 * product subclass to the client code without breaking it.
 */
function clientCode(factory: AbstractFactory) {
    const productA = factory.createProductA();
    const productB = factory.createProductB();

    console.log(productB.usefulFunctionB());
    console.log(productB.anotherUsefulFunctionB(productA));
}

/**
 * The client code can work with any concrete factory class.
 */
console.log('Client: Testing client code with the first factory type...');
clientCode(new ConcreteFactory1());

console.log('');

console.log('Client: Testing the same client code with the second factory type...');
clientCode(new ConcreteFactory2());
```

## Pairs well with

Factory Method (each factory method inside an Abstract Factory is itself a Factory Method); Singleton (concrete factory
often instantiated once and reused).

---

<a id="adapter"></a>

# Adapter

## Intent

Adapter is a structural design pattern that allows objects with incompatible interfaces to collaborate. This pattern
functions as a translator between incompatible components, enabling them to work together seamlessly.

## Applicability

- You need to integrate an existing class whose interface doesn't align with your codebase
- You want to reuse multiple subclasses that lack common functionality without duplicating code across new child classes
- You're working with legacy code, third-party libraries, or components with incompatible interfaces that you cannot
  modify

## Pros

- Separates interface conversion logic from primary business logic (Single Responsibility Principle)
- Allows introduction of new adapter types without affecting existing client code (Open/Closed Principle)
- Enables incompatible components to work together without modifying their source code

## Cons

- Increases overall code complexity by requiring new interfaces and classes
- Sometimes simpler to modify the service class directly rather than introduce an adapter layer

## Don't use when

- You control both interfaces — just align them directly
- The "adaptation" is a one-line wrapper → inline it
- The codebase already has an adapter for this backend → extend or compose with the existing one

## TypeScript Example

```typescript
/**
 * The Target defines the domain-specific interface used by the client code.
 */
class Target {
    public request(): string {
        return 'Target: The default target\'s behavior.';
    }
}

/**
 * The Adaptee contains some useful behavior, but its interface is incompatible
 * with the existing client code. The Adaptee needs some adaptation before the
 * client code can use it.
 */
class Adaptee {
    public specificRequest(): string {
        return '.eetpadA eht fo roivaheb laicepS';
    }
}

/**
 * The Adapter makes the Adaptee's interface compatible with the Target's
 * interface.
 */
class Adapter extends Target {
    private adaptee: Adaptee;

    constructor(adaptee: Adaptee) {
        super();
        this.adaptee = adaptee;
    }

    public request(): string {
        const result = this.adaptee.specificRequest().split('').reverse().join('');
        return `Adapter: (TRANSLATED) ${result}`;
    }
}

/**
 * The client code supports all classes that follow the Target interface.
 */
function clientCode(target: Target) {
    console.log(target.request());
}

console.log('Client: I can work just fine with the Target objects:');
const target = new Target();
clientCode(target);

console.log('');

const adaptee = new Adaptee();
console.log('Client: The Adaptee class has a weird interface. See, I don\'t understand it:');
console.log(`Adaptee: ${adaptee.specificRequest()}`);

console.log('');

console.log('Client: But I can work with it via the Adapter:');
const adapter = new Adapter(adaptee);
clientCode(adapter);
```

## Pairs well with

Bridge (Adapter focuses on making existing things compatible; Bridge designs the abstraction up-front to support
multiple implementations); Strategy (kernel adapters are also strategies — runtime swappable).

---

<a id="bridge"></a>

# Bridge

## Intent

Bridge is a structural design pattern that lets you split a large class or a set of closely related classes into two
separate hierarchies—abstraction and implementation—which can be developed independently of each other.

## Applicability

- You have a monolithic class with multiple functional variants that need independent development and modification
- You want to extend a class across several independent dimensions to avoid exponential growth of subclasses
- You need flexibility to swap implementations at runtime without affecting client code

## Pros

- Enables creating platform-independent classes and applications
- Client code interacts with high-level abstractions without exposure to underlying platform details
- Supports the Open/Closed Principle by allowing new abstractions and implementations to be introduced independently
- Follows Single Responsibility Principle by separating high-level logic from platform-specific details

## Cons

- May unnecessarily complicate code when applied to highly cohesive classes that don't require separation

## Don't use when

- You only have one dimension of variation → use Strategy or Adapter
- The class isn't actually big → premature
- Adapter already solves your interop problem → don't add a second hierarchy

## TypeScript Example

```typescript
/**
 * The Abstraction defines the interface for the "control" part of the two class
 * hierarchies. It maintains a reference to an object of the Implementation
 * hierarchy and delegates all of the real work to this object.
 */
class Abstraction {
    protected implementation: Implementation;

    constructor(implementation: Implementation) {
        this.implementation = implementation;
    }

    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `Abstraction: Base operation with:\n${result}`;
    }
}

/**
 * You can extend the Abstraction without changing the Implementation classes.
 */
class ExtendedAbstraction extends Abstraction {
    public operation(): string {
        const result = this.implementation.operationImplementation();
        return `ExtendedAbstraction: Extended operation with:\n${result}`;
    }
}

/**
 * The Implementation defines the interface for all implementation classes. It
 * doesn't have to match the Abstraction's interface. In fact, the two
 * interfaces can be entirely different. Typically the Implementation interface
 * provides only primitive operations, while the Abstraction defines higher-
 * level operations based on those primitives.
 */
interface Implementation {
    operationImplementation(): string;
}

/**
 * Each Concrete Implementation corresponds to a specific platform and
 * implements the Implementation interface using that platform's API.
 */
class ConcreteImplementationA implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationA: Here\'s the result on the platform A.';
    }
}

class ConcreteImplementationB implements Implementation {
    public operationImplementation(): string {
        return 'ConcreteImplementationB: Here\'s the result on the platform B.';
    }
}

/**
 * Except for the initialization phase, where an Abstraction object gets linked
 * with a specific Implementation object, the client code should only depend on
 * the Abstraction class.
 */
function clientCode(abstraction: Abstraction) {
    console.log(abstraction.operation());
}

/**
 * The client code should be able to work with any pre-configured abstraction-
 * implementation combination.
 */
let implementation = new ConcreteImplementationA();
let abstraction = new Abstraction(implementation);
clientCode(abstraction);

console.log('');

implementation = new ConcreteImplementationB();
abstraction = new ExtendedAbstraction(implementation);
clientCode(abstraction);
```

## Pairs well with

Adapter (Adapter retrofits incompatible interfaces; Bridge designs the split up-front); Abstract Factory (Bridge often
gets its implementation from an Abstract Factory).

---

<a id="builder"></a>

# Builder

## Intent

Builder is a creational design pattern that lets you construct complex objects step by step. It enables producing
different object types and representations through the same construction code.

## Applicability

- Use Builder to eliminate "telescoping constructors" with numerous optional parameters
- Use it when creating different representations of a product with similar construction steps
- Apply it to construct complex object trees or Composite structures incrementally
- Use Builder when you need to defer execution of certain construction steps
- Apply it when various product representations require extensive configuration

## Pros

- Construct objects progressively, defer steps, or execute them recursively
- Reuse identical construction code across different product variations
- Isolates intricate assembly logic from product business logic, supporting Single Responsibility Principle

## Cons

- Overall code complexity increases due to creating multiple new classes
- Introduces architectural overhead for simpler object constructions

## Don't use when

- Constructor takes ≤4 args and they are all required → just use a constructor
- Object has no optional or step-wise configuration → unnecessary
- A simple object literal `{ a, b, c }` would do the job

## TypeScript Example

```typescript
/**
 * The Builder interface specifies methods for creating the different parts of
 * the Product objects.
 */
interface Builder {
    producePartA(): void;

    producePartB(): void;

    producePartC(): void;
}

/**
 * The Concrete Builder classes follow the Builder interface and provide
 * specific implementations of the building steps. Your program may have several
 * variations of Builders, implemented differently.
 */
class ConcreteBuilder1 implements Builder {
    private product: Product1;

    /**
     * A fresh builder instance should contain a blank product object, which is
     * used in further assembly.
     */
    constructor() {
        this.reset();
    }

    public reset(): void {
        this.product = new Product1();
    }

    /**
     * All production steps work with the same product instance.
     */
    public producePartA(): void {
        this.product.parts.push('PartA1');
    }

    public producePartB(): void {
        this.product.parts.push('PartB1');
    }

    public producePartC(): void {
        this.product.parts.push('PartC1');
    }

    /**
     * Concrete Builders are supposed to provide their own methods for
     * retrieving results. That's because various types of builders may create
     * entirely different products that don't follow the same interface.
     * Therefore, such methods cannot be declared in the base Builder interface
     * (at least in a statically typed programming language).
     *
     * Usually, after returning the end result to the client, a builder instance
     * is expected to be ready to start producing another product. That's why
     * it's a usual practice to call the reset method at the end of the
     * `getProduct` method body. However, this behavior is not mandatory, and
     * you can make your builders wait for an explicit reset call from the
     * client code before disposing of the previous result.
     */
    public getProduct(): Product1 {
        const result = this.product;
        this.reset();
        return result;
    }
}

/**
 * It makes sense to use the Builder pattern only when your products are quite
 * complex and require extensive configuration.
 *
 * Unlike in other creational patterns, different concrete builders can produce
 * unrelated products. In other words, results of various builders may not
 * always follow the same interface.
 */
class Product1 {
    public parts: string[] = [];

    public listParts(): void {
        console.log(`Product parts: ${this.parts.join(', ')}\n`);
    }
}

/**
 * The Director is only responsible for executing the building steps in a
 * particular sequence. It is helpful when producing products according to a
 * specific order or configuration. Strictly speaking, the Director class is
 * optional, since the client can control builders directly.
 */
class Director {
    private builder: Builder;

    /**
     * The Director works with any builder instance that the client code passes
     * to it. This way, the client code may alter the final type of the newly
     * assembled product.
     */
    public setBuilder(builder: Builder): void {
        this.builder = builder;
    }

    /**
     * The Director can construct several product variations using the same
     * building steps.
     */
    public buildMinimalViableProduct(): void {
        this.builder.producePartA();
    }

    public buildFullFeaturedProduct(): void {
        this.builder.producePartA();
        this.builder.producePartB();
        this.builder.producePartC();
    }
}

/**
 * The client code creates a builder object, passes it to the director and then
 * initiates the construction process. The end result is retrieved from the
 * builder object.
 */
function clientCode(director: Director) {
    const builder = new ConcreteBuilder1();
    director.setBuilder(builder);

    console.log('Standard basic product:');
    director.buildMinimalViableProduct();
    builder.getProduct().listParts();

    console.log('Standard full featured product:');
    director.buildFullFeaturedProduct();
    builder.getProduct().listParts();

    // Remember, the Builder pattern can be used without a Director class.
    console.log('Custom product:');
    builder.producePartA();
    builder.producePartC();
    builder.getProduct().listParts();
}

const director = new Director();
clientCode(director);
```

## Pairs well with

Composite (Builder constructs Composite trees); Abstract Factory (Builder may produce parts via an Abstract Factory);
Director (separates step ordering from build steps).

---

<a id="chain-of-responsibility"></a>

# Chain of Responsibility

## Intent

A behavioral design pattern that lets you pass requests along a chain of handlers. Upon receiving a request, each
handler decides either to process the request or to pass it to the next handler.

## Applicability

- Your program must handle various request types sequentially, but exact types and order are unknown beforehand
- Multiple handlers must execute in a specific sequence
- The set of handlers and their arrangement may change during runtime

## Pros

- You can control the sequence in which requests are processed
- Decouples operation-invoking classes from operation-performing classes, following Single Responsibility
- New handlers can be added without modifying existing client code (Open/Closed Principle)

## Cons

- Some requests may remain unhandled if no handler in the chain processes them

## Don't use when

- Only one handler exists → call it directly
- All handlers always run regardless of result → use a flat list and `forEach`
- The chain is fixed at compile time and never reordered → just hardcode the call sequence

## TypeScript Example

```typescript
/**
 * The Handler interface declares a method for building the chain of handlers.
 * It also declares a method for executing a request.
 */
interface Handler<Request = string, Result = string> {
    setNext(handler: Handler<Request, Result>): Handler<Request, Result>;

    handle(request: Request): Result;
}

/**
 * The default chaining behavior can be implemented inside a base handler class.
 */
abstract class AbstractHandler implements Handler
{
    private nextHandler: Handler;

    public setNext(handler: Handler): Handler {
        this.nextHandler = handler;
        // Returning a handler from here will let us link handlers in a
        // convenient way like this:
        // monkey.setNext(squirrel).setNext(dog);
        return handler;
    }

    public handle(request: string): string {
        if (this.nextHandler) {
            return this.nextHandler.handle(request);
        }

        return null;
    }
}

/**
 * All Concrete Handlers either handle a request or pass it to the next handler
 * in the chain.
 */
class MonkeyHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'Banana') {
            return `Monkey: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

class SquirrelHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'Nut') {
            return `Squirrel: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

class DogHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === 'MeatBall') {
            return `Dog: I'll eat the ${request}.`;
        }
        return super.handle(request);
    }
}

/**
 * The client code is usually suited to work with a single handler. In most
 * cases, it is not even aware that the handler is part of a chain.
 */
function clientCode(handler: Handler) {
    const foods = ['Nut', 'Banana', 'Cup of coffee'];

    for (const food of foods) {
        console.log(`Client: Who wants a ${food}?`);

        const result = handler.handle(food);
        if (result) {
            console.log(`  ${result}`);
        } else {
            console.log(`  ${food} was left untouched.`);
        }
    }
}

/**
 * The other part of the client code constructs the actual chain.
 */
const monkey = new MonkeyHandler();
const squirrel = new SquirrelHandler();
const dog = new DogHandler();

monkey.setNext(squirrel).setNext(dog);

console.log('Chain: Monkey > Squirrel > Dog\n');
clientCode(monkey);
console.log('');

console.log('Subchain: Squirrel > Dog\n');
clientCode(squirrel);
```

## Pairs well with

Composite (commonly used together: handlers walk a Composite tree); Command (commands flow through a chain of middleware
handlers); Decorator (both stack behaviors, but Chain stops at first match).

---

<a id="command"></a>

# Command

## Intent

Command is a behavioral design pattern that turns a request into a stand-alone object that contains all information
about the request. This transformation enables passing requests as arguments, deferring execution, and supporting
reversible operations.

## Applicability

- You need to parameterize objects with operations or pass commands as method arguments
- You want to queue operations, schedule their execution, or execute them remotely
- You're implementing reversible operations and undo/redo functionality
- You want to decouple the objects that invoke operations from those that perform them

## Pros

- Separates request invocation from execution logic
- Enables new commands without modifying existing client code
- Supports undo/redo implementation
- Allows deferred execution of operations
- Enables combining simple commands into complex ones

## Cons

- Increases code complexity by introducing an additional layer between senders and receivers

## Don't use when

- You're calling a single method directly with no need for queueing/undo/logging → just call it
- The action has no state and never needs to be reified → use a function reference
- You'd be wrapping every UI event in a command class → too granular

## TypeScript Example

```typescript
/**
 * The Command interface declares a method for executing a command.
 */
interface Command {
    execute(): void;
}

/**
 * Some commands can implement simple operations on their own.
 */
class SimpleCommand implements Command {
    private payload: string;

    constructor(payload: string) {
        this.payload = payload;
    }

    public execute(): void {
        console.log(`SimpleCommand: See, I can do simple things like printing (${this.payload})`);
    }
}

/**
 * However, some commands can delegate more complex operations to other objects,
 * called "receivers."
 */
class ComplexCommand implements Command {
    private receiver: Receiver;

    /**
     * Context data, required for launching the receiver's methods.
     */
    private a: string;

    private b: string;

    /**
     * Complex commands can accept one or several receiver objects along with
     * any context data via the constructor.
     */
    constructor(receiver: Receiver, a: string, b: string) {
        this.receiver = receiver;
        this.a = a;
        this.b = b;
    }

    /**
     * Commands can delegate to any methods of a receiver.
     */
    public execute(): void {
        console.log('ComplexCommand: Complex stuff should be done by a receiver object.');
        this.receiver.doSomething(this.a);
        this.receiver.doSomethingElse(this.b);
    }
}

/**
 * The Receiver classes contain some important business logic. They know how to
 * perform all kinds of operations, associated with carrying out a request. In
 * fact, any class may serve as a Receiver.
 */
class Receiver {
    public doSomething(a: string): void {
        console.log(`Receiver: Working on (${a}.)`);
    }

    public doSomethingElse(b: string): void {
        console.log(`Receiver: Also working on (${b}.)`);
    }
}

/**
 * The Invoker is associated with one or several commands. It sends a request to
 * the command.
 */
class Invoker {
    private onStart: Command;

    private onFinish: Command;

    public setOnStart(command: Command): void {
        this.onStart = command;
    }

    public setOnFinish(command: Command): void {
        this.onFinish = command;
    }

    /**
     * The Invoker does not depend on concrete command or receiver classes. The
     * Invoker passes a request to a receiver indirectly, by executing a
     * command.
     */
    public doSomethingImportant(): void {
        console.log('Invoker: Does anybody want something done before I begin?');
        if (this.isCommand(this.onStart)) {
            this.onStart.execute();
        }

        console.log('Invoker: ...doing something really important...');

        console.log('Invoker: Does anybody want something done after I finish?');
        if (this.isCommand(this.onFinish)) {
            this.onFinish.execute();
        }
    }

    private isCommand(object): object is Command {
        return object.execute !== undefined;
    }
}

/**
 * The client code can parameterize an invoker with any commands.
 */
const invoker = new Invoker();
invoker.setOnStart(new SimpleCommand('Say Hi!'));
const receiver = new Receiver();
invoker.setOnFinish(new ComplexCommand(receiver, 'Send email', 'Save report'));

invoker.doSomethingImportant();
```

## Pairs well with

Memento (Command + Memento = undo/redo); Composite (macro commands composed of sub-commands); Chain of Responsibility (
commands routed through middleware chain).

---

<a id="composite"></a>

# Composite

## Intent

Composite is a structural design pattern that lets you compose objects into tree structures and then work with these
structures as if they were individual objects.

## Applicability

- Your app's core model can be represented as a hierarchical tree structure with both simple and complex elements
- You want client code to handle simple and complex elements uniformly through a shared interface
- You need to avoid tight coupling between clients and concrete component classes in a tree structure

## Pros

- Work with complex tree structures more conveniently using polymorphism and recursion
- Open/Closed Principle: introduce new element types without breaking existing code
- Clients treat all elements equally regardless of complexity

## Cons

- Difficult to establish common interfaces when component functionalities differ significantly
- May require overgeneralizing the component interface, reducing clarity
- Can be unnecessarily complex for simple, non-hierarchical object structures

## Don't use when

- The hierarchy is one or two levels deep → flat array is enough
- Leaves and composites have nothing meaningful in common → forcing a shared interface hurts clarity
- A simple recursive function over a plain object tree would suffice

## TypeScript Example

```typescript
/**
 * The base Component class declares common operations for both simple and
 * complex objects of a composition.
 */
abstract class Component {
    protected parent!: Component | null;

    /**
     * Optionally, the base Component can declare an interface for setting and
     * accessing a parent of the component in a tree structure. It can also
     * provide some default implementation for these methods.
     */
    public setParent(parent: Component | null) {
        this.parent = parent;
    }

    public getParent(): Component | null {
        return this.parent;
    }

    /**
     * In some cases, it would be beneficial to define the child-management
     * operations right in the base Component class. This way, you won't need to
     * expose any concrete component classes to the client code, even during the
     * object tree assembly. The downside is that these methods will be empty
     * for the leaf-level components.
     */
    public add(component: Component): void {
    }

    public remove(component: Component): void {
    }

    /**
     * You can provide a method that lets the client code figure out whether a
     * component can bear children.
     */
    public isComposite(): boolean {
        return false;
    }

    /**
     * The base Component may implement some default behavior or leave it to
     * concrete classes (by declaring the method containing the behavior as
     * "abstract").
     */
    public abstract operation(): string;
}

/**
 * The Leaf class represents the end objects of a composition. A leaf can't have
 * any children.
 *
 * Usually, it's the Leaf objects that do the actual work, whereas Composite
 * objects only delegate to their sub-components.
 */
class Leaf extends Component {
    public operation(): string {
        return 'Leaf';
    }
}

/**
 * The Composite class represents the complex components that may have children.
 * Usually, the Composite objects delegate the actual work to their children and
 * then "sum-up" the result.
 */
class Composite extends Component {
    protected children: Component[] = [];

    public add(component: Component): void {
        this.children.push(component);
        component.setParent(this);
    }

    public remove(component: Component): void {
        const componentIndex = this.children.indexOf(component);
        this.children.splice(componentIndex, 1);

        component.setParent(null);
    }

    public isComposite(): boolean {
        return true;
    }

    /**
     * The Composite executes its primary logic in a particular way. It
     * traverses recursively through all its children, collecting and summing
     * their results. Since the composite's children pass these calls to their
     * children and so forth, the whole object tree is traversed as a result.
     */
    public operation(): string {
        const results = [];
        for (const child of this.children) {
            results.push(child.operation());
        }

        return `Branch(${results.join('+')})`;
    }
}

function clientCode(component: Component) {
    console.log(`RESULT: ${component.operation()}`);
}

const simple = new Leaf();
console.log('Client: I\'ve got a simple component:');
clientCode(simple);
console.log('');

const tree = new Composite();
const branch1 = new Composite();
branch1.add(new Leaf());
branch1.add(new Leaf());
const branch2 = new Composite();
branch2.add(new Leaf());
tree.add(branch1);
tree.add(branch2);
console.log('Client: Now I\'ve got a composite tree:');
clientCode(tree);
```

## Pairs well with

Iterator (Iterator walks the Composite); Visitor (Visitor performs operations across the whole tree); Decorator (both
share the recursive wrapping shape).

---

<a id="decorator"></a>

# Decorator

## Intent

Decorator is a structural design pattern that lets you attach new behaviors to objects by placing these objects inside
special wrapper objects that contain the behaviors.

## Applicability

- Assign extra behaviors to objects at runtime without breaking existing code
- Structure business logic into composable layers that can be combined in various ways
- Extend an object's behavior when inheritance is awkward or impossible (e.g., with final classes)
- Avoid combinatorial explosion from creating many subclass combinations

## Pros

- Extend object behavior without creating new subclasses
- Add or remove responsibilities dynamically at runtime
- Combine multiple behaviors by wrapping objects in multiple decorators
- Apply Single Responsibility Principle by dividing monolithic classes into smaller ones

## Cons

- Difficult to remove a specific wrapper from a stack of decorators
- Hard to implement decorators whose behavior doesn't depend on decorator order
- Initial configuration code for layering can become unwieldy

## Don't use when

- Behavior is fixed and known at compile time → just use inheritance or composition
- Higher-order functions or middleware patterns already solve it (e.g. Redux/Zustand middleware)
- Only one wrapper layer is needed → just call the wrapper function directly

## TypeScript Example

```typescript
/**
 * The base Component interface defines operations that can be altered by
 * decorators.
 */
interface Component {
    operation(): string;
}

/**
 * Concrete Components provide default implementations of the operations. There
 * might be several variations of these classes.
 */
class ConcreteComponent implements Component {
    public operation(): string {
        return 'ConcreteComponent';
    }
}

/**
 * The base Decorator class follows the same interface as the other components.
 * The primary purpose of this class is to define the wrapping interface for all
 * concrete decorators. The default implementation of the wrapping code might
 * include a field for storing a wrapped component and the means to initialize
 * it.
 */
class Decorator implements Component {
    protected component: Component;

    constructor(component: Component) {
        this.component = component;
    }

    /**
     * The Decorator delegates all work to the wrapped component.
     */
    public operation(): string {
        return this.component.operation();
    }
}

/**
 * Concrete Decorators call the wrapped object and alter its result in some way.
 */
class ConcreteDecoratorA extends Decorator {
    /**
     * Decorators may call parent implementation of the operation, instead of
     * calling the wrapped object directly. This approach simplifies extension
     * of decorator classes.
     */
    public operation(): string {
        return `ConcreteDecoratorA(${super.operation()})`;
    }
}

/**
 * Decorators can execute their behavior either before or after the call to a
 * wrapped object.
 */
class ConcreteDecoratorB extends Decorator {
    public operation(): string {
        return `ConcreteDecoratorB(${super.operation()})`;
    }
}

/**
 * The client code works with all objects using the Component interface. This
 * way it can stay independent of the concrete classes of components it works
 * with.
 */
function clientCode(component: Component) {
    console.log(`RESULT: ${component.operation()}`);
}

const simple = new ConcreteComponent();
console.log('Client: I\'ve got a simple component:');
clientCode(simple);
console.log('');

/**
 * Note how decorators can wrap not only simple components but the other
 * decorators as well.
 */
const decorator1 = new ConcreteDecoratorA(simple);
const decorator2 = new ConcreteDecoratorB(decorator1);
console.log('Client: Now I\'ve got a decorated component:');
clientCode(decorator2);
```

## Pairs well with

Strategy (decorate a strategy with cross-cutting behavior); Composite (decorators have similar tree-of-wrappers shape).

---

<a id="facade"></a>

# Facade

## Intent

Facade is a structural design pattern that provides a simplified interface to a library, a framework, or any other
complex set of classes.

## Applicability

- You need a straightforward interface to a complex subsystem, shielding clients from implementation details
- A subsystem grows increasingly complex over time, requiring more configuration and boilerplate code
- You want to organize a subsystem into distinct layers with clear entry points for each level
- You need to reduce coupling between multiple subsystems by controlling their interactions

## Pros

- Isolates client code from subsystem complexity, improving maintainability
- Simplifies client code by hiding intricate interactions with multiple objects
- Allows changes to the subsystem without affecting client implementations

## Cons

- A facade can become a "god object" coupled to all classes in an application if not properly managed
- Overuse may hide important subsystem functionality clients might need

## Don't use when

- The subsystem already has a simple public API → no facade needed
- The facade would just re-export everything → that's a barrel file, not a facade
- You'd be creating a facade with one method that calls one underlying method → premature

## TypeScript Example

```typescript
/**
 * The Facade class provides a simple interface to the complex logic of one or
 * several subsystems. The Facade delegates the client requests to the
 * appropriate objects within the subsystem. The Facade is also responsible for
 * managing their lifecycle. All of this shields the client from the undesired
 * complexity of the subsystem.
 */
class Facade {
    protected subsystem1: Subsystem1;

    protected subsystem2: Subsystem2;

    /**
     * Depending on your application's needs, you can provide the Facade with
     * existing subsystem objects or force the Facade to create them on its own.
     */
    constructor(subsystem1?: Subsystem1, subsystem2?: Subsystem2) {
        this.subsystem1 = subsystem1 || new Subsystem1();
        this.subsystem2 = subsystem2 || new Subsystem2();
    }

    /**
     * The Facade's methods are convenient shortcuts to the sophisticated
     * functionality of the subsystems. However, clients get only to a fraction
     * of a subsystem's capabilities.
     */
    public operation(): string {
        let result = 'Facade initializes subsystems:\n';
        result += this.subsystem1.operation1();
        result += this.subsystem2.operation1();
        result += 'Facade orders subsystems to perform the action:\n';
        result += this.subsystem1.operationN();
        result += this.subsystem2.operationZ();

        return result;
    }
}

/**
 * The Subsystem can accept requests either from the facade or client directly.
 * In any case, to the Subsystem, the Facade is yet another client, and it's not
 * a part of the Subsystem.
 */
class Subsystem1 {
    public operation1(): string {
        return 'Subsystem1: Ready!\n';
    }

    // ...

    public operationN(): string {
        return 'Subsystem1: Go!\n';
    }
}

/**
 * Some facades can work with multiple subsystems at the same time.
 */
class Subsystem2 {
    public operation1(): string {
        return 'Subsystem2: Get ready!\n';
    }

    // ...

    public operationZ(): string {
        return 'Subsystem2: Fire!';
    }
}

/**
 * The client code works with complex subsystems through a simple interface
 * provided by the Facade. When a facade manages the lifecycle of the subsystem,
 * the client might not even know about the existence of the subsystem. This
 * approach lets you keep the complexity under control.
 */
function clientCode(facade: Facade) {
    // ...

    console.log(facade.operation());

    // ...
}

/**
 * The client code may have some of the subsystem's objects already created. In
 * this case, it might be worthwhile to initialize the Facade with these objects
 * instead of letting the Facade create new instances.
 */
const subsystem1 = new Subsystem1();
const subsystem2 = new Subsystem2();
const facade = new Facade(subsystem1, subsystem2);
clientCode(facade);
```

## Pairs well with

Adapter (facades often wrap multiple adapters); Singleton (facades are commonly accessed as singletons by convention);
Mediator (Mediator coordinates peers, Facade provides a one-way simplified interface).

---

<a id="factory-method"></a>

# Factory Method

## Intent

Factory Method is a creational design pattern that provides an interface for creating objects in a superclass, but
allows subclasses to alter the type of objects that will be created.

## Applicability

- Use when your code must work with various object types whose exact classes aren't known beforehand
- Use when extending a library or framework and you want others to customize internal components through inheritance
- Use when you need to conserve system resources by reusing existing objects rather than constantly creating new
  instances
- Use when product construction logic should be decoupled from the code that actually uses products
- Use to reduce tight coupling between creators and the concrete product classes they instantiate

## Pros

- Eliminates direct dependencies between the creator and concrete product implementations
- Centralizes product creation code in one location, improving maintainability
- Enables introducing new product types without modifying existing client code
- Follows the Single Responsibility and Open/Closed principles

## Cons

- Increases code complexity by requiring numerous new subclasses to implement the pattern properly
- Works best when applied to existing class hierarchies rather than as an afterthought

## Don't use when

- You only have one concrete product type and no realistic plan for a second → just call `new`
- The "factory" would be a one-liner that returns `new Foo()` with no logic → premature
- The codebase already has a factory for this domain → extend it, do not create a parallel one

## TypeScript Example

```typescript
/**
 * The Creator class declares the factory method that is supposed to return an
 * object of a Product class. The Creator's subclasses usually provide the
 * implementation of this method.
 */
abstract class Creator {
    /**
     * Note that the Creator may also provide some default implementation of the
     * factory method.
     */
    public abstract factoryMethod(): Product;

    /**
     * Also note that, despite its name, the Creator's primary responsibility is
     * not creating products. Usually, it contains some core business logic that
     * relies on Product objects, returned by the factory method. Subclasses can
     * indirectly change that business logic by overriding the factory method
     * and returning a different type of product from it.
     */
    public someOperation(): string {
        // Call the factory method to create a Product object.
        const product = this.factoryMethod();
        // Now, use the product.
        return `Creator: The same creator's code has just worked with ${product.operation()}`;
    }
}

/**
 * Concrete Creators override the factory method in order to change the
 * resulting product's type.
 */
class ConcreteCreator1 extends Creator {
    /**
     * Note that the signature of the method still uses the abstract product
     * type, even though the concrete product is actually returned from the
     * method. This way the Creator can stay independent of concrete product
     * classes.
     */
    public factoryMethod(): Product {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct2();
    }
}

/**
 * The Product interface declares the operations that all concrete products must
 * implement.
 */
interface Product {
    operation(): string;
}

/**
 * Concrete Products provide various implementations of the Product interface.
 */
class ConcreteProduct1 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct1}';
    }
}

class ConcreteProduct2 implements Product {
    public operation(): string {
        return '{Result of the ConcreteProduct2}';
    }
}

/**
 * The client code works with an instance of a concrete creator, albeit through
 * its base interface. As long as the client keeps working with the creator via
 * the base interface, you can pass it any creator's subclass.
 */
function clientCode(creator: Creator) {
    // ...
    console.log('Client: I\'m not aware of the creator\'s class, but it still works.');
    console.log(creator.someOperation());
    // ...
}

/**
 * The Application picks a creator's type depending on the configuration or
 * environment.
 */
console.log('App: Launched with the ConcreteCreator1.');
clientCode(new ConcreteCreator1());
console.log('');

console.log('App: Launched with the ConcreteCreator2.');
clientCode(new ConcreteCreator2());
```

## Pairs well with

Often combined with Strategy (factory picks the concrete strategy) and Abstract Factory (when families of related
products are needed instead of a single one).

---

<a id="flyweight"></a>

# Flyweight

## Intent

Flyweight is a structural design pattern that lets you fit more objects into the available amount of RAM by sharing
common parts of state between multiple objects instead of keeping all of the data in each object.

## Applicability

- Your application needs to create vast numbers of similar objects that consume excessive memory
- Objects contain duplicate state that can be extracted and shared across instances
- The duplicate data cannot be meaningfully reduced through other optimization approaches
- RAM constraints are a genuine bottleneck preventing normal program execution

## Pros

- Significant RAM savings when managing huge quantities of similar objects
- Enables applications to function on devices with limited memory capacity
- Reduces overall memory footprint through shared intrinsic state

## Cons

- May trade RAM for CPU cycles when context data needs to be recalculated each call
- Code complexity increases substantially, making maintenance more difficult
- Team members may struggle understanding why object state was separated in this manner

## Don't use when

- Memory isn't actually a bottleneck → don't over-engineer
- Objects are few (<10000) → savings won't justify complexity
- The "shared" state changes frequently → flyweight breaks

## TypeScript Example

```typescript
/**
 * The Flyweight stores a common portion of the state (also called intrinsic
 * state) that belongs to multiple real business entities. The Flyweight accepts
 * the rest of the state (extrinsic state, unique for each entity) via its
 * method parameters.
 */
class Flyweight {
    private sharedState: any;

    constructor(sharedState: any) {
        this.sharedState = sharedState;
    }

    public operation(uniqueState): void {
        const s = JSON.stringify(this.sharedState);
        const u = JSON.stringify(uniqueState);
        console.log(`Flyweight: Displaying shared (${s}) and unique (${u}) state.`);
    }
}

/**
 * The Flyweight Factory creates and manages the Flyweight objects. It ensures
 * that flyweights are shared correctly. When the client requests a flyweight,
 * the factory either returns an existing instance or creates a new one, if it
 * doesn't exist yet.
 */
class FlyweightFactory {
    private flyweights: {[key: string]: Flyweight} = <any>{};

    constructor(initialFlyweights: string[][]) {
        for (const state of initialFlyweights) {
            this.flyweights[this.getKey(state)] = new Flyweight(state);
        }
    }

    /**
     * Returns a Flyweight's string hash for a given state.
     */
    private getKey(state: string[]): string {
        return state.join('_');
    }

    /**
     * Returns an existing Flyweight with a given state or creates a new one.
     */
    public getFlyweight(sharedState: string[]): Flyweight {
        const key = this.getKey(sharedState);

        if (!(key in this.flyweights)) {
            console.log('FlyweightFactory: Can\'t find a flyweight, creating new one.');
            this.flyweights[key] = new Flyweight(sharedState);
        } else {
            console.log('FlyweightFactory: Reusing existing flyweight.');
        }

        return this.flyweights[key];
    }

    public listFlyweights(): void {
        const count = Object.keys(this.flyweights).length;
        console.log(`\nFlyweightFactory: I have ${count} flyweights:`);
        for (const key in this.flyweights) {
            console.log(key);
        }
    }
}

/**
 * The client code usually creates a bunch of pre-populated flyweights in the
 * initialization stage of the application.
 */
const factory = new FlyweightFactory([
    ['Chevrolet', 'Camaro2018', 'pink'],
    ['Mercedes Benz', 'C300', 'black'],
    ['Mercedes Benz', 'C500', 'red'],
    ['BMW', 'M5', 'red'],
    ['BMW', 'X6', 'white'],
]);
factory.listFlyweights();

function addCarToPoliceDatabase(
    ff: FlyweightFactory, plates: string, owner: string,
    brand: string, model: string, color: string,
) {
    console.log('\nClient: Adding a car to database.');
    const flyweight = ff.getFlyweight([brand, model, color]);

    flyweight.operation([plates, owner]);
}

addCarToPoliceDatabase(factory, 'CL234IR', 'James Doe', 'BMW', 'M5', 'red');
addCarToPoliceDatabase(factory, 'CL234IR', 'James Doe', 'BMW', 'X1', 'red');

factory.listFlyweights();
```

## Pairs well with

Composite (flyweights as leaves in a Composite); Factory (Flyweight Factory is the gatekeeper that enforces sharing);
Strategy (flyweight-shared strategies).

---

<a id="iterator"></a>

# Iterator

## Intent

Iterator is a behavioral design pattern that lets you traverse elements of a collection without exposing its underlying
representation (list, stack, tree, etc.).

## Applicability

- Your collection has complex internal structure but you want to hide that complexity from clients seeking access to
  elements
- You want to reduce duplication of traversal code across your application
- You need your code to work with different data structures or unknown collection types beforehand

## Pros

- Follows Single Responsibility Principle by extracting traversal algorithms into separate classes
- Adheres to Open/Closed Principle—new collection and iterator types can be added without modifying existing code
- Multiple iterators can traverse the same collection simultaneously with independent iteration states
- Iteration can be delayed and resumed as needed

## Cons

- May be excessive for applications working only with simple collections
- Iterator access can be less efficient than direct element access in specialized collections

## Don't use when

- A native `for...of` over an array or `Map` already works → use the built-in iterator
- The collection is a simple array → just `.map()`/`.filter()`/`.forEach()`
- You'd need an entire iterator class for one consumer → inline the loop

## TypeScript Example

```typescript
/**
 * Iterator Design Pattern
 *
 * Intent: Lets you traverse elements of a collection without exposing its
 * underlying representation (list, stack, tree, etc.).
 */

interface Iterator<T> {
    // Return the current element.
    current(): T;

    // Return the current element and move forward to next element.
    next(): T;

    // Return the key of the current element.
    key(): number;

    // Checks if current position is valid.
    valid(): boolean;

    // Rewind the Iterator to the first element.
    rewind(): void;
}

interface Aggregator {
    // Retrieve an external iterator.
    getIterator(): Iterator<string>;
}

/**
 * Concrete Iterators implement various traversal algorithms. These classes
 * store the current traversal position at all times.
 */

class AlphabeticalOrderIterator implements Iterator<string> {
    private collection: WordsCollection;

    /**
     * Stores the current traversal position. An iterator may have a lot of
     * other fields for storing iteration state, especially when it is supposed
     * to work with a particular kind of collection.
     */
    private position: number = 0;

    /**
     * This variable indicates the traversal direction.
     */
    private reverse: boolean = false;

    constructor(collection: WordsCollection, reverse: boolean = false) {
        this.collection = collection;
        this.reverse = reverse;

        if (reverse) {
            this.position = collection.getCount() - 1;
        }
    }

    public rewind() {
        this.position = this.reverse ?
            this.collection.getCount() - 1 :
            0;
    }

    public current(): string {
        return this.collection.getItems()[this.position];
    }

    public key(): number {
        return this.position;
    }

    public next(): string {
        const item = this.collection.getItems()[this.position];
        this.position += this.reverse ? -1 : 1;
        return item;
    }

    public valid(): boolean {
        if (this.reverse) {
            return this.position >= 0;
        }

        return this.position < this.collection.getCount();
    }
}

/**
 * Concrete Collections provide one or several methods for retrieving fresh
 * iterator instances, compatible with the collection class.
 */
class WordsCollection implements Aggregator {
    private items: string[] = [];

    public getItems(): string[] {
        return this.items;
    }

    public getCount(): number {
        return this.items.length;
    }

    public addItem(item: string): void {
        this.items.push(item);
    }

    public getIterator(): Iterator<string> {
        return new AlphabeticalOrderIterator(this);
    }

    public getReverseIterator(): Iterator<string> {
        return new AlphabeticalOrderIterator(this, true);
    }
}

/**
 * The client code may or may not know about the Concrete Iterator or Collection
 * classes, depending on the level of indirection you want to keep in your
 * program.
 */
const collection = new WordsCollection();
collection.addItem('First');
collection.addItem('Second');
collection.addItem('Third');

const iterator = collection.getIterator();

console.log('Straight traversal:');
while (iterator.valid()) {
    console.log(iterator.next());
}

console.log('');
console.log('Reverse traversal:');
const reverseIterator = collection.getReverseIterator();
while (reverseIterator.valid()) {
    console.log(reverseIterator.next());
}
```

## Pairs well with

Composite (iterators traverse Composite trees); Visitor (Visitor walks the structure via an Iterator); Memento (capture
iteration state for resumable traversal).

---

<a id="mediator"></a>

# Mediator

## Intent

Mediator is a behavioral design pattern that lets you reduce chaotic dependencies between objects. It accomplishes this
by restricting direct communication and forcing collaboration through a mediator object instead.

## Applicability

- Classes are tightly coupled to many others, making changes difficult without affecting the entire system
- You need to reuse components in different programs but they're overly dependent on other classes
- You're creating numerous component subclasses just to handle different interaction contexts

## Pros

- Extracts relationships between classes into a separate mediator, making the system easier to understand and maintain
- Allows introducing new mediators without modifying actual components
- Reduces coupling between program components, improving modularity
- Enables easier reuse of individual components across different applications

## Cons

- Over time, a mediator can evolve into a "God Object" that becomes overly complex and difficult to manage

## Don't use when

- Two components only talk to each other → just let them
- You'd be introducing a mediator with one method that calls one component → premature
- Observer or event bus already does what you need → those are simpler

## TypeScript Example

```typescript
/**
 * The Mediator interface declares a method used by components to notify the
 * mediator about various events. The Mediator may react to these events and
 * pass the execution to other components.
 */
interface Mediator {
    notify(sender: object, event: string): void;
}

/**
 * Concrete Mediators implement cooperative behavior by coordinating several
 * components.
 */
class ConcreteMediator implements Mediator {
    private component1: Component1;

    private component2: Component2;

    constructor(c1: Component1, c2: Component2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }

    public notify(sender: object, event: string): void {
        if (event === 'A') {
            console.log('Mediator reacts on A and triggers following operations:');
            this.component2.doC();
        }

        if (event === 'D') {
            console.log('Mediator reacts on D and triggers following operations:');
            this.component1.doB();
            this.component2.doC();
        }
    }
}

/**
 * The Base Component provides the basic functionality of storing a mediator's
 * instance inside component objects.
 */
class BaseComponent {
    protected mediator: Mediator;

    constructor(mediator?: Mediator) {
        this.mediator = mediator!;
    }

    public setMediator(mediator: Mediator): void {
        this.mediator = mediator;
    }
}

/**
 * Concrete Components implement various functionality. They don't depend on
 * other components. They also don't depend on any concrete mediator classes.
 */
class Component1 extends BaseComponent {
    public doA(): void {
        console.log('Component 1 does A.');
        this.mediator.notify(this, 'A');
    }

    public doB(): void {
        console.log('Component 1 does B.');
        this.mediator.notify(this, 'B');
    }
}

class Component2 extends BaseComponent {
    public doC(): void {
        console.log('Component 2 does C.');
        this.mediator.notify(this, 'C');
    }

    public doD(): void {
        console.log('Component 2 does D.');
        this.mediator.notify(this, 'D');
    }
}

/**
 * The client code.
 */
const c1 = new Component1();
const c2 = new Component2();
const mediator = new ConcreteMediator(c1, c2);

console.log('Client triggers operation A.');
c1.doA();

console.log('');
console.log('Client triggers operation D.');
c2.doD();
```

## Pairs well with

Facade (both simplify interaction; Facade is one-way, Mediator is bidirectional); Observer (Mediator often dispatches
via Observer to components).

---

<a id="memento"></a>

# Memento

## Intent

A behavioral design pattern that lets you save and restore the previous state of an object without revealing the details
of its implementation. This pattern enables undo functionality while preserving encapsulation.

## Applicability

- You need to capture and restore object states at different points in time
- You're implementing transaction rollback or undo/redo functionality
- Direct access to an object's fields would violate its encapsulation
- You need to manage complex state transitions across multiple objects
- You need to maintain historical snapshots for auditing or recovery purposes

## Pros

- Preserves encapsulation by having objects create their own snapshots
- Simplifies originator code by delegating state history management to caretakers
- Enables complete state restoration without exposing internal implementation details
- Supports multiple independent objects maintaining separate histories

## Cons

- May consume significant memory if snapshots are created frequently
- Requires caretakers to track originator lifecycles to clean up obsolete snapshots
- Dynamic languages cannot guarantee snapshot immutability, risking accidental state modifications

## Don't use when

- You can serialize state to JSON and back → just do that
- The state is immutable already → no snapshot needed, keep references
- You only need one undo step → store one previous-state field, no Caretaker

## TypeScript Example

```typescript
/**
 * The Originator holds some important state that may change over time. It also
 * defines a method for saving the state inside a memento and another method for
 * restoring the state from it.
 */
class Originator {
    /**
     * For the sake of simplicity, the originator's state is stored inside a
     * single variable.
     */
    private state: string;

    constructor(state: string) {
        this.state = state;
        console.log(`Originator: My initial state is: ${state}`);
    }

    /**
     * The Originator's business logic may affect its internal state. Therefore,
     * the client should backup the state before launching methods of the
     * business logic via the save() method.
     */
    public doSomething(): void {
        console.log('Originator: I\'m doing something important.');
        this.state = this.generateRandomString(30);
        console.log(`Originator: and my state has changed to: ${this.state}`);
    }

    private generateRandomString(length: number = 10): string {
        const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

        return Array
            .apply(null, { length })
            .map(() => charSet.charAt(Math.floor(Math.random() * charSet.length)))
            .join('');
    }

    /**
     * Saves the current state inside a memento.
     */
    public save(): Memento {
        return new ConcreteMemento(this.state);
    }

    /**
     * Restores the Originator's state from a memento object.
     */
    public restore(memento: Memento): void {
        this.state = memento.getState();
        console.log(`Originator: My state has changed to: ${this.state}`);
    }
}

/**
 * The Memento interface provides a way to retrieve the memento's metadata, such
 * as creation date or name. However, it doesn't expose the Originator's state.
 */
interface Memento {
    getState(): string;

    getName(): string;

    getDate(): string;
}

/**
 * The Concrete Memento contains the infrastructure for storing the Originator's
 * state.
 */
class ConcreteMemento implements Memento {
    private state: string;

    private date: string;

    constructor(state: string) {
        this.state = state;
        this.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    /**
     * The Originator uses this method when restoring its state.
     */
    public getState(): string {
        return this.state;
    }

    /**
     * The rest of the methods are used by the Caretaker to display metadata.
     */
    public getName(): string {
        return `${this.date} / (${this.state.substr(0, 9)}...)`;
    }

    public getDate(): string {
        return this.date;
    }
}

/**
 * The Caretaker doesn't depend on the Concrete Memento class. Therefore, it
 * doesn't have access to the originator's state, stored inside the memento. It
 * works with all mementos via the base Memento interface.
 */
class Caretaker {
    private mementos: Memento[] = [];

    private originator: Originator;

    constructor(originator: Originator) {
        this.originator = originator;
    }

    public backup(): void {
        console.log('\nCaretaker: Saving Originator\'s state...');
        this.mementos.push(this.originator.save());
    }

    public undo(): void {
        if (!this.mementos.length) {
            return;
        }
        const memento = this.mementos.pop();

        console.log(`Caretaker: Restoring state to: ${memento.getName()}`);
        this.originator.restore(memento);
    }

    public showHistory(): void {
        console.log('Caretaker: Here\'s the list of mementos:');
        for (const memento of this.mementos) {
            console.log(memento.getName());
        }
    }
}

/**
 * Client code.
 */
const originator = new Originator('Super-duper-super-puper-super.');
const caretaker = new Caretaker(originator);

caretaker.backup();
originator.doSomething();

caretaker.backup();
originator.doSomething();

caretaker.backup();
originator.doSomething();

console.log('');
caretaker.showHistory();

console.log('\nClient: Now, let\'s rollback!\n');
caretaker.undo();

console.log('\nClient: Once more!\n');
caretaker.undo();
```

## Pairs well with

Command (Command + Memento = full undo/redo); State (snapshot the state-machine context); Iterator (Iterator state can
be captured in a Memento for resumable traversal).

---

<a id="observer"></a>

# Observer

## Intent

Observer is a behavioral design pattern that lets you define a subscription mechanism to notify multiple objects about
any events that happen to the object they're observing.

## Applicability

- Changes to one object's state may require changing others, and the set of affected objects is unknown beforehand or
  changes dynamically
- Working with GUI classes where custom code needs to execute in response to user interactions
- Some objects must monitor others, but only temporarily or under specific conditions
- You need to establish loose coupling between event producers and event consumers

## Pros

- Supports the Open/Closed Principle by allowing new subscriber classes without modifying publisher code
- Enables runtime establishment of relationships between objects
- Promotes loose coupling through interface-based communication

## Cons

- Subscribers receive notifications in unpredictable order
- Performance overhead when managing large numbers of subscribers
- Risk of memory leaks if subscribers aren't properly unsubscribed

## Don't use when

- A single store subscription would do
- Only one consumer needs the event → just call the consumer directly
- Static, compile-time known dependencies → wire them directly

## TypeScript Example

```typescript
/**
 * The Subject interface declares a set of methods for managing subscribers.
 */
interface Subject {
    // Attach an observer to the subject.
    attach(observer: Observer): void;

    // Detach an observer from the subject.
    detach(observer: Observer): void;

    // Notify all observers about an event.
    notify(): void;
}

/**
 * The Subject owns some important state and notifies observers when the state
 * changes.
 */
class ConcreteSubject implements Subject {
    /**
     * @type {number} For the sake of simplicity, the Subject's state, essential
     * to all subscribers, is stored in this variable.
     */
    public state: number;

    /**
     * @type {Observer[]} List of subscribers. In real life, the list of
     * subscribers can be stored more comprehensively (categorized by event
     * type, etc.).
     */
    private observers: Observer[] = [];

    /**
     * The subscription management methods.
     */
    public attach(observer: Observer): void {
        const isExist = this.observers.includes(observer);
        if (isExist) {
            return console.log('Subject: Observer has been attached already.');
        }

        console.log('Subject: Attached an observer.');
        this.observers.push(observer);
    }

    public detach(observer: Observer): void {
        const observerIndex = this.observers.indexOf(observer);
        if (observerIndex === -1) {
            return console.log('Subject: Nonexistent observer.');
        }

        this.observers.splice(observerIndex, 1);
        console.log('Subject: Detached an observer.');
    }

    /**
     * Trigger an update in each subscriber.
     */
    public notify(): void {
        console.log('Subject: Notifying observers...');
        for (const observer of this.observers) {
            observer.update(this);
        }
    }

    /**
     * Usually, the subscription logic is only a fraction of what a Subject can
     * really do. Subjects commonly hold some important business logic, that
     * triggers a notification method whenever something important is about to
     * happen (or after it).
     */
    public someBusinessLogic(): void {
        console.log('\nSubject: I\'m doing something important.');
        this.state = Math.floor(Math.random() * (10 + 1));

        console.log(`Subject: My state has just changed to: ${this.state}`);
        this.notify();
    }
}

/**
 * The Observer interface declares the update method, used by subjects.
 */
interface Observer {
    // Receive update from subject.
    update(subject: Subject): void;
}

/**
 * Concrete Observers react to the updates issued by the Subject they had been
 * attached to.
 */
class ConcreteObserverA implements Observer {
    public update(subject: Subject): void {
        if (subject instanceof ConcreteSubject && subject.state < 3) {
            console.log('ConcreteObserverA: Reacted to the event.');
        }
    }
}

class ConcreteObserverB implements Observer {
    public update(subject: Subject): void {
        if (subject instanceof ConcreteSubject && (subject.state === 0 || subject.state >= 2)) {
            console.log('ConcreteObserverB: Reacted to the event.');
        }
    }
}

/**
 * The client code.
 */

const subject = new ConcreteSubject();

const observer1 = new ConcreteObserverA();
subject.attach(observer1);

const observer2 = new ConcreteObserverB();
subject.attach(observer2);

subject.someBusinessLogic();
subject.someBusinessLogic();

subject.detach(observer2);

subject.someBusinessLogic();
```

## Pairs well with

Mediator (Observer broadcasts; Mediator also routes); Command (commands often emit events through Observer); Memento (
snapshot triggered by state-change observation).

---

<a id="prototype"></a>

# Prototype

## Intent

Prototype is a creational design pattern that lets you copy existing objects without making your code dependent on their
classes.

## Applicability

- Your code must work with objects from third-party code via interfaces, where concrete classes are unknown
- You want to reduce numerous subclasses that differ only in initialization logic
- Creating objects through standard instantiation is complex or expensive
- You need to avoid coupling to concrete class hierarchies when cloning objects
- You want to provide pre-configured object templates for common scenarios

## Pros

- Objects can be duplicated without depending on their specific classes
- Eliminates redundant initialization code by using pre-built prototypes
- Complex objects are created more efficiently
- Provides an alternative to inheritance for handling configuration variations

## Cons

- Cloning objects with circular references presents significant challenges
- Deep copying of complex object graphs can be tricky to implement correctly

## Don't use when

- A plain `structuredClone()` or spread operator does the job → use the built-in
- The object has a constructor you can call → just call it
- Objects are immutable → no need to clone

## TypeScript Example

```typescript
/**
 * The example class that has cloning ability. We'll see how the values of field
 * with different types will be cloned.
 */
class Prototype {
    public primitive: any;
    public component: object;
    public circularReference: ComponentWithBackReference;

    public clone(): this {
        const clone = Object.create(this);

        clone.component = Object.create(this.component);

        // Cloning an object that has a nested object with backreference
        // requires special treatment. After the cloning is completed, the
        // nested object should point to the cloned object, instead of the
        // original object. Spread operator can be handy for this case.
        clone.circularReference = new ComponentWithBackReference(clone);

        return clone;
    }
}

class ComponentWithBackReference {
    public prototype;

    constructor(prototype: Prototype) {
        this.prototype = prototype;
    }
}

/**
 * The client code.
 */
function clientCode() {
    const p1 = new Prototype();
    p1.primitive = 245;
    p1.component = new Date();
    p1.circularReference = new ComponentWithBackReference(p1);

    const p2 = p1.clone();
    if (p1.primitive === p2.primitive) {
        console.log('Primitive field values have been carried over to a clone. Yay!');
    } else {
        console.log('Primitive field values have not been copied. Booo!');
    }
    if (p1.component === p2.component) {
        console.log('Simple component has not been cloned. Booo!');
    } else {
        console.log('Simple component has been cloned. Yay!');
    }

    if (p1.circularReference === p2.circularReference) {
        console.log('Component with back reference has not been cloned. Booo!');
    } else {
        console.log('Component with back reference has been cloned. Yay!');
    }

    if (p1.circularReference.prototype === p2.circularReference.prototype) {
        console.log('Component with back reference is linked to original object. Booo!');
    } else {
        console.log('Component with back reference is linked to the clone. Yay!');
    }
}

clientCode();
```

## Pairs well with

Composite (clone whole composite trees); Memento (memento + prototype = snapshot + restore with structural sharing).

---

<a id="proxy"></a>

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

---

<a id="singleton"></a>

# Singleton

## Intent

Singleton is a creational design pattern that lets you ensure that a class has only one instance, while providing a
global access point to this instance.

## Applicability

- A class should have just one instance available to all clients (e.g. a shared database object across different program
  components)
- You need stricter control over global variables beyond standard practices
- You want to ensure nothing except the class itself can replace a cached instance
- You need to disable all other object creation methods except a special creation method
- Lazy initialization is desirable (object created only when first requested)

## Pros

- Guarantees a class has only a single instance
- Provides a global access point to that instance
- The singleton initializes only when first requested

## Cons

- Violates the Single Responsibility Principle by solving two problems simultaneously
- Can mask poor design when program components have excessive interdependencies
- Requires special handling in multithreaded environments to prevent multiple instantiations
- Difficult to unit test due to private constructors and static method limitations

## Don't use when

- A store slice or DI container would do
- The "singleton" is just stateless utility functions → export functions from a module
- You only need it for convenient access from anywhere → that's a smell, refactor to pass dependencies explicitly
- Tests need to swap implementations → Singleton makes mocking painful

## TypeScript Example

```typescript
/**
 * The Singleton class defines an `instance` getter, that lets clients access
 * the unique singleton instance.
 */
class Singleton {
    static #instance: Singleton;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor() { }

    /**
     * The static getter that controls access to the singleton instance.
     *
     * This implementation allows you to extend the Singleton class while
     * keeping just one instance of each subclass around.
     */
    public static get instance(): Singleton {
        if (!Singleton.#instance) {
            Singleton.#instance = new Singleton();
        }

        return Singleton.#instance;
    }

    /**
     * Finally, any singleton can define some business logic, which can be
     * executed on its instance.
     */
    public someBusinessLogic() {
        // ...
    }
}

/**
 * The client code.
 */
function clientCode() {
    const s1 = Singleton.instance;
    const s2 = Singleton.instance;

    if (s1 === s2) {
        console.log(
            'Singleton works, both variables contain the same instance.'
        );
    } else {
        console.log('Singleton failed, variables contain different instances.');
    }
}

clientCode();
```

## Pairs well with

Registry (Singleton-adjacent — usually preferred over a raw Singleton); Facade (Facades are often instantiated as
singletons by convention).

---

<a id="state"></a>

# State

## Intent

State is a behavioral design pattern that lets an object alter its behavior when its internal state changes. It appears
as if the object changed its class.

## Applicability

- An object behaves differently based on its current state and the number of states is substantial with frequently
  changing state-specific code
- A class contains massive conditionals that alter behavior according to field values
- Similar states and transitions cause duplicate code across a condition-based state machine

## Pros

- Organizes state-related code into separate classes, adhering to Single Responsibility Principle
- Introduces new states without modifying existing state classes or context, following Open/Closed Principle
- Eliminates bulky conditional statements from the context class

## Cons

- May be excessive if the state machine has only a few states or rarely changes

## Don't use when

- Only 2-3 states with minor differences → a simple `state: 'a' | 'b' | 'c'` field with switch is clearer
- States never share a common interface meaningfully → it's not really a state machine
- A `useState` hook or store flag does the job → no class needed

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients. It also maintains a
 * reference to an instance of a State subclass, which represents the current
 * state of the Context.
 */
class Context {
    /**
     * @type {State} A reference to the current state of the Context.
     */
    private state: State;

    constructor(state: State) {
        this.transitionTo(state);
    }

    /**
     * The Context allows changing the State object at runtime.
     */
    public transitionTo(state: State): void {
        console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
        this.state = state;
        this.state.setContext(this);
    }

    /**
     * The Context delegates part of its behavior to the current State object.
     */
    public request1(): void {
        this.state.handle1();
    }

    public request2(): void {
        this.state.handle2();
    }
}

/**
 * The base State class declares methods that all Concrete State should
 * implement and also provides a backreference to the Context object, associated
 * with the State. This backreference can be used by States to transition the
 * Context to another State.
 */
abstract class State {
    protected context: Context;

    public setContext(context: Context) {
        this.context = context;
    }

    public abstract handle1(): void;

    public abstract handle2(): void;
}

/**
 * Concrete States implement various behaviors, associated with a state of the
 * Context.
 */
class ConcreteStateA extends State {
    public handle1(): void {
        console.log('ConcreteStateA handles request1.');
        console.log('ConcreteStateA wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateB());
    }

    public handle2(): void {
        console.log('ConcreteStateA handles request2.');
    }
}

class ConcreteStateB extends State {
    public handle1(): void {
        console.log('ConcreteStateB handles request1.');
    }

    public handle2(): void {
        console.log('ConcreteStateB handles request2.');
        console.log('ConcreteStateB wants to change the state of the context.');
        this.context.transitionTo(new ConcreteStateA());
    }
}

/**
 * The client code.
 */
const context = new Context(new ConcreteStateA());
context.request1();
context.request2();
```

## Pairs well with

Strategy (Strategy is "do this thing different ways"; State is "I am in different modes"); Memento (snapshot state for
undo); Command (commands trigger state transitions).

---

<a id="strategy"></a>

# Strategy

## Intent

Strategy is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate
class, and make their objects interchangeable.

## Applicability

- You need different variations of an algorithm within an object and want runtime switching between them
- You have similar classes differing only in how they execute specific behaviors
- You want to isolate business logic from algorithm implementation details that may be less critical
- Your class contains massive conditionals selecting between algorithm variants
- You want to enable clients to select appropriate algorithms based on their specific needs

## Pros

- Swap algorithms at runtime without modifying the context object
- Isolate algorithm implementation from the code that uses it
- Replace inheritance hierarchies with composition-based design
- Adhere to the Open/Closed Principle by introducing new strategies without changing existing code

## Cons

- Adds unnecessary complexity for programs with few algorithms that rarely change
- Clients must understand strategy differences to select the appropriate one
- Modern functional programming languages reduce the pattern's value through anonymous functions (a function reference
  is a strategy)

## Don't use when

- You only have one algorithm and no plan for a second → just write the function
- The "strategies" are 1-line functions → pass a function instead of building a class hierarchy
- A simple `switch` over 2-3 cases is clearer than 3 strategy classes

## TypeScript Example

```typescript
/**
 * The Context defines the interface of interest to clients.
 */
class Context {
    /**
     * @type {Strategy} The Context maintains a reference to one of the Strategy
     * objects. The Context does not know the concrete class of a strategy. It
     * should work with all strategies via the Strategy interface.
     */
    private strategy: Strategy;

    /**
     * Usually, the Context accepts a strategy through the constructor, but also
     * provides a setter to change it at runtime.
     */
    constructor(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * Usually, the Context allows replacing a Strategy object at runtime.
     */
    public setStrategy(strategy: Strategy) {
        this.strategy = strategy;
    }

    /**
     * The Context delegates some work to the Strategy object instead of
     * implementing multiple versions of the algorithm on its own.
     */
    public doSomeBusinessLogic(): void {
        // ...

        console.log('Context: Sorting data using the strategy (not sure how it\'ll do it)');
        const result = this.strategy.doAlgorithm(['a', 'b', 'c', 'd', 'e']);
        console.log(result.join(','));

        // ...
    }
}

/**
 * The Strategy interface declares operations common to all supported versions
 * of some algorithm.
 */
interface Strategy {
    doAlgorithm(data: string[]): string[];
}

/**
 * Concrete Strategies implement the algorithm while following the base Strategy
 * interface. The interface makes them interchangeable in the Context.
 */
class ConcreteStrategyA implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.sort();
    }
}

class ConcreteStrategyB implements Strategy {
    public doAlgorithm(data: string[]): string[] {
        return data.reverse();
    }
}

/**
 * The client code picks a concrete strategy and passes it to the context.
 */
const context = new Context(new ConcreteStrategyA());
console.log('Client: Strategy is set to normal sorting.');
context.doSomeBusinessLogic();

console.log('');

console.log('Client: Strategy is set to reverse sorting.');
context.setStrategy(new ConcreteStrategyB());
context.doSomeBusinessLogic();
```

## Pairs well with

Factory Method (factory picks the concrete strategy); State (State picks Strategy based on internal mode); Adapter (
kernel/renderer strategies are also adapters over external libraries).

---

<a id="template-method"></a>

# Template Method

## Intent

Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets
subclasses override specific steps of the algorithm without changing its structure.

## Applicability

- Let clients extend only particular steps of an algorithm, not the whole algorithm or its structure
- You have several classes containing nearly identical algorithms with minor variations, reducing the need to modify all
  classes when the algorithm changes
- Pull up common algorithm steps into a superclass while keeping varying implementations in subclasses

## Pros

- Clients can customize only specific parts of a large algorithm, reducing their exposure to unrelated changes
- Duplicate code can be consolidated into the base class
- The algorithm structure remains consistent across all implementations

## Cons

- Some clients may find the provided algorithm skeleton too restrictive
- Subclasses might violate the Liskov Substitution Principle by suppressing default step implementations
- Template methods become increasingly difficult to maintain as the number of steps grows

## Don't use when

- Steps are completely independent → use Strategy instead
- You only have one concrete subclass → just write the algorithm directly
- The "algorithm skeleton" is 3 lines → inheritance is overkill, use a function with callback parameters

## TypeScript Example

```typescript
/**
 * The Abstract Class defines a template method that contains a skeleton of some
 * algorithm, composed of calls to (usually) abstract primitive operations.
 *
 * Concrete subclasses should implement these operations, but leave the template
 * method itself intact.
 */
abstract class AbstractClass {
    /**
     * The template method defines the skeleton of an algorithm.
     */
    public templateMethod(): void {
        this.baseOperation1();
        this.requiredOperations1();
        this.baseOperation2();
        this.hook1();
        this.requiredOperation2();
        this.baseOperation3();
        this.hook2();
    }

    /**
     * These operations already have implementations.
     */
    protected baseOperation1(): void {
        console.log('AbstractClass says: I am doing the bulk of the work');
    }

    protected baseOperation2(): void {
        console.log('AbstractClass says: But I let subclasses override some operations');
    }

    protected baseOperation3(): void {
        console.log('AbstractClass says: But I am doing the bulk of the work anyway');
    }

    /**
     * These operations have to be implemented in subclasses.
     */
    protected abstract requiredOperations1(): void;

    protected abstract requiredOperation2(): void;

    /**
     * These are "hooks." Subclasses may override them, but it's not mandatory
     * since the hooks already have default (but empty) implementation. Hooks
     * provide additional extension points in some crucial places of the
     * algorithm.
     */
    protected hook1(): void { }

    protected hook2(): void { }
}

/**
 * Concrete classes have to implement all abstract operations of the base class.
 */
class ConcreteClass1 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass1 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass1 says: Implemented Operation2');
    }
}

/**
 * Usually, concrete classes override only a fraction of base class' operations.
 */
class ConcreteClass2 extends AbstractClass {
    protected requiredOperations1(): void {
        console.log('ConcreteClass2 says: Implemented Operation1');
    }

    protected requiredOperation2(): void {
        console.log('ConcreteClass2 says: Implemented Operation2');
    }

    protected hook1(): void {
        console.log('ConcreteClass2 says: Overridden Hook1');
    }
}

/**
 * The client code calls the template method to execute the algorithm.
 */
function clientCode(abstractClass: AbstractClass) {
    abstractClass.templateMethod();
}

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass1());
console.log('');

console.log('Same client code can work with different subclasses:');
clientCode(new ConcreteClass2());
```

## Pairs well with

Factory Method (Factory Method is itself a specialization of Template Method); Strategy (Strategy lets you change the
entire algorithm; Template Method only specific steps).

---

<a id="visitor"></a>

# Visitor

## Intent

Visitor is a behavioral design pattern that lets you separate algorithms from the objects on which they operate. This
enables adding new behaviors to object structures without modifying the classes themselves.

## Applicability

- You need to perform operations on all elements of a complex object structure (such as object trees)
- You want to isolate auxiliary behaviors from primary business logic in main classes
- A behavior applies only to certain classes in a hierarchy, not all of them
- You want to avoid modifying existing classes while introducing new functionality

## Pros

- Follows the Open/Closed Principle by enabling new behaviors without changing element classes
- Supports the Single Responsibility Principle by consolidating related behavior variations
- Visitors can accumulate useful information while traversing complex structures

## Cons

- Requires updating all visitor implementations when element classes are added or removed
- Visitors may lack access to private fields and methods of the elements they process

## Don't use when

- The hierarchy has only 2-3 element classes → use a switch or polymorphic method
- You'd be adding a Visitor for a single operation → just add the method to the class
- Element classes change frequently → Visitor maintenance becomes painful
- A discriminated union with `switch` over `kind` field is clearer

## TypeScript Example

```typescript
/**
 * The Component interface declares an `accept` method that should take the base
 * visitor interface as an argument.
 */
interface Component {
    accept(visitor: Visitor): void;
}

/**
 * Each Concrete Component must implement the `accept` method in such a way that
 * it calls the visitor's method corresponding to the component's class.
 */
class ConcreteComponentA implements Component {
    /**
     * Note that we're calling `visitConcreteComponentA`, which matches the
     * current class name. This way we let the visitor know the class of the
     * component it works with.
     */
    public accept(visitor: Visitor): void {
        visitor.visitConcreteComponentA(this);
    }

    /**
     * Concrete Components may have special methods that don't exist in their
     * base class or interface. The Visitor is still able to use these methods
     * since it's aware of the component's concrete class.
     */
    public exclusiveMethodOfConcreteComponentA(): string {
        return 'A';
    }
}

class ConcreteComponentB implements Component {
    /**
     * Same here: visitConcreteComponentB => ConcreteComponentB
     */
    public accept(visitor: Visitor): void {
        visitor.visitConcreteComponentB(this);
    }

    public specialMethodOfConcreteComponentB(): string {
        return 'B';
    }
}

/**
 * The Visitor Interface declares a set of visiting methods that correspond to
 * component classes. The signature of a visiting method allows the visitor to
 * identify the exact class of the component that it's dealing with.
 */
interface Visitor {
    visitConcreteComponentA(element: ConcreteComponentA): void;

    visitConcreteComponentB(element: ConcreteComponentB): void;
}

/**
 * Concrete Visitors implement several versions of the same algorithm, which can
 * work with all concrete component classes.
 */
class ConcreteVisitor1 implements Visitor {
    public visitConcreteComponentA(element: ConcreteComponentA): void {
        console.log(`${element.exclusiveMethodOfConcreteComponentA()} + ConcreteVisitor1`);
    }

    public visitConcreteComponentB(element: ConcreteComponentB): void {
        console.log(`${element.specialMethodOfConcreteComponentB()} + ConcreteVisitor1`);
    }
}

class ConcreteVisitor2 implements Visitor {
    public visitConcreteComponentA(element: ConcreteComponentA): void {
        console.log(`${element.exclusiveMethodOfConcreteComponentA()} + ConcreteVisitor2`);
    }

    public visitConcreteComponentB(element: ConcreteComponentB): void {
        console.log(`${element.specialMethodOfConcreteComponentB()} + ConcreteVisitor2`);
    }
}

/**
 * The client code can run visitor operations over any set of elements without
 * figuring out their concrete classes. The accept operation directs a call to
 * the appropriate operation in the visitor object.
 */
function clientCode(components: Component[], visitor: Visitor) {
    for (const component of components) {
        component.accept(visitor);
    }
}

const components = [
    new ConcreteComponentA(),
    new ConcreteComponentB(),
];

console.log('The client code works with all visitors via the base Visitor interface:');
const visitor1 = new ConcreteVisitor1();
clientCode(components, visitor1);
console.log('');

console.log('It allows the same client code to work with different types of visitors:');
const visitor2 = new ConcreteVisitor2();
clientCode(components, visitor2);
```

## Pairs well with

Composite (Visitor walks Composite trees — the canonical pairing); Iterator (Visitor uses an Iterator to traverse).
