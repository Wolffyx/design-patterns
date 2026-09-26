/**
 * _gof-smells.js — code shapes that suggest (or already are) a GoF pattern.
 * All seven languages; every detector reads comment/string-masked text, so
 * keywords inside strings and comments never trigger.
 *
 *   switch-on-type       ≥ N cases on `.type|.kind|.variant|.tag`, Go type
 *                        switch, Python `match x.kind`, C# switch expression
 *                                                         → Strategy / State
 *   instanceof-chain     ≥ N branches of instanceof / typeof / isinstance /
 *                        `is T` / dynamic_cast / Go `.(T)` / downcast_ref
 *                                                         → Strategy / Visitor
 *   repeated-new         ≥ N constructions of one type (`new X(`, `X(` in
 *                        Python, `&X{`, `X::new(`, make_unique<X>)
 *                                                         → Factory Method
 *   god-class            ≥ N public methods on one class / struct / impl
 *                                                         → Facade / split
 *   boundary-violation   forbidden import inside a guarded path → Adapter
 *   family-naming        new *Factory / *Adapter / *Facade / *Registry type
 *   singleton            per-language singleton shapes (private ctor +
 *                        static instance, sync.Once, OnceLock, __new__ …)
 *   observer             ≥ N pub/sub methods on one type   → Observer
 *   command              execute + undo, or a command history field
 *   template-method      abstract type whose concrete method calls ≥ 2
 *                        of its abstract steps              → Template Method
 *
 * Exhaustive switches (assertNever, `: never`, unreachable, assert_never)
 * are skipped: an exhaustive switch over a closed union is Tier 0.
 */

'use strict';

const {
    lineOf, balancedEnd, extractFunctions, extractClasses, isConstructor,
    isPublicMethod, importsOf, bodyText,
} = require('./_code-scan');
const { hasExhaustiveMarker } = require('./_control-flow-smells');

const DISCRIMINATOR = '(type|kind|variant|tag|Type|Kind|Variant|Tag)';

// --- switch-on-type ------------------------------------------------------------

function countCases(body, arrows) {
    let depth = 0;
    let n = 0;
    const cases = [];
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (depth === 0 && !arrows && /\bcase\b/.test(body.slice(i, i + 5)) && !/\w/.test(body[i - 1] || '')) {
            n++;
            const colon = body.indexOf(':', i + 4);
            cases.push(colon === -1 ? '' : body.slice(i + 4, colon).trim());
            i += 3;
        } else if (depth === 0 && arrows && c === '=' && body[i + 1] === '>') {
            n++;
        }
    }
    return { n, cases };
}

