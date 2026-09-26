#!/usr/bin/env node
/**
 * Decision-log analyzer.
 *
 * Aggregates `.claude/pattern-decision-log.jsonl`,
 * `.claude/pattern-block-stats.jsonl` and `.claude/pattern-smell-log.jsonl`
 * from the current working directory.
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
 *   Smell tuning (per smell: reported vs suppressed; a smell suppressed in
 *   ≥30% of ≥5 sightings gets a "raise <config key> or set severity off" hint)
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
const smellLog = readJsonl(path.join(cwd, '.claude', 'pattern-smell-log.jsonl'))
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

// --- smell tuning -----------------------------------------------------------

// the config knob that makes each smell fire less often
const SMELL_KNOB = {
    'switch-on-type': 'smells.switchOnTypeMinCases',
    'instanceof-chain': 'smells.instanceofChainMinBranches',
    'repeated-new': 'smells.repeatedNewMinOccurrences',
    'long-constructor': 'smells.constructorMaxParams',
    'god-class': 'smells.godClassMinPublicMethods',
    'deep-nesting': 'smells.maxNestingDepth',
    'nested-if': 'smells.nestedIf',
    'else-after-return': 'smells.elseAfterReturn',
    'conditional-ladder': 'smells.conditionalLadderMinBranches',
    'scattered-discriminator': 'smells.scatteredDiscriminatorMinSites',
    'long-function': 'smells.maxFunctionLines',
    'long-param-list': 'smells.maxParams',
    'boolean-flag-param': 'smells.booleanFlagParam',
    'complexity': 'smells.maxComplexity',
    'swallowed-exception': 'smells.swallowedException',
    'n-plus-one': 'smells.nPlusOne.minConfidence (→ "high") or nPlusOne.dataAccessReceivers',
    'await-in-loop': 'smells.nPlusOne.flagAwaitInLoop',
};
const SUPPRESS_RATE_HINT = 0.3;
const SUPPRESS_MIN_SIGHTINGS = 5;

const smellStats = {};
for (const e of smellLog) {
    const k = e.smellId || '?';
    const st = smellStats[k] || (smellStats[k] = { smellId: k, reported: 0, suppressed: 0, blocked: 0 });
    if (e.suppressed) st.suppressed++;
    else st.reported++;
    if (e.severity === 'block') st.blocked++;
}
for (const b of blocks) {
    if (b.rule !== 'smell-gate' || !Array.isArray(b.smells)) continue;
    for (const id of b.smells.map(x => String(x).split(':')[0])) {
        const st = smellStats[id] || (smellStats[id] = { smellId: id, reported: 0, suppressed: 0, blocked: 0 });
        st.blocked++;
    }
}
const smellRows = Object.values(smellStats).map(st => {
    const total = st.reported + st.suppressed;
    const rate = total ? st.suppressed / total : 0;
    const suggestion = total >= SUPPRESS_MIN_SIGHTINGS && rate >= SUPPRESS_RATE_HINT
        ? `suppressed ${Math.round(rate * 100)}% of the time \u2014 loosen ${SMELL_KNOB[st.smellId] || 'its threshold'} ` +
          `or set smells.severity["${st.smellId}"] = "off"`
        : null;
    return { ...st, suppressionRate: Number(rate.toFixed(2)), suggestion };
}).sort((a, b) => (b.reported + b.suppressed) - (a.reported + a.suppressed));

// --- output ---------------------------------------------------------------

if (FORMAT === 'json') {
    process.stdout.write(JSON.stringify({
        since: SINCE_RAW,
        decisions: decisionCounts,
        topRejects: topRejects.map(([reason, count]) => ({ reason, count })),
        bucketPatterns,
        blockSeries,
        hotspots: hotspots.map(([file, count]) => ({ file, count })),
        smells: smellRows,
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
out.push('');
out.push('Smell tuning (reported / suppressed / blocked):');
if (smellRows.length === 0) out.push('  (no smell log yet)');
for (const r of smellRows) {
    out.push(`  ${r.smellId.padEnd(24)} ${String(r.reported).padStart(5)} ${String(r.suppressed).padStart(5)} ${String(r.blocked).padStart(5)}`);
    if (r.suggestion) out.push(`    \u2192 ${r.suggestion}`);
}
process.stdout.write(out.join('\n') + '\n');
