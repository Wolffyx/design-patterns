---
name: pattern-review
description: >
  On-demand cross-file design-pattern review. Scans the project's TypeScript
  source, runs every smell detector from pattern-smell-detector.js (regex-
  based, fast), aggregates the decision log via analyze-log.js, and produces
  a grouped markdown report. Read-only — does not modify code. Use when the
  user runs `/pattern-review` or asks for a project-wide pattern audit.
---

# Pattern review skill

Triggered by the `/pattern-review` command. Produces a markdown report
without editing any code.

## Inputs

- Working directory: project root.
- Plugin path: `${CLAUDE_PLUGIN_ROOT}` (set automatically when this skill
  ships as part of the design-patterns plugin).

## Procedure

1. **Decision-log summary.** Run:
   ```
   node ${CLAUDE_PLUGIN_ROOT}/hooks/analyze-log.js --format json --since 30d
   ```
   Capture stdout. If the file does not exist, treat the section as empty.

2. **File enumeration.** Pick the first existing root: `src/`, `apps/`,
   `packages/`. Walk for `.ts`/`.tsx` files, excluding
   `*.test.ts`, `*.spec.ts`, `*.d.ts`, `*.types.ts`, `node_modules/`, `dist/`.
   Cap at 200 files (warn in report if truncated).

3. **Per-file detection.** For each file, run:
   ```
   echo '{"tool_name":"Write","tool_input":{"file_path":"<abs>"}}' \
     | node ${CLAUDE_PLUGIN_ROOT}/hooks/pattern-smell-detector.js
   ```
   Capture stderr. Each emitted line has the form
   `[pattern-smell] <file>:<line> <message> — consider <pattern>.`

4. **Aggregate.** Bucket findings by smell id (parse from the message).
   Cross-file lines (`[pattern-smell] cross-file: …`) go into their own
   section.

5. **Report.** Emit markdown with sections in this order, omitting empty
   ones:

   ```
   ## Pattern review

   ### Switch-on-type
   - <file:line> — <message>

   ### Instanceof chain
   - …

   ### …  (one section per smell id)

   ### Cross-file duplicates
   - <signature> — <fileA>, <fileB>

   ### Decision-log trends (last 30 days)
   - applied: N · extended: N · rejected: N · refactor-suggest: N
   - top reject reason: "<stem>" (×N)
   - friction hotspots: <file> (×N blocks)

   ### Suggestions
   <one bullet per non-empty section above>
   ```

6. **Do not** auto-edit code, run `git`, or call other tools beyond reading
   files and running the two hooks above. Output is informational.

## Notes

- If `${CLAUDE_PLUGIN_ROOT}` is unset (skill running outside the plugin),
  fall back to `~/.claude/hooks/` paths.
- The smell detector reads the **on-disk** content of each file, so the
  report reflects the current working tree (no fetching from git history).
