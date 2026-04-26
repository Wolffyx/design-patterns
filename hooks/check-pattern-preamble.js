#!/usr/bin/env node
/**
 * PreToolUse hook: enforces the Pattern Check preamble (CLAUDE.md Rule 0).
 *
 * Scope:
 *   Any Write/Edit/MultiEdit on a .ts/.tsx source file that adds substantive
 *   new logic — a new class, interface, abstract class, exported function,
 *   exported arrow-const, a brand-new file, or a diff large enough to imply
 *   structural change (> diffLineThreshold non-whitespace lines).
 *
 * Validation layers (all gated on config flags, defaults preserve legacy):
 *   1. preamble must exist (payload or recent transcript turn)
 *   2. reason length >= schema.minReasonLength
 *   3. forbiddenPatterns — block `applied` of any listed pattern
 *   4. requireCitationOnExtended — `extended` reason must cite a real path
 *   5. requireAntiExtendedClauseOnNewClassReject — new-class reject must
 *      contain one of antiExtendedPhrases (auto-satisfied if session cache
 *      shows Mode B already-in-family for this file)
 *   6. refactor-suggest decision — must contain `→` and reason ≥ refactor
 *      SuggestMinReasonLength
 *
 * Soft advisory (non-blocking, emitted to stderr):
 *   - antisignal match (I2): reason matches the cited pattern's "Don't use
 *     when" phrases from references/_antisignals.json
 *   - caller-count warn (I5): reason says `isolated` but grep finds callers
 *
 * Bypass paths:
 *   - Test files (*.test.ts, *.spec.ts), type files (*.types.ts), .d.ts
 *   - Payload contains `// pattern-check: skip <reason>` escape hatch
 *   - Whitespace-only diff (rename, formatter run)
 *   - Small edit (< smallEditThreshold lines) with no new exported symbol
 *   - Per-path rule action === "skip"
 *   - HOOKS_DRY_RUN=1 → exit 0 even on block, stderr prefixed DRY-RUN:
 *
 * Hook ordering contract:
 *   pattern-context-prep.js runs BEFORE this hook (settings.json array order).
 *
 * Exit codes:
 *   0 → allow (default)
 *   2 → block (stderr shown to agent, tool call rejected)
 */

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');

const DRY_RUN = process.env.HOOKS_DRY_RUN === '1';

// --- output helpers --------------------------------------------------------

function prefix(line) { return DRY_RUN ? 'DRY-RUN: ' + line : line; }
function writeErr(text) { process.stderr.write(text.split('\n').map(prefix).join('\n') + '\n'); }

function exitAllow() { process.exit(0); }

function appendBlockStat(cfg, record) {
    if (!cfg.log || !cfg.log.blockStatsPath) return;
    try {
        const p = path.resolve(process.cwd(), cfg.log.blockStatsPath);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.appendFileSync(p, JSON.stringify(record) + '\n', 'utf8');
    } catch {
        // silent — telemetry must never break flow
    }
}

function exitBlock(cfg, record, message) {
    appendBlockStat(cfg, record);
    writeErr(message);
    process.exit(DRY_RUN ? 0 : 2);
}

// --- antisignal (I2) -------------------------------------------------------

function loadAntisignals() {
    const p = path.join(__dirname, '..', 'skills', 'design-patterns', 'references', '_antisignals.json');
    if (!fs.existsSync(p)) return {};
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) || {}; } catch { return {}; }
}

function antisignalHit(patternName, reason) {
    if (!patternName || !reason) return null;
    const map = loadAntisignals();
    const phrases = map[patternName];
    if (!Array.isArray(phrases) || phrases.length === 0) return null;
    const low = reason.toLowerCase();
    for (const phrase of phrases) {
        if (!phrase) continue;
        if (low.includes(String(phrase).toLowerCase())) return phrase;
    }
    return null;
}

// --- caller-count (I5) ----------------------------------------------------

function exportedSymbolNames(text) {
    const names = new Set();
    const re = /(?:^|\n)[ \t]*export\s+(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|interface|function|const|type)\s+(\w+)/g;
    let m;
    while ((m = re.exec(text || '')) !== null) names.add(m[1]);
    return Array.from(names);
}

