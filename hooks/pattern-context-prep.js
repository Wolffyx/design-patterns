#!/usr/bin/env node
/**
 * PreToolUse hook: cross-file context preflight for design-patterns Rule 0.
 *
 * Runs BEFORE check-pattern-preamble.js (settings.json array order).
 * Surfaces candidate sibling files, matching project pattern families, recent
 * decisions on this file, and imports already present — so the agent can Read
 * 1–3 related files before emitting its Pattern check line.
 *
 * Three emit modes:
 *   - Mode A (full preflight): substantive new logic + file NOT yet in a known
 *                              family → full stderr block w/ family-hint,
 *                              siblings, recent decisions, imports.
 *   - Mode B (already-in-family short-circuit): file imports from a
 *                              familyPreflight[].mustRead path OR log shows a
 *                              recent `extended` decision on this file → light
 *                              block, no sibling Read required.
 *   - Mode C (family-health degraded): siblings match a family but log shows
 *                              ≥3 refactor-candidates / consecutive rejects on
 *                              that family → appends `family-health: degraded`
 *                              line to the Mode A block.
 *
 * ALWAYS exits 0. Advisory only; never blocks a tool call.
 *
 * Hook ordering contract:
 *   settings.json → hooks.PreToolUse.[matcher Write|Edit|MultiEdit].hooks[]
 *   MUST list pattern-context-prep.js BEFORE check-pattern-preamble.js.
 *
 * Budget: <500ms. Enforced via Date.now() checks between I/O steps.
 *
 * Dry-run: HOOKS_DRY_RUN=1 prepends "DRY-RUN:" to every emitted line but
 * behavior otherwise identical (same advisory payload; always exit 0 anyway).
 */

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');

const DRY_RUN = process.env.HOOKS_DRY_RUN === '1';
const T0 = Date.now();

// --- time budget -----------------------------------------------------------

function overBudget(limitMs) {
    return (Date.now() - T0) >= limitMs;
}

// --- session cache (file-based, truncated on SessionStart by separate hook) -

function loadSessionCache(cfg) {
    if (!cfg.sessionCache || !cfg.sessionCache.enabled) return {};
    const p = shared.expandHome(cfg.sessionCache.path);
    if (!p || !fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) || {}; } catch { return {}; }
}

function writeSessionCache(cfg, cache) {
    if (!cfg.sessionCache || !cfg.sessionCache.enabled) return;
    const p = shared.expandHome(cfg.sessionCache.path);
    if (!p) return;
    try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(cache, null, 2), 'utf8');
    } catch {
        // silent — advisory only
    }
}

// --- family matching -------------------------------------------------------

function matchFamily(filePath, cfg) {
    const families = cfg.familyPreflight || [];
    const normalized = filePath.replace(/\\/g, '/');
    for (const f of families) {
        if (!f || !f.glob) continue;
        if (!shared.matchesGlobAny(normalized, f.glob)) continue;
        const exempt = Array.isArray(f.exemptGlobs) && f.exemptGlobs
            .some(g => shared.matchesGlobAny(normalized, g));
        if (exempt) return { exempt: true, family: f.family, matched: f };
        return { exempt: false, family: f.family, mustRead: f.mustRead || [], matched: f };
    }
    return null;
}

// --- sibling glob ----------------------------------------------------------

function listSiblings(filePath, cfg) {
    const cap = cfg.contextPrep.maxSiblings || 6;
    const nameRe = new RegExp(cfg.contextPrep.siblingNameRegex || '.');
    const dir = path.dirname(filePath);
    const parent = path.dirname(dir);
    const dirs = [dir];
    if ((cfg.contextPrep.globDepth || 1) >= 1 && parent && parent !== dir) dirs.push(parent);

    const out = [];
    for (const d of dirs) {
        if (overBudget(cfg.contextPrep.timeBudgetMs)) break;
        let entries = [];
        try { entries = fs.readdirSync(d); } catch { continue; }
        for (const name of entries) {
            if (out.length >= cap) break;
            if (!/\.(ts|tsx)$/.test(name)) continue;
            if (/\.(test|spec|d)\.(ts|tsx)$/.test(name)) continue;
            const full = path.join(d, name);
            if (path.resolve(full) === path.resolve(filePath)) continue;
            let stat;
            try { stat = fs.statSync(full); } catch { continue; }
            if (!stat.isFile()) continue;
            if (!nameRe.test(name)) continue;
            out.push(full.replace(/\\/g, '/'));
        }
    }
    return out.slice(0, cap);
}

// --- recent log decisions for this file/dir --------------------------------

function recentDecisionsForFile(filePath, cfg) {
    const n = cfg.contextPrep.recentDecisionCount || 3;
    const logPath = path.resolve(process.cwd(), cfg.log.path);
    const tail = shared.tailLogLines(logPath, 500);
    const entries = shared.parseLogEntries(tail);
    const normalized = filePath.replace(/\\/g, '/');
    const dir = path.dirname(normalized);
    const filtered = entries.filter(e => {
        if (!e || !e.file) return false;
        const ef = String(e.file).replace(/\\/g, '/');
        return ef === normalized || path.dirname(ef) === dir;
    });
    return filtered.slice(-n);
}

