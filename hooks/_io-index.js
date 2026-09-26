/**
 * _io-index.js — cross-file I/O knowledge for the N+1 detector.
 *
 * A loop that calls `userService.getUser(id)` is an N+1 when `getUser` (in
 * another file) runs a query. This module answers "which names visible in
 * this file do I/O?":
 *
 *   functions   imported functions (`import { loadUser } from './users'`,
 *               `from app.users import load_user`, `use crate::users::load`),
 *               Go same-package functions, C++ functions behind `#include`
 *   receivers   namespaces (`import * as users`, Go packages, Python modules,
 *               Rust modules) and typed fields / params of injected classes
 *               (`private userService: UserService`, `private final UserService
 *               svc;`, `self.users = UserService()`, Go struct fields, …)
 *               → the methods of that type that do I/O
 *
 * Each resolved file is indexed with the same evidence as the edited file
 * (_io-calls.js), transitively up to `crossFile.maxDepth` files deep, within
 * `crossFile.timeBudgetMs`. Indexes are cached on disk
 * (`crossFile.cachePath`) and reused while the file and its dependencies keep
 * their mtimes.
 *
 * Resolution is static and best-effort: relative / module-path imports and
 * class-name lookups, no type inference, no tsconfig path aliases.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const langs = require('./_languages');
const shared = require('./_pattern-shared');
const { scanBlocks, extractFunctions, extractClasses, maskCode } = require('./_code-scan');
const { localIoFunctions } = require('./_io-calls');

const EMPTY_INDEX = Object.freeze({ functions: new Map(), classes: new Map() });
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', 'vendor', '.venv', 'venv',
    '__pycache__', 'bin', 'obj', 'out', '.next', 'coverage', '.claude', '.parsers', '.idea', '.vscode']);
const FILE_INDEX_TTL_MS = 10 * 60 * 1000;
const FILE_INDEX_MAX = 30000;

// --- fs helpers -----------------------------------------------------------------

function isFile(p) {
    try { return fs.statSync(p).isFile(); } catch { return false; }
}

function mtimeOf(p) {
    try { return fs.statSync(p).mtimeMs; } catch { return -1; }
}

function readText(p) {
    if (!p) return '';
    try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function listDir(dir) {
    try { return fs.readdirSync(dir); } catch { return []; }
}

const firstFile = candidates => candidates.find(isFile) || null;
const relOf = (ctx, file) => path.relative(ctx.root, file).replace(/\\/g, '/');
const overBudget = ctx => Date.now() > ctx.deadline;

/** Nearest ancestor of `start` (inclusive) containing `marker`, up to the project root. */
function ancestorWith(ctx, start, marker) {
    let dir = start;
    while (dir.startsWith(ctx.root)) {
        if (isFile(path.join(dir, marker))) return dir;
        const up = path.dirname(dir);
        if (up === dir) break;
        dir = up;
    }
    return null;
}

// --- project file index (class-name lookups for Java / C# / C++) ----------------------

function fileIndex(ctx) {
    if (ctx.files) return ctx.files;
    const cachePath = shared.projectFile('.claude/cache/pattern-file-index.json');
    let cached = null;
    try { cached = JSON.parse(readText(cachePath) || 'null'); } catch { cached = null; }
    const fresh = cached && cached.root === ctx.root && Date.now() - cached.ts < FILE_INDEX_TTL_MS;
    const files = fresh ? cached.files : walkFiles(ctx);
    if (!fresh) writeJson(cachePath, { ts: Date.now(), root: ctx.root, files });
    ctx.files = new Map();
    for (const rel of files) {
        const base = path.basename(rel);
        ctx.files.set(base, (ctx.files.get(base) || []).concat(path.join(ctx.root, rel)));
    }
    return ctx.files;
}

function walkFiles(ctx) {
    const out = [];
    const stack = [ctx.root];
    while (stack.length && out.length < FILE_INDEX_MAX && !overBudget(ctx)) visitDir(ctx, stack.pop(), stack, out);
    return out.filter(f => isFile(path.join(ctx.root, f)));
}

function visitDir(ctx, dir, stack, out) {
    for (const name of listDir(dir)) {
        const full = path.join(dir, name);
        const isDir = !name.includes('.') || fs.statSync(full, { throwIfNoEntry: false })?.isDirectory();
        if (isDir && !SKIP_DIRS.has(name)) stack.push(full);
        else if (!isDir && langs.langIdForFile(name)) out.push(relOf(ctx, full));
    }
}

function writeJson(p, data) {
    if (!p) return;
    try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(data), 'utf8');
    } catch {
        // a cache is an optimisation — never fail the hook over it
    }
}

