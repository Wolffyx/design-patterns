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

Tier 1 (prefer first): Factory Method, Abstract Factory, Builder,
Singleton, Adapter, Facade, Strategy, Observer, Iterator, Template Method.

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
- `PostToolUse pattern-smell-detector.js`  — non-blocking smell suggestions
- `PostToolUse log-pattern-decision.js`    — appends decisions to
                                             `.claude/pattern-decision-log.jsonl`
- `/pattern-review`                        — on-demand cross-file review

Tunable via `.claude/pattern-check.config.json` (see
`pattern-check.config.example.json` shipped with the plugin).

---

End of Rule 0 — keep the rest of your project's CLAUDE.md guidance below.
