/**
 * _languages.js — multi-language symbol detection for the pattern-* hooks.
 *
 * Single source of truth mapping file extension → language → the regexes,
 * comment tokens, and test/generated exclude globs each hook needs. Adding a
 * language means adding one entry here; the hooks stay language-agnostic.
 *
 * Consumed by:
 *   - _pattern-shared.js        (detectTriggers / hasNewSymbol dispatch on langId)
 *   - check-pattern-preamble.js (extension gate, citation path regex, caller scan)
 *   - pattern-smell-detector.js (comment-token aware ignore directives)
 *
 * Standalone by contract: this module MUST NOT require _pattern-shared (that
 * file requires this one — a cycle would break the hook runner).
 *
 * Trigger regexes use the `m` (multiline) flag only — never `g` — so `.test()`
 * stays stateless across calls. Symbol-name extraction is exposed as a function
 * that builds a fresh `g` regex per call to avoid shared lastIndex bugs.
 */

'use strict';

// --- per-language definitions ----------------------------------------------
//
// triggers.*    : regex or null (null = concept does not exist in the language)
//   newClass            class / struct / record / enum — a new concrete type
//   newInterface        interface / protocol / trait — a new contract
//   newAbstract         abstract class / pure-virtual / @abstractmethod
//   newExportedFunction top-level (module/package) function that is public
//   newExportedArrowConst  exported const arrow function (TS/JS only)
// comments      : line-comment tokens that introduce a `pattern-*: skip/ignore`
// excludeGlobs  : test/generated files that never need a Pattern check
// nameRe        : {source, flags} used to build a fresh symbol-name regex

