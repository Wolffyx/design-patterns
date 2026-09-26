# Design Patterns — Bundled Catalog

> Generated from `design-patterns` v1.1.0.
> Self-contained markdown — paste into your agent's rules/system-prompt.
> Hooks (Pattern Check enforcement) are Claude Code-only and not included here.

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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | an object of factory functions per family: `{ button: () => …, checkbox: () => … }` |
| Python | one module per family, or a dict of callables selected once at startup |
| Java | a record of `Supplier`s, or an interface with default methods |
| C# | a record of `Func<>` delegates, or one interface registered per family in DI |
| Go | a struct of `func` fields |
| C++ | a struct of `std::function`s, or a template policy parameter chosen at compile time |
| Rust | a trait with associated types, passed as a generic `F: Factory` |

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

## Python Example

```python
from abc import ABC, abstractmethod


class AbstractProductA(ABC):
    @abstractmethod
    def useful_function_a(self) -> str:
        pass


class AbstractProductB(ABC):
    @abstractmethod
    def useful_function_b(self) -> str:
        pass

    @abstractmethod
    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        pass


class ConcreteProductA1(AbstractProductA):
    def useful_function_a(self) -> str:
        return "The result of the product A1."


class ConcreteProductA2(AbstractProductA):
    def useful_function_a(self) -> str:
        return "The result of the product A2."


class ConcreteProductB1(AbstractProductB):
    def useful_function_b(self) -> str:
        return "The result of the product B1."

    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        result = collaborator.useful_function_a()
        return f"The result of the B1 collaborating with the ({result})"


class ConcreteProductB2(AbstractProductB):
    def useful_function_b(self) -> str:
        return "The result of the product B2."

    def another_useful_function_b(self, collaborator: AbstractProductA) -> str:
        result = collaborator.useful_function_a()
        return f"The result of the B2 collaborating with the ({result})"


class AbstractFactory(ABC):
    @abstractmethod
    def create_product_a(self) -> AbstractProductA:
        pass

    @abstractmethod
    def create_product_b(self) -> AbstractProductB:
        pass


class ConcreteFactory1(AbstractFactory):
    def create_product_a(self) -> AbstractProductA:
        return ConcreteProductA1()

    def create_product_b(self) -> AbstractProductB:
        return ConcreteProductB1()


class ConcreteFactory2(AbstractFactory):
    def create_product_a(self) -> AbstractProductA:
        return ConcreteProductA2()

    def create_product_b(self) -> AbstractProductB:
        return ConcreteProductB2()


def client_code(factory: AbstractFactory) -> None:
    product_a = factory.create_product_a()
    product_b = factory.create_product_b()
    print(product_b.useful_function_b())
    print(product_b.another_useful_function_b(product_a))


if __name__ == "__main__":
    print("Client: Testing client code with the first factory type...")
    client_code(ConcreteFactory1())
    print()
    print("Client: Testing the same client code with the second factory type...")
    client_code(ConcreteFactory2())
```

## Java Example

```java
// Each distinct product of a family has a base interface.
interface AbstractProductA {
    String usefulFunctionA();
}

interface AbstractProductB {
    String usefulFunctionB();
    String anotherUsefulFunctionB(AbstractProductA collaborator);
}

class ConcreteProductA1 implements AbstractProductA {
    public String usefulFunctionA() {
        return "The result of the product A1.";
    }
}

class ConcreteProductA2 implements AbstractProductA {
    public String usefulFunctionA() {
        return "The result of the product A2.";
    }
}

class ConcreteProductB1 implements AbstractProductB {
    public String usefulFunctionB() {
        return "The result of the product B1.";
    }
    public String anotherUsefulFunctionB(AbstractProductA collaborator) {
        return "The result of the B1 collaborating with the (" + collaborator.usefulFunctionA() + ")";
    }
}

class ConcreteProductB2 implements AbstractProductB {
    public String usefulFunctionB() {
        return "The result of the product B2.";
    }
    public String anotherUsefulFunctionB(AbstractProductA collaborator) {
        return "The result of the B2 collaborating with the (" + collaborator.usefulFunctionA() + ")";
    }
}

// The Abstract Factory declares methods that return each abstract product.
interface AbstractFactory {
    AbstractProductA createProductA();
    AbstractProductB createProductB();
}

class ConcreteFactory1 implements AbstractFactory {
    public AbstractProductA createProductA() {
        return new ConcreteProductA1();
    }
    public AbstractProductB createProductB() {
        return new ConcreteProductB1();
    }
}

class ConcreteFactory2 implements AbstractFactory {
    public AbstractProductA createProductA() {
        return new ConcreteProductA2();
    }
    public AbstractProductB createProductB() {
        return new ConcreteProductB2();
    }
}

public class Demo {
    static void clientCode(AbstractFactory factory) {
        AbstractProductA productA = factory.createProductA();
        AbstractProductB productB = factory.createProductB();
        System.out.println(productB.usefulFunctionB());
        System.out.println(productB.anotherUsefulFunctionB(productA));
    }

    public static void main(String[] args) {
        System.out.println("Client: Testing client code with the first factory type...");
        clientCode(new ConcreteFactory1());
        System.out.println();
        System.out.println("Client: Testing the same client code with the second factory type...");
        clientCode(new ConcreteFactory2());
    }
}
```

## C# Example

```csharp
using System;

// Each distinct product of a family has a base interface.
public interface IAbstractProductA
{
    string UsefulFunctionA();
}

public interface IAbstractProductB
{
    string UsefulFunctionB();
    string AnotherUsefulFunctionB(IAbstractProductA collaborator);
}

public class ConcreteProductA1 : IAbstractProductA
{
    public string UsefulFunctionA() => "The result of the product A1.";
}

public class ConcreteProductA2 : IAbstractProductA
{
    public string UsefulFunctionA() => "The result of the product A2.";
}

public class ConcreteProductB1 : IAbstractProductB
{
    public string UsefulFunctionB() => "The result of the product B1.";
    public string AnotherUsefulFunctionB(IAbstractProductA collaborator) =>
        "The result of the B1 collaborating with the (" + collaborator.UsefulFunctionA() + ")";
}

public class ConcreteProductB2 : IAbstractProductB
{
    public string UsefulFunctionB() => "The result of the product B2.";
    public string AnotherUsefulFunctionB(IAbstractProductA collaborator) =>
        "The result of the B2 collaborating with the (" + collaborator.UsefulFunctionA() + ")";
}

// The Abstract Factory declares methods that return each abstract product.
public interface IAbstractFactory
{
    IAbstractProductA CreateProductA();
    IAbstractProductB CreateProductB();
}

public class ConcreteFactory1 : IAbstractFactory
{
    public IAbstractProductA CreateProductA() => new ConcreteProductA1();
    public IAbstractProductB CreateProductB() => new ConcreteProductB1();
}

public class ConcreteFactory2 : IAbstractFactory
{
    public IAbstractProductA CreateProductA() => new ConcreteProductA2();
    public IAbstractProductB CreateProductB() => new ConcreteProductB2();
}

public class Program
{
    static void ClientCode(IAbstractFactory factory)
    {
        var productA = factory.CreateProductA();
        var productB = factory.CreateProductB();
        Console.WriteLine(productB.UsefulFunctionB());
        Console.WriteLine(productB.AnotherUsefulFunctionB(productA));
    }

    public static void Main()
    {
        Console.WriteLine("Client: Testing client code with the first factory type...");
        ClientCode(new ConcreteFactory1());
        Console.WriteLine();
        Console.WriteLine("Client: Testing the same client code with the second factory type...");
        ClientCode(new ConcreteFactory2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Each distinct product of a family has a base interface.
type AbstractProductA interface {
	UsefulFunctionA() string
}

type AbstractProductB interface {
	UsefulFunctionB() string
	AnotherUsefulFunctionB(collaborator AbstractProductA) string
}

type ConcreteProductA1 struct{}

func (p *ConcreteProductA1) UsefulFunctionA() string { return "The result of the product A1." }

type ConcreteProductA2 struct{}

func (p *ConcreteProductA2) UsefulFunctionA() string { return "The result of the product A2." }

type ConcreteProductB1 struct{}

func (p *ConcreteProductB1) UsefulFunctionB() string { return "The result of the product B1." }
func (p *ConcreteProductB1) AnotherUsefulFunctionB(c AbstractProductA) string {
	return "The result of the B1 collaborating with the (" + c.UsefulFunctionA() + ")"
}

type ConcreteProductB2 struct{}

func (p *ConcreteProductB2) UsefulFunctionB() string { return "The result of the product B2." }
func (p *ConcreteProductB2) AnotherUsefulFunctionB(c AbstractProductA) string {
	return "The result of the B2 collaborating with the (" + c.UsefulFunctionA() + ")"
}

// AbstractFactory declares methods that return each abstract product.
type AbstractFactory interface {
	CreateProductA() AbstractProductA
	CreateProductB() AbstractProductB
}

type ConcreteFactory1 struct{}

func (f *ConcreteFactory1) CreateProductA() AbstractProductA { return &ConcreteProductA1{} }
func (f *ConcreteFactory1) CreateProductB() AbstractProductB { return &ConcreteProductB1{} }

type ConcreteFactory2 struct{}

func (f *ConcreteFactory2) CreateProductA() AbstractProductA { return &ConcreteProductA2{} }
func (f *ConcreteFactory2) CreateProductB() AbstractProductB { return &ConcreteProductB2{} }

func clientCode(factory AbstractFactory) {
	productA := factory.CreateProductA()
	productB := factory.CreateProductB()
	fmt.Println(productB.UsefulFunctionB())
	fmt.Println(productB.AnotherUsefulFunctionB(productA))
}

func main() {
	fmt.Println("Client: Testing client code with the first factory type...")
	clientCode(&ConcreteFactory1{})
	fmt.Println()
	fmt.Println("Client: Testing the same client code with the second factory type...")
	clientCode(&ConcreteFactory2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// Each distinct product of a family has a base interface.
class AbstractProductA {
public:
    virtual ~AbstractProductA() = default;
    virtual std::string usefulFunctionA() const = 0;
};

class ConcreteProductA1 : public AbstractProductA {
public:
    std::string usefulFunctionA() const override { return "The result of the product A1."; }
};

class ConcreteProductA2 : public AbstractProductA {
public:
    std::string usefulFunctionA() const override { return "The result of the product A2."; }
};

class AbstractProductB {
public:
    virtual ~AbstractProductB() = default;
    virtual std::string usefulFunctionB() const = 0;
    virtual std::string anotherUsefulFunctionB(const AbstractProductA& collaborator) const = 0;
};

class ConcreteProductB1 : public AbstractProductB {
public:
    std::string usefulFunctionB() const override { return "The result of the product B1."; }
    std::string anotherUsefulFunctionB(const AbstractProductA& c) const override {
        return "The result of the B1 collaborating with the (" + c.usefulFunctionA() + ")";
    }
};

class ConcreteProductB2 : public AbstractProductB {
public:
    std::string usefulFunctionB() const override { return "The result of the product B2."; }
    std::string anotherUsefulFunctionB(const AbstractProductA& c) const override {
        return "The result of the B2 collaborating with the (" + c.usefulFunctionA() + ")";
    }
};

// The Abstract Factory declares methods that return each abstract product.
class AbstractFactory {
public:
    virtual ~AbstractFactory() = default;
    virtual std::unique_ptr<AbstractProductA> createProductA() const = 0;
    virtual std::unique_ptr<AbstractProductB> createProductB() const = 0;
};

class ConcreteFactory1 : public AbstractFactory {
public:
    std::unique_ptr<AbstractProductA> createProductA() const override {
        return std::make_unique<ConcreteProductA1>();
    }
    std::unique_ptr<AbstractProductB> createProductB() const override {
        return std::make_unique<ConcreteProductB1>();
    }
};

class ConcreteFactory2 : public AbstractFactory {
public:
    std::unique_ptr<AbstractProductA> createProductA() const override {
        return std::make_unique<ConcreteProductA2>();
    }
    std::unique_ptr<AbstractProductB> createProductB() const override {
        return std::make_unique<ConcreteProductB2>();
    }
};

void clientCode(const AbstractFactory& factory) {
    auto productA = factory.createProductA();
    auto productB = factory.createProductB();
    std::cout << productB->usefulFunctionB() << "\n";
    std::cout << productB->anotherUsefulFunctionB(*productA) << "\n";
}

int main() {
    std::cout << "Client: Testing client code with the first factory type...\n";
    clientCode(ConcreteFactory1());
    std::cout << "\n";
    std::cout << "Client: Testing the same client code with the second factory type...\n";
    clientCode(ConcreteFactory2());
    return 0;
}
```

## Rust Example

```rust
// Each distinct product of a family has a base trait.
trait AbstractProductA {
    fn useful_function_a(&self) -> String;
}

trait AbstractProductB {
    fn useful_function_b(&self) -> String;
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String;
}

struct ConcreteProductA1;
impl AbstractProductA for ConcreteProductA1 {
    fn useful_function_a(&self) -> String {
        "The result of the product A1.".to_string()
    }
}

struct ConcreteProductA2;
impl AbstractProductA for ConcreteProductA2 {
    fn useful_function_a(&self) -> String {
        "The result of the product A2.".to_string()
    }
}

struct ConcreteProductB1;
impl AbstractProductB for ConcreteProductB1 {
    fn useful_function_b(&self) -> String {
        "The result of the product B1.".to_string()
    }
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String {
        format!(
            "The result of the B1 collaborating with the ({})",
            collaborator.useful_function_a()
        )
    }
}

struct ConcreteProductB2;
impl AbstractProductB for ConcreteProductB2 {
    fn useful_function_b(&self) -> String {
        "The result of the product B2.".to_string()
    }
    fn another_useful_function_b(&self, collaborator: &dyn AbstractProductA) -> String {
        format!(
            "The result of the B2 collaborating with the ({})",
            collaborator.useful_function_a()
        )
    }
}

// The Abstract Factory declares methods that return each abstract product.
trait AbstractFactory {
    fn create_product_a(&self) -> Box<dyn AbstractProductA>;
    fn create_product_b(&self) -> Box<dyn AbstractProductB>;
}

struct ConcreteFactory1;
impl AbstractFactory for ConcreteFactory1 {
    fn create_product_a(&self) -> Box<dyn AbstractProductA> { Box::new(ConcreteProductA1) }
    fn create_product_b(&self) -> Box<dyn AbstractProductB> { Box::new(ConcreteProductB1) }
}

struct ConcreteFactory2;
impl AbstractFactory for ConcreteFactory2 {
    fn create_product_a(&self) -> Box<dyn AbstractProductA> { Box::new(ConcreteProductA2) }
    fn create_product_b(&self) -> Box<dyn AbstractProductB> { Box::new(ConcreteProductB2) }
}

fn client_code(factory: &dyn AbstractFactory) {
    let product_a = factory.create_product_a();
    let product_b = factory.create_product_b();
    println!("{}", product_b.useful_function_b());
    println!("{}", product_b.another_useful_function_b(product_a.as_ref()));
}

fn main() {
    println!("Client: Testing client code with the first factory type...");
    client_code(&ConcreteFactory1);
    println!();
    println!("Client: Testing the same client code with the second factory type...");
    client_code(&ConcreteFactory2);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a function mapping one shape to the other, or an object literal that satisfies the interface |
| Python | a small function or wrapper — duck typing often needs no adapter at all |
| Java | a lambda when the target is a functional interface |
| C# | an extension method, or a lambda converted to the target delegate |
| Go | a func-type adapter (like `http.HandlerFunc`); implicit interfaces often need nothing |
| C++ | a lambda or `std::function`; a template adapter for static dispatch |
| Rust | a newtype `struct W(T)` with `impl Trait for W`, or `From` / `Into` |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Target(ABC):
    """The domain-specific interface used by the client code."""

    @abstractmethod
    def request(self) -> str:
        ...


class DefaultTarget(Target):
    def request(self) -> str:
        return "Target: The default target's behavior."


class Adaptee:
    """Useful behavior with an interface incompatible with the client."""

    def specific_request(self) -> str:
        return ".eetpadA eht fo roivaheb laicepS"


class Adapter(Target):
    """Makes the Adaptee's interface compatible with the Target's."""

    def __init__(self, adaptee: Adaptee):
        self._adaptee = adaptee

    def request(self) -> str:
        result = self._adaptee.specific_request()[::-1]
        return f"Adapter: (TRANSLATED) {result}"


def client_code(target: Target) -> None:
    print(target.request())


if __name__ == "__main__":
    print("Client: I can work just fine with the Target objects:")
    client_code(DefaultTarget())
    print()

    adaptee = Adaptee()
    print("Client: The Adaptee class has a weird interface. See, I don't understand it:")
    print(f"Adaptee: {adaptee.specific_request()}")
    print()

    print("Client: But I can work with it via the Adapter:")
    client_code(Adapter(adaptee))
```

## Java Example

```java
interface Target {
    // The domain-specific interface used by the client code.
    String request();
}

class DefaultTarget implements Target {
    public String request() {
        return "Target: The default target's behavior.";
    }
}

// Useful behavior with an interface incompatible with the client.
class Adaptee {
    public String specificRequest() {
        return ".eetpadA eht fo roivaheb laicepS";
    }
}

// Makes the Adaptee's interface compatible with the Target's.
class Adapter implements Target {
    private final Adaptee adaptee;

    public Adapter(Adaptee adaptee) {
        this.adaptee = adaptee;
    }

    public String request() {
        String result = new StringBuilder(adaptee.specificRequest()).reverse().toString();
        return "Adapter: (TRANSLATED) " + result;
    }
}

public class Demo {
    static void clientCode(Target target) {
        System.out.println(target.request());
    }

    public static void main(String[] args) {
        System.out.println("Client: I can work just fine with the Target objects:");
        clientCode(new DefaultTarget());
        System.out.println();

        Adaptee adaptee = new Adaptee();
        System.out.println("Client: The Adaptee class has a weird interface. See, I don't understand it:");
        System.out.println("Adaptee: " + adaptee.specificRequest());
        System.out.println();

        System.out.println("Client: But I can work with it via the Adapter:");
        clientCode(new Adapter(adaptee));
    }
}
```

## C# Example

```csharp
using System;
using System.Linq;

// The domain-specific interface used by the client code.
interface ITarget
{
    string Request();
}

class DefaultTarget : ITarget
{
    public string Request() => "Target: The default target's behavior.";
}

// Useful behavior with an interface incompatible with the client.
class Adaptee
{
    public string SpecificRequest() => ".eetpadA eht fo roivaheb laicepS";
}

// Makes the Adaptee's interface compatible with the Target's.
class Adapter : ITarget
{
    private readonly Adaptee _adaptee;

    public Adapter(Adaptee adaptee) => _adaptee = adaptee;

    public string Request()
    {
        var result = new string(_adaptee.SpecificRequest().Reverse().ToArray());
        return $"Adapter: (TRANSLATED) {result}";
    }
}

public class Program
{
    static void ClientCode(ITarget target) => Console.WriteLine(target.Request());

    public static void Main()
    {
        Console.WriteLine("Client: I can work just fine with the Target objects:");
        ClientCode(new DefaultTarget());
        Console.WriteLine();

        var adaptee = new Adaptee();
        Console.WriteLine("Client: The Adaptee class has a weird interface. See, I don't understand it:");
        Console.WriteLine($"Adaptee: {adaptee.SpecificRequest()}");
        Console.WriteLine();

        Console.WriteLine("Client: But I can work with it via the Adapter:");
        ClientCode(new Adapter(adaptee));
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"strings"
)

// Target is the domain-specific interface used by the client code.
type Target interface {
	Request() string
}

type DefaultTarget struct{}

func (t *DefaultTarget) Request() string {
	return "Target: The default target's behavior."
}

// Adaptee has useful behavior but an incompatible interface.
type Adaptee struct{}

func (a *Adaptee) SpecificRequest() string {
	return ".eetpadA eht fo roivaheb laicepS"
}

// Adapter makes the Adaptee's interface compatible with Target.
type Adapter struct {
	adaptee *Adaptee
}

func (a *Adapter) Request() string {
	runes := []rune(a.adaptee.SpecificRequest())
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return fmt.Sprintf("Adapter: (TRANSLATED) %s", string(runes))
}

func clientCode(target Target) {
	fmt.Println(target.Request())
}

func main() {
	fmt.Println("Client: I can work just fine with the Target objects:")
	clientCode(&DefaultTarget{})
	fmt.Println()

	adaptee := &Adaptee{}
	fmt.Println("Client: The Adaptee class has a weird interface. See, I don't understand it:")
	fmt.Printf("Adaptee: %s\n", adaptee.SpecificRequest())
	fmt.Println()

	fmt.Println("Client: But I can work with it via the Adapter:")
	clientCode(&Adapter{adaptee: adaptee})
	_ = strings.TrimSpace
}
```

## C++ Example

```cpp
#include <algorithm>
#include <iostream>
#include <memory>
#include <string>

// The domain-specific interface used by the client code.
class Target {
public:
    virtual ~Target() = default;
    virtual std::string request() const {
        return "Target: The default target's behavior.";
    }
};

// Useful behavior with an interface incompatible with the client.
class Adaptee {
public:
    std::string specificRequest() const {
        return ".eetpadA eht fo roivaheb laicepS";
    }
};

// Makes the Adaptee's interface compatible with the Target's.
class Adapter : public Target {
private:
    std::shared_ptr<Adaptee> adaptee_;

public:
    explicit Adapter(std::shared_ptr<Adaptee> adaptee) : adaptee_(std::move(adaptee)) {}

    std::string request() const override {
        std::string result = adaptee_->specificRequest();
        std::reverse(result.begin(), result.end());
        return "Adapter: (TRANSLATED) " + result;
    }
};

void clientCode(const Target& target) {
    std::cout << target.request() << "\n";
}

int main() {
    std::cout << "Client: I can work just fine with the Target objects:\n";
    Target target;
    clientCode(target);
    std::cout << "\n";

    auto adaptee = std::make_shared<Adaptee>();
    std::cout << "Client: The Adaptee class has a weird interface. See, I don't understand it:\n";
    std::cout << "Adaptee: " << adaptee->specificRequest() << "\n\n";

    std::cout << "Client: But I can work with it via the Adapter:\n";
    Adapter adapter(adaptee);
    clientCode(adapter);
}
```

## Rust Example

```rust
// Target is the domain-specific interface used by the client code.
trait Target {
    fn request(&self) -> String;
}

struct DefaultTarget;

impl Target for DefaultTarget {
    fn request(&self) -> String {
        String::from("Target: The default target's behavior.")
    }
}

// Adaptee has useful behavior but an incompatible interface.
struct Adaptee;

impl Adaptee {
    fn specific_request(&self) -> String {
        String::from(".eetpadA eht fo roivaheb laicepS")
    }
}

// Adapter makes the Adaptee's interface compatible with Target.
struct Adapter {
    adaptee: Adaptee,
}

impl Target for Adapter {
    fn request(&self) -> String {
        let result: String = self.adaptee.specific_request().chars().rev().collect();
        format!("Adapter: (TRANSLATED) {}", result)
    }
}

fn client_code(target: &dyn Target) {
    println!("{}", target.request());
}

fn main() {
    println!("Client: I can work just fine with the Target objects:");
    client_code(&DefaultTarget);
    println!();

    let adaptee = Adaptee;
    println!("Client: The Adaptee class has a weird interface. See, I don't understand it:");
    println!("Adaptee: {}", adaptee.specific_request());
    println!();

    println!("Client: But I can work with it via the Adapter:");
    client_code(&Adapter { adaptee });
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | inject the implementation object in the constructor — it's composition + an interface |
| Python | pass the implementation (or a callable) as a constructor argument |
| Java | an interface field injected through the constructor |
| C# | an interface injected through the constructor / DI |
| Go | a struct field of interface type |
| C++ | pimpl, or a template parameter (static bridge) |
| Rust | a generic `struct Shape<R: Renderer>` or a `Box<dyn Renderer>` field |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Implementation(ABC):
    """
    The Implementation defines the interface for all implementation classes. It
    doesn't have to match the Abstraction's interface. In fact, the two
    interfaces can be entirely different. Typically the Implementation interface
    provides only primitive operations, while the Abstraction defines higher-
    level operations based on those primitives.
    """

    @abstractmethod
    def operation_implementation(self) -> str:
        pass


class Abstraction:
    """
    The Abstraction defines the interface for the "control" part of the two
    class hierarchies. It maintains a reference to an object of the
    Implementation hierarchy and delegates all of the real work to this object.
    """

    def __init__(self, implementation: Implementation) -> None:
        self.implementation = implementation

    def operation(self) -> str:
        result = self.implementation.operation_implementation()
        return f"Abstraction: Base operation with:\n{result}"


class ExtendedAbstraction(Abstraction):
    """
    You can extend the Abstraction without changing the Implementation classes.
    """

    def operation(self) -> str:
        result = self.implementation.operation_implementation()
        return f"ExtendedAbstraction: Extended operation with:\n{result}"


class ConcreteImplementationA(Implementation):
    def operation_implementation(self) -> str:
        return "ConcreteImplementationA: Here's the result on the platform A."


class ConcreteImplementationB(Implementation):
    def operation_implementation(self) -> str:
        return "ConcreteImplementationB: Here's the result on the platform B."


def client_code(abstraction: Abstraction) -> None:
    """
    Except for the initialization phase, the client code should only depend on
    the Abstraction class.
    """
    print(abstraction.operation())


if __name__ == "__main__":
    implementation = ConcreteImplementationA()
    abstraction = Abstraction(implementation)
    client_code(abstraction)

    print("")

    implementation = ConcreteImplementationB()
    abstraction = ExtendedAbstraction(implementation)
    client_code(abstraction)
```

## Java Example

```java
// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
interface Implementation {
    String operationImplementation();
}

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It maintains a reference to an Implementation object and
// delegates all of the real work to this object.
class Abstraction {
    protected Implementation implementation;

    public Abstraction(Implementation implementation) {
        this.implementation = implementation;
    }

    public String operation() {
        return "Abstraction: Base operation with:\n" +
                implementation.operationImplementation();
    }
}

// You can extend the Abstraction without changing the Implementation classes.
class ExtendedAbstraction extends Abstraction {
    public ExtendedAbstraction(Implementation implementation) {
        super(implementation);
    }

    @Override
    public String operation() {
        return "ExtendedAbstraction: Extended operation with:\n" +
                implementation.operationImplementation();
    }
}

class ConcreteImplementationA implements Implementation {
    @Override
    public String operationImplementation() {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
}

class ConcreteImplementationB implements Implementation {
    @Override
    public String operationImplementation() {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
public class Demo {
    static void clientCode(Abstraction abstraction) {
        System.out.println(abstraction.operation());
    }

    public static void main(String[] args) {
        Implementation implementation = new ConcreteImplementationA();
        Abstraction abstraction = new Abstraction(implementation);
        clientCode(abstraction);

        System.out.println();

        implementation = new ConcreteImplementationB();
        abstraction = new ExtendedAbstraction(implementation);
        clientCode(abstraction);
    }
}
```

## C# Example

```csharp
using System;

// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
public interface IImplementation
{
    string OperationImplementation();
}

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It maintains a reference to an Implementation object and
// delegates all of the real work to this object.
public class Abstraction
{
    protected IImplementation _implementation;

    public Abstraction(IImplementation implementation)
    {
        _implementation = implementation;
    }

    public virtual string Operation()
    {
        return "Abstraction: Base operation with:\n" +
            _implementation.OperationImplementation();
    }
}

// You can extend the Abstraction without changing the Implementation classes.
public class ExtendedAbstraction : Abstraction
{
    public ExtendedAbstraction(IImplementation implementation)
        : base(implementation)
    {
    }

    public override string Operation()
    {
        return "ExtendedAbstraction: Extended operation with:\n" +
            _implementation.OperationImplementation();
    }
}

public class ConcreteImplementationA : IImplementation
{
    public string OperationImplementation()
    {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
}

public class ConcreteImplementationB : IImplementation
{
    public string OperationImplementation()
    {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
public class Demo
{
    static void ClientCode(Abstraction abstraction)
    {
        Console.WriteLine(abstraction.Operation());
    }

    public static void Main(string[] args)
    {
        IImplementation implementation = new ConcreteImplementationA();
        Abstraction abstraction = new Abstraction(implementation);
        ClientCode(abstraction);

        Console.WriteLine();

        implementation = new ConcreteImplementationB();
        abstraction = new ExtendedAbstraction(implementation);
        ClientCode(abstraction);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
type Implementation interface {
	OperationImplementation() string
}

// Abstraction defines the interface for the "control" part of the two class
// hierarchies. It holds a reference to an Implementation and delegates all of
// the real work to it.
type Abstraction struct {
	implementation Implementation
}

func (a *Abstraction) Operation() string {
	return "Abstraction: Base operation with:\n" +
		a.implementation.OperationImplementation()
}

// ExtendedAbstraction extends the Abstraction without changing implementations.
type ExtendedAbstraction struct {
	Abstraction
}

func (a *ExtendedAbstraction) Operation() string {
	return "ExtendedAbstraction: Extended operation with:\n" +
		a.implementation.OperationImplementation()
}

type ConcreteImplementationA struct{}

func (c *ConcreteImplementationA) OperationImplementation() string {
	return "ConcreteImplementationA: Here's the result on the platform A."
}

type ConcreteImplementationB struct{}

func (c *ConcreteImplementationB) OperationImplementation() string {
	return "ConcreteImplementationB: Here's the result on the platform B."
}

// Operationer captures the shared behavior so the client can accept either
// abstraction variant.
type Operationer interface {
	Operation() string
}

// clientCode should only depend on the Abstraction's behavior.
func clientCode(a Operationer) {
	fmt.Println(a.Operation())
}

func main() {
	implementation := &ConcreteImplementationA{}
	abstraction := &Abstraction{implementation: implementation}
	clientCode(abstraction)

	fmt.Println("")

	implementationB := &ConcreteImplementationB{}
	extended := &ExtendedAbstraction{Abstraction{implementation: implementationB}}
	clientCode(extended)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Implementation defines the interface for all implementation classes. It
// doesn't have to match the Abstraction's interface. Typically it provides only
// primitive operations, while the Abstraction defines higher-level operations.
class Implementation {
public:
    virtual ~Implementation() = default;
    virtual std::string OperationImplementation() const = 0;
};

// The Abstraction defines the interface for the "control" part of the two class
// hierarchies. It holds a reference to an Implementation and delegates all of
// the real work to it.
class Abstraction {
protected:
    std::shared_ptr<Implementation> implementation_;

public:
    explicit Abstraction(std::shared_ptr<Implementation> implementation)
        : implementation_(std::move(implementation)) {}
    virtual ~Abstraction() = default;

    virtual std::string Operation() const {
        return "Abstraction: Base operation with:\n" +
               implementation_->OperationImplementation();
    }
};

// You can extend the Abstraction without changing the Implementation classes.
class ExtendedAbstraction : public Abstraction {
public:
    using Abstraction::Abstraction;

    std::string Operation() const override {
        return "ExtendedAbstraction: Extended operation with:\n" +
               implementation_->OperationImplementation();
    }
};

class ConcreteImplementationA : public Implementation {
public:
    std::string OperationImplementation() const override {
        return "ConcreteImplementationA: Here's the result on the platform A.";
    }
};

class ConcreteImplementationB : public Implementation {
public:
    std::string OperationImplementation() const override {
        return "ConcreteImplementationB: Here's the result on the platform B.";
    }
};

// Except for the initialization phase, the client code should only depend on
// the Abstraction class.
void ClientCode(const Abstraction& abstraction) {
    std::cout << abstraction.Operation() << "\n";
}

int main() {
    auto implementationA = std::make_shared<ConcreteImplementationA>();
    Abstraction abstraction(implementationA);
    ClientCode(abstraction);

    std::cout << "\n";

    auto implementationB = std::make_shared<ConcreteImplementationB>();
    ExtendedAbstraction extended(implementationB);
    ClientCode(extended);

    return 0;
}
```