function callerCount(name, cfg, selfFile) {
    const budget = cfg.validation.callerCountBudgetMs || 200;
    const start = Date.now();
    const roots = ['src'];
    let count = 0;
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '\\b');

    function walk(dir, depth) {
        if (count >= (cfg.validation.callerCountThreshold || 3)) return;
        if (Date.now() - start >= budget) return;
        if (depth > 6) return;
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            if (count >= (cfg.validation.callerCountThreshold || 3)) return;
            if (Date.now() - start >= budget) return;
            if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) { walk(full, depth + 1); continue; }
            if (!/\.(ts|tsx)$/.test(e.name)) continue;
            if (/\.(test|spec|d)\.(ts|tsx)$/.test(e.name)) continue;
            if (path.resolve(full) === path.resolve(selfFile)) continue;
            let txt = '';
            try { txt = fs.readFileSync(full, 'utf8'); } catch { continue; }
            if (re.test(txt)) count++;
        }
    }

    for (const r of roots) {
        const abs = path.resolve(process.cwd(), r);
        if (fs.existsSync(abs)) walk(abs, 0);
    }
    return count;
}

// --- session-cache check (Mode B auto-satisfy) -----------------------------

function isAlreadyInFamily(cfg, sessionId, filePath) {
    if (!cfg.sessionCache || !cfg.sessionCache.enabled) return false;
    if (!sessionId) return false;
    const p = shared.expandHome(cfg.sessionCache.path);
    if (!p || !fs.existsSync(p)) return false;
    try {
        const cache = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
        const key = sessionId + ':' + filePath.replace(/\\/g, '/');
        return Boolean(cache[key]);
    } catch { return false; }
}

// --- path-citation resolver (for I2 extended rule) -------------------------

const PATH_RE = /([A-Za-z_][\w./\-]*\.(?:ts|tsx))\b/;

function citationPathResolves(reason) {
    if (!reason) return null;
    const m = reason.match(PATH_RE);
    if (!m) return null;
    const candidate = m[1];
    const cwd = process.cwd();
    const tries = [
        path.resolve(cwd, candidate),
        path.resolve(cwd, 'src', candidate),
        candidate,
    ];
    for (const t of tries) {
        try { if (fs.existsSync(t)) return candidate; } catch {}
    }
    return null;
}

// --- main ------------------------------------------------------------------

const raw = shared.readStdin();
if (!raw) exitAllow();

const input = shared.safeJson(raw);
if (!input) exitAllow();

const tool = input.tool_name;
if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') exitAllow();

const cfg = shared.loadConfig();
if (!cfg.blocking.enabled) exitAllow();

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || '';
const fileName = path.basename(filePath);
const sessionId = input.session_id || '';

// extension filter
const extOk = cfg.blocking.fileExtensions.some(ext =>
    new RegExp('\\.' + ext + '$', 'i').test(filePath));
if (!extOk) exitAllow();

// exclusion globs
if (cfg.blocking.excludeGlobs.some(g => shared.matchesGlob(filePath, g))) exitAllow();

const payload = shared.buildPayloadInfo(tool, toolInput);
if (!payload.newText && !payload.oldText) exitAllow();

// skip directive
const skip = cfg.blocking.skipDirective || '// pattern-check: skip';
if (payload.newText.includes(skip) || payload.oldText.includes(skip)) exitAllow();

// whitespace-only diff
if (shared.isWhitespaceOnlyDiff(payload)) exitAllow();

// per-path rules
const pathRule = shared.resolvePathRule(filePath, cfg.perPathRules);
if (pathRule && pathRule.action === 'skip') exitAllow();
const triggers = shared.triggersForPathRule(pathRule, cfg.blocking.substantiveTriggers);

// small edit with no new symbol → allow
if (shared.isSmallEdit(payload, cfg.blocking.smallEditThreshold)) {
    if (!shared.hasNewSymbol(payload.newText)) exitAllow();
}

const triggeredReasons = shared.detectTriggers(payload, triggers);
if (triggeredReasons.length === 0) exitAllow();

// find preamble (payload first, then transcript)
const payloadPreamble = shared.findPreambleInText(payload.newText);
const preamble = payloadPreamble || shared.findPreambleInTranscript(input.transcript_path);

// no preamble → block w/ guidance
if (!preamble) {
    const pathHint = (pathRule && pathRule.reason) ? '\nPath rule (' + pathRule.glob + '): ' + pathRule.reason : '';
    const fixSuggestion = [
        '    Pattern check: no GoF pattern (-) \u2014 rejected \u2014 <\u226520 chars explaining why inline is correct>',
        '  or if a pattern genuinely fits:',
        '    Pattern check: <PatternName> (Tier <N>) \u2014 applied  \u2014 <reason \u226520 chars>',
        '    Pattern check: <PatternName> (Tier <N>) \u2014 extended \u2014 <cite existing .ts/.tsx path>',
    ].join('\n');
    exitBlock(cfg, {
        ts: new Date().toISOString(),
        rule: 'preamble-missing',
        file: filePath.replace(/\\/g, '/'),
        decision: null,
        reasonExcerpt: '',
    }, [
        'BLOCKED by Rule 0 (Pattern Check) \u2014 CLAUDE.md',
        '',
        'File: ' + fileName,
        'Triggered by: ' + triggeredReasons.join(', '),
        pathHint,
        '',
        'Required before writing: emit one line of the form',
        '',
        fixSuggestion,
        '',
        'Most bug fixes / small edits answer \"no GoF pattern\" \u2014 that is correct.',
        '',
        'Read before deciding:',
        '  .claude/skills/design-patterns/SKILL.md',
        '  .claude/design-patterns-project-usage.md',
        '  .claude/skills/design-patterns/references/<slug>.md',
        '',
        'Bypass for mechanical codemods: add `' + skip + ' <reason>` to the payload.',
        '',
        'Retry the tool call after emitting the Pattern check line.',
    ].join('\n'));
}

