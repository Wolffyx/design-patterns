---
description: On-demand cross-file design-pattern review of the current project.
---

Run a project-wide design-pattern review.

1. Run `node ${CLAUDE_PLUGIN_ROOT}/hooks/analyze-log.js --format json --since 30d`
   and capture the output.

2. List `.ts` and `.tsx` files under `src/` (cap at 200 files; stop early if
   the repo doesn't have a `src/` — try `apps/` and `packages/` next).

3. For each file, synthesize a PostToolUse payload and run the smell
   detector:

   ```
   echo "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"<abs-path>\"}}" \
     | node ${CLAUDE_PLUGIN_ROOT}/hooks/pattern-smell-detector.js
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
