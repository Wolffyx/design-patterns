#!/usr/bin/env node
/**
 * Install (or remove) the optional tree-sitter parsers used by the smell
 * detectors (hooks/_ts-scan.js). Without them the hooks use regex scanning;
 * with them, `smells.parser: "auto"` (the default) switches to real syntax
 * trees: exact masking, brace-less bodies, exact function boundaries.
 *
 * One package, `@vscode/tree-sitter-wasm`: the web-tree-sitter runtime plus
 * prebuilt WASM grammars for all seven supported languages. No native build,
 * ~22 MB. It is installed OUTSIDE the plugin directory, so plugin updates
 * don't wipe it and the plugin itself stays dependency-free.
 *
 *   node scripts/install-parsers.js                 # install to ~/.claude/design-patterns/parsers
 *   node scripts/install-parsers.js --dir <path>    # custom location (set smells.parserPath to match)
 *   node scripts/install-parsers.js --check         # verify an existing install
 *   node scripts/install-parsers.js --uninstall
 *
 * DESIGN_PATTERNS_PARSERS_DIR overrides the default location for both this
 * script and the hooks.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const tsScan = require('../hooks/_ts-scan');

const VERSION = '0.3.1';
const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const dir = path.resolve(flag('--dir') ? argv[argv.indexOf('--dir') + 1] : tsScan.defaultParserDir());

const SAMPLES = {
    ts: ['sample.ts', 'export function f(a: number) { if (a) { return 1; } return 0; }'],
    py: ['sample.py', 'def f(a):\n    if a:\n        return 1\n    return 0\n'],
    java: ['Sample.java', 'class A { int f(int a) { if (a > 0) { return 1; } return 0; } }'],
    cs: ['Sample.cs', 'class A { int F(int a) { if (a > 0) { return 1; } return 0; } }'],
    go: ['sample.go', 'package a\nfunc F(a int) int { if a > 0 { return 1 }; return 0 }\n'],
    cpp: ['sample.cpp', 'int f(int a) { if (a) { return 1; } return 0; }'],
    rust: ['sample.rs', 'fn f(a: i32) -> i32 { if a > 0 { return 1; } 0 }'],
};

async function check() {
    if (!tsScan.available(dir)) {
        console.error(`✗ parsers not found in ${dir}`);
        return false;
    }
    let ok = true;
    for (const [langId, [file, code]] of Object.entries(SAMPLES)) {
        const scan = await tsScan.scan(code, langId, file, dir);
        const good = Boolean(scan && scan.fns.length === 1 && scan.entries.some(e => e.kind === 'if'));
        console.log(`  ${good ? '✔' : '✗'} ${langId}`);
        ok = ok && good;
    }
    return ok;
}

function uninstall() {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`✔ removed ${dir} — the hooks fall back to regex scanning`);
}

function install() {
    fs.mkdirSync(dir, { recursive: true });
    const pkg = path.join(dir, 'package.json');
    if (!fs.existsSync(pkg)) {
        fs.writeFileSync(pkg, JSON.stringify({ name: 'design-patterns-parsers', private: true }, null, 2) + '\n');
    }
    console.log(`▸ installing ${tsScan.PKG}@${VERSION} into ${dir}`);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const res = spawnSync(npm, ['install', '--no-audit', '--no-fund', '--omit=dev', `${tsScan.PKG}@${VERSION}`], {
        cwd: dir,
        stdio: 'inherit',
    });
    return res.status === 0;
}

async function main() {
    if (flag('--uninstall')) return uninstall();
    if (!flag('--check') && !install()) {
        console.error('✗ npm install failed');
        process.exit(1);
    }
    console.log('▸ verifying grammars:');
    if (!(await check())) process.exit(1);
    const custom = flag('--dir') || process.env.DESIGN_PATTERNS_PARSERS_DIR;
    console.log('✔ tree-sitter parsers ready. With smells.parser "auto" (default) the hooks now use them.');
    if (custom) console.log(`  Custom location: set "smells": { "parserPath": "${dir}" } in .claude/pattern-check.config.json`);
    return undefined;
}

main().catch(e => {
    console.error(`✗ ${e.stack || e}`);
    process.exit(1);
});