function familyHealthDegraded(filePath, family, cfg) {
    if (!family || !family.matched) return false;
    const logPath = path.resolve(process.cwd(), cfg.log.path);
    const tail = shared.tailLogLines(logPath, 800);
    const entries = shared.parseLogEntries(tail);
    const familyGlob = family.matched.glob;
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const hits = entries.filter(e => {
        if (!e || !e.file || !e.ts) return false;
        const ef = String(e.file).replace(/\\/g, '/');
        if (!shared.matchesGlobAny(ef, familyGlob)) return false;
        const ts = Date.parse(e.ts);
        if (!Number.isFinite(ts) || ts < cutoff) return false;
        if (e.decision === 'refactor-suggest') return true;
        if (typeof e.reason === 'string' && /refactor-candidate/i.test(e.reason)) return true;
        return false;
    });
    return hits.length >= 3;
}

// --- import detection ------------------------------------------------------

function importsInPayload(newText) {
    const out = [];
    const re = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(newText || '')) !== null) {
        const p = m[1];
        if (/\b(base|registry|middleware|factory|pipeline)\b/i.test(p)) out.push(p);
    }
    return Array.from(new Set(out));
}

function payloadImportsFamily(filePath, cfg, newText, existingFileText) {
    const families = cfg.familyPreflight || [];
    const normalized = filePath.replace(/\\/g, '/');
    const cwd = process.cwd().replace(/\\/g, '/');
    const body = (newText || '') + '\n' + (existingFileText || '');
    for (const f of families) {
        if (!f || !Array.isArray(f.mustRead)) continue;
        if (!shared.matchesGlobAny(normalized, f.glob)) continue;
        for (const must of f.mustRead) {
            const absMust = path.resolve(cwd, must).replace(/\\/g, '/');
            if (absMust === normalized) continue;
            const fileNoExt = path.basename(must).replace(/\.(ts|tsx)$/, '');
            const re = new RegExp('from\\s+[\\\'"][^\\\'"]*' + fileNoExt.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '[\\\'"]');
            if (re.test(body)) return { family: f.family, via: must };
        }
    }
    return null;
}

function readExistingFile(filePath) {
    try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function recentExtendOnFile(filePath, cfg) {
    const cutoffDays = cfg.sessionCache.alreadyInFamilyDays || 30;
    const cutoff = Date.now() - cutoffDays * 24 * 3600 * 1000;
    const logPath = path.resolve(process.cwd(), cfg.log.path);
    const tail = shared.tailLogLines(logPath, 800);
    const entries = shared.parseLogEntries(tail);
    const normalized = filePath.replace(/\\/g, '/');
    for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (!e || !e.file) continue;
        const ef = String(e.file).replace(/\\/g, '/');
        if (ef !== normalized) continue;
        const ts = e.ts ? Date.parse(e.ts) : NaN;
        if (!Number.isFinite(ts) || ts < cutoff) continue;
        if (e.decision === 'extended') return { ts: e.ts, pattern: e.pattern, reason: e.reason };
    }
    return null;
}

// --- emit helpers ----------------------------------------------------------

function prefix(line) { return DRY_RUN ? 'DRY-RUN: ' + line : line; }

function emit(lines) {
    for (const l of lines) process.stderr.write(prefix(l) + '\n');
}

// --- main ------------------------------------------------------------------

