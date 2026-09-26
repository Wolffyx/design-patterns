/**
 * _nplusone.js — N+1 detection: one round-trip (query, HTTP call, write) per
 * item of a collection.
 *
 * A finding needs a loop that iterates a collection and an I/O call inside
 * its body. Each call is graded by how sure we are it is a round-trip:
 *
 *   high    known driver / ORM / HTTP API (`.findUnique(`, `cursor.execute(sql`,
 *           `fetch(`, `requests.get(`, `db.QueryRow(`, …) or a configured
 *           `extraCallPatterns` entry
 *   medium  any method on a data-access receiver (`userRepo.x(`, `api.x(`,
 *           `this.client.x(`); a same-file function that (transitively) does
 *           I/O; a lazy-loaded relation read on ORM rows fetched without eager
 *           loading; a GraphQL field resolver querying per parent
 *   low     a sequential `await` with no recognised I/O call — reported as a
 *           separate smell, `await-in-loop`
 *
 * …and classified by what the fix is:
 *
 *   per-item    the call depends on the loop variable      → batch it
 *   invariant   nothing in the call depends on the loop    → hoist it
 *   write       save / insert / update per item            → bulk write
 *   concurrent  inside Promise.all / gather / WhenAll      → still N round-trips
 *
 * Skipped by default: `while` / `do` / `loop` loops (pagination, polling,
 * retry — each round-trip depends on the last), and loops over literal
 * collections or literal ranges ≤ smallLoopMax.
 */

'use strict';

const {
    lineOf, balancedEnd, extractFunctions, paramName, bodyText,
} = require('./_code-scan');
const { buildMatchers, ioCalls, localIoFunctions, rootCall } = require('./_io-calls');
const ioIndex = require('./_io-index');

// --- call catalogs ------------------------------------------------------------

const WRITE_NAME_RE = /^(?:save\w*|insert\w*|update\w*|upsert\w*|delete\w*|remove|persist|merge|create\w*|put\w*|executemany|executeUpdate|ExecuteNonQuery|SaveChanges\w*|bulkWrite)$/i;

