#!/usr/bin/env node
/**
 * Test matrix runner for pattern-context-prep.js + check-pattern-preamble.js
 * + log-pattern-decision.js.
 *
 * Self-contained: builds an ephemeral sandbox in os.tmpdir() with a generic
 * `src/{a,b,c,d,e}/` skeleton, writes a baseline pattern-check.config.json
 * and an empty decision log, runs every scenario, then deletes the sandbox.
 *
 *   node hooks/__tests__/run-matrix.js
 *   node hooks/__tests__/run-matrix.js --only 3
 *   node hooks/__tests__/run-matrix.js --cwd /path/to/real/project   # opt-in
 *
 * No project paths / class names are baked in. Fixtures use generic
 * placeholders (Foo, Bar, AdapterBase, IPort, etc.) so the runner is
 * transferable to any host machine and CI.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOOKS = path.resolve(__dirname, '..');
const CONTEXT_PREP = path.join(HOOKS, 'pattern-context-prep.js');
const PREAMBLE = path.join(HOOKS, 'check-pattern-preamble.js');
const LOG_HOOK = path.join(HOOKS, 'log-pattern-decision.js');

const ARGV_CWD = process.argv.includes('--cwd')
    ? process.argv[process.argv.indexOf('--cwd') + 1]
    : null;

const ONLY_INDEX = process.argv.includes('--only')
    ? parseInt(process.argv[process.argv.indexOf('--only') + 1], 10)
    : null;

// --- sandbox layout (generic) ---------------------------------------------
//
//   src/
//     a/          (utility — non-family)
//     adapters/   (family group used by extended-citation + exempt-glob tests)
//       base.ts
//       impl-a.ts
//       types.ts
//     b/          (worker — large-refactor target)
//     c/          (services — refactor-suggest + tombstone target)
//     d/          (callers of IPort — feeds caller-count test)
//
// All files contain stub classes/interfaces — no business logic.

const BASELINE_CONFIG = {
    schema: { minReasonLength: 20 },
    blocking: {
        enabled: true,
        fileExtensions: ['ts', 'tsx'],
        excludeGlobs: [
            '**/*.test.ts', '**/*.test.tsx',
            '**/*.spec.ts', '**/*.spec.tsx',
            '**/*.types.ts', '**/*.types.tsx',
            '**/*.d.ts',
        ],
        smallEditThreshold: 10,
        skipDirective: '// pattern-check: skip',
        substantiveTriggers: {
            newClass: true,
            newInterface: true,
            newAbstract: true,
            newExportedFunction: true,
            newExportedArrowConst: true,
            newFile: true,
            diffLineThreshold: 40,
        },
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
        requireAntiExtendedClauseOnNewClassReject: true,
        antiExtendedPhrases: ['no-siblings', 'isolated', 'scanned siblings', 'no family match'],
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
    forbiddenPatterns: ['Singleton'],
    familyPreflight: [
        {
            glob: '**/src/adapters/**',
            family: 'Adapter (placeholder family)',
            exemptGlobs: ['**/index.ts'],
            mustRead: [],
        },
    ],
    log: {
        enabled: true,
        path: '.claude/pattern-decision-log.jsonl',
        blockStatsPath: '.claude/pattern-block-stats.jsonl',
    },
};

