/**
 * Cross-file pattern-smell corpus.
 *
 * Stores a normalized signature for each smell finding so that two files
 * with the same shape (e.g. switch-on-`kind` with cases A/B/C) can be
 * flagged as a strong Strategy/Visitor candidate even when each file alone
 * is below threshold.
 *
 * Cache layout (JSON file):
 *   {
 *     "<absoluteFilePath>": {
 *       "ts": "<ISO timestamp>",
 *       "findings": [
 *         { "smellId": "switch-on-type", "signature": "kind|A|B|C", "line": 42 },
 *         ...
 *       ]
 *     }
 *   }
 *
 * Opt-in via `smells.crossFile.enabled` in pattern-check.config.json.
 * No-op when disabled or when the cache file can't be read/written.
 */

const fs = require('fs');
const path = require('path');

function cachePath(cfg) {
    const rel = (cfg && cfg.cachePath) || '.claude/cache/pattern-smell-corpus.json';
    return path.resolve(process.cwd(), rel);
}

function readCache(cfg) {
    const p = cachePath(cfg);
    if (!fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) || {}; }
    catch { return {}; }
}

function writeCache(cfg, data) {
    const p = cachePath(cfg);
    try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    } catch {
        // silent — telemetry must never break the flow
    }
}

function pruneStale(cache, ttlDays) {
    if (!ttlDays || ttlDays <= 0) return cache;
    const cutoff = Date.now() - ttlDays * 86400 * 1000;
    const out = {};
    for (const [file, entry] of Object.entries(cache)) {
        if (!entry || !entry.ts) continue;
        const ts = Date.parse(entry.ts);
        if (Number.isFinite(ts) && ts < cutoff) continue;
        if (!fs.existsSync(file)) continue;
        out[file] = entry;
    }
    return out;
}

/**
 * Update corpus for one file (replaces any prior entry) and return any
 * cross-file matches: signatures present in ≥2 distinct files.
 *
 * @param {object} cfg     smells.crossFile config
 * @param {string} file    absolute path of the just-edited file
 * @param {Array<{smellId:string, signature:string, line:number}>} findings
 * @returns {Array<{smellId:string, signature:string, files:string[]}>}
 */
function update(cfg, file, findings) {
    if (!cfg || !cfg.enabled) return [];
    const safeFindings = Array.isArray(findings) ? findings : [];
    let cache = readCache(cfg);
    cache = pruneStale(cache, cfg.cacheTtlDays);
    cache[file] = {
        ts: new Date().toISOString(),
        findings: safeFindings.map(f => ({
            smellId: f.smellId,
            signature: f.signature,
            line: f.line,
        })),
    };
    writeCache(cfg, cache);

    // index signatures across files
    const index = {}; // key = `${smellId}|${signature}` → Set of files
    for (const [f, entry] of Object.entries(cache)) {
        for (const fnd of (entry.findings || [])) {
            const key = `${fnd.smellId}|${fnd.signature}`;
            if (!index[key]) index[key] = new Set();
            index[key].add(f);
        }
    }

    const matches = [];
    for (const fnd of safeFindings) {
        const key = `${fnd.smellId}|${fnd.signature}`;
        const files = index[key];
        if (files && files.size >= 2) {
            matches.push({
                smellId: fnd.smellId,
                signature: fnd.signature,
                files: Array.from(files).sort(),
            });
        }
    }
    return matches;
}

module.exports = { update };
