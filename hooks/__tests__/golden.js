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
 *   node hooks/__tests__/golden.js            # verify
 *   node hooks/__tests__/golden.js --update   # rewrite expected files, then review the diff
 *
 * Runs the detectors in-process with default config and whole-file scope.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const smells = require('../_smells');

const DIR = path.join(__dirname, 'golden');
const UPDATE = process.argv.includes('--update');

const s = smells.mergeSmells({ scope: 'file' });
let pass = 0;
let fail = 0;

const fixtures = fs.readdirSync(DIR).filter(f => !f.endsWith('.expected.json')).sort();
for (const file of fixtures) {
    const full = path.join(DIR, file);
    const text = fs.readFileSync(full, 'utf8');
    const { report } = smells.select(smells.runAll(text, full, s), text, null, s);
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

if (!UPDATE) process.stdout.write(`\nGolden tests: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
