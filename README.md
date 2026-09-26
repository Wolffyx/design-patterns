# design-patterns

Always-on software-design skill (principles, control-flow rules, Tier 0
language-native forms, and the Gang of Four catalog) plus **Pattern Check
(Rule 0)** hook enforcement for [Claude Code](https://claude.com/claude-code).

- 22 GoF patterns, sourced from refactoring.guru, with code examples in
  TypeScript, Python, Java, C#, Go, C++, and Rust, in `skills/design-patterns/references/`.
  Each one lists the *lighter idiomatic form* to try first in every language.
- Control-flow rules (`references/control-flow.md`): no nested `if`
  (guard clauses), max nesting depth 2, no `else` after `return`, the
  **N+1 branches** ladder (`if` → dispatch map → Strategy / State), and
  **N+1 query** prevention (batch, hoist, eager load, bulk write, DataLoader).
- Function and error rules (`references/functions.md`): small functions,
  few parameters, no boolean flags, low complexity, command/query separation,
  never swallow an error, wrap errors at boundaries.
- Tier 0 non-GoF patterns (`references/extras.md`): Null Object, Result
  type, Repository, Specification, Pipeline / Middleware, Dependency Injection.
- 23 smell detectors, all seven languages (GoF shapes, control flow,
  functions, N+1). Advisory by default and scoped to the lines each edit
  touches; any of them can be made **blocking** per project.
- N+1 detection that grades evidence (known ORM / HTTP API, data-access
  receiver, same-file I/O helper, lazy relation load, GraphQL resolver) and
  says which fix applies: batch, hoist, bulk write, eager load.
- Cross-file duplicate detector — flags shared shapes across files as strong
  Strategy/Visitor candidates.
- `PreToolUse` hook that **blocks** Write/Edit/MultiEdit on TypeScript,
  Python, Java, C#, Go, C++, and Rust files until the agent emits a
  `Pattern check: …` preamble. Language detection lives in
  `hooks/_languages.js` — add a language with one entry.
- Decision-log analyzer (`analyze-log.js`) — surfaces drift, hotspots,
  per-path pattern frequency, and per-smell suppression rates with tuning hints.
- `/pattern-review` slash command — on-demand cross-file project audit.
- Eval suite (`evals/`) for `claude plugin eval`.

**Tier 0** first (guard clause, dispatch map, null object, result type,
repository, DI, language-native forms), then **Tier 1**: Factory Method,
Abstract Factory, Builder, Adapter, Facade, Strategy, Observer, Iterator,
Template Method. Singleton is Tier 1 by popularity but rejected by default.

---

## Requirements

- Node.js ≥ 18 (the hooks are pure stdlib, no `npm install` needed).
- Claude Code (any recent version supports plugins; older versions can use
  the symlink installer below).

---

## Install

### Path A — Claude Code plugin (recommended)

```
/plugin marketplace add wolffyx/design-patterns
/plugin install design-patterns@design-patterns
```

Restart Claude Code. The plugin's hooks resolve via `${CLAUDE_PLUGIN_ROOT}`,
so no path patching or symlinks are needed. Update with
`/plugin update design-patterns`.

### Path B — symlink installer

```bash
git clone https://github.com/wolffyx/design-patterns.git ~/design-patterns
cd ~/design-patterns
./install.sh
```

What it does:
- backs up any existing `~/.claude/skills/design-patterns` and `~/.claude/hooks`
  to `~/.claude/backups/design-patterns-<ts>/`,
- symlinks the repo's `skills/design-patterns/` and `hooks/` into `~/.claude/`,
- merges the hooks block from `settings.example.json` into
  `~/.claude/settings.json` (substituting `$HOME` with the user's home).

Restart Claude Code afterwards.

### Path C — `curl | bash` one-liner

```bash
curl -fsSL https://raw.githubusercontent.com/wolffyx/design-patterns/main/install.sh \
  | bash -s -- --auto-clone
```

The `--auto-clone` flag lets `install.sh` git-clone itself into
`~/design-patterns` before running the rest of the steps.

> **Security note:** piping a remote script into `bash` runs whatever the
> upstream serves at that moment. Audit the script first if you don't
> trust the source: open the URL in a browser before running.

### Path D — other AI agents (Cursor / Aider / Codex / …)

Hooks are Claude Code-specific (the `PreToolUse` / `PostToolUse` API only
exists there). The **catalog** is plain markdown and works anywhere:

```bash
cat dist/skill-bundle.md   # 113 KB, self-contained
```

Drop the contents into:

- **Cursor**:  `.cursor/rules/design-patterns.mdc` (or paste into Cursor settings → Rules)
- **Aider**:   `aider --read dist/skill-bundle.md`
- **Codex / ChatGPT custom GPT**: paste into the system prompt
- **Continue / Cline / etc.**: their rules / system-prompt slot

---

## Uninstall

```bash
~/design-patterns/uninstall.sh
```

Removes the symlinks, restores any backed-up real directories, strips
pattern-related entries from `~/.claude/settings.json` `hooks` block.

For plugin installs use:

```
/plugin uninstall design-patterns@design-patterns
```

---

## Per-project setup

The hooks work without per-project config, but you'll get the most value
by adding three things to your repo:

```bash
# 1. paste Rule 0 at the top of CLAUDE.md
cat ~/design-patterns/docs/CLAUDE.rule0.md >> CLAUDE.md

# 2. project pattern catalogue (template — fill in as families stabilise)
mkdir -p .claude
cp ~/design-patterns/docs/design-patterns-project-usage.md .claude/

# 3. tunable config (optional)
cp ~/design-patterns/pattern-check.config.example.json .claude/pattern-check.config.json
```

The config file's `$schema` ref gives editor autocomplete for every tunable
in [`pattern-check.schema.json`](pattern-check.schema.json).

---

## Hooks

| Event             | Hook                              | Blocking? | Purpose |
|-------------------|-----------------------------------|-----------|---------|
| SessionStart      | `session-start-reminder.js`       | no        | Inject Rule 0 banner once per session |
| UserPromptSubmit  | `user-prompt-reminder.js`         | no        | Brief reminder on each prompt |
| PreToolUse        | `pattern-context-prep.js`         | no        | Sibling-class hint, recent decisions |
| PreToolUse        | `check-pattern-preamble.js`       | **yes**   | Reject Write/Edit/MultiEdit without `Pattern check: …` preamble |
| PreToolUse        | `pattern-smell-gate.js`           | opt-in    | Reject a write that introduces a smell configured as `block` |
| PostToolUse       | `pattern-smell-detector.js`       | no        | Emit smell suggestions to stderr, log them for tuning |
| PostToolUse       | `log-pattern-decision.js`         | no        | Append decision to `pattern-decision-log.jsonl` |

Bypass for mechanical codemods: include `// pattern-check: skip <reason>`
in the file payload.

---

## Smell detectors

All detectors work on TypeScript, Python, Java, C#, Go, C++ and Rust, on
comment- and string-masked code. On an Edit / MultiEdit they report only the
lines the edit wrote, or the class / function it touched
(`smells.scope: "edited"`). A `Write` or `/pattern-review` reports the whole file.

**GoF shapes** (`hooks/_gof-smells.js`)

| smellId             | Trigger                                                                  | Suggests |
|---------------------|--------------------------------------------------------------------------|----------|
| `switch-on-type`    | ≥4 cases on `.type/.kind/.variant/.tag`, Go type switch, Python `match x.kind`, C# switch expression — skipped when marked exhaustive (`assertNever`, `: never`, `unreachable`) | Strategy, State |
| `instanceof-chain`  | ≥3 branches of `instanceof` / `typeof` / `isinstance` / `is T` / `dynamic_cast` / `.(T)` / `downcast_ref` | Strategy, Visitor |
| `repeated-new`      | ≥3 constructions of one type (`new X(`, `X(` in Python, `&X{`, `X::new(`, `make_unique<X>`) | Factory Method |
| `god-class`         | ≥8 public methods on one class / struct / impl / interface               | Facade, split, Interface Segregation |
| `boundary-violation`| forbidden import (any language's import form) in a guarded path          | Adapter |
| `family-naming`     | new `*Factory` / `*Adapter` / `*Facade` / `*Registry` type                | verify it extends the family |
| `singleton`         | private ctor + static instance, `__new__` + `_instance`, `sync.Once`, `OnceLock` / `lazy_static!`, static `instance()` | Singleton (verify global is intentional) |
| `observer`          | ≥3 pub/sub methods (`on`, `emit`, `subscribe`, `notify`, …) on one type  | Observer |
| `command`           | `execute`/`do` + `undo`, or a command history field                      | Command |
| `template-method`   | abstract type whose concrete method calls ≥2 of its abstract steps       | Template Method |

**Control flow** (`hooks/_control-flow-smells.js`)

| smellId             | Trigger | Suggests |
|---------------------|---------|----------|
| `nested-if`         | `if` directly inside another `if` / bare `else` block | guard clause, merged condition, `else if` |
| `deep-nesting`      | control-flow depth (if / loop / switch / try) > `maxNestingDepth` (2) | guard clauses, extract function |
| `else-after-return` | `else` / `elif` after return / throw / raise / continue / break | drop the `else`, dedent |
| `conditional-ladder`| if / else-if chain comparing one subject to literals, ≥3 branches | dispatch map, Strategy |
| `scattered-discriminator` | one subject compared to string / enum literals at ≥3 sites | State, Strategy, polymorphism |

**Functions and errors** (`hooks/_function-smells.js`)

| smellId               | Trigger | Suggests |
|-----------------------|---------|----------|
| `long-function`       | body > `maxFunctionLines` (50) non-blank lines | extract functions |
| `long-param-list`     | > `maxParams` (4) parameters | parameter / options object |
| `long-constructor`    | ≥ `constructorMaxParams` (5) constructor parameters (`constructor`, `__init__`, `NewX`, Rust `new`, class-named) | Builder, options, named args |
| `boolean-flag-param`  | a bool parameter on a non-setter | two functions, enum |
| `complexity`          | cyclomatic complexity > `maxComplexity` (10) | guard clauses, extract, dispatch map |
| `swallowed-exception` | empty `catch`, `except: pass`, empty `if err != nil {}`, `Err(_) => {}`, `.catch(() => {})` — a comment inside marks it intentional | handle, log with context, rethrow |

**N+1** (`hooks/_nplusone.js`)

| smellId         | Trigger | Suggests |
|-----------------|---------|----------|
| `n-plus-one`    | I/O inside a `for` / `forEach` / `map` / comprehension, graded **high** (known ORM / driver / HTTP API) or **medium** (data-access receiver, same-file I/O helper, lazy relation load on un-eager-loaded ORM rows, GraphQL resolver per parent). Classified as per-item, loop-invariant, N writes, concurrent-but-still-N, or nested N×M. `while` loops (pagination / polling) and small literal loops are skipped. | batch + map lookup, hoist, bulk write, eager load, DataLoader |
| `await-in-loop` | sequential `await` in a loop with no recognised I/O call (low confidence) | `Promise.all` / `gather` / `WhenAll` (bounded) when independent |

### Blocking a smell

Every smell is advisory by default. To enforce one, set its severity:

```json
{ "smells": { "severity": { "nested-if": "block", "n-plus-one": "block", "swallowed-exception": "block" } } }
```

`pattern-smell-gate.js` (PreToolUse) then computes the file as it would be
after the Write / Edit, runs every detector, and rejects the tool call when
a `block` smell sits on a line the call writes. Legacy smells elsewhere in
the file never block. `"off"` hides a smell entirely; `"*"` sets a default.

### Suppress a smell on one line

```ts
// pattern-smell: ignore singleton
class Logger { /* … */ }

// pattern-smell: ignore *
class Bus { on() {}; emit() {}; subscribe() {} }
```

The directive must be on the same line as the detection, or the
immediately preceding line.

### Cross-file duplicates (opt-in)

Set `smells.crossFile.enabled: true` in `pattern-check.config.json`. The
detector then maintains a corpus at
`.claude/cache/pattern-smell-corpus.json` and emits

```
[pattern-smell] cross-file: switch-on-type signature `kind|"a","b","c"` appears in 3 files: …
```

when ≥2 files share the same shape — strong signal to lift into a shared
Strategy / Visitor.

---

## `/pattern-review`

On-demand project audit.

1. Open Claude Code in your project root.
2. Run `/pattern-review`.
3. Skill walks `src/` (or `apps/`, `packages/`), runs every detector,
   aggregates the decision log, and emits a markdown report grouped by
   smell id with a final "Suggestions" section.

Read-only — never edits code.

---

## `analyze-log` CLI

```bash
node ~/.claude/hooks/analyze-log.js --since 7d
node ~/.claude/hooks/analyze-log.js --since 30d --format json
```

Outputs:

- decision counts (applied / extended / rejected / refactor-suggest),
- top 10 reject reasons (stem-collapsed),
- top patterns per `apps/` / `packages/` / `src/` bucket,
- block-rate sparkline over last 30 days,
- friction hotspots (>3 blocks on one file in last 7 days).

Run via `npm run analyze` from a checkout, or wired into the
`/pattern-review` skill.

---

## Config tunables

See [`pattern-check.schema.json`](pattern-check.schema.json) for the full
list. Highlights:

- `blocking.diffLineThreshold` — diff lines above which a substantive-edit
  trigger fires (default 40).
- `blocking.smallEditThreshold` — under this, edits with no new exported
  symbol skip the preamble check (default 10).
- `validation.requireCitationOnExtended` — when `true`, an `extended`
  decision must cite a source path (in the edited file's language) that
  resolves on disk.
- `validation.callerCountWarn` — emits a warning when a `rejected` reason
  claims "isolated" but ≥3 callers exist.
- `forbiddenPatterns` — block `applied` of any listed pattern (use
  sparingly — most patterns deserve a fair hearing).
- `smells.crossFile.enabled` — opt-in cross-file duplicate detection.
- `smells.severity`: per smell id (or `"*"`) `"off"`, `"advise"` (default)
  or `"block"` (enforced by `pattern-smell-gate.js`).
- `smells.scope`: `"edited"` (default) or `"file"`.
- Control flow: `smells.maxNestingDepth` (2), `smells.nestedIf`,
  `smells.elseAfterReturn`, `smells.conditionalLadderMinBranches` (3),
  `smells.scatteredDiscriminatorMinSites` (3).
- Functions: `smells.maxFunctionLines` (50), `smells.maxParams` (4),
  `smells.booleanFlagParam`, `smells.maxComplexity` (10),
  `smells.swallowedException`. Set a number to `0` to disable that detector.
- N+1: `smells.nPlusOne.minConfidence` (`high` / `medium` / `low`),
  `flagAwaitInLoop`, `includeWhileLoops`, `smallLoopMax`,
  `followLocalFunctions`, `lazyLoad`, `resolvers`, `extraCallPatterns` (regex
  sources for project-specific I/O), `dataAccessReceivers` (regex for
  receiver names).

`node hooks/analyze-log.js` reports, per smell, how often it was reported
vs suppressed, and suggests which knob to loosen when a smell is suppressed
in ≥30% of ≥5 sightings.

---

## Tests

```bash
npm test            # smoke + golden + matrix (75 cases, ephemeral sandbox)
npm run test:smoke  # 45 hook smoke tests, fast
npm run test:golden # 14 golden files: every smell, all 7 languages, clean files stay clean
npm run test:golden:update  # rewrite expected files after a detector change, then review the diff
npm run test:matrix # 16-case matrix against generated sandbox
npm run lint        # shellcheck install.sh uninstall.sh
npm run bundle      # regenerate dist/skill-bundle.md after editing references
```

All suites are self-contained — they build a temp sandbox in
`os.tmpdir()` and never touch a real project. Pass `--cwd /path` to
`run-matrix.js` to opt-in to running against your own codebase.

CI runs all three on every push; a stale `dist/skill-bundle.md` fails the build.

---

## Evals

`evals/` holds behavior checks for `claude plugin eval`. Each case asks for an
ordinary change *without* mentioning the rule, then grades whether the skill
steered the result:

| Case | Checks |
|---|---|
| `add-payment-provider` | a 4th provider moves the if/elif ladder to a dispatch map (N+1 branches) |
| `orders-with-customers` | customers are loaded in one round-trip, not one query per order (N+1 queries) |
| `signup-validation` | guard clauses, no nested `if`, no `else` after `return` |
| `config-loader` | only "file missing" falls back to defaults; no swallowed errors |
| `price-format` | a one-function task stays one function (anti-overuse) |

```bash
claude plugin eval . --runs 3              # with the plugin vs a no-plugin baseline arm
claude plugin eval . --case orders-with-customers --runs 1
```

Results land in `evals/results/` (git-ignored). Runs cost model usage.

---

## Roadmap

- Optional tree-sitter backend (opt-in dependency) to replace the regex
  scanner where precision matters.
- Cross-file N+1: follow I/O helpers across imports, not only within a file.
- Windows install (`install.ps1`).

---

## License

MIT — see [`LICENSE`](LICENSE) (add your own when forking).

The pattern reference content is adapted from [refactoring.guru](https://refactoring.guru/design-patterns)
and [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns)
(Gamma, Helm, Johnson, Vlissides, 1994).
