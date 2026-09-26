/**
 * _code-scan.js — language-aware text scanning shared by every smell module.
 *
 * Regex-level, zero-dependency "just enough parsing" for the seven supported
 * languages (TS, Python, Java, C#, Go, C++, Rust):
 *
 *   maskCode          blank comments (+ optionally string contents), offsets kept
 *   scanBlocks        block tree: brace stack (6 langs) / indentation (Python)
 *   extractFunctions  name, params, body range, modifiers, receiver, ctor flag
 *   extractClasses    classes / structs / impls with their methods (incl.
 *                     bodiless declarations: abstract, pure virtual, trait)
 *   importsOf         module specifiers imported by a file
 *   editedLineRanges  lines an Edit / MultiEdit wrote (for edit-scoped smells)
 *   applyEdit         proposed file content before a Write / Edit lands
 *
 * Standalone by contract: requires nothing from the other hook modules.
 */

'use strict';

// Languages where `'x'` is a char/rune literal, not a string (Rust: `'a` is
// also a lifetime, so an unterminated quote is skipped, not consumed).
const CHAR_LITERAL_LANGS = new Set(['java', 'cs', 'go', 'cpp', 'rust']);

// --- masking ----------------------------------------------------------------

function stringEnd(text, i, langId) {
    const q = text[i];
    const n = text.length;
    if (langId === 'py' && text.startsWith(q.repeat(3), i)) {
        const j = text.indexOf(q.repeat(3), i + 3);
        return j === -1 ? n : j + 3;
    }
    const multiline = q === '`';
    const raw = multiline && langId === 'go';
    let j = i + 1;
    while (j < n) {
        const c = text[j];
        if (c === '\\' && !raw) { j += 2; continue; }
        if (c === q) return j + 1;
        if (c === '\n' && !multiline) return j; // unterminated — stop at EOL
        j++;
    }
    return n;
}

/**
 * Blank comments (and string contents unless `keepStrings`) with spaces,
 * keeping every newline and offset. String delimiters survive, so
 * `x === 'a'` still reads as a comparison when strings are blanked.
 */
function maskCode(text, langId, keepStrings = false) {
    const isPy = langId === 'py';
    const out = text.split('');
    const blank = (from, to) => {
        for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
    };
    const n = text.length;
    let i = 0;
    while (i < n) {
        const ch = text[i];
        const next = text[i + 1];
        if ((isPy && ch === '#') || (!isPy && ch === '/' && next === '/')) {
            let j = text.indexOf('\n', i);
            if (j === -1) j = n;
            blank(i, j);
            i = j;
            continue;
        }
        if (!isPy && ch === '/' && next === '*') {
            const j = text.indexOf('*/', i + 2);
            const end = j === -1 ? n : j + 2;
            blank(i, end);
            i = end;
            continue;
        }
        if (ch === '"' || ch === '`' || ch === "'") {
            let end;
            if (ch === "'" && CHAR_LITERAL_LANGS.has(langId)) {
                const m = /^'(?:\\u\{[0-9a-fA-F]+\}|\\.|[^\\'\n])'/.exec(text.slice(i, i + 12));
                if (!m) { i++; continue; }
                end = i + m[0].length;
            } else {
                end = stringEnd(text, i, langId);
            }
            if (!keepStrings) blank(i + 1, Math.max(i + 1, end - 1));
            i = end;
            continue;
        }
        i++;
    }
    return out.join('');
}

// --- small helpers ----------------------------------------------------------

function lineOf(text, idx) {
    if (idx <= 0) return 1;
    return text.slice(0, idx).split('\n').length;
}

function countChar(s, ch) {
    let c = 0;
    for (let k = 0; k < s.length; k++) if (s[k] === ch) c++;
    return c;
}

function indentOf(line) {
    return line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
}

const PAIRS = { '(': ')', '[': ']', '{': '}' };

/** Index of the bracket closing the one at `openIdx` (text.length if unbalanced). */
function balancedEnd(text, openIdx) {
    const open = text[openIdx];
    const close = PAIRS[open];
    let depth = 0;
    for (let i = openIdx; i < text.length; i++) {
        if (text[i] === open) depth++;
        else if (text[i] === close && --depth === 0) return i;
    }
    return text.length;
}

