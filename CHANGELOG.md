# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning: [SemVer](https://semver.org/).

## [1.1.0] — 2026-09-26

### Added

- **Control-flow rules** (`references/control-flow.md`): no nested `if`
  (guard clauses), max nesting depth 2, no `else` after an exit, the
  **N+1 branches** ladder (`if` → dispatch map → Strategy / State) and
  **N+1 query** guidance: batch, hoist loop-invariant calls, eager-load,
  bulk-write, DataLoader. Before/after code in all seven languages.
- **Function and error rules** (`references/functions.md`): function size,
  parameter count, boolean flag parameters, complexity, command/query
  separation, never swallowing errors, Result vs exception per language,
  wrapping errors at boundaries.
- **Tier 0** (`references/extras.md`): Guard Clause, Dispatch Map, Null
  Object, Result type, Repository, Specification, Pipeline / Middleware,
  Dependency Injection. Valid names in the *Pattern check* line.
- **Lighter idiomatic forms** table in every GoF reference, per language.
- **Principles** section in SKILL.md (SOLID, composition, DI, testability)
  and an extended anti-overuse list (speculative interfaces, delegating
  wrappers, everything-is-a-service, …).
- **13 new smell detectors**, all seven languages: `nested-if`,
  `deep-nesting`, `else-after-return`, `conditional-ladder`,
  `scattered-discriminator`, `long-function`, `long-param-list`,
  `boolean-flag-param`, `complexity`, `swallowed-exception`, `n-plus-one`,
  `await-in-loop` (and multi-language `long-constructor`).
- **N+1 detection** that grades evidence (high: known ORM / driver / HTTP
  API; medium: data-access receiver, same-file I/O helper, lazy relation
  load, GraphQL resolver per parent; low: bare sequential `await`) and
  classifies the fix: per-item (batch), loop-invariant (hoist), N writes
  (bulk), concurrent-but-still-N, nested N×M. `while` loops (pagination,
  polling) and small literal loops are skipped.
- **Per-smell severity** (`smells.severity`: `off` / `advise` / `block`) and
  the **`pattern-smell-gate.js`** PreToolUse hook that rejects a write
  introducing a `block` smell on the lines it writes.
- **Smell log** (`.claude/pattern-smell-log.jsonl`) and a **smell tuning**
  section in `analyze-log.js`: reported vs suppressed per smell, with a
  "loosen this knob" hint when a smell is suppressed in ≥30% of sightings.
- **Golden tests** (`hooks/__tests__/golden/`): a smelly and a clean file
  per language with exact expected findings.
- **Eval suite** (`evals/`) for `claude plugin eval`: behavior checks for the
  N+1 branches rule, N+1 queries, guard clauses, error handling and
  anti-overuse.
- **Cross-file N+1** (`_io-index.js`): follows imports, namespaces and
  injected services (typed fields / constructor params) into other files,
  up to two files deep, in all seven languages; per-file I/O index cached on
  disk and invalidated by file / dependency mtimes. Messages name where the
  round-trip really happens (`does .findUnique(, src/user-store.ts:3`).
- **Optional tree-sitter backend** (`_ts-scan.js`, `scripts/install-parsers.js`,
  `smells.parser`): one WASM package with all seven grammars, installed
  outside the plugin; builds the same scan model from real syntax trees
  (brace-less nested ifs and loops, exact masking and function boundaries).
  Falls back to regex scanning when absent. `install.sh --with-parsers`.
- **Dogfood test**: the hooks, scripts and test runners must pass
  nested-if / deep-nesting / else-after-return on both backends.
- Cross-file N+1 tests (one multi-file project per language, including cache
  invalidation) and AST-only golden fixtures.
- Tier 0 conventions, approved exceptions and severity policy sections in
  the project-usage template.
- `CHANGELOG.md`.

### Changed

