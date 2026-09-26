#!/usr/bin/env node
/**
 * Cross-file N+1 tests: a small project per language where the loop and the
 * query live in different files (service layers, namespaces, same-package
 * helpers, #include, `use crate::`).
 *
 *   hooks/__tests__/crossfile/<lang>/…   fixture project
 *   hooks/__tests__/crossfile.expected.json  { lang: { entry, findings: ["<line> <via>"] } }
 *
 * Each project is copied to a temp sandbox (the indexer writes caches under
 * the project root) and the entry file is scanned from there. The last case
 * checks the disk cache is invalidated when a dependency changes.
 *
 *   node hooks/__tests__/crossfile.js                        # verify (regex backend for the entry file)
 *   node hooks/__tests__/crossfile.js --parser tree-sitter   # same expectations on the AST backend
 *   node hooks/__tests__/crossfile.js --update               # rewrite the expected file, then review the diff
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const smells = require('../_smells');

const SRC = path.join(__dirname, 'crossfile');
const EXPECTED = path.join(__dirname, 'crossfile.expected.json');
const UPDATE = process.argv.includes('--update');
const PARSER = process.argv.includes('--parser') ? process.argv[process.argv.indexOf('--parser') + 1] : 'regex';
const ENTRY = {
    ts: 'src/report.ts',
    py: 'app/report.py',
    go: 'report/report.go',
    java: 'src/main/java/com/shop/report/ReportService.java',
    cs: 'Reports/ReportService.cs',
    rust: 'src/report.rs',
    cpp: 'report.cpp',
};

const box = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-crossfile-'));
fs.cpSync(SRC, box, { recursive: true });
const s = smells.mergeSmells({ scope: 'file', parser: PARSER });
let pass = 0;
let fail = 0;

/** "<line> <file:line of the real round-trip>" for every n-plus-one finding in the entry file. */
async function findingsFor(lang) {
    const root = path.join(box, lang);
    process.chdir(root);
    const full = path.join(root, ENTRY[lang]);
    const text = fs.readFileSync(full, 'utf8');
    const { report } = smells.select(await smells.runAll(text, full, s), text, null, s);
    return report
        .filter(f => f.smellId === 'n-plus-one')
        .map(f => `${f.line} ${(/, ([^,)]+:\d+)\)/.exec(f.message) || [])[1] || 'same-file'}`);
}

function check(name, ok, detail) {
    process.stdout.write(`  ${ok ? '✔' : '✗'} ${name}${ok ? '' : `\n${detail}`}\n`);
    if (ok) pass++;
    else fail++;
}

async function cacheInvalidation() {
    const store = path.join(box, 'ts', 'src', 'user-store.ts');
    const before = await findingsFor('ts');
    fs.writeFileSync(store, fs.readFileSync(store, 'utf8').replace(/this\.prisma\.user\.findUnique\([^)]*\)\)?/, 'Promise.resolve({ id })'));
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(store, later, later);
    const after = await findingsFor('ts');
    const gone = before.some(f => f.includes('user-store.ts')) && !after.some(f => f.includes('user-store.ts'));
    check('ts: disk cache drops the finding once the dependency stops querying', gone,
        `      before: ${before.join(' | ')}\n      after:  ${after.join(' | ')}`);
}

async function main() {
    const expected = fs.existsSync(EXPECTED) ? JSON.parse(fs.readFileSync(EXPECTED, 'utf8')) : {};
    const actual = {};
    for (const lang of Object.keys(ENTRY)) {
        actual[lang] = { entry: ENTRY[lang], findings: await findingsFor(lang) };
    }
    if (UPDATE) {
        fs.writeFileSync(EXPECTED, JSON.stringify(actual, null, 2) + '\n', 'utf8');
        process.stdout.write(`  ↻ wrote ${path.basename(EXPECTED)}\n`);
        return;
    }
    for (const [lang, { findings }] of Object.entries(actual)) {
        const want = ((expected[lang] || {}).findings || []).slice().sort();
        const got = findings.slice().sort();
        check(`${lang}: ${got.length} cross-file finding(s)`, JSON.stringify(want) === JSON.stringify(got),
            `      expected: ${want.join(' | ')}\n      actual:   ${got.join(' | ')}`);
    }
    await cacheInvalidation();
    process.stdout.write(`\nCross-file tests (${PARSER}): ${pass} passed, ${fail} failed\n`);
}

main()
    .catch(e => { process.stdout.write(`  ✗ ${e.stack || e}\n`); fail++; })
    .finally(() => {
        process.chdir(__dirname);
        fs.rmSync(box, { recursive: true, force: true });
        process.exit(fail === 0 ? 0 : 1);
    });