const LANGUAGES = {
    ts: {
        id: 'ts',
        label: 'TypeScript',
        exts: ['ts', 'tsx', 'mts', 'cts'],
        comments: ['//'],
        triggers: {
            newClass: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+\w+\s*[{<]/m,
            newInterface: /^[ \t]*(?:export\s+)?interface\s+\w+\s*[{<]/m,
            newAbstract: /^[ \t]*(?:export\s+)?abstract\s+class\s+\w+\s*[{<]/m,
            newExportedFunction: /^[ \t]*export\s+(?:default\s+)?(?:async\s+)?function\s+\w+\s*[<(]/m,
            newExportedArrowConst: /^[ \t]*export\s+(?:default\s+)?const\s+\w+\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/m,
        },
        nameRe: {
            source: '(?:^|\\n)[ \\t]*export\\s+(?:default\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:class|interface|function|const|type)\\s+(\\w+)',
            flags: 'g',
        },
        excludeGlobs: [
            '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx',
            '**/*.types.ts', '**/*.types.tsx', '**/*.d.ts',
        ],
    },

    py: {
        id: 'py',
        label: 'Python',
        exts: ['py', 'pyi'],
        comments: ['#'],
        triggers: {
            // module- or nested-level class declaration
            newClass: /^[ \t]*class\s+\w+\s*[:(]/m,
            // class inheriting Protocol / ABC / ABCMeta → interface-like contract
            newInterface: /^[ \t]*class\s+\w+\s*\([^)]*\b(?:Protocol|ABC|ABCMeta)\b/m,
            // @abstractmethod decorator is the strongest abstract-base signal
            newAbstract: /^[ \t]*@abstractmethod\b/m,
            // top-level def that is not underscore-private
            newExportedFunction: /^def\s+(?!_)\w+\s*\(/m,
            newExportedArrowConst: null,
        },
        nameRe: { source: '^[ \\t]*(?:class|def)\\s+(\\w+)', flags: 'gm' },
        excludeGlobs: [
            '**/test_*.py', '**/*_test.py', '**/conftest.py', '**/tests/**',
        ],
    },

    java: {
        id: 'java',
        label: 'Java',
        exts: ['java'],
        comments: ['//'],
        triggers: {
            newClass: /^[ \t]*(?:(?:public|protected|private|final|static|sealed|non-sealed|strictfp)\s+)*(?:class|record|enum)\s+\w+/m,
            newInterface: /^[ \t]*(?:(?:public|protected|private)\s+)*(?:@interface\s+|interface\s+)\w+/m,
            newAbstract: /^[ \t]*(?:(?:public|protected|private|final|static|strictfp)\s+)*abstract\s+class\s+\w+/m,
            newExportedFunction: null,
            newExportedArrowConst: null,
        },
        nameRe: {
            source: '^[ \\t]*(?:(?:public|protected|private|final|abstract|static|sealed|non-sealed|strictfp)\\s+)*(?:class|interface|record|enum)\\s+(\\w+)',
            flags: 'gm',
        },
        excludeGlobs: [
            '**/*Test.java', '**/*Tests.java', '**/*IT.java',
            '**/src/test/**', '**/generated/**',
        ],
    },

    cs: {
        id: 'cs',
        label: 'C#',
        exts: ['cs'],
        comments: ['//'],
        triggers: {
            newClass: /^[ \t]*(?:(?:public|protected|private|internal|sealed|static|partial|abstract|readonly|ref|file)\s+)*(?:class|record|struct|enum)\s+\w+/m,
            newInterface: /^[ \t]*(?:(?:public|protected|private|internal|file)\s+)*interface\s+\w+/m,
            newAbstract: /^[ \t]*(?:(?:public|protected|private|internal|sealed|static|partial|file)\s+)*abstract\s+class\s+\w+/m,
            newExportedFunction: null,
            newExportedArrowConst: null,
        },
        nameRe: {
            source: '^[ \\t]*(?:(?:public|protected|private|internal|sealed|static|partial|abstract|readonly|ref|file)\\s+)*(?:class|interface|record|struct|enum)\\s+(\\w+)',
            flags: 'gm',
        },
        excludeGlobs: [
            '**/*Test.cs', '**/*Tests.cs', '**/*.Designer.cs',
            '**/*.g.cs', '**/*.generated.cs', '**/obj/**',
        ],
    },

    go: {
        id: 'go',
        label: 'Go',
        exts: ['go'],
        comments: ['//'],
        triggers: {
            newClass: /^type\s+\w+\s+struct\b/m,
            newInterface: /^type\s+\w+\s+interface\b/m,
            newAbstract: null, // Go has no abstract types
            // exported (capitalised) top-level func or method
            newExportedFunction: /^func\s+(?:\([^)]*\)\s+)?[A-Z]\w*\s*[[(]/m,
            newExportedArrowConst: null,
        },
        nameRe: {
            source: '^(?:type\\s+(\\w+)\\s+(?:struct|interface)|func\\s+(?:\\([^)]*\\)\\s+)?(\\w+))',
            flags: 'gm',
        },
        excludeGlobs: [
            '**/*_test.go', '**/*.pb.go', '**/mock_*.go', '**/*.gen.go',
        ],
    },

    cpp: {
        id: 'cpp',
        label: 'C++',
        exts: ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h'],
        comments: ['//'],
        triggers: {
            newClass: /^[ \t]*(?:template\s*<[^>]*>\s*)?(?:class|struct)\s+\w+/m,
            newInterface: null, // no interface keyword; abstract class stands in
            // pure-virtual method → abstract base class
            newAbstract: /\bvirtual\b[^;{]*=\s*0\s*;/m,
            newExportedFunction: null, // free-function detection is too noisy
            newExportedArrowConst: null,
        },
        nameRe: {
            source: '^[ \\t]*(?:template\\s*<[^>]*>\\s*)?(?:class|struct)\\s+(\\w+)',
            flags: 'gm',
        },
        excludeGlobs: [
            '**/*_test.cpp', '**/*_test.cc', '**/*Test.cpp',
            '**/test_*.cpp', '**/*.pb.h', '**/*.pb.cc',
        ],
    },

    rust: {
        id: 'rust',
        label: 'Rust',
        exts: ['rs'],
        comments: ['//'],
        triggers: {
            newClass: /^[ \t]*(?:pub(?:\s*\([^)]*\))?\s+)?(?:struct|enum|union)\s+\w+/m,
            newInterface: /^[ \t]*(?:pub(?:\s*\([^)]*\))?\s+)?trait\s+\w+/m,
            newAbstract: null, // trait covers the abstract/interface role
            newExportedFunction: /^[ \t]*(?:pub(?:\s*\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+\w+/m,
            newExportedArrowConst: null,
        },
        nameRe: {
            source: '^[ \\t]*(?:pub(?:\\s*\\([^)]*\\))?\\s+)?(?:struct|enum|union|trait|(?:async\\s+)?(?:unsafe\\s+)?fn)\\s+(\\w+)',
            flags: 'gm',
        },
        excludeGlobs: [
            '**/tests/**', '**/*_test.rs', '**/benches/**', '**/build.rs',
        ],
    },
};

// --- extension → langId index ----------------------------------------------

const EXT_INDEX = {};
for (const lang of Object.values(LANGUAGES)) {
    for (const ext of lang.exts) EXT_INDEX[ext.toLowerCase()] = lang.id;
}

/** Every extension this module knows about (no leading dot). */
function allExtensions() {
    return Object.keys(EXT_INDEX);
}

/** langId for a file path, or null if the extension is not a supported language. */
function langIdForFile(filePath) {
    const m = String(filePath || '').toLowerCase().match(/\.([a-z0-9+]+)$/);
    if (!m) return null;
    return EXT_INDEX[m[1]] || null;
}

/** Language definition by id (falls back to ts for unknown ids). */
function get(langId) {
    return LANGUAGES[langId] || LANGUAGES.ts;
}

/** Line-comment tokens for a langId (defaults to `//`). */
function commentTokens(langId) {
    const l = LANGUAGES[langId];
    return (l && l.comments) || ['//'];
}

/**
 * Union of every language's test/generated exclude globs. Used as the default
 * so a mixed-language repo skips the right files without per-language config.
 */
function allExcludeGlobs() {
    const seen = new Set();
    const out = [];
    for (const lang of Object.values(LANGUAGES)) {
        for (const g of lang.excludeGlobs) {
            if (!seen.has(g)) { seen.add(g); out.push(g); }
        }
    }
    return out;
}

/** Fresh symbol-name regex for a langId (new object each call — g-flag safe). */
function symbolNameRegex(langId) {
    const l = get(langId);
    return new RegExp(l.nameRe.source, l.nameRe.flags);
}

/**
 * Regex matching a source-path citation for the given extensions, e.g.
 * `src/foo/base.py`. Mirrors the legacy TS-only PATH_RE but parameterised.
 */
function pathReForExts(exts) {
    const list = (exts && exts.length ? exts : allExtensions())
        .map(e => String(e).replace(/[.+*?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return new RegExp('([A-Za-z_][\\w./\\-]*\\.(?:' + list + '))\\b');
}

/**
 * Combined line-comment prefix alternation for skip/ignore directives across
 * ALL languages (e.g. `(?:\/\/|#)`), so a directive is honoured regardless of
 * the file's language.
 */
function anyCommentPrefix() {
    const seen = new Set();
    for (const lang of Object.values(LANGUAGES)) {
        for (const c of lang.comments) seen.add(c);
    }
    return Array.from(seen)
        .map(c => c.replace(/[.+*?^${}()|[\]\\/]/g, '\\$&'))
        .join('|');
}

module.exports = {
    LANGUAGES,
    allExtensions,
    langIdForFile,
    get,
    commentTokens,
    allExcludeGlobs,
    symbolNameRegex,
    pathReForExts,
    anyCommentPrefix,
    __languagesVersion: '1.0.0',
};
