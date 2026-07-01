# Porting the Design-Patterns System to Another Project

The design-patterns skill + pattern-review skill + per-edit hooks are
project-neutral. All project-specific content lives in **three files outside
the skills and hooks directories**:

1. `.claude/design-patterns-project-usage.md` \u2014 your project's pattern
   families, per-pattern guidance, extend-first table
2. `.claude/pattern-check.config.json` \u2014 per-path rules, forbidden imports,
   guarded paths, thresholds
3. `CLAUDE.md` (project root) \u2014 Rule 0 preamble and enforcement-pipeline
   section

Follow these steps to port the system to a new project.

---

## Step 1. Copy the portable pieces

Copy these directories and files **as-is** \u2014 no edits needed:

```
.claude/skills/design-patterns/       # GoF catalog + 22 per-pattern references
.claude/skills/pattern-review/        # on-demand cross-file audit skill
.claude/hooks/check-pattern-preamble.js
.claude/hooks/pattern-smell-detector.js
.claude/hooks/log-pattern-decision.js
.claude/hooks/session-start-reminder.js
.claude/hooks/user-prompt-reminder.js
```

## Step 2. Create the project-usage doc

Create `.claude/design-patterns-project-usage.md` in the new project. Use the
template in the next section as a starting point. This is where you document:

- **Existing project usage** table \u2014 what patterns are already in the code
  and where their canonical implementations live (e.g. `IYourKernel` at
  `packages/<your-package>/src/interfaces/IYourKernel.ts`). Guides "extend"
  decisions.
- **Refactor-opportunity checklist** \u2014 questions the agent asks before
  emitting a Pattern check preamble on edits to existing code.
- **Per-pattern project usage** \u2014 for each GoF pattern in the catalog, a
  note on whether and how it applies here.
- **Plan-workflow rule** \u2014 project-specific rules for plans (e.g. must cite
  existing class when extending).

### Minimal template

```markdown
# Design Patterns \u2014 <ProjectName>-Specific Usage

Project-specific guidance for applying the GoF patterns from the
`design-patterns` skill inside this repo.

## Existing project usage (verified)

Extend these. Do NOT introduce parallel implementations.

| Pattern        | Project location                              |
|----------------|-----------------------------------------------|
| <Pattern name> | <path/to/BaseClass.ts> + <path/to/adapters/> |
| ...            | ...                                           |

## Refactor-opportunity checklist (when editing existing code)

1. Am I adding a branch to a growing `switch (x.type)` chain? ...
2. Am I adding another `new <Concrete>()` for a type already constructed
   in 3+ places? ...
3. Am I bypassing an existing factory/adapter/facade? ...
...

## Per-pattern guidance

### Tier 1

#### Factory Method
<project-specific note>

#### Adapter
<project-specific note>

...
```

If you're porting from this repo, the CadProject version of
`design-patterns-project-usage.md` is a concrete example showing how to fill
in each section for a real project \u2014 treat it as a reference, not a template
to copy.

## Step 3. Configure project-specific rules

Edit `.claude/pattern-check.config.json`:

```json
{
  "project": {
    "name": "<YourProject>",
    "usageDocPath": ".claude/design-patterns-project-usage.md",
    "monorepoPackages": ["@your/pkg-a", "@your/pkg-b"]
  },
  "perPathRules": [
    { "glob": "packages/types/**", "action": "skip", "reason": "..." },
    { "glob": "apps/<app-name>/**", "action": "strict", "reason": "..." },
    { "glob": "packages/<infra>/**", "action": "interface-first", "reason": "..." }
  ],
  "smells": {
    "boundaryViolationPaths": {
      "guardedPath": "apps/<app-name>/",
      "forbiddenImports": ["<third-party-module-1>", "<third-party-module-2>"],
      "allowedPaths": ["packages/<adapter-layer>/"],
      "routeThroughHint": "<@your/adapter-package>"
    }
  }
}
```

- `perPathRules[].action`: `skip` (no check), `lite` (only class/interface/
  abstract), `strict` (extra guidance in block message), `interface-first`
  (cite the interface when implementing).
- `smells.boundaryViolationPaths`: set `guardedPath` to the app path where
  only the adapter layer should reach third-party modules. `forbiddenImports`
  lists the third-party modules themselves. `allowedPaths` exempts the
  adapter packages. `routeThroughHint` is the text the hook suggests.
- Leave any field empty (`""` or `[]`) to disable that check.

## Step 4. Add Rule 0 to the project CLAUDE.md

