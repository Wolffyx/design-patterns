---
description: On-demand cross-file design-pattern review of the current project.
---

Run a project-wide design-pattern review.

First resolve the hooks directory: if the environment variable
`CLAUDE_PLUGIN_ROOT` is set, use `HOOKS="$CLAUDE_PLUGIN_ROOT/hooks"`; otherwise
use `HOOKS="$HOME/.claude/hooks"` (the symlink-install location). Use `$HOOKS`
in the commands below.

1. Run `node "$HOOKS/analyze-log.js" --format json --since 30d`
   and capture the output.

2. List source files under `src/` in any supported language — `*.ts`, `*.tsx`,
   `*.py`, `*.java`, `*.cs`, `*.go`, `*.cpp`, `*.cc`, `*.cxx`, `*.hpp`, `*.rs`
   (cap at 200 files; stop early if the repo doesn't have a `src/` — try
   `apps/`, `packages/`, `lib/`, `cmd/`, and the repo root next).

3. For each file, synthesize a PostToolUse payload and run the smell
   detector:

   ```
   echo "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"<abs-path>\"}}" \
     | node "$HOOKS/pattern-smell-detector.js"
   ```

   Capture stderr for each run.

4. Group findings by smell id. Then emit a markdown report with these
   sections (skip empty ones):

   - **Switch-on-type** (file:line — N cases on `.kind`)
   - **Instanceof chain** (file:line — N branches)
   - **Repeated `new`** (file:line — Ctor×N)
   - **Long constructor** (file:line — N params)
   - **God class** (file:line — N methods)
   - **Boundary violation** (file:line — forbidden import)
   - **Family naming** (file:line — class name)
   - **Singleton** (file:line — class)
   - **Observer** (file:line — class with N pub/sub verbs)
   - **Command** (file:line — class)
   - **Template Method** (file:line — class)
   - **Cross-file duplicates** (signature — list of files)
   - **Decision-log trends** (counts by decision, top reject reasons,
     friction hotspots from the analyzer JSON)

5. End the report with one sentence per non-empty section telling the user
   what to do about it (e.g. "Consider lifting the shared `kind`-switch
   into a Strategy keyed on the discriminator.").

Do NOT auto-edit code. This command is read-only review.
