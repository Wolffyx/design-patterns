# design-patterns

Always-on Gang of Four design-pattern catalog plus **Pattern Check (Rule 0)**
hook enforcement for [Claude Code](https://claude.com/claude-code).

- 22 GoF patterns, sourced from refactoring.guru, in `skills/design-patterns/references/`.
- 10 smell detectors that suggest a pattern when code shape calls for one
  (Strategy, State, Visitor, Factory Method, Builder, Facade, Adapter,
  Singleton, Observer, Command, Template Method).
- Cross-file duplicate detector — flags shared shapes across files as strong
  Strategy/Visitor candidates.
- `PreToolUse` hook that **blocks** Write/Edit/MultiEdit on `.ts/.tsx`
  files until the agent emits a `Pattern check: …` preamble.
- Decision-log analyzer (`analyze-log.js`) — surfaces drift, hotspots,
  per-path pattern frequency.
- `/pattern-review` slash command — on-demand cross-file project audit.

**Tier 1** (preferred first): Factory Method, Abstract Factory, Builder,
Singleton, Adapter, Facade, Strategy, Observer, Iterator, Template Method.

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
| PostToolUse       | `pattern-smell-detector.js`       | no        | Emit smell suggestions to stderr |
| PostToolUse       | `log-pattern-decision.js`         | no        | Append decision to `pattern-decision-log.jsonl` |

Bypass for mechanical codemods: include `// pattern-check: skip <reason>`
in the file payload.

---

## Smell detectors

| smellId             | Trigger                                                                           | Suggests                              |
|---------------------|-----------------------------------------------------------------------------------|---------------------------------------|
| `switch-on-type`    | ≥4 cases on `.type` / `.kind` / `.variant` / `.tag`                               | Strategy, State                       |
| `instanceof-chain`  | ≥3 branches of `instanceof` / `typeof`                                            | Strategy, Visitor                     |
| `repeated-new`      | ≥3 `new Concrete(...)` of one ctor in one file                                    | Factory Method                        |
| `long-constructor`  | ≥5 constructor params                                                             | Builder                               |
| `god-class`         | ≥8 public methods on one class                                                    | Facade or split by responsibility     |
| `boundary-violation`| Forbidden import in a guarded path                                                | Adapter (route through port)          |
| `family-naming`     | New `*Factory` / `*Adapter` / `*Facade` / `*Registry`                             | Verify it extends the existing family |
| `singleton`         | private ctor + static instance + `getInstance()`                                  | Singleton (verify global is intentional) |
| `observer`          | ≥3 of `addListener` / `on(` / `subscribe(` / `emit(` / `notify(` clustered in one class | Observer                          |
| `command`           | class with `execute()` + `undo()` OR `Command[]` / `history` field                 | Command                               |
| `template-method`   | abstract class with ≥2 abstract methods called via `this.` from one concrete method | Template Method                     |

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
  decision must cite a `.ts/.tsx` path that resolves on disk.
- `validation.callerCountWarn` — emits a warning when a `rejected` reason
  claims "isolated" but ≥3 callers exist.
- `forbiddenPatterns` — block `applied` of any listed pattern (use
  sparingly — most patterns deserve a fair hearing).
- `smells.crossFile.enabled` — opt-in cross-file duplicate detection.

---

## Tests

```bash
npm test            # smoke + matrix (35 cases total, ephemeral sandbox)
npm run test:smoke  # 19 hook smoke tests, fast
npm run test:matrix # 16-case matrix against generated sandbox
npm run lint        # shellcheck install.sh uninstall.sh
npm run bundle      # regenerate dist/skill-bundle.md after editing references
```

Both test suites are self-contained — they build a temp sandbox in
`os.tmpdir()` and never touch a real project. Pass `--cwd /path` to
`run-matrix.js` to opt-in to running against your own codebase.

CI runs all three on every push; a stale `dist/skill-bundle.md` fails the build.

---

## Roadmap

- v1.1 — AST-based detection (ts-morph) to cut regex false positives.
- v1.1 — multi-language references (`.python.md`, `.go.md`).
- v1.1 — telemetry self-tuning (analyze-log auto-suggests config changes).
- v1.2 — Windows install (`install.ps1`).

---

## License

MIT — see [`LICENSE`](LICENSE) (add your own when forking).

The pattern reference content is adapted from [refactoring.guru](https://refactoring.guru/design-patterns)
and [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns)
(Gamma, Helm, Johnson, Vlissides, 1994).