const AWAIT_RE = /\bawait\b(?!\s+(?:asyncio\.sleep|sleep|delay|Task\.Delay|setTimeout|new\s+Promise|tick|nextTick))|\.await\b/;
const CONCURRENT_RE = /\b(?:Promise\.(?:all|allSettled|any|race)|asyncio\.gather|gather|Task\.WhenAll|WhenAll|join_all|try_join_all|forkJoin|errgroup|pMap|pLimit|Bluebird\.map)\s*\(\s*\*?\s*[([]?\s*$/;

const ITER_CALL_RE = /\.(forEach|map|flatMap|for_each|ForEach|Select|SelectMany|each|filter_map|flat_map|then)\s*\(/g;
const LOOP_VAR_STOP = new Set([
    'const', 'let', 'var', 'val', 'mut', 'ref', 'auto', 'final', 'int', 'long',
    'string', 'async', 'await', 'in', 'of', 'range', 'for', 'function',
]);

// ORM query producing rows whose relations may lazy-load, and eager-load markers.
const ORM_FETCH_RE = /\.objects\.|\bsession\.(?:query|scalars|execute)\(|\.query\(\s*[A-Z]|\.find(?:All|Many)\(|\.findBy\w*\(|\.getResultList\(|\.ToList(?:Async)?\(|\.Find\(\s*&|\bselect\(\s*[A-Z]\w*\s*\)|\.createQueryBuilder\(|\.all\(\s*\)|\.filter\(|\.where\(/;
const EAGER_RE = /select_related|prefetch_related|selectinload|joinedload|subqueryload|contains_eager|join\s+fetch|EntityGraph|\.Include\(|\.ThenInclude\(|\binclude\s*:|\brelations\s*:|\.Preload\(|\.Joins\(|\.populate\(|AndSelect\(|eager_load|\.options\(|\.with\(/i;
const LAZY_ACCESS = {
    py: v => new RegExp(`\\b${v}\\.(\\w+)\\.(?:(?:all|count|filter|first|exists)\\(|[a-z_]\\w*)`),
    java: v => new RegExp(`\\b${v}\\.(get[A-Z]\\w*)\\(\\)\\.\\w+`),
    cs: v => new RegExp(`\\b${v}\\.([A-Z]\\w*)\\.[A-Z]\\w*`),
    ts: v => new RegExp(`\\bawait\\s+${v}\\.(\\w+)\\b`), // TypeORM lazy relations are promises
};

const RESOLVER_FILE_RE = /\bresolvers?\b|@Resolver\b|@ResolveField|@FieldResolver|@SchemaMapping|graphene\.|strawberry|ObjectType\b|GraphQL/;
const BATCHED_RE = /DataLoader|dataloader|BatchLoader|@BatchMapping|batch_load_fn|load_many|loadMany/;
const PARENT_PARAMS = new Set(['parent', 'root', 'obj', 'source', '_parent', '_root', 'self_', 'instance']);

const CONFIDENCE = { low: 0, medium: 1, high: 2 };

// --- helpers ------------------------------------------------------------------

function identifiers(pattern) {
    return (pattern.match(/[A-Za-z_$][\w$]*/g) || [])
        .filter(v => !LOOP_VAR_STOP.has(v) && !/^[A-Z]/.test(v) && v !== '_');
}

/** Index of the `[` / `(` matching the closer at `i`, or -1. */
function matchingOpenBefore(text, i) {
    const close = text[i];
    const open = close === ']' ? '[' : '(';
    let depth = 0;
    for (let k = i; k >= 0; k--) {
        depth += text[k] === close ? 1 : text[k] === open ? -1 : 0;
        if (depth === 0) return k;
    }
    return -1;
}

/** Start of the receiver chain ending right before `idx` (`a.b[i].c` in `a.b[i].c.find(`). */
function chainStart(text, idx) {
    let i = idx - 1;
    while (i >= 0) {
        const c = text[i];
        if (/[\w.$?!]/.test(c)) { i--; continue; }
        if (c !== ']' && c !== ')') break;
        i = matchingOpenBefore(text, i) - 1;
    }
    return Math.max(0, i + 1);
}

function callExtent(text, matchIdx, matchLen) {
    const start = chainStart(text, matchIdx);
    const open = text.indexOf('(', matchIdx);
    const end = open === -1 || open > matchIdx + matchLen + 1 ? matchIdx + matchLen : balancedEnd(text, open) + 1;
    return text.slice(start, end);
}

function mentions(text, vars) {
    for (const v of vars) if (new RegExp(`(^|[^\\w$])${v.replace(/\$/g, '\\$')}(?![\\w$])`).test(text)) return true;
    return false;
}

const ASSIGN_RE = /((?:[A-Za-z_$][\w$]*\s*,\s*)*[A-Za-z_$][\w$]*)\s*(?::\s*[\w<>[\]|, .?]+)?\s*(?::=|(?<![=!<>+\-*/%&|^:])=(?![=>]))\s*([^;\n]+)/g;

/** Names assigned (in `body`) from an expression that mentions a known name. */
function assignedFrom(body, known) {
    return [...body.matchAll(ASSIGN_RE)]
        .filter(m => mentions(m[2], known))
        .flatMap(m => m[1].split(',').map(x => x.trim()).filter(Boolean));
}

/** Loop vars plus every variable assigned (in the body) from something that uses them. */
function derivedVars(body, vars) {
    const out = new Set(vars);
    for (let pass = 0; pass < 3; pass++) {
        const fresh = assignedFrom(body, out).filter(v => !out.has(v));
        if (!fresh.length) break;
        fresh.forEach(v => out.add(v));
    }
    return out;
}

/** The element variable: `x` in `for i, x := range xs` / `for i, x in enumerate(xs)`. */
function itemVarOf(loop) {
    const indexed = loop.indexFirst || /\benumerate\(|\.enumerate\(\)|\.entries\(\)|\.items\(\)/.test(loop.iterable);
    return indexed && loop.vars.length > 1 ? loop.vars[1] : loop.vars[0];
}

function smallLiteral(iterable, max) {
    const it = iterable.trim();
    if (/^\[[^\]]*\]$/.test(it) || /^\([^()]*,[^()]*\)$/.test(it) || /^\{[^{}]*\}$/.test(it)) return true;
    const range = /^range\(\s*(?:\d+\s*,\s*)?(\d+)\s*\)$/.exec(it) || /^\(?\s*\d+\s*\.\.=?\s*(\d+)\s*\)?$/.exec(it);
    return Boolean(range) && Number(range[1]) <= max;
}

// --- loops ----------------------------------------------------------------------

/**
 * Loop descriptors: { kind: 'for'|'while'|'iter'|'comp', line, vars, iterable,
 * from, to, concurrent }. Brace langs: from/to are char offsets into
 * scan.masked; Python: logical-line indices ('comp': one logical line).
 */
function cStyleLoop(r, cfg) {
    const bound = /[<>]=?\s*(\d+)\s*$/.exec(r[2].trim());
    return {
        vars: identifiers((/(?:let|var|int|auto|size_t|long|unsigned|usize|:=)?\s*([A-Za-z_]\w*)\s*:?=/.exec(r[1]) || [])[1] || ''),
        iterable: bound && Number(bound[1]) <= cfg.smallLoopMax ? '[]' : r[2],
    };
}

const forEachLoop = r => ({ vars: identifiers(r[1]), iterable: r[2] });

function goRangeLoop(r) {
    const names = r[1] || '';
    return { vars: identifiers(names), iterable: r[2], indexFirst: names.includes(',') && !/^\s*_\s*,/.test(names) };
}

// Loop heads, first match wins. `while`-shaped loops (pagination, polling) are skipped later.
const LOOP_SHAPES = [
    [/^(?:while|do|loop)\b/, () => ({ kind: 'while' })],
    [/^for\s*\((.*?);(.*?);(.*)\)$/, cStyleLoop],
    [/^for\s+([^;{]*?);([^;{]*);(.*)$/, cStyleLoop],
    [/^for\s*(?:await\s*)?\(\s*(?:const|let|var)\s+(.+?)\s+(?:of|in)\s+(.+)\)$/, forEachLoop],
    [/^foreach\s*\(\s*(?:var|[\w<>[\],.?]+)\s+(\([^)]*\)|\w+)\s+in\s+(.+)\)$/, forEachLoop],
    [/^for\s*\(\s*(?:final\s+)?[\w<>[\],.?&*:\s]*?\s*&?\s*(\[[^\]]*\]|[A-Za-z_]\w*)\s*:\s*(.+)\)$/, forEachLoop],
    [/^for\s+(?:([\w\s,]+?)\s*:?=\s*)?range\s+(.+)$/, goRangeLoop],
    [/^for\s+(.+?)\s+in\s+(.+)$/, forEachLoop],
    [/^for\s*\{?$|^for\s+[^;]+$/, () => ({ kind: 'while' })], // Go `for {` / `for cond {`
];

function loopShape(head, cfg) {
    for (const [re, build] of LOOP_SHAPES) {
        const r = re.exec(head);
        if (r) return { kind: 'for', vars: [], iterable: '', ...build(r, cfg) };
    }
    return { kind: 'for', vars: [], iterable: '' };
}

/** `.forEach(x => …)`, `.map(async (x) => …)`, Rust `.for_each(|x| …)`. */
function iteratorLoops(m) {
    return [...m.matchAll(ITER_CALL_RE)]
        .filter(it => it[1] !== 'then')
        .map(it => {
            const open = it.index + it[0].length - 1;
            const close = balancedEnd(m, open);
            const lambda = /^\s*(?:async\s+)?(?:\(([^)]*)\)|\|([^|]*)\||function\s*\w*\s*\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?:=>|->|\{|[^,]*?=>)?/.exec(m.slice(open + 1, close));
            if (!lambda) return null;
            const params = lambda[1] || lambda[2] || lambda[3] || lambda[4] || '';
            const recvStart = chainStart(m, it.index);
            const lineStart = m.lastIndexOf('\n', recvStart) + 1;
            const before = m.slice(Math.max(0, lineStart - 200), recvStart);
            return {
                kind: 'iter',
                line: lineOf(m, it.index),
                vars: identifiers(params),
                iterable: m.slice(recvStart, it.index),
                from: open + 1,
                to: close,
                concurrent: CONCURRENT_RE.test(before.replace(/\s+/g, ' ')),
            };
        })
        .filter(Boolean);
}

function braceLoops(scan, cfg) {
    const statements = scan.entries
        .filter(e => e.kind === 'loop')
        .map(e => ({ line: e.line, from: e.bodyStart, to: e.bodyEnd, concurrent: false, indexFirst: false, ...loopShape(e.head, cfg) }));
    return statements.concat(iteratorLoops(scan.masked));
}

function pyLoops(scan) {
    const loops = [];
    for (const e of scan.entries) {
        if (e.kind !== 'loop') continue;
        const r = /^(?:async\s+)?for\s+(.+?)\s+in\s+(.+):$/.exec(e.head);
        loops.push({
            kind: r ? 'for' : 'while',
            line: e.line,
            vars: r ? identifiers(r[1]) : [],
            iterable: r ? r[2] : '',
            from: e.logicalIndex + 1,
            to: e.bodyTo,
            concurrent: false,
        });
    }
    scan.logical.forEach((L, idx) => {
        const c = /[[({](.*?)\bfor\s+([\w, ()]+?)\s+in\s+([^\]})]+?)(?:\s+if\b|[\]})])/.exec(L.text);
        if (!c || /^(?:async\s+)?for\b/.test(L.text)) return;
        loops.push({
            kind: 'comp',
            line: L.line,
            vars: identifiers(c[2]),
            iterable: c[3],
            from: idx,
            to: idx + 1,
            element: c[1],
            concurrent: /\bgather\s*\(\s*\*/.test(L.text),
        });
    });
    return loops;
}

/** A searchable region for a loop body with a line lookup. */
function region(scan, loop) {
    if (scan.langId !== 'py') {
        const text = scan.masked.slice(loop.from, loop.to);
        return { text, lineAt: i => lineOf(scan.masked, loop.from + i), key: i => loop.from + i };
    }
    if (loop.kind === 'comp') {
        return { text: loop.element, lineAt: () => loop.line, key: i => `${loop.line}:${i}` };
    }
    const parts = [];
    const starts = [];
    let pos = 0;
    for (let k = loop.from; k < loop.to; k++) {
        starts.push({ pos, line: scan.logical[k].line });
        parts.push(scan.logical[k].text);
        pos += scan.logical[k].text.length + 1;
    }
    const lineAt = i => {
        let line = loop.line;
        for (const s of starts) { if (s.pos > i) break; line = s.line; }
        return line;
    };
    return { text: parts.join('\n'), lineAt, key: i => `${lineAt(i)}:${i}` };
}

// --- detectors ---------------------------------------------------------------------

// what each kind of finding says, and the fix it points at
const KIND_TEXT = {
    invariant: (what, loop) => ({
        message: `loop-invariant I/O: ${what} doesn't depend on the loop (line ${loop.line}) but runs every iteration`,
        suggest: 'hoisting the call above the loop and reusing the result',
    }),
    write: (what, loop, itemVar) => ({
        message: `N writes: ${what} once per ${itemVar} (loop line ${loop.line})`,
        suggest: 'one bulk write (saveAll / bulk_create / executemany / AddRange + one SaveChanges / insertMany)',
    }),
    'per-item': (what, loop, itemVar) => ({
        message: `N+1: ${what} once per ${itemVar} (loop line ${loop.line})`,
        suggest: 'one batched call (IN / = ANY / findMany by ids / bulk endpoint) before the loop, then a map lookup; ' +
            'eager-load relations; DataLoader for resolvers',
    }),
};

/** `svc.get()` (does `.findUnique(`, src/users.ts:12) — where the round-trip really happens. */
function describeCall(hit) {
    if (!hit.via) return `\`${hit.call}\``;
    const root = rootCall(hit.via);
    const where = root.file ? `${root.file}:${root.line}` : `line ${root.line}`;
    return `\`${hit.call}\` (does \`${root.call}\`, ${where})`;
}

function describe(hit, loop, dependent, parentLoop) {
    const kind = !dependent ? 'invariant' : WRITE_NAME_RE.test(hit.name) ? 'write' : 'per-item';
    const itemVar = loop.vars.length ? `\`${itemVarOf(loop)}\`` : 'item';
    const text = KIND_TEXT[kind](describeCall(hit), loop, itemVar);
    let message = text.message;
    if (loop.concurrent) message += ' — concurrent, but still N round-trips';
    if (parentLoop) message += ` — nested in loop line ${parentLoop.line}: N×M round-trips`;
    if (hit.confidence === 'medium' && !hit.via) message = message.replace(/^N\+1:/, 'N+1 (likely):');
    return { kind, message, suggest: text.suggest };
}

function enclosing(loops, loop, scan) {
    let best = null;
    for (const o of loops) {
        if (o === loop || o.kind === 'while' || o.kind === 'comp' || loop.kind === 'comp') continue;
        const inside = scan.langId === 'py'
            ? o.from <= loop.from - 1 && loop.from <= o.to
            : o.from <= loop.from && loop.to <= o.to;
        if (inside && (!best || o.to - o.from < best.to - best.from)) best = o;
    }
    return best;
}

/** First claim of a key wins (a call belongs to its innermost loop). */
function claim(claimed, key) {
    if (claimed.has(key)) return false;
    claimed.add(key);
    return true;
}

function skipLoop(loop, cfg) {
    return (loop.kind === 'while' && !cfg.includeWhileLoops) || smallLiteral(loop.iterable, cfg.smallLoopMax);
}

function ioFindingsFor(ctx, loop, reg) {
    const vars = derivedVars(reg.text, loop.vars);
    const parent = enclosing(ctx.all, loop, ctx.scan);
    const nestedIn = parent && parent.kind !== 'while' ? parent : null;
    const hits = ioCalls(reg.text, ctx.matchers, ctx.known);
    hits.forEach(h => ctx.ioLines.add(reg.lineAt(h.index)));
    return hits
        .filter(h => CONFIDENCE[h.confidence] >= ctx.minConf)
        .filter(h => claim(ctx.claimed, reg.key(h.index)))
        .map(h => {
            const dependent = vars.size === 0 || mentions(callExtent(reg.text, h.index, h.len), vars);
            const d = describe(h, loop, dependent, nestedIn);
            return {
                smellId: 'n-plus-one',
                line: reg.lineAt(h.index),
                message: d.message,
                suggest: d.suggest,
                refSlug: 'control-flow',
                signature: `${d.kind}|${h.name}`,
                confidence: h.confidence,
            };
        });
}

function awaitFindingsFor(ctx, loop, reg) {
    if (ctx.cfg.flagAwaitInLoop === false || loop.concurrent || loop.kind === 'comp') return [];
    let pos = 0;
    return reg.text.split('\n')
        .map(l => {
            const line = reg.lineAt(pos);
            pos += l.length + 1;
            return { l, line };
        })
        .filter(x => AWAIT_RE.test(x.l) && !ctx.ioLines.has(x.line) && claim(ctx.claimed, `await:${x.line}`))
        .map(x => ({
            smellId: 'await-in-loop',
            line: x.line,
            message: `sequential \`await\` inside loop starting line ${loop.line} (one wait per item)`,
            suggest: 'Promise.all / asyncio.gather / Task.WhenAll (bounded) when iterations are independent; ' +
                'if each step needs the previous one, suppress',
            refSlug: 'control-flow',
            signature: 'await',
            confidence: 'low',
        }));
}

function detectLoops(scan, cfg, matchers, known) {
    const all = scan.langId === 'py' ? pyLoops(scan) : braceLoops(scan, cfg);
    const ctx = {
        scan, cfg, matchers, known, all,
        minConf: CONFIDENCE[cfg.minConfidence] ?? CONFIDENCE.medium,
        claimed: new Set(),
        ioLines: new Set(), // any loop's I/O line — never also an await-in-loop
    };
    // innermost first, so a call is attributed to the tightest loop
    const findings = all.slice()
        .sort((a, b) => (a.to - a.from) - (b.to - b.from))
        .filter(loop => !skipLoop(loop, cfg))
        .flatMap(loop => {
            const reg = region(scan, loop);
            return ioFindingsFor(ctx, loop, reg).concat(awaitFindingsFor(ctx, loop, reg));
        });
    return { findings, loops: all };
}

/** What a loop iterates: the expression, or what the identifier was last assigned from. */
function iterableSource(scan, loop) {
    const source = loop.iterable.replace(/^\s*await\s+/, '').trim();
    const ident = /^([A-Za-z_$][\w$.]*)$/.exec(source);
    if (!ident) return source;
    const before = scan.langId === 'py'
        ? scan.logical.slice(0, loop.from).map(l => l.text).join('\n')
        : scan.masked.slice(0, loop.from);
    const re = new RegExp(`(?:^|[^\\w$.])${ident[1].replace(/[.$]/g, '\\$&')}\\s*(?::\\s*[^=\\n]+)?(?::=|=)(?!=)\\s*([^;\\n]+(?:\\n\\s*\\.[^;\\n]+)*)`, 'g');
    const assigned = [...before.matchAll(re)].map(m => m[1]);
    return assigned.length ? assigned[assigned.length - 1] : source;
}

/** ORM rows fetched without eager loading, then a relation read per row. */
function detectLazyLoads(scan, loops) {
    const access = LAZY_ACCESS[scan.langId];
    if (!access) return [];
    return loops
        .filter(loop => loop.kind !== 'while' && loop.vars.length)
        .map(loop => ({ loop, source: iterableSource(scan, loop) }))
        .filter(x => ORM_FETCH_RE.test(x.source) && !EAGER_RE.test(x.source))
        .map(({ loop, source }) => {
            const reg = region(scan, loop);
            const hit = access(loop.vars[0]).exec(reg.text);
            return hit && {
                smellId: 'n-plus-one',
                line: reg.lineAt(hit.index),
                message: `N+1 (possible lazy load): \`${hit[0].replace(/^await\s+/, '')}\` per row of \`${source.slice(0, 60).trim()}\` fetched without eager loading`,
                suggest: 'eager-load the relation in the query (select_related / prefetch_related / selectinload / ' +
                    'JOIN FETCH / .Include / relations) or batch-load by ids',
                refSlug: 'control-flow',
                signature: `lazy|${hit[1]}`,
                confidence: 'medium',
            };
        })
        .filter(Boolean);
}

/** GraphQL field resolvers that query once per parent object. */
function detectResolvers(scan, fns, matchers, known) {
    if (BATCHED_RE.test(scan.text)) return [];
    const resolverFile = RESOLVER_FILE_RE.test(scan.text);
    const findings = [];
    const check = (name, parentVar, body, line) => {
        for (const hit of ioCalls(body, matchers, known)) {
            if (!mentions(callExtent(body, hit.index, hit.len), [parentVar])) continue;
            findings.push({
                smellId: 'n-plus-one',
                line,
                message: `N+1 in resolver \`${name}\`: \`${hit.call}\` runs once per parent \`${parentVar}\``,
                suggest: 'a DataLoader (batch + per-request cache) keyed by the parent id',
                refSlug: 'control-flow',
                signature: `resolver|${name}`,
                confidence: 'medium',
            });
            return;
        }
    };
    for (const fn of fns) {
        const first = fn.params[0];
        if (!first) continue;
        const decorated = /@Parent\(\)|@Root\(\)/.exec(first);
        const pv = paramName(first.replace(/@\w+\(\)\s*/, ''), scan.langId);
        if (!decorated && !PARENT_PARAMS.has(pv)) continue;
        // graphene convention `resolve_<field>(root, info)` needs no file marker
        if (!resolverFile && !decorated && !/^resolve_\w+/.test(fn.name)) continue;
        check(fn.name, pv, bodyText(scan, fn.entry), fn.line);
    }
    if (!resolverFile) return findings;
    // expression-bodied TS resolvers: `author: (parent, _, ctx) => ctx.db.user.find(parent.authorId)`
    const re = /([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?\(\s*([A-Za-z_$][\w$]*)[^)]*\)\s*=>\s*(?!\{)([^\n]+)/g;
    let m;
    while ((m = re.exec(scan.masked)) !== null) {
        if (PARENT_PARAMS.has(m[2])) check(m[1], m[2], m[3], lineOf(scan.masked, m.index));
    }
    return findings;
}

// --- entry point -------------------------------------------------------------------

/**
 * @param {object} scan  _code-scan.scanBlocks result
 * @param {object} cfg   merged `smells.nPlusOne` config
 */
/**
 * What this file knows does I/O: its own helpers (transitively) plus — when
 * `crossFile.enabled` — imported functions, namespaces and injected services.
 */
function knownIo(scan, c, matchers, filePath, fns) {
    if (c.followLocalFunctions === false) return { functions: new Map(), receivers: new Map() };
    const external = c.crossFile && c.crossFile.enabled !== false && filePath
        ? ioIndex.crossFileIo(scan, filePath, c, matchers)
        : { functions: new Map(), receivers: new Map() };
    const local = localIoFunctions(scan, fns, matchers, external);
    return { functions: new Map([...external.functions, ...local]), receivers: external.receivers };
}

/**
 * @param {object} scan      _code-scan.scanBlocks / _ts-scan.scan result
 * @param {object} cfg       merged `smells.nPlusOne` config
 * @param {string} filePath  enables cross-file resolution of imported helpers / services
 */
function detect(scan, cfg, filePath) {
    if (!cfg || cfg.enabled === false) return [];
    const c = { smallLoopMax: 10, minConfidence: 'medium', ...cfg };
    const matchers = buildMatchers(c);
    const fns = extractFunctions(scan);
    const known = knownIo(scan, c, matchers, filePath, fns);
    const { findings, loops } = detectLoops(scan, c, matchers, known);
    if (c.lazyLoad !== false) findings.push(...detectLazyLoads(scan, loops));
    if (c.resolvers !== false) findings.push(...detectResolvers(scan, fns, matchers, known));
    const seen = new Set();
    return findings
        .filter(f => {
            const k = `${f.smellId}:${f.line}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        })
        .sort((a, b) => a.line - b.line);
}

module.exports = { detect };
