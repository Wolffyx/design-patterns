#!/usr/bin/env node
/**
 * Decision-log analyzer.
 *
 * Aggregates `.claude/pattern-decision-log.jsonl` and
 * `.claude/pattern-block-stats.jsonl` from the current working directory.
 *
 * Usage:
 *   node hooks/analyze-log.js [--since 7d|30d|all] [--format text|json]
 *
 * Output (text mode, default):
 *   Decision counts (applied / extended / rejected / refactor-suggest)
 *   Top 10 reject reasons (stem-collapsed)
 *   Top patterns by file path glob (apps/* / packages/* / src/*)
 *   Block-rate per day (last 30d, sparkline)
 *   Friction hotspots (same file blocked >3× in a week)
 *
 * No external deps. Pure stdlib.
 */

const fs = require('fs');
const path = require('path');

const ARGV = process.argv.slice(2);
const FORMAT = (ARGV.includes('--format')
    ? ARGV[ARGV.indexOf('--format') + 1] : 'text') || 'text';
const SINCE_RAW = (ARGV.includes('--since')
    ? ARGV[ARGV.indexOf('--since') + 1] : '30d') || '30d';

function parseSince(spec) {
    if (spec === 'all') return 0;
    const m = String(spec).match(/^(\d+)([dhw])$/);
    if (!m) return Date.now() - 30 * 86400 * 1000;
    const n = parseInt(m[1], 10);
    const unit = { d: 86400, h: 3600, w: 7 * 86400 }[m[2]];
    return Date.now() - n * unit * 1000;
}

const SINCE = parseSince(SINCE_RAW);

function readJsonl(p) {
    if (!fs.existsSync(p)) return [];
    try {
        return fs.readFileSync(p, 'utf8')
            .split('\n').filter(Boolean)
            .map(line => { try { return JSON.parse(line); } catch { return null; } })
            .filter(Boolean);
    } catch { return []; }
}

const cwd = process.cwd();
const decisions = readJsonl(path.join(cwd, '.claude', 'pattern-decision-log.jsonl'))
    .filter(e => e.ts && Date.parse(e.ts) >= SINCE);
const blocks = readJsonl(path.join(cwd, '.claude', 'pattern-block-stats.jsonl'))
    .filter(e => e.ts && Date.parse(e.ts) >= SINCE);

// --- decision counts ------------------------------------------------------

const decisionCounts = { applied: 0, extended: 0, rejected: 0, 'refactor-suggest': 0, other: 0 };
for (const d of decisions) {
    const k = (d.decision || 'other').toLowerCase();
    if (decisionCounts[k] !== undefined) decisionCounts[k]++;
    else decisionCounts.other++;
}

// --- top reject reasons (stem-collapsed) ----------------------------------

function stem(s) {
    return String(s || '').toLowerCase()
        .replace(/[^\w\s,;-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/[,.;]/)[0] // first clause
        .slice(0, 60);
}

const rejectReasons = {};
for (const d of decisions) {
    if ((d.decision || '').toLowerCase() !== 'rejected') continue;
    const key = stem(d.reasonExcerpt || d.reason || '');
    if (!key) continue;
    rejectReasons[key] = (rejectReasons[key] || 0) + 1;
}
const topRejects = Object.entries(rejectReasons)
    .sort(([, a], [, b]) => b - a).slice(0, 10);

// --- top patterns per glob -----------------------------------------------

function pathBucket(file) {
    const f = String(file || '').replace(/\\/g, '/');
    if (/(^|\/)apps\//.test(f)) return 'apps/**';
    if (/(^|\/)packages\//.test(f)) return 'packages/**';
    if (/(^|\/)src\//.test(f)) return 'src/**';
    return 'other';
}

const bucketPatterns = {};
for (const d of decisions) {
    const bucket = pathBucket(d.file);
    const pat = d.pattern || '(none)';
    bucketPatterns[bucket] = bucketPatterns[bucket] || {};
    bucketPatterns[bucket][pat] = (bucketPatterns[bucket][pat] || 0) + 1;
}

// --- block-rate per day (last 30d) ---------------------------------------

const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function spark(values) {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    return values.map(v => SPARK[Math.min(SPARK.length - 1, Math.floor(v / max * (SPARK.length - 1)))]).join('');
}

function dayBuckets(entries, days) {
    const counts = new Array(days).fill(0);
    const now = Date.now();
    for (const e of entries) {
        const t = Date.parse(e.ts);
        if (!Number.isFinite(t)) continue;
        const ago = Math.max(0, Math.floor((now - t) / (86400 * 1000)));
        if (ago < days) counts[days - 1 - ago]++;
    }
    return counts;
}
const blockSeries = dayBuckets(blocks.filter(b => b.blocking !== false), 30);

// --- friction hotspots ----------------------------------------------------

const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
const fileBlocks = {};
for (const b of blocks) {
    if (b.blocking === false) continue;
    if (Date.parse(b.ts) < sevenDaysAgo) continue;
    const f = b.file || '?';
    fileBlocks[f] = (fileBlocks[f] || 0) + 1;
}
const hotspots = Object.entries(fileBlocks)
    .filter(([, n]) => n > 3)
    .sort(([, a], [, b]) => b - a);

// --- output ---------------------------------------------------------------

if (FORMAT === 'json') {
    process.stdout.write(JSON.stringify({
        since: SINCE_RAW,
        decisions: decisionCounts,
        topRejects: topRejects.map(([reason, count]) => ({ reason, count })),
        bucketPatterns,
        blockSeries,
        hotspots: hotspots.map(([file, count]) => ({ file, count })),
    }, null, 2) + '\n');
    process.exit(0);
}

const out = [];
out.push(`Pattern decision log analyzer  ·  since=${SINCE_RAW}  ·  ${decisions.length} decisions, ${blocks.length} block events`);
out.push('');
out.push('Decision counts:');
for (const [k, v] of Object.entries(decisionCounts)) out.push(`  ${k.padEnd(18)} ${v}`);
out.push('');
out.push('Top reject reasons (stem-collapsed):');
if (topRejects.length === 0) out.push('  (none)');
else for (const [r, n] of topRejects) out.push(`  ${String(n).padStart(4)} × ${r}`);
out.push('');
out.push('Top patterns per path bucket:');
for (const [bucket, pats] of Object.entries(bucketPatterns)) {
    out.push(`  ${bucket}`);
    const top = Object.entries(pats).sort(([, a], [, b]) => b - a).slice(0, 5);
    for (const [p, n] of top) out.push(`    ${String(n).padStart(4)} × ${p}`);
}
out.push('');
out.push(`Block-rate (last 30 days):  ${spark(blockSeries)}  total=${blockSeries.reduce((a, b) => a + b, 0)}`);
out.push('');
out.push('Friction hotspots (>3 blocks in last 7d):');
if (hotspots.length === 0) out.push('  (none)');
else for (const [f, n] of hotspots) out.push(`  ${String(n).padStart(4)} × ${f}`);
process.stdout.write(out.join('\n') + '\n');
