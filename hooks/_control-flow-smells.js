/**
 * _control-flow-smells.js — control-flow detectors for pattern-smell-detector.js.
 *
 * Detectors (all advisory, same `{smellId, line, message, suggest, refSlug,
 * signature}` finding shape as the GoF detectors):
 *
 *   nested-if               `if` directly inside another `if`/`else` block
 *                           → guard clause / merged condition / `else if`
 *   deep-nesting            control-flow depth > maxNestingDepth (default 2)
 *                           → guard clauses, extract function
 *   else-after-return       `else` / `else if` / `elif` after a block that
 *                           ends in return / throw / raise / continue / break
 *   conditional-ladder      if / else-if chain comparing ONE subject to
 *                           literals, ≥ N branches → dispatch map / Strategy
 *   scattered-discriminator one subject compared to string/enum literals at
 *                           ≥ N separate sites → State / Strategy / polymorphism
 *   n-plus-one              DB / HTTP call (or `await`) inside a loop body
 *                           → batch query, eager load, DataLoader
 *
 * Brace languages (TS, Java, C#, Go, C++, Rust) are scanned with a brace
 * stack; Python with an indentation stack over logical lines. Comments (and,
 * where literals don't matter, string contents) are blanked first so braces
 * or keywords inside them never count. Offsets and newlines are preserved, so
 * line numbers stay exact.
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

// --- shared helpers ---------------------------------------------------------

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

const BRACE_HEAD_RE = /^(?:else\s+if|if|else|for|foreach|while|do|switch|match|select|loop|try|catch|finally)\b/;
const PY_HEAD_RE = /^(?:async\s+)?(if|elif|else|for|while|try|except|finally|match)\b/;

function kindOfKeyword(kw) {
    if (/^(?:if|elif|else|else\s+if)$/.test(kw)) return 'if';
    if (/^(?:for|foreach|while|do|loop)$/.test(kw)) return 'loop';
    if (/^(?:switch|match|select)$/.test(kw)) return 'switch';
    return 'try';
}

// --- block scanners ---------------------------------------------------------
//
// Both scanners return a flat list of block entries:
//   { kind: 'if'|'loop'|'switch'|'try'|null, head, line, parent, depth,
//     bodyStart, bodyEnd }                        (brace: char offsets)
//   { ..., logicalIndex }                         (python: logical-line index)
// `depth` counts control-flow blocks on the path, this one included.

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
            buf = { line: k + 1, indent: indentOf(l), text: l.trim() };
        } else {
            buf.text += ' ' + l.trim();
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
        if (!/:\s*$/.test(L.text)) return;
        const parent = stack[stack.length - 1] || null;
        const m = PY_HEAD_RE.exec(L.text);
        const kind = m ? kindOfKeyword(m[1]) : null;
        const entry = {
            kind,
            head: L.text,
            line: L.line,
            indent: L.indent,
            parent,
            depth: (parent ? parent.depth : 0) + (kind ? 1 : 0),
            logicalIndex: idx,
        };
        entries.push(entry);
        stack.push(entry);
    });
    return entries;
}

function scanBlocks(text, langId) {
    const masked = maskCode(text, langId);
    if (langId === 'py') {
        const logical = pyLogicalLines(masked);
        return { masked, logical, entries: scanPyBlocks(logical) };
    }
    return { masked, logical: null, entries: scanBraceBlocks(masked) };
}

// --- nested-if + deep-nesting -----------------------------------------------

function isPlainIf(head) {
    return /^(?:async\s+)?if\b/.test(head);
}

// resource / lock scopes don't branch — look through them to the real parent
const SCOPE_HEAD_RE = /^(?:(?:async\s+)?with|using|lock|synchronized|unsafe)\b/;

function branchParent(e) {
    let p = e.parent;
    while (p && !p.kind && SCOPE_HEAD_RE.test(p.head)) p = p.parent;
    return p;
}

function detectNesting(scan, maxDepth, flagNestedIf) {
    const findings = [];
    for (const e of scan.entries) {
        if (!e.kind) continue;

        const outer = branchParent(e);
        if (flagNestedIf && e.kind === 'if' && isPlainIf(e.head) &&
            outer && outer.kind === 'if' && !outer.nestedIfReported) {
            outer.nestedIfReported = true;
            const viaElse = /^else\s*:?$/.test(outer.head);
            findings.push({
                smellId: 'nested-if',
                line: e.line,
                message: viaElse
                    ? '`if` nested in bare `else` block'
                    : `\`if\` nested in \`if\` (outer at line ${outer.line})`,
                suggest: viaElse
                    ? '`else if` / `elif`, or invert the outer condition into a guard clause'
                    : 'a guard clause (invert + early return/continue) or one merged condition',
                refSlug: 'control-flow',
                signature: 'nested-if',
            });
        }

        if (maxDepth > 0 && e.depth > maxDepth) {
            let root = e;
            while (root.parent && root.parent.depth > 0) root = root.parent;
            if (root.deepFinding) {
                if (e.depth > root.deepFinding.depthSeen) {
                    root.deepFinding.depthSeen = e.depth;
                    root.deepFinding.message =
                        `control-flow nesting depth ${e.depth} (max ${maxDepth}) in block starting line ${root.line}`;
                }
                continue;
            }
            root.deepFinding = {
                smellId: 'deep-nesting',
                line: e.line,
                depthSeen: e.depth,
                message: `control-flow nesting depth ${e.depth} (max ${maxDepth}) in block starting line ${root.line}`,
                suggest: 'guard clauses, extracting the inner block to a function, or a dispatch map / Strategy when branches select behavior',
                refSlug: 'control-flow',
                signature: 'deep-nesting',
            };
            findings.push(root.deepFinding);
        }
    }
    for (const f of findings) delete f.depthSeen;
    return findings;
}

// --- else-after-return ------------------------------------------------------

const EXIT_KW = 'return|throw|raise|continue|break';

function elseAfterReturnBrace(masked) {
    const findings = [];
    const re = new RegExp('\\b(' + EXIT_KW + ')\\b[^;{}\\n]*(?:;|\\n)\\s*\\}\\s*else\\b', 'g');
    let m;
    let prevElse = -1;
    while ((m = re.exec(masked)) !== null) {
        // skip `if (x) return 1; } else` — the exit belongs to a brace-less inner if
        const lineStart = masked.lastIndexOf('\n', m.index) + 1;
        const before = masked.slice(lineStart, m.index).replace(/[\s{};]/g, '');
        if (before) continue;
        const elseIdx = m.index + m[0].length - 4;
        // one finding per chain: an exit inside the previous `else if` body is the same chain
        const sameChain = prevElse >= 0 &&
            countChar(masked.slice(prevElse, m.index), '{') - countChar(masked.slice(prevElse, m.index), '}') === 1;
        prevElse = elseIdx;
        re.lastIndex = elseIdx + 4;
        if (sameChain) continue;
        findings.push({
            smellId: 'else-after-return',
            line: lineOf(masked, elseIdx),
            message: `\`else\` after \`${m[1]}\``,
            suggest: 'dropping the `else` and dedenting its body (the branch above already exits)',
            refSlug: 'control-flow',
            signature: m[1],
        });
    }
    return findings;
}

function elseAfterReturnPy(logical) {
    const findings = [];
    const exitRe = new RegExp('^(' + EXIT_KW + ')\\b');
    const oneLinerRe = new RegExp('^(?:if|elif)\\b.*:\\s*(' + EXIT_KW + ')\\b');
    const elseRe = /^(?:else\s*:|elif\b)/;
    const reported = new Set(); // indents whose current if-chain already has a finding
    const push = (line, indent, kw) => {
        if (reported.has(indent)) return;
        reported.add(indent);
        findings.push(elseFinding(line, kw));
    };
    for (let k = 0; k + 1 < logical.length; k++) {
        const L = logical[k];
        const next = logical[k + 1];
        // a statement that is not elif/else ends every chain at or below its indent
        if (!elseRe.test(L.text)) {
            for (const i of Array.from(reported)) if (i >= L.indent) reported.delete(i);
        }
        if (!elseRe.test(next.text)) continue;

        // one-liner: `if x: return 1` then `else:` at the same indent
        const one = oneLinerRe.exec(L.text);
        if (one && next.indent === L.indent) {
            push(next.line, next.indent, one[1]);
            continue;
        }

        // block: exit is the last statement of an if/elif body whose header
        // sits at the `else` indent (rules out for-else / while-else / try-else)
        const ex = exitRe.exec(L.text);
        if (!ex || next.indent >= L.indent) continue;
        let p = k - 1;
        while (p >= 0 && logical[p].indent >= L.indent) p--;
        if (p < 0) continue;
        const header = logical[p];
        if (header.indent === next.indent && /^(?:if|elif)\b/.test(header.text)) {
            push(next.line, next.indent, ex[1]);
        }
    }
    return findings;
}

function elseFinding(line, kw) {
    return {
        smellId: 'else-after-return',
        line,
        message: `\`else\`/\`elif\` after \`${kw}\``,
        suggest: 'dropping the `else` and dedenting its body (the branch above already exits)',
        refSlug: 'control-flow',
        signature: kw,
    };
}

function detectElseAfterReturn(scan, langId) {
    return langId === 'py' ? elseAfterReturnPy(scan.logical) : elseAfterReturnBrace(scan.masked);
}

// --- conditional-ladder + scattered-discriminator ---------------------------

const LIT_SRC =
    String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|-?\d+(?:\.\d+)?|[A-Z]\w*(?:\.|::)[A-Za-z_]\w*`;
const SUBJ_SRC = String.raw`[A-Za-z_][\w.]*(?:\(\))?`;
const CMP_RE = new RegExp('(' + SUBJ_SRC + ')\\s*(?:===|!==|==|!=)\\s*(' + LIT_SRC + ')');
const EQUALS_RE = new RegExp('(' + SUBJ_SRC + ')\\.equals\\(\\s*(' + LIT_SRC + ')\\s*\\)');
const EQUALS_REV_RE = /("(?:[^"\\\n]|\\.)*")\.equals\(\s*([A-Za-z_][\w.]*)\s*\)/;
const BRANCH_RE = /^([ \t]*)(?:\}\s*)?(else\s+if|elif|if)\b(.*)$/;
const NULLISH = /^(?:null|nil|None|undefined|true|false|True|False)$/;

function comparisonIn(cond) {
    if (/&&|\|\||\band\b|\bor\b/.test(cond)) return null; // compound — not a discriminator
    let m = CMP_RE.exec(cond) || EQUALS_RE.exec(cond);
    if (m) return { subject: m[1], literal: m[2] };
    m = EQUALS_REV_RE.exec(cond);
    if (m) return { subject: m[2], literal: m[1] };
    return null;
}

function isNamedLiteral(lit) {
    // string or enum member — numbers are usually thresholds, not variants
    return /^['"]/.test(lit) || /^[A-Z]\w*(?:\.|::)/.test(lit);
}

function hasExhaustiveMarker(body) {
    return /assertNever|assert_never|:\s*never\b|\bexhaustive\b|unreachable/i.test(body);
}

/** Sites of `switch x {` / `x switch {` / `match x:` whose body is not marked exhaustive. */
function switchSites(text, masked, langId, logical) {
    const sites = [];
    if (langId === 'rust') return sites; // `match` is compiler-checked exhaustive
    if (langId === 'py') {
        logical.forEach((L, idx) => {
            const m = /^match\s+([A-Za-z_][\w.]*)\s*:$/.exec(L.text);
            if (!m) return;
            let body = '';
            for (let k = idx + 1; k < logical.length && logical[k].indent > L.indent; k++) body += logical[k].text + '\n';
            if (!hasExhaustiveMarker(body)) sites.push({ subject: m[1], line: L.line });
        });
        return sites;
    }
    const re = /\bswitch\s*\(?\s*([A-Za-z_][\w.]*)\s*\)?\s*\{|([A-Za-z_][\w.]*)\s+switch\s*\{/g;
    let m;
    while ((m = re.exec(masked)) !== null) {
        const open = m.index + m[0].length;
        let depth = 1;
        let i = open;
        while (i < text.length && depth > 0) {
            if (masked[i] === '{') depth++;
            else if (masked[i] === '}') depth--;
            i++;
        }
        if (!hasExhaustiveMarker(text.slice(open, i))) {
            sites.push({ subject: m[1] || m[2], line: lineOf(masked, m.index) });
        }
    }
    return sites;
}

function detectConditionals(text, scan, langId, ladderMin, scatteredMin) {
    const findings = [];
    if (ladderMin <= 0 && scatteredMin <= 0) return findings;

    // comments blanked, string literals kept — they are the discriminator values
    const src = maskCode(text, langId, true);
    const lines = src.split('\n');
    const chains = {}; // subject → [{ line, indent, branches, named }]
    for (let k = 0; k < lines.length; k++) {
        const b = BRANCH_RE.exec(lines[k]);
        if (!b) continue;
        const cmp = comparisonIn(b[3]);
        if (!cmp || NULLISH.test(cmp.literal)) continue;
        const indent = indentOf(b[1]);
        const isElse = b[2] !== 'if';
        const list = chains[cmp.subject] || (chains[cmp.subject] = []);
        const last = list[list.length - 1];
        if (isElse && last && last.indent === indent) {
            last.branches++;
            last.named = last.named || isNamedLiteral(cmp.literal);
        } else {
            list.push({ line: k + 1, indent, branches: 1, named: isNamedLiteral(cmp.literal) });
        }
    }

    for (const [subject, list] of Object.entries(chains)) {
        if (ladderMin <= 0) break;
        for (const c of list) {
            if (c.branches < ladderMin) continue;
            findings.push({
                smellId: 'conditional-ladder',
                line: c.line,
                message: `if/else-if ladder on \`${subject}\` (${c.branches} branches)`,
                suggest: 'a dispatch map (Tier 0), or Strategy when each branch carries real behavior',
                refSlug: 'control-flow',
                signature: `${subject}|${c.branches}`,
            });
        }
    }

    if (scatteredMin > 0) {
        const sites = {};
        for (const [subject, list] of Object.entries(chains)) {
            for (const c of list) if (c.named) (sites[subject] = sites[subject] || []).push(c.line);
        }
        for (const s of switchSites(text, scan.masked, langId, scan.logical)) {
            (sites[s.subject] = sites[s.subject] || []).push(s.line);
        }
        for (const [subject, lineNos] of Object.entries(sites)) {
            if (lineNos.length < scatteredMin) continue;
            const sorted = lineNos.slice().sort((a, b) => a - b);
            findings.push({
                smellId: 'scattered-discriminator',
                line: sorted[0],
                message: `\`${subject}\` compared to literals at ${sorted.length} sites (lines ${sorted.join(', ')})`,
                suggest: 'State / Strategy / polymorphism — one place decides per variant, not every caller',
                refSlug: 'control-flow',
                signature: `${subject}|${sorted.length}`,
                sites: sorted,
            });
        }
    }
    return findings;
}

// --- n-plus-one -------------------------------------------------------------

// Calls that almost always mean a network / DB round-trip. `query`/`execute`/
// `Exec`/`Query` require an argument so zero-arg Command.execute() is not hit.
const DEFAULT_IO_CALLS = [
    String.raw`\bfetch\s*\(`,
    String.raw`\baxios(?:\.\w+)?\s*\(`,
    String.raw`\brequests\.(?:get|post|put|patch|delete|head|request)\s*\(`,
    String.raw`\bhttpx\.\w+\s*\(`,
    String.raw`\bhttp\.(?:Get|Post|Head|PostForm)\s*\(`,
    String.raw`\breqwest::\w+`,
    String.raw`\.(?:query|execute|executemany|Query|QueryRow|QueryContext|QueryRowContext|Exec|ExecContext)\s*\(\s*[^)\s]`,
    String.raw`\.(?:executeQuery|executeUpdate|executeScalar|ExecuteScalar|ExecuteReader|ExecuteNonQuery)\s*\(`,
    String.raw`\.(?:findOne|findUnique|findFirst|findById|findByPk|findMany|findOneBy|findBy[A-Z]\w*|getById|getOne)\s*\(`,
    String.raw`\.objects\.\w+\s*\(`,
    String.raw`\bget_object_or_404\s*\(`,
    String.raw`\.(?:fetchone|fetchall|fetchmany|fetch_one|fetch_all|fetch_optional)\s*\(`,
    String.raw`\.(?:SaveChanges|SaveChangesAsync|FirstOrDefaultAsync|SingleOrDefaultAsync|ToListAsync|FindAsync|GetAsync|PostAsync|SendAsync|GetStringAsync)\s*\(`,
    String.raw`\b\w*(?:[Rr]epo(?:sitory)?|[Dd]ao|[Dd]b|[Ee]ntity[Mm]anager|em|[Cc]ollection|[Ss]tore)\.(?:save|saveAndFlush|persist|merge|insert|insertOne|update|updateOne|delete|deleteOne|upsert)\s*\(`,
    String.raw`\.(?:insertOne|updateOne|deleteOne|findOneAndUpdate|bulkWrite)\s*\(`,
];
const AWAIT_RE = /\bawait\b(?!\s+(?:asyncio\.sleep|sleep|delay|Task\.Delay|setTimeout|new\s+Promise))|\.await\b/;
const ITER_CALL_RE = /\.(?:forEach|map|flatMap|for_each|ForEach|Select|SelectMany|each)\s*\(/g;

function buildIoRe(cfg) {
    const extra = Array.isArray(cfg.extraCallPatterns) ? cfg.extraCallPatterns : [];
    return new RegExp(DEFAULT_IO_CALLS.concat(extra).join('|'));
}

/** Loop bodies as [{ line, start, end }] char ranges (brace) or line ranges (python). */
function loopRanges(scan, langId) {
    const ranges = [];
    if (langId === 'py') {
        const L = scan.logical;
        for (const e of scan.entries) {
            if (e.kind !== 'loop') continue;
            let k = e.logicalIndex + 1;
            while (k < L.length && L[k].indent > e.indent) k++;
            ranges.push({ line: e.line, from: e.logicalIndex + 1, to: k });
        }
        return ranges;
    }
    for (const e of scan.entries) {
        if (e.kind === 'loop') ranges.push({ line: e.line, from: e.bodyStart, to: e.bodyEnd });
    }
    const m = scan.masked;
    let it;
    ITER_CALL_RE.lastIndex = 0;
    while ((it = ITER_CALL_RE.exec(m)) !== null) {
        let depth = 1;
        let i = it.index + it[0].length;
        const from = i;
        while (i < m.length && depth > 0) {
            if (m[i] === '(') depth++;
            else if (m[i] === ')') depth--;
            i++;
        }
        ranges.push({ line: lineOf(m, it.index), from, to: i - 1 });
    }
    return ranges;
}

function detectNPlusOne(scan, langId, cfg) {
    const findings = [];
    const ioRe = buildIoRe(cfg);
    const flagAwait = cfg.flagAwaitInLoop !== false;
    const claimed = new Set(); // io line numbers already reported (innermost loop wins)

    const hit = (text) => {
        const io = ioRe.exec(text);
        if (io) return io[0].replace(/\s*\(\s*[^)]*$/, '(').trim();
        if (flagAwait && AWAIT_RE.test(text)) return 'await';
        return null;
    };
    const report = (ioLine, loopLine, call) => {
        if (claimed.has(ioLine)) return;
        claimed.add(ioLine);
        findings.push({
            smellId: 'n-plus-one',
            line: ioLine,
            message: call === 'await'
                ? `N+1: sequential \`await\` inside loop starting line ${loopLine} (one serial wait per item)`
                : `N+1: \`${call}\` inside loop starting line ${loopLine} (one round-trip per item)`,
            suggest: call === 'await'
                ? 'one batched call, or Promise.all / asyncio.gather / Task.WhenAll when the items are independent; ' +
                  'if ordering is required, suppress'
                : 'one batched call (IN / join / bulk endpoint), eager loading, or a DataLoader; ' +
                  'if it is intentional pagination, suppress',
            refSlug: 'control-flow',
            signature: call,
        });
    };

    const ranges = loopRanges(scan, langId).sort((a, b) => b.line - a.line); // innermost first
    if (langId === 'py') {
        const L = scan.logical;
        for (const r of ranges) {
            for (let k = r.from; k < r.to; k++) {
                const call = hit(L[k].text);
                if (call) report(L[k].line, r.line, call);
            }
        }
        // comprehensions: `[fetch(x) for x in xs]` on one logical line
        for (const l of L) {
            const comp = /[[({](.*?)\bfor\b\s+[\w, ()]+\s+\bin\b/.exec(l.text);
            if (!comp) continue;
            const call = hit(comp[1]);
            if (call) report(l.line, l.line, call);
        }
        return findings;
    }

    const m = scan.masked;
    for (const r of ranges) {
        const lines = m.slice(r.from, r.to).split('\n');
        let lineNo = lineOf(m, r.from);
        for (const text of lines) {
            const call = hit(text);
            if (call) report(lineNo, r.line, call);
            lineNo++;
        }
    }
    return findings.sort((a, b) => a.line - b.line);
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

/** Keep a finding when it (or one of its sites) sits on an edited line. */
function inEditScope(finding, ranges) {
    if (!ranges) return true;
    const lines = finding.sites || [finding.line];
    return lines.some(l => ranges.some(([a, b]) => l >= a && l <= b));
}

// --- entry point ------------------------------------------------------------

/**
 * Run every enabled control-flow detector.
 * @param {string} text   file contents
 * @param {string} langId id from _languages.js (ts, py, java, cs, go, cpp, rust)
 * @param {object} s      merged `smells` config
 */
function detectAll(text, langId, s) {
    if (!langId) return [];
    const scan = scanBlocks(text, langId);
    const out = [];
    out.push(...detectNesting(scan, Number(s.maxNestingDepth) || 0, s.nestedIf !== false));
    if (s.elseAfterReturn !== false) out.push(...detectElseAfterReturn(scan, langId));
    out.push(...detectConditionals(
        text, scan, langId,
        Number(s.conditionalLadderMinBranches) || 0,
        Number(s.scatteredDiscriminatorMinSites) || 0,
    ));
    if (s.nPlusOne && s.nPlusOne.enabled !== false) out.push(...detectNPlusOne(scan, langId, s.nPlusOne));
    return out;
}

module.exports = {
    detectAll,
    editedLineRanges,
    inEditScope,
    maskCode,
    hasExhaustiveMarker,
    DEFAULT_IO_CALLS,
};
