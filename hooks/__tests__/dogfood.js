#!/usr/bin/env node
/**
 * Dogfood: the hooks must follow the control-flow rules they enforce.
 *
 * Runs nested-if, deep-nesting and else-after-return over every hook, script
 * and test runner in this repo (JavaScript, read with the TypeScript rules)
 * and fails on any finding.
 *
 *   node hooks/__tests__/dogfood.js                        # regex backend
 *   node hooks/__tests__/dogfood.js --parser tree-sitter   # AST backend (also sees brace-less ifs)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const smells = require('../_smells');

const ROOT = path.resolve(__dirname, '..', '..');
const RULES = new Set(['nested-if', 'deep-nesting', 'else-after-return']);
const PARSER = process.argv.includes('--parser') ? process.argv[process.argv.indexOf('--parser') + 1] : 'regex';
const s = smells.mergeSmells({ scope: 'file', parser: PARSER });

const jsIn = dir => fs.readdirSync(path.join(ROOT, dir))
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(dir, f));
const FILES = [
    ...jsIn('hooks'),
    ...jsIn('hooks/__tests__'),
    ...jsIn('scripts'),
    'skills/design-patterns/build-antisignals.js',
];

async function main() {
    const findings = [];
    for (const rel of FILES) {
        const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        // read as TypeScript: same control-flow grammar
        const asTs = path.join(ROOT, rel.replace(/\.js$/, '.ts'));
        const { report } = smells.select(await smells.runAll(text, asTs, s), text, null, s);
        report.filter(f => RULES.has(f.smellId)).forEach(f => findings.push(`${rel}:${f.line} ${f.smellId} — ${f.message}`));
    }
    for (const f of findings) process.stdout.write(`  ✗ ${f}\n`);
    process.stdout.write(`\nDogfood (${PARSER}): ${FILES.length} files, ${findings.length} control-flow findings\n`);
    return findings.length;
}

main().then(n => process.exit(n === 0 ? 0 : 1), e => {
    process.stdout.write(`  ✗ ${e.stack || e}\n`);
    process.exit(1);
});