// --- import bindings per language ----------------------------------------------------
//
// A binding: { local, imported, kind, files }
//   kind 'function'  → idx.functions.get(imported)
//   kind 'class'     → idx.classes.get(imported)
//   kind 'any'       → whichever of the two exists (TS / Python named imports)
//   kind 'namespace' → receiver `local` → every I/O function of the files
//   kind 'package'   → merge every function + class into this file's scope (Go, C++)

const TS_EXTS = ['', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

function tsBindings(ctx, text, file) {
    const out = [];
    const src = maskCode(text, 'ts', true);
    const re = /\bimport\s+(?:type\s+)?([^'";]*?)\s+from\s+['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const target = firstFile(TS_EXTS.map(e => path.resolve(path.dirname(file), m[2]) + e));
        if (target) tsClause(m[1], target, out);
    }
    const req = /\b(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    while ((m = req.exec(src)) !== null) {
        const target = firstFile(TS_EXTS.map(e => path.resolve(path.dirname(file), m[2]) + e));
        const clause = m[1].startsWith('{') ? m[1].replace(/:/g, ' as ') : `* as ${m[1]}`;
        if (target) tsClause(clause, target, out);
    }
    return out;
}

function tsClause(clause, target, out) {
    const ns = /\*\s*as\s+([A-Za-z_$][\w$]*)/.exec(clause);
    if (ns) out.push({ local: ns[1], imported: '*', kind: 'namespace', files: [target] });
    const named = /\{([^}]*)\}/.exec(clause);
    for (const part of named ? named[1].split(',') : []) {
        const [imported, local] = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).map(x => x && x.trim());
        if (imported) out.push({ local: local || imported, imported, kind: 'any', files: [target] });
    }
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause.trim());
    // default export: resolved by the local name (usually matches the exported one)
    if (def) out.push({ local: def[1], imported: def[1], kind: 'any', files: [target] });
}

function pyModuleFile(ctx, fromFile, mod) {
    const dots = (/^\.+/.exec(mod) || [''])[0].length;
    const parts = mod.slice(dots).split('.').filter(Boolean);
    let relBase = path.dirname(fromFile);
    for (let k = 1; k < dots; k++) relBase = path.dirname(relBase);
    const pkgRoot = path.dirname(ancestorWith(ctx, path.dirname(fromFile), '__init__.py') || fromFile);
    const bases = dots ? [relBase] : [ctx.root, path.join(ctx.root, 'src'), pkgRoot, path.dirname(fromFile)];
    for (const base of bases) {
        const p = path.join(base, ...parts);
        const hit = firstFile([p + '.py', path.join(p, '__init__.py')]);
        if (hit) return hit;
    }
    return null;
}

function pyBindings(ctx, text, file) {
    const out = [];
    const src = maskCode(text, 'py', true).replace(/\(\s*([^)]*?)\s*\)/g, (_, inner) => inner.replace(/\s+/g, ' '));
    for (const m of src.matchAll(/^\s*from\s+([.\w]+)\s+import\s+(.+)$/gm)) out.push(...pyFromImport(ctx, file, m[1], m[2]));
    const imp = /^\s*import\s+([\w.]+)(?:\s+as\s+(\w+))?\s*$/gm;
    let m;
    while ((m = imp.exec(src)) !== null) {
        const target = pyModuleFile(ctx, file, m[1]);
        if (target) out.push({ local: m[2] || m[1].split('.').pop(), imported: '*', kind: 'namespace', files: [target] });
    }
    return out;
}

/** `from mod import a, b as c`: each name is a submodule (namespace) or a member (any). */
function pyFromImport(ctx, file, mod, names) {
    return names.split(',')
        .map(part => part.trim().split(/\s+as\s+/).map(x => x && x.trim()))
        .filter(([imported]) => imported && imported !== '*')
        .map(([imported, local]) => {
            const asModule = pyModuleFile(ctx, file, `${mod}${mod.endsWith('.') ? '' : '.'}${imported}`);
            const target = asModule || pyModuleFile(ctx, file, mod);
            return target && { local: local || imported, imported, kind: asModule ? 'namespace' : 'any', files: [target] };
        })
        .filter(Boolean);
}

function goPackageFiles(dir, exclude) {
    return listDir(dir)
        .filter(n => n.endsWith('.go') && !n.endsWith('_test.go'))
        .map(n => path.join(dir, n))
        .filter(f => f !== exclude);
}