function detectSwitchOnType(scan, minCases) {
    const findings = [];
    const { langId, masked, text } = scan;
    const finding = (line, n, what, cases) => ({
        smellId: 'switch-on-type',
        line,
        message: `switch-on-type (${n} cases on ${what})`,
        suggest: 'Strategy or State',
        refSlug: 'strategy',
        signature: `${what}|${cases.slice().sort().join(',')}`,
    });

    if (langId === 'py') {
        const re = new RegExp(`^match\\s+[\\w.]*\\.${DISCRIMINATOR}\\s*:$`);
        for (const e of scan.entries) {
            const m = re.exec(e.head);
            if (!m) continue;
            const body = bodyText(scan, e);
            if (hasExhaustiveMarker(body)) continue;
            const cases = body.split('\n').filter(l => /^case\b/.test(l)).map(l => l.replace(/^case\s+|:.*$/g, ''));
            if (cases.length >= minCases) findings.push(finding(e.line, cases.length, `\`.${m[1]}\``, cases));
        }
        return findings;
    }
    if (langId === 'rust') return findings; // `match` is compiler-checked exhaustive

    const patterns = [
        [new RegExp(`\\bswitch\\s*\\(?\\s*[\\w.]*\\.${DISCRIMINATOR}\\s*\\)?\\s*\\{`, 'g'), m => `\`.${m[1]}\``, false],
        [/\bswitch\s+(?:\w+\s*:=\s*)?[\w.]+\.\(type\)\s*\{/g, () => 'a Go type switch', false],
        [new RegExp(`[\\w.]+\\.${DISCRIMINATOR}\\s+switch\\s*\\{`, 'g'), m => `\`.${m[1]}\``, true],
    ];
    for (const [re, what, arrows] of patterns) {
        let m;
        while ((m = re.exec(masked)) !== null) {
            const open = m.index + m[0].length - 1;
            const close = balancedEnd(masked, open);
            if (hasExhaustiveMarker(text.slice(open, close))) continue;
            const { n, cases } = countCases(masked.slice(open + 1, close), arrows);
            if (n >= minCases) findings.push(finding(lineOf(masked, m.index), n, what(m), cases));
        }
    }
    return findings;
}

// --- instanceof-chain ------------------------------------------------------------

const TYPE_TEST = {
    ts: /\b(?:instanceof|typeof)\b\s*([A-Za-z_]\w*)?/,
    java: /\binstanceof\s+([A-Za-z_]\w*)/,
    cs: /\bis\s+(?:not\s+)?(?!null\b|true\b|false\b)([A-Za-z_][\w.]*(?:<[^>]*>)?)/,
    py: /\bisinstance\s*\(\s*[\w.]+\s*,\s*\(?([A-Za-z_]\w*)/,
    cpp: /\bdynamic_cast\s*<\s*(?:const\s+)?([A-Za-z_][\w:]*)/,
    go: /\.\(\s*\*?([A-Z]\w*)\s*\)/,
    rust: /\bdowncast_ref\s*::\s*<\s*([A-Za-z_]\w*)|\.is::<\s*([A-Za-z_]\w*)/,
};
const BRANCH_LINE = /^\s*(?:\}\s*)?(?:else\s+if|elif|if)\b/;
const CONTINUES_CHAIN = /^\s*(?:\}|else\b|\{\s*$)/;

/**
 * if / else-if (or consecutive early-return ifs) testing the runtime type at
 * one indentation level. Body lines indented deeper don't break the run.
 */
function detectInstanceofChain(scan, minBranches) {
    const test = TYPE_TEST[scan.langId];
    if (!test) return [];
    const findings = [];
    const src = scan.langId === 'py'
        ? scan.logical.map(l => ({ t: l.text, n: l.line, ind: l.indent }))
        : scan.lines.map((t, i) => ({ t: t.trim(), n: i + 1, ind: t.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length }));
    let run = [];
    let runIndent = -1;
    const flush = () => {
        if (run.length >= minBranches) {
            findings.push({
                smellId: 'instanceof-chain',
                line: run[0].n,
                message: `instanceof/typeof/isinstance chain (${run.length} branches)`,
                suggest: 'Strategy or Visitor (or a closed union + exhaustive match)',
                refSlug: 'strategy',
                signature: run.map(r => r.cls).filter(Boolean).sort().join(','),
            });
        }
        run = [];
        runIndent = -1;
    };
    for (const { t, n, ind } of src) {
        if (!t) continue;
        const hit = BRANCH_LINE.test(t) ? test.exec(t) : null;
        if (hit && (runIndent === -1 || ind === runIndent)) {
            run.push({ n, cls: hit.slice(1).find(Boolean) || '' });
            runIndent = ind;
            continue;
        }
        if (runIndent !== -1 && (ind > runIndent || CONTINUES_CHAIN.test(t))) continue;
        flush();
        if (hit) { run.push({ n, cls: hit.slice(1).find(Boolean) || '' }); runIndent = ind; }
    }
    flush();
    return findings;
}

// --- repeated construction ----------------------------------------------------------

const NOT_FACTORY_WORTHY = /(?:Error|Exception|Warning)$|^(?:Date|Map|Set|Array|List|Dict|Object|Promise|URL|RegExp|String|Number|Boolean|Some|Ok|Err|None|Vec|Box|Rc|Arc|HashMap|HashSet|StringBuilder|ArrayList|LinkedList|Optional|Tuple|Decimal|Path|Duration|Instant|Uuid|UUID)$/;

const CONSTRUCTION = {
    ts: [/\bnew\s+([A-Z]\w*)\s*[(<]/g],
    java: [/\bnew\s+([A-Z]\w*)\s*[(<]/g],
    cs: [/\bnew\s+([A-Z]\w*)\s*[(<]/g],
    cpp: [/\bnew\s+([A-Z]\w*)\s*[({]/g, /\bmake_(?:unique|shared)\s*<\s*([A-Z]\w*)/g],
    py: [/(?:^|[^\w.@])([A-Z][a-z]\w*)\(/gm],
    go: [/&([A-Z]\w*)\s*\{/g],
    rust: [/\b([A-Z]\w*)::new\s*\(/g],
};

function detectRepeatedNew(scan, minOccurrences) {
    const counts = {};
    const firstLine = {};
    for (const re of CONSTRUCTION[scan.langId] || CONSTRUCTION.ts) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(scan.masked)) !== null) {
            const name = m[1];
            if (NOT_FACTORY_WORTHY.test(name)) continue;
            if (scan.langId === 'py') {
                const lineStart = scan.masked.lastIndexOf('\n', m.index) + 1;
                if (/^\s*class\s/.test(scan.masked.slice(lineStart, m.index + 1))) continue;
            }
            counts[name] = (counts[name] || 0) + 1;
            if (firstLine[name] === undefined) firstLine[name] = lineOf(scan.masked, m.index + m[0].indexOf(name));
        }
    }
    return Object.entries(counts)
        .filter(([, n]) => n >= minOccurrences)
        .map(([name, n]) => ({
            smellId: 'repeated-new',
            line: firstLine[name],
            message: `repeated construction of \`${name}\` (×${n})`,
            suggest: 'Factory Method (or one constructor function) when the choice of type varies',
            refSlug: 'factory-method',
            signature: name,
        }));
}

// --- class-shaped detectors ------------------------------------------------------------

function classLine(cls) { return cls.line; }

/** [first, last] line of a class body (Go / out-of-line owners: their methods). */
function classSpan(scan, cls) {
    const ends = [];
    if (cls.entry) ends.push(scan.langId === 'py' ? cls.entry.endLine : lineOf(scan.masked, cls.entry.bodyEnd));
    for (const m of cls.methods) if (m.entry) ends.push(scan.langId === 'py' ? m.entry.endLine : lineOf(scan.masked, m.entry.bodyEnd));
    const starts = [cls.line].concat(cls.methods.filter(m => m.line).map(m => m.line));
    return [Math.min(...starts), Math.max(cls.line, ...ends)];
}

function detectGodClass(scan, classes, minPublicMethods) {
    const findings = [];
    for (const cls of classes) {
        if (/Builder$/.test(cls.name)) continue; // fluent setters are the pattern
        const pub = cls.methods.filter(m =>
            isPublicMethod(m, cls, scan.langId) &&
            !(m.entry && isConstructor(m, scan.langId)) &&
            !/^__\w+__$/.test(m.name));
        if (pub.length < minPublicMethods) continue;
        findings.push({
            smellId: 'god-class',
            line: classLine(cls),
            span: classSpan(scan, cls),
            message: `large ${cls.kind === 'interface' || cls.kind === 'trait' ? 'interface' : 'class'} ${cls.name} (${pub.length} public methods)`,
            suggest: cls.kind === 'interface' || cls.kind === 'trait'
                ? 'splitting into role-shaped interfaces (Interface Segregation)'
                : 'Facade or split by responsibility',
            refSlug: 'facade',
            signature: cls.name,
        });
    }
    return findings;
}

const PUBSUB = new Set([
    'addlistener', 'addeventlistener', 'removelistener', 'removeeventlistener', 'add_listener',
    'remove_listener', 'on', 'off', 'once', 'subscribe', 'unsubscribe', 'emit', 'notify',
    'publish', 'attach', 'detach', 'register_observer', 'notify_observers',
]);

function detectObserver(scan, classes, minCluster) {
    const findings = [];
    for (const cls of classes) {
        const verbs = Array.from(new Set(cls.methods.map(m => m.name.split('::').pop()).filter(n => PUBSUB.has(n.toLowerCase())))).sort();
        if (verbs.length < minCluster) continue;
        findings.push({
            smellId: 'observer',
            line: classLine(cls),
            span: classSpan(scan, cls),
            message: `class ${cls.name} clusters ${verbs.length} pub/sub verbs (${verbs.join(', ')})`,
            suggest: 'Observer (use a real Subject / EventEmitter / signal library instead of hand-rolling)',
            refSlug: 'observer',
            signature: `${cls.name}|${verbs.join(',')}`,
        });
    }
    return findings;
}

function classBody(scan, cls) {
    if (!cls.entry) return '';
    return bodyText(scan, cls.entry);
}

function detectCommand(scan, classes) {
    const findings = [];
    for (const cls of classes) {
        const names = new Set(cls.methods.map(m => m.name.split('::').pop().toLowerCase()));
        const execUndo = (names.has('execute') || names.has('do') || names.has('apply')) && names.has('undo');
        const body = classBody(scan, cls);
        const history = /\b(?:history|undo_?stack|undoStack|redo_?stack|command_?queue)\b[^;\n]*\bCommand\b/i.test(body) ||
            /(?:Array|List|Vec|Stack|Deque|deque|list)\s*<\s*\w*Command\w*\s*>|\w*Command\w*\s*\[\s*\]/.test(body);
        if (!execUndo && !history) continue;
        findings.push({
            smellId: 'command',
            line: classLine(cls),
            span: classSpan(scan, cls),
            message: `class ${cls.name} has ${execUndo ? 'execute()+undo()' : 'a Command history field'}`,
            suggest: 'Command (encapsulate request as object, support undo/redo)',
            refSlug: 'command',
            signature: cls.name,
        });
    }
    return findings;
}

function detectTemplateMethod(scan, classes, minAbstract) {
    if (scan.langId === 'rust' || scan.langId === 'go') return []; // trait default methods are the native form
    const findings = [];
    for (const cls of classes) {
        const abstract = cls.methods.filter(m => m.abstract).map(m => m.name);
        if (abstract.length < minAbstract) continue;
        const prefix = scan.langId === 'py' ? 'self\\.' : scan.langId === 'ts' ? 'this\\.' : '(?:this->|this\\.)?';
        const concrete = cls.methods.filter(m => !m.abstract && m.entry);
        const tmpl = concrete.find(m => {
            const body = bodyText(scan, m.entry);
            return abstract.filter(a => new RegExp(`(?:^|[^\\w.])${prefix}${a}\\s*\\(`).test(body)).length >= 2;
        });
        if (!tmpl) continue;
        findings.push({
            smellId: 'template-method',
            line: classLine(cls),
            span: classSpan(scan, cls),
            message: `abstract class ${cls.name} has ${abstract.length} abstract steps composed by \`${tmpl.name}()\``,
            suggest: 'Template Method',
            refSlug: 'template-method',
            signature: `${cls.name}|${abstract.slice().sort().join(',')}`,
        });
    }
    return findings;
}

function detectFamilyNaming(classes) {
    return classes
        .filter(c => c.entry && /(?:Factory|Adapter|Facade|Registry)$/.test(c.name) && c.kind !== 'impl')
        .map(c => ({
            smellId: 'family-naming',
            line: c.line,
            message: `new ${c.kind} ${c.name} matches a project pattern-family naming convention`,
            suggest: 'verify it extends the existing family in design-patterns-project-usage.md',
            refSlug: '',
            signature: c.name,
        }));
}

// --- singleton -------------------------------------------------------------------------

const SINGLETON = {
    ts: t => /private\s+constructor\s*\(/.test(t) && /static\s+(?:readonly\s+)?\w+\s*[:=][^;]*;?/.test(t) &&
        /static\s+(?:get)?[Ii]nstance\s*\(/.exec(t),
    java: t => /private\s+[A-Z]\w*\s*\(\s*\)/.test(t) && /static\s+(?:final\s+|volatile\s+)*[\w<>]+\s+\w+\s*[;=]/.test(t) &&
        /static\s+(?:synchronized\s+)?[\w<>]+\s+(?:get)?[Ii]nstance\s*\(/.exec(t),
    cs: t => /private\s+[A-Z]\w*\s*\(\s*\)/.test(t) &&
        (/static\s+[\w<>]+\s+Instance\s*(?:\{|=>)/.exec(t) || /static\s+[\w<>]+\s+(?:Get)?Instance\s*\(/.exec(t)),
    py: t => (/\b_instance\s*=\s*None/.test(t) && /def\s+__new__\s*\(/.exec(t)) ||
        (/\b_instance\b/.test(t) && /def\s+get_instance\s*\(/.exec(t)),
    go: t => /\bsync\.Once\b/.test(t) && /\.Do\s*\(\s*func/.test(t) && /func\s+(?:Get)?[A-Z]?\w*[Ii]nstance\s*\(|func\s+Get[A-Z]\w*\s*\(\s*\)/.exec(t),
    rust: t => /\bstatic\s+\w+\s*:\s*(?:std::sync::|once_cell::sync::)?(?:OnceLock|OnceCell|LazyLock|Lazy)\s*</.exec(t) || /\blazy_static!\s*\{/.exec(t),
    cpp: t => /static\s+[\w:<>]+\s*&\s*(?:get)?[Ii]nstance\s*\(\s*\)/.exec(t),
};

function detectSingleton(scan, classes) {
    const test = SINGLETON[scan.langId];
    const hit = test && test(scan.masked);
    if (!hit) return [];
    const at = hit.index || 0;
    const owner = classes
        .filter(c => c.entry && (scan.langId === 'py' || c.entry.bodyStart <= at) && c.line <= lineOf(scan.masked, at))
        .sort((a, b) => b.line - a.line)[0];
    return [{
        smellId: 'singleton',
        line: owner ? owner.line : lineOf(scan.masked, at),
        ...(owner ? { span: classSpan(scan, owner) } : {}),
        message: owner ? `${owner.name} is a singleton (single shared instance)` : 'package-level singleton instance',
        suggest: 'Singleton (verify global state is intentional — DI or a module instance is usually better)',
        refSlug: 'singleton',
        signature: owner ? owner.name : 'singleton-shape',
    }];
}

// --- boundary violation ------------------------------------------------------------------

function detectBoundaryViolation(scan, filePath, cfg) {
    if (!cfg || !cfg.guardedPath) return [];
    const normalized = filePath.replace(/\\/g, '/');
    if (!normalized.includes(cfg.guardedPath)) return [];
    if ((cfg.allowedPaths || []).some(p => normalized.includes(p))) return [];
    const hint = cfg.routeThroughHint || 'the project\'s package-boundary interface';
    const findings = [];
    const imports = importsOf(scan.text, scan.langId);
    for (const mod of cfg.forbiddenImports || []) {
        const hit = imports.find(i => i.spec === mod || ['/', '.', '::'].some(sep => i.spec.startsWith(mod + sep)));
        if (!hit) continue;
        findings.push({
            smellId: 'boundary-violation',
            line: hit.line,
            message: `cross-package import of ${mod} in guarded path`,
            suggest: `Adapter (route through ${hint})`,
            refSlug: 'adapter',
            signature: mod,
        });
    }
    return findings;
}

// --- entry point ---------------------------------------------------------------------------

/**
 * @param {object} scan      _code-scan.scanBlocks result
 * @param {string} filePath  absolute path (boundary rules)
 * @param {object} s         merged `smells` config
 */
function detectAll(scan, filePath, s) {
    const det = s.detectors || {};
    const fns = extractFunctions(scan);
    const classes = extractClasses(scan, fns);
    const out = [];
    out.push(...detectSwitchOnType(scan, s.switchOnTypeMinCases));
    out.push(...detectInstanceofChain(scan, s.instanceofChainMinBranches));
    out.push(...detectRepeatedNew(scan, s.repeatedNewMinOccurrences));
    out.push(...detectGodClass(scan, classes, s.godClassMinPublicMethods));
    out.push(...detectBoundaryViolation(scan, filePath, s.boundaryViolationPaths));
    out.push(...detectFamilyNaming(classes));
    if (!det.singleton || det.singleton.enabled !== false) out.push(...detectSingleton(scan, classes));
    if (!det.observer || det.observer.enabled !== false) out.push(...detectObserver(scan, classes, (det.observer || {}).minClusterSize || 3));
    if (!det.command || det.command.enabled !== false) out.push(...detectCommand(scan, classes));
    if (!det.templateMethod || det.templateMethod.enabled !== false) {
        out.push(...detectTemplateMethod(scan, classes, (det.templateMethod || {}).minAbstract || 2));
    }
    return out;
}

module.exports = { detectAll };
