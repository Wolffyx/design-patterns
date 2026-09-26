/**
 * _smells.js — the smell registry shared by the PostToolUse detector
 * (pattern-smell-detector.js, advisory) and the PreToolUse gate
 * (pattern-smell-gate.js, blocks smells configured as `block`).
 *
 * Owns: smell config defaults + merge, running every detector module on one
 * shared scan, edit scoping, per-smell severity, suppression directives, and
 * the smell log that analyze-log.js reads for tuning suggestions.
 *
 * Detector modules:
 *   _gof-smells.js           GoF shapes (switch-on-type, god-class, singleton …)
 *   _control-flow-smells.js  nested-if, deep-nesting, else-after-return, ladders
 *   _function-smells.js      long-function, params, flags, complexity, swallowed errors
 *   _nplusone.js             n-plus-one, await-in-loop
 */

'use strict';

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');
const scanLib = require('./_code-scan');
const gof = require('./_gof-smells');
const controlFlow = require('./_control-flow-smells');
const functions = require('./_function-smells');
const nPlusOne = require('./_nplusone');

const SEVERITIES = ['off', 'advise', 'block'];

const DEFAULT_SMELLS = {
    enabled: true,
    // 'edited': report only findings on lines the Edit / MultiEdit wrote (or
    // whose class / function span it touched); 'file': the whole file
    scope: 'edited',
    // smellId (or '*') → 'off' | 'advise' | 'block'; unlisted smells advise
    severity: {},

    // GoF shapes
    switchOnTypeMinCases: 4,
    instanceofChainMinBranches: 3,
    repeatedNewMinOccurrences: 3,
    constructorMaxParams: 5,
    godClassMinPublicMethods: 8,
    boundaryViolationPaths: {
        guardedPath: '',
        forbiddenImports: [],
        allowedPaths: [],
        routeThroughHint: 'the project\'s package-boundary interface (see project-usage doc)',
    },
    detectors: {
        singleton: { enabled: true },
        observer: { enabled: true, minClusterSize: 3 },
        command: { enabled: true },
        templateMethod: { enabled: true, minAbstract: 2 },
    },

    // control flow
    maxNestingDepth: 2,
    nestedIf: true,
    elseAfterReturn: true,
    conditionalLadderMinBranches: 3,
    scatteredDiscriminatorMinSites: 3,

    // functions
    maxFunctionLines: 50,
    maxParams: 4,
    booleanFlagParam: true,
    maxComplexity: 10,
    swallowedException: true,

    // N+1
    nPlusOne: {
        enabled: true,
        minConfidence: 'medium',
        flagAwaitInLoop: true,
        includeWhileLoops: false,
        smallLoopMax: 10,
        followLocalFunctions: true,
        lazyLoad: true,
        resolvers: true,
        extraCallPatterns: [],
        dataAccessReceivers: '',
    },

    crossFile: {
        enabled: false,
        cacheTtlDays: 14,
        cachePath: '.claude/cache/pattern-smell-corpus.json',
    },
};

function mergeSmells(user) {
    const u = user || {};
    const d = DEFAULT_SMELLS;
    const det = u.detectors || {};
    const merged = {
        ...d,
        ...u,
        severity: { ...d.severity, ...(u.severity || {}) },
        boundaryViolationPaths: { ...d.boundaryViolationPaths, ...(u.boundaryViolationPaths || {}) },
        detectors: {
            singleton: { ...d.detectors.singleton, ...(det.singleton || {}) },
            observer: { ...d.detectors.observer, ...(det.observer || {}) },
            command: { ...d.detectors.command, ...(det.command || {}) },
            templateMethod: { ...d.detectors.templateMethod, ...(det.templateMethod || {}) },
        },
        nPlusOne: { ...d.nPlusOne, ...(u.nPlusOne || {}) },
        crossFile: { ...d.crossFile, ...(u.crossFile || {}) },
    };
    // v1.1 alias: controlFlowScope → scope
    if (u.scope === undefined && u.controlFlowScope !== undefined) merged.scope = u.controlFlowScope;
    return merged;
}

