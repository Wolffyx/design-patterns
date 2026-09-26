/**
 * _function-smells.js — per-function smells, all seven languages.
 *
 *   long-function        body > maxFunctionLines non-blank lines      → extract
 *   long-param-list      > maxParams parameters (non-constructors)    → parameter object
 *   long-constructor     ≥ constructorMaxParams ctor parameters       → Builder / options
 *   boolean-flag-param   a bool parameter that switches behavior      → two functions / enum
 *   complexity           cyclomatic complexity > maxComplexity        → split, guard clauses
 *   swallowed-exception  empty catch / `except: pass` / empty
 *                        `if err != nil {}` / `Err(_) => {}`          → handle, log or rethrow
 *
 * Constructors: `constructor`, `__init__`, class-named methods (Java / C# /
 * C++), `Foo::Foo`, Rust `new`, Go `NewX` — see _code-scan.isConstructor.
 */

'use strict';

const {
    lineOf, extractFunctions, extractClasses, isConstructor, bodyText, bodyLineRange,
} = require('./_code-scan');

const SETTER_RE = /^(?:[Ss]et|[Ww]ith|[Tt]oggle|[Ee]nable|[Dd]isable|[Ii]s|[Hh]as|[Ss]hould|[Cc]an|[Uu]se)(?:[A-Z_]|$)/;

const BOOL_PARAM = {
    ts: /^(?:(?:public|private|protected|readonly)\s+)*[\w$]+\??\s*:\s*boolean\b/,
    py: /:\s*bool\b|=\s*(?:True|False)\s*$/,
    java: /\bboolean\s+\w+$/,
    cs: /\bbool\??\s+\w+(?:\s*=.*)?$/,
    cpp: /\bbool\s*&?\s*\w+(?:\s*=.*)?$/,
    go: /\bbool$/,
    rust: /:\s*bool\b/,
};

const DECISIONS = {
    py: /\b(?:if|elif|for|while|except|and|or|case)\b/g,
    rust: /\b(?:if|for|while|loop)\b|=>|&&|\|\|/g,
    default: /\b(?:if|for|foreach|while|case|catch)\b|&&|\|\||\s\?\s/g,
};

function bodyLineCount(scan, fn) {
    const [a, b] = bodyLineRange(scan, fn.entry);
    let n = 0;
    for (let k = a - 1; k < Math.min(b, scan.lines.length); k++) {
        const l = scan.lines[k].trim();
        if (l && !/^[{}();,]+$/.test(l)) n++;
    }
    return n;
}

function complexityOf(scan, fn) {
    const re = DECISIONS[scan.langId] || DECISIONS.default;
    const body = bodyText(scan, fn.entry);
    re.lastIndex = 0;
    const hits = body.match(re) || [];
    return 1 + hits.length;
}

// --- per-function checks: each returns a finding or null --------------------------

function longFunction(scan, fn, c, lim) {
    if (lim.maxLines <= 0) return null;
    const n = bodyLineCount(scan, fn);
    if (n <= lim.maxLines) return null;
    return {
        smellId: 'long-function',
        line: fn.line,
        span: c.span,
        message: `${c.label} is ${n} lines (max ${lim.maxLines})`,
        suggest: 'extracting cohesive steps into named functions (one level of abstraction per function)',
        refSlug: 'functions',
        signature: fn.name,
    };
}

function parameterCount(scan, fn, c, lim) {
    const n = fn.params.length;
    if (c.ctor && lim.ctorMax > 0 && n >= lim.ctorMax) {
        return {
            smellId: 'long-constructor',
            line: fn.line,
            message: `long constructor ${c.label} (${n} params)`,
            suggest: 'Builder, or an options object / named args / functional options',
            refSlug: 'builder',
            signature: String(n),
        };
    }
    if (c.ctor || lim.maxParams <= 0 || n <= lim.maxParams) return null;
    return {
        smellId: 'long-param-list',
        line: fn.line,
        message: `${c.label} takes ${n} parameters (max ${lim.maxParams})`,
        suggest: 'a parameter object / options object, or splitting the function',
        refSlug: 'functions',
        signature: `${fn.name}|${n}`,
    };
}

function booleanFlag(scan, fn, c, lim) {
    const eligible = lim.boolRe && c.named && !c.ctor && !SETTER_RE.test(fn.name.split('::').pop());
    const flag = eligible ? fn.params.find(p => lim.boolRe.test(p.trim())) : null;
    if (!flag) return null;
    return {
        smellId: 'boolean-flag-param',
        line: fn.line,
        message: `boolean flag parameter \`${flag.trim()}\` on ${c.label}`,
        suggest: 'two intention-revealing functions, or an enum / options object when there are more modes',
        refSlug: 'functions',
        signature: fn.name,
    };
}

