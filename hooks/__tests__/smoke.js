#!/usr/bin/env node
/**
 * Smoke tests — exercise every hook with synthetic stdin payloads and
 * assert exit codes / stderr substrings. Self-contained: builds a temp
 * sandbox, no project structure required.
 *
 * Run from any cwd:
 *   node hooks/__tests__/smoke.js
 *
 * For the deeper integration matrix that requires a populated TS project,
 * see run-matrix.js (run with `--cwd /path/to/project`).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS = path.resolve(__dirname, '..');
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-smoke-'));

let pass = 0;
let fail = 0;

function run(hookFile, payload, env = {}) {
    const res = spawnSync('node', [path.join(HOOKS, hookFile)], {
        cwd: SANDBOX,
        input: JSON.stringify(payload),
        env: { ...process.env, ...env },
        encoding: 'utf8',
    });
    return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

function check(name, fn) {
    try {
        fn();
        process.stdout.write(`  ✔ ${name}\n`);
        pass++;
    } catch (e) {
        process.stdout.write(`  ✗ ${name}\n    ${e.message}\n`);
        fail++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

// ------------------------------------------------------------------
// session-start-reminder.js
// ------------------------------------------------------------------
process.stdout.write('session-start-reminder\n');
check('emits Rule 0 banner on stdout', () => {
    const r = run('session-start-reminder.js', {});
    assert(r.status === 0, `exit 0; got ${r.status}`);
    assert(r.stdout.includes('Rule 0'), 'banner mentions Rule 0');
    assert(r.stdout.includes('Pattern check'), 'banner shows expected preamble form');
});

// ------------------------------------------------------------------
// user-prompt-reminder.js
// ------------------------------------------------------------------
process.stdout.write('user-prompt-reminder\n');
check('exits 0 with reminder text', () => {
    const r = run('user-prompt-reminder.js', {});
    assert(r.status === 0, `exit 0; got ${r.status}`);
});

// ------------------------------------------------------------------
// check-pattern-preamble.js
// ------------------------------------------------------------------
process.stdout.write('check-pattern-preamble\n');

check('blocks new class without preamble', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/foo.ts'),
            content: 'export class Foo {\n  bar() {}\n}\n',
        },
    });
    assert(r.status === 2, `should block; got status=${r.status}, stderr=${r.stderr}`);
    assert(r.stderr.includes('BLOCKED by Rule 0'), 'mentions Rule 0');
});

check('allows tiny edit with no new symbol', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Edit',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/foo.ts'),
            old_string: 'const a = 1;',
            new_string: 'const a = 2;',
        },
    });
    assert(r.status === 0, `should allow; got status=${r.status}, stderr=${r.stderr}`);
});

check('blocks short reason', () => {
    const transcript = path.join(SANDBOX, 'transcript-short.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Pattern check: no GoF pattern (-) — rejected — too short' }] },
    }) + '\n');
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        transcript_path: transcript,
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/short.ts'),
            content: 'export class Short {\n  go() {}\n}\n',
        },
    });
    assert(r.status === 2, `should block short reason; got ${r.status}, stderr=${r.stderr}`);
});

check('allows valid preamble in transcript', () => {
    const transcript = path.join(SANDBOX, 'transcript-ok.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Pattern check: no GoF pattern (-) — rejected — single-caller helper, isolated, no second impl on horizon' }] },
    }) + '\n');
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        transcript_path: transcript,
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/ok.ts'),
            content: 'export class Ok {\n  go() {}\n}\n',
        },
    });
    assert(r.status === 0, `should allow valid preamble; got ${r.status}, stderr=${r.stderr}`);
});

check('skip directive bypasses block', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/skipped.ts'),
            content: '// pattern-check: skip mechanical codemod\nexport class Skipped {\n  go() {}\n}\n',
        },
    });
    assert(r.status === 0, `skip directive should allow; got ${r.status}`);
});

check('HOOKS_DRY_RUN forces exit 0', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/dry.ts'),
            content: 'export class Dry {\n  go() {}\n}\n',
        },
    }, { HOOKS_DRY_RUN: '1' });
    assert(r.status === 0, `dry-run should exit 0; got ${r.status}`);
    assert(r.stderr.includes('DRY-RUN'), 'stderr prefixed DRY-RUN');
});

check('non-ts file is ignored', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/foo.md'),
            content: '# title',
        },
    });
    assert(r.status === 0, `non-ts ignored; got ${r.status}`);
});

// ------------------------------------------------------------------
// pattern-smell-detector.js
// ------------------------------------------------------------------
process.stdout.write('pattern-smell-detector\n');

function writeFile(relPath, content) {
    const abs = path.join(SANDBOX, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return abs;
}

check('detects singleton', () => {
    const f = writeFile('src/single.ts', `
class Single {
  private static instance: Single;
  private constructor() {}
  static getInstance() { return Single.instance; }
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.status === 0);
    assert(r.stderr.includes('Singleton'), `expected Singleton in stderr; got: ${r.stderr}`);
});

check('detects observer cluster', () => {
    const f = writeFile('src/bus.ts', `
class Bus {
  on() {}
  emit() {}
  subscribe() {}
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr.includes('Observer'), `expected Observer; got: ${r.stderr}`);
});

check('detects command (execute+undo)', () => {
    const f = writeFile('src/editor.ts', `
class Editor {
  execute() {}
  undo() {}
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr.includes('Command'), `expected Command; got: ${r.stderr}`);
});

check('detects template method', () => {
    const f = writeFile('src/wf.ts', `
abstract class Workflow {
  abstract a(): void;
  abstract b(): void;
  run() { this.a(); this.b(); }
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr.includes('Template Method'), `expected Template Method; got: ${r.stderr}`);
});

check('detects switch-on-type', () => {
    const f = writeFile('src/sw.ts', `
function run(n: any) {
  switch (n.kind) {
    case "a": return 1;
    case "b": return 2;
    case "c": return 3;
    case "d": return 4;
  }
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr.includes('switch-on-type'), `expected switch-on-type; got: ${r.stderr}`);
});

check('ignore directive suppresses singleton', () => {
    const f = writeFile('src/sup.ts', `
// pattern-smell: ignore singleton
class Sup {
  private static instance: Sup;
  private constructor() {}
  static getInstance() { return Sup.instance; }
}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(!r.stderr.includes('Singleton'), `singleton should be suppressed; got: ${r.stderr}`);
});

check('non-ts file is ignored', () => {
    const f = writeFile('src/x.txt', 'whatever');
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr === '', `expected no output; got: ${r.stderr}`);
});

// ------------------------------------------------------------------
// log-pattern-decision.js
// ------------------------------------------------------------------
process.stdout.write('log-pattern-decision\n');
check('appends entry to decision log', () => {
    const transcript = path.join(SANDBOX, 'transcript-log.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Pattern check: Strategy (Tier 1) — applied — two concrete renderers behind the same interface' }] },
    }) + '\n');
    const r = run('log-pattern-decision.js', {
        session_id: 'smoke-log',
        transcript_path: transcript,
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/strategy.ts'),
            content: 'export class StrategyA {\n  run() {}\n}\n',
        },
    });
    assert(r.status === 0);
    const logPath = path.join(SANDBOX, '.claude', 'pattern-decision-log.jsonl');
    assert(fs.existsSync(logPath), 'log file should be created');
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    const last = JSON.parse(lines[lines.length - 1]);
    assert(last.decision === 'applied', `expected decision applied; got ${last.decision}`);
    assert(last.pattern === 'Strategy', `expected pattern Strategy; got ${last.pattern}`);
});

// ------------------------------------------------------------------
// analyze-log.js
// ------------------------------------------------------------------
process.stdout.write('analyze-log\n');
check('runs against existing log without crash', () => {
    const r = spawnSync('node', [path.join(HOOKS, 'analyze-log.js'), '--format', 'json'], {
        cwd: SANDBOX,
        encoding: 'utf8',
    });
    assert(r.status === 0, `exit 0; got ${r.status}, stderr=${r.stderr}`);
    const json = JSON.parse(r.stdout);
    assert(typeof json.decisions === 'object');
});

// ------------------------------------------------------------------
// pattern-context-prep.js
// ------------------------------------------------------------------
process.stdout.write('pattern-context-prep\n');
check('runs without error on Write payload', () => {
    const r = run('pattern-context-prep.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/ctx.ts'),
            content: 'export class Ctx {\n  go() {}\n}\n',
        },
    });
    assert(r.status === 0, `exit 0; got ${r.status}, stderr=${r.stderr}`);
});

// ------------------------------------------------------------------
// teardown
// ------------------------------------------------------------------
fs.rmSync(SANDBOX, { recursive: true, force: true });

process.stdout.write(`\nSmoke tests: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