function buildSandbox() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-matrix-'));

    // .claude/
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(
        path.join(dir, '.claude', 'pattern-check.config.json'),
        JSON.stringify(BASELINE_CONFIG, null, 2),
        'utf8',
    );
    fs.writeFileSync(path.join(dir, '.claude', 'pattern-decision-log.jsonl'), '', 'utf8');

    // src skeleton — generic names only
    for (const sub of ['a', 'adapters', 'b', 'c', 'd']) {
        fs.mkdirSync(path.join(dir, 'src', sub), { recursive: true });
    }

    // adapter family — referenced by extended-citation tests
    fs.writeFileSync(
        path.join(dir, 'src', 'adapters', 'types.ts'),
        'export interface IPort {\n  run(): Promise<void>;\n}\n',
        'utf8',
    );
    fs.writeFileSync(
        path.join(dir, 'src', 'adapters', 'impl-a.ts'),
        "import { IPort } from './types';\nexport class AdapterA implements IPort {\n  async run() { /* stub */ }\n}\n",
        'utf8',
    );
    fs.writeFileSync(
        path.join(dir, 'src', 'adapters', 'base.ts'),
        "import { IPort } from './types';\nexport abstract class AdapterBase implements IPort {\n  abstract run(): Promise<void>;\n}\n",
        'utf8',
    );

    // d/ — populate references to IFoo for caller-count test
    for (let i = 0; i < 8; i++) {
        fs.writeFileSync(
            path.join(dir, 'src', 'd', `caller-${i}.ts`),
            `import { IFoo } from '../a/ifoo';\nexport class Caller${i} implements IFoo {\n  go() { /* ${i} */ }\n}\n`,
            'utf8',
        );
    }

    // c/ — tombstone target
    fs.writeFileSync(
        path.join(dir, 'src', 'c', 'subject.ts'),
        'export class Subject {\n  go() {}\n}\n',
        'utf8',
    );

    return dir;
}

const SANDBOX = ARGV_CWD || buildSandbox();
const CWD = SANDBOX;
const CONFIG_PATH = path.join(CWD, '.claude', 'pattern-check.config.json');
const LOG_PATH = path.join(CWD, '.claude', 'pattern-decision-log.jsonl');

function teardown() {
    if (ARGV_CWD) return;  // never delete a user-supplied project
    try { fs.rmSync(SANDBOX, { recursive: true, force: true }); } catch {}
}
process.on('exit', teardown);
process.on('SIGINT', () => { teardown(); process.exit(130); });

// --- helpers --------------------------------------------------------------

function withConfigPatch(mutator, fn) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const mutated = mutator(JSON.parse(JSON.stringify(parsed)));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(mutated, null, 2), 'utf8');
    try { return fn(); }
    finally { fs.writeFileSync(CONFIG_PATH, raw, 'utf8'); }
}

function withLogPatch(extraEntries, fn) {
    const existed = fs.existsSync(LOG_PATH);
    const backup = existed ? fs.readFileSync(LOG_PATH, 'utf8') : '';
    try {
        const extra = extraEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
        fs.appendFileSync(LOG_PATH, extra, 'utf8');
        return fn();
    } finally {
        fs.writeFileSync(LOG_PATH, backup, 'utf8');
    }
}

let tmpCounter = 0;
function tmpTranscript(preambleText) {
    const p = path.join(os.tmpdir(), 'pattern-test-transcript-' + process.pid + '-' + (++tmpCounter) + '.jsonl');
    const turn = {
        type: 'assistant',
        message: { content: [{ type: 'text', text: preambleText }] },
    };
    fs.writeFileSync(p, JSON.stringify(turn) + '\n', 'utf8');
    return p;
}

function sessionCachePath() {
    return path.join(os.homedir(), '.claude', 'cache', 'pattern-family-session.json');
}

function clearSessionCache() {
    try { fs.unlinkSync(sessionCachePath()); } catch {}
}

function writeSessionCache(entry) {
    const p = sessionCachePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(entry, null, 2), 'utf8');
}

function runHook(hookPath, payload, env) {
    const res = spawnSync('node', [hookPath], {
        cwd: CWD,
        input: JSON.stringify(payload),
        env: { ...process.env, ...(env || {}) },
        encoding: 'utf8',
    });
    return {
        status: res.status,
        stdout: res.stdout || '',
        stderr: res.stderr || '',
    };
}

function assert(cond, msg) {
    if (!cond) throw new Error('ASSERT FAILED: ' + msg);
}

