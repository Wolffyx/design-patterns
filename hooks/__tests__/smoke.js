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

/** The output names SKILL.md by the absolute path it has next to hooks/. */
function assertSkillPathResolves(out) {
    const skillMd = path.resolve(HOOKS, '..', 'skills', 'design-patterns', 'SKILL.md');
    assert(fs.existsSync(skillMd), `SKILL.md exists at ${skillMd}`);
    assert(out.includes(skillMd), `output names ${skillMd}`);
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

check('points at the installed SKILL.md', () => {
    assertSkillPathResolves(run('session-start-reminder.js', {}).stdout);
});

// ------------------------------------------------------------------
// user-prompt-reminder.js
// ------------------------------------------------------------------
process.stdout.write('user-prompt-reminder\n');
check('exits 0 with reminder text', () => {
    const r = run('user-prompt-reminder.js', {});
    assert(r.status === 0, `exit 0; got ${r.status}`);
    assertSkillPathResolves(r.stdout);
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
    assertSkillPathResolves(r.stderr);
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
// check-pattern-preamble.js — multi-language coverage
// ------------------------------------------------------------------
process.stdout.write('check-pattern-preamble (multi-language)\n');

const LANG_CASES = [
    { lang: 'Python', file: 'src/svc.py',  content: 'class PaymentService:\n    def charge(self, amt):\n        return amt\n' },
    { lang: 'Java',   file: 'src/Svc.java', content: 'public class PaymentService {\n  public void charge(int amt) {}\n}\n' },
    { lang: 'C#',     file: 'src/Svc.cs',   content: 'public abstract class PaymentService {\n  public abstract void Charge(int amt);\n}\n' },
    { lang: 'Go',     file: 'src/svc.go',   content: 'package svc\ntype PaymentService struct {\n  balance int\n}\n' },
    { lang: 'C++',    file: 'src/svc.cpp',  content: 'class PaymentService {\npublic:\n  virtual void charge(int amt) = 0;\n};\n' },
    { lang: 'Rust',   file: 'src/svc.rs',   content: 'pub trait Payment {\n  fn charge(&self, amt: u32);\n}\n' },
];

for (const c of LANG_CASES) {
    check(`blocks new ${c.lang} type without preamble`, () => {
        const r = run('check-pattern-preamble.js', {
            session_id: 'smoke',
            tool_name: 'Write',
            tool_input: { file_path: path.join(SANDBOX, c.file), content: c.content },
        });
        assert(r.status === 2, `${c.lang} should block; got status=${r.status}, stderr=${r.stderr}`);
    });
}

check('Python # skip directive bypasses block', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/gen.py'),
            content: '# pattern-check: skip generated protobuf stubs\nclass Foo:\n    pass\n',
        },
    });
    assert(r.status === 0, `Python # skip should allow; got ${r.status}`);
});

check('Python # preamble in payload allows', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/svc2.py'),
            content: '# Pattern check: no GoF pattern (-) — rejected — single-use service, one caller, no second impl expected.\nclass PaymentService:\n    def charge(self, amt):\n        return amt\n',
        },
    });
    assert(r.status === 0, `Python # preamble should allow; got ${r.status}, stderr=${r.stderr}`);
});