const minLen = cfg.schema.minReasonLength || 0;
const reason = (preamble.reason || '');
const decision = preamble.decision || null;
const patternName = preamble.pattern || '';

// --- reason length check (I7 fix hint) ------------------------------------

if (reason.length < minLen) {
    exitBlock(cfg, {
        ts: new Date().toISOString(),
        rule: 'reason-too-short',
        file: filePath.replace(/\\/g, '/'),
        decision,
        reasonExcerpt: reason.slice(0, 60),
    }, [
        'BLOCKED by Rule 0 \u2014 preamble reason too short',
        '',
        'File: ' + fileName,
        'Got: ' + reason.length + ' chars. Required: \u2265 ' + minLen + '.',
        '',
        'Suggest preamble:',
        '  Pattern check: ' + (patternName || 'no GoF pattern (-)') +
            (decision ? ' \u2014 ' + decision : ' \u2014 rejected') +
            ' \u2014 ' + (reason || '<specific why>') + ', single caller, no second impl on horizon',
    ].join('\n'));
}

// --- I1: forbiddenPatterns block on `applied` -----------------------------

if (decision === 'applied' && Array.isArray(cfg.forbiddenPatterns)) {
    const forbidden = cfg.forbiddenPatterns.find(
        p => String(p).toLowerCase() === patternName.toLowerCase());
    if (forbidden) {
        exitBlock(cfg, {
            ts: new Date().toISOString(),
            rule: 'forbidden-pattern',
            file: filePath.replace(/\\/g, '/'),
            decision,
            pattern: patternName,
            reasonExcerpt: reason.slice(0, 60),
        }, [
            'BLOCKED by Rule 0 \u2014 forbidden pattern',
            '',
            'Pattern "' + patternName + '" is listed in `.claude/pattern-check.config.json` \u2192 `forbiddenPatterns`.',
            'Project ethos discourages this pattern here. Prefer an alternative (see project-usage.md).',
            '',
            'If the project rule has changed, remove "' + patternName + '" from `forbiddenPatterns` in config.',
        ].join('\n'));
    }
}

// --- I2: antisignal soft warn (non-blocking) ------------------------------

if ((decision === 'applied' || decision === 'extended') && cfg.validation.enforceAntisignals !== false) {
    const hit = antisignalHit(patternName, reason);
    if (hit) {
        writeErr([
            'WARN (pattern-antisignal): "' + patternName + '" reason matches antisignal phrase: "' + hit + '"',
            '  Reference: ~/.claude/skills/design-patterns/references/<slug>.md \u2192 "Don\'t use when"',
            '  (non-blocking; logged as antisignal)',
        ].join('\n'));
        appendBlockStat(cfg, {
            ts: new Date().toISOString(),
            rule: 'antisignal',
            file: filePath.replace(/\\/g, '/'),
            decision,
            pattern: patternName,
            antisignal: hit,
            blocking: false,
        });
    }
}

// --- path citation resolver ------------------------------------------------

const modeBSatisfied = isAlreadyInFamily(cfg, sessionId, filePath);

// --- requireCitationOnExtended --------------------------------------------

if (decision === 'extended' && cfg.validation.requireCitationOnExtended && !modeBSatisfied) {
    const resolved = citationPathResolves(reason);
    if (!resolved) {
        exitBlock(cfg, {
            ts: new Date().toISOString(),
            rule: 'extended-missing-citation',
            file: filePath.replace(/\\/g, '/'),
            decision,
            pattern: patternName,
            reasonExcerpt: reason.slice(0, 80),
        }, [
            'BLOCKED by Rule 0 \u2014 `extended` decision must cite a real file path',
            '',
            'File: ' + fileName,
            'Pattern: ' + (patternName || '(unspecified)'),
            'Reason: "' + reason + '"',
            '',
            'Required: reason must include a .ts/.tsx path that resolves on disk.',
            '',
            'Suggest preamble:',
            '  Pattern check: ' + (patternName || '<Pattern>') +
                ' (Tier <N>) \u2014 extended \u2014 mirrors <existing>.ts via src/main/<subdir>/base.ts',
            '',
            'Config toggle: `validation.requireCitationOnExtended` in pattern-check.config.json.',
        ].join('\n'));
    }
}