// --- test cases ----------------------------------------------------------

const cases = [];

// 1. tiny non-family edit — context-prep silent, preamble allows
cases.push({
    name: '1. tiny edit, non-family file',
    run() {
        const payload = {
            session_id: 't1',
            transcript_path: '',
            tool_name: 'Edit',
            tool_input: {
                file_path: CWD + '/src/a/unknown.ts',
                old_string: 'const a = 1;',
                new_string: 'const a = 2;',
            },
        };
        const prep = runHook(CONTEXT_PREP, payload);
        assert(prep.status === 0, 'context-prep should exit 0');
        assert(!prep.stderr.includes('PATTERN-CONTEXT'),
            'no stderr block for tiny edit; got: ' + prep.stderr);
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 0, 'preamble should allow tiny diff; got status=' + pre.status);
    },
});

// 2. new isolated class — preamble blocks (no preamble line)
cases.push({
    name: '2. new isolated class, no family',
    run() {
        const tmpFile = CWD + '/src/a/new-class.ts';
        const newContent = [
            'export class Foo {',
            '  parse(s: string) { return s; }',
            '  format(s: string) { return s; }',
            '  normalize(s: string) { return s.trim(); }',
            '}',
        ].join('\n');
        const payload = {
            session_id: 't2',
            transcript_path: '',
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content: newContent },
        };
        clearSessionCache();
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 2, 'preamble blocks on missing preamble; got status=' + pre.status);
        assert(pre.stderr.includes('BLOCKED by Rule 0'),
            'should show blocking message; got: ' + pre.stderr);
    },
});

