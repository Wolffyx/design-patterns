/**
 * Shared helpers for pattern-* hooks.
 *
 * Used by:
 *   - check-pattern-preamble.js (PreToolUse, blocking)
 *   - pattern-context-prep.js   (PreToolUse, advisory — runs BEFORE preamble)
 *   - log-pattern-decision.js   (PostToolUse)
 *   - pattern-smell-detector.js (PostToolUse) — optional consumer
 *
 * Leading underscore marks this as a library, not a hook entry point.
 * Claude Code's hook runner only invokes files listed in settings.json.
 *
 * Hook ordering contract:
 *   In settings.json → hooks.PreToolUse.[matcher Write|Edit|MultiEdit].hooks[],
 *   pattern-context-prep.js MUST appear BEFORE check-pattern-preamble.js so
 *   the advisory stderr reaches the agent before the blocking validator runs.
 */

const fs = require('fs');
const path = require('path');

// --- default config (both global fallback + schema for overlays) -----------

const DEFAULT_CONFIG = {
    schema: {
        patternNames: [
            'Factory Method', 'Abstract Factory', 'Builder', 'Singleton', 'Prototype',
            'Adapter', 'Facade', 'Decorator', 'Composite', 'Proxy', 'Bridge', 'Flyweight',
            'Strategy', 'Observer', 'Iterator', 'Template Method', 'Command', 'State',
            'Chain of Responsibility', 'Mediator', 'Memento', 'Visitor',
            'no-pattern', 'no GoF pattern',
        ],
        decisions: ['applied', 'extended', 'rejected', 'refactor-suggest'],
        minReasonLength: 20,
    },
    blocking: {
        enabled: true,
        fileExtensions: ['ts', 'tsx'],
        excludeGlobs: [
            '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx',
            '**/*.types.ts', '**/*.types.tsx', '**/*.d.ts',
        ],
        substantiveTriggers: {
            newClass: true,
            newInterface: true,
            newAbstract: true,
            newExportedFunction: true,
            newExportedArrowConst: true,
            newFile: true,
            diffLineThreshold: 40,
        },
        smallEditThreshold: 10,
        skipDirective: '// pattern-check: skip',
    },
    perPathRules: [],
    contextPrep: {
        enabled: true,
        siblingNameRegex: '(Factory|Adapter|Strategy|Facade|Provider|Handler|Phase|Registry|Middleware|Base|base)',
        maxSiblings: 6,
        recentDecisionCount: 3,
        timeBudgetMs: 450,
        globDepth: 1,
    },
    validation: {
        requireCitationOnExtended: false,
        requireAntiExtendedClauseOnNewClassReject: false,
        antiExtendedPhrases: [
            'no-siblings', 'isolated', 'scanned siblings',
            'no family match', 'unrelated domain',
        ],
        requireArrowOnRefactorSuggest: true,
        refactorSuggestMinReasonLength: 40,
        enforceAntisignals: false,
        callerCountWarn: true,
        callerCountThreshold: 3,
        callerCountBudgetMs: 200,
    },
    sessionCache: {
        enabled: true,
        path: '~/.claude/cache/pattern-family-session.json',
        alreadyInFamilyDays: 30,
    },
    forbiddenPatterns: [],
    familyPreflight: [],
    log: {
        enabled: true,
        path: '.claude/pattern-decision-log.jsonl',
        blockStatsPath: '.claude/pattern-block-stats.jsonl',
    },
};

function mergeConfig(defaults, user) {
    user = user || {};
    return {
        schema: { ...defaults.schema, ...(user.schema || {}) },
        blocking: {
            ...defaults.blocking,
            ...(user.blocking || {}),
            substantiveTriggers: {
                ...defaults.blocking.substantiveTriggers,
                ...((user.blocking && user.blocking.substantiveTriggers) || {}),
            },
        },
        perPathRules: Array.isArray(user.perPathRules) ? user.perPathRules : [],
        contextPrep: { ...defaults.contextPrep, ...(user.contextPrep || {}) },
        validation: {
            ...defaults.validation,
            ...(user.validation || {}),
            antiExtendedPhrases:
                (user.validation && Array.isArray(user.validation.antiExtendedPhrases))
                    ? user.validation.antiExtendedPhrases
                    : defaults.validation.antiExtendedPhrases,
        },
        sessionCache: { ...defaults.sessionCache, ...(user.sessionCache || {}) },
        forbiddenPatterns: Array.isArray(user.forbiddenPatterns)
            ? user.forbiddenPatterns : [],
        familyPreflight: Array.isArray(user.familyPreflight)
            ? user.familyPreflight : [],
        log: { ...defaults.log, ...(user.log || {}) },
        smells: { ...(defaults.smells || {}), ...(user.smells || {}) },
        project: user.project || {},
    };
}