function goBindings(ctx, text, file) {
    const out = [{ local: '', imported: '*', kind: 'package', files: goPackageFiles(path.dirname(file), file) }];
    const modDir = ancestorWith(ctx, path.dirname(file), 'go.mod');
    const modName = modDir ? (/^\s*module\s+(\S+)/m.exec(readText(path.join(modDir, 'go.mod'))) || [])[1] : null;
    if (!modName) return out;
    const src = maskCode(text, 'go', true);
    const block = (/\bimport\s*\(([^)]*)\)/.exec(src) || [])[1] || '';
    const lines = block.split('\n').concat((src.match(/^\s*import\s+[^(\n]+$/gm) || []).map(l => l.replace(/^\s*import\s+/, '')));
    for (const line of lines) {
        const m = /^\s*(?:([\w.]+)\s+)?"([^"]+)"/.exec(line);
        if (!m || !m[2].startsWith(modName + '/')) continue;
        const dir = path.join(modDir, m[2].slice(modName.length + 1));
        out.push({ local: m[1] || m[2].split('/').pop(), imported: '*', kind: 'namespace', files: goPackageFiles(dir, null) });
    }
    return out;
}

function javaBindings(ctx, text) {
    const out = [];
    const re = /^\s*import\s+(?!static)([\w.]+)\.([A-Z]\w*)\s*;/gm;
    let m;
    while ((m = re.exec(maskCode(text, 'java', true))) !== null) {
        const suffix = path.join(...m[1].split('.'), `${m[2]}.java`);
        const files = (fileIndex(ctx).get(`${m[2]}.java`) || []).filter(f => f.endsWith(suffix));
        if (files.length) out.push({ local: m[2], imported: m[2], kind: 'class', files: [files[0]] });
    }
    return out;
}

function rustModuleFile(srcDir, segs) {
    const p = path.join(srcDir, ...segs);
    return firstFile([p + '.rs', path.join(p, 'mod.rs')]);
}

function rustBindings(ctx, text, file) {
    const out = [];
    const crate = ancestorWith(ctx, path.dirname(file), 'Cargo.toml');
    if (!crate) return out;
    const srcDir = path.join(crate, 'src');
    const src = maskCode(text, 'rust', true);
    const re = /^\s*(?:pub\s+)?use\s+(crate|super|self)::([\w:]+?)(?:::\{([^}]*)\})?\s*;/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
        const base = m[1] === 'crate' ? [] : path.relative(srcDir, path.dirname(file)).split(path.sep).filter(Boolean);
        const segs = base.concat(m[2].split('::'));
        const items = m[3] ? m[3].split(',').map(x => x.trim()).filter(Boolean) : [segs.pop()];
        out.push(...rustUseItems(srcDir, segs, items));
    }
    return out;
}

/** `use a::b::{c, d as e}`: each item is a module (namespace) or an item of `a::b` (any). */
function rustUseItems(srcDir, segs, items) {
    const moduleFile = rustModuleFile(srcDir, segs);
    return items
        .map(item => item.split(/\s+as\s+/).map(x => x.trim()))
        .map(([imported, local]) => {
            const asModule = rustModuleFile(srcDir, segs.concat(imported));
            const target = asModule || moduleFile;
            return target && { local: local || imported, imported, kind: asModule ? 'namespace' : 'any', files: [target] };
        })
        .filter(Boolean);
}

function cppBindings(ctx, text, file) {
    const files = [];
    const re = /^\s*#\s*include\s*"([^"]+)"/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
        const header = path.resolve(path.dirname(file), m[1]);
        const stem = header.replace(/\.(h|hh|hpp|hxx)$/, '');
        files.push(...['.cpp', '.cc', '.cxx', '.h', '.hpp'].map(e => stem + e).filter(isFile));
    }
    return files.length ? [{ local: '', imported: '*', kind: 'package', files }] : [];
}

const BINDINGS = {
    ts: tsBindings,
    py: pyBindings,
    go: goBindings,
    java: javaBindings,
    cs: () => [], // C# `using` names namespaces, not files: types resolve by class name
    rust: rustBindings,
    cpp: cppBindings,
};

// --- typed receivers: `this.users` is a UserService --------------------------------------

