#!/usr/bin/env node
/**
 * PostToolUse hook: scans the post-edit file for code smells that suggest a
 * GoF pattern. Non-blocking — emits suggestions to stderr and exits 0.
 *
 * Complements check-pattern-preamble.js (which enforces a preamble but does
 * not inspect what the code actually does). This hook answers the other half
 * of the question: "is a pattern possible here?"
 *
 * Heuristics (regex-based, intentionally simple):
 *   switch-on-type        ≥4 cases on `.type|.kind|.variant|.tag` → Strategy/State
 *   instanceof-chain      ≥3 branches → Strategy/Visitor
 *   repeated-new          ≥3 `new Concrete(...)` of one ctor → Factory Method
 *   long-constructor      ≥5 params → Builder
 *   god-class             ≥8 public methods → Facade / split
 *   boundary-violation    forbidden import in guarded path → Adapter
 *   family-naming         new *Factory|*Adapter|*Facade|*Registry → verify family
 *   singleton             private ctor + static instance + getInstance() → Singleton
 *   observer              ≥3 of {addListener,on(,subscribe(,emit(,notify(} clustered → Observer
 *   command               class with execute()+undo() OR Command[]/history field → Command
 *   template-method       abstract class w/ ≥2 abstract methods called via this. → Template Method
 *
 * Per-line suppression:
 *   Add `// pattern-smell: ignore <smellId>` on the same line OR the line above
 *   the detection. Use `*` to suppress all smells on that line.
 *
 * Cross-file (opt-in via `smells.crossFile.enabled`):
 *   Tracks normalized signatures across files. When ≥2 files share the same
 *   shape (e.g. same switch-on `kind` with cases A|B|C), emits a stronger
 *   "cross-file: <signature> appears in N files" hint.
 *
 * All project-specific rules live in .claude/pattern-check.config.json.
 *
 * Input: JSON on stdin from PostToolUse; tool_name, tool_input.file_path.
 * Output: [pattern-smell] <file>:<line> <smell> — consider <pattern>.
 */

const fs = require('fs');
const path = require('path');
const shared = require('./_pattern-shared');
const corpus = require('./_smell-corpus');

const DEFAULT_CONFIG = {
    smells: {
        enabled: true,
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
            singleton:      { enabled: true },
            observer:       { enabled: true, minClusterSize: 3 },
            command:        { enabled: true },
            templateMethod: { enabled: true, minAbstract: 2 },
        },
        crossFile: {
            enabled: false,
            cacheTtlDays: 14,
            cachePath: '.claude/cache/pattern-smell-corpus.json',
        },
    },
    blocking: {
        fileExtensions: ['ts', 'tsx'],
        excludeGlobs: [
            '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx',
            '**/*.types.ts', '**/*.types.tsx', '**/*.d.ts',
        ],
    },
};

function deepMergeSmells(defs, user) {
    const u = user || {};
    return {
        ...defs,
        ...u,
        boundaryViolationPaths: {
            ...defs.boundaryViolationPaths,
            ...(u.boundaryViolationPaths || {}),
        },
        detectors: {
            singleton:      { ...defs.detectors.singleton,      ...((u.detectors || {}).singleton || {}) },
            observer:       { ...defs.detectors.observer,       ...((u.detectors || {}).observer || {}) },
            command:        { ...defs.detectors.command,        ...((u.detectors || {}).command || {}) },
            templateMethod: { ...defs.detectors.templateMethod, ...((u.detectors || {}).templateMethod || {}) },
        },
        crossFile: { ...defs.crossFile, ...(u.crossFile || {}) },
    };
}

function loadConfig() {
    const configPath = path.join(process.cwd(), '.claude', 'pattern-check.config.json');
    if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
    try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
            smells: deepMergeSmells(DEFAULT_CONFIG.smells, parsed.smells),
            blocking: {
                fileExtensions:
                    (parsed.blocking && parsed.blocking.fileExtensions) ||
                    DEFAULT_CONFIG.blocking.fileExtensions,
                excludeGlobs:
                    (parsed.blocking && parsed.blocking.excludeGlobs) ||
                    DEFAULT_CONFIG.blocking.excludeGlobs,
            },
        };
    } catch {
        return DEFAULT_CONFIG;
    }
}

