#!/usr/bin/env node
/**
 * PreToolUse hook: blocks a Write / Edit / MultiEdit that would introduce a
 * smell configured as `block` in `smells.severity`, e.g.
 *
 *   "smells": { "severity": { "nested-if": "block", "n-plus-one": "block" } }
 *
 * The proposed file content is computed in memory (Edit / MultiEdit applied
 * to the current file), every detector runs on it, and only findings on the
 * lines this call writes count — legacy smells elsewhere in the file never
 * block. A Write to an existing file is scoped to the lines that changed.
 *
 * No `block` severity configured → exits 0 immediately (zero cost).
 *
 * Escape hatches: fix the code; or put `// pattern-smell: ignore <smellId>`
 * (`#` in Python) on the flagged line or the line above; or HOOKS_DRY_RUN=1.
 *
 * Exit codes: 0 allow · 2 block (stderr is shown to the agent).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');
const scanLib = require('./_code-scan');
const smells = require('./_smells');

const DRY_RUN = process.env.HOOKS_DRY_RUN === '1';

main().catch(() => process.exit(0)); // a crashing gate must not block edits

async function main() {
const raw = shared.readStdin();
const input = raw && shared.safeJson(raw);
if (!input) process.exit(0);

const tool = input.tool_name;
if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

const cfg = smells.loadConfig();
const s = cfg.smells;
if (!s.enabled || !smells.anyBlocking(s)) process.exit(0);

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || '';
if (!filePath || !smells.inScopeFile(filePath, cfg)) process.exit(0);

let current = null;
try { current = fs.readFileSync(filePath, 'utf8'); } catch { current = null; }
const proposed = scanLib.applyEdit(current, tool, toolInput);
if (!proposed) process.exit(0);

const ranges = tool === 'Write'
    ? smells.changedLineRanges(current, proposed)
    : scanLib.editedLineRanges(proposed, tool, toolInput);
const { report } = smells.select(await smells.runAll(proposed, filePath, s), proposed, ranges, s);
const blocking = report.filter(f => f.severity === 'block');
if (!blocking.length) process.exit(0);

const fileRel = filePath.replace(/\\/g, '/').replace(/^.*\/(apps|packages)\//, '$1/');
// null when the configured path leaves <project>/.claude/ — then no stat is written
const statsPath = shared.projectFile((cfg.log && cfg.log.blockStatsPath) || '.claude/pattern-block-stats.jsonl');
try {
    if (statsPath) {
        fs.mkdirSync(path.dirname(statsPath), { recursive: true });
        fs.appendFileSync(statsPath, JSON.stringify({
            ts: new Date().toISOString(),
            rule: 'smell-gate',
            file: filePath.replace(/\\/g, '/'),
            smells: blocking.map(f => `${f.smellId}:${f.line}`),
        }) + '\n', 'utf8');
    }
} catch {
    // telemetry must never break the flow
}

const lines = [
    `BLOCKED by smell gate — this ${tool} introduces ${blocking.length} smell(s) configured as \`block\`:`,
    '',
    ...blocking.map(f => smells.formatFinding(fileRel, f).trimEnd()),
    '',
    'Rewrite the code to remove them (see the referenced guide), then retry.',
    'Only if the smell is intentional: add `// pattern-smell: ignore <smellId>` (`#` in Python)',
    'with a reason on the flagged line or the line above.',
];
process.stderr.write(lines.map(l => (DRY_RUN ? 'DRY-RUN: ' + l : l)).join('\n') + '\n');
process.exit(DRY_RUN ? 0 : 2);
}