/** Split on commas that are not nested in (), [], {} or <> generics. */
function splitTopLevel(s) {
    const parts = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const prev = s[i - 1];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        else if (c === '<') depth++;
        else if (c === '>' && prev !== '=' && prev !== '-') depth = Math.max(0, depth - 1);
        if (c === ',' && depth === 0) {
            parts.push(cur);
            cur = '';
            continue;
        }
        cur += c;
    }
    parts.push(cur);
    return parts.map(p => p.trim()).filter(Boolean);
}

// --- block scanners ---------------------------------------------------------
//
// Both scanners return a flat list of block entries:
//   { kind: 'if'|'loop'|'switch'|'try'|null, head, line, parent, depth,
//     bodyStart, bodyEnd }                        (brace: char offsets)
//   { ..., indent, logicalIndex, bodyTo }         (python: logical-line range)
// `depth` counts control-flow blocks on the path, this one included.

const BRACE_HEAD_RE = /^(?:else\s+if|if|else|for|foreach|while|do|switch|match|select|loop|try|catch|finally)\b/;
const PY_HEAD_RE = /^(?:async\s+)?(if|elif|else|for|while|try|except|finally|match)\b/;
// resource / lock scopes don't branch
const SCOPE_HEAD_RE = /^(?:(?:async\s+)?with|using|lock|synchronized|unsafe|fixed)\b/;

function kindOfKeyword(kw) {
    if (/^(?:if|elif|else|else\s+if)$/.test(kw)) return 'if';
    if (/^(?:for|foreach|while|do|loop)$/.test(kw)) return 'loop';
    if (/^(?:switch|match|select)$/.test(kw)) return 'switch';
    return 'try';
}

/** Header text before a `{`, walking back over lines until parens balance. */
function braceHeader(masked, from, to) {
    const lines = masked.slice(from, to).split('\n');
    let k = lines.length - 1;
    let open = 0;
    let close = 0;
    for (; k >= 0; k--) {
        open += countChar(lines[k], '(');
        close += countChar(lines[k], ')');
        if (open >= close && lines.slice(k).join('').trim()) break;
    }
    k = Math.max(k, 0);
    const offset = from + lines.slice(0, k).reduce((s, l) => s + l.length + 1, 0);
    const lead = masked.slice(offset, to).search(/\S/);
    return {
        head: lines.slice(k).join(' ').replace(/\s+/g, ' ').trim(),
        index: offset + Math.max(lead, 0),
    };
}

