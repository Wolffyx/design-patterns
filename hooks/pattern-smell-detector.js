#!/usr/bin/env node
/**
 * PostToolUse hook: scans the post-edit file for design smells and prints
 * advisory suggestions to stderr. Never blocks (exit 0) — smells configured
 * as `block` are enforced *before* the write by pattern-smell-gate.js.
 *
 * Detectors (all seven languages; see the module headers for details):
 *   _gof-smells.js           switch-on-type, instanceof-chain, repeated-new,
 *                            god-class, boundary-violation, family-naming,
 *                            singleton, observer, command, template-method
 *   _control-flow-smells.js  nested-if, deep-nesting, else-after-return,
 *                            conditional-ladder, scattered-discriminator
 *   _function-smells.js      long-function, long-param-list, long-constructor,
 *                            boolean-flag-param, complexity, swallowed-exception
 *   _nplusone.js             n-plus-one, await-in-loop
 *
 * Scope: on Edit / MultiEdit only findings on the lines the edit wrote (or in
 * the class / function it touched) are reported — `smells.scope: "file"`
 * reports the whole file. A Write reports the whole file.
 *
 * Per-smell severity: `smells.severity: { "<smellId>": "off"|"advise"|"block" }`.
 *
 * Per-line suppression:
 *   `// pattern-smell: ignore <smellId>` (`#` in Python) on the same line OR
 *   the line above. `*` suppresses every smell on that line. Suppressions are
 *   logged so `analyze-log.js` can tell which thresholds are too tight.
 *
 * Cross-file (opt-in via `smells.crossFile.enabled`):
 *   Tracks normalized signatures across files. When ≥2 files share the same
 *   shape (e.g. same switch-on `kind` with cases A|B|C), emits a stronger
 *   "cross-file: <signature> appears in N files" hint.
 *
 * Input: JSON on stdin from PostToolUse; tool_name, tool_input.
 * Output: [pattern-smell] <file>:<line> <smell> — consider <fix>.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');
const scanLib = require('./_code-scan');
const smells = require('./_smells');
const corpus = require('./_smell-corpus');

const raw = shared.readStdin();
const input = raw && shared.safeJson(raw);
if (!input) process.exit(0);

const tool = input.tool_name;
if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

const cfg = smells.loadConfig();
const s = cfg.smells;
if (!s.enabled) process.exit(0);

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || '';
if (!filePath || !smells.inScopeFile(filePath, cfg)) process.exit(0);

let fileText = '';
try { fileText = fs.readFileSync(filePath, 'utf8'); } catch { process.exit(0); }
if (!fileText) process.exit(0);

const fileRel = filePath.replace(/\\/g, '/').replace(/^.*\/(apps|packages)\//, '$1/');
const all = smells.runAll(fileText, filePath, s);
const ranges = s.scope === 'file' ? null : scanLib.editedLineRanges(fileText, tool, toolInput);
const { report, suppressed } = smells.select(all, fileText, ranges, s);

for (const f of report) process.stderr.write(smells.formatFinding(fileRel, f));
smells.logFindings(cfg, filePath,
    report.map(f => ({ f, suppressed: false })).concat(suppressed.map(f => ({ f, suppressed: true }))));

// cross-file matches — fed with every unsuppressed finding in the file
if (s.crossFile && s.crossFile.enabled) {
    const whole = smells.select(all, fileText, null, s).report;
    const matches = corpus.update(s.crossFile, path.resolve(filePath), whole);
    for (const m of matches) {
        if (m.files.length < 2) continue;
        process.stderr.write(
            `[pattern-smell] cross-file: ${m.smellId} signature \`${m.signature}\` ` +
            `appears in ${m.files.length} files: ${m.files.join(', ')}\n` +
            '  Strong candidate to lift into a shared Strategy/Visitor abstraction.\n',
        );
    }
}

process.exit(0);