/** Full hook config with `smells` deep-merged over the defaults. */
function loadConfig() {
    const cfg = shared.loadConfig();
    return { ...cfg, smells: mergeSmells(cfg.smells) };
}

function severityOf(smellId, s) {
    const v = (s.severity || {})[smellId] || (s.severity || {})['*'] || 'advise';
    return SEVERITIES.includes(v) ? v : 'advise';
}

function anyBlocking(s) {
    return Object.values(s.severity || {}).includes('block');
}

/** Is this file one the hooks should look at (extension + excludes)? */
function inScopeFile(filePath, cfg) {
    const extOk = (cfg.blocking.fileExtensions || []).some(ext =>
        new RegExp('\\.' + String(ext).replace(/[.+*?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(filePath));
    if (!extOk) return false;
    return !(cfg.blocking.excludeGlobs || []).some(g => shared.matchesGlob(filePath, g));
}

/**
 * Every finding in `text` (unscoped, unsuppressed).
 * @returns {Array<{smellId, line, message, suggest, refSlug, signature, span?, sites?, confidence?}>}
 */
function runAll(text, filePath, s) {
    const langId = shared.langIdForFile(filePath);
    if (!langId || !text) return [];
    const scan = scanLib.scanBlocks(text, langId);
    const out = [];
    out.push(...gof.detectAll(scan, filePath, s));
    out.push(...controlFlow.detectAll(scan, s));
    out.push(...functions.detectAll(scan, s));
    out.push(...nPlusOne.detect(scan, s.nPlusOne));
    return out.sort((a, b) => a.line - b.line);
}

/**
 * Split findings for one tool call into what to report and what the author
 * suppressed. Findings outside the edit scope or with severity `off` drop out.
 */
function select(findings, text, ranges, s) {
    const report = [];
    const suppressed = [];
    for (const f of findings) {
        const severity = severityOf(f.smellId, s);
        if (severity === 'off') continue;
        if (!scanLib.inEditScope(f, ranges)) continue;
        const withSev = { ...f, severity };
        if (shared.shouldIgnore(text, f.line, f.smellId)) suppressed.push(withSev);
        else report.push(withSev);
    }
    return { report, suppressed };
}

/**
 * Lines that differ between two versions: the block left after trimming the
 * common prefix and suffix. null = everything (no previous version).
 */
function changedLineRanges(oldText, newText) {
    if (oldText === null || oldText === undefined) return null;
    const a = oldText.split('\n');
    const b = newText.split('\n');
    let pre = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    const start = pre + 1;
    const end = b.length - suf;
    return end >= start ? [[start, end]] : [];
}

function formatFinding(fileRel, f) {
    const tag = f.severity === 'block' ? ' (block)' : '';
    const refLine = f.refSlug
        ? `  See: .claude/skills/design-patterns/references/${f.refSlug}.md\n`
        : '';
    return `[pattern-smell]${tag} ${fileRel}:${f.line} ${f.message} — consider ${f.suggest}.\n` +
        refLine +
        '  Existing project use: .claude/design-patterns-project-usage.md\n' +
        `  (suppress: \`// pattern-smell: ignore ${f.smellId}\` — \`#\` in Python)\n`;
}

function logFindings(cfg, file, entries) {
    const log = cfg.log || {};
    if (log.enabled === false || !entries.length) return;
    const p = path.resolve(process.cwd(), log.smellLogPath || '.claude/pattern-smell-log.jsonl');
    const ts = new Date().toISOString();
    const lines = entries.map(e => JSON.stringify({
        ts,
        file: file.replace(/\\/g, '/'),
        line: e.f.line,
        smellId: e.f.smellId,
        severity: e.f.severity,
        suppressed: e.suppressed,
        ...(e.f.confidence ? { confidence: e.f.confidence } : {}),
    })).join('\n') + '\n';
    try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.appendFileSync(p, lines, 'utf8');
    } catch {
        // telemetry must never break the flow
    }
}

module.exports = {
    DEFAULT_SMELLS,
    mergeSmells,
    loadConfig,
    severityOf,
    anyBlocking,
    inScopeFile,
    runAll,
    select,
    changedLineRanges,
    formatFinding,
    logFindings,
};
