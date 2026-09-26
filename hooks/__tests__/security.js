#!/usr/bin/env node
/**
 * Security regression tests.
 *
 * A cloned repo controls its own .claude/pattern-check.config.json and can
 * ship symlinks, so neither may make the hooks run code or write outside
 * <project>/.claude/. The installers must only touch this plugin's own
 * settings.json entries, and the parser installer must only delete a parser
 * install.
 *
 *   node hooks/__tests__/security.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const shared = require('../_pattern-shared');
const io = require('../_io-calls');
const settingsHooks = require('../../scripts/settings-hooks');

const ROOT = path.resolve(__dirname, '..', '..');
const HOOKS = path.join(ROOT, 'hooks');
const BASE = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-security-')));
const EXAMPLE_PATH = path.join(ROOT, 'settings.example.json');
const EXAMPLE = JSON.parse(fs.readFileSync(EXAMPLE_PATH, 'utf8'));

let pass = 0;
let fail = 0;

function check(name, fn) {
    try {
        fn();
        process.stdout.write(`  ✔ ${name}\n`);
        pass++;
    } catch (e) {
        process.stdout.write(`  ✗ ${name}\n    ${e.message}\n`);
        fail++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

function put(dir, rel, content) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    return p;
}

/** A fresh project directory — the repo a user cloned — with an optional config. */
function project(name, config) {
    const dir = path.join(BASE, name);
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    if (config) put(dir, '.claude/pattern-check.config.json', JSON.stringify(config));
    return dir;
}

function runHook(dir, hookFile, payload) {
    return spawnSync('node', [path.join(HOOKS, hookFile)], {
        cwd: dir, input: JSON.stringify(payload), encoding: 'utf8', timeout: 10000,
    });
}

/** The path helpers resolve against process.cwd(). */
function inDir(dir, fn) {
    const prev = process.cwd();
    process.chdir(dir);
    try { return fn(); } finally { process.chdir(prev); }
}

function victim(name) {
    return put(BASE, name, 'safe\n');
}

const NESTED = 'export function f(o: any) {\n  if (o.a) {\n    if (o.b) { go(); }\n  }\n}\n';

/** Every hook that reads or writes a configured path, on one smelly new class. */
function runAllHooks(dir) {
    const file = put(dir, 'src/a.ts', NESTED);
    const transcript = put(dir, 'transcript.jsonl', JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Pattern check: Strategy (Tier 1) — applied — two concrete renderers behind one interface' }] },
    }) + '\n');
    const write = { session_id: 'sec', transcript_path: transcript, tool_name: 'Write' };
    const newClass = { file_path: path.join(dir, 'src/b.ts'), content: 'export class B {\n  run() {}\n}\n' };
    runHook(dir, 'pattern-context-prep.js', { ...write, tool_input: newClass });
    runHook(dir, 'check-pattern-preamble.js', { ...write, transcript_path: '', tool_input: newClass });
    runHook(dir, 'pattern-smell-gate.js', { ...write, tool_input: { file_path: file, content: NESTED } });
    runHook(dir, 'pattern-smell-detector.js', { ...write, tool_input: { file_path: file } });
    runHook(dir, 'log-pattern-decision.js', { ...write, tool_input: newClass });
}

// ------------------------------------------------------------------
// project config cannot load code
// ------------------------------------------------------------------
process.stdout.write('parser loading\n');

check('smells.parserPath in project config is ignored — no require() of repo code', () => {
    const dir = project('parser-path', { smells: { parser: 'tree-sitter', parserPath: 'evil' } });
    const pkg = 'evil/node_modules/@vscode/tree-sitter-wasm';
    put(dir, `${pkg}/package.json`, JSON.stringify({ name: '@vscode/tree-sitter-wasm', main: 'index.js' }));
    put(dir, `${pkg}/index.js`, "require('fs').writeFileSync('PWNED', 'x');\nmodule.exports = {};\n");
    runAllHooks(dir);
    assert(!fs.existsSync(path.join(dir, 'PWNED')), 'repo code ran through smells.parserPath');
});

// ------------------------------------------------------------------
// configured paths stay inside <project>/.claude/
// ------------------------------------------------------------------
process.stdout.write('config paths\n');