Paste this section near the top of your `CLAUDE.md`:

```markdown
## Rule 0 \u2014 Pattern Check (mandatory preamble)

Before ANY tool call that writes or edits a source file (TypeScript, Python,
Java, C#, Go, C++, Rust) with
**substantive new logic** \u2014 a new `class`, `interface`, `abstract` class,
new exported `function`, new exported arrow-const, a brand-new file, or a
diff large enough to imply structural change \u2014 emit ONE line first.

**Default form** (most bug fixes / small edits answer this way):

    Pattern check: no GoF pattern (-) \u2014 rejected \u2014 <reason \u226520 chars>.

**Only when a pattern genuinely fits:**

    Pattern check: <PatternName> (Tier <N>) \u2014 applied \u2014 <reason \u226520 chars>.
    Pattern check: <PatternName> (Tier <N>) \u2014 extended \u2014 <cite existing project class>.

- `<decision>`: `applied` | `extended` | `rejected`
- `<reason>`: \u2265 20 chars (vague one-word reasons are rejected by the hook)

**Bypass** for mechanical codemods / bulk renames: add
`// pattern-check: skip <reason>` to the file payload.

**Required reads** on first class/interface/refactor work per session:

1. `.claude/skills/design-patterns/SKILL.md`
2. `.claude/design-patterns-project-usage.md`
3. `.claude/skills/design-patterns/references/<slug>.md`

### Enforcement pipeline

| Layer | Hook | Behavior |
|-------|------|----------|
| 1 | `.claude/hooks/check-pattern-preamble.js` (PreToolUse) | **Blocks** on substantive triggers if no preamble |
| 2 | `.claude/hooks/pattern-smell-detector.js` (PostToolUse) | **Non-blocking** \u2014 scans the post-edit file for pattern-candidate smells |
| 3 | `/pattern-review` skill (on-demand) | Cross-file analysis, hot-spot detection, missed-extension check |
| 4 | `.claude/hooks/log-pattern-decision.js` (PostToolUse) | Appends every Pattern check line to `.claude/pattern-decision-log.jsonl` |

Tunable via `.claude/pattern-check.config.json`.
```

## Step 5. Wire the hooks in settings.json

Merge this into `.claude/settings.json` (or `.claude/settings.local.json`):

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "node .claude/hooks/session-start-reminder.js" }
      ]}
    ],
    "UserPromptSubmit": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "node .claude/hooks/user-prompt-reminder.js" }
      ]}
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit|MultiEdit", "hooks": [
        { "type": "command", "command": "node .claude/hooks/check-pattern-preamble.js" }
      ]}
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit|MultiEdit", "hooks": [
        { "type": "command", "command": "node .claude/hooks/pattern-smell-detector.js" },
        { "type": "command", "command": "node .claude/hooks/log-pattern-decision.js" }
      ]}
    ]
  }
}
```

## Step 6. Git-ignore the decision log

Add to `.gitignore`:

```
.claude/pattern-decision-log.jsonl
```

The log is session-local and per-developer.

## Step 7. Verify

Run a quick sanity check from the project root:

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"src/test.ts","content":"export class Foo {}"}}' | \
  node .claude/hooks/check-pattern-preamble.js
echo "exit: $?"
```

Expect exit code 2 and a block message. Then add a preamble:

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"src/test.ts","content":"// Pattern check: no GoF pattern (-) \u2014 rejected \u2014 single-use bootstrap class, no expected extension.\nexport class Foo {}"}}' | \
  node .claude/hooks/check-pattern-preamble.js
echo "exit: $?"
```

Expect exit code 0.

---

## What stays portable, what doesn't

**Portable (never edit per-project):**
- `.claude/skills/design-patterns/SKILL.md` and `references/*.md`
- `.claude/skills/pattern-review/SKILL.md`
- `.claude/hooks/*.js` (read config; hardcode nothing about the project)

**Per-project (always edit):**
- `.claude/design-patterns-project-usage.md` \u2014 the CAD-specific content in
  the CadProject version is an example; rewrite for your project
- `.claude/pattern-check.config.json` \u2014 glob rules, forbidden imports,
  guarded paths, route-through hint
- `CLAUDE.md` \u2014 add the Rule 0 section shown above; the rest is yours

**Project-neutral default:** if you don't create
`pattern-check.config.json`, the hooks fall back to sensible generic
defaults (no per-path rules, no boundary check, standard smell thresholds).
The system still works \u2014 it just won't flag project-specific boundary
violations or treat any path as strict/lite.
