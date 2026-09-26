#!/usr/bin/env node
/**
 * Golden-file tests for every smell detector, all seven languages.
 *
 *   hooks/__tests__/golden/smells.<ext>   code full of intentional smells
 *   hooks/__tests__/golden/clean.<ext>    well-shaped code — must stay silent
 *   <fixture>.expected.json               exact [{ smellId, line }] list
 *
 * Any new finding, lost finding or moved line fails the run, so detector
 * changes show up as a reviewable diff of the expected files.
 *
 *   node hooks/__tests__/golden.js                        # verify (regex backend)
 *   node hooks/__tests__/golden.js --parser tree-sitter   # verify the AST backend against the same files
 *   node hooks/__tests__/golden.js --update               # rewrite expected files, then review the diff
 *
 * Both backends must produce identical findings, so one expected file serves
 * both. `--parser tree-sitter` fails when the parsers are not installed
 * (scripts/install-parsers.js) instead of silently testing regex twice.
 *
 * Runs the detectors in-process with default config and whole-file scope.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const smells = require('../_smells');
const tsScan = require('../_ts-scan');

const DIR = path.join(__dirname, 'golden');

const UPDATE = process.argv.includes('--update');
const PARSER = process.argv.includes('--parser') ? process.argv[process.argv.indexOf('--parser') + 1] : 'regex';

const s = smells.mergeSmells({ scope: 'file', parser: PARSER });
let pass = 0;
let fail = 0;

main().then(() => process.exit(fail === 0 ? 0 : 1), e => {
    process.stdout.write(`  ✗ ${e.stack || e}\n`);
    process.exit(1);
});

async function main() {
if (PARSER === 'tree-sitter' && !tsScan.available()) {
    throw new Error('tree-sitter parsers not installed — run: node scripts/install-parsers.js');
}
// golden-ast/: shapes only the syntax tree can see (brace-less bodies, braces in literals)
const dirs = PARSER === 'tree-sitter' ? [DIR, path.join(__dirname, 'golden-ast')] : [DIR];
const fixtures = dirs.flatMap(d => fs.readdirSync(d).filter(f => !f.endsWith('.expected.json')).sort().map(f => path.join(d, f)));
for (const full of fixtures) {
    const file = path.relative(__dirname, full);
    const text = fs.readFileSync(full, 'utf8');
    const { report } = smells.select(await smells.runAll(text, full, s), text, null, s);
    const actual = report.map(f => ({ smellId: f.smellId, line: f.line }));
    const expectedPath = full + '.expected.json';

    if (UPDATE) {
        fs.writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + '\n', 'utf8');
        process.stdout.write(`  ↻ ${file} (${actual.length} findings)\n`);
        continue;
    }

    const expected = fs.existsSync(expectedPath) ? JSON.parse(fs.readFileSync(expectedPath, 'utf8')) : null;
    if (file.startsWith('clean.') && actual.length) {
        process.stdout.write(`  ✗ ${file} must be clean, got:\n` +
            report.map(f => `      ${f.line} ${f.smellId}: ${f.message}\n`).join(''));
        fail++;
        continue;
    }
    if (!expected) {
        process.stdout.write(`  ✗ ${file}: missing ${path.basename(expectedPath)} (run with --update)\n`);
        fail++;
        continue;
    }
    const key = f => `${f.smellId}@${f.line}`;
    const want = new Set(expected.map(key));
    const got = new Set(actual.map(key));
    const missing = [...want].filter(k => !got.has(k));
    const extra = [...got].filter(k => !want.has(k));
    if (!missing.length && !extra.length) {
        process.stdout.write(`  ✔ ${file} (${actual.length} findings)\n`);
        pass++;
        continue;
    }
    process.stdout.write(`  ✗ ${file}\n` +
        missing.map(k => `      missing ${k}\n`).join('') +
        extra.map(k => {
            const f = report.find(r => key(r) === k);
            return `      extra   ${k} — ${f.message}\n`;
        }).join(''));
    fail++;
}

if (!UPDATE) process.stdout.write(`\nGolden tests (${PARSER}): ${pass} passed, ${fail} failed\n`);
}