function loadConfig() {
    const configPath = path.join(process.cwd(), '.claude', 'pattern-check.config.json');
    if (!fs.existsSync(configPath)) return mergeConfig(DEFAULT_CONFIG, {});
    try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return mergeConfig(DEFAULT_CONFIG, parsed);
    } catch {
        return mergeConfig(DEFAULT_CONFIG, {});
    }
}

// --- io helpers ------------------------------------------------------------

function readStdin() {
    try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function safeJson(str) {
    try { return JSON.parse(str); } catch { return null; }
}

function expandHome(p) {
    if (!p) return p;
    if (p.startsWith('~')) return path.join(require('os').homedir(), p.slice(1));
    return p;
}

// --- glob matcher (minimal — **/ any prefix, ** any segments, * non-slash) --

function matchesGlob(filePath, glob) {
    const DS = '\x01';
    const SS = '\x02';
    const sentinelized = glob
        .replace(/\*\*\//g, DS)
        .replace(/\*\*/g, DS)
        .replace(/\*/g, SS);
    const escaped = sentinelized
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .split(DS).join('(?:.*)?')
        .split(SS).join('[^/]*');
    const re = new RegExp('^' + escaped + '$');
    return re.test(filePath.replace(/\\/g, '/'));
}

function toRelativePath(filePath, cwd) {
    const abs = String(filePath || '').replace(/\\/g, '/');
    const base = String(cwd || process.cwd()).replace(/\\/g, '/');
    const withSlash = base.endsWith('/') ? base : base + '/';
    if (abs.startsWith(withSlash)) return abs.slice(withSlash.length);
    // case-insensitive match for Windows drive letters
    if (abs.toLowerCase().startsWith(withSlash.toLowerCase())) return abs.slice(withSlash.length);
    return abs;
}

function matchesGlobAny(filePath, glob, cwd) {
    // try both absolute and repo-relative forms
    if (matchesGlob(filePath, glob)) return true;
    const rel = toRelativePath(filePath, cwd);
    if (rel !== filePath && matchesGlob(rel, glob)) return true;
    return false;
}

// --- payload analysis ------------------------------------------------------

function buildPayloadInfo(tool, toolInput) {
    const info = { newText: '', oldText: '', isNewFile: false };
    if (tool === 'Write') {
        info.newText = toolInput.content || '';
        info.isNewFile = true;
    } else if (tool === 'Edit') {
        info.newText = toolInput.new_string || '';
        info.oldText = toolInput.old_string || '';
    } else if (tool === 'MultiEdit') {
        const edits = Array.isArray(toolInput.edits) ? toolInput.edits : [];
        info.newText = edits.map(e => e.new_string || '').join('\n');
        info.oldText = edits.map(e => e.old_string || '').join('\n');
    }
    return info;
}

const CLASS_RE = /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+\w+\s*[{<]/m;
const INTERFACE_RE = /^[ \t]*(?:export\s+)?interface\s+\w+\s*[{<]/m;
const ABSTRACT_RE = /^[ \t]*(?:export\s+)?abstract\s+class\s+\w+\s*[{<]/m;
const EXPORTED_FN_RE = /^[ \t]*export\s+(?:default\s+)?(?:async\s+)?function\s+\w+\s*[<(]/m;
const EXPORTED_ARROW_RE = /^[ \t]*export\s+(?:default\s+)?const\s+\w+\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/m;

function normalizeWhitespace(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
}

function countNonWhitespaceLines(s) {
    return (s || '').split('\n').filter(l => l.trim().length > 0).length;
}

function detectTriggers(payloadInfo, triggers) {
    const t = payloadInfo.newText;
    const reasons = [];
    if (triggers.newClass && CLASS_RE.test(t)) reasons.push('new class');
    if (triggers.newInterface && INTERFACE_RE.test(t)) reasons.push('new interface');
    if (triggers.newAbstract && ABSTRACT_RE.test(t)) reasons.push('new abstract class');
    if (triggers.newExportedFunction && EXPORTED_FN_RE.test(t)) reasons.push('new exported function');
    if (triggers.newExportedArrowConst && EXPORTED_ARROW_RE.test(t)) reasons.push('new exported arrow-const');
    if (triggers.newFile && payloadInfo.isNewFile && countNonWhitespaceLines(t) > 0) {
        reasons.push('new file');
    }
    if (!payloadInfo.isNewFile && typeof triggers.diffLineThreshold === 'number') {
        const addedLines = countNonWhitespaceLines(t);
        const removedLines = countNonWhitespaceLines(payloadInfo.oldText);
        const diff = Math.max(addedLines, removedLines);
        if (Number.isFinite(triggers.diffLineThreshold) && diff >= triggers.diffLineThreshold) {
            reasons.push('diff size ' + diff + ' \u2265 ' + triggers.diffLineThreshold + ' lines');
        }
    }
    return reasons;
}

function hasNewSymbol(text) {
    return CLASS_RE.test(text) || INTERFACE_RE.test(text) || ABSTRACT_RE.test(text) ||
        EXPORTED_FN_RE.test(text) || EXPORTED_ARROW_RE.test(text);
}

function isWhitespaceOnlyDiff(payloadInfo) {
    if (payloadInfo.isNewFile) return false;
    return normalizeWhitespace(payloadInfo.oldText) === normalizeWhitespace(payloadInfo.newText);
}

function isSmallEdit(payloadInfo, threshold) {
    if (payloadInfo.isNewFile) return false;
    const total = countNonWhitespaceLines(payloadInfo.newText) + countNonWhitespaceLines(payloadInfo.oldText);
    return total < threshold;
}

// --- per-path rule resolution ---------------------------------------------

function resolvePathRule(filePath, rules) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const rule of (rules || [])) {
        if (!rule || !rule.glob) continue;
        if (matchesGlobAny(normalized, rule.glob)) return rule;
    }
    return null;
}

function triggersForPathRule(pathRule, baseTriggers) {
    if (!pathRule) return baseTriggers;
    if (pathRule.action === 'lite') {
        return {
            newClass: true, newInterface: true, newAbstract: true,
            newExportedFunction: false, newExportedArrowConst: false,
            newFile: false, diffLineThreshold: Infinity,
        };
    }
    return baseTriggers;
}

// --- preamble parsing (shared between preamble + log + refactor-suggest) ---

const PREAMBLE_RE = /Pattern check:\s*([^\n]+)/i;
const DECISION_RE = /(applied|extended|rejected|refactor-suggest)/i;

function parsePreambleBody(body) {
    // structured: <Name> (Tier N|-) — <decision> — <reason>
    const structured = body.match(
        /^([^()\u2014-]+?)\s*(?:\((?:Tier\s*(\d+)|-)\))?\s*[\u2014\-]+\s*(applied|extended|rejected|refactor-suggest)\s*[\u2014\-]+\s*(.+?)\.?$/i,
    );
    if (structured) {
        return {
            pattern: structured[1].trim(),
            tier: structured[2] ? parseInt(structured[2], 10) : null,
            decision: structured[3].toLowerCase(),
            reason: structured[4].trim(),
            structured: true,
        };
    }
    // legacy: <Name> (Tier N) — <reason>
    const legacy = body.match(/^([^\u2014\-]+?)\s*(?:\(Tier\s*(\d+)\))?\s*[\u2014\-]+\s*(.+?)\.?$/);
    if (legacy) {
        const pattern = legacy[1].trim();
        return {
            pattern,
            tier: legacy[2] ? parseInt(legacy[2], 10) : null,
            decision: /no[- ]pattern|no gof/i.test(pattern) ? 'rejected' : null,
            reason: legacy[3].trim(),
            structured: false,
        };
    }
    return null;
}

function findPreambleInText(text) {
    const match = (text || '').match(PREAMBLE_RE);
    if (!match) return null;
    return parsePreambleBody(match[1].trim());
}

function findAllPreamblesInText(text) {
    const matches = (text || '').match(/Pattern check:[^\n]+/gi) || [];
    return matches.map(m => parsePreambleBody(m.replace(/^Pattern check:\s*/i, '').trim()))
        .filter(Boolean);
}

function findPreambleInTranscript(transcriptPath) {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
    let text = '';
    try { text = fs.readFileSync(transcriptPath, 'utf8'); } catch { return null; }
    const lines = text.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        const entry = safeJson(lines[i]);
        if (!entry || entry.type !== 'assistant') continue;
        const content = entry.message && entry.message.content;
        if (!Array.isArray(content)) continue;
        const parts = content
            .filter(p => p && p.type === 'text' && typeof p.text === 'string')
            .map(p => p.text);
        if (parts.length === 0) continue;
        const joined = parts.join('\n');
        const found = findPreambleInText(joined);
        if (found) return found;
        break;
    }
    return null;
}

function findAllPreamblesInRecentTurn(transcriptPath) {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
    let text = '';
    try { text = fs.readFileSync(transcriptPath, 'utf8'); } catch { return []; }
    const lines = text.split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
        const entry = safeJson(lines[i]);
        if (!entry || entry.type !== 'assistant') continue;
        const content = entry.message && entry.message.content;
        if (!Array.isArray(content)) continue;
        const parts = content
            .filter(p => p && p.type === 'text' && typeof p.text === 'string')
            .map(p => p.text);
        if (parts.length === 0) continue;
        return findAllPreamblesInText(parts.join('\n'));
    }
    return [];
}

// --- pattern-smell ignore directive ---------------------------------------

/**
 * Recognized inline directive: `// pattern-smell: ignore <smellId>` or
 *                                `// pattern-smell: ignore *`
 * Position: same line as the detection OR the immediately preceding line.
 * `<smellId>` matches the detector key (singleton, observer, switch-on-type, ...).
 *
 * @param {string} text     full file text
 * @param {number} line     1-based line number of the detection
 * @param {string} smellId  detector key
 * @returns {boolean} true → suppress the emit
 */
function shouldIgnore(text, line, smellId) {
    if (!text || !line || !smellId) return false;
    const lines = String(text).split('\n');
    const idx = line - 1;
    if (idx < 0 || idx >= lines.length) return false;
    const re = /\/\/\s*pattern-smell:\s*ignore\s+([\w*\-]+)/i;
    for (const probe of [lines[idx], lines[idx - 1]]) {
        if (!probe) continue;
        const m = probe.match(re);
        if (!m) continue;
        const target = m[1].toLowerCase();
        if (target === '*' || target === smellId.toLowerCase()) return true;
    }
    return false;
}

/** 1-based line number of a character offset within text. */
function lineOf(text, charIndex) {
    if (!text || charIndex < 0) return 1;
    return text.slice(0, charIndex).split('\n').length;
}

// --- decision log tailing --------------------------------------------------

function tailLogLines(logPath, maxLines) {
    if (!logPath || !fs.existsSync(logPath)) return [];
    try {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        return lines.slice(-Math.max(1, maxLines));
    } catch {
        return [];
    }
}

function parseLogEntries(lines) {
    return lines
        .map(l => safeJson(l))
        .filter(e => e && typeof e === 'object');
}

// --- module export ---------------------------------------------------------

module.exports = {
    DEFAULT_CONFIG,
    loadConfig,
    mergeConfig,
    readStdin,
    safeJson,
    expandHome,
    matchesGlob,
    matchesGlobAny,
    toRelativePath,
    buildPayloadInfo,
    detectTriggers,
    hasNewSymbol,
    isWhitespaceOnlyDiff,
    isSmallEdit,
    normalizeWhitespace,
    countNonWhitespaceLines,
    resolvePathRule,
    triggersForPathRule,
    parsePreambleBody,
    findPreambleInText,
    findAllPreamblesInText,
    findPreambleInTranscript,
    findAllPreamblesInRecentTurn,
    tailLogLines,
    parseLogEntries,
    shouldIgnore,
    lineOf,
    regex: {
        CLASS_RE, INTERFACE_RE, ABSTRACT_RE,
        EXPORTED_FN_RE, EXPORTED_ARROW_RE,
        PREAMBLE_RE, DECISION_RE,
    },
    __sharedVersion: '1.0.0',
};