function readStdin() {
    try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function safeJson(str) {
    try { return JSON.parse(str); } catch { return null; }
}

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
    return new RegExp('^' + escaped + '$').test(filePath.replace(/\\/g, '/'));
}

function lineOf(text, idx) {
    if (idx <= 0) return 1;
    return text.slice(0, idx).split('\n').length;
}

// --- emit -----------------------------------------------------------------

const allFindings = []; // for cross-file corpus

function emit(fileRel, fileText, finding) {
    if (shared.shouldIgnore(fileText, finding.line, finding.smellId)) return;
    allFindings.push(finding);
    const refLine = finding.refSlug
        ? `  See: .claude/skills/design-patterns/references/${finding.refSlug}.md`
        : '';
    const projectLine = '  Existing project use: .claude/design-patterns-project-usage.md';
    const ignoreHint = `  (suppress: \`// pattern-smell: ignore ${finding.smellId}\`)`;
    process.stderr.write(
        `[pattern-smell] ${fileRel}:${finding.line} ${finding.message} \u2014 consider ${finding.suggest}.\n` +
        (refLine ? refLine + '\n' : '') +
        projectLine + '\n' +
        ignoreHint + '\n',
    );
}

// --- existing detectors (now returning {line, signature?}) ----------------

function detectSwitchOnType(text, minCases) {
    const re = /switch\s*\(\s*\w+\.(type|kind|variant|tag)\s*\)\s*{/g;
    const findings = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        const discriminator = m[1];
        const start = m.index + m[0].length;
        let depth = 1;
        let i = start;
        let caseCount = 0;
        const cases = [];
        while (i < text.length && depth > 0) {
            const ch = text[i];
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            else if (ch === 'c' && depth === 1 && text.startsWith('case ', i)) {
                caseCount++;
                // capture case literal up to ":" for signature
                const colon = text.indexOf(':', i + 5);
                if (colon !== -1) cases.push(text.slice(i + 5, colon).trim());
                i += 5;
                continue;
            }
            i++;
        }
        if (caseCount >= minCases) {
            findings.push({
                smellId: 'switch-on-type',
                line: lineOf(text, m.index),
                message: `switch-on-type (${caseCount} cases on \`.${discriminator}\`)`,
                suggest: 'Strategy or State',
                refSlug: 'strategy',
                signature: `${discriminator}|${cases.slice().sort().join(',')}`,
            });
        }
    }
    return findings;
}

function detectInstanceofChain(text, minBranches) {
    const lines = text.split('\n');
    let runStartLine = -1;
    let currentRun = 0;
    const findings = [];
    const classes = [];
    const re = /\b(instanceof|typeof)\b\s+(\w+)?/g;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isBranch =
            /\bif\s*\(.*\b(instanceof|typeof)\b/.test(line) ||
            /\belse\s+if\s*\(.*\b(instanceof|typeof)\b/.test(line);
        if (isBranch) {
            if (currentRun === 0) runStartLine = i + 1;
            currentRun++;
            let mm;
            while ((mm = re.exec(line)) !== null) if (mm[2]) classes.push(mm[2]);
        } else if (line.trim().length > 0 && !/^\s*}/.test(line)) {
            if (currentRun >= minBranches) {
                findings.push({
                    smellId: 'instanceof-chain',
                    line: runStartLine,
                    message: `instanceof/typeof chain (${currentRun} branches)`,
                    suggest: 'Strategy or Visitor',
                    refSlug: 'strategy',
                    signature: classes.slice().sort().join(','),
                });
            }
            currentRun = 0;
            classes.length = 0;
        }
    }
    if (currentRun >= minBranches) {
        findings.push({
            smellId: 'instanceof-chain',
            line: runStartLine,
            message: `instanceof/typeof chain (${currentRun} branches)`,
            suggest: 'Strategy or Visitor',
            refSlug: 'strategy',
            signature: classes.slice().sort().join(','),
        });
    }
    return findings;
}