function scanBraceBlocks(masked) {
    const entries = [];
    const stack = [];
    let lastDelim = 0;
    let parenDepth = 0;
    for (let i = 0; i < masked.length; i++) {
        const c = masked[i];
        if (c === '(') parenDepth++;
        else if (c === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (c === ';' && parenDepth === 0) lastDelim = i + 1;
        else if (c === '{') {
            const parent = stack[stack.length - 1] || null;
            // `{` inside parens is an expression (object literal, lambda body)
            const isExpr = parenDepth > 0;
            const h = isExpr ? { head: '', index: i } : braceHeader(masked, lastDelim, i);
            const m = BRACE_HEAD_RE.exec(h.head);
            const kind = m ? kindOfKeyword(m[0].replace(/\s+/g, ' ')) : null;
            const entry = {
                kind,
                head: h.head,
                headIndex: h.index,
                line: lineOf(masked, h.index),
                parent,
                depth: (parent ? parent.depth : 0) + (kind ? 1 : 0),
                bodyStart: i + 1,
                bodyEnd: masked.length,
                savedParen: parenDepth,
                savedDelim: lastDelim,
                isExpr,
            };
            entries.push(entry);
            stack.push(entry);
            parenDepth = 0;
            lastDelim = i + 1;
        } else if (c === '}') {
            const entry = stack.pop();
            if (!entry) { lastDelim = i + 1; continue; }
            entry.bodyEnd = i;
            parenDepth = entry.savedParen;
            // an expression brace doesn't end the enclosing statement's header
            lastDelim = entry.isExpr ? entry.savedDelim : i + 1;
        }
    }
    return entries;
}

/** Python logical lines: joins bracket continuations and `\` line ends. */
function pyLogicalLines(masked) {
    const raw = masked.split('\n');
    const out = [];
    let buf = null;
    let depth = 0;
    for (let k = 0; k < raw.length; k++) {
        const l = raw[k];
        if (buf === null) {
            if (!l.trim()) continue;
            buf = { line: k + 1, endLine: k + 1, indent: indentOf(l), text: l.trim() };
        } else {
            buf.text += ' ' + l.trim();
            buf.endLine = k + 1;
        }
        for (const ch of l) {
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') depth--;
        }
        if (depth <= 0 && !/\\\s*$/.test(l)) {
            out.push(buf);
            buf = null;
            depth = 0;
        }
    }
    if (buf) out.push(buf);
    return out;
}

function scanPyBlocks(logical) {
    const entries = [];
    const stack = [];
    logical.forEach((L, idx) => {
        while (stack.length && stack[stack.length - 1].indent >= L.indent) stack.pop();
        // one-line `def f(): ...` / `class E(Exception): pass` — an entry, but no children
        if (!/:\s*$/.test(L.text)) {
            if (/^(?:(?:async\s+)?def|class)\s+\w+.*:\s*\S/.test(L.text)) {
                entries.push({
                    kind: null, head: L.text, line: L.line, indent: L.indent,
                    parent: stack[stack.length - 1] || null,
                    depth: stack.length ? stack[stack.length - 1].depth : 0,
                    logicalIndex: idx, bodyTo: idx + 1, endLine: L.endLine, oneLiner: true,
                });
            }
            return;
        }
        const parent = stack[stack.length - 1] || null;
        const m = PY_HEAD_RE.exec(L.text);
        const kind = m ? kindOfKeyword(m[1]) : null;
        let to = idx + 1;
        while (to < logical.length && logical[to].indent > L.indent) to++;
        const entry = {
            kind,
            head: L.text,
            line: L.line,
            indent: L.indent,
            parent,
            depth: (parent ? parent.depth : 0) + (kind ? 1 : 0),
            logicalIndex: idx,
            bodyTo: to,
            endLine: to > idx + 1 ? logical[to - 1].endLine : L.endLine,
        };
        entries.push(entry);
        stack.push(entry);
    });
    return entries;
}

/**
 * Scan once per file; every detector shares the result.
 * @returns {{ langId, text, masked, lines, logical, entries }}
 */
function scanBlocks(text, langId) {
    const masked = maskCode(text, langId);
    const base = { langId, text, masked, lines: masked.split('\n') };
    if (langId === 'py') {
        const logical = pyLogicalLines(masked);
        return { ...base, logical, entries: scanPyBlocks(logical) };
    }
    return { ...base, logical: null, entries: scanBraceBlocks(masked) };
}

/** Masked body text of a block entry / function. */
function bodyText(scan, e) {
    if (scan.langId !== 'py') return scan.masked.slice(e.bodyStart, e.bodyEnd);
    const out = [];
    for (let k = e.logicalIndex + 1; k < e.bodyTo; k++) out.push(scan.logical[k].text);
    return out.join('\n');
}

/** [firstLine, lastLine] of a block's body (1-based, inclusive). */
function bodyLineRange(scan, e) {
    if (scan.langId !== 'py') return [lineOf(scan.masked, e.bodyStart), lineOf(scan.masked, e.bodyEnd)];
    return [e.line + 1, e.endLine];
}

// --- functions --------------------------------------------------------------

const NOT_A_NAME = new Set([
    'if', 'for', 'foreach', 'while', 'switch', 'catch', 'return', 'new', 'sizeof',
    'typeof', 'await', 'using', 'lock', 'fixed', 'synchronized', 'function', 'match',
    'with', 'super', 'this', 'base', 'throw', 'yield', 'delete', 'decltype',
    'alignof', 'noexcept', 'static_assert', 'assert', 'defer', 'go', 'else', 'do',
    'operator', 'when', 'where', 'select', 'try', 'finally',
    // C / C++ type keywords never name a function
    'void', 'int', 'char', 'bool', 'auto', 'float', 'double', 'long', 'short',
    'unsigned', 'signed', 'const', 'static', '__attribute__', '__declspec',
]);
const CLASS_KW_RE = /\b(class|struct|interface|trait|enum|record|namespace|union|impl|extension|object|module)\b/;

function paramsFrom(text, openIdx, langId) {
    const close = balancedEnd(text, openIdx);
    const raw = text.slice(openIdx + 1, close);
    const params = splitTopLevel(raw).filter(p => {
        if (p === 'void' || p === '...' || p === '*' || p === '/') return false;
        if (langId === 'py' && /^(?:self|cls)\b/.test(p)) return false;
        if (langId === 'rust' && /^&?(?:'\w+\s+)?(?:mut\s+)?self\b/.test(p)) return false;
        if (langId === 'ts' && /^this\s*:/.test(p)) return false;
        return true;
    });
    return { params, close };
}

function paramName(p, langId) {
    const s = p.replace(/=.*$/, '').trim();
    if (langId === 'py' || langId === 'ts' || langId === 'rust') {
        const m = /^(?:\*{1,2}|\.\.\.)?(?:(?:public|private|protected|readonly|mut)\s+)*([A-Za-z_$][\w$]*)/.exec(s);
        return m ? m[1] : s;
    }
    if (langId === 'go') return s.split(/\s+/)[0];
    const m = /([A-Za-z_$][\w$]*)\s*(?:\[\s*\])?$/.exec(s);
    return m ? m[1] : s;
}

function braceFunction(e, langId) {
    if (e.kind || e.isExpr || !e.head) return null;
    const head = e.head
        .replace(/^(?:@[\w.]+(?:\([^()]*\))?\s*)+/, '')
        .replace(/^(?:\[[^\]]*\]\s*)+/, '');
    if (SCOPE_HEAD_RE.test(head)) return null;

    let name = null;
    let openIdx = -1;
    let receiver = null;
    if (langId === 'go') {
        const m = /\bfunc\b\s*(?:\(([^()]*)\)\s*)?([A-Za-z_]\w*)?\s*(?:\[[^\]]*\])?\s*\(/.exec(head);
        if (!m) return null;
        if (m[1] !== undefined && m[2] === undefined) {
            // `func(a int) {` matched the params as a receiver — anonymous func
            openIdx = head.indexOf('(', m.index);
        } else {
            receiver = m[1] ? (/([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*$/.exec(m[1].replace(/\*/g, '')) || [])[1] : null;
            name = m[2] || null;
            openIdx = m.index + m[0].length - 1;
        }
    } else if (langId === 'rust') {
        const m = /\bfn\s+([A-Za-z_]\w*)\s*(?:<[^()]*>)?\s*\(/.exec(head);
        if (!m) return null;
        name = m[1];
        openIdx = m.index + m[0].length - 1;
    } else {
        const firstParen = head.indexOf('(');
        const pre = firstParen === -1 ? head : head.slice(0, firstParen);
        if (CLASS_KW_RE.test(pre) || /\bnew\b/.test(pre)) return null;
        if (/=\s*$/.test(head)) return null; // `T x[] = {` initializer, not a body
        if (/(?:=>|->)$/.test(head)) {
            // arrow function / Java lambda with a block body
            const beforeArrow = head.replace(/\s*(?:=>|->)$/, '');
            if (/\)\s*(?::[^()]*)?$/.test(beforeArrow)) {
                const close = beforeArrow.lastIndexOf(')');
                let depth = 0;
                for (let i = close; i >= 0; i--) {
                    if (beforeArrow[i] === ')') depth++;
                    else if (beforeArrow[i] === '(' && --depth === 0) { openIdx = i; break; }
                }
            }
            const nm = /(?:^|\s)(?:(?:export|const|let|var|readonly|public|private|protected|static|async)\s+)*([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\b)?/.exec(beforeArrow);
            name = nm ? nm[1] : null;
            if (openIdx === -1) {
                const single = /([A-Za-z_$][\w$]*)\s*$/.exec(beforeArrow);
                return single
                    ? mkBraceFn(e, name, [single[1]], head, '', null)
                    : null;
            }
        } else {
            const re = /([A-Za-z_$~][\w$]*(?:::~?[A-Za-z_]\w*)*)\s*(?:<[^()]*>)?\s*\(/g;
            let m;
            while ((m = re.exec(head)) !== null) {
                const last = m[1].split('::').pop();
                if (NOT_A_NAME.has(m[1]) && m[1] !== 'function') continue;
                name = m[1] === 'function' ? null : m[1];
                openIdx = m.index + m[0].length - 1;
                if (!NOT_A_NAME.has(last)) break;
            }
            if (openIdx === -1) return null;
        }
    }
    if (openIdx === -1) return null;
    const { params } = paramsFrom(head, openIdx, langId);
    const nameIdx = name ? head.lastIndexOf(name, openIdx) : openIdx;
    const modifiers = head.slice(0, Math.max(0, nameIdx)).trim();
    return mkBraceFn(e, name, params, head, modifiers, receiver);
}

function mkBraceFn(e, name, params, head, modifiers, receiver) {
    return {
        name: name || '(anonymous)',
        params,
        head,
        modifiers,
        receiver,
        line: e.line,
        entry: e,
        bodyStart: e.bodyStart,
        bodyEnd: e.bodyEnd,
    };
}

function pyFunction(e, scan) {
    const m = /^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/.exec(e.head);
    if (!m) return null;
    const openIdx = m.index + m[0].length - 1;
    const { params } = paramsFrom(e.head, openIdx, 'py');
    const decorators = [];
    for (let k = e.logicalIndex - 1; k >= 0; k--) {
        const L = scan.logical[k];
        if (L.indent !== e.indent || !L.text.startsWith('@')) break;
        decorators.push(L.text);
    }
    return {
        name: m[1],
        params,
        head: e.head,
        modifiers: decorators.join(' '),
        receiver: null,
        line: e.line,
        entry: e,
        logicalIndex: e.logicalIndex,
        bodyTo: e.bodyTo,
        endLine: e.endLine,
    };
}

/** Every function / method / named lambda with a body (cached on the scan). */
function extractFunctions(scan) {
    if (scan.fns) return scan.fns;
    const { langId } = scan;
    const out = [];
    for (const e of scan.entries) {
        const fn = langId === 'py' ? pyFunction(e, scan) : braceFunction(e, langId);
        if (!fn) continue;
        e.fn = fn;
        out.push(fn);
    }
    scan.fns = out;
    return out;
}

// --- classes ----------------------------------------------------------------

const CLASS_DECL_RE = /\b(class|struct|interface|trait|record|enum|object)\s+([A-Za-z_]\w*)/;

function classHead(e, langId) {
    if (e.kind || e.isExpr) return null;
    const head = e.head.replace(/^(?:@[\w.]+(?:\([^()]*\))?\s*)+/, '');
    if (langId === 'go') {
        const m = /\btype\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s+(struct|interface)\b/.exec(head);
        return m ? { name: m[1], kind: m[2] } : null;
    }
    if (langId === 'rust') {
        const imp = /^(?:unsafe\s+)?impl\b(?:\s*<[^{]*?>)?\s+(?:([\w:]+)(?:<[^{]*?>)?\s+for\s+)?([\w:]+)/.exec(head);
        if (imp) return { name: imp[2].split('::').pop(), kind: 'impl', trait: imp[1] || null };
    }
    const firstParen = head.indexOf('(');
    const pre = firstParen === -1 ? head : head.slice(0, firstParen);
    const m = CLASS_DECL_RE.exec(pre);
    return m ? { name: m[2], kind: m[1] } : null;
}

/**
 * Blank nested `{...}` so only the class's own top-level declarations remain.
 * Same length as the input: offsets still map to the original body.
 */
function topLevelOnly(body) {
    let out = '';
    let depth = 0;
    for (const c of body) {
        if (c === '{') { out += depth === 0 ? ';' : ' '; depth++; continue; }
        if (c === '}') { depth--; out += depth === 0 ? ';' : ' '; continue; }
        out += depth === 0 || c === '\n' ? c : ' ';
    }
    return out;
}

const DECL_RE = {
    // `abstract run(): void;`  `void a();`  `public abstract int B(int x);`
    brace: /(?:^|[;\n])\s*((?:[\w<>\[\],.?:*&]+\s+)*?)([A-Za-z_$~][\w$]*)\s*(?:<[^()]*>)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*(?::\s*[^;]+?)?\s*(?:const)?\s*(?:noexcept)?\s*(?:override|final)?\s*(?:throws\s+[\w., ]+)?\s*(=\s*0|=\s*default|=\s*delete)?\s*;/g,
    rust: /\bfn\s+([A-Za-z_]\w*)\s*(?:<[^()]*>)?\s*\(([^()]*)\)[^;{]*;/g,
};

function declaredMethods(cls, scan) {
    const body = topLevelOnly(scan.masked.slice(cls.entry.bodyStart, cls.entry.bodyEnd));
    const out = [];
    if (scan.langId === 'rust') {
        let m;
        DECL_RE.rust.lastIndex = 0;
        while ((m = DECL_RE.rust.exec(body)) !== null) {
            out.push({ name: m[1], modifiers: 'pub', abstract: true, params: splitTopLevel(m[2]), declared: true });
        }
        return out;
    }
    if (scan.langId === 'go') return out;
    let m;
    DECL_RE.brace.lastIndex = 0;
    while ((m = DECL_RE.brace.exec(body)) !== null) {
        const name = m[2];
        if (NOT_A_NAME.has(name)) continue;
        const modifiers = (m[1] || '').trim();
        const abstract = /\babstract\b/.test(modifiers) || /=\s*0/.test(m[4] || '') ||
            cls.kind === 'interface' || cls.kind === 'trait';
        out.push({ name, modifiers, abstract, params: splitTopLevel(m[3]), declared: true, offset: m.index });
    }
    return out;
}

/** C++ access of a method: label in effect at its offset in the class body. */
function cppAccess(scan, cls, offsetInBody) {
    const body = scan.masked.slice(cls.entry.bodyStart, cls.entry.bodyEnd);
    let access = cls.kind === 'struct' ? 'public' : 'private';
    const re = /\b(public|private|protected)\s*:/g;
    let m;
    while ((m = re.exec(body)) !== null && m.index < offsetInBody) access = m[1];
    return access;
}

/**
 * Classes / structs / impls with their methods. Go methods attach by
 * receiver, Rust impl blocks merge into their type, C++ `Foo::bar` bodies
 * attach to `Foo`.
 */
function extractClasses(scan, fns = extractFunctions(scan)) {
    if (scan.classes) return scan.classes;
    const { langId } = scan;
    const byName = new Map();
    const get = (name, seed) => {
        if (!byName.has(name)) byName.set(name, { name, kind: 'struct', line: seed.line, entry: null, methods: [], abstract: false, bases: '' });
        return byName.get(name);
    };

    if (langId === 'py') {
        for (const e of scan.entries) {
            const m = /^class\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*:/.exec(e.head);
            if (!m) continue;
            const cls = get(m[1], e);
            Object.assign(cls, { kind: 'class', line: e.line, entry: e, bases: m[2] || '' });
            cls.abstract = /\b(?:ABC|ABCMeta|Protocol)\b/.test(cls.bases);
        }
        for (const fn of fns) {
            const p = fn.entry.parent;
            if (!p || !/^class\b/.test(p.head)) continue;
            const cls = byName.get(/^class\s+([A-Za-z_]\w*)/.exec(p.head)[1]);
            fn.className = cls.name;
            fn.abstract = /@(?:abc\.)?abstractmethod\b/.test(fn.modifiers);
            if (fn.abstract) cls.abstract = true;
            cls.methods.push(fn);
        }
        scan.classes = Array.from(byName.values());
        return scan.classes;
    }

    for (const e of scan.entries) {
        const h = classHead(e, langId);
        if (!h) continue;
        const cls = get(h.name, e);
        if (h.kind !== 'impl' || !cls.entry) {
            Object.assign(cls, { kind: h.kind === 'impl' ? cls.kind : h.kind, line: cls.entry ? cls.line : e.line });
        }
        if (!cls.entry || h.kind !== 'impl') cls.entry = cls.entry || e;
        (cls.entries = cls.entries || []).push(e);
        e.classOf = cls;
        cls.abstract = cls.abstract || /\babstract\b/.test(e.head) || h.kind === 'interface' || h.kind === 'trait';
    }

    for (const fn of fns) {
        let owner = null;
        if (langId === 'go' && fn.receiver) owner = get(fn.receiver, fn);
        else if (fn.name.includes('::')) owner = get(fn.name.split('::').slice(-2)[0], fn);
        else {
            for (let p = fn.entry.parent; p; p = p.parent) {
                if (p.classOf) { owner = p.classOf; break; }
                if (p.fn) break; // nested function, not a method
                if (/\bnew\s+[\w.<>]+\s*\(.*\)$/.test(p.head)) break; // anonymous class body
            }
        }
        if (!owner) continue;
        fn.className = owner.name;
        owner.methods.push(fn);
        if (langId === 'cpp' && owner.entry && fn.entry.parent === owner.entry) {
            fn.access = cppAccess(scan, owner, fn.entry.headIndex - owner.entry.bodyStart);
        }
    }

    for (const cls of byName.values()) {
        for (const e of cls.entries || []) {
            for (const d of declaredMethods({ ...cls, entry: e }, scan)) {
                if (langId === 'cpp') d.access = cppAccess(scan, { ...cls, entry: e }, d.offset || 0);
                const defined = cls.methods.find(m => m.name.split('::').pop() === d.name);
                if (defined) {
                    // out-of-line C++ definition: inherit the declaration's access
                    if (defined.access === undefined) defined.access = d.access;
                    continue;
                }
                d.className = cls.name;
                d.line = lineOf(scan.masked, e.bodyStart + (d.offset || 0));
                if (d.abstract) cls.abstract = true;
                cls.methods.push(d);
            }
        }
    }
    scan.classes = Array.from(byName.values());
    return scan.classes;
}

/** Constructors across languages. */
function isConstructor(fn, langId) {
    const n = fn.name.split('::');
    const base = n[n.length - 1];
    if (base === 'constructor' || base === '__init__') return true;
    if (langId === 'go') return /^New[A-Z_]?\w*$/.test(base) && !fn.receiver;
    if (langId === 'rust') return base === 'new';
    if (n.length >= 2 && n[n.length - 2] === base) return true; // C++ Foo::Foo
    return Boolean(fn.className) && fn.className === base;
}

/** Visibility of a method in its language's terms. */
function isPublicMethod(m, cls, langId) {
    const mods = m.modifiers || '';
    switch (langId) {
    case 'ts': return !/\b(?:private|protected)\b/.test(mods) && !m.name.startsWith('#');
    case 'java':
    case 'cs': return /\bpublic\b/.test(mods) || cls.kind === 'interface';
    case 'cpp': return m.access ? m.access === 'public' : cls.kind === 'struct';
    case 'py': return !m.name.startsWith('_');
    case 'go': return /^[A-Z]/.test(m.name);
    case 'rust': return cls.kind === 'trait' || /\bpub\b/.test(mods);
    default: return true;
    }
}

// --- imports ----------------------------------------------------------------

const IMPORT_RES = {
    ts: [/\bfrom\s+['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm],
    py: [/^\s*from\s+([.\w]+)\s+import\b/gm, /^\s*import\s+([\w.]+)/gm],
    java: [/^\s*import\s+(?:static\s+)?([\w.*]+)\s*;/gm],
    cs: [/^\s*(?:global\s+)?using\s+(?:static\s+)?(?:\w+\s*=\s*)?([\w.]+)\s*;/gm],
    go: [/^\s*import\s+(?:\w+\s+)?"([^"]+)"/gm, /^\s*(?:[\w.]+\s+)?"([^"]+)"\s*$/gm],
    rust: [/^\s*(?:pub\s+)?use\s+([\w:]+)/gm, /^\s*extern\s+crate\s+(\w+)/gm],
    cpp: [/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm],
};

/** Module specifiers a file imports, with their line numbers. */
function importsOf(text, langId) {
    const src = maskCode(text || '', langId, true);
    const out = [];
    const seen = new Set();
    let goBlock = null;
    if (langId === 'go') {
        const b = /\bimport\s*\(([^)]*)\)/.exec(src);
        goBlock = b ? { from: b.index, to: b.index + b[0].length } : null;
    }
    for (const re of IMPORT_RES[langId] || IMPORT_RES.ts) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
            // the bare `"pkg"` form only counts inside a Go import ( … ) block
            if (langId === 'go' && !/^\s*import/.test(m[0]) && !(goBlock && m.index > goBlock.from && m.index < goBlock.to)) continue;
            const key = m[1] + '@' + m.index;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ spec: m[1], line: lineOf(src, m.index + m[0].indexOf(m[1])) });
        }
    }
    return out.sort((a, b) => a.line - b.line);
}

// --- edit scoping -----------------------------------------------------------

/**
 * 1-based [start, end] line ranges the tool call wrote, or null for "whole
 * file" (Write, or a new_string that can't be located after the edit).
 */
function editedLineRanges(fileText, tool, toolInput) {
    if (tool === 'Write') return null;
    const edits = tool === 'MultiEdit'
        ? (Array.isArray(toolInput.edits) ? toolInput.edits : [])
        : [toolInput];
    const ranges = [];
    for (const e of edits) {
        const ns = e && e.new_string;
        if (!ns || !ns.trim()) continue;
        const idx = fileText.indexOf(ns);
        if (idx === -1) return null;
        const start = lineOf(fileText, idx);
        ranges.push([start, start + ns.split('\n').length - 1]);
    }
    return ranges;
}

/**
 * Keep a finding when it (one of its sites, or any line of its class /
 * function span) sits on an edited line.
 */
function inEditScope(finding, ranges) {
    if (!ranges) return true;
    if (finding.span) {
        const [s, e] = finding.span;
        return ranges.some(([a, b]) => s <= b && e >= a);
    }
    const lines = finding.sites || [finding.line];
    return lines.some(l => ranges.some(([a, b]) => l >= a && l <= b));
}

/**
 * File content after the tool call would land, or null when it can't be
 * computed (Edit on a missing file, old_string not found).
 */
function applyEdit(currentText, tool, toolInput) {
    if (tool === 'Write') return typeof toolInput.content === 'string' ? toolInput.content : null;
    if (currentText === null || currentText === undefined) return null;
    const edits = tool === 'MultiEdit'
        ? (Array.isArray(toolInput.edits) ? toolInput.edits : [])
        : [toolInput];
    let text = currentText;
    for (const e of edits) {
        if (!e || typeof e.old_string !== 'string' || typeof e.new_string !== 'string') return null;
        if (e.old_string === '') { text = e.new_string + text; continue; }
        if (!text.includes(e.old_string)) return null;
        text = e.replace_all
            ? text.split(e.old_string).join(e.new_string)
            : text.replace(e.old_string, () => e.new_string);
    }
    return text;
}

module.exports = {
    maskCode,
    lineOf,
    countChar,
    indentOf,
    balancedEnd,
    splitTopLevel,
    scanBlocks,
    bodyText,
    bodyLineRange,
    SCOPE_HEAD_RE,
    extractFunctions,
    extractClasses,
    isConstructor,
    isPublicMethod,
    paramName,
    importsOf,
    editedLineRanges,
    inEditScope,
    applyEdit,
};
