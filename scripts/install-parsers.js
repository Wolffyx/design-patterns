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
 * Supply chain: parsers.package.json + parsers.lock.json pin the exact
 * version and its sha512 integrity, `npm ci` refuses a tarball that does not
 * match, and --ignore-scripts keeps package lifecycle scripts from running.
 *
 *   node scripts/install-parsers.js                 # install to ~/.claude/design-patterns/parsers
 *   node scripts/install-parsers.js --dir <path>    # custom location (export DESIGN_PATTERNS_PARSERS_DIR to match)
 *   node scripts/install-parsers.js --check         # verify an existing install
 *   node scripts/install-parsers.js --uninstall
 *
 * DESIGN_PATTERNS_PARSERS_DIR overrides the default location for both this
 * script and the hooks. Install and uninstall only touch a directory that is
 * missing, empty, or a previous parser install (its package.json is named
 * "design-patterns-parsers"), so a mistyped --dir cannot wipe a project.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const tsScan = require('../hooks/_ts-scan');

const MANIFEST = path.join(__dirname, 'parsers.package.json');
const LOCKFILE = path.join(__dirname, 'parsers.lock.json');
const OWNER = require(MANIFEST).name;
const VERSION = require(MANIFEST).dependencies[tsScan.PKG];
const argv = process.argv.slice(2);
const flag = name => argv.includes(name);

function fail(message, code = 1) {
    console.error(`✗ ${message}`);
    process.exit(code);
}

const dirArg = flag('--dir') ? argv[argv.indexOf('--dir') + 1] : tsScan.defaultParserDir();
if (!dirArg || dirArg.startsWith('--')) fail('--dir needs a path', 2);
const dir = path.resolve(dirArg);

const SAMPLES = {
    ts: ['sample.ts', 'export function f(a: number) { if (a) { return 1; } return 0; }'],
    py: ['sample.py', 'def f(a):\n    if a:\n        return 1\n    return 0\n'],
    java: ['Sample.java', 'class A { int f(int a) { if (a > 0) { return 1; } return 0; } }'],
    cs: ['Sample.cs', 'class A { int F(int a) { if (a > 0) { return 1; } return 0; } }'],
    go: ['sample.go', 'package a\nfunc F(a int) int { if a > 0 { return 1 }; return 0 }\n'],
    cpp: ['sample.cpp', 'int f(int a) { if (a) { return 1; } return 0; }'],
    rust: ['sample.rs', 'fn f(a: i32) -> i32 { if a > 0 { return 1; } 0 }'],
};

/** May this script write into / delete `d`? Only when missing, empty, or one of our installs. */
function ownedDir(d) {
    let entries;
    try { entries = fs.readdirSync(d); } catch (e) { return e.code === 'ENOENT'; }
    if (!entries.length) return true;
    try { return JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).name === OWNER; } catch { return false; }
}

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
    fs.copyFileSync(MANIFEST, path.join(dir, 'package.json'));
    fs.copyFileSync(LOCKFILE, path.join(dir, 'package-lock.json'));
    console.log(`▸ installing ${tsScan.PKG}@${VERSION} into ${dir} (lockfile-pinned, install scripts off)`);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const res = spawnSync(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--omit=dev'], {
        cwd: dir,
        stdio: 'inherit',
    });
    return res.status === 0;
}

async function main() {
    const writes = !flag('--check');
    if (writes && !ownedDir(dir)) {
        fail(`refusing to touch ${dir}: it is not empty and not a parser install (package.json "name": "${OWNER}")`);
    }
    if (flag('--uninstall')) return uninstall();
    if (writes && !install()) fail('npm ci failed');
    console.log('▸ verifying grammars:');
    if (!(await check())) process.exit(1);
    const custom = flag('--dir') || process.env.DESIGN_PATTERNS_PARSERS_DIR;
    console.log('✔ tree-sitter parsers ready. With smells.parser "auto" (default) the hooks now use them.');
    if (custom) console.log(`  Custom location: export DESIGN_PATTERNS_PARSERS_DIR="${dir}" for Claude Code (project config cannot set it)`);
    return undefined;
}

main().catch(e => {
    console.error(`✗ ${e.stack || e}`);
    process.exit(1);
});
