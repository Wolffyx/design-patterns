#!/usr/bin/env node
/**
 * UserPromptSubmit hook: injects a one-line reminder on every user turn.
 * Complements the SessionStart reminder — SessionStart loads once, this
 * keeps the rule fresh in context on long sessions where the first
 * reminder may scroll out of the attention window.
 *
 * Output is written to stdout. Claude Code treats stdout as additional
 * context attached to the user message.
 *
 * Kept intentionally short (~30 tokens) to minimize per-turn cost.
 */

process.stdout.write(
    'REMINDER (Rule 0): If this turn writes or edits a .ts/.tsx file with substantive ' +
    'new logic (class, interface, abstract, exported function, arrow-const, or >40-line ' +
    'diff), emit `Pattern check: <Pattern> (Tier N) — <decision> — <reason ≥20 chars>` ' +
    'before the Write/Edit tool call. Most bug fixes answer `no GoF pattern — rejected`. ' +
    'See .claude/skills/design-patterns/SKILL.md and .claude/design-patterns-project-usage.md.\n'
);
process.exit(0);
