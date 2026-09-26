---
name: Hook Protocol
category: Enforcement
source: hooks/pattern-context-prep.js, hooks/check-pattern-preamble.js
---

# Hook Protocol

Read this when a `PATTERN-CONTEXT:` block appears in hook output, or when you
need to know exactly when the hooks fire. It is only about the enforcement
hooks; design guidance lives in SKILL.md.

## When the preamble hook fires

A Write / Edit / MultiEdit needs a *Pattern check* line when it adds a new
type or public function, or when its diff is large. "New type" per language:

| Language   | "New type" trigger                                          | Skip token |
|------------|------------------------------------------------------------|------------|
| TypeScript | class / interface / abstract / exported fn or arrow-const  | `//`       |
| Python     | class / Protocol·ABC / `@abstractmethod` / top-level `def` | `#`        |
| Java       | class / interface / record / enum / abstract               | `//`       |
| C#         | class / interface / record / struct / abstract             | `//`       |
| Go         | `type … struct` / `type … interface` / exported `func`     | `//`       |
| C++        | class / struct / pure-virtual (`… = 0;`)                    | `//`       |
| Rust       | struct / enum / trait / `pub fn`                            | `//`       |

## The three line thresholds (they are different things)

| Threshold | Owner | Meaning |
|---|---|---|
| `smallEditThreshold` (10) | hook | Edits under 10 changed lines with no new exported symbol **skip** the check entirely. |
| `diffLineThreshold` (40) | hook | Diffs over 40 lines (or any new class / interface / exported fn) **require** a *Pattern check* line. |
| < 50 lines, one caller | you | Judgement rule: such code **answers** `rejected`. The line is still required when the hook fires. |

## PATTERN-CONTEXT preflight

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
cite a real source path in the edited file's language (`.ts`, `.py`, `.go`, …).

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

## Anti-overuse rule still dominates

SKILL.md §3 (anti-overuse) overrides this preflight. Do NOT emit `refactor-suggest` for <50-line
single-caller code just because the hook offered siblings. The preflight
gives you information; judgement stays yours.