// 3. extended w/ valid path citation → allowed
cases.push({
    name: '3. extended with valid path citation',
    run() {
        const tmpFile = CWD + '/src/adapters/impl-b.ts';
        const content = [
            "import { IPort } from './types';",
            'export class AdapterB implements IPort {',
            '  async run() { /* stub */ }',
            '}',
        ].join('\n');
        const transcript = tmpTranscript(
            'Pattern check: Adapter (Tier 1) \u2014 extended \u2014 mirrors src/adapters/impl-a.ts shape, implements IPort from src/adapters/types.ts'
        );
        const payload = {
            session_id: 't3',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        clearSessionCache();
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 0,
            'preamble should allow valid extended citation; got status=' + pre.status + ' stderr=' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 3b. extended without path citation, flag on → blocks
cases.push({
    name: '3b. extended without path citation blocks (flag on)',
    run() {
        const tmpFile = CWD + '/src/adapters/impl-c.ts';
        const content = 'export class AdapterC {\n  x() {}\n}\n';
        const transcript = tmpTranscript(
            'Pattern check: Adapter (Tier 1) \u2014 extended \u2014 follows the general convention without any citation at all here'
        );
        const payload = {
            session_id: 't3b',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        try {
            withConfigPatch(
                cfg => { cfg.validation.requireCitationOnExtended = true; return cfg; },
                () => {
                    const pre = runHook(PREAMBLE, payload);
                    assert(pre.status === 2, 'should block extended w/o path; got status=' + pre.status);
                    assert(pre.stderr.includes('must cite a real file path'),
                        'should mention citation requirement; got: ' + pre.stderr);
                }
            );
        } finally {
            fs.unlinkSync(transcript);
        }
    },
});

// 4. >40-line refactor with anti-extended scan clause → allowed
cases.push({
    name: '4. large refactor with anti-extended reject',
    run() {
        const tmpFile = CWD + '/src/b/job.ts';
        const bigDiff = Array.from({ length: 45 }, (_, i) => `const x${i} = ${i};`).join('\n');
        const transcript = tmpTranscript(
            'Pattern check: no GoF pattern (-) \u2014 rejected \u2014 refactor of isolated job internals, no-siblings affected, scanned siblings'
        );
        const payload = {
            session_id: 't4',
            transcript_path: transcript,
            tool_name: 'Edit',
            tool_input: {
                file_path: tmpFile,
                old_string: 'const placeholder = 1;',
                new_string: bigDiff,
            },
        };
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 0,
            'should allow rejected with scan clause; got: ' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 5. validation flags off → legacy preamble passes
cases.push({
    name: '5. flags off preserves legacy',
    run() {
        const tmpFile = CWD + '/src/adapters/impl-legacy.ts';
        const content = 'export class AdapterLegacy {\n  bar() {}\n}\n';
        const transcript = tmpTranscript(
            'Pattern check: Adapter (Tier 1) \u2014 extended \u2014 matches existing convention for adapters'
        );
        const payload = {
            session_id: 't5',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 0,
            'flags off: legacy behavior allows; got: ' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 6. session cache Mode B short-circuit
cases.push({
    name: '6. session cache mode B short-circuit',
    run() {
        const tmpFile = CWD + '/src/adapters/impl-a.ts';
        const key = 't6:' + tmpFile.replace(/\\/g, '/');
        writeSessionCache({ [key]: { family: 'Adapter (placeholder family)', source: 'prior' } });

        const payload = {
            session_id: 't6',
            transcript_path: '',
            tool_name: 'Edit',
            tool_input: {
                file_path: tmpFile,
                old_string: 'const z = 0;',
                new_string: 'export class ExtraHandler {\n  go() { return 1; }\n  stop() { return 0; }\n}\n',
            },
        };
        const prep = runHook(CONTEXT_PREP, payload);
        assert(prep.status === 0);
        assert(prep.stderr.includes('already-in-family'),
            'should short-circuit on cache; got: ' + prep.stderr);

        clearSessionCache();
    },
});

// 7. family-health degraded — inject 3 refactor-suggest entries
cases.push({
    name: '7. mode C family-health degraded',
    run() {
        const tmpFile = CWD + '/src/adapters/impl-d.ts';
        const content = 'export class AdapterD {\n  go() {}\n}\n';
        const payload = {
            session_id: 't7',
            transcript_path: '',
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        clearSessionCache();
        const now = new Date().toISOString();
        const extra = [0, 1, 2].map(i => ({
            id: 't7-' + i,
            ts: now,
            session: 't7',
            file: CWD + '/src/adapters/fake-' + i + '.ts',
            tool: 'Write',
            pattern: 'Adapter\u2192Strategy+Registry',
            tier: 1,
            decision: 'refactor-suggest',
            reason: 'fixture: family degradation signal ' + i,
            status: 'open',
        }));
        withLogPatch(extra, () => {
            const prep = runHook(CONTEXT_PREP, payload);
            assert(prep.status === 0);
            assert(prep.stderr.includes('family-health: degraded'),
                'should flag family-health degraded; got: ' + prep.stderr);
        });
    },
});

// 8. refactor-suggest without arrow → blocks
cases.push({
    name: '8. refactor-suggest without arrow blocks',
    run() {
        const tmpFile = CWD + '/src/c/big-facade.ts';
        const transcript = tmpTranscript(
            'Pattern check: Facade (Tier 1) \u2014 refactor-suggest \u2014 current facade has 12 methods and should be split somehow'
        );
        const bigDiff = Array.from({ length: 45 }, (_, i) => `const a${i}=${i};`).join('\n');
        const payload = {
            session_id: 't8',
            transcript_path: transcript,
            tool_name: 'Edit',
            tool_input: {
                file_path: tmpFile,
                old_string: 'const placeholder = 1;',
                new_string: bigDiff,
            },
        };
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 2, 'should block; got status=' + pre.status);
        assert(pre.stderr.includes('refactor-suggest') && pre.stderr.includes('malformed'),
            'should mention refactor-suggest malformed; got: ' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 9. forbiddenPatterns blocks Singleton applied
cases.push({
    name: '9. forbiddenPatterns blocks Singleton applied',
    run() {
        const tmpFile = CWD + '/src/c/conn.ts';
        const transcript = tmpTranscript(
            'Pattern check: Singleton (Tier 1) \u2014 applied \u2014 global single instance for connection pool management'
        );
        const content = 'export class Conn {\n  static instance: Conn;\n  private constructor() {}\n}\n';
        const payload = {
            session_id: 't9',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 2, 'should block singleton; got status=' + pre.status);
        assert(pre.stderr.includes('forbidden pattern'),
            'should cite forbidden-pattern rule; got: ' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 10. antisignal non-blocking warn
cases.push({
    name: '10. antisignal non-blocking warn',
    run() {
        const tmpFile = CWD + '/src/c/simple-facade.ts';
        const content = 'export class SimpleFacade {\n  go() {}\n}\n';
        const transcript = tmpTranscript(
            "Pattern check: Facade (Tier 1) \u2014 applied \u2014 the subsystem already has a simple public API but wrapping anyway"
        );
        const payload = {
            session_id: 't10',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        try {
            withConfigPatch(
                cfg => { cfg.validation.enforceAntisignals = true; return cfg; },
                () => {
                    const pre = runHook(PREAMBLE, payload);
                    assert(pre.status === 0,
                        'antisignal is non-blocking; got status=' + pre.status);
                    assert(pre.stderr.includes('pattern-antisignal'),
                        'should surface antisignal warn; got: ' + pre.stderr);
                }
            );
        } finally {
            fs.unlinkSync(transcript);
        }
    },
});

// 11. exempt glob (**/index.ts) skips preflight
cases.push({
    name: '11. exempt glob skips preflight',
    run() {
        const indexFile = CWD + '/src/adapters/index.ts';
        const content = "export * from './base';\nexport class NewIndex {}\n";
        const payload = {
            session_id: 't11',
            transcript_path: '',
            tool_name: 'Write',
            tool_input: { file_path: indexFile, content },
        };
        const prep = runHook(CONTEXT_PREP, payload);
        assert(prep.status === 0);
        assert(!prep.stderr.includes('PATTERN-CONTEXT:'),
            'exempt glob should skip preflight; got: ' + prep.stderr);
    },
});

// 12. HOOKS_DRY_RUN passes through with DRY-RUN prefix
cases.push({
    name: '12. HOOKS_DRY_RUN passes through',
    run() {
        const tmpFile = CWD + '/src/a/dry.ts';
        const content = 'export class Foo {\n  bar() {}\n}\n';
        const payload = {
            session_id: 't12',
            transcript_path: '',
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        const pre = runHook(PREAMBLE, payload, { HOOKS_DRY_RUN: '1' });
        assert(pre.status === 0, 'dry-run forces exit 0; got status=' + pre.status);
        assert(pre.stderr.includes('DRY-RUN:'),
            'stderr should have DRY-RUN prefix; got: ' + pre.stderr);
    },
});

// 13. caller-count warn — IFoo is referenced in 8 sandbox files
cases.push({
    name: '13. caller-count warn on isolated reject',
    run() {
        const tmpFile = CWD + '/src/a/unused-ifoo.ts';
        const content = 'export interface IFoo {\n  go(): void;\n}\n';
        const transcript = tmpTranscript(
            'Pattern check: no GoF pattern (-) \u2014 rejected \u2014 isolated 5-line helper no-siblings in this directory'
        );
        const payload = {
            session_id: 't13',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        try {
            const pre = runHook(PREAMBLE, payload);
            assert(pre.status === 0, 'caller-count warn is non-blocking; got: ' + pre.stderr);
            assert(pre.stderr.includes('caller-count'),
                'should surface caller-count warn; got: ' + pre.stderr);
        } finally {
            fs.unlinkSync(transcript);
        }
    },
});

// 14. short reason → block with fix hint
cases.push({
    name: '14. short reason blocks with fix hint',
    run() {
        const tmpFile = CWD + '/src/a/tiny.ts';
        const transcript = tmpTranscript(
            'Pattern check: no GoF pattern (-) \u2014 rejected \u2014 bug fix'
        );
        const content = 'export class Tiny {\n  go() {}\n}\n';
        const payload = {
            session_id: 't14',
            transcript_path: transcript,
            tool_name: 'Write',
            tool_input: { file_path: tmpFile, content },
        };
        const pre = runHook(PREAMBLE, payload);
        assert(pre.status === 2, 'short reason should block; got status=' + pre.status);
        assert(pre.stderr.includes('reason too short') || pre.stderr.includes('Suggest preamble'),
            'should include fix hint; got: ' + pre.stderr);
        fs.unlinkSync(transcript);
    },
});

// 15. tombstone resolution flow
cases.push({
    name: '15. tombstone resolution flow',
    run() {
        const testFile = CWD + '/src/c/subject.ts';
        const content = 'export class Subject {\n  go() {}\n}\n';

        const t1 = tmpTranscript(
            'Pattern check: Facade\u2192Facade+Strategy (Tier 1) \u2014 refactor-suggest \u2014 ' +
            'current facade has 12 methods (god-class risk); splitting via src/c/subject.ts would help.'
        );
        const payload1 = {
            session_id: 't15',
            transcript_path: t1,
            tool_name: 'Write',
            tool_input: { file_path: testFile, content },
        };

        const backup = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
        try {
            const logHook = runHook(LOG_HOOK, payload1);
            assert(logHook.status === 0);

            const after1 = fs.readFileSync(LOG_PATH, 'utf8');
            const added1 = after1.slice(backup.length);
            assert(added1.includes('"refactor-suggest"'),
                'step 1 should log refactor-suggest; got: ' + added1.slice(0, 200));
            assert(added1.includes('"status":"open"'),
                'step 1 should mark status open; got: ' + added1.slice(0, 200));

            const t2 = tmpTranscript(
                'Pattern check: Facade+Strategy (Tier 1) \u2014 applied \u2014 ' +
                'split subject into action-type strategies via src/c/subject.ts as planned'
            );
            const payload2 = {
                session_id: 't15',
                transcript_path: t2,
                tool_name: 'Edit',
                tool_input: {
                    file_path: testFile,
                    old_string: 'export class Subject {',
                    new_string: 'export class SubjectStrategy {',
                },
            };
            const logHook2 = runHook(LOG_HOOK, payload2);
            assert(logHook2.status === 0);

            const after2 = fs.readFileSync(LOG_PATH, 'utf8');
            const added2 = after2.slice(after1.length);
            assert(added2.includes('"status":"resolved"'),
                'step 2 should link companion resolved entry; got: ' + added2);

            fs.unlinkSync(t1);
            fs.unlinkSync(t2);
        } finally {
            fs.writeFileSync(LOG_PATH, backup, 'utf8');
        }
    },
});

// --- runner --------------------------------------------------------------

function main() {
    console.log('Pattern hooks test matrix');
    console.log('  cwd:          ' + CWD + (ARGV_CWD ? '' : '   (ephemeral sandbox)'));
    console.log('  context-prep: ' + CONTEXT_PREP);
    console.log('  preamble:     ' + PREAMBLE);
    console.log('');

    let passed = 0, failed = 0, skipped = 0;
    cases.forEach((c, idx) => {
        const num = idx + 1;
        if (ONLY_INDEX != null && ONLY_INDEX !== num) return;
        process.stdout.write('[' + num + '] ' + c.name + ' ... ');
        try {
            c.run();
            console.log('PASS');
            passed++;
        } catch (err) {
            console.log('FAIL');
            console.log('    ' + (err && err.message ? err.message : String(err)));
            failed++;
        }
    });

    console.log('');
    console.log('Summary: ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
    process.exit(failed > 0 ? 1 : 0);
}

main();