const RECEIVER_DECLS = {
    ts: [
        [/\b(?:private|public|protected|readonly)\s+(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[?!]?\s*:\s*([A-Z]\w*)/g, m => [m[1], m[2]]],
        [/\b([A-Za-z_$][\w$]*)\s*[?!]?\s*:\s*([A-Z]\w*)\s*[;,)=]/g, m => [m[1], m[2]]],
        [/\b([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Z]\w*)\s*\(/g, m => [m[1], m[2]]],
    ],
    py: [
        [/\bself\.(\w+)\s*(?::\s*([A-Z]\w*))?\s*=\s*([A-Z]\w*)?/g, m => [m[1], m[2] || m[3]]],
        [/\b(\w+)\s*:\s*([A-Z]\w*)/g, m => [m[1], m[2]]],
    ],
    java: [[/\b([A-Z]\w*)(?:<[^<>]*>)?\s+([a-z_]\w*)\s*[;=),]/g, m => [m[2], m[1]]]],
    cs: [[/\b(I?[A-Z]\w*)(?:<[^<>]*>)?\??\s+(_?[a-zA-Z]\w*)\s*[;=),]/g, m => [m[2], m[1]]]],
    go: [[/^\s*([a-z_]\w*)\s+\*?((?:\w+\.)?[A-Z]\w*)\s*$/gm, m => [m[1], m[2]]]],
    rust: [[/\b([a-z_]\w*)\s*:\s*&?(?:mut\s+)?(?:Arc<|Rc<|Box<)?([A-Z]\w*)/g, m => [m[1], m[2]]]],
    cpp: [
        [/\b([A-Z]\w*)\s*[*&]?\s+([a-z_]\w*)\s*[;=]/g, m => [m[2], m[1]]],
        [/<\s*([A-Z]\w*)\s*>\s+([a-z_]\w*)\s*[;=]/g, m => [m[2], m[1]]],
    ],
};

function receiverTypes(scan) {
    const out = new Map();
    const decls = (RECEIVER_DECLS[scan.langId] || []).flatMap(([re, pick]) => [...scan.masked.matchAll(re)].map(pick));
    for (const [name, type] of decls) {
        if (name && type && !out.has(name)) out.set(name, type);
    }
    return out;
}

// Types with no import (same Java package, any C# namespace, C++ headers): find by file name.
const TYPE_FILE = {
    java: (ctx, file, type) => firstFile([path.join(path.dirname(file), `${type}.java`)]) ||
        (fileIndex(ctx).get(`${type}.java`) || [])[0],
    cs: (ctx, file, type) => (fileIndex(ctx).get(`${type}.cs`) || fileIndex(ctx).get(`${type.replace(/^I(?=[A-Z])/, '')}.cs`) || [])[0],
    cpp: (ctx, file, type) => ['.cpp', '.cc', '.cxx'].map(e => (fileIndex(ctx).get(`${type}${e}`) || [])[0]).find(Boolean),
};

function resolveType(ctx, scope, file, type, depth) {
    const [ns, name] = type.includes('.') ? type.split('.') : [null, type];
    const fromNs = ns && scope.namespaces.get(ns);
    if (fromNs) return fromNs.classes.get(name) || null;
    const bound = scope.classes.get(type);
    if (bound) return bound;
    const locate = TYPE_FILE[scope.langId];
    const target = locate && locate(ctx, file, type);
    if (!target || target === file) return null;
    const idx = indexFile(ctx, target, depth);
    return idx.classes.get(type) || idx.classes.get(type.replace(/^I(?=[A-Z])/, '')) || null;
}

// --- per-file index ------------------------------------------------------------------

function mergeIndexes(list) {
    const functions = new Map();
    const classes = new Map();
    for (const idx of list) {
        idx.functions.forEach((v, k) => functions.set(k, v));
        idx.classes.forEach((v, k) => classes.set(k, new Map([...(classes.get(k) || []), ...v])));
    }
    return { functions, classes };
}

const APPLY = {
    function: (b, idx, scope) => setIf(scope.known.functions, b.local, idx.functions.get(b.imported)),
    class: (b, idx, scope) => setIf(scope.classes, b.local, idx.classes.get(b.imported)),
    any: (b, idx, scope) => {
        setIf(scope.known.functions, b.local, idx.functions.get(b.imported));
        setIf(scope.classes, b.local, idx.classes.get(b.imported));
    },
    namespace: (b, idx, scope) => {
        scope.namespaces.set(b.local, idx);
        setIf(scope.known.receivers, b.local, idx.functions.size ? idx.functions : null);
    },
    package: (b, idx, scope) => {
        idx.functions.forEach((v, k) => scope.known.functions.set(k, v));
        idx.classes.forEach((v, k) => scope.classes.set(k, v));
    },
};

function setIf(map, key, value) {
    if (key && value) map.set(key, value);
}