// --- requireAntiExtendedClauseOnNewClassReject ----------------------------

if (decision === 'rejected' && cfg.validation.requireAntiExtendedClauseOnNewClassReject && !modeBSatisfied) {
    const newSymbolTriggers = triggeredReasons.filter(
        r => /new (class|interface|abstract)/i.test(r));
    if (newSymbolTriggers.length > 0) {
        const phrases = cfg.validation.antiExtendedPhrases || [];
        const low = reason.toLowerCase();
        const found = phrases.find(p => low.includes(String(p).toLowerCase()));
        if (!found) {
            exitBlock(cfg, {
                ts: new Date().toISOString(),
                rule: 'reject-new-class-missing-scan-clause',
                file: filePath.replace(/\\/g, '/'),
                decision,
                pattern: patternName,
                reasonExcerpt: reason.slice(0, 80),
            }, [
                'BLOCKED by Rule 0 \u2014 rejecting a new class without cross-file scan',
                '',
                'File: ' + fileName,
                'Trigger: ' + newSymbolTriggers.join(', '),
                '',
                'A new class/interface/abstract was introduced but reason does not',
                'indicate any cross-file scan. Include one of these phrases:',
                '  ' + phrases.join(', '),
                '',
                'Suggest preamble:',
                '  Pattern check: no GoF pattern (-) \u2014 rejected \u2014 scanned siblings, no family match, ' +
                    'isolated helper; ' + (reason || '<brief why>'),
                '',
                'Config toggle: `validation.requireAntiExtendedClauseOnNewClassReject` in pattern-check.config.json.',
            ].join('\n'));
        }
    }
}

// --- refactor-suggest validation ------------------------------------------

if (decision === 'refactor-suggest') {
    const needsArrow = cfg.validation.requireArrowOnRefactorSuggest !== false;
    const minR = cfg.validation.refactorSuggestMinReasonLength || 40;
    const arrowOk = !needsArrow || /\u2192/.test(reason) || /refactor-candidate/i.test(reason) || /\u2192/.test(patternName);
    const resolved = citationPathResolves(reason);
    if (!arrowOk || reason.length < minR || !resolved) {
        exitBlock(cfg, {
            ts: new Date().toISOString(),
            rule: 'refactor-suggest-malformed',
            file: filePath.replace(/\\/g, '/'),
            decision,
            pattern: patternName,
            reasonExcerpt: reason.slice(0, 80),
        }, [
            'BLOCKED by Rule 0 \u2014 `refactor-suggest` decision malformed',
            '',
            'Required form:',
            '  Pattern check: <Current>\u2192<Better> (Tier <N>) \u2014 refactor-suggest \u2014 ' +
                '<what current does, what better would do, cited .ts path> (\u2265 ' + minR + ' chars)',
            '',
            'Checks: arrow \u2192 present = ' + arrowOk + ', reason \u2265 ' + minR + ' chars = ' +
                (reason.length >= minR) + ', cited path resolves = ' + Boolean(resolved),
            '',
            'Example:',
            '  Pattern check: Facade\u2192Facade+Strategy (Tier 1) \u2014 refactor-suggest \u2014 ' +
                'current facade has 12 methods (god-class risk); splitting by action-type Strategy keyed on ' +
                'src/main/services/foo.ts would isolate dispatch.',
        ].join('\n'));
    }
    // non-blocking echo so the user sees the suggestion live
    writeErr('REFACTOR-SUGGESTED: ' + patternName + ' \u2014 ' + reason.slice(0, 120));
}

// --- I5: caller-count warn on isolated rejects ----------------------------

if (decision === 'rejected' && cfg.validation.callerCountWarn && /isolated|no-siblings/.test(reason)) {
    const names = exportedSymbolNames(payload.newText);
    const candidate = names[0];
    if (candidate) {
        const count = callerCount(candidate, cfg, filePath);
        const threshold = cfg.validation.callerCountThreshold || 3;
        if (count >= threshold) {
            writeErr([
                'WARN (caller-count): `' + candidate + '` has ' + count + '+ existing callers; ',
                '  "isolated" may be wrong \u2014 consider Strategy/Factory or cite extension.',
                '  (non-blocking; rejection still stands if you proceed)',
            ].join('\n'));
            appendBlockStat(cfg, {
                ts: new Date().toISOString(),
                rule: 'caller-count-warn',
                file: filePath.replace(/\\/g, '/'),
                decision,
                symbol: candidate,
                callers: count,
                blocking: false,
            });
        }
    }
}

exitAllow();