check('projectFile keeps paths inside <project>/.claude/', () => {
    const dir = project('confine');
    const outside = victim('confine-victim.txt');
    fs.symlinkSync(outside, path.join(dir, '.claude', 'link.jsonl'));
    fs.symlinkSync(path.join(BASE, 'missing.txt'), path.join(dir, '.claude', 'dangling.jsonl'));
    inDir(dir, () => {
        assert(shared.projectFile('.claude/pattern-smell-log.jsonl'), 'the default log path must be allowed');
        const refused = ['../confine-victim.txt', outside, '~/.bashrc', '.claude/../../x', '.claude/link.jsonl',
            '.claude/dangling.jsonl', '.claude', '', 42];
        refused.forEach(p => assert(shared.projectFile(p) === null, `${JSON.stringify(p)} must be refused`));
    });
});

check('a .claude directory that is a symlink out of the project is refused', () => {
    const dir = path.join(BASE, 'claude-link');
    const elsewhere = path.join(BASE, 'elsewhere');
    fs.mkdirSync(dir);
    fs.mkdirSync(elsewhere);
    fs.symlinkSync(elsewhere, path.join(dir, '.claude'));
    inDir(dir, () => assert(shared.projectFile('.claude/pattern-smell-log.jsonl') === null, 'followed .claude out of the project'));
});

check('session cache stays in <project>/.claude/ or ~/.claude/cache/', () => {
    inDir(project('cache'), () => {
        assert(shared.cacheFile('~/.claude/cache/pattern-family-session.json'), 'the default session cache must be allowed');
        assert(shared.cacheFile('.claude/session.json'), 'a project .claude/ cache must be allowed');
        ['~/.bashrc', '~/.claude/settings.json', '../x.json', '/etc/passwd']
            .forEach(p => assert(shared.cacheFile(p) === null, `${p} must be refused`));
    });
});

check('hooks write no log or cache outside .claude/ whatever the config says', () => {
    const target = victim('e2e-victim.txt');
    const rel = '../e2e-victim.txt';
    const dir = project('e2e', {
        log: { enabled: true, path: rel, smellLogPath: rel, blockStatsPath: rel },
        sessionCache: { enabled: true, path: target },
        smells: {
            severity: { 'nested-if': 'block' },
            crossFile: { enabled: true, cachePath: rel },
            nPlusOne: { crossFile: { cachePath: rel } },
        },
    });
    runAllHooks(dir);
    assert(fs.readFileSync(target, 'utf8') === 'safe\n', 'a hook wrote to a path outside .claude/');
});

check('symlinked default log and cache files are not followed', () => {
    const target = victim('link-victim.txt');
    const dir = project('e2e-links', { smells: { severity: { 'nested-if': 'block' } } });
    ['pattern-smell-log.jsonl', 'pattern-block-stats.jsonl', 'pattern-decision-log.jsonl']
        .forEach(name => fs.symlinkSync(target, path.join(dir, '.claude', name)));
    runAllHooks(dir);
    assert(fs.readFileSync(target, 'utf8') === 'safe\n', 'a hook followed a symlink out of .claude/');
});

// ------------------------------------------------------------------
// config regexes
// ------------------------------------------------------------------
process.stdout.write('config regexes\n');

check('backtracking-prone, invalid or oversized regexes are refused', () => {
    ['(a+)+', '(a+)+$', '(?:(ab)*)*', '((x|y)+)+', '(a*){2,}', '(', 'x'.repeat(501)]
        .forEach(src => assert(shared.configRegExp(src) === null, `${src.slice(0, 20)} must be refused`));
    ['(Factory|Adapter)', '\\bmyDb\\.query\\(', '(Query)+', '[(a+)]+', '(\\w+Repo)']
        .forEach(src => assert(shared.configRegExp(src), `${src} must compile`));
});

check('I/O matchers drop refused extraCallPatterns / dataAccessReceivers', () => {
    const m = io.buildMatchers({ extraCallPatterns: ['(a+)+$', '\\bmyDb\\.query\\('], dataAccessReceivers: '(a+)+' });
    assert(!m.high.source.includes('(a+)+') && m.high.source.includes('myDb'), `high: ${m.high.source}`);
    assert(!m.receiver.source.includes('(a+)+'), `receiver: ${m.receiver.source}`);
});