## Rust Example

```rust
// The Implementation trait defines the interface for all implementation types.
// It doesn't have to match the Abstraction's interface. Typically it provides
// only primitive operations, while the Abstraction defines higher-level ones.
trait Implementation {
    fn operation_implementation(&self) -> String;
}

struct ConcreteImplementationA;

impl Implementation for ConcreteImplementationA {
    fn operation_implementation(&self) -> String {
        String::from("ConcreteImplementationA: Here's the result on the platform A.")
    }
}

struct ConcreteImplementationB;

impl Implementation for ConcreteImplementationB {
    fn operation_implementation(&self) -> String {
        String::from("ConcreteImplementationB: Here's the result on the platform B.")
    }
}

// The Abstraction trait defines the "control" part of the two hierarchies.
trait Abstraction {
    fn operation(&self) -> String;
}

// The base Abstraction holds a reference to an Implementation and delegates the
// real work to it.
struct BaseAbstraction {
    implementation: Box<dyn Implementation>,
}

impl Abstraction for BaseAbstraction {
    fn operation(&self) -> String {
        format!(
            "Abstraction: Base operation with:\n{}",
            self.implementation.operation_implementation()
        )
    }
}

// You can extend the Abstraction without changing the Implementation types.
struct ExtendedAbstraction {
    implementation: Box<dyn Implementation>,
}

impl Abstraction for ExtendedAbstraction {
    fn operation(&self) -> String {
        format!(
            "ExtendedAbstraction: Extended operation with:\n{}",
            self.implementation.operation_implementation()
        )
    }
}

// Except for the initialization phase, the client code should only depend on
// the Abstraction trait.
fn client_code(abstraction: &dyn Abstraction) {
    println!("{}", abstraction.operation());
}

fn main() {
    let abstraction = BaseAbstraction {
        implementation: Box::new(ConcreteImplementationA),
    };
    client_code(&abstraction);

    println!();

    let abstraction = ExtendedAbstraction {
        implementation: Box::new(ConcreteImplementationB),
    };
    client_code(&abstraction);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | an options object merged with defaults: `{ ...defaults, ...opts }` |
| Python | keyword arguments with defaults; `dataclasses.replace` for variants |
| Java | records + static factories; hand-write a Builder only for >4 optional params |
| C# | object initializers `new X { A = 1 }`, named/optional params, `with` on records |
| Go | functional options: `New(addr, WithTimeout(5*time.Second))` |
| C++ | designated initializers on an aggregate struct (C++20) |
| Rust | struct update syntax `X { a: 1, ..Default::default() }` |

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

## Python Example

```python
from abc import ABC, abstractmethod
from typing import List


class Product1:
    """The complex object under construction."""

    def __init__(self) -> None:
        self.parts: List[str] = []

    def list_parts(self) -> None:
        print(f"Product parts: {', '.join(self.parts)}\n")


class Builder(ABC):
    @abstractmethod
    def produce_part_a(self) -> None:
        pass

    @abstractmethod
    def produce_part_b(self) -> None:
        pass

    @abstractmethod
    def produce_part_c(self) -> None:
        pass


class ConcreteBuilder1(Builder):
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._product = Product1()

    def produce_part_a(self) -> None:
        self._product.parts.append("PartA1")

    def produce_part_b(self) -> None:
        self._product.parts.append("PartB1")

    def produce_part_c(self) -> None:
        self._product.parts.append("PartC1")

    def get_product(self) -> Product1:
        product = self._product
        self.reset()
        return product


class Director:
    """Executes the building steps in a particular sequence."""

    def __init__(self) -> None:
        self._builder: Builder = None

    def set_builder(self, builder: Builder) -> None:
        self._builder = builder

    def build_minimal_viable_product(self) -> None:
        self._builder.produce_part_a()

    def build_full_featured_product(self) -> None:
        self._builder.produce_part_a()
        self._builder.produce_part_b()
        self._builder.produce_part_c()


def client_code(director: Director) -> None:
    builder = ConcreteBuilder1()
    director.set_builder(builder)

    print("Standard basic product:")
    director.build_minimal_viable_product()
    builder.get_product().list_parts()

    print("Standard full featured product:")
    director.build_full_featured_product()
    builder.get_product().list_parts()

    # The Builder pattern can be used without a Director class.
    print("Custom product:")
    builder.produce_part_a()
    builder.produce_part_c()
    builder.get_product().list_parts()


if __name__ == "__main__":
    client_code(Director())
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;

// The complex object under construction.
class Product1 {
    public List<String> parts = new ArrayList<>();

    public void listParts() {
        System.out.println("Product parts: " + String.join(", ", parts) + "\n");
    }
}

// The Builder interface specifies methods for creating the parts of a product.
interface Builder {
    void producePartA();
    void producePartB();
    void producePartC();
}

class ConcreteBuilder1 implements Builder {
    private Product1 product;

    public ConcreteBuilder1() {
        reset();
    }

    public void reset() {
        product = new Product1();
    }

    public void producePartA() {
        product.parts.add("PartA1");
    }

    public void producePartB() {
        product.parts.add("PartB1");
    }

    public void producePartC() {
        product.parts.add("PartC1");
    }

    public Product1 getProduct() {
        Product1 result = product;
        reset();
        return result;
    }
}

// The Director executes building steps in a particular sequence.
class Director {
    private Builder builder;

    public void setBuilder(Builder builder) {
        this.builder = builder;
    }

    public void buildMinimalViableProduct() {
        builder.producePartA();
    }

    public void buildFullFeaturedProduct() {
        builder.producePartA();
        builder.producePartB();
        builder.producePartC();
    }
}

public class Demo {
    static void clientCode(Director director) {
        ConcreteBuilder1 builder = new ConcreteBuilder1();
        director.setBuilder(builder);

        System.out.println("Standard basic product:");
        director.buildMinimalViableProduct();
        builder.getProduct().listParts();

        System.out.println("Standard full featured product:");
        director.buildFullFeaturedProduct();
        builder.getProduct().listParts();

        System.out.println("Custom product:");
        builder.producePartA();
        builder.producePartC();
        builder.getProduct().listParts();
    }