check('Go unexported func is not a trigger (small edit)', () => {
    const r = run('check-pattern-preamble.js', {
        session_id: 'smoke',
        tool_name: 'Edit',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/h.go'),
            old_string: 'package h',
            new_string: 'func processOrder(id int) {}',
        },
    });
    assert(r.status === 0, `Go unexported func should allow; got ${r.status}`);
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

check('detects isinstance chain (Python)', () => {
    const f = writeFile('src/dispatch.py', `
def handle(x):
    if isinstance(x, Cat): return 1
    elif isinstance(x, Dog): return 2
    elif isinstance(x, Bird): return 3
    return 0
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    assert(r.stderr.includes('isinstance') || r.stderr.includes('chain'),
        `expected isinstance chain; got: ${r.stderr}`);
});

check('detects god class (Go struct methods)', () => {
    const f = writeFile('src/big.go', `
package big
type Manager struct{}
func (m *Manager) A() {}
func (m *Manager) B() {}
func (m *Manager) C() {}
func (m *Manager) D() {}
func (m *Manager) E() {}
func (m *Manager) F() {}
func (m *Manager) G() {}
func (m *Manager) H() {}
func (m *Manager) I() {}
`);
    const r = run('pattern-smell-detector.js', {
        tool_name: 'Write', tool_input: { file_path: f },
    });
    // advisory only — assert the hook runs cleanly on Go input, no crash
    assert(r.status === 0, `smell detector should exit 0 on Go; got ${r.status}, stderr=${r.stderr}`);
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

// --- control-flow smells --------------------------------------------------

function smells(relPath, content, toolInput) {
    const f = writeFile(relPath, content);
    return run('pattern-smell-detector.js', {
        tool_name: toolInput ? 'Edit' : 'Write',
        tool_input: { file_path: f, ...(toolInput || {}) },
    }).stderr;
}

check('nested-if (TS) — ignores braces in strings/comments', () => {
    const err = smells('src/cf-nested.ts', `
// if (a) { if (b) { } }
export function f(o: any) {
  const s = "if (x) { if (y) {";
  if (o.a) {
    if (o.b) { go(); }
  }
}
`);
    assert(err.includes('cf-nested.ts:6 `if` nested in `if`'), `expected nested-if at line 6; got: ${err}`);
    assert((err.match(/nested in/g) || []).length === 1, `expected exactly one nested-if; got: ${err}`);
});

check('deep-nesting (Python) — `with` is transparent, not counted', () => {
    const err = smells('src/cf_deep.py', `
def f(ids):
    for i in ids:
        if i:
            with open(i) as fh:
                if fh:
                    pass
`);
    assert(err.includes('nesting depth 3 (max 2)'), `expected depth 3; got: ${err}`);
});

check('else-after-return (Go) + one finding per else-if chain (TS)', () => {
    const go = smells('src/cf_else.go', `
package x
func F(err error) error {
	if err != nil {
		return err
	} else {
		return nil
	}
}
`);
    assert(go.includes('`else` after `return`'), `expected Go finding; got: ${go}`);
    const ts = smells('src/cf-chain.ts', `
export function g(k: string) {
  if (k === "a") {
    return 1;
  } else if (k === "b") {
    return 2;
  } else if (k === "c") {
    return 3;
  } else {
    return 4;
  }
}
`);
    assert((ts.match(/after `return`/g) || []).length === 1, `expected one chain finding; got: ${ts}`);
    assert(ts.includes('ladder on `k` (3 branches)'), `expected ladder; got: ${ts}`);
});

check('python for-else after break is not else-after-return', () => {
    const err = smells('src/cf_forelse.py', `
def f(xs):
    for x in xs:
        if x:
            break
    else:
        done()
`);
    assert(!err.includes('after `break`'), `for-else must not flag; got: ${err}`);
});

check('scattered-discriminator (Python)', () => {
    const err = smells('src/cf_scatter.py', `
def a(o):
    if o.status == "new":
        pass
def b(o):
    if o.status == "paid":
        pass
def c(o):
    if o.status == "shipped":
        pass
`);
    assert(err.includes('`o.status` compared to literals at 3 sites'), `expected scattered; got: ${err}`);
});

check('n-plus-one: loop, forEach, comprehension; zero-arg execute() ignored', () => {
    const ts = smells('src/cf-n1.ts', `
export async function f(ids: string[], cmds: any[]) {
  for (const id of ids) {
    await repo.findById(id);
  }
  ids.forEach(id => db.query("select 1", [id]));
  cmds.forEach(c => c.execute());
}
`);
    assert(ts.includes('`.findById(` once per'), `expected findById; got: ${ts}`);
    assert(ts.includes('`.query(` once per'), `expected query in forEach; got: ${ts}`);
    assert(!ts.includes('execute'), `Command.execute() must not flag; got: ${ts}`);
    const py = smells('src/cf_n1.py', `
def f(urls):
    return [requests.get(u) for u in urls]
`);
    assert(py.includes('`requests.get(` once per'), `expected comprehension N+1; got: ${py}`);
});

check('switch-on-type skips switch marked exhaustive', () => {
    const err = smells('src/cf-exh.ts', `
function run(n: any) {
  switch (n.kind) {
    case "a": return 1;
    case "b": return 2;
    case "c": return 3;
    case "d": return 4;
    default: return assertNever(n.kind);
  }
}
`);
    assert(!err.includes('switch-on-type'), `exhaustive switch must not flag; got: ${err}`);
});

check('control-flow smells scoped to edited lines on Edit', () => {
    const body = `
export function f(o: any) {
  if (o.a) {
    if (o.b) { go(); }
  }
  const y = 1;
}
`;
    const err = smells('src/cf-scope.ts', body, { old_string: 'const y = 2;', new_string: 'const y = 1;' });
    assert(!err.includes('nested in'), `untouched nested-if must not flag on Edit; got: ${err}`);
    const err2 = smells('src/cf-scope.ts', body, { old_string: 'x', new_string: '    if (o.b) { go(); }' });
    assert(err2.includes('nested in'), `edited nested-if must flag; got: ${err2}`);
});

// --- smell gate (PreToolUse) + smell log + span scoping -------------------

function withConfig(config, fn) {
    const p = path.join(SANDBOX, '.claude', 'pattern-check.config.json');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(config), 'utf8');
    try { fn(); } finally { fs.rmSync(p, { force: true }); }
}

const LEGACY = `
export function legacy(o: any) {
  if (o.a) {
    if (o.b) { go(); }
  }
}
export function fresh(o: any) {
  return o;
}
`;

check('smell gate: no block severity configured → allow', () => {
    const f = writeFile('src/gate0.ts', LEGACY);
    const r = run('pattern-smell-gate.js', {
        tool_name: 'Edit',
        tool_input: { file_path: f, old_string: '  return o;', new_string: '  if (o) {\n    if (o.x) { return 1; }\n  }\n  return o;' },
    });
    assert(r.status === 0, `expected allow; got ${r.status}: ${r.stderr}`);
});

check('smell gate: blocks a new nested-if, ignores legacy ones, honours ignore + dry-run', () => {
    withConfig({ smells: { severity: { 'nested-if': 'block' } } }, () => {
        const f = writeFile('src/gate1.ts', LEGACY);
        const nested = { file_path: f, old_string: '  return o;', new_string: '  if (o) {\n    if (o.x) { return 1; }\n  }\n  return o;' };
        const r = run('pattern-smell-gate.js', { tool_name: 'Edit', tool_input: nested });
        assert(r.status === 2, `expected block; got ${r.status}: ${r.stderr}`);
        assert(r.stderr.includes('BLOCKED by smell gate') && r.stderr.includes('nested in'), `block message; got: ${r.stderr}`);

        const unrelated = run('pattern-smell-gate.js', {
            tool_name: 'Edit',
            tool_input: { file_path: f, old_string: '  return o;', new_string: '  return { ...o };' },
        });
        assert(unrelated.status === 0, `legacy nested-if must not block; got ${unrelated.status}: ${unrelated.stderr}`);

        const ignored = run('pattern-smell-gate.js', {
            tool_name: 'Edit',
            tool_input: { ...nested, new_string: '  if (o) {\n    // pattern-smell: ignore nested-if\n    if (o.x) { return 1; }\n  }\n  return o;' },
        });
        assert(ignored.status === 0, `ignore directive must allow; got ${ignored.status}: ${ignored.stderr}`);

        const dry = run('pattern-smell-gate.js', { tool_name: 'Edit', tool_input: nested }, { HOOKS_DRY_RUN: '1' });
        assert(dry.status === 0 && dry.stderr.includes('DRY-RUN'), `dry-run must allow; got ${dry.status}`);
    });
});

check('smell gate: Write to an existing file only judges changed lines', () => {
    withConfig({ smells: { severity: { 'nested-if': 'block' } } }, () => {
        const f = writeFile('src/gate2.ts', LEGACY);
        const r = run('pattern-smell-gate.js', {
            tool_name: 'Write',
            tool_input: { file_path: f, content: LEGACY.replace('return o;', 'return { ...o };') },
        });
        assert(r.status === 0, `legacy smell must not block a Write; got ${r.status}: ${r.stderr}`);
    });
});

check('smell log records reported and suppressed findings', () => {
    const logPath = path.join(SANDBOX, '.claude', 'pattern-smell-log.jsonl');
    fs.rmSync(logPath, { force: true });
    smells('src/logged.ts', `
export function a(o: any) {
  if (o.a) {
    // pattern-smell: ignore nested-if
    if (o.b) { go(); }
  }
}
export function b(o: any) {
  if (o.a) {
    if (o.b) { go(); }
  }
}
`);
    const entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    const nested = entries.filter(e => e.smellId === 'nested-if');
    assert(nested.some(e => e.suppressed) && nested.some(e => !e.suppressed), `expected one suppressed + one reported; got ${JSON.stringify(nested)}`);
});

check('class-level smell reported when an edit touches any method of the class', () => {
    const body = `export class Big {
  a() {}
  b() {}
  c() {}
  d() {}
  e() {}
  f() {}
  g() {}
  h() { return 1; }
}
`;
    const err = smells('src/big.ts', body, { old_string: 'h() {}', new_string: 'h() { return 1; }' });
    assert(err.includes('large class Big'), `expected god-class via span; got: ${err}`);
});

check('function smells: long params, boolean flag, swallowed error (Python)', () => {
    const err = smells('src/fn_smells.py', `
def build(a, b, c, d, e):
    return a

def render(items, compact: bool = False):
    try:
        return items
    except ValueError:
        pass
`);
    assert(err.includes('takes 5 parameters'), `expected long-param-list; got: ${err}`);
    assert(err.includes('boolean flag parameter'), `expected boolean-flag-param; got: ${err}`);
    assert(err.includes('swallowed error'), `expected swallowed-exception; got: ${err}`);
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

check('lists same-language snake_case siblings, skips tests and other languages', () => {
    writeFile('src/pay/base.py', 'class BaseAdapter:\n    pass\n');
    writeFile('src/pay/stripe_adapter.py', 'class StripeAdapter(BaseAdapter):\n    pass\n');
    writeFile('src/pay/test_stripe_adapter.py', 'x = 1\n');
    writeFile('src/pay/other_adapter.ts', 'export class OtherAdapter {}\n');
    const r = run('pattern-context-prep.js', {
        session_id: 'smoke',
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(SANDBOX, 'src/pay/paypal_adapter.py'),
            content: 'class PaypalAdapter(BaseAdapter):\n    def pay(self):\n        pass\n',
        },
    });
    assert(r.stderr.includes('stripe_adapter.py'), `expected snake_case sibling; got: ${r.stderr}`);
    assert(!r.stderr.includes('test_stripe_adapter.py'), `test file must be excluded; got: ${r.stderr}`);
    assert(!r.stderr.includes('other_adapter.ts'), `other-language file must be excluded; got: ${r.stderr}`);
});

// ------------------------------------------------------------------
// teardown
// ------------------------------------------------------------------
fs.rmSync(SANDBOX, { recursive: true, force: true });

process.stdout.write(`\nSmoke tests: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
