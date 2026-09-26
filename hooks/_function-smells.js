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

function detectFunctions(scan, s, fns) {
    const findings = [];
    const { langId } = scan;
    const maxLines = Number(s.maxFunctionLines) || 0;
    const maxParams = Number(s.maxParams) || 0;
    const ctorMax = Number(s.constructorMaxParams) || 0;
    const maxCx = Number(s.maxComplexity) || 0;
    const boolRe = BOOL_PARAM[langId];

    for (const fn of fns) {
        const named = fn.name !== '(anonymous)';
        const span = [fn.line, bodyLineRange(scan, fn.entry)[1]];
        const label = named ? `\`${fn.name}()\`` : 'anonymous function';
        const ctor = named && isConstructor(fn, langId);

        if (maxLines > 0) {
            const n = bodyLineCount(scan, fn);
            if (n > maxLines) {
                findings.push({
                    smellId: 'long-function',
                    line: fn.line,
                    span,
                    message: `${label} is ${n} lines (max ${maxLines})`,
                    suggest: 'extracting cohesive steps into named functions (one level of abstraction per function)',
                    refSlug: 'functions',
                    signature: fn.name,
                });
            }
        }

        if (ctor && ctorMax > 0 && fn.params.length >= ctorMax) {
            findings.push({
                smellId: 'long-constructor',
                line: fn.line,
                message: `long constructor ${label} (${fn.params.length} params)`,
                suggest: 'Builder, or an options object / named args / functional options',
                refSlug: 'builder',
                signature: String(fn.params.length),
            });
        } else if (!ctor && maxParams > 0 && fn.params.length > maxParams) {
            findings.push({
                smellId: 'long-param-list',
                line: fn.line,
                message: `${label} takes ${fn.params.length} parameters (max ${maxParams})`,
                suggest: 'a parameter object / options object, or splitting the function',
                refSlug: 'functions',
                signature: `${fn.name}|${fn.params.length}`,
            });
        }

        if (s.booleanFlagParam !== false && boolRe && named && !ctor && !SETTER_RE.test(fn.name.split('::').pop())) {
            const flag = fn.params.find(p => boolRe.test(p.trim()));
            if (flag) {
                findings.push({
                    smellId: 'boolean-flag-param',
                    line: fn.line,
                    message: `boolean flag parameter \`${flag.trim()}\` on ${label}`,
                    suggest: 'two intention-revealing functions, or an enum / options object when there are more modes',
                    refSlug: 'functions',
                    signature: fn.name,
                });
            }
        }

        if (maxCx > 0) {
            const cx = complexityOf(scan, fn);
            if (cx > maxCx) {
                findings.push({
                    smellId: 'complexity',
                    line: fn.line,
                    span,
                    message: `${label} has cyclomatic complexity ${cx} (max ${maxCx})`,
                    suggest: 'guard clauses, extracting branches into functions, or a dispatch map for branch ladders',
                    refSlug: 'functions',
                    signature: fn.name,
                });
            }
        }
    }
    return findings;
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

function detectSwallowed(scan) {
    const findings = [];
    const { langId, masked, text } = scan;

    if (langId === 'py') {
        const L = scan.logical;
        for (const e of scan.entries) {
            if (!/^except\b/.test(e.head)) continue;
            const body = L.slice(e.logicalIndex + 1, e.bodyTo).map(l => l.text);
            const raw = scan.text.split('\n').slice(e.line - 1, e.endLine).join('\n');
            if (body.length && body.every(t => t === 'pass' || t === '...') && !raw.includes('#')) {
                findings.push(swallowed(e.line, `\`${e.head}\` with only \`${body[0]}\``));
            }
        }
        for (const l of L) {
            const m = /^(except\b[^:]*):\s*(pass|\.\.\.)\s*$/.exec(l.text);
            const raw = scan.text.split('\n')[l.line - 1] || '';
            if (m && !raw.includes('#')) findings.push(swallowed(l.line, `\`${m[1]}: ${m[2]}\``));
        }
        return findings;
    }

    for (const e of scan.entries) {
        if (e.kind !== 'try' || !/^catch\b/.test(e.head)) continue;
        const inner = masked.slice(e.bodyStart, e.bodyEnd);
        const original = text.slice(e.bodyStart, e.bodyEnd);
        if (!inner.trim() && !original.trim()) findings.push(swallowed(e.line, `empty \`${e.head}\``));
    }
    const res = [];
    if (langId === 'ts') res.push([/\.catch\(\s*(?:\(\s*[\w$]*\s*\)|[\w$]+)\s*=>\s*(?:\{\s*\}|null|undefined|void 0)\s*\)/g, 'empty `.catch(() => {})`']);
    if (langId === 'go') res.push([/\bif\s+[^{\n]*\berr\s*!=\s*nil\s*\{\s*\}/g, 'empty `if err != nil {}`']);
    if (langId === 'rust') res.push([/\bErr\(\s*_?\w*\s*\)\s*=>\s*(?:\{\s*\}|\(\s*\))/g, 'empty `Err(_) => {}` arm']);
    for (const [re, what] of res) {
        let m;
        while ((m = re.exec(masked)) !== null) {
            // a comment inside the block means "ignored on purpose"
            if (text.slice(m.index, m.index + m[0].length) !== masked.slice(m.index, m.index + m[0].length)) continue;
            findings.push(swallowed(lineOf(masked, m.index), what));
        }
    }
    return findings;
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
