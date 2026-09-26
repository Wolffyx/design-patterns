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
 *
 * Block scanning (brace stack / Python indentation, comment + string
 * masking) lives in _code-scan.js; N+1 detection in _nplusone.js.
 */

'use strict';

const {
    maskCode, lineOf, indentOf, SCOPE_HEAD_RE,
} = require('./_code-scan');

// --- nested-if + deep-nesting -----------------------------------------------

function isPlainIf(head) {
    return /^(?:async\s+)?if\b/.test(head);
}

// resource / lock scopes (SCOPE_HEAD_RE) don't branch — look through them
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

/** From `from`, did we enter exactly one block and stay in it (never leaving the scope)? */
function insideNextBlock(text, from, to) {
    let depth = 0;
    for (let i = from; i < to; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}' && --depth < 0) return false;
    }
    return depth === 1;
}

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
        const sameChain = prevElse >= 0 && insideNextBlock(masked, prevElse, m.index);
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
const EQUALS_REV_RE = /("(?:[^"\\\n]|\\.)*")\.equals\(\s*([A-Za-z_][\w.]*(?:\(\))?)\s*\)/;
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

// --- entry point ------------------------------------------------------------

/**
 * Run every enabled control-flow detector.
 * @param {object} scan  result of _code-scan.scanBlocks
 * @param {object} s     merged `smells` config
 */
function detectAll(scan, s) {
    const out = [];
    out.push(...detectNesting(scan, Number(s.maxNestingDepth) || 0, s.nestedIf !== false));
    if (s.elseAfterReturn !== false) out.push(...detectElseAfterReturn(scan, scan.langId));
    out.push(...detectConditionals(
        scan.text, scan, scan.langId,
        Number(s.conditionalLadderMinBranches) || 0,
        Number(s.scatteredDiscriminatorMinSites) || 0,
    ));
    return out;
}

module.exports = {
    detectAll,
    hasExhaustiveMarker,
};
