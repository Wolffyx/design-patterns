#!/usr/bin/env node
/**
 * SessionStart hook: injects the design-patterns Rule 0 reminder into
 * context once per session. Cheaper than re-injecting every turn, but
 * still guarantees the agent sees the rule immediately on startup.
 *
 * Output is written to stdout. Claude Code treats stdout as additional
 * context attached to the session.
 */

const { skillPath } = require('./_pattern-shared');

const lines = [
    '=== Design Patterns \u2014 Rule 0 (from CLAUDE.md) ===',
    '',
    'Before ANY Write/Edit/MultiEdit to a source file (TypeScript, Python, Java,',
    'C#, Go, C++, Rust) with substantive new logic (new class, interface, struct,',
    'trait, abstract, exported/public function, or diff >40 lines), emit ONE line',
    'first. Most edits answer "no GoF pattern":',
    '',
    '    Pattern check: no GoF pattern (-) \u2014 rejected \u2014 <reason \u226520 chars>.',
    '',
    'Only when a pattern genuinely fits:',
    '',
    '    Pattern check: <PatternName> (Tier <N>) \u2014 applied  \u2014 <reason \u226520 chars>.',
    '    Pattern check: <PatternName> (Tier <N>) \u2014 extended \u2014 <cite existing project class>.',
    '',
    'Required reads on first class/interface/refactor per session:',
    '  1. ' + skillPath('SKILL.md'),
    '  2. .claude/design-patterns-project-usage.md (if the project has one)',
    '  3. ' + skillPath('references', '<slug>.md'),
    '',
    'Control flow (every edit, see references/control-flow.md):',
    '  - no nested ifs: guard clauses / early return; depth \u2264 2; no else after return',
    '  - N+1 branches: 3+ branches on one key \u2192 dispatch map, then Strategy/State',
    '  - N+1 queries: no DB/HTTP call per loop item \u2192 batch, hoist, eager load, bulk write',
    'Functions: \u2264 ~50 lines, \u2264 4 params, no boolean flag params, never swallow errors',
    '  (see references/functions.md).',
    '',
    'Tier 0 first (guard clause, dispatch map, null object, result type,',
    'repository, DI, language-native forms). Then Tier 1: Factory Method,',
    'Abstract Factory, Builder, Adapter, Facade, Strategy, Observer, Iterator,',
    'Template Method. Singleton is Tier 1 but rejected by default.',
    '',
    'Anti-overuse rule: bug fixes, <50-line code with one caller, or code the',
    'repo already solves \u2014 answer `no GoF pattern`. Most edits are this.',
    'It covers GoF patterns only: the control-flow rules above apply to small',
    'code too (3+ branches on one key \u2192 Dispatch Map (Tier 0) \u2014 applied).',
    '',
    'Bypass for mechanical codemods / bulk renames (use the file\u2019s comment token):',
    '    // pattern-check: skip <reason>      (or `# pattern-check: skip` in Python)',
    '',
    'Enforcement:',
    '  - PreToolUse check-pattern-preamble.js  \u2014 blocks on missing preamble',
    '  - PreToolUse  pattern-smell-gate.js     \u2014 blocks smells set to `block` (opt-in)',
    '  - PostToolUse pattern-smell-detector.js \u2014 non-blocking smell suggestions',
    '  - PostToolUse log-pattern-decision.js   \u2014 appends decisions to',
    '                                             .claude/pattern-decision-log.jsonl',
    '  - /pattern-review skill                 \u2014 on-demand cross-file review',
    '',
    'Tunable via .claude/pattern-check.config.json.',
    '',
    '=== end reminder ===',
];

process.stdout.write(lines.join('\n') + '\n');
process.exit(0);
