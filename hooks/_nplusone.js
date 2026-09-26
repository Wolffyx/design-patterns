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

// --- call catalogs ------------------------------------------------------------

// Round-trips for sure. `query` / `execute` / `Exec` / `Query` need an
// argument so a zero-arg Command.execute() never matches.
const HIGH_CALLS = [
    String.raw`\bfetch\s*\(`,
    String.raw`\baxios(?:\.\w+)?\s*\(`,
    String.raw`\b(?:requests|httpx|aiohttp)\.\w+\s*\(`,
    String.raw`\burllib\.request\.urlopen\s*\(`,
    String.raw`\bhttp\.(?:Get|Post|Head|PostForm)\s*\(`,
    String.raw`\breqwest::\w+`,
    String.raw`\.(?:query|execute|executemany|Query|QueryRow|QueryContext|QueryRowContext|Exec|ExecContext)\s*\(\s*[^)\s]`,
    String.raw`\.(?:executeQuery|executeUpdate|executeScalar|ExecuteScalar|ExecuteReader|ExecuteNonQuery|queryForObject|queryForList)\s*\(`,
    String.raw`\.(?:findOne|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|findById|findByPk|findMany|findOneBy|findAndCount|findBy[A-Z]\w*|getById|getOne|getReferenceById)\s*\(`,
    String.raw`\.objects\.\w+\s*\(`,
    String.raw`\bget_object_or_404\s*\(`,
    String.raw`\bsession\.(?:get|scalar|scalars|merge|refresh)\s*\(\s*[A-Z]`,
    String.raw`\.(?:fetchone|fetchall|fetchmany|fetch_one|fetch_all|fetch_optional|fetchrow|fetchval)\s*\(`,
    String.raw`\.(?:FirstOrDefaultAsync|SingleOrDefaultAsync|FirstAsync|SingleAsync|ToListAsync|FindAsync|AnyAsync|CountAsync|SaveChanges|SaveChangesAsync|GetAsync|PostAsync|PutAsync|SendAsync|GetStringAsync|GetFromJsonAsync)\s*\(`,
    String.raw`\.(?:insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|bulkWrite|countDocuments)\s*\(`,
    String.raw`\b(?:sqlx::query(?:_as|_scalar)?!?|diesel::\w+)`,
];

// Method calls on these receivers are almost always I/O. A receiver is a whole
// identifier: camelCase with the suffix capitalised (`userRepo`, `httpClient`),
// snake_case (`user_repo`), or exactly one of the lowercase names — never a
// substring (`item` must not match `em`).
const DEFAULT_RECEIVERS = String.raw`(?:[A-Za-z_]\w*?(?:Repo|Repository|Dao|DAO|Client|Api|API|Gateway|Db|DB|DbContext|EntityManager|Sdk|SDK)` +
    String.raw`|(?:[a-z_]\w*_)?(?:repo|repository|dao|client|api|gateway|db|http_client|sdk)` +
    String.raw`|prisma|knex|em|entityManager|http|httpClient|supabase|firestore|redis|mongo|s3|dynamo|dynamodb)`;

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

