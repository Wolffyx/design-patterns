# Rule 0 — Pattern Check

Paste this into your project's `CLAUDE.md` (top-of-file, before other rules)
so any agent operating on the repo sees it on every turn.

---

## Rule 0 (Pattern Check)

Before ANY Write/Edit/MultiEdit to a source file — TypeScript, Python, Java,
C#, Go, C++, or Rust — with substantive new logic (new class, interface,
struct, trait, abstract, exported/public function, or diff >40 lines), emit
ONE line first. Most edits answer "no GoF pattern":

```
Pattern check: no GoF pattern (-) — rejected — <reason ≥20 chars>.
```

Only when a pattern genuinely fits:

```
Pattern check: <PatternName> (Tier <N>) — applied  — <reason ≥20 chars>.
Pattern check: <PatternName> (Tier <N>) — extended — <cite existing project class>.
```

Required reads on first class/interface/refactor per session:

1. `.claude/skills/design-patterns/SKILL.md`
2. `.claude/design-patterns-project-usage.md`
3. `.claude/skills/design-patterns/references/<slug>.md`

**Control flow (every edit, `references/control-flow.md`):**

- No nested `if`: guard clauses / early return. Control-flow depth ≤ 2. No
  `else` after `return` / `throw` / `continue` / `break`.
- **N+1 branches:** a 3rd branch on the same key → dispatch map; branches
  with several operations or state → Strategy / State. The same discriminator
  checked at a 3rd site → centralize it.
- **N+1 queries:** no DB / HTTP call per loop item → batch (`IN`) and map
  lookup, hoist loop-invariant calls, eager-load relations, bulk writes,
  DataLoader for resolvers. `Promise.all` over N calls is still N round-trips.

**Functions and errors (`references/functions.md`):** ≤ ~50 lines, ≤ 4
parameters, no boolean flag parameters, complexity ≤ 10, never swallow an
error (handle, log with context, or rethrow).

Tier 0 first (guard clause, dispatch map, null object, result type,
repository, DI, language-native forms). Then Tier 1: Factory Method, Abstract
Factory, Builder, Adapter, Facade, Strategy, Observer, Iterator, Template
Method. Singleton is Tier 1 but rejected by default.

**Anti-overuse rule:** bug fixes, <50-line code with one caller, or code the
repo already solves — answer `no GoF pattern`. Most edits are this.

**Bypass** for mechanical codemods / bulk renames (use the file's line-comment
token — `//` for TS/Java/C#/Go/C++/Rust, `#` for Python):

```
// pattern-check: skip <reason>   ← add to payload
# pattern-check: skip <reason>    ← Python
```

### Enforcement (when this plugin is installed)

- `PreToolUse  check-pattern-preamble.js`  — blocks on missing preamble
- `PreToolUse  pattern-smell-gate.js`      — blocks smells set to `block` in
                                            `smells.severity` (opt-in)
- `PostToolUse pattern-smell-detector.js`  — non-blocking smell suggestions
- `PostToolUse log-pattern-decision.js`    — appends decisions to
                                             `.claude/pattern-decision-log.jsonl`
- `/pattern-review`                        — on-demand cross-file review

Tunable via `.claude/pattern-check.config.json` (see
`pattern-check.config.example.json` shipped with the plugin).

---

End of Rule 0 — keep the rest of your project's CLAUDE.md guidance below.