function detectRepeatedNew(text, minOccurrences) {
    const counts = {};
    const firstLine = {};
    const re = /new\s+([A-Z]\w+)\s*\(/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const name = m[1];
        counts[name] = (counts[name] || 0) + 1;
        if (firstLine[name] === undefined) firstLine[name] = lineOf(text, m.index);
    }
    return Object.entries(counts)
        .filter(([, n]) => n >= minOccurrences)
        .map(([name, n]) => ({
            smellId: 'repeated-new',
            line: firstLine[name],
            message: `repeated \`new ${name}\` (×${n})`,
            suggest: 'Factory Method',
            refSlug: 'factory-method',
            signature: name,
        }));
}

function detectLongConstructor(text, maxParams) {
    const re = /constructor\s*\(([^)]*)\)/g;
    const findings = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        const params = m[1].split(',').map(s => s.trim()).filter(Boolean);
        if (params.length >= maxParams) {
            findings.push({
                smellId: 'long-constructor',
                line: lineOf(text, m.index),
                message: `long constructor (${params.length} params)`,
                suggest: 'Builder',
                refSlug: 'builder',
                signature: String(params.length),
            });
        }
    }
    return findings;
}

function detectGodClass(text, minPublicMethods) {
    const classRe = /class\s+(\w+)[^{]*{/g;
    const findings = [];
    let cm;
    while ((cm = classRe.exec(text)) !== null) {
        const start = cm.index + cm[0].length;
        let depth = 1;
        let i = start;
        while (i < text.length && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            i++;
        }
        const body = text.slice(start, i - 1);
        const publicMethods = (body.match(/^\s*(?:public\s+)?(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*{/gm) || []).length;
        const privateMethods = (body.match(/^\s*private\s+/gm) || []).length;
        const estimate = publicMethods - privateMethods;
        if (estimate >= minPublicMethods) {
            findings.push({
                smellId: 'god-class',
                line: lineOf(text, cm.index),
                message: `large class ${cm[1]} (${estimate} methods)`,
                suggest: 'Facade or split by responsibility',
                refSlug: 'facade',
                signature: cm[1],
            });
        }
    }
    return findings;
}

function detectBoundaryViolation(filePath, text, cfg) {
    if (!cfg || !cfg.guardedPath) return [];
    const normalized = filePath.replace(/\\/g, '/');
    if (!normalized.includes(cfg.guardedPath)) return [];
    if ((cfg.allowedPaths || []).some(p => normalized.includes(p))) return [];
    const findings = [];
    const hint = cfg.routeThroughHint || 'the project\'s package-boundary interface';
    for (const mod of cfg.forbiddenImports || []) {
        const re = new RegExp(`from\\s+['"]${mod.replace(/\./g, '\\.')}['"]`);
        const m = re.exec(text);
        if (m) {
            findings.push({
                smellId: 'boundary-violation',
                line: lineOf(text, m.index),
                message: `cross-package import of ${mod} in guarded path`,
                suggest: `Adapter (route through ${hint})`,
                refSlug: 'adapter',
                signature: mod,
            });
        }
    }
    return findings;
}

function detectFamilyNaming(text) {
    const re = /^[ \t]*(?:export\s+)?(?:default\s+)?class\s+(\w+(?:Factory|Adapter|Facade|Registry))\b/gm;
    const findings = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        findings.push({
            smellId: 'family-naming',
            line: lineOf(text, m.index),
            message: `new class ${m[1]} matches a project pattern-family naming convention`,
            suggest: 'verify it extends the existing family in design-patterns-project-usage.md',
            refSlug: '',
            signature: m[1],
        });
    }
    return findings;
}

// --- new detectors --------------------------------------------------------

function detectSingleton(text) {
    const hasPrivateCtor = /private\s+constructor\s*\(/.test(text);
    const hasStaticInstance = /static\s+(?:readonly\s+)?\w+\s*[:=][^;]*;/.test(text);
    const getInstanceMatch = /static\s+(?:get)?[Ii]nstance\s*\(/.exec(text);
    if (!hasPrivateCtor || !hasStaticInstance || !getInstanceMatch) return [];
    // anchor to class declaration line so the ignore directive can sit above it
    const classMatch = /(^|\n)\s*(?:export\s+)?(?:default\s+)?class\s+(\w+)/m.exec(
        text.slice(0, getInstanceMatch.index));
    const anchorIdx = classMatch
        ? classMatch.index + (classMatch[1] ? 1 : 0)
        : getInstanceMatch.index;
    const className = classMatch ? classMatch[2] : '';
    return [{
        smellId: 'singleton',
        line: lineOf(text, anchorIdx),
        message: `class ${className} has private ctor + static instance + getInstance()`,
        suggest: 'Singleton (verify global state is intentional, not a stealth global)',
        refSlug: 'singleton',
        signature: className || 'singleton-shape',
    }];
}

function detectObserver(text, minCluster) {
    // count subscribe-shape calls per class body
    const classRe = /class\s+(\w+)[^{]*{/g;
    const findings = [];
    const subRe = /\b(addListener|on|subscribe|emit|notify)\s*\(/g;
    let cm;
    while ((cm = classRe.exec(text)) !== null) {
        const start = cm.index + cm[0].length;
        let depth = 1;
        let i = start;
        while (i < text.length && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            i++;
        }
        const body = text.slice(start, i - 1);
        const verbs = new Set();
        let m;
        while ((m = subRe.exec(body)) !== null) verbs.add(m[1]);
        subRe.lastIndex = 0;
        if (verbs.size >= minCluster) {
            findings.push({
                smellId: 'observer',
                line: lineOf(text, cm.index),
                message: `class ${cm[1]} clusters ${verbs.size} pub/sub verbs (${Array.from(verbs).sort().join(', ')})`,
                suggest: 'Observer (use a real Subject / EventEmitter / RxJS Subject)',
                refSlug: 'observer',
                signature: `${cm[1]}|${Array.from(verbs).sort().join(',')}`,
            });
        }
    }
    return findings;
}

function detectCommand(text) {
    const findings = [];
    const classRe = /class\s+(\w+)[^{]*{/g;
    let cm;
    while ((cm = classRe.exec(text)) !== null) {
        const start = cm.index + cm[0].length;
        let depth = 1;
        let i = start;
        while (i < text.length && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            i++;
        }
        const body = text.slice(start, i - 1);
        const hasExecute = /\bexecute\s*\(/.test(body);
        const hasUndo = /\bundo\s*\(/.test(body);
        const hasHistory = /\b(history|stack|queue)\s*[:=]\s*[^;]*\b(Command|\[\])/i.test(body) ||
            /Array\s*<\s*\w*Command\w*\s*>/.test(body);
        if ((hasExecute && hasUndo) || hasHistory) {
            findings.push({
                smellId: 'command',
                line: lineOf(text, cm.index),
                message: `class ${cm[1]} has ${hasExecute && hasUndo ? 'execute()+undo()' : 'Command/history field'}`,
                suggest: 'Command (encapsulate request as object, support undo/redo)',
                refSlug: 'command',
                signature: cm[1],
            });
        }
    }
    return findings;
}

function detectTemplateMethod(text, minAbstract) {
    const findings = [];
    const classRe = /abstract\s+class\s+(\w+)[^{]*{/g;
    let cm;
    while ((cm = classRe.exec(text)) !== null) {
        const start = cm.index + cm[0].length;
        let depth = 1;
        let i = start;
        while (i < text.length && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            i++;
        }
        const body = text.slice(start, i - 1);
        const abstractMethods = [];
        const absRe = /\babstract\s+(\w+)\s*\(/g;
        let am;
        while ((am = absRe.exec(body)) !== null) abstractMethods.push(am[1]);
        if (abstractMethods.length < minAbstract) continue;
        // look for a non-abstract method calling ≥2 abstract methods via this.
        const concreteRe = /^\s*(?:public\s+|protected\s+)?(?!abstract\b)(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*{/gm;
        let cmm;
        let templateName = null;
        while ((cmm = concreteRe.exec(body)) !== null) {
            // method body to next top-level brace close
            const mStart = cmm.index + cmm[0].length;
            let mDepth = 1;
            let j = mStart;
            while (j < body.length && mDepth > 0) {
                if (body[j] === '{') mDepth++;
                else if (body[j] === '}') mDepth--;
                j++;
            }
            const methodBody = body.slice(mStart, j - 1);
            const calls = abstractMethods.filter(name =>
                new RegExp('this\\.' + name + '\\s*\\(').test(methodBody)).length;
            if (calls >= 2) { templateName = cmm[1]; break; }
        }
        if (templateName) {
            findings.push({
                smellId: 'template-method',
                line: lineOf(text, cm.index),
                message: `abstract class ${cm[1]} has ${abstractMethods.length} abstract steps composed by \`${templateName}()\``,
                suggest: 'Template Method',
                refSlug: 'template-method',
                signature: `${cm[1]}|${abstractMethods.slice().sort().join(',')}`,
            });
        }
    }
    return findings;
}

// --- main -----------------------------------------------------------------

const raw = readStdin();
if (!raw) process.exit(0);

const input = safeJson(raw);
if (!input) process.exit(0);

const tool = input.tool_name;
if (tool !== 'Write' && tool !== 'Edit' && tool !== 'MultiEdit') process.exit(0);

const config = loadConfig();
if (!config.smells.enabled) process.exit(0);

const toolInput = input.tool_input || {};
const filePath = toolInput.file_path || '';
if (!filePath) process.exit(0);

const extOk = config.blocking.fileExtensions.some(ext =>
    new RegExp('\\.' + ext + '$', 'i').test(filePath),
);
if (!extOk) process.exit(0);

if (config.blocking.excludeGlobs.some(g => matchesGlob(filePath, g))) process.exit(0);

let fileText = '';
try { fileText = fs.readFileSync(filePath, 'utf8'); } catch { process.exit(0); }
if (!fileText) process.exit(0);

const fileRel = filePath.replace(/\\/g, '/').replace(/^.*\/(apps|packages)\//, '$1/');
const s = config.smells;
const det = s.detectors || DEFAULT_CONFIG.smells.detectors;

const results = [];
results.push(...detectSwitchOnType(fileText, s.switchOnTypeMinCases));
results.push(...detectInstanceofChain(fileText, s.instanceofChainMinBranches));
results.push(...detectRepeatedNew(fileText, s.repeatedNewMinOccurrences));
results.push(...detectLongConstructor(fileText, s.constructorMaxParams));
results.push(...detectGodClass(fileText, s.godClassMinPublicMethods));
results.push(...detectBoundaryViolation(filePath, fileText, s.boundaryViolationPaths));
results.push(...detectFamilyNaming(fileText));
if (det.singleton.enabled)      results.push(...detectSingleton(fileText));
if (det.observer.enabled)       results.push(...detectObserver(fileText, det.observer.minClusterSize));
if (det.command.enabled)        results.push(...detectCommand(fileText));
if (det.templateMethod.enabled) results.push(...detectTemplateMethod(fileText, det.templateMethod.minAbstract));

for (const finding of results) emit(fileRel, fileText, finding);

// cross-file matches
if (s.crossFile && s.crossFile.enabled) {
    const matches = corpus.update(s.crossFile, path.resolve(filePath), allFindings);
    for (const m of matches) {
        if (m.files.length < 2) continue;
        process.stderr.write(
            `[pattern-smell] cross-file: ${m.smellId} signature \`${m.signature}\` ` +
            `appears in ${m.files.length} files: ${m.files.join(', ')}\n` +
            '  Strong candidate to lift into a shared Strategy/Visitor abstraction.\n',
        );
    }
}

process.exit(0);