/** { functions, receivers } visible in `scan` of `file`, resolved from other files. */
function knownFor(ctx, scan, file, depth) {
    const known = { functions: new Map(), receivers: new Map() };
    if (depth > ctx.maxDepth || overBudget(ctx)) return known;
    const scope = { langId: scan.langId, known, classes: new Map(), namespaces: new Map() };
    for (const b of (BINDINGS[scan.langId] || (() => []))(ctx, scan.text, file)) {
        APPLY[b.kind](b, mergeIndexes(b.files.map(f => indexFile(ctx, f, depth))), scope);
    }
    for (const [recv, type] of receiverTypes(scan)) {
        setIf(known.receivers, recv, resolveType(ctx, scope, file, type, depth));
    }
    return known;
}

function serialize(idx, deps) {
    return {
        functions: [...idx.functions],
        classes: [...idx.classes].map(([k, v]) => [k, [...v]]),
        deps,
    };
}

function fromDisk(ctx, file) {
    const hit = ctx.disk.entries[relOf(ctx, file)];
    const valid = hit && hit.mtime === mtimeOf(file) &&
        Object.entries(hit.deps || {}).every(([f, t]) => mtimeOf(path.join(ctx.root, f)) === t);
    if (!valid) return null;
    return {
        functions: new Map(hit.functions),
        classes: new Map(hit.classes.map(([k, v]) => [k, new Map(v)])),
        deps: hit.deps || {},
    };
}

/** Which functions / class methods of `file` do I/O (memoised, disk-cached). */
function indexFile(ctx, file, depth) {
    const rel = relOf(ctx, file);
    for (const deps of ctx.stack) deps[rel] = mtimeOf(file);
    const memo = ctx.memo.get(file) || fromDisk(ctx, file);
    if (memo) {
        ctx.memo.set(file, memo);
        for (const deps of ctx.stack) Object.assign(deps, memo.deps || {});
        return memo;
    }
    const text = readText(file);
    const langId = langs.langIdForFile(file);
    if (!text || !langId || ctx.visiting.has(file) || overBudget(ctx)) return EMPTY_INDEX;

    ctx.visiting.add(file);
    const deps = {};
    ctx.stack.push(deps);
    const scan = scanBlocks(text, langId);
    const fns = extractFunctions(scan);
    const classes = extractClasses(scan, fns);
    const io = localIoFunctions(scan, fns, ctx.matchers, knownFor(ctx, scan, file, depth + 1));
    ctx.stack.pop();
    ctx.visiting.delete(file);

    for (const info of io.values()) info.file = info.file || rel;
    const idx = {
        functions: new Map(fns.filter(f => !f.className && io.has(f.name)).map(f => [f.name, io.get(f.name)])),
        classes: new Map(classes
            .map(c => [c.name, new Map(c.methods.map(m => m.name.split('::').pop()).filter(n => io.has(n)).map(n => [n, io.get(n)]))])
            .filter(([, methods]) => methods.size)),
        deps,
    };
    ctx.memo.set(file, idx);
    ctx.disk.entries[rel] = { mtime: mtimeOf(file), ...serialize(idx, deps) };
    ctx.dirty = true;
    return idx;
}

// --- entry point ---------------------------------------------------------------------

/**
 * Names in the edited file that do I/O somewhere else.
 * @param {object} scan      scan of the edited file
 * @param {string} filePath  the edited file
 * @param {object} cfg       merged smells.nPlusOne config (uses cfg.crossFile)
 * @param {object} matchers  _io-calls.buildMatchers(cfg)
 * @returns {{ functions: Map, receivers: Map }}
 */
function crossFileIo(scan, filePath, cfg, matchers) {
    const opts = { maxDepth: 2, timeBudgetMs: 400, cachePath: '.claude/cache/pattern-io-index.json', ...(cfg.crossFile || {}) };
    const root = path.resolve(process.cwd());
    const file = path.resolve(filePath);
    // null when the configured path leaves <project>/.claude/ — the cache is then skipped
    const cachePath = shared.projectFile(opts.cachePath);
    let disk = null;
    try { disk = JSON.parse(readText(cachePath) || 'null'); } catch { disk = null; }
    const ctx = {
        root,
        deadline: Date.now() + opts.timeBudgetMs,
        maxDepth: opts.maxDepth,
        matchers,
        memo: new Map(),
        visiting: new Set([file]),
        stack: [],
        disk: disk && disk.version === 1 ? disk : { version: 1, entries: {} },
        dirty: false,
    };
    try {
        const known = knownFor(ctx, scan, file, 1);
        if (ctx.dirty) writeJson(cachePath, ctx.disk);
        return known;
    } catch {
        return { functions: new Map(), receivers: new Map() };
    }
}

module.exports = { crossFileIo, receiverTypes };