check('a catastrophic siblingNameRegex does not hang context prep', () => {
    const dir = project('redos', { contextPrep: { siblingNameRegex: '(a+)+$' } });
    put(dir, `src/${'a'.repeat(40)}!.ts`, 'export const x = 1;\n');
    const r = runHook(dir, 'pattern-context-prep.js', {
        tool_name: 'Write',
        tool_input: { file_path: path.join(dir, 'src/c.ts'), content: 'export class C {}\n' },
    });
    assert(!r.error && r.status === 0, `context prep hung or failed: ${r.error || r.stderr}`);
});

check('file extensions match literally (c++ does not throw)', () => {
    assert(shared.hasExtension('src/a.c++', ['c++']), 'c++ must match');
    assert(!shared.hasExtension('src/a.cxx', ['c++']), 'c++ must not act as a regex');
    assert(shared.hasExtension('src/A.TS', ['ts']), 'match is case-insensitive');
});

// ------------------------------------------------------------------
// settings.json: only our entries are added or removed
// ------------------------------------------------------------------
process.stdout.write('settings-hooks\n');

const HOME = '/home/tester';
const userGroup = (matcher, cmd) => ({ matcher, hooks: [{ type: 'command', command: cmd }] });
const OTHER = {
    hooks: {
        PreToolUse: [userGroup('Bash', '~/bin/guard.sh'), userGroup('Write', 'node ~/.claude/hooks/my-pattern-linter.js')],
        Stop: [userGroup('', 'notify-send done')],
    },
    model: 'x',
};

check('add keeps every other hook and setting, and is idempotent', () => {
    const once = settingsHooks.apply('add', OTHER, EXAMPLE, HOME);
    const twice = settingsHooks.apply('add', once, EXAMPLE, HOME);
    const text = JSON.stringify(once);
    assert(JSON.stringify(twice) === text, 're-running add must not duplicate entries');
    ['~/bin/guard.sh', 'my-pattern-linter.js', 'notify-send done'].forEach(c => assert(text.includes(c), `${c} was dropped`));
    assert(text.includes(`${HOME}/.claude/design-patterns/hooks/check-pattern-preamble.js`), 'our hook is missing');
    assert(once.model === 'x', 'other settings must be kept');
});

check('add replaces pre-1.1 entries under ~/.claude/hooks/', () => {
    const legacy = { hooks: { PreToolUse: [
        userGroup('Write', 'node "$HOME/.claude/hooks/check-pattern-preamble.js"'),
        userGroup('Write', `node "${HOME}/.claude/hooks/pattern-smell-gate.js"`),
    ] } };
    const text = JSON.stringify(settingsHooks.apply('add', legacy, EXAMPLE, HOME));
    assert(!text.includes('/.claude/hooks/'), `legacy entries must be replaced: ${text}`);
});

check('remove strips only our hooks', () => {
    const out = settingsHooks.apply('remove', settingsHooks.apply('add', OTHER, EXAMPLE, HOME), EXAMPLE, HOME);
    assert(JSON.stringify(out) === JSON.stringify(OTHER), `expected the original settings back; got ${JSON.stringify(out)}`);
});

check('CLI leaves an invalid settings.json untouched and exits 1', () => {
    const p = put(BASE, 'bad-settings.json', '{ not json');
    const r = spawnSync('node', [path.join(ROOT, 'scripts/settings-hooks.js'), 'add', p, EXAMPLE_PATH], { encoding: 'utf8' });
    assert(r.status === 1, `expected exit 1; got ${r.status}`);
    assert(fs.readFileSync(p, 'utf8') === '{ not json', 'invalid settings.json was rewritten');
});

// ------------------------------------------------------------------
// install.sh / uninstall.sh against a throwaway HOME
// ------------------------------------------------------------------
process.stdout.write('install.sh / uninstall.sh\n');

function sh(script, home) {
    return spawnSync('bash', [path.join(ROOT, script)], { env: { ...process.env, HOME: home }, encoding: 'utf8' });
}