- The GoF smell detectors now work on all seven languages (Python classes,
  Go receivers, Rust impls, C++ out-of-line methods, Java/C# declarations),
  read comment/string-masked code, and skip exhaustive switches.
- All smells report only the lines an Edit touched, or the class / function
  it touched (`smells.scope: "edited"`, default). `controlFlowScope` is a
  deprecated alias.
- `repeated-new` ignores exception and standard-library types.
- Nesting depth restarts inside every function / lambda body (like ESLint
  `max-depth`) instead of counting across closures.
- The existing hooks were refactored to follow the control-flow rules:
  dispatch maps (`BRACE_STEP`, `SIGNATURE`, `LOOP_SHAPES`, `FUNCTION_CHECKS`),
  guard clauses and extracted helpers instead of nested ifs.
- SKILL.md trimmed from ~420 to ~300 lines: the decision tree and catalog
  moved to `references/catalog.md`, hook mechanics to
  `references/hook-protocol.md`. Singleton is marked "rejected by default".
- Skill description kept under the 1024-character limit.
- Smell detectors split into `_gof-smells.js`, `_control-flow-smells.js`,
  `_function-smells.js` and `_nplusone.js` over a shared scanner
  (`_code-scan.js`) and registry (`_smells.js`).

### Fixed

- `pattern-context-prep.js` sibling discovery only listed `.ts` / `.tsx`
  files and matched names case-sensitively (missed `stripe_adapter.py`).
- Import detection in `pattern-context-prep.js` only understood TypeScript
  `from '…'`; it now reads every language's import form.
- TypeScript-only wording in the preamble and log hooks and in
  `/pattern-review` (which only scanned `.ts` files).
- Literal `\u2014` escape sequences (22 of them) in `PORTING.md` rendered as raw text.
- `instanceof-chain` only caught one-line chains.

### Security

A cloned repository ships its own `.claude/pattern-check.config.json` and
can contain symlinks, so both are now treated as untrusted.

- **Code execution through project config.** `smells.parserPath` chose the
  tree-sitter package that `_ts-scan.js` loads with `require`, so a repository
  could ship its own "parser" that ran on the first edit. The option is
  removed. Parsers load only from `DESIGN_PATTERNS_PARSERS_DIR`,
  `~/.claude/design-patterns/parsers` or the plugin directory.
- **File writes anywhere through project config.** The hooks used
  `log.path`, `log.blockStatsPath`, `log.smellLogPath`, `sessionCache.path`
  and the cross-file `cachePath`s as given, and followed symlinks in
  `.claude/`. These paths must now resolve inside `<project>/.claude/` after
  symlinks are followed (`sessionCache.path` may also use
  `~/.claude/cache/`); any other path is skipped.
- **Regexes from config.** `contextPrep.siblingNameRegex`,
  `nPlusOne.extraCallPatterns` and `nPlusOne.dataAccessReceivers` are refused
  when invalid, over 500 characters or prone to catastrophic backtracking, and
  the built-in default is used instead. `blocking.fileExtensions` entries
  now match literally; a `c++` entry used to crash two hooks.
- **`install.sh` overwrote other hooks.** It replaced the whole `hooks`
  block of `~/.claude/settings.json` and symlinked all of `~/.claude/hooks`.
  It now adds only this plugin's entries (`scripts/settings-hooks.js`;
  running it again adds nothing) and links `~/.claude/design-patterns/hooks`
  instead. A pre-1.1 install is migrated: the old link is removed and the
  user's own `~/.claude/hooks` is restored from its backup.
- **`uninstall.sh` removed other hooks.** It dropped any hook whose command
  contained `pattern-`. It now removes only commands that run this plugin's
  hook scripts from its install paths.
- `install.sh` no longer splices paths into inline JavaScript, which broke
  when `$HOME` contained a `'`.
- **Parser install supply chain.** `scripts/install-parsers.js` runs
  `npm ci --ignore-scripts` against a committed lockfile, which pins the exact
  version and its sha512 integrity and runs no package scripts. It only
  installs into or deletes a directory that is missing, empty or a previous
  parser install, and `--dir` without a value is an error.
- `hooks/__tests__/security.js` covers all of the above and is part of
  `npm test`.

## [1.0.0] — 2026-04-26

- GoF catalog skill (22 patterns, refactoring.guru) and Pattern Check
  (Rule 0) hooks: preamble enforcement, smell detector, decision log,
  context preflight, `/pattern-review`.
- Multi-language enforcement (Python, Java, C#, Go, C++, Rust) added
  2026-07-01.