/** Start of the receiver chain ending right before `idx` (`a.b[i].c` in `a.b[i].c.find(`). */
function chainStart(text, idx) {
    let i = idx - 1;
    while (i >= 0) {
        const c = text[i];
        if (/[\w.$?!]/.test(c)) { i--; continue; }
        if (c === ']' || c === ')') {
            const open = c === ']' ? '[' : '(';
            let depth = 0;
            for (; i >= 0; i--) {
                if (text[i] === c) depth++;
                else if (text[i] === open && --depth === 0) break;
            }
            i--;
            continue;
        }
        break;
    }
    return i + 1;
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

/** Loop vars plus every variable assigned (in the body) from something that uses them. */
function derivedVars(body, vars) {
    const out = new Set(vars);
    const re = /((?:[A-Za-z_$][\w$]*\s*,\s*)*[A-Za-z_$][\w$]*)\s*(?::\s*[\w<>[\]|, .?]+)?\s*(?::=|(?<![=!<>+\-*/%&|^:])=(?![=>]))\s*([^;\n]+)/g;
    for (let pass = 0; pass < 3; pass++) {
        let grew = false;
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(body)) !== null) {
            if (!mentions(m[2], out)) continue;
            for (const lhs of m[1].split(',').map(s => s.trim())) {
                if (lhs && !out.has(lhs)) { out.add(lhs); grew = true; }
            }
        }
        if (!grew) break;
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
function braceLoops(scan, cfg) {
    const loops = [];
    const m = scan.masked;
    for (const e of scan.entries) {
        if (e.kind !== 'loop') continue;
        const h = e.head;
        let kind = 'for';
        let vars = [];
        let iterable = '';
        let r;
        if (/^(?:while|do|loop)\b/.test(h)) kind = 'while';
        else if ((r = /^for\s*\((.*?);(.*?);(.*)\)$/.exec(h)) || (r = /^for\s+([^;{]*?);([^;{]*);(.*)$/.exec(h))) {
            vars = identifiers((/(?:let|var|int|auto|size_t|long|unsigned|usize|:=)?\s*([A-Za-z_]\w*)\s*:?=/.exec(r[1]) || [])[1] || '');
            iterable = r[2];
            const bound = /[<>]=?\s*(\d+)\s*$/.exec(r[2].trim());
            if (bound && Number(bound[1]) <= cfg.smallLoopMax) iterable = '[]';
        } else if ((r = /^for\s*(?:await\s*)?\(\s*(?:const|let|var)\s+(.+?)\s+(?:of|in)\s+(.+)\)$/.exec(h))) {
            vars = identifiers(r[1]);
            iterable = r[2];
        } else if ((r = /^foreach\s*\(\s*(?:var|[\w<>[\],.?]+)\s+(\([^)]*\)|\w+)\s+in\s+(.+)\)$/.exec(h))) {
            vars = identifiers(r[1]);
            iterable = r[2];
        } else if ((r = /^for\s*\(\s*(?:final\s+)?[\w<>[\],.?&*:\s]*?\s*&?\s*(\[[^\]]*\]|[A-Za-z_]\w*)\s*:\s*(.+)\)$/.exec(h))) {
            vars = identifiers(r[1]);
            iterable = r[2];
        } else if ((r = /^for\s+(?:([\w\s,]+?)\s*:?=\s*)?range\s+(.+)$/.exec(h))) {
            vars = identifiers(r[1] || '');
            iterable = r[2];
            if ((r[1] || '').includes(',') && !/^\s*_\s*,/.test(r[1])) vars.indexFirst = true;
        } else if ((r = /^for\s+(.+?)\s+in\s+(.+)$/.exec(h))) {
            vars = identifiers(r[1]);
            iterable = r[2];
        } else if (/^for\s*\{?$/.test(h) || /^for\s+[^;]+$/.test(h)) {
            kind = 'while'; // Go `for {` / `for cond {`
        }
        loops.push({ kind, line: e.line, vars, iterable, from: e.bodyStart, to: e.bodyEnd, concurrent: false, indexFirst: Boolean(vars.indexFirst) });
    }

    ITER_CALL_RE.lastIndex = 0;
    let it;
    while ((it = ITER_CALL_RE.exec(m)) !== null) {
        if (it[1] === 'then') continue;
        const open = it.index + it[0].length - 1;
        const close = balancedEnd(m, open);
        const args = m.slice(open + 1, close);
        const lambda = /^\s*(?:async\s+)?(?:\(([^)]*)\)|\|([^|]*)\||function\s*\w*\s*\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?:=>|->|\{|[^,]*?=>)?/.exec(args);
        if (!lambda) continue;
        const params = lambda[1] || lambda[2] || lambda[3] || lambda[4] || '';
        const recvStart = chainStart(m, it.index);
        const lineStart = m.lastIndexOf('\n', recvStart) + 1;
        const before = m.slice(Math.max(0, lineStart - 200), recvStart);
        loops.push({
            kind: 'iter',
            line: lineOf(m, it.index),
            vars: identifiers(params.split(',')[0] ? params : ''),
            iterable: m.slice(recvStart, it.index),
            from: open + 1,
            to: close,
            concurrent: CONCURRENT_RE.test(before.replace(/\s+/g, ' ')),
        });
    }
    return loops;
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

// --- I/O classification ----------------------------------------------------------

function buildMatchers(cfg) {
    const extra = Array.isArray(cfg.extraCallPatterns) ? cfg.extraCallPatterns : [];
    const receivers = cfg.dataAccessReceivers || DEFAULT_RECEIVERS;
    return {
        high: new RegExp(HIGH_CALLS.concat(extra).join('|'), 'g'),
        receiver: new RegExp(String.raw`(?:^|[^\w$.])((?:this\.|self\.)?(?:[A-Za-z_$][\w$]*\.)*?${receivers})\.([A-Za-z_]\w*)\s*\(`, 'g'),
    };
}

function callName(matchText) {
    const m = /([A-Za-z_]\w*)\s*!?\s*\(\s*\S?$/.exec(matchText) || /([A-Za-z_]\w*)(?:::\w+)?\s*$/.exec(matchText);
    return m ? m[1] : matchText.trim();
}

/** Every I/O call in `text`: { index, len, call, name, confidence, via? }. */
function ioCalls(text, matchers, localIo) {
    const out = [];
    const taken = new Set();
    const push = (index, len, call, name, confidence, via) => {
        if (taken.has(index)) return;
        taken.add(index);
        out.push({ index, len, call, name, confidence, via });
    };
    let m;
    matchers.high.lastIndex = 0;
    while ((m = matchers.high.exec(text)) !== null) {
        const call = m[0].replace(/\s*\(\s*[^)]*$/, '(').replace(/\s+/g, '');
        push(m.index, m[0].length, call, callName(m[0]), 'high');
        if (m[0].length === 0) matchers.high.lastIndex++;
    }
    matchers.receiver.lastIndex = 0;
    while ((m = matchers.receiver.exec(text)) !== null) {
        if (m[0].length === 0) { matchers.receiver.lastIndex++; continue; }
        const idx = m.index + m[0].indexOf(m[1]);
        if (out.some(o => Math.abs(o.index - idx) < m[0].length)) continue;
        push(idx, m[0].length - (idx - m.index), `${m[1]}.${m[2]}(`, m[2], 'medium');
    }
    if (localIo && localIo.size) {
        const names = Array.from(localIo.keys()).map(n => n.replace(/\$/g, '\\$')).join('|');
        const re = new RegExp(`(?:^|[^\\w$.])((?:this\\.|self\\.)?(${names}))\\s*\\(`, 'g');
        while ((m = re.exec(text)) !== null) {
            const idx = m.index + m[0].indexOf(m[1]);
            if (out.some(o => o.index <= idx && idx < o.index + o.len)) continue;
            push(idx, m[0].length, `${m[2]}()`, m[2], 'medium', localIo.get(m[2]));
        }
    }
    return out.sort((a, b) => a.index - b.index);
}

/** Same-file functions that do I/O, transitively: name → { call, line }. */
function localIoFunctions(scan, fns, matchers) {
    const io = new Map();
    const bodies = fns.filter(f => f.name !== '(anonymous)').map(f => ({ f, name: f.name.split('::').pop(), text: bodyText(scan, f.entry) }));
    for (const b of bodies) {
        const hit = ioCalls(b.text, matchers, null)[0];
        if (hit) io.set(b.name, { call: hit.call, line: b.f.line });
    }
    for (let pass = 0; pass < 4; pass++) {
        let grew = false;
        for (const b of bodies) {
            if (io.has(b.name)) continue;
            const hit = ioCalls(b.text, { high: /(?!)/g, receiver: /(?!)/g }, io)[0];
            if (hit) { io.set(b.name, { call: `${hit.name}()`, line: b.f.line, through: hit.via }); grew = true; }
        }
        if (!grew) break;
    }
    return io;
}

// --- detectors ---------------------------------------------------------------------

function describe(hit, loop, dependent, parentLoop) {
    const isWrite = WRITE_NAME_RE.test(hit.name);
    const kind = !dependent ? 'invariant' : isWrite ? 'write' : 'per-item';
    const what = hit.via
        ? `\`${hit.call}\` (does \`${hit.via.through ? hit.via.through.call : hit.via.call}\`, line ${hit.via.line})`
        : `\`${hit.call}\``;
    const itemVar = loop.vars.length ? `\`${itemVarOf(loop)}\`` : 'item';
    let message;
    let suggest;
    if (kind === 'invariant') {
        message = `loop-invariant I/O: ${what} doesn't depend on the loop (line ${loop.line}) but runs every iteration`;
        suggest = 'hoisting the call above the loop and reusing the result';
    } else if (kind === 'write') {
        message = `N writes: ${what} once per ${itemVar} (loop line ${loop.line})`;
        suggest = 'one bulk write (saveAll / bulk_create / executemany / AddRange + one SaveChanges / insertMany)';
    } else {
        message = `N+1: ${what} once per ${itemVar} (loop line ${loop.line})`;
        suggest = 'one batched call (IN / = ANY / findMany by ids / bulk endpoint) before the loop, then a map lookup; ' +
            'eager-load relations; DataLoader for resolvers';
    }
    if (loop.concurrent) message += ' — concurrent, but still N round-trips';
    if (parentLoop) message += ` — nested in loop line ${parentLoop.line}: N×M round-trips`;
    if (hit.confidence === 'medium' && !hit.via) message = message.replace(/^N\+1:/, 'N+1 (likely):');
    return { kind, message, suggest };
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

function detectLoops(scan, cfg, matchers, localIo) {
    const findings = [];
    const all = scan.langId === 'py' ? pyLoops(scan) : braceLoops(scan, cfg);
    const minConf = CONFIDENCE[cfg.minConfidence] ?? CONFIDENCE.medium;
    // innermost first, so a call is attributed to the tightest loop
    const loops = all.slice().sort((a, b) => (a.to - a.from) - (b.to - b.from));
    const claimed = new Set();
    const ioLines = new Set(); // any loop's I/O line — never also an await-in-loop

    for (const loop of loops) {
        if (loop.kind === 'while' && !cfg.includeWhileLoops) continue;
        if (smallLiteral(loop.iterable, cfg.smallLoopMax)) continue;
        const reg = region(scan, loop);
        const vars = derivedVars(reg.text, loop.vars);
        const parentLoop = enclosing(all, loop, scan);

        for (const hit of ioCalls(reg.text, matchers, cfg.followLocalFunctions === false ? null : localIo)) {
            ioLines.add(reg.lineAt(hit.index));
            if (CONFIDENCE[hit.confidence] < minConf) continue;
            const key = reg.key(hit.index);
            if (claimed.has(key)) continue;
            claimed.add(key);
            const extent = callExtent(reg.text, hit.index, hit.len);
            const dependent = vars.size === 0 || mentions(extent, vars);
            const d = describe(hit, loop, dependent, parentLoop && parentLoop.kind !== 'while' ? parentLoop : null);
            const line = reg.lineAt(hit.index);
            findings.push({
                smellId: 'n-plus-one',
                line,
                message: d.message,
                suggest: d.suggest,
                refSlug: 'control-flow',
                signature: `${d.kind}|${hit.name}`,
                confidence: hit.confidence,
            });
        }

        if (cfg.flagAwaitInLoop !== false && !loop.concurrent && loop.kind !== 'comp') {
            const lines = reg.text.split('\n');
            let pos = 0;
            for (const l of lines) {
                const line = reg.lineAt(pos);
                pos += l.length + 1;
                if (!AWAIT_RE.test(l) || ioLines.has(line) || claimed.has(`await:${line}`)) continue;
                claimed.add(`await:${line}`);
                findings.push({
                    smellId: 'await-in-loop',
                    line,
                    message: `sequential \`await\` inside loop starting line ${loop.line} (one wait per item)`,
                    suggest: 'Promise.all / asyncio.gather / Task.WhenAll (bounded) when iterations are independent; ' +
                        'if each step needs the previous one, suppress',
                    refSlug: 'control-flow',
                    signature: 'await',
                    confidence: 'low',
                });
            }
        }
    }
    return { findings, loops: all };
}

/** ORM rows fetched without eager loading, then a relation read per row. */
function detectLazyLoads(scan, loops) {
    const access = LAZY_ACCESS[scan.langId];
    if (!access) return [];
    const findings = [];
    for (const loop of loops) {
        if (loop.kind === 'while' || !loop.vars.length) continue;
        let source = loop.iterable.replace(/^\s*await\s+/, '').trim();
        const ident = /^([A-Za-z_$][\w$.]*)$/.exec(source);
        if (ident) {
            const before = scan.langId === 'py'
                ? scan.logical.slice(0, loop.from).map(l => l.text).join('\n')
                : scan.masked.slice(0, loop.from);
            const re = new RegExp(`(?:^|[^\\w$.])${ident[1].replace(/[.$]/g, '\\$&')}\\s*(?::\\s*[^=\\n]+)?(?::=|=)(?!=)\\s*([^;\\n]+(?:\\n\\s*\\.[^;\\n]+)*)`, 'g');
            let m;
            let last = null;
            while ((m = re.exec(before)) !== null) last = m[1];
            if (last) source = last;
        }
        if (!ORM_FETCH_RE.test(source) || EAGER_RE.test(source)) continue;
        const reg = region(scan, loop);
        const hit = access(loop.vars[0]).exec(reg.text);
        if (!hit) continue;
        findings.push({
            smellId: 'n-plus-one',
            line: reg.lineAt(hit.index),
            message: `N+1 (possible lazy load): \`${hit[0].replace(/^await\s+/, '')}\` per row of \`${source.slice(0, 60).trim()}\` fetched without eager loading`,
            suggest: 'eager-load the relation in the query (select_related / prefetch_related / selectinload / ' +
                'JOIN FETCH / .Include / relations) or batch-load by ids',
            refSlug: 'control-flow',
            signature: `lazy|${hit[1]}`,
            confidence: 'medium',
        });
    }
    return findings;
}

/** GraphQL field resolvers that query once per parent object. */
function detectResolvers(scan, fns, matchers, localIo) {
    if (BATCHED_RE.test(scan.text)) return [];
    const resolverFile = RESOLVER_FILE_RE.test(scan.text);
    const findings = [];
    const check = (name, parentVar, body, line) => {
        for (const hit of ioCalls(body, matchers, localIo)) {
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
function detect(scan, cfg) {
    if (!cfg || cfg.enabled === false) return [];
    const c = { smallLoopMax: 10, minConfidence: 'medium', ...cfg };
    const matchers = buildMatchers(c);
    const fns = extractFunctions(scan);
    const localIo = c.followLocalFunctions === false ? new Map() : localIoFunctions(scan, fns, matchers);
    const { findings, loops } = detectLoops(scan, c, matchers, localIo);
    if (c.lazyLoad !== false) findings.push(...detectLazyLoads(scan, loops));
    if (c.resolvers !== false) findings.push(...detectResolvers(scan, fns, matchers, localIo));
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

module.exports = { detect, HIGH_CALLS, DEFAULT_RECEIVERS };