    public static void main(String[] args) {
        clientCode(new Director());
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The complex object under construction.
public class Product1
{
    public List<string> Parts = new List<string>();

    public void ListParts()
    {
        Console.WriteLine("Product parts: " + string.Join(", ", Parts) + "\n");
    }
}

// The Builder interface specifies methods for creating the parts of a product.
public interface IBuilder
{
    void ProducePartA();
    void ProducePartB();
    void ProducePartC();
}

public class ConcreteBuilder1 : IBuilder
{
    private Product1 _product = new Product1();

    public ConcreteBuilder1() => Reset();

    public void Reset() => _product = new Product1();

    public void ProducePartA() => _product.Parts.Add("PartA1");
    public void ProducePartB() => _product.Parts.Add("PartB1");
    public void ProducePartC() => _product.Parts.Add("PartC1");

    public Product1 GetProduct()
    {
        var result = _product;
        Reset();
        return result;
    }
}

// The Director executes building steps in a particular sequence.
public class Director
{
    private IBuilder _builder;

    public void SetBuilder(IBuilder builder) => _builder = builder;

    public void BuildMinimalViableProduct() => _builder.ProducePartA();

    public void BuildFullFeaturedProduct()
    {
        _builder.ProducePartA();
        _builder.ProducePartB();
        _builder.ProducePartC();
    }
}

public class Program
{
    static void ClientCode(Director director)
    {
        var builder = new ConcreteBuilder1();
        director.SetBuilder(builder);

        Console.WriteLine("Standard basic product:");
        director.BuildMinimalViableProduct();
        builder.GetProduct().ListParts();

        Console.WriteLine("Standard full featured product:");
        director.BuildFullFeaturedProduct();
        builder.GetProduct().ListParts();

        Console.WriteLine("Custom product:");
        builder.ProducePartA();
        builder.ProducePartC();
        builder.GetProduct().ListParts();
    }

    public static void Main()
    {
        ClientCode(new Director());
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"strings"
)

// Product1 is the complex object under construction.
type Product1 struct {
	parts []string
}

func (p *Product1) ListParts() {
	fmt.Printf("Product parts: %s\n\n", strings.Join(p.parts, ", "))
}

// Builder specifies methods for creating the parts of a product.
type Builder interface {
	ProducePartA()
	ProducePartB()
	ProducePartC()
}

type ConcreteBuilder1 struct {
	product *Product1
}

func NewConcreteBuilder1() *ConcreteBuilder1 {
	b := &ConcreteBuilder1{}
	b.Reset()
	return b
}

func (b *ConcreteBuilder1) Reset() {
	b.product = &Product1{}
}

func (b *ConcreteBuilder1) ProducePartA() {
	b.product.parts = append(b.product.parts, "PartA1")
}

func (b *ConcreteBuilder1) ProducePartB() {
	b.product.parts = append(b.product.parts, "PartB1")
}

func (b *ConcreteBuilder1) ProducePartC() {
	b.product.parts = append(b.product.parts, "PartC1")
}

func (b *ConcreteBuilder1) GetProduct() *Product1 {
	result := b.product
	b.Reset()
	return result
}

// Director executes building steps in a particular sequence.
type Director struct {
	builder Builder
}

func (d *Director) SetBuilder(builder Builder) {
	d.builder = builder
}

func (d *Director) BuildMinimalViableProduct() {
	d.builder.ProducePartA()
}

func (d *Director) BuildFullFeaturedProduct() {
	d.builder.ProducePartA()
	d.builder.ProducePartB()
	d.builder.ProducePartC()
}

func clientCode(director *Director) {
	builder := NewConcreteBuilder1()
	director.SetBuilder(builder)

	fmt.Println("Standard basic product:")
	director.BuildMinimalViableProduct()
	builder.GetProduct().ListParts()

	fmt.Println("Standard full featured product:")
	director.BuildFullFeaturedProduct()
	builder.GetProduct().ListParts()

	fmt.Println("Custom product:")
	builder.ProducePartA()
	builder.ProducePartC()
	builder.GetProduct().ListParts()
}

func main() {
	clientCode(&Director{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The complex object under construction.
class Product1 {
public:
    std::vector<std::string> parts;

    void listParts() const {
        std::cout << "Product parts: ";
        for (size_t i = 0; i < parts.size(); ++i) {
            std::cout << parts[i];
            if (i + 1 < parts.size()) std::cout << ", ";
        }
        std::cout << "\n\n";
    }
};

// The Builder interface specifies methods for creating the parts of a product.
class Builder {
public:
    virtual ~Builder() = default;
    virtual void producePartA() = 0;
    virtual void producePartB() = 0;
    virtual void producePartC() = 0;
};

class ConcreteBuilder1 : public Builder {
    std::unique_ptr<Product1> product;

public:
    ConcreteBuilder1() { reset(); }

    void reset() { product = std::make_unique<Product1>(); }

    void producePartA() override { product->parts.push_back("PartA1"); }
    void producePartB() override { product->parts.push_back("PartB1"); }
    void producePartC() override { product->parts.push_back("PartC1"); }

    std::unique_ptr<Product1> getProduct() {
        auto result = std::move(product);
        reset();
        return result;
    }
};

// The Director executes building steps in a particular sequence.
class Director {
    Builder* builder = nullptr;

public:
    void setBuilder(Builder* b) { builder = b; }

    void buildMinimalViableProduct() { builder->producePartA(); }

    void buildFullFeaturedProduct() {
        builder->producePartA();
        builder->producePartB();
        builder->producePartC();
    }
};

void clientCode(Director& director) {
    ConcreteBuilder1 builder;
    director.setBuilder(&builder);

    std::cout << "Standard basic product:\n";
    director.buildMinimalViableProduct();
    builder.getProduct()->listParts();

    std::cout << "Standard full featured product:\n";
    director.buildFullFeaturedProduct();
    builder.getProduct()->listParts();

    std::cout << "Custom product:\n";
    builder.producePartA();
    builder.producePartC();
    builder.getProduct()->listParts();
}

int main() {
    Director director;
    clientCode(director);
    return 0;
}
```

## Rust Example

```rust
// The complex object under construction.
#[derive(Default)]
struct Product1 {
    parts: Vec<String>,
}

impl Product1 {
    fn list_parts(&self) {
        println!("Product parts: {}\n", self.parts.join(", "));
    }
}

// The Builder trait specifies methods for creating the parts of a product.
trait Builder {
    fn produce_part_a(&mut self);
    fn produce_part_b(&mut self);
    fn produce_part_c(&mut self);
}

#[derive(Default)]
struct ConcreteBuilder1 {
    product: Product1,
}

impl ConcreteBuilder1 {
    fn new() -> Self {
        Self::default()
    }

    fn reset(&mut self) {
        self.product = Product1::default();
    }

    // Returns the built product and resets for the next build.
    fn get_product(&mut self) -> Product1 {
        std::mem::take(&mut self.product)
    }
}

impl Builder for ConcreteBuilder1 {
    fn produce_part_a(&mut self) {
        self.product.parts.push("PartA1".to_string());
    }
    fn produce_part_b(&mut self) {
        self.product.parts.push("PartB1".to_string());
    }
    fn produce_part_c(&mut self) {
        self.product.parts.push("PartC1".to_string());
    }
}

// The Director executes building steps in a particular sequence.
#[derive(Default)]
struct Director;

impl Director {
    fn build_minimal_viable_product(&self, builder: &mut dyn Builder) {
        builder.produce_part_a();
    }

    fn build_full_featured_product(&self, builder: &mut dyn Builder) {
        builder.produce_part_a();
        builder.produce_part_b();
        builder.produce_part_c();
    }
}

fn main() {
    let director = Director;
    let mut builder = ConcreteBuilder1::new();

    println!("Standard basic product:");
    director.build_minimal_viable_product(&mut builder);
    builder.get_product().list_parts();

    println!("Standard full featured product:");
    director.build_full_featured_product(&mut builder);
    builder.get_product().list_parts();

    // The Builder pattern can be used without a Director.
    println!("Custom product:");
    builder.produce_part_a();
    builder.produce_part_c();
    builder.get_product().list_parts();
}
```

## Pairs well with

Composite (Builder constructs Composite trees); Abstract Factory (Builder may produce parts via an Abstract Factory);
Director (separates step ordering from build steps).

---

<a id="catalog"></a>

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
| **0** | Control-flow rules      | Rules      | –   | [control-flow.md](#control-flow)                       |
| **0** | Null Object, Result, Repository, Specification, Middleware, DI | Non-GoF | – | [extras.md](#extras) |
| **1** | Factory Method          | Creational | 3   | [factory-method.md](#factory-method)                   |
| **1** | Abstract Factory        | Creational | 3   | [abstract-factory.md](#abstract-factory)               |
| **1** | Builder                 | Creational | 3   | [builder.md](#builder)                                 |
| **1** | Singleton (default: reject) | Creational | 3 | [singleton.md](#singleton)                           |
| **1** | Adapter                 | Structural | 3   | [adapter.md](#adapter)                                 |
| **1** | Facade                  | Structural | 3   | [facade.md](#facade)                                   |
| **1** | Strategy                | Behavioral | 3   | [strategy.md](#strategy)                               |
| **1** | Observer                | Behavioral | 3   | [observer.md](#observer)                               |
| **1** | Iterator                | Behavioral | 3   | [iterator.md](#iterator)                               |
| **1** | Template Method         | Behavioral | 3   | [template-method.md](#template-method)                 |
| **2** | Decorator               | Structural | 2   | [decorator.md](#decorator)                             |
| **2** | Composite               | Structural | 2   | [composite.md](#composite)                             |
| **2** | Command                 | Behavioral | 2   | [command.md](#command)                                 |
| **2** | State                   | Behavioral | 2   | [state.md](#state)                                     |
| **2** | Chain of Responsibility | Behavioral | 2   | [chain-of-responsibility.md](#chain-of-responsibility) |
| **3** | Prototype               | Creational | 1   | [prototype.md](#prototype)                             |
| **3** | Proxy                   | Structural | 1   | [proxy.md](#proxy)                                     |
| **3** | Bridge                  | Structural | 1   | [bridge.md](#bridge)                                   |
| **3** | Flyweight               | Structural | 1   | [flyweight.md](#flyweight)                             |
| **3** | Mediator                | Behavioral | 1   | [mediator.md](#mediator)                               |
| **3** | Memento                 | Behavioral | 1   | [memento.md](#memento)                                 |
| **3** | Visitor                 | Behavioral | 1   | [visitor.md](#visitor)                                 |

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
  guard clauses (#control-flow)
- **N+1 queries**: one query per loop item → batch / eager load (#control-flow)
- **Shotgun conditionals**: the same `status ==` check in many places →
  centralize via map / State / polymorphism (#control-flow)
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | an array of handler functions, first non-`undefined` result wins; Express-style middleware |
| Python | a list of callables; first non-`None` result wins |
| Java | a `List<Handler>` streamed to the first present `Optional`; servlet filters |
| C# | the ASP.NET middleware pipeline, or a list of `Func<>` |
| Go | a slice of funcs, or chained `http.Handler` middleware |
| C++ | a `vector<std::function>` walked until one handles it |
| Rust | `handlers.iter().find_map(|h| h(&req))` |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional


class Handler(ABC):
    """Declares methods for building the chain and executing a request."""

    @abstractmethod
    def set_next(self, handler: "Handler") -> "Handler":
        pass

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        pass


class AbstractHandler(Handler):
    """Implements the default chaining behavior."""

    _next_handler: Handler = None

    def set_next(self, handler: Handler) -> Handler:
        self._next_handler = handler
        # Returning the handler lets us link calls like:
        # monkey.set_next(squirrel).set_next(dog)
        return handler

    @abstractmethod
    def handle(self, request: str) -> Optional[str]:
        if self._next_handler:
            return self._next_handler.handle(request)
        return None


class MonkeyHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "Banana":
            return f"Monkey: I'll eat the {request}."
        return super().handle(request)


class SquirrelHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "Nut":
            return f"Squirrel: I'll eat the {request}."
        return super().handle(request)


class DogHandler(AbstractHandler):
    def handle(self, request: str) -> Optional[str]:
        if request == "MeatBall":
            return f"Dog: I'll eat the {request}."
        return super().handle(request)


def client_code(handler: Handler) -> None:
    for food in ["Nut", "Banana", "Cup of coffee"]:
        print(f"Client: Who wants a {food}?")
        result = handler.handle(food)
        if result:
            print(f"  {result}")
        else:
            print(f"  {food} was left untouched.")


if __name__ == "__main__":
    monkey = MonkeyHandler()
    squirrel = SquirrelHandler()
    dog = DogHandler()
    monkey.set_next(squirrel).set_next(dog)

    print("Chain: Monkey > Squirrel > Dog\n")
    client_code(monkey)
    print("")
    print("Subchain: Squirrel > Dog\n")
    client_code(squirrel)
```

## Java Example

```java
// The Handler interface declares chaining and request-handling methods.
interface Handler {
    Handler setNext(Handler handler);

    String handle(String request);
}

// The default chaining behavior lives in a base handler class.
abstract class AbstractHandler implements Handler {
    private Handler nextHandler;

    public Handler setNext(Handler handler) {
        this.nextHandler = handler;
        // Returning the handler lets us link calls like:
        // monkey.setNext(squirrel).setNext(dog);
        return handler;
    }

    public String handle(String request) {
        if (nextHandler != null) {
            return nextHandler.handle(request);
        }
        return null;
    }
}

class MonkeyHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("Banana")) {
            return "Monkey: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

class SquirrelHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("Nut")) {
            return "Squirrel: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

class DogHandler extends AbstractHandler {
    public String handle(String request) {
        if (request.equals("MeatBall")) {
            return "Dog: I'll eat the " + request + ".";
        }
        return super.handle(request);
    }
}

public class Demo {
    static void clientCode(Handler handler) {
        for (String food : new String[] {"Nut", "Banana", "Cup of coffee"}) {
            System.out.println("Client: Who wants a " + food + "?");
            String result = handler.handle(food);
            if (result != null) {
                System.out.println("  " + result);
            } else {
                System.out.println("  " + food + " was left untouched.");
            }
        }
    }

    public static void main(String[] args) {
        MonkeyHandler monkey = new MonkeyHandler();
        SquirrelHandler squirrel = new SquirrelHandler();
        DogHandler dog = new DogHandler();
        monkey.setNext(squirrel).setNext(dog);

        System.out.println("Chain: Monkey > Squirrel > Dog\n");
        clientCode(monkey);
        System.out.println("");
        System.out.println("Subchain: Squirrel > Dog\n");
        clientCode(squirrel);
    }
}
```

## C# Example

```csharp
using System;

// The Handler interface declares chaining and request-handling methods.
interface IHandler
{
    IHandler SetNext(IHandler handler);

    string Handle(string request);
}

// The default chaining behavior lives in a base handler class.
abstract class AbstractHandler : IHandler
{
    private IHandler _nextHandler;

    public IHandler SetNext(IHandler handler)
    {
        _nextHandler = handler;
        // Returning the handler lets us link calls like:
        // monkey.SetNext(squirrel).SetNext(dog);
        return handler;
    }

    public virtual string Handle(string request) => _nextHandler?.Handle(request);
}

class MonkeyHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "Banana" ? $"Monkey: I'll eat the {request}." : base.Handle(request);
}

class SquirrelHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "Nut" ? $"Squirrel: I'll eat the {request}." : base.Handle(request);
}

class DogHandler : AbstractHandler
{
    public override string Handle(string request) =>
        request == "MeatBall" ? $"Dog: I'll eat the {request}." : base.Handle(request);
}

class Program
{
    static void ClientCode(IHandler handler)
    {
        foreach (var food in new[] { "Nut", "Banana", "Cup of coffee" })
        {
            Console.WriteLine($"Client: Who wants a {food}?");
            var result = handler.Handle(food);
            if (result != null)
                Console.WriteLine($"  {result}");
            else
                Console.WriteLine($"  {food} was left untouched.");
        }
    }

    static void Main()
    {
        var monkey = new MonkeyHandler();
        var squirrel = new SquirrelHandler();
        var dog = new DogHandler();
        monkey.SetNext(squirrel).SetNext(dog);

        Console.WriteLine("Chain: Monkey > Squirrel > Dog\n");
        ClientCode(monkey);
        Console.WriteLine("");
        Console.WriteLine("Subchain: Squirrel > Dog\n");
        ClientCode(squirrel);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Handler declares chaining and request-handling methods.
type Handler interface {
	SetNext(handler Handler) Handler
	Handle(request string) string
}

// BaseHandler implements the default chaining behavior; concrete handlers embed
// it and provide a next() so the base can forward requests along the chain.
type BaseHandler struct {
	next Handler
}

func (h *BaseHandler) SetNext(handler Handler) Handler {
	h.next = handler
	// Returning the handler lets us link calls like:
	// monkey.SetNext(squirrel).SetNext(dog)
	return handler
}

func (h *BaseHandler) Handle(request string) string {
	if h.next != nil {
		return h.next.Handle(request)
	}
	return ""
}

type MonkeyHandler struct{ BaseHandler }

func (h *MonkeyHandler) Handle(request string) string {
	if request == "Banana" {
		return fmt.Sprintf("Monkey: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

type SquirrelHandler struct{ BaseHandler }

func (h *SquirrelHandler) Handle(request string) string {
	if request == "Nut" {
		return fmt.Sprintf("Squirrel: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

type DogHandler struct{ BaseHandler }

func (h *DogHandler) Handle(request string) string {
	if request == "MeatBall" {
		return fmt.Sprintf("Dog: I'll eat the %s.", request)
	}
	return h.BaseHandler.Handle(request)
}

func clientCode(handler Handler) {
	for _, food := range []string{"Nut", "Banana", "Cup of coffee"} {
		fmt.Printf("Client: Who wants a %s?\n", food)
		if result := handler.Handle(food); result != "" {
			fmt.Printf("  %s\n", result)
		} else {
			fmt.Printf("  %s was left untouched.\n", food)
		}
	}
}

func main() {
	monkey := &MonkeyHandler{}
	squirrel := &SquirrelHandler{}
	dog := &DogHandler{}
	monkey.SetNext(squirrel).SetNext(dog)

	fmt.Print("Chain: Monkey > Squirrel > Dog\n\n")
	clientCode(monkey)
	fmt.Println("")
	fmt.Print("Subchain: Squirrel > Dog\n\n")
	clientCode(squirrel)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The Handler interface declares chaining and request-handling methods.
class Handler {
public:
    virtual ~Handler() = default;
    virtual Handler* SetNext(Handler* handler) = 0;
    virtual std::string Handle(const std::string& request) = 0;
};

// The default chaining behavior lives in a base handler class.
class AbstractHandler : public Handler {
    Handler* next_handler_ = nullptr;

public:
    Handler* SetNext(Handler* handler) override {
        next_handler_ = handler;
        // Returning the handler lets us link calls like:
        // monkey->SetNext(squirrel)->SetNext(dog);
        return handler;
    }

    std::string Handle(const std::string& request) override {
        if (next_handler_) return next_handler_->Handle(request);
        return {};
    }
};

class MonkeyHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "Banana") return "Monkey: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

class SquirrelHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "Nut") return "Squirrel: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

class DogHandler : public AbstractHandler {
public:
    std::string Handle(const std::string& request) override {
        if (request == "MeatBall") return "Dog: I'll eat the " + request + ".";
        return AbstractHandler::Handle(request);
    }
};

void ClientCode(Handler& handler) {
    for (const std::string& food : {"Nut", "Banana", "Cup of coffee"}) {
        std::cout << "Client: Who wants a " << food << "?\n";
        std::string result = handler.Handle(food);
        if (!result.empty())
            std::cout << "  " << result << "\n";
        else
            std::cout << "  " << food << " was left untouched.\n";
    }
}

int main() {
    auto monkey = std::make_unique<MonkeyHandler>();
    auto squirrel = std::make_unique<SquirrelHandler>();
    auto dog = std::make_unique<DogHandler>();
    monkey->SetNext(squirrel.get())->SetNext(dog.get());

    std::cout << "Chain: Monkey > Squirrel > Dog\n\n";
    ClientCode(*monkey);
    std::cout << "\n";
    std::cout << "Subchain: Squirrel > Dog\n\n";
    ClientCode(*squirrel);
    return 0;
}
```

## Rust Example

```rust
// The Handler trait declares chaining and request-handling methods. The default
// handle() forwards to the next handler, mirroring the base-class behavior.
trait Handler {
    fn set_next(&mut self, next: Box<dyn Handler>);
    fn next(&self) -> Option<&dyn Handler>;

    fn handle(&self, request: &str) -> Option<String> {
        self.next().and_then(|h| h.handle(request))
    }
}

// A small macro-free helper: each concrete handler stores its successor.
#[derive(Default)]
struct Chained {
    next: Option<Box<dyn Handler>>,
}

struct MonkeyHandler {
    base: Chained,
}
struct SquirrelHandler {
    base: Chained,
}
struct DogHandler {
    base: Chained,
}

macro_rules! impl_link {
    ($ty:ty) => {
        fn set_next(&mut self, next: Box<dyn Handler>) {
            self.base.next = Some(next);
        }
        fn next(&self) -> Option<&dyn Handler> {
            self.base.next.as_deref()
        }
    };
}

impl Handler for MonkeyHandler {
    impl_link!(MonkeyHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "Banana" {
            return Some(format!("Monkey: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

impl Handler for SquirrelHandler {
    impl_link!(SquirrelHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "Nut" {
            return Some(format!("Squirrel: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

impl Handler for DogHandler {
    impl_link!(DogHandler);
    fn handle(&self, request: &str) -> Option<String> {
        if request == "MeatBall" {
            return Some(format!("Dog: I'll eat the {}.", request));
        }
        self.next().and_then(|h| h.handle(request))
    }
}

fn client_code(handler: &dyn Handler) {
    for food in ["Nut", "Banana", "Cup of coffee"] {
        println!("Client: Who wants a {}?", food);
        match handler.handle(food) {
            Some(result) => println!("  {}", result),
            None => println!("  {} was left untouched.", food),
        }
    }
}

fn main() {
    let mut dog = DogHandler { base: Chained::default() };
    let _ = &mut dog;
    let mut squirrel = SquirrelHandler { base: Chained::default() };
    squirrel.set_next(Box::new(dog));
    let mut monkey = MonkeyHandler { base: Chained::default() };
    monkey.set_next(Box::new(squirrel));

    println!("Chain: Monkey > Squirrel > Dog\n");
    client_code(&monkey);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | closures `() => void` in a queue; `{ do, undo }` object literals |
| Python | callables or `functools.partial` |
| Java | a `Runnable` / lambda; a record for data-carrying commands |
| C# | `Action` / `Func` delegates; records for data-carrying commands |
| Go | `func()` values; a struct with `Do` / `Undo` func fields |
| C++ | `std::function<void()>` |
| Rust | `Box<dyn FnOnce()>`, or an enum of commands + `match` (serializable) |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Command(ABC):
    """Declares a method for executing a command."""

    @abstractmethod
    def execute(self) -> None:
        pass


class SimpleCommand(Command):
    """Some commands implement simple operations on their own."""

    def __init__(self, payload: str) -> None:
        self._payload = payload

    def execute(self) -> None:
        print(f"SimpleCommand: See, I can do simple things like printing ({self._payload})")


class ComplexCommand(Command):
    """Delegates more complex operations to a receiver object."""

    def __init__(self, receiver: "Receiver", a: str, b: str) -> None:
        self._receiver = receiver
        self._a = a
        self._b = b

    def execute(self) -> None:
        print("ComplexCommand: Complex stuff should be done by a receiver object.")
        self._receiver.do_something(self._a)
        self._receiver.do_something_else(self._b)


class Receiver:
    """Contains the business logic; any class may serve as a receiver."""

    def do_something(self, a: str) -> None:
        print(f"Receiver: Working on ({a}.)")

    def do_something_else(self, b: str) -> None:
        print(f"Receiver: Also working on ({b}.)")


class Invoker:
    """Associated with commands; sends requests to them."""

    _on_start: Command = None
    _on_finish: Command = None

    def set_on_start(self, command: Command) -> None:
        self._on_start = command

    def set_on_finish(self, command: Command) -> None:
        self._on_finish = command

    def do_something_important(self) -> None:
        print("Invoker: Does anybody want something done before I begin?")
        if isinstance(self._on_start, Command):
            self._on_start.execute()

        print("Invoker: ...doing something really important...")

        print("Invoker: Does anybody want something done after I finish?")
        if isinstance(self._on_finish, Command):
            self._on_finish.execute()


if __name__ == "__main__":
    invoker = Invoker()
    invoker.set_on_start(SimpleCommand("Say Hi!"))
    receiver = Receiver()
    invoker.set_on_finish(ComplexCommand(receiver, "Send email", "Save report"))
    invoker.do_something_important()
```

## Java Example

```java
// The Command interface declares a method for executing a command.
interface Command {
    void execute();
}

// Some commands implement simple operations on their own.
class SimpleCommand implements Command {
    private String payload;

    public SimpleCommand(String payload) {
        this.payload = payload;
    }

    public void execute() {
        System.out.println("SimpleCommand: See, I can do simple things like printing (" + payload + ")");
    }
}

// Some commands delegate more complex operations to a receiver.
class ComplexCommand implements Command {
    private Receiver receiver;
    private String a;
    private String b;

    public ComplexCommand(Receiver receiver, String a, String b) {
        this.receiver = receiver;
        this.a = a;
        this.b = b;
    }

    public void execute() {
        System.out.println("ComplexCommand: Complex stuff should be done by a receiver object.");
        receiver.doSomething(a);
        receiver.doSomethingElse(b);
    }
}

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver {
    public void doSomething(String a) {
        System.out.println("Receiver: Working on (" + a + ".)");
    }

    public void doSomethingElse(String b) {
        System.out.println("Receiver: Also working on (" + b + ".)");
    }
}

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker {
    private Command onStart;
    private Command onFinish;

    public void setOnStart(Command command) {
        this.onStart = command;
    }

    public void setOnFinish(Command command) {
        this.onFinish = command;
    }

    public void doSomethingImportant() {
        System.out.println("Invoker: Does anybody want something done before I begin?");
        if (onStart != null) {
            onStart.execute();
        }

        System.out.println("Invoker: ...doing something really important...");

        System.out.println("Invoker: Does anybody want something done after I finish?");
        if (onFinish != null) {
            onFinish.execute();
        }
    }
}

public class Demo {
    public static void main(String[] args) {
        Invoker invoker = new Invoker();
        invoker.setOnStart(new SimpleCommand("Say Hi!"));
        Receiver receiver = new Receiver();
        invoker.setOnFinish(new ComplexCommand(receiver, "Send email", "Save report"));
        invoker.doSomethingImportant();
    }
}
```

## C# Example

```csharp
using System;

// The Command interface declares a method for executing a command.
interface ICommand
{
    void Execute();
}

// Some commands implement simple operations on their own.
class SimpleCommand : ICommand
{
    private string _payload;

    public SimpleCommand(string payload) => _payload = payload;

    public void Execute() =>
        Console.WriteLine($"SimpleCommand: See, I can do simple things like printing ({_payload})");
}

// Some commands delegate more complex operations to a receiver.
class ComplexCommand : ICommand
{
    private Receiver _receiver;
    private string _a;
    private string _b;

    public ComplexCommand(Receiver receiver, string a, string b)
    {
        _receiver = receiver;
        _a = a;
        _b = b;
    }

    public void Execute()
    {
        Console.WriteLine("ComplexCommand: Complex stuff should be done by a receiver object.");
        _receiver.DoSomething(_a);
        _receiver.DoSomethingElse(_b);
    }
}

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver
{
    public void DoSomething(string a) => Console.WriteLine($"Receiver: Working on ({a}.)");

    public void DoSomethingElse(string b) => Console.WriteLine($"Receiver: Also working on ({b}.)");
}

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker
{
    private ICommand _onStart;
    private ICommand _onFinish;

    public void SetOnStart(ICommand command) => _onStart = command;

    public void SetOnFinish(ICommand command) => _onFinish = command;

    public void DoSomethingImportant()
    {
        Console.WriteLine("Invoker: Does anybody want something done before I begin?");
        _onStart?.Execute();

        Console.WriteLine("Invoker: ...doing something really important...");

        Console.WriteLine("Invoker: Does anybody want something done after I finish?");
        _onFinish?.Execute();
    }
}

class Program
{
    static void Main()
    {
        var invoker = new Invoker();
        invoker.SetOnStart(new SimpleCommand("Say Hi!"));
        var receiver = new Receiver();
        invoker.SetOnFinish(new ComplexCommand(receiver, "Send email", "Save report"));
        invoker.DoSomethingImportant();
    }
}
```

## Go Example

```go
package main

import "fmt"

// The Command interface declares a method for executing a command.
type Command interface {
	Execute()
}

// SimpleCommand implements a simple operation on its own.
type SimpleCommand struct {
	payload string
}

func (c *SimpleCommand) Execute() {
	fmt.Printf("SimpleCommand: See, I can do simple things like printing (%s)\n", c.payload)
}

// ComplexCommand delegates more complex operations to a receiver.
type ComplexCommand struct {
	receiver *Receiver
	a, b     string
}

func (c *ComplexCommand) Execute() {
	fmt.Println("ComplexCommand: Complex stuff should be done by a receiver object.")
	c.receiver.DoSomething(c.a)
	c.receiver.DoSomethingElse(c.b)
}

// Receiver contains the business logic; any type may serve as a receiver.
type Receiver struct{}

func (r *Receiver) DoSomething(a string) {
	fmt.Printf("Receiver: Working on (%s.)\n", a)
}
func (r *Receiver) DoSomethingElse(b string) {
	fmt.Printf("Receiver: Also working on (%s.)\n", b)
}

// Invoker sends requests to a command without depending on concrete types.
type Invoker struct {
	onStart  Command
	onFinish Command
}

func (i *Invoker) SetOnStart(c Command)  { i.onStart = c }
func (i *Invoker) SetOnFinish(c Command) { i.onFinish = c }

func (i *Invoker) DoSomethingImportant() {
	fmt.Println("Invoker: Does anybody want something done before I begin?")
	if i.onStart != nil {
		i.onStart.Execute()
	}

	fmt.Println("Invoker: ...doing something really important...")

	fmt.Println("Invoker: Does anybody want something done after I finish?")
	if i.onFinish != nil {
		i.onFinish.Execute()
	}
}

func main() {
	invoker := &Invoker{}
	invoker.SetOnStart(&SimpleCommand{payload: "Say Hi!"})
	receiver := &Receiver{}
	invoker.SetOnFinish(&ComplexCommand{receiver: receiver, a: "Send email", b: "Save report"})
	invoker.DoSomethingImportant()
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Command interface declares a method for executing a command.
class Command {
public:
    virtual ~Command() = default;
    virtual void Execute() const = 0;
};

// Some commands implement simple operations on their own.
class SimpleCommand : public Command {
    std::string payload_;

public:
    explicit SimpleCommand(std::string payload) : payload_(std::move(payload)) {}

    void Execute() const override {
        std::cout << "SimpleCommand: See, I can do simple things like printing ("
                  << payload_ << ")\n";
    }
};

// The Receiver contains the business logic; any class may serve as a receiver.
class Receiver {
public:
    void DoSomething(const std::string& a) {
        std::cout << "Receiver: Working on (" << a << ".)\n";
    }
    void DoSomethingElse(const std::string& b) {
        std::cout << "Receiver: Also working on (" << b << ".)\n";
    }
};

// Some commands delegate more complex operations to a receiver.
class ComplexCommand : public Command {
    Receiver* receiver_;
    std::string a_;
    std::string b_;

public:
    ComplexCommand(Receiver* receiver, std::string a, std::string b)
        : receiver_(receiver), a_(std::move(a)), b_(std::move(b)) {}

    void Execute() const override {
        std::cout << "ComplexCommand: Complex stuff should be done by a receiver object.\n";
        receiver_->DoSomething(a_);
        receiver_->DoSomethingElse(b_);
    }
};

// The Invoker sends requests to a command without depending on concrete classes.
class Invoker {
    std::unique_ptr<Command> on_start_;
    std::unique_ptr<Command> on_finish_;

public:
    void SetOnStart(std::unique_ptr<Command> command) { on_start_ = std::move(command); }
    void SetOnFinish(std::unique_ptr<Command> command) { on_finish_ = std::move(command); }

    void DoSomethingImportant() {
        std::cout << "Invoker: Does anybody want something done before I begin?\n";
        if (on_start_) on_start_->Execute();

        std::cout << "Invoker: ...doing something really important...\n";

        std::cout << "Invoker: Does anybody want something done after I finish?\n";
        if (on_finish_) on_finish_->Execute();
    }
};

int main() {
    Invoker invoker;
    invoker.SetOnStart(std::make_unique<SimpleCommand>("Say Hi!"));
    Receiver receiver;
    invoker.SetOnFinish(std::make_unique<ComplexCommand>(&receiver, "Send email", "Save report"));
    invoker.DoSomethingImportant();
    return 0;
}
```

## Rust Example

```rust
// The Command trait declares a method for executing a command.
trait Command {
    fn execute(&self);
}

// Some commands implement simple operations on their own.
struct SimpleCommand {
    payload: String,
}

impl Command for SimpleCommand {
    fn execute(&self) {
        println!(
            "SimpleCommand: See, I can do simple things like printing ({})",
            self.payload
        );
    }
}

// The Receiver contains the business logic; any type may serve as a receiver.
struct Receiver;

impl Receiver {
    fn do_something(&self, a: &str) {
        println!("Receiver: Working on ({}.)", a);
    }
    fn do_something_else(&self, b: &str) {
        println!("Receiver: Also working on ({}.)", b);
    }
}

// Some commands delegate more complex operations to a receiver.
struct ComplexCommand {
    receiver: Receiver,
    a: String,
    b: String,
}

impl Command for ComplexCommand {
    fn execute(&self) {
        println!("ComplexCommand: Complex stuff should be done by a receiver object.");
        self.receiver.do_something(&self.a);
        self.receiver.do_something_else(&self.b);
    }
}

// The Invoker sends requests to commands without knowing their concrete types.
#[derive(Default)]
struct Invoker {
    on_start: Option<Box<dyn Command>>,
    on_finish: Option<Box<dyn Command>>,
}

impl Invoker {
    fn set_on_start(&mut self, command: Box<dyn Command>) {
        self.on_start = Some(command);
    }
    fn set_on_finish(&mut self, command: Box<dyn Command>) {
        self.on_finish = Some(command);
    }

    fn do_something_important(&self) {
        println!("Invoker: Does anybody want something done before I begin?");
        if let Some(command) = &self.on_start {
            command.execute();
        }

        println!("Invoker: ...doing something really important...");

        println!("Invoker: Does anybody want something done after I finish?");
        if let Some(command) = &self.on_finish {
            command.execute();
        }
    }
}

fn main() {
    let mut invoker = Invoker::default();
    invoker.set_on_start(Box::new(SimpleCommand {
        payload: String::from("Say Hi!"),
    }));
    invoker.set_on_finish(Box::new(ComplexCommand {
        receiver: Receiver,
        a: String::from("Send email"),
        b: String::from("Save report"),
    }));
    invoker.do_something_important();
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a recursive type `type Node = Leaf | { children: Node[] }` + one recursive function |
| Python | nested dataclasses with a `children` list + a recursive function |
| Java | a sealed interface + records + one recursive method |
| C# | records + recursion with pattern matching |
| Go | a struct with `Children []*Node` |
| C++ | `std::variant` nodes with `std::vector` children + a recursive visit |
| Rust | `enum Node { Leaf(..), Branch(Vec<Node>) }` + a recursive `match` |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional


class Component(ABC):
    """The base Component declares common operations for both simple and complex
    objects of a composition."""

    @property
    def parent(self) -> Optional[Component]:
        return self._parent

    @parent.setter
    def parent(self, parent: Optional[Component]) -> None:
        self._parent = parent

    def add(self, component: Component) -> None:
        pass

    def remove(self, component: Component) -> None:
        pass

    def is_composite(self) -> bool:
        return False

    @abstractmethod
    def operation(self) -> str:
        pass


class Leaf(Component):
    """The Leaf represents the end objects of a composition; it can't have
    children and usually does the actual work."""

    def operation(self) -> str:
        return "Leaf"


class Composite(Component):
    """The Composite represents complex components that may have children,
    delegating the actual work to them and summing up the result."""

    def __init__(self) -> None:
        self._children: List[Component] = []

    def add(self, component: Component) -> None:
        self._children.append(component)
        component.parent = self

    def remove(self, component: Component) -> None:
        self._children.remove(component)
        component.parent = None

    def is_composite(self) -> bool:
        return True

    def operation(self) -> str:
        results = [child.operation() for child in self._children]
        return f"Branch({'+'.join(results)})"


def client_code(component: Component) -> None:
    print(f"RESULT: {component.operation()}")


if __name__ == "__main__":
    simple = Leaf()
    print("Client: I've got a simple component:")
    client_code(simple)
    print()

    tree = Composite()
    branch1 = Composite()
    branch1.add(Leaf())
    branch1.add(Leaf())
    branch2 = Composite()
    branch2.add(Leaf())
    tree.add(branch1)
    tree.add(branch2)
    print("Client: Now I've got a composite tree:")
    client_code(tree)
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

// The base Component declares common operations for simple and complex objects.
abstract class Component {
    protected Component parent;

    public void setParent(Component parent) { this.parent = parent; }
    public Component getParent() { return parent; }

    public void add(Component component) {}
    public void remove(Component component) {}
    public boolean isComposite() { return false; }

    public abstract String operation();
}

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf extends Component {
    public String operation() {
        return "Leaf";
    }
}

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite extends Component {
    protected List<Component> children = new ArrayList<>();

    public void add(Component component) {
        children.add(component);
        component.setParent(this);
    }

    public void remove(Component component) {
        children.remove(component);
        component.setParent(null);
    }

    public boolean isComposite() { return true; }

    public String operation() {
        StringJoiner joiner = new StringJoiner("+");
        for (Component child : children) {
            joiner.add(child.operation());
        }
        return "Branch(" + joiner + ")";
    }
}

public class Demo {
    static void clientCode(Component component) {
        System.out.println("RESULT: " + component.operation());
    }

    public static void main(String[] args) {
        Component simple = new Leaf();
        System.out.println("Client: I've got a simple component:");
        clientCode(simple);
        System.out.println();

        Composite tree = new Composite();
        Composite branch1 = new Composite();
        branch1.add(new Leaf());
        branch1.add(new Leaf());
        Composite branch2 = new Composite();
        branch2.add(new Leaf());
        tree.add(branch1);
        tree.add(branch2);
        System.out.println("Client: Now I've got a composite tree:");
        clientCode(tree);
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The base Component declares common operations for simple and complex objects.
abstract class Component
{
    public Component Parent { get; set; }

    public virtual void Add(Component component) { }
    public virtual void Remove(Component component) { }
    public virtual bool IsComposite() => false;

    public abstract string Operation();
}

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf : Component
{
    public override string Operation() => "Leaf";
}

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite : Component
{
    protected List<Component> children = new List<Component>();

    public override void Add(Component component)
    {
        children.Add(component);
        component.Parent = this;
    }

    public override void Remove(Component component)
    {
        children.Remove(component);
        component.Parent = null;
    }

    public override bool IsComposite() => true;

    public override string Operation()
    {
        var results = new List<string>();
        foreach (var child in children)
            results.Add(child.Operation());
        return $"Branch({string.Join("+", results)})";
    }
}

class Program
{
    static void ClientCode(Component component)
    {
        Console.WriteLine($"RESULT: {component.Operation()}");
    }

    static void Main(string[] args)
    {
        Component simple = new Leaf();
        Console.WriteLine("Client: I've got a simple component:");
        ClientCode(simple);
        Console.WriteLine();

        Composite tree = new Composite();
        Composite branch1 = new Composite();
        branch1.Add(new Leaf());
        branch1.Add(new Leaf());
        Composite branch2 = new Composite();
        branch2.Add(new Leaf());
        tree.Add(branch1);
        tree.Add(branch2);
        Console.WriteLine("Client: Now I've got a composite tree:");
        ClientCode(tree);
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"strings"
)

// Component declares common operations for simple and complex objects.
type Component interface {
	Operation() string
	Add(component Component)
	IsComposite() bool
}

// Leaf represents the end objects; it can't have children and does the work.
type Leaf struct{}

func (l *Leaf) Operation() string      { return "Leaf" }
func (l *Leaf) Add(component Component) {}
func (l *Leaf) IsComposite() bool      { return false }

// Composite represents complex components that may have children, delegating
// the actual work to them and summing up the result.
type Composite struct {
	children []Component
}

func (c *Composite) Add(component Component) {
	c.children = append(c.children, component)
}

func (c *Composite) IsComposite() bool { return true }

func (c *Composite) Operation() string {
	results := make([]string, 0, len(c.children))
	for _, child := range c.children {
		results = append(results, child.Operation())
	}
	return fmt.Sprintf("Branch(%s)", strings.Join(results, "+"))
}

func clientCode(component Component) {
	fmt.Printf("RESULT: %s\n", component.Operation())
}

func main() {
	simple := &Leaf{}
	fmt.Println("Client: I've got a simple component:")
	clientCode(simple)
	fmt.Println()

	tree := &Composite{}
	branch1 := &Composite{}
	branch1.Add(&Leaf{})
	branch1.Add(&Leaf{})
	branch2 := &Composite{}
	branch2.Add(&Leaf{})
	tree.Add(branch1)
	tree.Add(branch2)
	fmt.Println("Client: Now I've got a composite tree:")
	clientCode(tree)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The base Component declares common operations for simple and complex objects.
class Component {
public:
    virtual ~Component() = default;
    virtual void Add(std::shared_ptr<Component> component) {}
    virtual bool IsComposite() const { return false; }
    virtual std::string Operation() const = 0;
};

// The Leaf represents the end objects; it can't have children and does the work.
class Leaf : public Component {
public:
    std::string Operation() const override { return "Leaf"; }
};

// The Composite represents complex components that may have children,
// delegating the actual work to them and summing up the result.
class Composite : public Component {
protected:
    std::vector<std::shared_ptr<Component>> children_;

public:
    void Add(std::shared_ptr<Component> component) override {
        children_.push_back(std::move(component));
    }

    bool IsComposite() const override { return true; }

    std::string Operation() const override {
        std::string result;
        for (size_t i = 0; i < children_.size(); ++i) {
            if (i > 0) result += "+";
            result += children_[i]->Operation();
        }
        return "Branch(" + result + ")";
    }
};

void ClientCode(const std::shared_ptr<Component>& component) {
    std::cout << "RESULT: " << component->Operation() << "\n";
}

int main() {
    auto simple = std::make_shared<Leaf>();
    std::cout << "Client: I've got a simple component:\n";
    ClientCode(simple);
    std::cout << "\n";

    auto tree = std::make_shared<Composite>();
    auto branch1 = std::make_shared<Composite>();
    branch1->Add(std::make_shared<Leaf>());
    branch1->Add(std::make_shared<Leaf>());
    auto branch2 = std::make_shared<Composite>();
    branch2->Add(std::make_shared<Leaf>());
    tree->Add(branch1);
    tree->Add(branch2);
    std::cout << "Client: Now I've got a composite tree:\n";
    ClientCode(tree);
    return 0;
}
```

## Rust Example

```rust
// The base Component trait declares common operations for simple and complex
// objects of a composition.
trait Component {
    fn operation(&self) -> String;
    fn add(&mut self, _component: Box<dyn Component>) {}
    fn is_composite(&self) -> bool {
        false
    }
}

// The Leaf represents the end objects; it can't have children and does the work.
struct Leaf;

impl Component for Leaf {
    fn operation(&self) -> String {
        "Leaf".to_string()
    }
}

// The Composite represents complex components that may have children, delegating
// the actual work to them and summing up the result.
struct Composite {
    children: Vec<Box<dyn Component>>,
}

impl Composite {
    fn new() -> Self {
        Composite { children: Vec::new() }
    }
}

impl Component for Composite {
    fn add(&mut self, component: Box<dyn Component>) {
        self.children.push(component);
    }

    fn is_composite(&self) -> bool {
        true
    }

    fn operation(&self) -> String {
        let results: Vec<String> = self.children.iter().map(|c| c.operation()).collect();
        format!("Branch({})", results.join("+"))
    }
}

fn client_code(component: &dyn Component) {
    println!("RESULT: {}", component.operation());
}

fn main() {
    let simple = Leaf;
    println!("Client: I've got a simple component:");
    client_code(&simple);
    println!();

    let mut tree = Composite::new();
    let mut branch1 = Composite::new();
    branch1.add(Box::new(Leaf));
    branch1.add(Box::new(Leaf));
    let mut branch2 = Composite::new();
    branch2.add(Box::new(Leaf));
    tree.add(Box::new(branch1));
    tree.add(Box::new(branch2));
    println!("Client: Now I've got a composite tree:");
    client_code(&tree);
}
```

## Pairs well with

Iterator (Iterator walks the Composite); Visitor (Visitor performs operations across the whole tree); Decorator (both
share the recursive wrapping shape).

---

<a id="control-flow"></a>

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

Two things are **not** exceptions:

- **Different call shapes per branch.** One provider takes `amount / 100`,
  another a `currency=` keyword: each map entry is a small adapter (a lambda
  or named function with the shared signature) that absorbs the difference.
  Normalizing the call shape is what the map is for.
- **Small code, one caller.** The anti-overuse rule (SKILL.md §3) is about GoF
  patterns. It does not exempt an 8-line function from R4; the Pattern check
  line is `Dispatch Map (Tier 0) — applied`, not `no GoF pattern — rejected`.

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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a higher-order function `withRetry(fn)`, or middleware |
| Python | a `@decorator` function (with `functools.wraps`) |
| Java | a wrapper implementing the same interface; `Function.andThen` for plain functions |
| C# | a wrapper registered via DI decoration; delegate composition |
| Go | middleware of shape `func(http.Handler) http.Handler` |
| C++ | a wrapping lambda, or a template wrapper |
| Rust | a wrapper struct implementing the same trait (tower `Layer` style) |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Component(ABC):
    """The base Component interface defines operations that can be altered by
    decorators."""

    @abstractmethod
    def operation(self) -> str:
        pass


class ConcreteComponent(Component):
    """Concrete Components provide default implementations of the operations."""

    def operation(self) -> str:
        return "ConcreteComponent"


class Decorator(Component):
    """The base Decorator follows the same interface as the other components and
    stores a reference to a wrapped component, delegating all work to it."""

    def __init__(self, component: Component) -> None:
        self._component = component

    def operation(self) -> str:
        return self._component.operation()


class ConcreteDecoratorA(Decorator):
    """Concrete Decorators call the wrapped object and alter its result."""

    def operation(self) -> str:
        return f"ConcreteDecoratorA({self._component.operation()})"


class ConcreteDecoratorB(Decorator):
    """Decorators can execute their behavior before or after the wrapped call."""

    def operation(self) -> str:
        return f"ConcreteDecoratorB({self._component.operation()})"


def client_code(component: Component) -> None:
    """The client works with all objects using the Component interface."""
    print(f"RESULT: {component.operation()}")


if __name__ == "__main__":
    simple = ConcreteComponent()
    print("Client: I've got a simple component:")
    client_code(simple)
    print()

    # Note how decorators can wrap not only simple components but decorators too.
    decorator1 = ConcreteDecoratorA(simple)
    decorator2 = ConcreteDecoratorB(decorator1)
    print("Client: Now I've got a decorated component:")
    client_code(decorator2)
```

## Java Example

```java
// The base Component interface defines operations that can be altered.
interface Component {
    String operation();
}

// Concrete Components provide default implementations of the operations.
class ConcreteComponent implements Component {
    public String operation() {
        return "ConcreteComponent";
    }
}

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
class Decorator implements Component {
    protected Component component;

    public Decorator(Component component) {
        this.component = component;
    }

    public String operation() {
        return component.operation();
    }
}

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA extends Decorator {
    public ConcreteDecoratorA(Component component) {
        super(component);
    }

    public String operation() {
        return "ConcreteDecoratorA(" + super.operation() + ")";
    }
}

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB extends Decorator {
    public ConcreteDecoratorB(Component component) {
        super(component);
    }

    public String operation() {
        return "ConcreteDecoratorB(" + super.operation() + ")";
    }
}

public class Demo {
    // The client works with all objects using the Component interface.
    static void clientCode(Component component) {
        System.out.println("RESULT: " + component.operation());
    }

    public static void main(String[] args) {
        Component simple = new ConcreteComponent();
        System.out.println("Client: I've got a simple component:");
        clientCode(simple);
        System.out.println();

        Component decorator1 = new ConcreteDecoratorA(simple);
        Component decorator2 = new ConcreteDecoratorB(decorator1);
        System.out.println("Client: Now I've got a decorated component:");
        clientCode(decorator2);
    }
}
```

## C# Example

```csharp
using System;

// The base Component interface defines operations that can be altered.
abstract class Component
{
    public abstract string Operation();
}

// Concrete Components provide default implementations of the operations.
class ConcreteComponent : Component
{
    public override string Operation() => "ConcreteComponent";
}

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
abstract class Decorator : Component
{
    protected Component component;

    public Decorator(Component component)
    {
        this.component = component;
    }

    public override string Operation() => component.Operation();
}

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA : Decorator
{
    public ConcreteDecoratorA(Component component) : base(component) { }

    public override string Operation() => $"ConcreteDecoratorA({base.Operation()})";
}

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB : Decorator
{
    public ConcreteDecoratorB(Component component) : base(component) { }

    public override string Operation() => $"ConcreteDecoratorB({base.Operation()})";
}

class Program
{
    // The client works with all objects using the Component interface.
    static void ClientCode(Component component)
    {
        Console.WriteLine($"RESULT: {component.Operation()}");
    }

    static void Main(string[] args)
    {
        Component simple = new ConcreteComponent();
        Console.WriteLine("Client: I've got a simple component:");
        ClientCode(simple);
        Console.WriteLine();

        Component decorator1 = new ConcreteDecoratorA(simple);
        Component decorator2 = new ConcreteDecoratorB(decorator1);
        Console.WriteLine("Client: Now I've got a decorated component:");
        ClientCode(decorator2);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Component defines operations that can be altered by decorators.
type Component interface {
	Operation() string
}

// ConcreteComponent provides a default implementation of the operations.
type ConcreteComponent struct{}

func (c *ConcreteComponent) Operation() string {
	return "ConcreteComponent"
}

// ConcreteDecoratorA wraps a component and alters its result.
type ConcreteDecoratorA struct {
	component Component
}

func (d *ConcreteDecoratorA) Operation() string {
	return fmt.Sprintf("ConcreteDecoratorA(%s)", d.component.Operation())
}

// ConcreteDecoratorB can execute its behavior before or after the wrapped call.
type ConcreteDecoratorB struct {
	component Component
}

func (d *ConcreteDecoratorB) Operation() string {
	return fmt.Sprintf("ConcreteDecoratorB(%s)", d.component.Operation())
}

// clientCode works with all objects using the Component interface.
func clientCode(component Component) {
	fmt.Printf("RESULT: %s\n", component.Operation())
}

func main() {
	simple := &ConcreteComponent{}
	fmt.Println("Client: I've got a simple component:")
	clientCode(simple)
	fmt.Println()

	// Decorators can wrap not only simple components but decorators too.
	decorator1 := &ConcreteDecoratorA{component: simple}
	decorator2 := &ConcreteDecoratorB{component: decorator1}
	fmt.Println("Client: Now I've got a decorated component:")
	clientCode(decorator2)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The base Component interface defines operations that can be altered.
class Component {
public:
    virtual ~Component() = default;
    virtual std::string Operation() const = 0;
};

// Concrete Components provide default implementations of the operations.
class ConcreteComponent : public Component {
public:
    std::string Operation() const override { return "ConcreteComponent"; }
};

// The base Decorator follows the same interface and stores a wrapped component,
// delegating all work to it.
class Decorator : public Component {
protected:
    std::shared_ptr<Component> component_;

public:
    explicit Decorator(std::shared_ptr<Component> component)
        : component_(std::move(component)) {}

    std::string Operation() const override { return component_->Operation(); }
};

// Concrete Decorators call the wrapped object and alter its result.
class ConcreteDecoratorA : public Decorator {
public:
    using Decorator::Decorator;
    std::string Operation() const override {
        return "ConcreteDecoratorA(" + Decorator::Operation() + ")";
    }
};

// Decorators can execute their behavior before or after the wrapped call.
class ConcreteDecoratorB : public Decorator {
public:
    using Decorator::Decorator;
    std::string Operation() const override {
        return "ConcreteDecoratorB(" + Decorator::Operation() + ")";
    }
};

// The client works with all objects using the Component interface.
void ClientCode(const std::shared_ptr<Component>& component) {
    std::cout << "RESULT: " << component->Operation() << "\n";
}

int main() {
    auto simple = std::make_shared<ConcreteComponent>();
    std::cout << "Client: I've got a simple component:\n";
    ClientCode(simple);
    std::cout << "\n";

    auto decorator1 = std::make_shared<ConcreteDecoratorA>(simple);
    auto decorator2 = std::make_shared<ConcreteDecoratorB>(decorator1);
    std::cout << "Client: Now I've got a decorated component:\n";
    ClientCode(decorator2);
    return 0;
}
```

## Rust Example

```rust
// The base Component trait defines operations that can be altered by decorators.
trait Component {
    fn operation(&self) -> String;
}

// Concrete Components provide default implementations of the operations.
struct ConcreteComponent;

impl Component for ConcreteComponent {
    fn operation(&self) -> String {
        "ConcreteComponent".to_string()
    }
}

// Concrete Decorators wrap a component and alter its result.
struct ConcreteDecoratorA {
    component: Box<dyn Component>,
}

impl Component for ConcreteDecoratorA {
    fn operation(&self) -> String {
        format!("ConcreteDecoratorA({})", self.component.operation())
    }
}

// Decorators can execute their behavior before or after the wrapped call.
struct ConcreteDecoratorB {
    component: Box<dyn Component>,
}

impl Component for ConcreteDecoratorB {
    fn operation(&self) -> String {
        format!("ConcreteDecoratorB({})", self.component.operation())
    }
}

// The client works with all objects using the Component trait.
fn client_code(component: &dyn Component) {
    println!("RESULT: {}", component.operation());
}

fn main() {
    let simple = ConcreteComponent;
    println!("Client: I've got a simple component:");
    client_code(&simple);
    println!();

    // Decorators can wrap not only simple components but decorators too.
    let decorator1 = ConcreteDecoratorA { component: Box::new(ConcreteComponent) };
    let decorator2 = ConcreteDecoratorB { component: Box::new(decorator1) };
    println!("Client: Now I've got a decorated component:");
    client_code(&decorator2);
}
```

## Pairs well with

Strategy (decorate a strategy with cross-cutting behavior); Composite (decorators have similar tree-of-wrappers shape).

---

<a id="extras"></a>

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
| Guard Clause | nested `if`, `else` after exit | [control-flow.md](#control-flow) R1–R3 |
| Dispatch Map | ≥ 3 branches pick behavior by key | [control-flow.md](#control-flow) R4 |
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a module exporting a few top-level functions |
| Python | a module with a small set of public functions (`__all__`) |
| Java | one service class with a deliberately small public surface |
| C# | one service class with a deliberately small public surface |
| Go | the package's exported API — keep internals unexported |
| C++ | a header exposing a few free functions; internals in a detail namespace |
| Rust | a module with a few `pub fn`s; internals stay private, re-export with `pub use` |

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

## Python Example

```python
class Subsystem1:
    """A subsystem can accept requests either from the facade or client directly.
    To the subsystem, the facade is yet another client."""

    def operation1(self) -> str:
        return "Subsystem1: Ready!\n"

    def operation_n(self) -> str:
        return "Subsystem1: Go!\n"


class Subsystem2:
    """Some facades can work with multiple subsystems at the same time."""

    def operation1(self) -> str:
        return "Subsystem2: Get ready!\n"

    def operation_z(self) -> str:
        return "Subsystem2: Fire!"


class Facade:
    """The Facade provides a simple interface to the complex logic of one or
    several subsystems, delegating client requests to the appropriate objects
    and managing their lifecycle."""

    def __init__(self, subsystem1: Subsystem1 = None, subsystem2: Subsystem2 = None) -> None:
        self._subsystem1 = subsystem1 or Subsystem1()
        self._subsystem2 = subsystem2 or Subsystem2()

    def operation(self) -> str:
        result = "Facade initializes subsystems:\n"
        result += self._subsystem1.operation1()
        result += self._subsystem2.operation1()
        result += "Facade orders subsystems to perform the action:\n"
        result += self._subsystem1.operation_n()
        result += self._subsystem2.operation_z()
        return result


def client_code(facade: Facade) -> None:
    """The client works with complex subsystems through the simple Facade
    interface, keeping the complexity under control."""
    print(facade.operation())


if __name__ == "__main__":
    subsystem1 = Subsystem1()
    subsystem2 = Subsystem2()
    facade = Facade(subsystem1, subsystem2)
    client_code(facade)
```

## Java Example

```java
// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1 {
    public String operation1() {
        return "Subsystem1: Ready!\n";
    }

    public String operationN() {
        return "Subsystem1: Go!\n";
    }
}

// Some facades can work with multiple subsystems at the same time.
class Subsystem2 {
    public String operation1() {
        return "Subsystem2: Get ready!\n";
    }

    public String operationZ() {
        return "Subsystem2: Fire!";
    }
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
class Facade {
    protected Subsystem1 subsystem1;
    protected Subsystem2 subsystem2;

    public Facade(Subsystem1 subsystem1, Subsystem2 subsystem2) {
        this.subsystem1 = subsystem1 != null ? subsystem1 : new Subsystem1();
        this.subsystem2 = subsystem2 != null ? subsystem2 : new Subsystem2();
    }

    public String operation() {
        String result = "Facade initializes subsystems:\n";
        result += subsystem1.operation1();
        result += subsystem2.operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1.operationN();
        result += subsystem2.operationZ();
        return result;
    }
}

public class Demo {
    // The client works with complex subsystems through the simple Facade.
    static void clientCode(Facade facade) {
        System.out.println(facade.operation());
    }

    public static void main(String[] args) {
        Subsystem1 subsystem1 = new Subsystem1();
        Subsystem2 subsystem2 = new Subsystem2();
        Facade facade = new Facade(subsystem1, subsystem2);
        clientCode(facade);
    }
}
```

## C# Example

```csharp
using System;

// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1
{
    public string Operation1() => "Subsystem1: Ready!\n";

    public string OperationN() => "Subsystem1: Go!\n";
}

// Some facades can work with multiple subsystems at the same time.
class Subsystem2
{
    public string Operation1() => "Subsystem2: Get ready!\n";

    public string OperationZ() => "Subsystem2: Fire!";
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
class Facade
{
    protected Subsystem1 subsystem1;
    protected Subsystem2 subsystem2;

    public Facade(Subsystem1 subsystem1 = null, Subsystem2 subsystem2 = null)
    {
        this.subsystem1 = subsystem1 ?? new Subsystem1();
        this.subsystem2 = subsystem2 ?? new Subsystem2();
    }

    public string Operation()
    {
        string result = "Facade initializes subsystems:\n";
        result += subsystem1.Operation1();
        result += subsystem2.Operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1.OperationN();
        result += subsystem2.OperationZ();
        return result;
    }
}

class Program
{
    // The client works with complex subsystems through the simple Facade.
    static void ClientCode(Facade facade)
    {
        Console.WriteLine(facade.Operation());
    }

    static void Main(string[] args)
    {
        Subsystem1 subsystem1 = new Subsystem1();
        Subsystem2 subsystem2 = new Subsystem2();
        Facade facade = new Facade(subsystem1, subsystem2);
        ClientCode(facade);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Subsystem1 can accept requests either from the facade or client directly.
type Subsystem1 struct{}

func (s *Subsystem1) Operation1() string { return "Subsystem1: Ready!\n" }
func (s *Subsystem1) OperationN() string { return "Subsystem1: Go!\n" }

// Subsystem2 shows that a facade can work with multiple subsystems.
type Subsystem2 struct{}

func (s *Subsystem2) Operation1() string { return "Subsystem2: Get ready!\n" }
func (s *Subsystem2) OperationZ() string { return "Subsystem2: Fire!" }

// Facade provides a simple interface to the complex logic of the subsystems,
// delegating client requests and managing their lifecycle.
type Facade struct {
	subsystem1 *Subsystem1
	subsystem2 *Subsystem2
}

func NewFacade(s1 *Subsystem1, s2 *Subsystem2) *Facade {
	if s1 == nil {
		s1 = &Subsystem1{}
	}
	if s2 == nil {
		s2 = &Subsystem2{}
	}
	return &Facade{subsystem1: s1, subsystem2: s2}
}

func (f *Facade) Operation() string {
	result := "Facade initializes subsystems:\n"
	result += f.subsystem1.Operation1()
	result += f.subsystem2.Operation1()
	result += "Facade orders subsystems to perform the action:\n"
	result += f.subsystem1.OperationN()
	result += f.subsystem2.OperationZ()
	return result
}

// clientCode works with complex subsystems through the simple Facade.
func clientCode(facade *Facade) {
	fmt.Println(facade.Operation())
}

func main() {
	subsystem1 := &Subsystem1{}
	subsystem2 := &Subsystem2{}
	facade := NewFacade(subsystem1, subsystem2)
	clientCode(facade)
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>

// The Subsystem can accept requests either from the facade or client directly.
class Subsystem1 {
public:
    std::string Operation1() const { return "Subsystem1: Ready!\n"; }
    std::string OperationN() const { return "Subsystem1: Go!\n"; }
};

// Some facades can work with multiple subsystems at the same time.
class Subsystem2 {
public:
    std::string Operation1() const { return "Subsystem2: Get ready!\n"; }
    std::string OperationZ() const { return "Subsystem2: Fire!"; }
};

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests to the appropriate objects.
class Facade {
protected:
    Subsystem1* subsystem1_;
    Subsystem2* subsystem2_;

public:
    Facade(Subsystem1* s1 = nullptr, Subsystem2* s2 = nullptr)
        : subsystem1_(s1 ? s1 : new Subsystem1()),
          subsystem2_(s2 ? s2 : new Subsystem2()) {}

    std::string Operation() const {
        std::string result = "Facade initializes subsystems:\n";
        result += subsystem1_->Operation1();
        result += subsystem2_->Operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += subsystem1_->OperationN();
        result += subsystem2_->OperationZ();
        return result;
    }
};

// The client works with complex subsystems through the simple Facade.
void ClientCode(const Facade& facade) {
    std::cout << facade.Operation() << "\n";
}

int main() {
    Subsystem1* subsystem1 = new Subsystem1();
    Subsystem2* subsystem2 = new Subsystem2();
    Facade facade(subsystem1, subsystem2);
    ClientCode(facade);
    return 0;
}
```

## Rust Example

```rust
// A subsystem can accept requests either from the facade or client directly.
struct Subsystem1;

impl Subsystem1 {
    fn operation1(&self) -> String {
        "Subsystem1: Ready!\n".to_string()
    }
    fn operation_n(&self) -> String {
        "Subsystem1: Go!\n".to_string()
    }
}

// Some facades can work with multiple subsystems at the same time.
struct Subsystem2;

impl Subsystem2 {
    fn operation1(&self) -> String {
        "Subsystem2: Get ready!\n".to_string()
    }
    fn operation_z(&self) -> String {
        "Subsystem2: Fire!".to_string()
    }
}

// The Facade provides a simple interface to the complex logic of the
// subsystems, delegating client requests and managing their lifecycle.
struct Facade {
    subsystem1: Subsystem1,
    subsystem2: Subsystem2,
}

impl Facade {
    fn new() -> Self {
        Facade {
            subsystem1: Subsystem1,
            subsystem2: Subsystem2,
        }
    }

    fn operation(&self) -> String {
        let mut result = String::from("Facade initializes subsystems:\n");
        result += &self.subsystem1.operation1();
        result += &self.subsystem2.operation1();
        result += "Facade orders subsystems to perform the action:\n";
        result += &self.subsystem1.operation_n();
        result += &self.subsystem2.operation_z();
        result
    }
}

// The client works with complex subsystems through the simple Facade.
fn client_code(facade: &Facade) {
    println!("{}", facade.operation());
}

fn main() {
    let facade = Facade::new();
    client_code(&facade);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a plain function `(kind) => Product`, or a `Record<Kind, () => Product>` map — no Creator subclass |
| Python | a dict of callables, or `@classmethod` alternate constructors (`from_json`) |
| Java | static factory methods (`of`, `from`), a `Map<Kind, Supplier<T>>`, or a sealed interface + `switch` |
| C# | a static `Create(...)` method or a `Dictionary<Kind, Func<T>>` |
| Go | `NewX(...)` constructor funcs, or `map[string]func() X` |
| C++ | a free function returning `std::unique_ptr<Base>`, or a map of `std::function` |
| Rust | `fn new()` / `From` / `TryFrom` impls, or an enum + `match` |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Product(ABC):
    """Declares the operations that all concrete products must implement."""

    @abstractmethod
    def operation(self) -> str:
        pass


class ConcreteProduct1(Product):
    def operation(self) -> str:
        return "{Result of the ConcreteProduct1}"


class ConcreteProduct2(Product):
    def operation(self) -> str:
        return "{Result of the ConcreteProduct2}"


class Creator(ABC):
    """
    Declares the factory method that returns a Product. Subclasses provide the
    implementation. Note the Creator's primary responsibility is business logic,
    not creation.
    """

    @abstractmethod
    def factory_method(self) -> Product:
        pass

    def some_operation(self) -> str:
        product = self.factory_method()
        return f"Creator: The same creator's code has just worked with {product.operation()}"


class ConcreteCreator1(Creator):
    def factory_method(self) -> Product:
        return ConcreteProduct1()


class ConcreteCreator2(Creator):
    def factory_method(self) -> Product:
        return ConcreteProduct2()


def client_code(creator: Creator) -> None:
    print("Client: I'm not aware of the creator's class, but it still works.")
    print(creator.some_operation())


if __name__ == "__main__":
    print("App: Launched with the ConcreteCreator1.")
    client_code(ConcreteCreator1())
    print()
    print("App: Launched with the ConcreteCreator2.")
    client_code(ConcreteCreator2())
```

## Java Example

```java
// The Product interface declares the operations that all concrete products
// must implement.
interface Product {
    String operation();
}

class ConcreteProduct1 implements Product {
    public String operation() {
        return "{Result of the ConcreteProduct1}";
    }
}

class ConcreteProduct2 implements Product {
    public String operation() {
        return "{Result of the ConcreteProduct2}";
    }
}

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
abstract class Creator {
    public abstract Product factoryMethod();

    public String someOperation() {
        Product product = factoryMethod();
        return "Creator: The same creator's code has just worked with " + product.operation();
    }
}

class ConcreteCreator1 extends Creator {
    public Product factoryMethod() {
        return new ConcreteProduct1();
    }
}

class ConcreteCreator2 extends Creator {
    public Product factoryMethod() {
        return new ConcreteProduct2();
    }
}

public class Demo {
    static void clientCode(Creator creator) {
        System.out.println("Client: I'm not aware of the creator's class, but it still works.");
        System.out.println(creator.someOperation());
    }

    public static void main(String[] args) {
        System.out.println("App: Launched with the ConcreteCreator1.");
        clientCode(new ConcreteCreator1());
        System.out.println();
        System.out.println("App: Launched with the ConcreteCreator2.");
        clientCode(new ConcreteCreator2());
    }
}
```

## C# Example

```csharp
using System;

// The Product interface declares the operations that all concrete products
// must implement.
public interface IProduct
{
    string Operation();
}

public class ConcreteProduct1 : IProduct
{
    public string Operation() => "{Result of the ConcreteProduct1}";
}

public class ConcreteProduct2 : IProduct
{
    public string Operation() => "{Result of the ConcreteProduct2}";
}

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
public abstract class Creator
{
    public abstract IProduct FactoryMethod();

    public string SomeOperation()
    {
        var product = FactoryMethod();
        return "Creator: The same creator's code has just worked with " + product.Operation();
    }
}

public class ConcreteCreator1 : Creator
{
    public override IProduct FactoryMethod() => new ConcreteProduct1();
}

public class ConcreteCreator2 : Creator
{
    public override IProduct FactoryMethod() => new ConcreteProduct2();
}

public class Program
{
    static void ClientCode(Creator creator)
    {
        Console.WriteLine("Client: I'm not aware of the creator's class, but it still works.");
        Console.WriteLine(creator.SomeOperation());
    }

    public static void Main()
    {
        Console.WriteLine("App: Launched with the ConcreteCreator1.");
        ClientCode(new ConcreteCreator1());
        Console.WriteLine();
        Console.WriteLine("App: Launched with the ConcreteCreator2.");
        ClientCode(new ConcreteCreator2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Product declares the operations that all concrete products must implement.
type Product interface {
	Operation() string
}

type ConcreteProduct1 struct{}

func (p *ConcreteProduct1) Operation() string {
	return "{Result of the ConcreteProduct1}"
}

type ConcreteProduct2 struct{}

func (p *ConcreteProduct2) Operation() string {
	return "{Result of the ConcreteProduct2}"
}

// Creator declares the factory method. Concrete creators supply the product.
type Creator interface {
	FactoryMethod() Product
	SomeOperation() string
}

// baseCreator embeds the shared business logic that relies on the product.
type baseCreator struct {
	factory func() Product
}

func (c *baseCreator) SomeOperation() string {
	product := c.factory()
	return "Creator: The same creator's code has just worked with " + product.Operation()
}

type ConcreteCreator1 struct{ baseCreator }

func NewConcreteCreator1() *ConcreteCreator1 {
	c := &ConcreteCreator1{}
	c.factory = c.FactoryMethod
	return c
}

func (c *ConcreteCreator1) FactoryMethod() Product { return &ConcreteProduct1{} }

type ConcreteCreator2 struct{ baseCreator }

func NewConcreteCreator2() *ConcreteCreator2 {
	c := &ConcreteCreator2{}
	c.factory = c.FactoryMethod
	return c
}

func (c *ConcreteCreator2) FactoryMethod() Product { return &ConcreteProduct2{} }

func clientCode(creator Creator) {
	fmt.Println("Client: I'm not aware of the creator's class, but it still works.")
	fmt.Println(creator.SomeOperation())
}

func main() {
	fmt.Println("App: Launched with the ConcreteCreator1.")
	clientCode(NewConcreteCreator1())
	fmt.Println()
	fmt.Println("App: Launched with the ConcreteCreator2.")
	clientCode(NewConcreteCreator2())
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>

// The Product interface declares the operations that all concrete products
// must implement.
class Product {
public:
    virtual ~Product() = default;
    virtual std::string operation() const = 0;
};

class ConcreteProduct1 : public Product {
public:
    std::string operation() const override {
        return "{Result of the ConcreteProduct1}";
    }
};

class ConcreteProduct2 : public Product {
public:
    std::string operation() const override {
        return "{Result of the ConcreteProduct2}";
    }
};

// The Creator declares the factory method that returns a Product. Subclasses
// provide the implementation.
class Creator {
public:
    virtual ~Creator() = default;
    virtual std::unique_ptr<Product> factoryMethod() const = 0;

    std::string someOperation() const {
        auto product = factoryMethod();
        return "Creator: The same creator's code has just worked with " + product->operation();
    }
};

class ConcreteCreator1 : public Creator {
public:
    std::unique_ptr<Product> factoryMethod() const override {
        return std::make_unique<ConcreteProduct1>();
    }
};

class ConcreteCreator2 : public Creator {
public:
    std::unique_ptr<Product> factoryMethod() const override {
        return std::make_unique<ConcreteProduct2>();
    }
};

void clientCode(const Creator& creator) {
    std::cout << "Client: I'm not aware of the creator's class, but it still works.\n";
    std::cout << creator.someOperation() << "\n";
}

int main() {
    std::cout << "App: Launched with the ConcreteCreator1.\n";
    clientCode(ConcreteCreator1());
    std::cout << "\n";
    std::cout << "App: Launched with the ConcreteCreator2.\n";
    clientCode(ConcreteCreator2());
    return 0;
}
```

## Rust Example

```rust
// The Product trait declares the operations that all concrete products must
// implement.
trait Product {
    fn operation(&self) -> String;
}

struct ConcreteProduct1;

impl Product for ConcreteProduct1 {
    fn operation(&self) -> String {
        "{Result of the ConcreteProduct1}".to_string()
    }
}

struct ConcreteProduct2;

impl Product for ConcreteProduct2 {
    fn operation(&self) -> String {
        "{Result of the ConcreteProduct2}".to_string()
    }
}

// The Creator declares the factory method that returns a Product. Implementors
// change the resulting product's type. some_operation holds the business logic.
trait Creator {
    fn factory_method(&self) -> Box<dyn Product>;

    fn some_operation(&self) -> String {
        let product = self.factory_method();
        format!(
            "Creator: The same creator's code has just worked with {}",
            product.operation()
        )
    }
}

struct ConcreteCreator1;

impl Creator for ConcreteCreator1 {
    fn factory_method(&self) -> Box<dyn Product> {
        Box::new(ConcreteProduct1)
    }
}

struct ConcreteCreator2;

impl Creator for ConcreteCreator2 {
    fn factory_method(&self) -> Box<dyn Product> {
        Box::new(ConcreteProduct2)
    }
}

fn client_code(creator: &dyn Creator) {
    println!("Client: I'm not aware of the creator's class, but it still works.");
    println!("{}", creator.some_operation());
}

fn main() {
    println!("App: Launched with the ConcreteCreator1.");
    client_code(&ConcreteCreator1);
    println!();
    println!("App: Launched with the ConcreteCreator2.");
    client_code(&ConcreteCreator2);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a `Map` cache of shared immutable objects |
| Python | an `lru_cache`d factory, `sys.intern`, and `__slots__` |
| Java | `valueOf`-style caches, `Map.computeIfAbsent` |
| C# | `ConcurrentDictionary.GetOrAdd`, `string.Intern` |
| Go | a map cache, or `unique.Make` (Go 1.23+) |
| C++ | an `unordered_map` of `shared_ptr<const T>` |
| Rust | an `Arc<T>` interner (`HashMap<K, Arc<T>>`) |

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

## Python Example

```python
import json
from typing import Dict, List


class Flyweight:
    """
    The Flyweight stores a common portion of the state (intrinsic state) that
    belongs to multiple real business entities. The Flyweight accepts the rest
    of the state (extrinsic state, unique for each entity) via method params.
    """

    def __init__(self, shared_state: List[str]) -> None:
        self._shared_state = shared_state

    def operation(self, unique_state: List[str]) -> None:
        s = json.dumps(self._shared_state)
        u = json.dumps(unique_state)
        print(f"Flyweight: Displaying shared ({s}) and unique ({u}) state.")


class FlyweightFactory:
    """
    The Flyweight Factory creates and manages the Flyweight objects. It ensures
    that flyweights are shared correctly. When the client requests a flyweight,
    the factory either returns an existing instance or creates a new one.
    """

    _flyweights: Dict[str, Flyweight] = {}

    def __init__(self, initial_flyweights: List[List[str]]) -> None:
        for state in initial_flyweights:
            self._flyweights[self.get_key(state)] = Flyweight(state)

    def get_key(self, state: List[str]) -> str:
        return "_".join(state)

    def get_flyweight(self, shared_state: List[str]) -> Flyweight:
        key = self.get_key(shared_state)
        if key not in self._flyweights:
            print("FlyweightFactory: Can't find a flyweight, creating new one.")
            self._flyweights[key] = Flyweight(shared_state)
        else:
            print("FlyweightFactory: Reusing existing flyweight.")
        return self._flyweights[key]

    def list_flyweights(self) -> None:
        count = len(self._flyweights)
        print(f"\nFlyweightFactory: I have {count} flyweights:")
        print("\n".join(self._flyweights.keys()))


def add_car_to_police_database(
    factory: FlyweightFactory, plates: str, owner: str,
    brand: str, model: str, color: str,
) -> None:
    print("\nClient: Adding a car to database.")
    flyweight = factory.get_flyweight([brand, model, color])
    flyweight.operation([plates, owner])


if __name__ == "__main__":
    factory = FlyweightFactory([
        ["Chevrolet", "Camaro2018", "pink"],
        ["Mercedes Benz", "C300", "black"],
        ["Mercedes Benz", "C500", "red"],
        ["BMW", "M5", "red"],
        ["BMW", "X6", "white"],
    ])
    factory.list_flyweights()

    add_car_to_police_database(factory, "CL234IR", "James Doe", "BMW", "M5", "red")
    add_car_to_police_database(factory, "CL234IR", "James Doe", "BMW", "X1", "red")

    factory.list_flyweights()
```

## Java Example

```java
import java.util.HashMap;
import java.util.Map;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
class Flyweight {
    private final String[] sharedState;

    public Flyweight(String[] sharedState) {
        this.sharedState = sharedState;
    }

    public void operation(String[] uniqueState) {
        System.out.println("Flyweight: Displaying shared (" +
                String.join(",", sharedState) + ") and unique (" +
                String.join(",", uniqueState) + ") state.");
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
class FlyweightFactory {
    private final Map<String, Flyweight> flyweights = new HashMap<>();

    public FlyweightFactory(String[][] initialFlyweights) {
        for (String[] state : initialFlyweights) {
            flyweights.put(getKey(state), new Flyweight(state));
        }
    }

    private String getKey(String[] state) {
        return String.join("_", state);
    }

    public Flyweight getFlyweight(String[] sharedState) {
        String key = getKey(sharedState);
        if (!flyweights.containsKey(key)) {
            System.out.println("FlyweightFactory: Can't find a flyweight, creating new one.");
            flyweights.put(key, new Flyweight(sharedState));
        } else {
            System.out.println("FlyweightFactory: Reusing existing flyweight.");
        }
        return flyweights.get(key);
    }

    public void listFlyweights() {
        System.out.println("\nFlyweightFactory: I have " + flyweights.size() + " flyweights:");
        flyweights.keySet().forEach(System.out::println);
    }
}

public class Demo {
    static void addCarToPoliceDatabase(FlyweightFactory ff, String plates,
            String owner, String brand, String model, String color) {
        System.out.println("\nClient: Adding a car to database.");
        Flyweight flyweight = ff.getFlyweight(new String[]{brand, model, color});
        flyweight.operation(new String[]{plates, owner});
    }

    public static void main(String[] args) {
        FlyweightFactory factory = new FlyweightFactory(new String[][]{
                {"Chevrolet", "Camaro2018", "pink"},
                {"Mercedes Benz", "C300", "black"},
                {"Mercedes Benz", "C500", "red"},
                {"BMW", "M5", "red"},
                {"BMW", "X6", "white"},
        });
        factory.listFlyweights();

        addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
        addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

        factory.listFlyweights();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
public class Flyweight
{
    private readonly string[] _sharedState;

    public Flyweight(string[] sharedState)
    {
        _sharedState = sharedState;
    }

    public void Operation(string[] uniqueState)
    {
        Console.WriteLine($"Flyweight: Displaying shared ({string.Join(",", _sharedState)}) " +
            $"and unique ({string.Join(",", uniqueState)}) state.");
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
public class FlyweightFactory
{
    private readonly Dictionary<string, Flyweight> _flyweights = new();

    public FlyweightFactory(string[][] initialFlyweights)
    {
        foreach (var state in initialFlyweights)
            _flyweights[GetKey(state)] = new Flyweight(state);
    }

    private string GetKey(string[] state) => string.Join("_", state);

    public Flyweight GetFlyweight(string[] sharedState)
    {
        var key = GetKey(sharedState);
        if (!_flyweights.ContainsKey(key))
        {
            Console.WriteLine("FlyweightFactory: Can't find a flyweight, creating new one.");
            _flyweights[key] = new Flyweight(sharedState);
        }
        else
        {
            Console.WriteLine("FlyweightFactory: Reusing existing flyweight.");
        }
        return _flyweights[key];
    }

    public void ListFlyweights()
    {
        Console.WriteLine($"\nFlyweightFactory: I have {_flyweights.Count} flyweights:");
        foreach (var key in _flyweights.Keys)
            Console.WriteLine(key);
    }
}

public class Demo
{
    static void AddCarToPoliceDatabase(FlyweightFactory ff, string plates,
        string owner, string brand, string model, string color)
    {
        Console.WriteLine("\nClient: Adding a car to database.");
        var flyweight = ff.GetFlyweight(new[] { brand, model, color });
        flyweight.Operation(new[] { plates, owner });
    }

    public static void Main(string[] args)
    {
        var factory = new FlyweightFactory(new[]
        {
            new[] { "Chevrolet", "Camaro2018", "pink" },
            new[] { "Mercedes Benz", "C300", "black" },
            new[] { "Mercedes Benz", "C500", "red" },
            new[] { "BMW", "M5", "red" },
            new[] { "BMW", "X6", "white" },
        });
        factory.ListFlyweights();

        AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
        AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

        factory.ListFlyweights();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"strings"
)

// Flyweight stores a common portion of the state (intrinsic state) that belongs
// to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
type Flyweight struct {
	sharedState []string
}

func (f *Flyweight) Operation(uniqueState []string) {
	fmt.Printf("Flyweight: Displaying shared (%s) and unique (%s) state.\n",
		strings.Join(f.sharedState, ","), strings.Join(uniqueState, ","))
}

// FlyweightFactory creates and manages the Flyweight objects. When the client
// requests a flyweight, the factory returns an existing instance or creates one.
type FlyweightFactory struct {
	flyweights map[string]*Flyweight
}

func NewFlyweightFactory(initialFlyweights [][]string) *FlyweightFactory {
	factory := &FlyweightFactory{flyweights: make(map[string]*Flyweight)}
	for _, state := range initialFlyweights {
		factory.flyweights[factory.getKey(state)] = &Flyweight{sharedState: state}
	}
	return factory
}

func (f *FlyweightFactory) getKey(state []string) string {
	return strings.Join(state, "_")
}

func (f *FlyweightFactory) GetFlyweight(sharedState []string) *Flyweight {
	key := f.getKey(sharedState)
	if _, ok := f.flyweights[key]; !ok {
		fmt.Println("FlyweightFactory: Can't find a flyweight, creating new one.")
		f.flyweights[key] = &Flyweight{sharedState: sharedState}
	} else {
		fmt.Println("FlyweightFactory: Reusing existing flyweight.")
	}
	return f.flyweights[key]
}

func (f *FlyweightFactory) ListFlyweights() {
	fmt.Printf("\nFlyweightFactory: I have %d flyweights:\n", len(f.flyweights))
	for key := range f.flyweights {
		fmt.Println(key)
	}
}

func addCarToPoliceDatabase(ff *FlyweightFactory, plates, owner, brand, model, color string) {
	fmt.Println("\nClient: Adding a car to database.")
	flyweight := ff.GetFlyweight([]string{brand, model, color})
	flyweight.Operation([]string{plates, owner})
}

func main() {
	factory := NewFlyweightFactory([][]string{
		{"Chevrolet", "Camaro2018", "pink"},
		{"Mercedes Benz", "C300", "black"},
		{"Mercedes Benz", "C500", "red"},
		{"BMW", "M5", "red"},
		{"BMW", "X6", "white"},
	})
	factory.ListFlyweights()

	addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red")
	addCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red")

	factory.ListFlyweights()
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
class Flyweight {
private:
    std::vector<std::string> shared_state_;

    static std::string Join(const std::vector<std::string>& parts, const std::string& sep) {
        std::string result;
        for (size_t i = 0; i < parts.size(); ++i) {
            if (i) result += sep;
            result += parts[i];
        }
        return result;
    }

public:
    explicit Flyweight(std::vector<std::string> shared_state)
        : shared_state_(std::move(shared_state)) {}

    void Operation(const std::vector<std::string>& unique_state) const {
        std::cout << "Flyweight: Displaying shared (" << Join(shared_state_, ",")
                  << ") and unique (" << Join(unique_state, ",") << ") state.\n";
    }

    const std::vector<std::string>& GetState() const { return shared_state_; }
};

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
class FlyweightFactory {
private:
    std::unordered_map<std::string, Flyweight> flyweights_;

    static std::string GetKey(const std::vector<std::string>& state) {
        std::string key;
        for (size_t i = 0; i < state.size(); ++i) {
            if (i) key += "_";
            key += state[i];
        }
        return key;
    }

public:
    explicit FlyweightFactory(std::initializer_list<std::vector<std::string>> initial) {
        for (const auto& state : initial)
            flyweights_.emplace(GetKey(state), Flyweight(state));
    }

    Flyweight& GetFlyweight(const std::vector<std::string>& shared_state) {
        std::string key = GetKey(shared_state);
        if (flyweights_.find(key) == flyweights_.end()) {
            std::cout << "FlyweightFactory: Can't find a flyweight, creating new one.\n";
            flyweights_.emplace(key, Flyweight(shared_state));
        } else {
            std::cout << "FlyweightFactory: Reusing existing flyweight.\n";
        }
        return flyweights_.at(key);
    }

    void ListFlyweights() const {
        std::cout << "\nFlyweightFactory: I have " << flyweights_.size() << " flyweights:\n";
        for (const auto& pair : flyweights_)
            std::cout << pair.first << "\n";
    }
};

void AddCarToPoliceDatabase(FlyweightFactory& ff, const std::string& plates,
        const std::string& owner, const std::string& brand,
        const std::string& model, const std::string& color) {
    std::cout << "\nClient: Adding a car to database.\n";
    Flyweight& flyweight = ff.GetFlyweight({brand, model, color});
    flyweight.Operation({plates, owner});
}

int main() {
    FlyweightFactory factory{
        {"Chevrolet", "Camaro2018", "pink"},
        {"Mercedes Benz", "C300", "black"},
        {"Mercedes Benz", "C500", "red"},
        {"BMW", "M5", "red"},
        {"BMW", "X6", "white"},
    };
    factory.ListFlyweights();

    AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "M5", "red");
    AddCarToPoliceDatabase(factory, "CL234IR", "James Doe", "BMW", "X1", "red");

    factory.ListFlyweights();

    return 0;
}
```

## Rust Example

```rust
use std::collections::HashMap;

// The Flyweight stores a common portion of the state (intrinsic state) that
// belongs to multiple real business entities. It accepts the rest of the state
// (extrinsic state, unique for each entity) via its method parameters.
struct Flyweight {
    shared_state: Vec<String>,
}

impl Flyweight {
    fn new(shared_state: Vec<String>) -> Self {
        Flyweight { shared_state }
    }

    fn operation(&self, unique_state: &[String]) {
        println!(
            "Flyweight: Displaying shared ({}) and unique ({}) state.",
            self.shared_state.join(","),
            unique_state.join(",")
        );
    }
}

// The Flyweight Factory creates and manages the Flyweight objects. When the
// client requests a flyweight, the factory returns an existing instance or
// creates a new one.
struct FlyweightFactory {
    flyweights: HashMap<String, Flyweight>,
}

impl FlyweightFactory {
    fn new(initial_flyweights: Vec<Vec<String>>) -> Self {
        let mut flyweights = HashMap::new();
        for state in initial_flyweights {
            flyweights.insert(Self::get_key(&state), Flyweight::new(state));
        }
        FlyweightFactory { flyweights }
    }

    fn get_key(state: &[String]) -> String {
        state.join("_")
    }

    fn get_flyweight(&mut self, shared_state: Vec<String>) -> &Flyweight {
        let key = Self::get_key(&shared_state);
        if !self.flyweights.contains_key(&key) {
            println!("FlyweightFactory: Can't find a flyweight, creating new one.");
            self.flyweights.insert(key.clone(), Flyweight::new(shared_state));
        } else {
            println!("FlyweightFactory: Reusing existing flyweight.");
        }
        &self.flyweights[&key]
    }

    fn list_flyweights(&self) {
        println!("\nFlyweightFactory: I have {} flyweights:", self.flyweights.len());
        for key in self.flyweights.keys() {
            println!("{}", key);
        }
    }
}

fn add_car_to_police_database(
    factory: &mut FlyweightFactory, plates: &str, owner: &str,
    brand: &str, model: &str, color: &str,
) {
    println!("\nClient: Adding a car to database.");
    let flyweight = factory.get_flyweight(vec![
        brand.to_string(), model.to_string(), color.to_string(),
    ]);
    flyweight.operation(&[plates.to_string(), owner.to_string()]);
}

fn main() {
    let s = |v: &[&str]| v.iter().map(|x| x.to_string()).collect::<Vec<_>>();
    let mut factory = FlyweightFactory::new(vec![
        s(&["Chevrolet", "Camaro2018", "pink"]),
        s(&["Mercedes Benz", "C300", "black"]),
        s(&["Mercedes Benz", "C500", "red"]),
        s(&["BMW", "M5", "red"]),
        s(&["BMW", "X6", "white"]),
    ]);
    factory.list_flyweights();

    add_car_to_police_database(&mut factory, "CL234IR", "James Doe", "BMW", "M5", "red");
    add_car_to_police_database(&mut factory, "CL234IR", "James Doe", "BMW", "X1", "red");

    factory.list_flyweights();
}
```

## Pairs well with

Composite (flyweights as leaves in a Composite); Factory (Flyweight Factory is the gatekeeper that enforces sharing);
Strategy (flyweight-shared strategies).

---

<a id="functions"></a>

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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a generator function `function*` / `[Symbol.iterator]` |
| Python | a generator with `yield` |
| Java | `Iterable` + streams |
| C# | `yield return` / `IEnumerable<T>` |
| Go | range-over-func iterators `iter.Seq[T]` (Go 1.23+) |
| C++ | `begin`/`end` + range-for; C++20 ranges, C++23 `std::generator` |
| Rust | `impl Iterator`, `std::iter::from_fn` |

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

## Python Example

```python
from __future__ import annotations
from collections.abc import Iterable, Iterator
from typing import Any, List


class AlphabeticalOrderIterator(Iterator):
    """
    Concrete Iterators implement various traversal algorithms. These classes
    store the current traversal position at all times.
    """

    _position: int = None
    _reverse: bool = False

    def __init__(self, collection: WordsCollection, reverse: bool = False) -> None:
        self._collection = collection
        self._reverse = reverse
        self._position = -1 if reverse else 0

    def __next__(self) -> Any:
        try:
            value = self._collection[self._position]
            self._position += -1 if self._reverse else 1
        except IndexError:
            raise StopIteration()
        return value


class WordsCollection(Iterable):
    """
    Concrete Collections provide one or several methods for retrieving fresh
    iterator instances, compatible with the collection class.
    """

    def __init__(self, collection: List[Any] = None) -> None:
        self._collection = collection or []

    def __getitem__(self, index: int) -> Any:
        return self._collection[index]

    def __iter__(self) -> AlphabeticalOrderIterator:
        return AlphabeticalOrderIterator(self)

    def get_reverse_iterator(self) -> AlphabeticalOrderIterator:
        return AlphabeticalOrderIterator(self, True)

    def add_item(self, item: Any) -> None:
        self._collection.append(item)


if __name__ == "__main__":
    collection = WordsCollection()
    collection.add_item("First")
    collection.add_item("Second")
    collection.add_item("Third")

    print("Straight traversal:")
    for item in collection:
        print(item)

    print("")
    print("Reverse traversal:")
    for item in collection.get_reverse_iterator():
        print(item)
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;

/**
 * The Iterator interface declares the traversal operations.
 */
interface Iterator<T> {
    boolean valid();
    T next();
}

/**
 * The Aggregator interface retrieves an external iterator.
 */
interface Aggregator {
    Iterator<String> getIterator();
}

/**
 * Concrete Iterators implement various traversal algorithms and store the
 * current traversal position.
 */
class AlphabeticalOrderIterator implements Iterator<String> {
    private final WordsCollection collection;
    private int position;
    private final boolean reverse;

    public AlphabeticalOrderIterator(WordsCollection collection, boolean reverse) {
        this.collection = collection;
        this.reverse = reverse;
        this.position = reverse ? collection.getCount() - 1 : 0;
    }

    public boolean valid() {
        return reverse ? position >= 0 : position < collection.getCount();
    }

    public String next() {
        String item = collection.getItems().get(position);
        position += reverse ? -1 : 1;
        return item;
    }
}

/**
 * Concrete Collections return iterators compatible with the collection.
 */
class WordsCollection implements Aggregator {
    private final List<String> items = new ArrayList<>();

    public List<String> getItems() {
        return items;
    }

    public int getCount() {
        return items.size();
    }

    public void addItem(String item) {
        items.add(item);
    }

    public Iterator<String> getIterator() {
        return new AlphabeticalOrderIterator(this, false);
    }

    public Iterator<String> getReverseIterator() {
        return new AlphabeticalOrderIterator(this, true);
    }
}

public class Demo {
    public static void main(String[] args) {
        WordsCollection collection = new WordsCollection();
        collection.addItem("First");
        collection.addItem("Second");
        collection.addItem("Third");

        System.out.println("Straight traversal:");
        Iterator<String> iterator = collection.getIterator();
        while (iterator.valid()) {
            System.out.println(iterator.next());
        }

        System.out.println();
        System.out.println("Reverse traversal:");
        Iterator<String> reverseIterator = collection.getReverseIterator();
        while (reverseIterator.valid()) {
            System.out.println(reverseIterator.next());
        }
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Iterator interface declares the traversal operations.
public interface IIterator<T>
{
    bool Valid();
    T Next();
}

// The Aggregator interface retrieves an external iterator.
public interface IAggregator
{
    IIterator<string> GetIterator();
}

// Concrete Iterators implement various traversal algorithms and store the
// current traversal position.
public class AlphabeticalOrderIterator : IIterator<string>
{
    private readonly WordsCollection _collection;
    private int _position;
    private readonly bool _reverse;

    public AlphabeticalOrderIterator(WordsCollection collection, bool reverse)
    {
        _collection = collection;
        _reverse = reverse;
        _position = reverse ? collection.GetCount() - 1 : 0;
    }

    public bool Valid()
    {
        return _reverse ? _position >= 0 : _position < _collection.GetCount();
    }

    public string Next()
    {
        string item = _collection.GetItems()[_position];
        _position += _reverse ? -1 : 1;
        return item;
    }
}

// Concrete Collections return iterators compatible with the collection.
public class WordsCollection : IAggregator
{
    private readonly List<string> _items = new List<string>();

    public List<string> GetItems() => _items;

    public int GetCount() => _items.Count;

    public void AddItem(string item) => _items.Add(item);

    public IIterator<string> GetIterator() => new AlphabeticalOrderIterator(this, false);

    public IIterator<string> GetReverseIterator() => new AlphabeticalOrderIterator(this, true);
}

public class Program
{
    public static void Main()
    {
        var collection = new WordsCollection();
        collection.AddItem("First");
        collection.AddItem("Second");
        collection.AddItem("Third");

        Console.WriteLine("Straight traversal:");
        var iterator = collection.GetIterator();
        while (iterator.Valid())
            Console.WriteLine(iterator.Next());

        Console.WriteLine();
        Console.WriteLine("Reverse traversal:");
        var reverseIterator = collection.GetReverseIterator();
        while (reverseIterator.Valid())
            Console.WriteLine(reverseIterator.Next());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Iterator declares the traversal operations.
type Iterator interface {
	Valid() bool
	Next() string
}

// Aggregator retrieves an external iterator.
type Aggregator interface {
	GetIterator() Iterator
}

// AlphabeticalOrderIterator implements a traversal algorithm and stores the
// current traversal position.
type AlphabeticalOrderIterator struct {
	collection *WordsCollection
	position   int
	reverse    bool
}

func (it *AlphabeticalOrderIterator) Valid() bool {
	if it.reverse {
		return it.position >= 0
	}
	return it.position < it.collection.GetCount()
}

func (it *AlphabeticalOrderIterator) Next() string {
	item := it.collection.items[it.position]
	if it.reverse {
		it.position--
	} else {
		it.position++
	}
	return item
}

// WordsCollection returns iterators compatible with the collection.
type WordsCollection struct {
	items []string
}

func (c *WordsCollection) GetCount() int {
	return len(c.items)
}

func (c *WordsCollection) AddItem(item string) {
	c.items = append(c.items, item)
}

func (c *WordsCollection) GetIterator() Iterator {
	return &AlphabeticalOrderIterator{collection: c, position: 0, reverse: false}
}

func (c *WordsCollection) GetReverseIterator() Iterator {
	return &AlphabeticalOrderIterator{collection: c, position: len(c.items) - 1, reverse: true}
}

func main() {
	collection := &WordsCollection{}
	collection.AddItem("First")
	collection.AddItem("Second")
	collection.AddItem("Third")

	fmt.Println("Straight traversal:")
	for it := collection.GetIterator(); it.Valid(); {
		fmt.Println(it.Next())
	}

	fmt.Println("")
	fmt.Println("Reverse traversal:")
	for it := collection.GetReverseIterator(); it.Valid(); {
		fmt.Println(it.Next())
	}
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class WordsCollection;

// The Iterator interface declares the traversal operations.
class Iterator {
public:
    virtual ~Iterator() = default;
    virtual bool valid() const = 0;
    virtual std::string next() = 0;
};

// A Concrete Iterator implements a traversal algorithm and stores the current
// traversal position.
class AlphabeticalOrderIterator : public Iterator {
    const WordsCollection& collection_;
    int position_;
    bool reverse_;

public:
    AlphabeticalOrderIterator(const WordsCollection& collection, bool reverse);
    bool valid() const override;
    std::string next() override;
};

// Concrete Collections return iterators compatible with the collection.
class WordsCollection {
    std::vector<std::string> items_;

public:
    const std::vector<std::string>& getItems() const { return items_; }
    int getCount() const { return static_cast<int>(items_.size()); }
    void addItem(const std::string& item) { items_.push_back(item); }

    std::unique_ptr<Iterator> getIterator() {
        return std::make_unique<AlphabeticalOrderIterator>(*this, false);
    }
    std::unique_ptr<Iterator> getReverseIterator() {
        return std::make_unique<AlphabeticalOrderIterator>(*this, true);
    }
};

AlphabeticalOrderIterator::AlphabeticalOrderIterator(const WordsCollection& collection, bool reverse)
    : collection_(collection), reverse_(reverse) {
    position_ = reverse ? collection.getCount() - 1 : 0;
}

bool AlphabeticalOrderIterator::valid() const {
    return reverse_ ? position_ >= 0 : position_ < collection_.getCount();
}

std::string AlphabeticalOrderIterator::next() {
    std::string item = collection_.getItems()[position_];
    position_ += reverse_ ? -1 : 1;
    return item;
}

int main() {
    WordsCollection collection;
    collection.addItem("First");
    collection.addItem("Second");
    collection.addItem("Third");

    std::cout << "Straight traversal:\n";
    auto iterator = collection.getIterator();
    while (iterator->valid()) {
        std::cout << iterator->next() << "\n";
    }

    std::cout << "\nReverse traversal:\n";
    auto reverseIterator = collection.getReverseIterator();
    while (reverseIterator->valid()) {
        std::cout << reverseIterator->next() << "\n";
    }
}
```

## Rust Example

```rust
// A Concrete Iterator implements a traversal algorithm and stores the current
// traversal position.
struct AlphabeticalOrderIterator<'a> {
    collection: &'a WordsCollection,
    position: i32,
    reverse: bool,
}

impl<'a> AlphabeticalOrderIterator<'a> {
    fn new(collection: &'a WordsCollection, reverse: bool) -> Self {
        let position = if reverse { collection.get_count() - 1 } else { 0 };
        AlphabeticalOrderIterator { collection, position, reverse }
    }

    fn valid(&self) -> bool {
        if self.reverse {
            self.position >= 0
        } else {
            self.position < self.collection.get_count()
        }
    }

    fn next(&mut self) -> String {
        let item = self.collection.items[self.position as usize].clone();
        self.position += if self.reverse { -1 } else { 1 };
        item
    }
}

// The Concrete Collection returns iterators compatible with the collection.
struct WordsCollection {
    items: Vec<String>,
}

impl WordsCollection {
    fn new() -> Self {
        WordsCollection { items: Vec::new() }
    }

    fn get_count(&self) -> i32 {
        self.items.len() as i32
    }

    fn add_item(&mut self, item: &str) {
        self.items.push(item.to_string());
    }

    fn get_iterator(&self) -> AlphabeticalOrderIterator {
        AlphabeticalOrderIterator::new(self, false)
    }

    fn get_reverse_iterator(&self) -> AlphabeticalOrderIterator {
        AlphabeticalOrderIterator::new(self, true)
    }
}

fn main() {
    let mut collection = WordsCollection::new();
    collection.add_item("First");
    collection.add_item("Second");
    collection.add_item("Third");

    println!("Straight traversal:");
    let mut iterator = collection.get_iterator();
    while iterator.valid() {
        println!("{}", iterator.next());
    }

    println!();
    println!("Reverse traversal:");
    let mut reverse_iterator = collection.get_reverse_iterator();
    while reverse_iterator.valid() {
        println!("{}", reverse_iterator.next());
    }
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | an event bus or a single coordinating function; a state store |
| Python | one coordinating function, or an `asyncio.Queue` |
| Java | application events from the DI framework |
| C# | MediatR-style request handlers |
| Go | channels + one coordinating goroutine |
| C++ | a coordinator object that owns non-owning references to the peers |
| Rust | an `mpsc` channel + one owner loop (fits ownership rules) |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Mediator(ABC):
    @abstractmethod
    def notify(self, sender: object, event: str) -> None:
        ...


class ConcreteMediator(Mediator):
    def __init__(self, c1: Component1, c2: Component2) -> None:
        self._component1 = c1
        self._component1.mediator = self
        self._component2 = c2
        self._component2.mediator = self

    def notify(self, sender: object, event: str) -> None:
        if event == "A":
            print("Mediator reacts on A and triggers following operations:")
            self._component2.do_c()
        elif event == "D":
            print("Mediator reacts on D and triggers following operations:")
            self._component1.do_b()
            self._component2.do_c()


class BaseComponent:
    def __init__(self, mediator: Mediator | None = None) -> None:
        self._mediator = mediator

    @property
    def mediator(self) -> Mediator:
        return self._mediator

    @mediator.setter
    def mediator(self, mediator: Mediator) -> None:
        self._mediator = mediator


class Component1(BaseComponent):
    def do_a(self) -> None:
        print("Component 1 does A.")
        self.mediator.notify(self, "A")

    def do_b(self) -> None:
        print("Component 1 does B.")
        self.mediator.notify(self, "B")


class Component2(BaseComponent):
    def do_c(self) -> None:
        print("Component 2 does C.")
        self.mediator.notify(self, "C")

    def do_d(self) -> None:
        print("Component 2 does D.")
        self.mediator.notify(self, "D")


if __name__ == "__main__":
    c1 = Component1()
    c2 = Component2()
    ConcreteMediator(c1, c2)

    print("Client triggers operation A.")
    c1.do_a()

    print("\nClient triggers operation D.")
    c2.do_d()
```

## Java Example

```java
interface Mediator {
    void notify(Object sender, String event);
}

class ConcreteMediator implements Mediator {
    private final Component1 component1;
    private final Component2 component2;

    public ConcreteMediator(Component1 c1, Component2 c2) {
        this.component1 = c1;
        this.component1.setMediator(this);
        this.component2 = c2;
        this.component2.setMediator(this);
    }

    @Override
    public void notify(Object sender, String event) {
        if (event.equals("A")) {
            System.out.println("Mediator reacts on A and triggers following operations:");
            component2.doC();
        } else if (event.equals("D")) {
            System.out.println("Mediator reacts on D and triggers following operations:");
            component1.doB();
            component2.doC();
        }
    }
}

abstract class BaseComponent {
    protected Mediator mediator;

    public void setMediator(Mediator mediator) {
        this.mediator = mediator;
    }
}

class Component1 extends BaseComponent {
    public void doA() {
        System.out.println("Component 1 does A.");
        mediator.notify(this, "A");
    }

    public void doB() {
        System.out.println("Component 1 does B.");
        mediator.notify(this, "B");
    }
}

class Component2 extends BaseComponent {
    public void doC() {
        System.out.println("Component 2 does C.");
        mediator.notify(this, "C");
    }

    public void doD() {
        System.out.println("Component 2 does D.");
        mediator.notify(this, "D");
    }
}

public class Demo {
    public static void main(String[] args) {
        Component1 c1 = new Component1();
        Component2 c2 = new Component2();
        new ConcreteMediator(c1, c2);

        System.out.println("Client triggers operation A.");
        c1.doA();

        System.out.println("\nClient triggers operation D.");
        c2.doD();
    }
}
```

## C# Example

```csharp
using System;

interface IMediator
{
    void Notify(object sender, string ev);
}

class ConcreteMediator : IMediator
{
    private readonly Component1 _component1;
    private readonly Component2 _component2;

    public ConcreteMediator(Component1 c1, Component2 c2)
    {
        _component1 = c1;
        _component1.Mediator = this;
        _component2 = c2;
        _component2.Mediator = this;
    }

    public void Notify(object sender, string ev)
    {
        if (ev == "A")
        {
            Console.WriteLine("Mediator reacts on A and triggers following operations:");
            _component2.DoC();
        }
        else if (ev == "D")
        {
            Console.WriteLine("Mediator reacts on D and triggers following operations:");
            _component1.DoB();
            _component2.DoC();
        }
    }
}

abstract class BaseComponent
{
    public IMediator Mediator { get; set; }
}

class Component1 : BaseComponent
{
    public void DoA()
    {
        Console.WriteLine("Component 1 does A.");
        Mediator.Notify(this, "A");
    }

    public void DoB()
    {
        Console.WriteLine("Component 1 does B.");
        Mediator.Notify(this, "B");
    }
}

class Component2 : BaseComponent
{
    public void DoC()
    {
        Console.WriteLine("Component 2 does C.");
        Mediator.Notify(this, "C");
    }

    public void DoD()
    {
        Console.WriteLine("Component 2 does D.");
        Mediator.Notify(this, "D");
    }
}

class Program
{
    static void Main()
    {
        var c1 = new Component1();
        var c2 = new Component2();
        _ = new ConcreteMediator(c1, c2);

        Console.WriteLine("Client triggers operation A.");
        c1.DoA();

        Console.WriteLine("\nClient triggers operation D.");
        c2.DoD();
    }
}
```

## Go Example

```go
package main

import "fmt"

type Mediator interface {
	Notify(sender any, event string)
}

type ConcreteMediator struct {
	component1 *Component1
	component2 *Component2
}

func NewConcreteMediator(c1 *Component1, c2 *Component2) *ConcreteMediator {
	m := &ConcreteMediator{component1: c1, component2: c2}
	c1.mediator = m
	c2.mediator = m
	return m
}

func (m *ConcreteMediator) Notify(sender any, event string) {
	switch event {
	case "A":
		fmt.Println("Mediator reacts on A and triggers following operations:")
		m.component2.DoC()
	case "D":
		fmt.Println("Mediator reacts on D and triggers following operations:")
		m.component1.DoB()
		m.component2.DoC()
	}
}

type Component1 struct {
	mediator Mediator
}

func (c *Component1) DoA() {
	fmt.Println("Component 1 does A.")
	c.mediator.Notify(c, "A")
}

func (c *Component1) DoB() {
	fmt.Println("Component 1 does B.")
	c.mediator.Notify(c, "B")
}

type Component2 struct {
	mediator Mediator
}

func (c *Component2) DoC() {
	fmt.Println("Component 2 does C.")
	c.mediator.Notify(c, "C")
}

func (c *Component2) DoD() {
	fmt.Println("Component 2 does D.")
	c.mediator.Notify(c, "D")
}

func main() {
	c1 := &Component1{}
	c2 := &Component2{}
	NewConcreteMediator(c1, c2)

	fmt.Println("Client triggers operation A.")
	c1.DoA()

	fmt.Println("\nClient triggers operation D.")
	c2.DoD()
}
```

## C++ Example

```cpp
#include <iostream>
#include <string>

class Component1;
class Component2;

class Mediator {
public:
    virtual ~Mediator() = default;
    virtual void Notify(const std::string& event) = 0;
};

class BaseComponent {
protected:
    Mediator* mediator_ = nullptr;
public:
    void SetMediator(Mediator* mediator) { mediator_ = mediator; }
};

class Component1 : public BaseComponent {
public:
    void DoA() {
        std::cout << "Component 1 does A.\n";
        mediator_->Notify("A");
    }
    void DoB() {
        std::cout << "Component 1 does B.\n";
        mediator_->Notify("B");
    }
};

class Component2 : public BaseComponent {
public:
    void DoC() {
        std::cout << "Component 2 does C.\n";
        mediator_->Notify("C");
    }
    void DoD() {
        std::cout << "Component 2 does D.\n";
        mediator_->Notify("D");
    }
};

class ConcreteMediator : public Mediator {
    Component1* component1_;
    Component2* component2_;
public:
    ConcreteMediator(Component1* c1, Component2* c2)
        : component1_(c1), component2_(c2) {
        component1_->SetMediator(this);
        component2_->SetMediator(this);
    }
    void Notify(const std::string& event) override {
        if (event == "A") {
            std::cout << "Mediator reacts on A and triggers following operations:\n";
            component2_->DoC();
        } else if (event == "D") {
            std::cout << "Mediator reacts on D and triggers following operations:\n";
            component1_->DoB();
            component2_->DoC();
        }
    }
};

int main() {
    Component1 c1;
    Component2 c2;
    ConcreteMediator mediator(&c1, &c2);

    std::cout << "Client triggers operation A.\n";
    c1.DoA();

    std::cout << "\nClient triggers operation D.\n";
    c2.DoD();
}
```

## Rust Example

```rust
use std::cell::RefCell;
use std::rc::Rc;

trait Mediator {
    fn notify(&self, event: &str);
}

#[derive(Default)]
struct Component1 {
    mediator: RefCell<Option<Rc<ConcreteMediator>>>,
}

impl Component1 {
    fn do_a(&self) {
        println!("Component 1 does A.");
        self.mediator.borrow().as_ref().unwrap().notify("A");
    }
    fn do_b(&self) {
        println!("Component 1 does B.");
    }
}

#[derive(Default)]
struct Component2 {
    mediator: RefCell<Option<Rc<ConcreteMediator>>>,
}

impl Component2 {
    fn do_c(&self) {
        println!("Component 2 does C.");
    }
    fn do_d(&self) {
        println!("Component 2 does D.");
        self.mediator.borrow().as_ref().unwrap().notify("D");
    }
}

struct ConcreteMediator {
    component1: Rc<Component1>,
    component2: Rc<Component2>,
}

impl Mediator for ConcreteMediator {
    fn notify(&self, event: &str) {
        match event {
            "A" => {
                println!("Mediator reacts on A and triggers following operations:");
                self.component2.do_c();
            }
            "D" => {
                println!("Mediator reacts on D and triggers following operations:");
                self.component1.do_b();
                self.component2.do_c();
            }
            _ => {}
        }
    }
}

fn main() {
    let c1 = Rc::new(Component1::default());
    let c2 = Rc::new(Component2::default());
    let mediator = Rc::new(ConcreteMediator {
        component1: Rc::clone(&c1),
        component2: Rc::clone(&c2),
    });
    *c1.mediator.borrow_mut() = Some(Rc::clone(&mediator));
    *c2.mediator.borrow_mut() = Some(Rc::clone(&mediator));

    println!("Client triggers operation A.");
    c1.do_a();

    println!("\nClient triggers operation D.");
    c2.do_d();
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | immutable snapshots (`structuredClone` / spread) pushed to a history array; Immer patches |
| Python | `copy.deepcopy` snapshots, frozen dataclasses |
| Java | records as immutable snapshots |
| C# | records + `with` snapshots |
| Go | copy the struct value into a history slice |
| C++ | copy value types into a `std::vector` history |
| Rust | `#[derive(Clone)]` snapshots in a `Vec` |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime
import random
import string


class Originator:
    def __init__(self, state: str) -> None:
        self._state = state
        print(f"Originator: My initial state is: {state}")

    def do_something(self) -> None:
        print("Originator: I'm doing something important.")
        self._state = "".join(random.choices(string.ascii_letters, k=30))
        print(f"Originator: and my state has changed to: {self._state}")

    def save(self) -> Memento:
        return ConcreteMemento(self._state)

    def restore(self, memento: Memento) -> None:
        self._state = memento.get_state()
        print(f"Originator: My state has changed to: {self._state}")


class Memento(ABC):
    @abstractmethod
    def get_state(self) -> str: ...

    @abstractmethod
    def get_name(self) -> str: ...

    @abstractmethod
    def get_date(self) -> str: ...


class ConcreteMemento(Memento):
    def __init__(self, state: str) -> None:
        self._state = state
        self._date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def get_state(self) -> str:
        return self._state

    def get_name(self) -> str:
        return f"{self._date} / ({self._state[:9]}...)"

    def get_date(self) -> str:
        return self._date


class Caretaker:
    def __init__(self, originator: Originator) -> None:
        self._mementos: list[Memento] = []
        self._originator = originator

    def backup(self) -> None:
        print("\nCaretaker: Saving Originator's state...")
        self._mementos.append(self._originator.save())

    def undo(self) -> None:
        if not self._mementos:
            return
        memento = self._mementos.pop()
        print(f"Caretaker: Restoring state to: {memento.get_name()}")
        self._originator.restore(memento)

    def show_history(self) -> None:
        print("Caretaker: Here's the list of mementos:")
        for memento in self._mementos:
            print(memento.get_name())


if __name__ == "__main__":
    originator = Originator("Super-duper-super-puper-super.")
    caretaker = Caretaker(originator)

    caretaker.backup()
    originator.do_something()
    caretaker.backup()
    originator.do_something()
    caretaker.backup()
    originator.do_something()

    print()
    caretaker.show_history()

    print("\nClient: Now, let's rollback!\n")
    caretaker.undo()

    print("\nClient: Once more!\n")
    caretaker.undo()
```

## Java Example

```java
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

class Originator {
    private String state;

    public Originator(String state) {
        this.state = state;
        System.out.println("Originator: My initial state is: " + state);
    }

    public void doSomething() {
        System.out.println("Originator: I'm doing something important.");
        this.state = generateRandomString(30);
        System.out.println("Originator: and my state has changed to: " + state);
    }

    private String generateRandomString(int length) {
        String chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    public Memento save() {
        return new ConcreteMemento(state);
    }

    public void restore(Memento memento) {
        this.state = memento.getState();
        System.out.println("Originator: My state has changed to: " + state);
    }
}

interface Memento {
    String getState();
    String getName();
    String getDate();
}

class ConcreteMemento implements Memento {
    private final String state;
    private final String date;

    public ConcreteMemento(String state) {
        this.state = state;
        this.date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    public String getState() { return state; }
    public String getName() { return date + " / (" + state.substring(0, 9) + "...)"; }
    public String getDate() { return date; }
}

class Caretaker {
    private final List<Memento> mementos = new ArrayList<>();
    private final Originator originator;

    public Caretaker(Originator originator) {
        this.originator = originator;
    }

    public void backup() {
        System.out.println("\nCaretaker: Saving Originator's state...");
        mementos.add(originator.save());
    }

    public void undo() {
        if (mementos.isEmpty()) return;
        Memento memento = mementos.remove(mementos.size() - 1);
        System.out.println("Caretaker: Restoring state to: " + memento.getName());
        originator.restore(memento);
    }

    public void showHistory() {
        System.out.println("Caretaker: Here's the list of mementos:");
        for (Memento memento : mementos) System.out.println(memento.getName());
    }
}

public class Demo {
    public static void main(String[] args) {
        Originator originator = new Originator("Super-duper-super-puper-super.");
        Caretaker caretaker = new Caretaker(originator);

        caretaker.backup();
        originator.doSomething();
        caretaker.backup();
        originator.doSomething();
        caretaker.backup();
        originator.doSomething();

        System.out.println();
        caretaker.showHistory();

        System.out.println("\nClient: Now, let's rollback!\n");
        caretaker.undo();

        System.out.println("\nClient: Once more!\n");
        caretaker.undo();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

class Originator
{
    private string _state;

    public Originator(string state)
    {
        _state = state;
        Console.WriteLine("Originator: My initial state is: " + state);
    }

    public void DoSomething()
    {
        Console.WriteLine("Originator: I'm doing something important.");
        _state = GenerateRandomString(30);
        Console.WriteLine("Originator: and my state has changed to: " + _state);
    }

    private string GenerateRandomString(int length)
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var rnd = new Random();
        var result = new char[length];
        for (int i = 0; i < length; i++) result[i] = chars[rnd.Next(chars.Length)];
        return new string(result);
    }

    public IMemento Save() => new ConcreteMemento(_state);

    public void Restore(IMemento memento)
    {
        _state = memento.GetState();
        Console.WriteLine("Originator: My state has changed to: " + _state);
    }
}

interface IMemento
{
    string GetState();
    string GetName();
    string GetDate();
}

class ConcreteMemento : IMemento
{
    private readonly string _state;
    private readonly string _date;

    public ConcreteMemento(string state)
    {
        _state = state;
        _date = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    }

    public string GetState() => _state;
    public string GetName() => $"{_date} / ({_state.Substring(0, 9)}...)";
    public string GetDate() => _date;
}

class Caretaker
{
    private readonly List<IMemento> _mementos = new();
    private readonly Originator _originator;

    public Caretaker(Originator originator) => _originator = originator;

    public void Backup()
    {
        Console.WriteLine("\nCaretaker: Saving Originator's state...");
        _mementos.Add(_originator.Save());
    }

    public void Undo()
    {
        if (_mementos.Count == 0) return;
        var memento = _mementos[^1];
        _mementos.RemoveAt(_mementos.Count - 1);
        Console.WriteLine("Caretaker: Restoring state to: " + memento.GetName());
        _originator.Restore(memento);
    }

    public void ShowHistory()
    {
        Console.WriteLine("Caretaker: Here's the list of mementos:");
        foreach (var memento in _mementos) Console.WriteLine(memento.GetName());
    }
}

class Program
{
    static void Main()
    {
        var originator = new Originator("Super-duper-super-puper-super.");
        var caretaker = new Caretaker(originator);

        caretaker.Backup();
        originator.DoSomething();
        caretaker.Backup();
        originator.DoSomething();
        caretaker.Backup();
        originator.DoSomething();

        Console.WriteLine();
        caretaker.ShowHistory();

        Console.WriteLine("\nClient: Now, let's rollback!\n");
        caretaker.Undo();

        Console.WriteLine("\nClient: Once more!\n");
        caretaker.Undo();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"math/rand"
	"time"
)

type Memento interface {
	GetState() string
	GetName() string
	GetDate() string
}

type Originator struct {
	state string
}

func NewOriginator(state string) *Originator {
	fmt.Println("Originator: My initial state is:", state)
	return &Originator{state: state}
}

func (o *Originator) DoSomething() {
	fmt.Println("Originator: I'm doing something important.")
	o.state = randomString(30)
	fmt.Println("Originator: and my state has changed to:", o.state)
}

func randomString(length int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	b := make([]byte, length)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func (o *Originator) Save() Memento {
	return &ConcreteMemento{state: o.state, date: time.Now().Format("2006-01-02 15:04:05")}
}

func (o *Originator) Restore(m Memento) {
	o.state = m.GetState()
	fmt.Println("Originator: My state has changed to:", o.state)
}

type ConcreteMemento struct {
	state string
	date  string
}

func (m *ConcreteMemento) GetState() string { return m.state }
func (m *ConcreteMemento) GetName() string  { return fmt.Sprintf("%s / (%s...)", m.date, m.state[:9]) }
func (m *ConcreteMemento) GetDate() string  { return m.date }

type Caretaker struct {
	mementos   []Memento
	originator *Originator
}

func (c *Caretaker) Backup() {
	fmt.Println("\nCaretaker: Saving Originator's state...")
	c.mementos = append(c.mementos, c.originator.Save())
}

func (c *Caretaker) Undo() {
	if len(c.mementos) == 0 {
		return
	}
	m := c.mementos[len(c.mementos)-1]
	c.mementos = c.mementos[:len(c.mementos)-1]
	fmt.Println("Caretaker: Restoring state to:", m.GetName())
	c.originator.Restore(m)
}

func (c *Caretaker) ShowHistory() {
	fmt.Println("Caretaker: Here's the list of mementos:")
	for _, m := range c.mementos {
		fmt.Println(m.GetName())
	}
}

func main() {
	originator := NewOriginator("Super-duper-super-puper-super.")
	caretaker := &Caretaker{originator: originator}

	caretaker.Backup()
	originator.DoSomething()
	caretaker.Backup()
	originator.DoSomething()
	caretaker.Backup()
	originator.DoSomething()

	fmt.Println()
	caretaker.ShowHistory()

	fmt.Println("\nClient: Now, let's rollback!\n")
	caretaker.Undo()

	fmt.Println("\nClient: Once more!\n")
	caretaker.Undo()
}
```

## C++ Example

```cpp
#include <chrono>
#include <ctime>
#include <iostream>
#include <memory>
#include <random>
#include <sstream>
#include <string>
#include <vector>

class Memento {
public:
    virtual ~Memento() = default;
    virtual std::string GetState() const = 0;
    virtual std::string GetName() const = 0;
};

class ConcreteMemento : public Memento {
    std::string state_;
    std::string date_;
public:
    explicit ConcreteMemento(std::string state) : state_(std::move(state)) {
        std::time_t now = std::time(nullptr);
        char buf[20];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", std::localtime(&now));
        date_ = buf;
    }
    std::string GetState() const override { return state_; }
    std::string GetName() const override { return date_ + " / (" + state_.substr(0, 9) + "...)"; }
};

class Originator {
    std::string state_;
    static std::string RandomString(int length) {
        const std::string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        std::mt19937 gen(std::random_device{}());
        std::uniform_int_distribution<> dist(0, chars.size() - 1);
        std::string s;
        for (int i = 0; i < length; ++i) s += chars[dist(gen)];
        return s;
    }
public:
    explicit Originator(std::string state) : state_(std::move(state)) {
        std::cout << "Originator: My initial state is: " << state_ << "\n";
    }
    void DoSomething() {
        std::cout << "Originator: I'm doing something important.\n";
        state_ = RandomString(30);
        std::cout << "Originator: and my state has changed to: " << state_ << "\n";
    }
    std::unique_ptr<Memento> Save() { return std::make_unique<ConcreteMemento>(state_); }
    void Restore(const Memento* memento) {
        state_ = memento->GetState();
        std::cout << "Originator: My state has changed to: " << state_ << "\n";
    }
};

class Caretaker {
    std::vector<std::unique_ptr<Memento>> mementos_;
    Originator* originator_;
public:
    explicit Caretaker(Originator* originator) : originator_(originator) {}
    void Backup() {
        std::cout << "\nCaretaker: Saving Originator's state...\n";
        mementos_.push_back(originator_->Save());
    }
    void Undo() {
        if (mementos_.empty()) return;
        auto memento = std::move(mementos_.back());
        mementos_.pop_back();
        std::cout << "Caretaker: Restoring state to: " << memento->GetName() << "\n";
        originator_->Restore(memento.get());
    }
    void ShowHistory() const {
        std::cout << "Caretaker: Here's the list of mementos:\n";
        for (const auto& memento : mementos_) std::cout << memento->GetName() << "\n";
    }
};

int main() {
    Originator originator("Super-duper-super-puper-super.");
    Caretaker caretaker(&originator);

    caretaker.Backup();
    originator.DoSomething();
    caretaker.Backup();
    originator.DoSomething();
    caretaker.Backup();
    originator.DoSomething();

    std::cout << "\n";
    caretaker.ShowHistory();

    std::cout << "\nClient: Now, let's rollback!\n\n";
    caretaker.Undo();

    std::cout << "\nClient: Once more!\n\n";
    caretaker.Undo();
}
```

## Rust Example

```rust
use rand::Rng;

struct Memento {
    state: String,
    date: String,
}

impl Memento {
    fn new(state: String) -> Self {
        Memento { state, date: "2026-01-01 12:00:00".to_string() }
    }
    fn name(&self) -> String {
        format!("{} / ({}...)", self.date, &self.state[..9.min(self.state.len())])
    }
}

struct Originator {
    state: String,
}

impl Originator {
    fn new(state: &str) -> Self {
        println!("Originator: My initial state is: {}", state);
        Originator { state: state.to_string() }
    }

    fn do_something(&mut self) {
        println!("Originator: I'm doing something important.");
        self.state = random_string(30);
        println!("Originator: and my state has changed to: {}", self.state);
    }

    fn save(&self) -> Memento {
        Memento::new(self.state.clone())
    }

    fn restore(&mut self, memento: &Memento) {
        self.state = memento.state.clone();
        println!("Originator: My state has changed to: {}", self.state);
    }
}

fn random_string(length: usize) -> String {
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let mut rng = rand::thread_rng();
    (0..length).map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char).collect()
}

struct Caretaker<'a> {
    mementos: Vec<Memento>,
    originator: &'a mut Originator,
}

impl<'a> Caretaker<'a> {
    fn new(originator: &'a mut Originator) -> Self {
        Caretaker { mementos: Vec::new(), originator }
    }

    fn backup(&mut self) {
        println!("\nCaretaker: Saving Originator's state...");
        self.mementos.push(self.originator.save());
    }

    fn undo(&mut self) {
        if let Some(memento) = self.mementos.pop() {
            println!("Caretaker: Restoring state to: {}", memento.name());
            self.originator.restore(&memento);
        }
    }

    fn show_history(&self) {
        println!("Caretaker: Here's the list of mementos:");
        for memento in &self.mementos {
            println!("{}", memento.name());
        }
    }
}

fn main() {
    let mut originator = Originator::new("Super-duper-super-puper-super.");
    let mut caretaker = Caretaker::new(&mut originator);

    caretaker.backup();
    caretaker.originator.do_something();
    caretaker.backup();
    caretaker.originator.do_something();
    caretaker.backup();
    caretaker.originator.do_something();

    println!();
    caretaker.show_history();

    println!("\nClient: Now, let's rollback!\n");
    caretaker.undo();

    println!("\nClient: Once more!\n");
    caretaker.undo();
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | `EventTarget` / an emitter, an array of callbacks, or signals |
| Python | a list of callbacks, or a signals library |
| Java | `PropertyChangeSupport`, `java.util.concurrent.Flow` |
| C# | built-in `event` delegates, `IObservable<T>` |
| Go | channels, or a slice of funcs |
| C++ | a `vector<std::function>` |
| Rust | channels (`broadcast`), or `Vec<Box<dyn Fn(&E)>>` |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from random import randrange
from typing import List


class Subject(ABC):
    """
    The Subject interface declares a set of methods for managing subscribers.
    """

    @abstractmethod
    def attach(self, observer: Observer) -> None:
        ...

    @abstractmethod
    def detach(self, observer: Observer) -> None:
        ...

    @abstractmethod
    def notify(self) -> None:
        ...


class ConcreteSubject(Subject):
    """
    The Subject owns some important state and notifies observers when it changes.
    """

    state: int = 0
    _observers: List[Observer] = []

    def attach(self, observer: Observer) -> None:
        if observer in self._observers:
            print("Subject: Observer has been attached already.")
            return
        print("Subject: Attached an observer.")
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        if observer not in self._observers:
            print("Subject: Nonexistent observer.")
            return
        self._observers.remove(observer)
        print("Subject: Detached an observer.")

    def notify(self) -> None:
        print("Subject: Notifying observers...")
        for observer in self._observers:
            observer.update(self)

    def some_business_logic(self) -> None:
        print("\nSubject: I'm doing something important.")
        self.state = randrange(0, 10)
        print(f"Subject: My state has just changed to: {self.state}")
        self.notify()


class Observer(ABC):
    """
    The Observer interface declares the update method, used by subjects.
    """

    @abstractmethod
    def update(self, subject: Subject) -> None:
        ...


class ConcreteObserverA(Observer):
    def update(self, subject: Subject) -> None:
        if subject.state < 3:
            print("ConcreteObserverA: Reacted to the event.")


class ConcreteObserverB(Observer):
    def update(self, subject: Subject) -> None:
        if subject.state == 0 or subject.state >= 2:
            print("ConcreteObserverB: Reacted to the event.")


if __name__ == "__main__":
    subject = ConcreteSubject()

    observer_a = ConcreteObserverA()
    subject.attach(observer_a)

    observer_b = ConcreteObserverB()
    subject.attach(observer_b)

    subject.some_business_logic()
    subject.some_business_logic()

    subject.detach(observer_b)

    subject.some_business_logic()
```

## Java Example

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * The Subject interface declares a set of methods for managing subscribers.
 */
interface Subject {
    void attach(Observer observer);
    void detach(Observer observer);
    void notifyObservers();
}

/**
 * The Observer interface declares the update method, used by subjects.
 */
interface Observer {
    void update(ConcreteSubject subject);
}

/**
 * The ConcreteSubject owns state and notifies observers when it changes.
 */
class ConcreteSubject implements Subject {
    public int state;
    private final List<Observer> observers = new ArrayList<>();

    public void attach(Observer observer) {
        if (observers.contains(observer)) {
            System.out.println("Subject: Observer has been attached already.");
            return;
        }
        System.out.println("Subject: Attached an observer.");
        observers.add(observer);
    }

    public void detach(Observer observer) {
        if (!observers.remove(observer)) {
            System.out.println("Subject: Nonexistent observer.");
            return;
        }
        System.out.println("Subject: Detached an observer.");
    }

    public void notifyObservers() {
        System.out.println("Subject: Notifying observers...");
        for (Observer observer : observers) {
            observer.update(this);
        }
    }

    public void someBusinessLogic() {
        System.out.println("\nSubject: I'm doing something important.");
        state = new Random().nextInt(11);
        System.out.println("Subject: My state has just changed to: " + state);
        notifyObservers();
    }
}

class ConcreteObserverA implements Observer {
    public void update(ConcreteSubject subject) {
        if (subject.state < 3) {
            System.out.println("ConcreteObserverA: Reacted to the event.");
        }
    }
}

class ConcreteObserverB implements Observer {
    public void update(ConcreteSubject subject) {
        if (subject.state == 0 || subject.state >= 2) {
            System.out.println("ConcreteObserverB: Reacted to the event.");
        }
    }
}

public class Demo {
    public static void main(String[] args) {
        ConcreteSubject subject = new ConcreteSubject();

        Observer observerA = new ConcreteObserverA();
        subject.attach(observerA);

        Observer observerB = new ConcreteObserverB();
        subject.attach(observerB);

        subject.someBusinessLogic();
        subject.someBusinessLogic();

        subject.detach(observerB);

        subject.someBusinessLogic();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

// The Subject interface declares a set of methods for managing subscribers.
public interface ISubject
{
    void Attach(IObserver observer);
    void Detach(IObserver observer);
    void Notify();
}

// The Observer interface declares the update method, used by subjects.
public interface IObserver
{
    void Update(ConcreteSubject subject);
}

// The ConcreteSubject owns state and notifies observers when it changes.
public class ConcreteSubject : ISubject
{
    public int State;
    private readonly List<IObserver> _observers = new List<IObserver>();

    public void Attach(IObserver observer)
    {
        if (_observers.Contains(observer))
        {
            Console.WriteLine("Subject: Observer has been attached already.");
            return;
        }
        Console.WriteLine("Subject: Attached an observer.");
        _observers.Add(observer);
    }

    public void Detach(IObserver observer)
    {
        if (!_observers.Remove(observer))
        {
            Console.WriteLine("Subject: Nonexistent observer.");
            return;
        }
        Console.WriteLine("Subject: Detached an observer.");
    }

    public void Notify()
    {
        Console.WriteLine("Subject: Notifying observers...");
        foreach (var observer in _observers)
        {
            observer.Update(this);
        }
    }

    public void SomeBusinessLogic()
    {
        Console.WriteLine("\nSubject: I'm doing something important.");
        State = new Random().Next(0, 11);
        Console.WriteLine($"Subject: My state has just changed to: {State}");
        Notify();
    }
}

public class ConcreteObserverA : IObserver
{
    public void Update(ConcreteSubject subject)
    {
        if (subject.State < 3)
            Console.WriteLine("ConcreteObserverA: Reacted to the event.");
    }
}

public class ConcreteObserverB : IObserver
{
    public void Update(ConcreteSubject subject)
    {
        if (subject.State == 0 || subject.State >= 2)
            Console.WriteLine("ConcreteObserverB: Reacted to the event.");
    }
}

public class Program
{
    public static void Main()
    {
        var subject = new ConcreteSubject();

        var observerA = new ConcreteObserverA();
        subject.Attach(observerA);

        var observerB = new ConcreteObserverB();
        subject.Attach(observerB);

        subject.SomeBusinessLogic();
        subject.SomeBusinessLogic();

        subject.Detach(observerB);

        subject.SomeBusinessLogic();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"math/rand"
)

// Observer declares the update method, used by subjects.
type Observer interface {
	Update(subject *ConcreteSubject)
}

// Subject declares a set of methods for managing subscribers.
type Subject interface {
	Attach(observer Observer)
	Detach(observer Observer)
	Notify()
}

// ConcreteSubject owns state and notifies observers when it changes.
type ConcreteSubject struct {
	State     int
	observers []Observer
}

func (s *ConcreteSubject) Attach(observer Observer) {
	for _, o := range s.observers {
		if o == observer {
			fmt.Println("Subject: Observer has been attached already.")
			return
		}
	}
	fmt.Println("Subject: Attached an observer.")
	s.observers = append(s.observers, observer)
}

func (s *ConcreteSubject) Detach(observer Observer) {
	for i, o := range s.observers {
		if o == observer {
			s.observers = append(s.observers[:i], s.observers[i+1:]...)
			fmt.Println("Subject: Detached an observer.")
			return
		}
	}
	fmt.Println("Subject: Nonexistent observer.")
}

func (s *ConcreteSubject) Notify() {
	fmt.Println("Subject: Notifying observers...")
	for _, o := range s.observers {
		o.Update(s)
	}
}

func (s *ConcreteSubject) SomeBusinessLogic() {
	fmt.Println("\nSubject: I'm doing something important.")
	s.State = rand.Intn(11)
	fmt.Printf("Subject: My state has just changed to: %d\n", s.State)
	s.Notify()
}

type ConcreteObserverA struct{}

func (ConcreteObserverA) Update(subject *ConcreteSubject) {
	if subject.State < 3 {
		fmt.Println("ConcreteObserverA: Reacted to the event.")
	}
}

type ConcreteObserverB struct{}

func (ConcreteObserverB) Update(subject *ConcreteSubject) {
	if subject.State == 0 || subject.State >= 2 {
		fmt.Println("ConcreteObserverB: Reacted to the event.")
	}
}

func main() {
	subject := &ConcreteSubject{}

	observerA := &ConcreteObserverA{}
	subject.Attach(observerA)

	observerB := &ConcreteObserverB{}
	subject.Attach(observerB)

	subject.SomeBusinessLogic()
	subject.SomeBusinessLogic()

	subject.Detach(observerB)

	subject.SomeBusinessLogic()
}
```

## C++ Example

```cpp
#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <vector>

class ConcreteSubject;

// The Observer interface declares the update method, used by subjects.
class Observer {
public:
    virtual ~Observer() = default;
    virtual void update(const ConcreteSubject& subject) = 0;
};

// The Subject owns state and notifies observers when it changes.
class ConcreteSubject {
    std::vector<Observer*> observers_;

public:
    int state = 0;

    void attach(Observer* observer) {
        if (std::find(observers_.begin(), observers_.end(), observer) != observers_.end()) {
            std::cout << "Subject: Observer has been attached already.\n";
            return;
        }
        std::cout << "Subject: Attached an observer.\n";
        observers_.push_back(observer);
    }

    void detach(Observer* observer) {
        auto it = std::find(observers_.begin(), observers_.end(), observer);
        if (it == observers_.end()) {
            std::cout << "Subject: Nonexistent observer.\n";
            return;
        }
        observers_.erase(it);
        std::cout << "Subject: Detached an observer.\n";
    }

    void notify() {
        std::cout << "Subject: Notifying observers...\n";
        for (Observer* observer : observers_) {
            observer->update(*this);
        }
    }

    void someBusinessLogic() {
        std::cout << "\nSubject: I'm doing something important.\n";
        state = std::rand() % 11;
        std::cout << "Subject: My state has just changed to: " << state << "\n";
        notify();
    }
};

class ConcreteObserverA : public Observer {
public:
    void update(const ConcreteSubject& subject) override {
        if (subject.state < 3) {
            std::cout << "ConcreteObserverA: Reacted to the event.\n";
        }
    }
};

class ConcreteObserverB : public Observer {
public:
    void update(const ConcreteSubject& subject) override {
        if (subject.state == 0 || subject.state >= 2) {
            std::cout << "ConcreteObserverB: Reacted to the event.\n";
        }
    }
};

int main() {
    ConcreteSubject subject;

    ConcreteObserverA observerA;
    subject.attach(&observerA);

    ConcreteObserverB observerB;
    subject.attach(&observerB);

    subject.someBusinessLogic();
    subject.someBusinessLogic();

    subject.detach(&observerB);

    subject.someBusinessLogic();
}
```

## Rust Example

```rust
use std::rc::Rc;

// The Observer trait declares the update method, used by subjects.
trait Observer {
    fn update(&self, state: i32);
}

// The Subject owns state and notifies observers when it changes.
struct ConcreteSubject {
    state: i32,
    observers: Vec<Rc<dyn Observer>>,
}

impl ConcreteSubject {
    fn new() -> Self {
        ConcreteSubject { state: 0, observers: Vec::new() }
    }

    fn attach(&mut self, observer: Rc<dyn Observer>) {
        if self.observers.iter().any(|o| Rc::ptr_eq(o, &observer)) {
            println!("Subject: Observer has been attached already.");
            return;
        }
        println!("Subject: Attached an observer.");
        self.observers.push(observer);
    }

    fn detach(&mut self, observer: &Rc<dyn Observer>) {
        let len = self.observers.len();
        self.observers.retain(|o| !Rc::ptr_eq(o, observer));
        if self.observers.len() == len {
            println!("Subject: Nonexistent observer.");
        } else {
            println!("Subject: Detached an observer.");
        }
    }

    fn notify(&self) {
        println!("Subject: Notifying observers...");
        for observer in &self.observers {
            observer.update(self.state);
        }
    }

    fn some_business_logic(&mut self, next_state: i32) {
        println!("\nSubject: I'm doing something important.");
        self.state = next_state;
        println!("Subject: My state has just changed to: {}", self.state);
        self.notify();
    }
}

struct ConcreteObserverA;

impl Observer for ConcreteObserverA {
    fn update(&self, state: i32) {
        if state < 3 {
            println!("ConcreteObserverA: Reacted to the event.");
        }
    }
}

struct ConcreteObserverB;

impl Observer for ConcreteObserverB {
    fn update(&self, state: i32) {
        if state == 0 || state >= 2 {
            println!("ConcreteObserverB: Reacted to the event.");
        }
    }
}

fn main() {
    let mut subject = ConcreteSubject::new();

    let observer_a: Rc<dyn Observer> = Rc::new(ConcreteObserverA);
    subject.attach(Rc::clone(&observer_a));

    let observer_b: Rc<dyn Observer> = Rc::new(ConcreteObserverB);
    subject.attach(Rc::clone(&observer_b));

    subject.some_business_logic(2);
    subject.some_business_logic(5);

    subject.detach(&observer_b);

    subject.some_business_logic(1);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | `structuredClone(obj)` or spread `{ ...obj, changed }` |
| Python | `copy.copy` / `copy.deepcopy`, or `dataclasses.replace` |
| Java | a copy constructor or a `withX(...)` method on a record; avoid `Cloneable` |
| C# | a record `with` expression |
| Go | plain value copy `b := a` (deep-copy slices and maps by hand) |
| C++ | the copy constructor; a virtual `clone()` only for polymorphic copies |
| Rust | `#[derive(Clone)]` |

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

## Python Example

```python
import copy
from datetime import datetime


class Prototype:
    """A class with cloning ability across differently-typed fields."""

    def __init__(self):
        self.primitive = None
        self.component = None
        self.circular_reference = None

    def clone(self):
        # Deep-copy the component so it is not shared with the original.
        component_copy = copy.copy(self.component)

        clone = copy.copy(self)
        clone.component = component_copy
        # Rebind the back reference so it points to the clone, not the original.
        clone.circular_reference = ComponentWithBackReference(clone)
        return clone


class ComponentWithBackReference:
    def __init__(self, prototype):
        self.prototype = prototype


def client_code():
    p1 = Prototype()
    p1.primitive = 245
    p1.component = datetime.now()
    p1.circular_reference = ComponentWithBackReference(p1)

    p2 = p1.clone()
    if p1.primitive == p2.primitive:
        print("Primitive field values have been carried over to a clone. Yay!")
    else:
        print("Primitive field values have not been copied. Booo!")

    if p1.component is p2.component:
        print("Simple component has not been cloned. Booo!")
    else:
        print("Simple component has been cloned. Yay!")

    if p1.circular_reference is p2.circular_reference:
        print("Component with back reference has not been cloned. Booo!")
    else:
        print("Component with back reference has been cloned. Yay!")

    if p1.circular_reference.prototype is p2.circular_reference.prototype:
        print("Component with back reference is linked to original object. Booo!")
    else:
        print("Component with back reference is linked to the clone. Yay!")


if __name__ == "__main__":
    client_code()
```

## Java Example

```java
import java.util.Date;

class Prototype implements Cloneable {
    public int primitive;
    public Date component;
    public ComponentWithBackReference circularReference;

    public Prototype clone() {
        Prototype clone = new Prototype();
        clone.primitive = this.primitive;
        // Copy the component so it is not shared with the original.
        clone.component = (Date) this.component.clone();
        // Rebind the back reference so it points to the clone.
        clone.circularReference = new ComponentWithBackReference(clone);
        return clone;
    }
}

class ComponentWithBackReference {
    public Prototype prototype;

    public ComponentWithBackReference(Prototype prototype) {
        this.prototype = prototype;
    }
}

public class Demo {
    public static void main(String[] args) {
        Prototype p1 = new Prototype();
        p1.primitive = 245;
        p1.component = new Date();
        p1.circularReference = new ComponentWithBackReference(p1);

        Prototype p2 = p1.clone();
        System.out.println(p1.primitive == p2.primitive
            ? "Primitive field values have been carried over to a clone. Yay!"
            : "Primitive field values have not been copied. Booo!");
        System.out.println(p1.component == p2.component
            ? "Simple component has not been cloned. Booo!"
            : "Simple component has been cloned. Yay!");
        System.out.println(p1.circularReference == p2.circularReference
            ? "Component with back reference has not been cloned. Booo!"
            : "Component with back reference has been cloned. Yay!");
        System.out.println(p1.circularReference.prototype == p2.circularReference.prototype
            ? "Component with back reference is linked to original object. Booo!"
            : "Component with back reference is linked to the clone. Yay!");
    }
}
```

## C# Example

```csharp
using System;

class Prototype
{
    public int Primitive;
    public object Component;
    public ComponentWithBackReference CircularReference;

    public Prototype Clone()
    {
        var clone = (Prototype)MemberwiseClone();
        // Copy the component so it is not shared with the original.
        clone.Component = new DateTime(((DateTime)Component).Ticks);
        // Rebind the back reference so it points to the clone.
        clone.CircularReference = new ComponentWithBackReference(clone);
        return clone;
    }
}

class ComponentWithBackReference
{
    public Prototype Prototype;

    public ComponentWithBackReference(Prototype prototype)
    {
        Prototype = prototype;
    }
}

public class Program
{
    public static void Main()
    {
        var p1 = new Prototype { Primitive = 245, Component = DateTime.Now };
        p1.CircularReference = new ComponentWithBackReference(p1);

        var p2 = p1.Clone();
        Console.WriteLine(p1.Primitive == p2.Primitive
            ? "Primitive field values have been carried over to a clone. Yay!"
            : "Primitive field values have not been copied. Booo!");
        Console.WriteLine(ReferenceEquals(p1.Component, p2.Component)
            ? "Simple component has not been cloned. Booo!"
            : "Simple component has been cloned. Yay!");
        Console.WriteLine(ReferenceEquals(p1.CircularReference, p2.CircularReference)
            ? "Component with back reference has not been cloned. Booo!"
            : "Component with back reference has been cloned. Yay!");
        Console.WriteLine(ReferenceEquals(p1.CircularReference.Prototype, p2.CircularReference.Prototype)
            ? "Component with back reference is linked to original object. Booo!"
            : "Component with back reference is linked to the clone. Yay!");
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"time"
)

// Prototype exposes a Clone method rather than relying on a shared class.
type Prototype struct {
	Primitive         int
	Component         *time.Time
	CircularReference *ComponentWithBackReference
}

func (p *Prototype) Clone() *Prototype {
	// Copy the component so it is not shared with the original.
	componentCopy := *p.Component
	clone := &Prototype{Primitive: p.Primitive, Component: &componentCopy}
	// Rebind the back reference so it points to the clone.
	clone.CircularReference = &ComponentWithBackReference{Prototype: clone}
	return clone
}

type ComponentWithBackReference struct {
	Prototype *Prototype
}

func main() {
	now := time.Now()
	p1 := &Prototype{Primitive: 245, Component: &now}
	p1.CircularReference = &ComponentWithBackReference{Prototype: p1}

	p2 := p1.Clone()
	report(p1.Primitive == p2.Primitive,
		"Primitive field values have been carried over to a clone. Yay!",
		"Primitive field values have not been copied. Booo!")
	report(p1.Component != p2.Component,
		"Simple component has been cloned. Yay!",
		"Simple component has not been cloned. Booo!")
	report(p1.CircularReference != p2.CircularReference,
		"Component with back reference has been cloned. Yay!",
		"Component with back reference has not been cloned. Booo!")
	report(p1.CircularReference.Prototype != p2.CircularReference.Prototype,
		"Component with back reference is linked to the clone. Yay!",
		"Component with back reference is linked to original object. Booo!")
}

func report(ok bool, yes, no string) {
	if ok {
		fmt.Println(yes)
	} else {
		fmt.Println(no)
	}
}
```

## C++ Example

```cpp
#include <ctime>
#include <iostream>
#include <memory>

class Prototype;

class ComponentWithBackReference {
public:
    Prototype* prototype;
    explicit ComponentWithBackReference(Prototype* p) : prototype(p) {}
};

// The Prototype supplies a clone() that duplicates fields by value.
class Prototype {
public:
    int primitive = 0;
    std::shared_ptr<std::time_t> component;
    std::shared_ptr<ComponentWithBackReference> circularReference;

    std::shared_ptr<Prototype> clone() {
        auto copy = std::make_shared<Prototype>();
        copy->primitive = primitive;
        // Copy the component so it is not shared with the original.
        copy->component = std::make_shared<std::time_t>(*component);
        // Rebind the back reference so it points to the clone.
        copy->circularReference = std::make_shared<ComponentWithBackReference>(copy.get());
        return copy;
    }
};

int main() {
    auto p1 = std::make_shared<Prototype>();
    p1->primitive = 245;
    p1->component = std::make_shared<std::time_t>(std::time(nullptr));
    p1->circularReference = std::make_shared<ComponentWithBackReference>(p1.get());

    auto p2 = p1->clone();
    std::cout << (p1->primitive == p2->primitive
        ? "Primitive field values have been carried over to a clone. Yay!\n"
        : "Primitive field values have not been copied. Booo!\n");
    std::cout << (p1->component != p2->component
        ? "Simple component has been cloned. Yay!\n"
        : "Simple component has not been cloned. Booo!\n");
    std::cout << (p1->circularReference != p2->circularReference
        ? "Component with back reference has been cloned. Yay!\n"
        : "Component with back reference has not been cloned. Booo!\n");
    std::cout << (p1->circularReference->prototype != p2->circularReference->prototype
        ? "Component with back reference is linked to the clone. Yay!\n"
        : "Component with back reference is linked to original object. Booo!\n");
}
```

## Rust Example

```rust
// Deriving Clone gives value semantics; the back reference is rebuilt on clone.
#[derive(Clone)]
struct Prototype {
    primitive: i32,
    component: String,
    circular_reference: Box<ComponentWithBackReference>,
}

#[derive(Clone)]
struct ComponentWithBackReference {
    prototype_primitive: i32,
}

impl Prototype {
    fn clone_prototype(&self) -> Prototype {
        // component is copied by value; back reference points at the clone's data.
        Prototype {
            primitive: self.primitive,
            component: self.component.clone(),
            circular_reference: Box::new(ComponentWithBackReference {
                prototype_primitive: self.primitive,
            }),
        }
    }
}

fn main() {
    let p1 = Prototype {
        primitive: 245,
        component: String::from("2024-01-01"),
        circular_reference: Box::new(ComponentWithBackReference { prototype_primitive: 245 }),
    };

    let p2 = p1.clone_prototype();
    if p1.primitive == p2.primitive {
        println!("Primitive field values have been carried over to a clone. Yay!");
    } else {
        println!("Primitive field values have not been copied. Booo!");
    }
    // Owned String is deep-copied, so the components are independent.
    println!("Simple component has been cloned. Yay!");
    // Box gives each prototype its own back reference.
    println!("Component with back reference has been cloned. Yay!");
    println!("Component with back reference is linked to the clone. Yay!");
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | an ES `Proxy`, a lazy getter, or a memoized function |
| Python | `__getattr__` forwarding, `functools.cached_property` for lazy loading |
| Java | `java.lang.reflect.Proxy` for interfaces, or AOP in a DI framework |
| C# | `Lazy<T>`, `DispatchProxy` |
| Go | a wrapper struct implementing the same interface |
| C++ | smart pointers already are proxies; otherwise a thin wrapper class |
| Rust | `OnceCell` for lazy init; a wrapper implementing the same trait |

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

## Python Example

```python
from abc import ABC, abstractmethod


class Subject(ABC):
    """
    The Subject interface declares common operations for both RealSubject and
    the Proxy. As long as the client works with RealSubject using this
    interface, you'll be able to pass it a proxy instead of a real subject.
    """

    @abstractmethod
    def request(self) -> None:
        pass


class RealSubject(Subject):
    """
    The RealSubject contains some core business logic. Usually, RealSubjects are
    capable of doing some useful work which may also be very slow or sensitive -
    e.g. correcting input data. A Proxy can solve these issues without any
    changes to the RealSubject's code.
    """

    def request(self) -> None:
        print("RealSubject: Handling request.")


class Proxy(Subject):
    """
    The Proxy has an interface identical to the RealSubject.
    """

    def __init__(self, real_subject: RealSubject) -> None:
        self._real_subject = real_subject

    def request(self) -> None:
        if self.check_access():
            self._real_subject.request()
            self.log_access()

    def check_access(self) -> bool:
        print("Proxy: Checking access prior to firing a real request.")
        return True

    def log_access(self) -> None:
        print("Proxy: Logging the time of request.")


def client_code(subject: Subject) -> None:
    """
    The client code is supposed to work with all objects (both subjects and
    proxies) via the Subject interface in order to support both real subjects
    and proxies.
    """
    subject.request()


if __name__ == "__main__":
    print("Client: Executing the client code with a real subject:")
    real_subject = RealSubject()
    client_code(real_subject)

    print("")

    print("Client: Executing the same client code with a proxy:")
    proxy = Proxy(real_subject)
    client_code(proxy)
```

## Java Example

```java
// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
interface Subject {
    void request();
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
class RealSubject implements Subject {
    @Override
    public void request() {
        System.out.println("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
class Proxy implements Subject {
    private final RealSubject realSubject;

    public Proxy(RealSubject realSubject) {
        this.realSubject = realSubject;
    }

    @Override
    public void request() {
        if (checkAccess()) {
            realSubject.request();
            logAccess();
        }
    }

    private boolean checkAccess() {
        System.out.println("Proxy: Checking access prior to firing a real request.");
        return true;
    }

    private void logAccess() {
        System.out.println("Proxy: Logging the time of request.");
    }
}

// The client code is supposed to work with all objects via the Subject
// interface in order to support both real subjects and proxies.
public class Demo {
    static void clientCode(Subject subject) {
        subject.request();
    }

    public static void main(String[] args) {
        System.out.println("Client: Executing the client code with a real subject:");
        RealSubject realSubject = new RealSubject();
        clientCode(realSubject);

        System.out.println();

        System.out.println("Client: Executing the same client code with a proxy:");
        Proxy proxy = new Proxy(realSubject);
        clientCode(proxy);
    }
}
```

## C# Example

```csharp
using System;

// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
public interface ISubject
{
    void Request();
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
public class RealSubject : ISubject
{
    public void Request()
    {
        Console.WriteLine("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
public class Proxy : ISubject
{
    private readonly RealSubject _realSubject;

    public Proxy(RealSubject realSubject)
    {
        _realSubject = realSubject;
    }

    public void Request()
    {
        if (CheckAccess())
        {
            _realSubject.Request();
            LogAccess();
        }
    }

    private bool CheckAccess()
    {
        Console.WriteLine("Proxy: Checking access prior to firing a real request.");
        return true;
    }

    private void LogAccess()
    {
        Console.WriteLine("Proxy: Logging the time of request.");
    }
}

// The client code is supposed to work with all objects via the ISubject
// interface in order to support both real subjects and proxies.
public class Demo
{
    static void ClientCode(ISubject subject)
    {
        subject.Request();
    }

    public static void Main(string[] args)
    {
        Console.WriteLine("Client: Executing the client code with a real subject:");
        var realSubject = new RealSubject();
        ClientCode(realSubject);

        Console.WriteLine();

        Console.WriteLine("Client: Executing the same client code with a proxy:");
        var proxy = new Proxy(realSubject);
        ClientCode(proxy);
    }
}
```

## Go Example

```go
package main

import "fmt"

// Subject declares common operations for both RealSubject and the Proxy. As
// long as the client works with RealSubject using this interface, you'll be
// able to pass it a proxy instead of a real subject.
type Subject interface {
	Request()
}

// RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
type RealSubject struct{}

func (r *RealSubject) Request() {
	fmt.Println("RealSubject: Handling request.")
}

// Proxy has an interface identical to the RealSubject.
type Proxy struct {
	realSubject *RealSubject
}

func (p *Proxy) Request() {
	if p.checkAccess() {
		p.realSubject.Request()
		p.logAccess()
	}
}

func (p *Proxy) checkAccess() bool {
	fmt.Println("Proxy: Checking access prior to firing a real request.")
	return true
}

func (p *Proxy) logAccess() {
	fmt.Println("Proxy: Logging the time of request.")
}

// clientCode works with all objects via the Subject interface in order to
// support both real subjects and proxies.
func clientCode(subject Subject) {
	subject.Request()
}

func main() {
	fmt.Println("Client: Executing the client code with a real subject:")
	realSubject := &RealSubject{}
	clientCode(realSubject)

	fmt.Println("")

	fmt.Println("Client: Executing the same client code with a proxy:")
	proxy := &Proxy{realSubject: realSubject}
	clientCode(proxy)
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>

// The Subject interface declares common operations for both RealSubject and
// the Proxy. As long as the client works with RealSubject using this
// interface, you'll be able to pass it a proxy instead of a real subject.
class Subject {
public:
    virtual ~Subject() = default;
    virtual void Request() const = 0;
};

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
class RealSubject : public Subject {
public:
    void Request() const override {
        std::cout << "RealSubject: Handling request.\n";
    }
};

// The Proxy has an interface identical to the RealSubject.
class Proxy : public Subject {
private:
    std::shared_ptr<RealSubject> real_subject_;

    bool CheckAccess() const {
        std::cout << "Proxy: Checking access prior to firing a real request.\n";
        return true;
    }

    void LogAccess() const {
        std::cout << "Proxy: Logging the time of request.\n";
    }

public:
    explicit Proxy(std::shared_ptr<RealSubject> real_subject)
        : real_subject_(std::move(real_subject)) {}

    void Request() const override {
        if (CheckAccess()) {
            real_subject_->Request();
            LogAccess();
        }
    }
};

// The client code works with all objects via the Subject interface in order to
// support both real subjects and proxies.
void ClientCode(const Subject& subject) {
    subject.Request();
}

int main() {
    std::cout << "Client: Executing the client code with a real subject:\n";
    auto real_subject = std::make_shared<RealSubject>();
    ClientCode(*real_subject);

    std::cout << "\n";

    std::cout << "Client: Executing the same client code with a proxy:\n";
    Proxy proxy(real_subject);
    ClientCode(proxy);

    return 0;
}
```

## Rust Example

```rust
// The Subject trait declares common operations for both RealSubject and the
// Proxy. As long as the client works with RealSubject using this trait, you'll
// be able to pass it a proxy instead of a real subject.
trait Subject {
    fn request(&self);
}

// The RealSubject contains some core business logic. Usually, RealSubjects are
// capable of doing some useful work which may also be very slow or sensitive.
// A Proxy can solve these issues without any changes to the RealSubject's code.
struct RealSubject;

impl Subject for RealSubject {
    fn request(&self) {
        println!("RealSubject: Handling request.");
    }
}

// The Proxy has an interface identical to the RealSubject.
struct Proxy {
    real_subject: RealSubject,
}

impl Proxy {
    fn new(real_subject: RealSubject) -> Self {
        Proxy { real_subject }
    }

    fn check_access(&self) -> bool {
        println!("Proxy: Checking access prior to firing a real request.");
        true
    }

    fn log_access(&self) {
        println!("Proxy: Logging the time of request.");
    }
}

impl Subject for Proxy {
    fn request(&self) {
        if self.check_access() {
            self.real_subject.request();
            self.log_access();
        }
    }
}

// The client code works with all objects via the Subject trait in order to
// support both real subjects and proxies.
fn client_code(subject: &dyn Subject) {
    subject.request();
}

fn main() {
    println!("Client: Executing the client code with a real subject:");
    let real_subject = RealSubject;
    client_code(&real_subject);

    println!();

    println!("Client: Executing the same client code with a proxy:");
    let proxy = Proxy::new(RealSubject);
    client_code(&proxy);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a module-level `export const x = create()` — ES modules are already singletons; still prefer passing it in |
| Python | a module-level instance, or `functools.cache` on a factory function |
| Java | a DI-container singleton scope; an `enum` singleton only when it must be truly global |
| C# | `services.AddSingleton<T>()`, or `Lazy<T>` |
| Go | a package-level var initialized with `sync.OnceValue` |
| C++ | a function-local `static` (Meyers singleton) |
| Rust | `static X: LazyLock<T>` / `OnceLock` — but passing `&T` / `Arc<T>` is usually better |

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

## Python Example

```python
class Singleton:
    """Controls its own instantiation via __new__ so only one instance exists."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def some_business_logic(self):
        # ...
        ...


def client_code():
    s1 = Singleton()
    s2 = Singleton()

    if s1 is s2:
        print("Singleton works, both variables contain the same instance.")
    else:
        print("Singleton failed, variables contain different instances.")


if __name__ == "__main__":
    client_code()
```

## Java Example

```java
final class Singleton {
    private static Singleton instance;

    // Private constructor prevents direct construction with `new`.
    private Singleton() { }

    // Controls access to the singleton instance (lazy initialization).
    public static synchronized Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }

    public void someBusinessLogic() {
        // ...
    }
}

public class Demo {
    public static void main(String[] args) {
        Singleton s1 = Singleton.getInstance();
        Singleton s2 = Singleton.getInstance();

        if (s1 == s2) {
            System.out.println("Singleton works, both variables contain the same instance.");
        } else {
            System.out.println("Singleton failed, variables contain different instances.");
        }
    }
}
```

## C# Example

```csharp
public sealed class Singleton
{
    private static Singleton _instance;

    // Private constructor prevents direct construction with `new`.
    private Singleton() { }

    // Controls access to the singleton instance (lazy initialization).
    public static Singleton Instance
    {
        get
        {
            if (_instance == null)
            {
                _instance = new Singleton();
            }
            return _instance;
        }
    }

    public void SomeBusinessLogic()
    {
        // ...
    }
}

public class Program
{
    public static void Main()
    {
        Singleton s1 = Singleton.Instance;
        Singleton s2 = Singleton.Instance;

        if (s1 == s2)
        {
            System.Console.WriteLine("Singleton works, both variables contain the same instance.");
        }
        else
        {
            System.Console.WriteLine("Singleton failed, variables contain different instances.");
        }
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"sync"
)

// singleton holds the single instance; sync.Once guarantees one-time init.
type singleton struct{}

func (s *singleton) SomeBusinessLogic() {
	// ...
}

var (
	instance *singleton
	once     sync.Once
)

// GetInstance controls access to the unique singleton instance.
func GetInstance() *singleton {
	once.Do(func() {
		instance = &singleton{}
	})
	return instance
}

func main() {
	s1 := GetInstance()
	s2 := GetInstance()

	if s1 == s2 {
		fmt.Println("Singleton works, both variables contain the same instance.")
	} else {
		fmt.Println("Singleton failed, variables contain different instances.")
	}
}
```

## C++ Example

```cpp
#include <iostream>

// The Singleton controls its own instantiation and hands out one instance.
class Singleton {
private:
    // Private constructor prevents direct construction.
    Singleton() = default;

public:
    // Deleting copy operations keeps the instance unique.
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;

    // Meyers singleton: static local is initialized once, thread-safely.
    static Singleton& instance() {
        static Singleton instance;
        return instance;
    }

    void someBusinessLogic() {
        // ...
    }
};

int main() {
    Singleton& s1 = Singleton::instance();
    Singleton& s2 = Singleton::instance();

    if (&s1 == &s2) {
        std::cout << "Singleton works, both variables contain the same instance.\n";
    } else {
        std::cout << "Singleton failed, variables contain different instances.\n";
    }
}
```

## Rust Example

```rust
use std::sync::OnceLock;

// The Singleton holds shared state behind a process-wide OnceLock.
struct Singleton;

impl Singleton {
    fn some_business_logic(&self) {
        // ...
    }
}

// OnceLock provides safe, lazy, one-time initialization.
fn instance() -> &'static Singleton {
    static INSTANCE: OnceLock<Singleton> = OnceLock::new();
    INSTANCE.get_or_init(|| Singleton)
}

fn main() {
    let s1 = instance();
    let s2 = instance();

    if std::ptr::eq(s1, s2) {
        println!("Singleton works, both variables contain the same instance.");
    } else {
        println!("Singleton failed, variables contain different instances.");
    }
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a discriminated union + exhaustive `switch` (`never` check); a state-machine library for complex flows |
| Python | an `Enum` + dict of transition functions, or `match` |
| Java | an enum with per-constant methods; sealed interface + pattern `switch` |
| C# | an enum + switch expression; one record per state |
| Go | state functions: `type stateFn func(*M) stateFn` |
| C++ | `std::variant` + `std::visit` |
| Rust | an enum + `match`; typestate (`Door<Open>`) for compile-time states |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Context:
    """
    The Context defines the interface of interest to clients. It maintains a
    reference to an instance of a State subclass, representing the current state.
    """

    _state: State = None

    def __init__(self, state: State) -> None:
        self.transition_to(state)

    def transition_to(self, state: State) -> None:
        # The Context allows changing the State object at runtime.
        print(f"Context: Transition to {type(state).__name__}.")
        self._state = state
        self._state.context = self

    def request1(self) -> None:
        self._state.handle1()

    def request2(self) -> None:
        self._state.handle2()


class State(ABC):
    """
    The base State declares methods that all Concrete States should implement
    and provides a backreference to the Context object.
    """

    @property
    def context(self) -> Context:
        return self._context

    @context.setter
    def context(self, context: Context) -> None:
        self._context = context

    @abstractmethod
    def handle1(self) -> None:
        ...

    @abstractmethod
    def handle2(self) -> None:
        ...


class ConcreteStateA(State):
    def handle1(self) -> None:
        print("ConcreteStateA handles request1.")
        print("ConcreteStateA wants to change the state of the context.")
        self.context.transition_to(ConcreteStateB())

    def handle2(self) -> None:
        print("ConcreteStateA handles request2.")


class ConcreteStateB(State):
    def handle1(self) -> None:
        print("ConcreteStateB handles request1.")

    def handle2(self) -> None:
        print("ConcreteStateB handles request2.")
        print("ConcreteStateB wants to change the state of the context.")
        self.context.transition_to(ConcreteStateA())


if __name__ == "__main__":
    context = Context(ConcreteStateA())
    context.request1()
    context.request2()
```

## Java Example

```java
/**
 * The Context maintains a reference to an instance of a State subclass, which
 * represents the current state of the Context.
 */
class Context {
    private State state;

    public Context(State state) {
        transitionTo(state);
    }

    // The Context allows changing the State object at runtime.
    public void transitionTo(State state) {
        System.out.println("Context: Transition to " + state.getClass().getSimpleName() + ".");
        this.state = state;
        this.state.setContext(this);
    }

    public void request1() {
        state.handle1();
    }

    public void request2() {
        state.handle2();
    }
}

/**
 * The base State declares methods that Concrete States implement and holds a
 * backreference to the Context.
 */
abstract class State {
    protected Context context;

    public void setContext(Context context) {
        this.context = context;
    }

    public abstract void handle1();
    public abstract void handle2();
}

class ConcreteStateA extends State {
    public void handle1() {
        System.out.println("ConcreteStateA handles request1.");
        System.out.println("ConcreteStateA wants to change the state of the context.");
        context.transitionTo(new ConcreteStateB());
    }

    public void handle2() {
        System.out.println("ConcreteStateA handles request2.");
    }
}

class ConcreteStateB extends State {
    public void handle1() {
        System.out.println("ConcreteStateB handles request1.");
    }

    public void handle2() {
        System.out.println("ConcreteStateB handles request2.");
        System.out.println("ConcreteStateB wants to change the state of the context.");
        context.transitionTo(new ConcreteStateA());
    }
}

public class Demo {
    public static void main(String[] args) {
        Context context = new Context(new ConcreteStateA());
        context.request1();
        context.request2();
    }
}
```

## C# Example

```csharp
using System;

// The Context maintains a reference to an instance of a State subclass, which
// represents the current state of the Context.
public class Context
{
    private State _state;

    public Context(State state)
    {
        TransitionTo(state);
    }

    // The Context allows changing the State object at runtime.
    public void TransitionTo(State state)
    {
        Console.WriteLine($"Context: Transition to {state.GetType().Name}.");
        _state = state;
        _state.SetContext(this);
    }

    public void Request1() => _state.Handle1();

    public void Request2() => _state.Handle2();
}

// The base State declares methods that Concrete States implement and holds a
// backreference to the Context.
public abstract class State
{
    protected Context _context;

    public void SetContext(Context context) => _context = context;

    public abstract void Handle1();
    public abstract void Handle2();
}

public class ConcreteStateA : State
{
    public override void Handle1()
    {
        Console.WriteLine("ConcreteStateA handles request1.");
        Console.WriteLine("ConcreteStateA wants to change the state of the context.");
        _context.TransitionTo(new ConcreteStateB());
    }

    public override void Handle2()
    {
        Console.WriteLine("ConcreteStateA handles request2.");
    }
}

public class ConcreteStateB : State
{
    public override void Handle1()
    {
        Console.WriteLine("ConcreteStateB handles request1.");
    }

    public override void Handle2()
    {
        Console.WriteLine("ConcreteStateB handles request2.");
        Console.WriteLine("ConcreteStateB wants to change the state of the context.");
        _context.TransitionTo(new ConcreteStateA());
    }
}

public class Program
{
    public static void Main()
    {
        var context = new Context(new ConcreteStateA());
        context.Request1();
        context.Request2();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"reflect"
)

// State declares methods that Concrete States implement and holds a
// backreference to the Context.
type State interface {
	SetContext(context *Context)
	Handle1()
	Handle2()
}

// Context maintains a reference to the current State.
type Context struct {
	state State
}

func NewContext(state State) *Context {
	c := &Context{}
	c.TransitionTo(state)
	return c
}

// TransitionTo allows changing the State object at runtime.
func (c *Context) TransitionTo(state State) {
	fmt.Printf("Context: Transition to %s.\n", reflect.TypeOf(state).Elem().Name())
	c.state = state
	c.state.SetContext(c)
}

func (c *Context) Request1() { c.state.Handle1() }
func (c *Context) Request2() { c.state.Handle2() }

type BaseState struct {
	context *Context
}

func (s *BaseState) SetContext(context *Context) { s.context = context }

type ConcreteStateA struct {
	BaseState
}

func (s *ConcreteStateA) Handle1() {
	fmt.Println("ConcreteStateA handles request1.")
	fmt.Println("ConcreteStateA wants to change the state of the context.")
	s.context.TransitionTo(&ConcreteStateB{})
}

func (s *ConcreteStateA) Handle2() {
	fmt.Println("ConcreteStateA handles request2.")
}

type ConcreteStateB struct {
	BaseState
}

func (s *ConcreteStateB) Handle1() {
	fmt.Println("ConcreteStateB handles request1.")
}

func (s *ConcreteStateB) Handle2() {
	fmt.Println("ConcreteStateB handles request2.")
	fmt.Println("ConcreteStateB wants to change the state of the context.")
	s.context.TransitionTo(&ConcreteStateA{})
}

func main() {
	context := NewContext(&ConcreteStateA{})
	context.Request1()
	context.Request2()
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <typeinfo>

class Context;

// The base State declares methods that Concrete States implement and holds a
// backreference to the Context.
class State {
protected:
    Context* context_ = nullptr;

public:
    virtual ~State() = default;
    void setContext(Context* context) { context_ = context; }
    virtual void handle1() = 0;
    virtual void handle2() = 0;
};

// The Context maintains a reference to the current State.
class Context {
    std::unique_ptr<State> state_;

public:
    explicit Context(std::unique_ptr<State> state) {
        transitionTo(std::move(state));
    }

    // Allows changing the State object at runtime.
    void transitionTo(std::unique_ptr<State> state) {
        std::cout << "Context: Transition to " << typeid(*state).name() << ".\n";
        state_ = std::move(state);
        state_->setContext(this);
    }

    void request1() { state_->handle1(); }
    void request2() { state_->handle2(); }
};

class ConcreteStateB;

class ConcreteStateA : public State {
public:
    void handle1() override;
    void handle2() override {
        std::cout << "ConcreteStateA handles request2.\n";
    }
};

class ConcreteStateB : public State {
public:
    void handle1() override {
        std::cout << "ConcreteStateB handles request1.\n";
    }
    void handle2() override {
        std::cout << "ConcreteStateB handles request2.\n";
        std::cout << "ConcreteStateB wants to change the state of the context.\n";
        context_->transitionTo(std::make_unique<ConcreteStateA>());
    }
};

void ConcreteStateA::handle1() {
    std::cout << "ConcreteStateA handles request1.\n";
    std::cout << "ConcreteStateA wants to change the state of the context.\n";
    context_->transitionTo(std::make_unique<ConcreteStateB>());
}

int main() {
    Context context(std::make_unique<ConcreteStateA>());
    context.request1();
    context.request2();
}
```

## Rust Example

```rust
// Each state is a struct implementing the State trait. handle methods return an
// optional next state so the Context can perform the transition.
trait State {
    fn handle1(self: Box<Self>) -> Box<dyn State>;
    fn handle2(self: Box<Self>) -> Box<dyn State>;
    fn name(&self) -> &'static str;
}

// The Context owns the current State and delegates behavior to it.
struct Context {
    state: Option<Box<dyn State>>,
}

impl Context {
    fn new(state: Box<dyn State>) -> Self {
        println!("Context: Transition to {}.", state.name());
        Context { state: Some(state) }
    }

    fn transition_to(&mut self, state: Box<dyn State>) {
        println!("Context: Transition to {}.", state.name());
        self.state = Some(state);
    }

    fn request1(&mut self) {
        if let Some(state) = self.state.take() {
            let next = state.handle1();
            self.transition_to(next);
        }
    }

    fn request2(&mut self) {
        if let Some(state) = self.state.take() {
            let next = state.handle2();
            self.transition_to(next);
        }
    }
}

struct ConcreteStateA;

impl State for ConcreteStateA {
    fn handle1(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateA handles request1.");
        println!("ConcreteStateA wants to change the state of the context.");
        Box::new(ConcreteStateB)
    }
    fn handle2(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateA handles request2.");
        self
    }
    fn name(&self) -> &'static str {
        "ConcreteStateA"
    }
}

struct ConcreteStateB;

impl State for ConcreteStateB {
    fn handle1(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateB handles request1.");
        self
    }
    fn handle2(self: Box<Self>) -> Box<dyn State> {
        println!("ConcreteStateB handles request2.");
        println!("ConcreteStateB wants to change the state of the context.");
        Box::new(ConcreteStateA)
    }
    fn name(&self) -> &'static str {
        "ConcreteStateB"
    }
}

fn main() {
    let mut context = Context::new(Box::new(ConcreteStateA));
    context.request1();
    context.request2();
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | pass a function, or a `Record<Key, Fn>` dispatch map |
| Python | pass a callable, or a dict of functions |
| Java | a lambda / functional interface (`Comparator`) |
| C# | a `Func<>` delegate |
| Go | a func-typed parameter |
| C++ | `std::function`, or a template parameter (static strategy) |
| Rust | a closure `impl Fn(..)`, or a generic `S: Strategy` |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List


class Context:
    """
    The Context defines the interface of interest to clients.
    """

    def __init__(self, strategy: Strategy) -> None:
        # The Context accepts a strategy through the constructor, but also
        # provides a setter to change it at runtime.
        self._strategy = strategy

    @property
    def strategy(self) -> Strategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: Strategy) -> None:
        # The Context allows replacing a Strategy object at runtime.
        self._strategy = strategy

    def do_some_business_logic(self) -> None:
        # The Context delegates work to the Strategy object instead of
        # implementing multiple versions of the algorithm on its own.
        print("Context: Sorting data using the strategy (not sure how it'll do it)")
        result = self._strategy.do_algorithm(["a", "b", "c", "d", "e"])
        print(",".join(result))


class Strategy(ABC):
    """
    The Strategy interface declares operations common to all supported versions
    of some algorithm.
    """

    @abstractmethod
    def do_algorithm(self, data: List[str]) -> List[str]:
        ...


class ConcreteStrategyA(Strategy):
    def do_algorithm(self, data: List[str]) -> List[str]:
        return sorted(data)


class ConcreteStrategyB(Strategy):
    def do_algorithm(self, data: List[str]) -> List[str]:
        return list(reversed(data))


if __name__ == "__main__":
    # The client code picks a concrete strategy and passes it to the context.
    context = Context(ConcreteStrategyA())
    print("Client: Strategy is set to normal sorting.")
    context.do_some_business_logic()

    print()

    print("Client: Strategy is set to reverse sorting.")
    context.strategy = ConcreteStrategyB()
    context.do_some_business_logic()
```

## Java Example

```java
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * The Strategy interface declares operations common to all supported versions
 * of some algorithm.
 */
interface Strategy {
    List<String> doAlgorithm(List<String> data);
}

/**
 * The Context maintains a reference to one of the Strategy objects and works
 * with it only via the Strategy interface.
 */
class Context {
    private Strategy strategy;

    public Context(Strategy strategy) {
        this.strategy = strategy;
    }

    // The Context allows replacing a Strategy object at runtime.
    public void setStrategy(Strategy strategy) {
        this.strategy = strategy;
    }

    public void doSomeBusinessLogic() {
        System.out.println("Context: Sorting data using the strategy (not sure how it'll do it)");
        List<String> result = strategy.doAlgorithm(Arrays.asList("a", "b", "c", "d", "e"));
        System.out.println(String.join(",", result));
    }
}

class ConcreteStrategyA implements Strategy {
    public List<String> doAlgorithm(List<String> data) {
        List<String> result = new java.util.ArrayList<>(data);
        Collections.sort(result);
        return result;
    }
}

class ConcreteStrategyB implements Strategy {
    public List<String> doAlgorithm(List<String> data) {
        List<String> result = new java.util.ArrayList<>(data);
        Collections.reverse(result);
        return result;
    }
}

public class Demo {
    public static void main(String[] args) {
        // The client picks a concrete strategy and passes it to the context.
        Context context = new Context(new ConcreteStrategyA());
        System.out.println("Client: Strategy is set to normal sorting.");
        context.doSomeBusinessLogic();

        System.out.println();

        System.out.println("Client: Strategy is set to reverse sorting.");
        context.setStrategy(new ConcreteStrategyB());
        context.doSomeBusinessLogic();
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

// The Strategy interface declares operations common to all supported versions
// of some algorithm.
public interface IStrategy
{
    List<string> DoAlgorithm(List<string> data);
}

// The Context maintains a reference to a Strategy object and works with it
// only via the Strategy interface.
public class Context
{
    private IStrategy _strategy;

    public Context(IStrategy strategy)
    {
        _strategy = strategy;
    }

    // The Context allows replacing a Strategy object at runtime.
    public void SetStrategy(IStrategy strategy)
    {
        _strategy = strategy;
    }

    public void DoSomeBusinessLogic()
    {
        Console.WriteLine("Context: Sorting data using the strategy (not sure how it'll do it)");
        var result = _strategy.DoAlgorithm(new List<string> { "a", "b", "c", "d", "e" });
        Console.WriteLine(string.Join(",", result));
    }
}

public class ConcreteStrategyA : IStrategy
{
    public List<string> DoAlgorithm(List<string> data)
    {
        var result = new List<string>(data);
        result.Sort();
        return result;
    }
}

public class ConcreteStrategyB : IStrategy
{
    public List<string> DoAlgorithm(List<string> data)
    {
        return data.AsEnumerable().Reverse().ToList();
    }
}

public class Program
{
    public static void Main()
    {
        // The client picks a concrete strategy and passes it to the context.
        var context = new Context(new ConcreteStrategyA());
        Console.WriteLine("Client: Strategy is set to normal sorting.");
        context.DoSomeBusinessLogic();

        Console.WriteLine();

        Console.WriteLine("Client: Strategy is set to reverse sorting.");
        context.SetStrategy(new ConcreteStrategyB());
        context.DoSomeBusinessLogic();
    }
}
```

## Go Example

```go
package main

import (
	"fmt"
	"sort"
	"strings"
)

// Strategy declares operations common to all supported versions of some
// algorithm.
type Strategy interface {
	DoAlgorithm(data []string) []string
}

// Context maintains a reference to a Strategy and works with it only via the
// Strategy interface.
type Context struct {
	strategy Strategy
}

// SetStrategy allows replacing a Strategy at runtime.
func (c *Context) SetStrategy(strategy Strategy) {
	c.strategy = strategy
}

func (c *Context) DoSomeBusinessLogic() {
	fmt.Println("Context: Sorting data using the strategy (not sure how it'll do it)")
	result := c.strategy.DoAlgorithm([]string{"a", "b", "c", "d", "e"})
	fmt.Println(strings.Join(result, ","))
}

type ConcreteStrategyA struct{}

func (ConcreteStrategyA) DoAlgorithm(data []string) []string {
	result := append([]string(nil), data...)
	sort.Strings(result)
	return result
}

type ConcreteStrategyB struct{}

func (ConcreteStrategyB) DoAlgorithm(data []string) []string {
	result := append([]string(nil), data...)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	return result
}

func main() {
	// The client picks a concrete strategy and passes it to the context.
	context := &Context{strategy: ConcreteStrategyA{}}
	fmt.Println("Client: Strategy is set to normal sorting.")
	context.DoSomeBusinessLogic()

	fmt.Println()

	fmt.Println("Client: Strategy is set to reverse sorting.")
	context.SetStrategy(ConcreteStrategyB{})
	context.DoSomeBusinessLogic()
}
```

## C++ Example

```cpp
#include <algorithm>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

// The Strategy interface declares operations common to all supported versions
// of some algorithm.
class Strategy {
public:
    virtual ~Strategy() = default;
    virtual std::vector<std::string> doAlgorithm(std::vector<std::string> data) const = 0;
};

// The Context works with a Strategy only via the Strategy interface.
class Context {
    std::unique_ptr<Strategy> strategy_;

public:
    explicit Context(std::unique_ptr<Strategy> strategy)
        : strategy_(std::move(strategy)) {}

    // Allows replacing a Strategy object at runtime.
    void setStrategy(std::unique_ptr<Strategy> strategy) {
        strategy_ = std::move(strategy);
    }

    void doSomeBusinessLogic() const {
        std::cout << "Context: Sorting data using the strategy (not sure how it'll do it)\n";
        auto result = strategy_->doAlgorithm({"a", "b", "c", "d", "e"});
        for (std::size_t i = 0; i < result.size(); ++i) {
            std::cout << (i ? "," : "") << result[i];
        }
        std::cout << "\n";
    }
};

class ConcreteStrategyA : public Strategy {
public:
    std::vector<std::string> doAlgorithm(std::vector<std::string> data) const override {
        std::sort(data.begin(), data.end());
        return data;
    }
};

class ConcreteStrategyB : public Strategy {
public:
    std::vector<std::string> doAlgorithm(std::vector<std::string> data) const override {
        std::reverse(data.begin(), data.end());
        return data;
    }
};

int main() {
    // The client picks a concrete strategy and passes it to the context.
    Context context(std::make_unique<ConcreteStrategyA>());
    std::cout << "Client: Strategy is set to normal sorting.\n";
    context.doSomeBusinessLogic();

    std::cout << "\n";

    std::cout << "Client: Strategy is set to reverse sorting.\n";
    context.setStrategy(std::make_unique<ConcreteStrategyB>());
    context.doSomeBusinessLogic();
}
```

## Rust Example

```rust
// The Strategy trait declares operations common to all supported versions of
// some algorithm.
trait Strategy {
    fn do_algorithm(&self, data: Vec<String>) -> Vec<String>;
}

// The Context works with a Strategy only via the Strategy trait.
struct Context {
    strategy: Box<dyn Strategy>,
}

impl Context {
    fn new(strategy: Box<dyn Strategy>) -> Self {
        Context { strategy }
    }

    // Allows replacing a Strategy object at runtime.
    fn set_strategy(&mut self, strategy: Box<dyn Strategy>) {
        self.strategy = strategy;
    }

    fn do_some_business_logic(&self) {
        println!("Context: Sorting data using the strategy (not sure how it'll do it)");
        let data = ["a", "b", "c", "d", "e"].iter().map(|s| s.to_string()).collect();
        let result = self.strategy.do_algorithm(data);
        println!("{}", result.join(","));
    }
}

struct ConcreteStrategyA;

impl Strategy for ConcreteStrategyA {
    fn do_algorithm(&self, mut data: Vec<String>) -> Vec<String> {
        data.sort();
        data
    }
}

struct ConcreteStrategyB;

impl Strategy for ConcreteStrategyB {
    fn do_algorithm(&self, mut data: Vec<String>) -> Vec<String> {
        data.reverse();
        data
    }
}

fn main() {
    // The client picks a concrete strategy and passes it to the context.
    let mut context = Context::new(Box::new(ConcreteStrategyA));
    println!("Client: Strategy is set to normal sorting.");
    context.do_some_business_logic();

    println!();

    println!("Client: Strategy is set to reverse sorting.");
    context.set_strategy(Box::new(ConcreteStrategyB));
    context.do_some_business_logic();
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a higher-order function that takes the variable steps as callbacks |
| Python | a function taking hook callables; an ABC only for framework-style extension |
| Java | an abstract class is fine; or pass lambdas for the steps |
| C# | pass delegates for the steps; an abstract class is fine |
| Go | no inheritance — a function taking an interface of steps |
| C++ | the NVI idiom, or CRTP |
| Rust | a trait with default methods that call the required methods — this is the pattern, natively |

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

## Python Example

```python
from abc import ABC, abstractmethod


class AbstractClass(ABC):
    """Defines a template method with the skeleton of an algorithm."""

    def template_method(self) -> None:
        self.base_operation1()
        self.required_operations1()
        self.base_operation2()
        self.hook1()
        self.required_operation2()
        self.base_operation3()
        self.hook2()

    def base_operation1(self) -> None:
        print("AbstractClass says: I am doing the bulk of the work")

    def base_operation2(self) -> None:
        print("AbstractClass says: But I let subclasses override some operations")

    def base_operation3(self) -> None:
        print("AbstractClass says: But I am doing the bulk of the work anyway")

    @abstractmethod
    def required_operations1(self) -> None:
        pass

    @abstractmethod
    def required_operation2(self) -> None:
        pass

    # Hooks have empty default implementations; subclasses may override them.
    def hook1(self) -> None:
        pass

    def hook2(self) -> None:
        pass


class ConcreteClass1(AbstractClass):
    def required_operations1(self) -> None:
        print("ConcreteClass1 says: Implemented Operation1")

    def required_operation2(self) -> None:
        print("ConcreteClass1 says: Implemented Operation2")


class ConcreteClass2(AbstractClass):
    def required_operations1(self) -> None:
        print("ConcreteClass2 says: Implemented Operation1")

    def required_operation2(self) -> None:
        print("ConcreteClass2 says: Implemented Operation2")

    def hook1(self) -> None:
        print("ConcreteClass2 says: Overridden Hook1")


def client_code(abstract_class: AbstractClass) -> None:
    abstract_class.template_method()


if __name__ == "__main__":
    print("Same client code can work with different subclasses:")
    client_code(ConcreteClass1())
    print("")
    print("Same client code can work with different subclasses:")
    client_code(ConcreteClass2())
```

## Java Example

```java
// The Abstract Class defines a template method and its primitive operations.
abstract class AbstractClass {
    // The template method defines the skeleton of an algorithm.
    public final void templateMethod() {
        baseOperation1();
        requiredOperations1();
        baseOperation2();
        hook1();
        requiredOperation2();
        baseOperation3();
        hook2();
    }

    protected void baseOperation1() {
        System.out.println("AbstractClass says: I am doing the bulk of the work");
    }

    protected void baseOperation2() {
        System.out.println("AbstractClass says: But I let subclasses override some operations");
    }

    protected void baseOperation3() {
        System.out.println("AbstractClass says: But I am doing the bulk of the work anyway");
    }

    protected abstract void requiredOperations1();

    protected abstract void requiredOperation2();

    // Hooks: default (empty) implementations subclasses may override.
    protected void hook1() { }

    protected void hook2() { }
}

class ConcreteClass1 extends AbstractClass {
    protected void requiredOperations1() {
        System.out.println("ConcreteClass1 says: Implemented Operation1");
    }

    protected void requiredOperation2() {
        System.out.println("ConcreteClass1 says: Implemented Operation2");
    }
}

class ConcreteClass2 extends AbstractClass {
    protected void requiredOperations1() {
        System.out.println("ConcreteClass2 says: Implemented Operation1");
    }

    protected void requiredOperation2() {
        System.out.println("ConcreteClass2 says: Implemented Operation2");
    }

    protected void hook1() {
        System.out.println("ConcreteClass2 says: Overridden Hook1");
    }
}

public class Demo {
    static void clientCode(AbstractClass abstractClass) {
        abstractClass.templateMethod();
    }

    public static void main(String[] args) {
        System.out.println("Same client code can work with different subclasses:");
        clientCode(new ConcreteClass1());
        System.out.println("");
        System.out.println("Same client code can work with different subclasses:");
        clientCode(new ConcreteClass2());
    }
}
```

## C# Example

```csharp
using System;

// The Abstract Class defines a template method and its primitive operations.
abstract class AbstractClass
{
    // The template method defines the skeleton of an algorithm.
    public void TemplateMethod()
    {
        BaseOperation1();
        RequiredOperations1();
        BaseOperation2();
        Hook1();
        RequiredOperation2();
        BaseOperation3();
        Hook2();
    }

    protected void BaseOperation1() =>
        Console.WriteLine("AbstractClass says: I am doing the bulk of the work");

    protected void BaseOperation2() =>
        Console.WriteLine("AbstractClass says: But I let subclasses override some operations");

    protected void BaseOperation3() =>
        Console.WriteLine("AbstractClass says: But I am doing the bulk of the work anyway");

    protected abstract void RequiredOperations1();

    protected abstract void RequiredOperation2();

    // Hooks: virtual with empty defaults subclasses may override.
    protected virtual void Hook1() { }

    protected virtual void Hook2() { }
}

class ConcreteClass1 : AbstractClass
{
    protected override void RequiredOperations1() =>
        Console.WriteLine("ConcreteClass1 says: Implemented Operation1");

    protected override void RequiredOperation2() =>
        Console.WriteLine("ConcreteClass1 says: Implemented Operation2");
}

class ConcreteClass2 : AbstractClass
{
    protected override void RequiredOperations1() =>
        Console.WriteLine("ConcreteClass2 says: Implemented Operation1");

    protected override void RequiredOperation2() =>
        Console.WriteLine("ConcreteClass2 says: Implemented Operation2");

    protected override void Hook1() =>
        Console.WriteLine("ConcreteClass2 says: Overridden Hook1");
}

class Program
{
    static void ClientCode(AbstractClass abstractClass) => abstractClass.TemplateMethod();

    static void Main()
    {
        Console.WriteLine("Same client code can work with different subclasses:");
        ClientCode(new ConcreteClass1());
        Console.WriteLine("");
        Console.WriteLine("Same client code can work with different subclasses:");
        ClientCode(new ConcreteClass2());
    }
}
```

## Go Example

```go
package main

import "fmt"

// Go has no inheritance, so the varying steps are expressed as an interface and
// the template method is a plain function that calls those steps in order.
type Operations interface {
	BaseOperation1()
	RequiredOperations1()
	BaseOperation2()
	Hook1()
	RequiredOperation2()
	BaseOperation3()
	Hook2()
}

// templateMethod defines the skeleton of the algorithm.
func templateMethod(o Operations) {
	o.BaseOperation1()
	o.RequiredOperations1()
	o.BaseOperation2()
	o.Hook1()
	o.RequiredOperation2()
	o.BaseOperation3()
	o.Hook2()
}

// Base holds the shared step implementations, embedded by concrete structs.
type Base struct{}

func (Base) BaseOperation1() {
	fmt.Println("AbstractClass says: I am doing the bulk of the work")
}
func (Base) BaseOperation2() {
	fmt.Println("AbstractClass says: But I let subclasses override some operations")
}
func (Base) BaseOperation3() {
	fmt.Println("AbstractClass says: But I am doing the bulk of the work anyway")
}
func (Base) Hook1() {} // empty default hooks
func (Base) Hook2() {}

type ConcreteClass1 struct{ Base }

func (ConcreteClass1) RequiredOperations1() {
	fmt.Println("ConcreteClass1 says: Implemented Operation1")
}
func (ConcreteClass1) RequiredOperation2() {
	fmt.Println("ConcreteClass1 says: Implemented Operation2")
}

type ConcreteClass2 struct{ Base }

func (ConcreteClass2) RequiredOperations1() {
	fmt.Println("ConcreteClass2 says: Implemented Operation1")
}
func (ConcreteClass2) RequiredOperation2() {
	fmt.Println("ConcreteClass2 says: Implemented Operation2")
}
func (ConcreteClass2) Hook1() {
	fmt.Println("ConcreteClass2 says: Overridden Hook1")
}

func clientCode(o Operations) { templateMethod(o) }

func main() {
	fmt.Println("Same client code can work with different subclasses:")
	clientCode(ConcreteClass1{})
	fmt.Println("")
	fmt.Println("Same client code can work with different subclasses:")
	clientCode(ConcreteClass2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>

// The Abstract Class defines a template method and its primitive operations.
class AbstractClass {
public:
    virtual ~AbstractClass() = default;

    // The template method defines the skeleton of an algorithm.
    void TemplateMethod() const {
        BaseOperation1();
        RequiredOperations1();
        BaseOperation2();
        Hook1();
        RequiredOperation2();
        BaseOperation3();
        Hook2();
    }

protected:
    void BaseOperation1() const {
        std::cout << "AbstractClass says: I am doing the bulk of the work\n";
    }
    void BaseOperation2() const {
        std::cout << "AbstractClass says: But I let subclasses override some operations\n";
    }
    void BaseOperation3() const {
        std::cout << "AbstractClass says: But I am doing the bulk of the work anyway\n";
    }

    virtual void RequiredOperations1() const = 0;
    virtual void RequiredOperation2() const = 0;

    // Hooks: empty default implementations subclasses may override.
    virtual void Hook1() const {}
    virtual void Hook2() const {}
};

class ConcreteClass1 : public AbstractClass {
protected:
    void RequiredOperations1() const override {
        std::cout << "ConcreteClass1 says: Implemented Operation1\n";
    }
    void RequiredOperation2() const override {
        std::cout << "ConcreteClass1 says: Implemented Operation2\n";
    }
};

class ConcreteClass2 : public AbstractClass {
protected:
    void RequiredOperations1() const override {
        std::cout << "ConcreteClass2 says: Implemented Operation1\n";
    }
    void RequiredOperation2() const override {
        std::cout << "ConcreteClass2 says: Implemented Operation2\n";
    }
    void Hook1() const override {
        std::cout << "ConcreteClass2 says: Overridden Hook1\n";
    }
};

void ClientCode(const AbstractClass& abstractClass) {
    abstractClass.TemplateMethod();
}

int main() {
    std::cout << "Same client code can work with different subclasses:\n";
    ClientCode(*std::make_unique<ConcreteClass1>());
    std::cout << "\n";
    std::cout << "Same client code can work with different subclasses:\n";
    ClientCode(*std::make_unique<ConcreteClass2>());
    return 0;
}
```

## Rust Example

```rust
// The trait defines the template method plus its primitive operations. Default
// methods supply the shared steps and the empty hooks.
trait AbstractClass {
    // The template method defines the skeleton of an algorithm.
    fn template_method(&self) {
        self.base_operation1();
        self.required_operations1();
        self.base_operation2();
        self.hook1();
        self.required_operation2();
        self.base_operation3();
        self.hook2();
    }

    fn base_operation1(&self) {
        println!("AbstractClass says: I am doing the bulk of the work");
    }
    fn base_operation2(&self) {
        println!("AbstractClass says: But I let subclasses override some operations");
    }
    fn base_operation3(&self) {
        println!("AbstractClass says: But I am doing the bulk of the work anyway");
    }

    fn required_operations1(&self);
    fn required_operation2(&self);

    // Hooks: default (empty) implementations implementors may override.
    fn hook1(&self) {}
    fn hook2(&self) {}
}

struct ConcreteClass1;

impl AbstractClass for ConcreteClass1 {
    fn required_operations1(&self) {
        println!("ConcreteClass1 says: Implemented Operation1");
    }
    fn required_operation2(&self) {
        println!("ConcreteClass1 says: Implemented Operation2");
    }
}

struct ConcreteClass2;

impl AbstractClass for ConcreteClass2 {
    fn required_operations1(&self) {
        println!("ConcreteClass2 says: Implemented Operation1");
    }
    fn required_operation2(&self) {
        println!("ConcreteClass2 says: Implemented Operation2");
    }
    fn hook1(&self) {
        println!("ConcreteClass2 says: Overridden Hook1");
    }
}

fn client_code(abstract_class: &dyn AbstractClass) {
    abstract_class.template_method();
}

fn main() {
    println!("Same client code can work with different subclasses:");
    client_code(&ConcreteClass1);
    println!();
    println!("Same client code can work with different subclasses:");
    client_code(&ConcreteClass2);
}
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

## Lighter idiomatic forms

Try these before the full class structure below. Use the full pattern when the lighter form stops being enough
(several methods per variant, state per instance, or many implementations maintained by different people).

| Language | Lighter form |
|---|---|
| TypeScript | a discriminated union + exhaustive `switch` in plain functions |
| Python | `functools.singledispatch`, or `match` with class patterns |
| Java | sealed interface + pattern-matching `switch` (Java 21) — replaces Visitor |
| C# | a switch expression with type patterns |
| Go | a type switch `switch v := n.(type)` |
| C++ | `std::variant` + `std::visit` |
| Rust | an enum + `match` — the idiomatic visitor |

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

## Python Example

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Component(ABC):
    @abstractmethod
    def accept(self, visitor: Visitor) -> None: ...


class ConcreteComponentA(Component):
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_concrete_component_a(self)

    def exclusive_method_of_concrete_component_a(self) -> str:
        return "A"


class ConcreteComponentB(Component):
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_concrete_component_b(self)

    def special_method_of_concrete_component_b(self) -> str:
        return "B"


class Visitor(ABC):
    @abstractmethod
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None: ...

    @abstractmethod
    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None: ...


class ConcreteVisitor1(Visitor):
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None:
        print(f"{element.exclusive_method_of_concrete_component_a()} + ConcreteVisitor1")

    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None:
        print(f"{element.special_method_of_concrete_component_b()} + ConcreteVisitor1")


class ConcreteVisitor2(Visitor):
    def visit_concrete_component_a(self, element: ConcreteComponentA) -> None:
        print(f"{element.exclusive_method_of_concrete_component_a()} + ConcreteVisitor2")

    def visit_concrete_component_b(self, element: ConcreteComponentB) -> None:
        print(f"{element.special_method_of_concrete_component_b()} + ConcreteVisitor2")


def client_code(components: list[Component], visitor: Visitor) -> None:
    for component in components:
        component.accept(visitor)


if __name__ == "__main__":
    components = [ConcreteComponentA(), ConcreteComponentB()]

    print("The client code works with all visitors via the base Visitor interface:")
    client_code(components, ConcreteVisitor1())
    print()

    print("It allows the same client code to work with different types of visitors:")
    client_code(components, ConcreteVisitor2())
```

## Java Example

```java
import java.util.List;

interface Component {
    void accept(Visitor visitor);
}

class ConcreteComponentA implements Component {
    public void accept(Visitor visitor) {
        visitor.visitConcreteComponentA(this);
    }

    public String exclusiveMethodOfConcreteComponentA() {
        return "A";
    }
}

class ConcreteComponentB implements Component {
    public void accept(Visitor visitor) {
        visitor.visitConcreteComponentB(this);
    }

    public String specialMethodOfConcreteComponentB() {
        return "B";
    }
}

interface Visitor {
    void visitConcreteComponentA(ConcreteComponentA element);
    void visitConcreteComponentB(ConcreteComponentB element);
}

class ConcreteVisitor1 implements Visitor {
    public void visitConcreteComponentA(ConcreteComponentA element) {
        System.out.println(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor1");
    }

    public void visitConcreteComponentB(ConcreteComponentB element) {
        System.out.println(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor1");
    }
}

class ConcreteVisitor2 implements Visitor {
    public void visitConcreteComponentA(ConcreteComponentA element) {
        System.out.println(element.exclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor2");
    }

    public void visitConcreteComponentB(ConcreteComponentB element) {
        System.out.println(element.specialMethodOfConcreteComponentB() + " + ConcreteVisitor2");
    }
}

public class Demo {
    static void clientCode(List<Component> components, Visitor visitor) {
        for (Component component : components) {
            component.accept(visitor);
        }
    }

    public static void main(String[] args) {
        List<Component> components = List.of(new ConcreteComponentA(), new ConcreteComponentB());

        System.out.println("The client code works with all visitors via the base Visitor interface:");
        clientCode(components, new ConcreteVisitor1());
        System.out.println();

        System.out.println("It allows the same client code to work with different types of visitors:");
        clientCode(components, new ConcreteVisitor2());
    }
}
```

## C# Example

```csharp
using System;
using System.Collections.Generic;

interface IComponent
{
    void Accept(IVisitor visitor);
}

class ConcreteComponentA : IComponent
{
    public void Accept(IVisitor visitor) => visitor.VisitConcreteComponentA(this);
    public string ExclusiveMethodOfConcreteComponentA() => "A";
}

class ConcreteComponentB : IComponent
{
    public void Accept(IVisitor visitor) => visitor.VisitConcreteComponentB(this);
    public string SpecialMethodOfConcreteComponentB() => "B";
}

interface IVisitor
{
    void VisitConcreteComponentA(ConcreteComponentA element);
    void VisitConcreteComponentB(ConcreteComponentB element);
}

class ConcreteVisitor1 : IVisitor
{
    public void VisitConcreteComponentA(ConcreteComponentA element) =>
        Console.WriteLine(element.ExclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor1");

    public void VisitConcreteComponentB(ConcreteComponentB element) =>
        Console.WriteLine(element.SpecialMethodOfConcreteComponentB() + " + ConcreteVisitor1");
}

class ConcreteVisitor2 : IVisitor
{
    public void VisitConcreteComponentA(ConcreteComponentA element) =>
        Console.WriteLine(element.ExclusiveMethodOfConcreteComponentA() + " + ConcreteVisitor2");

    public void VisitConcreteComponentB(ConcreteComponentB element) =>
        Console.WriteLine(element.SpecialMethodOfConcreteComponentB() + " + ConcreteVisitor2");
}

class Program
{
    static void ClientCode(List<IComponent> components, IVisitor visitor)
    {
        foreach (var component in components)
            component.Accept(visitor);
    }

    static void Main()
    {
        var components = new List<IComponent> { new ConcreteComponentA(), new ConcreteComponentB() };

        Console.WriteLine("The client code works with all visitors via the base Visitor interface:");
        ClientCode(components, new ConcreteVisitor1());
        Console.WriteLine();

        Console.WriteLine("It allows the same client code to work with different types of visitors:");
        ClientCode(components, new ConcreteVisitor2());
    }
}
```

## Go Example

```go
package main

import "fmt"

type Visitor interface {
	VisitConcreteComponentA(element *ConcreteComponentA)
	VisitConcreteComponentB(element *ConcreteComponentB)
}

type Component interface {
	Accept(visitor Visitor)
}

type ConcreteComponentA struct{}

func (c *ConcreteComponentA) Accept(visitor Visitor) {
	visitor.VisitConcreteComponentA(c)
}

func (c *ConcreteComponentA) ExclusiveMethod() string { return "A" }

type ConcreteComponentB struct{}

func (c *ConcreteComponentB) Accept(visitor Visitor) {
	visitor.VisitConcreteComponentB(c)
}

func (c *ConcreteComponentB) SpecialMethod() string { return "B" }

type ConcreteVisitor1 struct{}

func (v *ConcreteVisitor1) VisitConcreteComponentA(element *ConcreteComponentA) {
	fmt.Println(element.ExclusiveMethod() + " + ConcreteVisitor1")
}

func (v *ConcreteVisitor1) VisitConcreteComponentB(element *ConcreteComponentB) {
	fmt.Println(element.SpecialMethod() + " + ConcreteVisitor1")
}

type ConcreteVisitor2 struct{}

func (v *ConcreteVisitor2) VisitConcreteComponentA(element *ConcreteComponentA) {
	fmt.Println(element.ExclusiveMethod() + " + ConcreteVisitor2")
}

func (v *ConcreteVisitor2) VisitConcreteComponentB(element *ConcreteComponentB) {
	fmt.Println(element.SpecialMethod() + " + ConcreteVisitor2")
}

func clientCode(components []Component, visitor Visitor) {
	for _, component := range components {
		component.Accept(visitor)
	}
}

func main() {
	components := []Component{&ConcreteComponentA{}, &ConcreteComponentB{}}

	fmt.Println("The client code works with all visitors via the base Visitor interface:")
	clientCode(components, &ConcreteVisitor1{})
	fmt.Println()

	fmt.Println("It allows the same client code to work with different types of visitors:")
	clientCode(components, &ConcreteVisitor2{})
}
```

## C++ Example

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class ConcreteComponentA;
class ConcreteComponentB;

class Visitor {
public:
    virtual ~Visitor() = default;
    virtual void VisitConcreteComponentA(const ConcreteComponentA* element) const = 0;
    virtual void VisitConcreteComponentB(const ConcreteComponentB* element) const = 0;
};

class Component {
public:
    virtual ~Component() = default;
    virtual void Accept(const Visitor* visitor) const = 0;
};

class ConcreteComponentA : public Component {
public:
    void Accept(const Visitor* visitor) const override {
        visitor->VisitConcreteComponentA(this);
    }
    std::string ExclusiveMethod() const { return "A"; }
};

class ConcreteComponentB : public Component {
public:
    void Accept(const Visitor* visitor) const override {
        visitor->VisitConcreteComponentB(this);
    }
    std::string SpecialMethod() const { return "B"; }
};

class ConcreteVisitor1 : public Visitor {
public:
    void VisitConcreteComponentA(const ConcreteComponentA* element) const override {
        std::cout << element->ExclusiveMethod() << " + ConcreteVisitor1\n";
    }
    void VisitConcreteComponentB(const ConcreteComponentB* element) const override {
        std::cout << element->SpecialMethod() << " + ConcreteVisitor1\n";
    }
};

class ConcreteVisitor2 : public Visitor {
public:
    void VisitConcreteComponentA(const ConcreteComponentA* element) const override {
        std::cout << element->ExclusiveMethod() << " + ConcreteVisitor2\n";
    }
    void VisitConcreteComponentB(const ConcreteComponentB* element) const override {
        std::cout << element->SpecialMethod() << " + ConcreteVisitor2\n";
    }
};

void ClientCode(const std::vector<std::unique_ptr<Component>>& components, const Visitor* visitor) {
    for (const auto& component : components) {
        component->Accept(visitor);
    }
}

int main() {
    std::vector<std::unique_ptr<Component>> components;
    components.push_back(std::make_unique<ConcreteComponentA>());
    components.push_back(std::make_unique<ConcreteComponentB>());

    std::cout << "The client code works with all visitors via the base Visitor interface:\n";
    ConcreteVisitor1 visitor1;
    ClientCode(components, &visitor1);
    std::cout << "\n";

    std::cout << "It allows the same client code to work with different types of visitors:\n";
    ConcreteVisitor2 visitor2;
    ClientCode(components, &visitor2);
}
```

## Rust Example

```rust
enum Component {
    ConcreteComponentA,
    ConcreteComponentB,
}

impl Component {
    fn exclusive_method(&self) -> &str {
        match self {
            Component::ConcreteComponentA => "A",
            Component::ConcreteComponentB => "B",
        }
    }

    fn accept(&self, visitor: &dyn Visitor) {
        match self {
            Component::ConcreteComponentA => visitor.visit_concrete_component_a(self),
            Component::ConcreteComponentB => visitor.visit_concrete_component_b(self),
        }
    }
}

trait Visitor {
    fn visit_concrete_component_a(&self, element: &Component);
    fn visit_concrete_component_b(&self, element: &Component);
}

struct ConcreteVisitor1;

impl Visitor for ConcreteVisitor1 {
    fn visit_concrete_component_a(&self, element: &Component) {
        println!("{} + ConcreteVisitor1", element.exclusive_method());
    }
    fn visit_concrete_component_b(&self, element: &Component) {
        println!("{} + ConcreteVisitor1", element.exclusive_method());
    }
}

struct ConcreteVisitor2;

impl Visitor for ConcreteVisitor2 {
    fn visit_concrete_component_a(&self, element: &Component) {
        println!("{} + ConcreteVisitor2", element.exclusive_method());
    }
    fn visit_concrete_component_b(&self, element: &Component) {
        println!("{} + ConcreteVisitor2", element.exclusive_method());
    }
}

fn client_code(components: &[Component], visitor: &dyn Visitor) {
    for component in components {
        component.accept(visitor);
    }
}

fn main() {
    let components = vec![Component::ConcreteComponentA, Component::ConcreteComponentB];

    println!("The client code works with all visitors via the base Visitor interface:");
    client_code(&components, &ConcreteVisitor1);
    println!();

    println!("It allows the same client code to work with different types of visitors:");
    client_code(&components, &ConcreteVisitor2);
}
```

## Pairs well with

Composite (Visitor walks Composite trees — the canonical pairing); Iterator (Visitor uses an Iterator to traverse).