check('install migrates a pre-1.1 install and keeps user hooks; uninstall reverses it', () => {
    const home = path.join(BASE, 'home');
    const claude = path.join(home, '.claude');
    fs.mkdirSync(claude, { recursive: true });
    fs.symlinkSync(HOOKS, path.join(claude, 'hooks'));
    put(claude, 'backups/design-patterns-20200101-000000/hooks/mine.sh', 'echo mine\n');
    put(claude, 'settings.json', JSON.stringify({ hooks: {
        PreToolUse: [userGroup('Bash', 'bash ~/.claude/hooks/mine.sh'),
            userGroup('Write', 'node "$HOME/.claude/hooks/check-pattern-preamble.js"')],
    } }));

    const inst = sh('install.sh', home);
    assert(inst.status === 0, `install.sh failed: ${inst.stderr}`);
    assert(fs.existsSync(path.join(claude, 'hooks', 'mine.sh')) && !fs.lstatSync(path.join(claude, 'hooks')).isSymbolicLink(),
        'the user\'s own ~/.claude/hooks must be restored');
    assert(fs.lstatSync(path.join(claude, 'design-patterns', 'hooks')).isSymbolicLink(), 'hooks link must move under design-patterns/');
    const installed = fs.readFileSync(path.join(claude, 'settings.json'), 'utf8');
    assert(installed.includes('~/.claude/hooks/mine.sh'), 'user hook dropped by install');
    assert(!installed.includes('/.claude/hooks/check-pattern-preamble.js'), 'legacy entry kept by install');
    assert(installed.includes('/.claude/design-patterns/hooks/check-pattern-preamble.js'), 'our entry missing');

    const uninst = sh('uninstall.sh', home);
    assert(uninst.status === 0, `uninstall.sh failed: ${uninst.stderr}`);
    const removed = fs.readFileSync(path.join(claude, 'settings.json'), 'utf8');
    assert(removed.includes('~/.claude/hooks/mine.sh'), 'user hook dropped by uninstall');
    assert(!removed.includes('design-patterns/hooks'), 'our entries kept by uninstall');
    assert(!fs.existsSync(path.join(claude, 'design-patterns', 'hooks')), 'hooks link kept by uninstall');
    assert(fs.existsSync(path.join(claude, 'hooks', 'mine.sh')), 'uninstall removed the user\'s hooks');
});

// ------------------------------------------------------------------
// install-parsers.js only deletes a parser install
// ------------------------------------------------------------------
process.stdout.write('install-parsers\n');

function parsers(...args) {
    return spawnSync('node', [path.join(ROOT, 'scripts/install-parsers.js'), ...args], { encoding: 'utf8' });
}

check('--uninstall refuses a directory that is not a parser install', () => {
    const d = path.join(BASE, 'not-parsers');
    put(d, 'keep.txt', 'x');
    const r = parsers('--uninstall', '--dir', d);
    assert(r.status === 1 && fs.existsSync(path.join(d, 'keep.txt')), `expected refusal; got ${r.status}: ${r.stderr}`);
});

check('--uninstall removes a parser install', () => {
    const d = path.join(BASE, 'old-parsers');
    put(d, 'package.json', JSON.stringify({ name: 'design-patterns-parsers', private: true }));
    const r = parsers('--uninstall', '--dir', d);
    assert(r.status === 0 && !fs.existsSync(d), `expected removal; got ${r.status}: ${r.stderr}`);
});

check('--dir without a value fails instead of guessing', () => {
    const r = parsers('--uninstall', '--dir');
    assert(r.status === 2, `expected exit 2; got ${r.status}`);
});

check('the lockfile pins the manifest version with an sha512 integrity', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/parsers.package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/parsers.lock.json'), 'utf8'));
    const [name, version] = Object.entries(manifest.dependencies)[0];
    const entry = lock.packages[`node_modules/${name}`] || {};
    assert(entry.version === version, `lock ${entry.version} ≠ manifest ${version}`);
    assert(/^sha512-/.test(entry.integrity || ''), 'lock entry has no sha512 integrity');
});

// ------------------------------------------------------------------
// teardown
// ------------------------------------------------------------------
fs.rmSync(BASE, { recursive: true, force: true });

process.stdout.write(`\nSecurity tests: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
