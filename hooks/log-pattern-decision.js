#!/usr/bin/env node
/**
 * PostToolUse hook: logs Pattern check decisions for later review.
 *
 * On each Write/Edit/MultiEdit of a .ts/.tsx source file, scans the most
 * recent assistant transcript turn for `Pattern check:` lines and appends
 * one JSONL entry per line to `.claude/pattern-decision-log.jsonl`.
 *
 * Extensions over baseline:
 *   - `refactor-suggest` decision recorded with `status: "open"` + unique id
 *   - tombstone lifecycle: when a subsequent entry matches the BetterPattern
 *     half of an open `<Current>→<Better>` suggestion on the same file, append
 *     a companion entry `{linkedTo: <open-id>, status: "resolved"}`
 *
 * Non-blocking. Always exits 0. Silent on any failure.
 *
 * Log entry shape:
 *   {
 *     "id": "short-hash",
 *     "ts": "2026-04-22T12:34:56.000Z",
 *     "session": "...",
 *     "file": "src/....",
 *     "tool": "Write" | "Edit" | "MultiEdit",
 *     "pattern": "Factory Method" | "Facade→Strategy" | ...,
 *     "tier": 1 | 2 | 3 | null,
 *     "decision": "applied" | "extended" | "rejected" | "refactor-suggest" | null,
 *     "reason": "...",
 *     "status"?: "open" | "resolved",
 *     "linkedTo"?: "<open-id>"
 *   }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const shared = require('./_pattern-shared');

function shortId() {
    return crypto.randomBytes(6).toString('hex');
}

function parseArrowPattern(patternName) {
    if (!patternName) return null;
    const m = patternName.match(/^(.+?)\s*\u2192\s*(.+?)$/);
    if (!m) return null;
    return { current: m[1].trim(), better: m[2].trim() };
}

function findOpenRefactorSuggest(logPath, filePath) {
    if (!fs.existsSync(logPath)) return null;
    const tail = shared.tailLogLines(logPath, 1000);
    const entries = shared.parseLogEntries(tail);
    const normalized = filePath.replace(/\\/g, '/');
    // track resolved ids so we don't re-resolve
    const resolved = new Set();
    for (const e of entries) {
        if (e && e.status === 'resolved' && e.linkedTo) resolved.add(e.linkedTo);
    }
    // find most recent open refactor-suggest for this file not yet resolved
    for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (!e || !e.id) continue;
        if (e.decision !== 'refactor-suggest') continue;
        if (e.status !== 'open') continue;
        if (resolved.has(e.id)) continue;
        const ef = String(e.file || '').replace(/\\/g, '/');
        if (ef !== normalized) continue;
        return e;
    }
    return null;
}

// --- main ------------------------------------------------------------------

const raw = shared.readStdin();
if (!raw) process.exit(0);

const input = shared.safeJson(raw);
if (!input) process.exit(0);

const tool = input.tool_name;
if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

const cfg = shared.loadConfig();
if (!cfg.log.enabled) process.exit(0);

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || '';
if (!filePath) process.exit(0);

const extOk = cfg.blocking.fileExtensions.some(ext =>
    new RegExp('\\.' + ext + '$', 'i').test(filePath));
if (!extOk) process.exit(0);

if (cfg.blocking.excludeGlobs.some(g => shared.matchesGlob(filePath, g))) process.exit(0);

const preambles = shared.findAllPreamblesInRecentTurn(input.transcript_path);
if (preambles.length === 0) process.exit(0);

const logPath = path.resolve(process.cwd(), cfg.log.path);
try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch {}

const now = new Date().toISOString();
const session = input.session_id || '';
const fileRel = filePath.replace(/\\/g, '/');

const lines = [];
for (const p of preambles) {
    const id = shortId();
    const record = {
        id,
        ts: now,
        session,
        file: fileRel,
        tool,
        pattern: p.pattern,
        tier: p.tier,
        decision: p.decision,
        reason: p.reason,
    };
    if (p.decision === 'refactor-suggest') {
        record.status = 'open';
    }
    lines.push(JSON.stringify(record));

    // tombstone check: does this entry resolve an open refactor-suggest?
    if (p.decision === 'applied' || p.decision === 'extended') {
        const open = findOpenRefactorSuggest(logPath, filePath);
        if (open) {
            const arrow = parseArrowPattern(open.pattern);
            if (arrow) {
                const normalize = s => String(s || '').toLowerCase().replace(/[^a-z]+/g, '');
                if (normalize(arrow.better) === normalize(p.pattern) ||
                    normalize(p.pattern).includes(normalize(arrow.better))) {
                    lines.push(JSON.stringify({
                        id: shortId(),
                        ts: now,
                        session,
                        file: fileRel,
                        tool,
                        linkedTo: open.id,
                        status: 'resolved',
                        resolvedBy: p.pattern,
                        reason: 'refactor-suggest ' + open.id + ' resolved by ' + p.decision + ' ' + p.pattern,
                    }));
                }
            }
        }
    }
}

try {
    fs.appendFileSync(logPath, lines.join('\n') + '\n', 'utf8');
} catch {
    // silent
}

process.exit(0);