function complexity(scan, fn, c, lim) {
    if (lim.maxCx <= 0) return null;
    const cx = complexityOf(scan, fn);
    if (cx <= lim.maxCx) return null;
    return {
        smellId: 'complexity',
        line: fn.line,
        span: c.span,
        message: `${c.label} has cyclomatic complexity ${cx} (max ${lim.maxCx})`,
        suggest: 'guard clauses, extracting branches into functions, or a dispatch map for branch ladders',
        refSlug: 'functions',
        signature: fn.name,
    };
}

const FUNCTION_CHECKS = [longFunction, parameterCount, booleanFlag, complexity];

function detectFunctions(scan, s, fns) {
    const lim = {
        maxLines: Number(s.maxFunctionLines) || 0,
        maxParams: Number(s.maxParams) || 0,
        ctorMax: Number(s.constructorMaxParams) || 0,
        maxCx: Number(s.maxComplexity) || 0,
        boolRe: s.booleanFlagParam === false ? null : BOOL_PARAM[scan.langId],
    };
    return fns.flatMap(fn => {
        const named = fn.name !== '(anonymous)';
        const c = {
            named,
            ctor: named && isConstructor(fn, scan.langId),
            label: named ? `\`${fn.name}()\`` : 'anonymous function',
            span: [fn.line, bodyLineRange(scan, fn.entry)[1]],
        };
        return FUNCTION_CHECKS.map(check => check(scan, fn, c, lim)).filter(Boolean);
    });
}

// --- swallowed exceptions ----------------------------------------------------

function swallowed(line, what) {
    return {
        smellId: 'swallowed-exception',
        line,
        message: `swallowed error: ${what}`,
        suggest: 'handling it, logging it with context, or rethrowing / wrapping it; ' +
            'if ignoring is intentional, say why in a comment inside the block',
        refSlug: 'functions',
        signature: what,
    };
}

function pySwallowed(scan) {
    const L = scan.logical;
    const rawLines = scan.text.split('\n');
    const blocks = scan.entries
        .filter(e => /^except\b/.test(e.head))
        .map(e => ({ e, body: L.slice(e.logicalIndex + 1, e.bodyTo).map(l => l.text), raw: rawLines.slice(e.line - 1, e.endLine).join('\n') }))
        .filter(x => x.body.length && x.body.every(t => t === 'pass' || t === '...') && !x.raw.includes('#'))
        .map(x => swallowed(x.e.line, `\`${x.e.head}\` with only \`${x.body[0]}\``));
    const oneLiners = L
        .map(l => ({ l, m: /^(except\b[^:]*):\s*(pass|\.\.\.)\s*$/.exec(l.text) }))
        .filter(x => x.m && !(rawLines[x.l.line - 1] || '').includes('#'))
        .map(x => swallowed(x.l.line, `\`${x.m[1]}: ${x.m[2]}\``));
    return blocks.concat(oneLiners);
}

const SWALLOW_PATTERNS = {
    ts: [[/\.catch\(\s*(?:\(\s*[\w$]*\s*\)|[\w$]+)\s*=>\s*(?:\{\s*\}|null|undefined|void 0)\s*\)/g, 'empty `.catch(() => {})`']],
    go: [[/\bif\s+[^{\n]*\berr\s*!=\s*nil\s*\{\s*\}/g, 'empty `if err != nil {}`']],
    rust: [[/\bErr\(\s*_?\w*\s*\)\s*=>\s*(?:\{\s*\}|\(\s*\))/g, 'empty `Err(_) => {}` arm']],
};

function braceSwallowed(scan) {
    const { masked, text } = scan;
    const emptyCatches = scan.entries
        .filter(e => e.kind === 'try' && /^catch\b/.test(e.head))
        .filter(e => !masked.slice(e.bodyStart, e.bodyEnd).trim() && !text.slice(e.bodyStart, e.bodyEnd).trim())
        .map(e => swallowed(e.line, `empty \`${e.head}\``));
    // a comment inside the block (masked ≠ original) means "ignored on purpose"
    const idioms = (SWALLOW_PATTERNS[scan.langId] || [])
        .flatMap(([re, what]) => [...masked.matchAll(re)].map(m => ({ m, what })))
        .filter(({ m }) => text.slice(m.index, m.index + m[0].length) === m[0])
        .map(({ m, what }) => swallowed(lineOf(masked, m.index), what));
    return emptyCatches.concat(idioms);
}

function detectSwallowed(scan) {
    return scan.langId === 'py' ? pySwallowed(scan) : braceSwallowed(scan);
}

/**
 * @param {object} scan  _code-scan.scanBlocks result
 * @param {object} s     merged `smells` config
 */
function detectAll(scan, s) {
    const fns = extractFunctions(scan);
    extractClasses(scan, fns); // sets fn.className, used by isConstructor
    const out = detectFunctions(scan, s, fns);
    if (s.swallowedException !== false) out.push(...detectSwallowed(scan));
    return out;
}

module.exports = { detectAll };