function main() {
    const raw = shared.readStdin();
    if (!raw) process.exit(0);
    const input = shared.safeJson(raw);
    if (!input) process.exit(0);

    const tool = input.tool_name;
    if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

    const cfg = shared.loadConfig();
    if (!cfg.contextPrep || !cfg.contextPrep.enabled) process.exit(0);

    const toolInput = input.tool_input || {};
    const filePath = toolInput.file_path || '';
    if (!filePath) process.exit(0);

    // extension filter
    const extOk = cfg.blocking.fileExtensions.some(ext =>
        new RegExp('\\.' + ext + '$', 'i').test(filePath));
    if (!extOk) process.exit(0);

    // exclude tests / .d.ts / type files
    if (cfg.blocking.excludeGlobs.some(g => shared.matchesGlob(filePath, g))) process.exit(0);

    const payload = shared.buildPayloadInfo(tool, toolInput);
    if (!payload.newText && !payload.oldText) process.exit(0);

    // skip directive
    const skip = cfg.blocking.skipDirective || '// pattern-check: skip';
    if (payload.newText.includes(skip) || payload.oldText.includes(skip)) process.exit(0);

    if (shared.isWhitespaceOnlyDiff(payload)) process.exit(0);

    // per-path rule: skip action → no preflight needed
    const pathRule = shared.resolvePathRule(filePath, cfg.perPathRules);
    if (pathRule && pathRule.action === 'skip') process.exit(0);

    const triggers = shared.triggersForPathRule(pathRule, cfg.blocking.substantiveTriggers);
    const triggeredReasons = shared.detectTriggers(payload, triggers);

    // small edit AND no new symbol → nothing substantive to preflight
    if (shared.isSmallEdit(payload, cfg.blocking.smallEditThreshold)) {
        if (!shared.hasNewSymbol(payload.newText)) process.exit(0);
    }
    if (triggeredReasons.length === 0) process.exit(0);

    // I3 exempt glob per family
    const familyMatch = matchFamily(filePath, cfg);
    if (familyMatch && familyMatch.exempt) process.exit(0);

    // session cache — second edit of same file in same session
    const session = input.session_id || '';
    const sessionCache = loadSessionCache(cfg);
    const sessionKey = session + ':' + filePath.replace(/\\/g, '/');
    if (sessionCache[sessionKey]) {
        emit([
            'PATTERN-CONTEXT: already-in-family (session-cached)',
            '  family: ' + sessionCache[sessionKey].family,
            '  cached-from: ' + (sessionCache[sessionKey].source || 'prior edit this session'),
            '  note: no re-read required; emit `Pattern check: <pattern> \u2014 extended \u2014 continuing existing integration via <path>`.',
            'END-PATTERN-CONTEXT',
        ]);
        process.exit(0);
    }

    // Mode B detection — file already imports family base OR recent extend
    if (overBudget(cfg.contextPrep.timeBudgetMs)) process.exit(0);
    const existing = (!payload.isNewFile && fs.existsSync(filePath)) ? readExistingFile(filePath) : '';
    const importsHit = payloadImportsFamily(filePath, cfg, payload.newText, existing);
    const recentExtend = recentExtendOnFile(filePath, cfg);

    if (importsHit || recentExtend) {
        const family = (importsHit && importsHit.family) || (familyMatch && familyMatch.family) || 'existing family';
        const viaPath = importsHit ? importsHit.via : (recentExtend && recentExtend.pattern);
        sessionCache[sessionKey] = {
            family,
            source: importsHit ? 'imports ' + importsHit.via : 'recent extended on ' + (recentExtend && recentExtend.ts),
        };
        writeSessionCache(cfg, sessionCache);
        const lines = [
            'PATTERN-CONTEXT: already-in-family',
            '  family: ' + family + (viaPath ? ' \u2014 via ' + viaPath : ''),
        ];
        if (recentExtend) {
            lines.push('  last-extend: ' + (recentExtend.ts || '') + ' \u2014 ' + (recentExtend.reason || '').slice(0, 80));
        }
        if (importsHit) {
            lines.push('  imports-in-payload: ' + importsHit.via);
        }
        lines.push('  note: no re-read required; emit `Pattern check: <pattern> \u2014 extended \u2014 continuing existing integration via ' + (viaPath || '<cited path>') + '`.');
        lines.push('END-PATTERN-CONTEXT');
        emit(lines);
        process.exit(0);
    }

    // Mode A — full preflight
    if (overBudget(cfg.contextPrep.timeBudgetMs)) process.exit(0);
    const siblings = listSiblings(filePath, cfg);
    const recents = recentDecisionsForFile(filePath, cfg);
    const imports = importsInPayload(payload.newText);
    const degraded = familyMatch ? familyHealthDegraded(filePath, familyMatch, cfg) : false;

    const lines = [
        'PATTERN-CONTEXT: advisory \u2014 read 1\u20133 siblings before Pattern check',
        '  triggered-by: ' + triggeredReasons.join(', '),
    ];
    if (familyMatch) {
        const mustRead = Array.isArray(familyMatch.mustRead) ? familyMatch.mustRead : [];
        lines.push('  family-hint: ' + (mustRead[0] || '(see usage doc)') + ' (' + familyMatch.family + ')');
        if (mustRead.length > 1) {
            for (const p of mustRead.slice(1)) lines.push('    also: ' + p);
        }
    }
    if (siblings.length > 0) {
        lines.push('  siblings:');
        for (const s of siblings) lines.push('    - ' + s);
    } else {
        lines.push('  siblings: (none matched — isolated file)');
    }
    if (recents.length > 0) {
        lines.push('  recent-decisions-on-file:');
        for (const r of recents) {
            const when = (r.ts || '').slice(0, 10);
            lines.push('    - ' + when + ' ' + (r.decision || '?') + ' ' + (r.pattern || '') + ' \u2014 "' + String(r.reason || '').slice(0, 80) + '"');
        }
    }
    if (imports.length > 0) {
        lines.push('  imports-in-payload:');
        for (const i of imports) lines.push('    - ' + i + ' (looks like family extension)');
    }
    if (degraded) {
        lines.push('  family-health: degraded');
        lines.push('    note: ' + familyMatch.family + ' has \u22653 refactor-candidate entries in last 30 days.');
        lines.push('    consider emitting `refactor-suggest` with `<Current>\u2192<Better>` and a cited path.');
    }
    lines.push('  action: Read 1\u20133 of the listed paths, then emit Pattern check citing one \u2014 or note `scanned N siblings, no family match`.');
    lines.push('END-PATTERN-CONTEXT');
    emit(lines);
    process.exit(0);
}

try {
    main();
} catch {
    // advisory hook must never block tool flow
    process.exit(0);
}
