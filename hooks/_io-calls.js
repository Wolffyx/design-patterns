/**
 * _io-calls.js — "is this call a round-trip?" — shared by the N+1 detector
 * (_nplusone.js) and the cross-file I/O index (_io-index.js).
 *
 * Three sources of evidence, strongest first:
 *   high     known driver / ORM / HTTP APIs (HIGH_CALLS) + configured extras
 *   medium   any method on a data-access receiver (DEFAULT_RECEIVERS)
 *   medium   a call to a function / method KNOWN to do I/O: same-file helpers
 *            and — via _io-index.js — imported functions, namespace calls and
 *            methods of injected services
 */

'use strict';

const { bodyText } = require('./_code-scan');

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

const NO_KNOWN = { functions: new Map(), receivers: new Map() };

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

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Every I/O call in `text`: { index, len, call, name, confidence, via? }.
 * `known.functions`: name → info for functions known to do I/O (same file or
 * imported); `known.receivers`: receiver name → (method → info) for
 * namespaces and injected services.
 */
function ioCalls(text, matchers, known = NO_KNOWN) {
    const out = [];
    const taken = new Set();
    const overlaps = idx => out.some(o => o.index <= idx && idx < o.index + o.len);
    const push = (index, len, call, name, confidence, via) => {
        if (taken.has(index)) return;
        taken.add(index);
        out.push({ index, len, call, name, confidence, via });
    };
    let m;
    matchers.high.lastIndex = 0;
    while ((m = matchers.high.exec(text)) !== null) {
        if (m[0].length === 0) { matchers.high.lastIndex++; continue; }
        push(m.index, m[0].length, m[0].replace(/\s*\(\s*[^)]*$/, '(').replace(/\s+/g, ''), callName(m[0]), 'high');
    }
    matchers.receiver.lastIndex = 0;
    while ((m = matchers.receiver.exec(text)) !== null) {
        if (m[0].length === 0) { matchers.receiver.lastIndex++; continue; }
        const idx = m.index + m[0].indexOf(m[1]);
        if (out.some(o => Math.abs(o.index - idx) < m[0].length)) continue;
        push(idx, m[0].length - (idx - m.index), `${m[1]}.${m[2]}(`, m[2], 'medium');
    }
    knownFunctionCalls(text, known.functions, overlaps, push);
    knownReceiverCalls(text, known.receivers, overlaps, push);
    return out.sort((a, b) => a.index - b.index);
}

function knownFunctionCalls(text, functions, overlaps, push) {
    if (!functions || !functions.size) return;
    const names = Array.from(functions.keys()).map(esc).join('|');
    const re = new RegExp(`(?:^|[^\\w$.])((?:this\\.|self\\.)?(${names}))\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
        const idx = m.index + m[0].indexOf(m[1]);
        if (overlaps(idx)) continue;
        push(idx, m[0].length, `${m[2]}()`, m[2], 'medium', functions.get(m[2]));
    }
}

function knownReceiverCalls(text, receivers, overlaps, push) {
    if (!receivers || !receivers.size) return;
    const names = Array.from(receivers.keys()).map(esc).join('|');
    // `this.users.get(`, `self.users.get(`, `s.users.Get(`, `users.get(`, `users::get(`, `svc_->get(`
    const re = new RegExp(`(?:^|[^\\w$])((?:(?:this|self|[A-Za-z_]\\w*)(?:\\.|->))?(${names}))(\\.|::|->)([A-Za-z_]\\w*)\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
        const info = receivers.get(m[2]).get(m[4]);
        const idx = m.index + m[0].indexOf(m[1]);
        if (!info || overlaps(idx)) continue;
        push(idx, m[0].length - (idx - m.index), `${m[1]}${m[3]}${m[4]}()`, m[4], 'medium', info);
    }
}

/**
 * Functions in this scan that do I/O, transitively: name → { call, line, file? }.
 * `known` adds functions / receivers resolved from other files.
 */
function localIoFunctions(scan, fns, matchers, known = NO_KNOWN) {
    const io = new Map();
    const bodies = fns
        .filter(f => f.name !== '(anonymous)')
        .map(f => ({ f, name: f.name.split('::').pop(), text: bodyText(scan, f.entry) }));
    for (const b of bodies) {
        const hit = ioCalls(b.text, matchers, known)[0];
        if (hit) io.set(b.name, { call: hit.via ? `${hit.name}()` : hit.call, line: b.f.line, through: hit.via });
    }
    let pass = 0;
    while (pass++ < 8 && growThroughCalls(bodies, io)) {
        // each pass adds functions that call a function already known to do I/O
    }
    return io;
}

const NO_MATCHERS = { high: /(?!)/g, receiver: /(?!)/g };

function growThroughCalls(bodies, io) {
    const fresh = bodies
        .filter(b => !io.has(b.name))
        .map(b => ({ b, hit: ioCalls(b.text, NO_MATCHERS, { functions: io, receivers: new Map() })[0] }))
        .filter(x => x.hit);
    fresh.forEach(({ b, hit }) => io.set(b.name, { call: `${hit.name}()`, line: b.f.line, through: hit.via }));
    return fresh.length > 0;
}

/** The innermost real call behind an info chain (`svc.get()` → `.findUnique(`). */
function rootCall(info) {
    let cur = info;
    while (cur && cur.through) cur = cur.through;
    return cur;
}

module.exports = {
    HIGH_CALLS,
    DEFAULT_RECEIVERS,
    NO_KNOWN,
    buildMatchers,
    ioCalls,
    localIoFunctions,
    rootCall,
};
