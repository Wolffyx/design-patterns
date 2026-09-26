/**
 * _ts-scan.js — optional tree-sitter backend for the smell detectors.
 *
 * Adapter: parses the file with a real grammar and builds the SAME scan model
 * that _code-scan.scanBlocks builds with regexes — masked text, block entries
 * (kind / head / line / parent / depth / body range), functions — so every
 * detector runs unchanged on either backend. What the syntax tree adds:
 *
 *   - exact comment / string / regex-literal masking (raw strings, verbatim
 *     strings, template literals, JS regex literals)
 *   - brace-less bodies: `if (a) if (b) x();` is a nested if
 *   - exact function boundaries and parameter lists (default values with
 *     parens, generics, C++ declarators, Go grouped params)
 *
 * Opt-in, never required: parsers come from `@vscode/tree-sitter-wasm`
 * (runtime + all seven grammars, WASM, no native build), installed with
 * `node scripts/install-parsers.js`. When it is not installed — or anything
 * fails — `scan()` returns null and the caller falls back to regex scanning.
 */

'use strict';

const os = require('os');
const path = require('path');
const { pyLogicalLines, cleanParams } = require('./_code-scan');

const PKG = '@vscode/tree-sitter-wasm';
const GRAMMAR = { ts: 'typescript', py: 'python', java: 'java', cs: 'c-sharp', go: 'go', cpp: 'cpp', rust: 'rust' };

// --- loading ------------------------------------------------------------------

function defaultParserDir() {
    return process.env.DESIGN_PATTERNS_PARSERS_DIR ||
        path.join(os.homedir(), '.claude', 'design-patterns', 'parsers');
}

/** Absolute path of the package entry, or null when not installed anywhere we look. */
function resolvePackage(configuredDir) {
    const dirs = [configuredDir, defaultParserDir(), path.join(__dirname, '..')].filter(Boolean);
    for (const dir of dirs) {
        try {
            return require.resolve(PKG, { paths: [dir] });
        } catch {
            // not in this location — try the next one
        }
    }
    return null;
}

const state = { entry: null, mod: null, init: null, langs: {} };

async function parserFor(grammar, configuredDir) {
    const entry = state.entry || resolvePackage(configuredDir);
    if (!entry) return null;
    const dir = path.dirname(entry);
    state.entry = entry;
    state.mod = state.mod || require(entry);
    state.init = state.init || state.mod.Parser.init({ locateFile: f => path.join(dir, f) });
    await state.init;
    state.langs[grammar] = state.langs[grammar] ||
        state.mod.Language.load(path.join(dir, `tree-sitter-${grammar}.wasm`));
    const parser = new state.mod.Parser();
    parser.setLanguage(await state.langs[grammar]);
    return parser;
}

function grammarFor(langId, filePath) {
    if (langId === 'ts' && /\.tsx$/i.test(filePath || '')) return 'tsx';
    return GRAMMAR[langId] || null;
}

// --- node categories ------------------------------------------------------------

const COMMENT_TYPES = new Set(['comment', 'line_comment', 'block_comment']);
const STRING_TYPES = new Set([
    'string', 'template_string', 'string_literal', 'raw_string_literal', 'interpreted_string_literal',
    'char_literal', 'character_literal', 'verbatim_string_literal', 'interpolated_string_expression',
    'raw_string_literal', 'regex', 'text_block', 'rune_literal',
]);

const CATEGORY = new Map([
    ...['if_statement', 'if_expression'].map(t => [t, 'if']),
    ...['for_statement', 'for_in_statement', 'enhanced_for_statement', 'foreach_statement', 'for_range_loop',
        'while_statement', 'do_statement', 'for_expression', 'while_expression', 'loop_expression'].map(t => [t, 'loop']),
    ...['switch_statement', 'switch_expression', 'expression_switch_statement', 'type_switch_statement',
        'select_statement', 'match_statement', 'match_expression'].map(t => [t, 'switch']),
    ...['try_statement', 'try_with_resources_statement'].map(t => [t, 'try']),
    ...['with_statement', 'using_statement', 'lock_statement', 'synchronized_statement', 'unsafe_block',
        'fixed_statement'].map(t => [t, 'scope']),
    ...['function_declaration', 'generator_function_declaration', 'method_definition', 'arrow_function',
        'function_expression', 'method_declaration', 'constructor_declaration', 'local_function_statement',
        'func_literal', 'function_definition', 'function_item', 'lambda_expression'].map(t => [t, 'fn']),
    ...['class_declaration', 'abstract_class_declaration', 'interface_declaration', 'enum_declaration',
        'record_declaration', 'struct_declaration', 'class_definition', 'class_specifier', 'struct_specifier',
        'struct_item', 'trait_item', 'impl_item', 'enum_item', 'type_spec'].map(t => [t, 'class']),
]);
// clauses that belong to a try but sit beside it, like `} catch (e) {` in the regex scanner
const TRY_SIBLINGS = new Set(['catch_clause', 'finally_clause', 'except_clause', 'except_group_clause', 'else_clause']);
const BLOCK_TYPES = new Set([
    'statement_block', 'block', 'compound_statement', 'constructor_body', 'class_body', 'declaration_list',
    'field_declaration_list', 'switch_body', 'switch_block', 'match_block', 'interface_body', 'enum_body',
]);

// --- helpers --------------------------------------------------------------------

function named(node) {
    return node.namedChildren.filter(c => !COMMENT_TYPES.has(c.type));
}

/** Blank comments entirely and string / regex contents (delimiters kept). */
function astMask(text, root) {
    const out = text.split('');
    const blank = (a, b) => {
        for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ';
    };
    const visit = n => {
        if (COMMENT_TYPES.has(n.type)) return blank(n.startIndex, n.endIndex);
        if (STRING_TYPES.has(n.type)) return blank(n.startIndex + 1, n.endIndex - 1);
        for (const c of n.children) visit(c);
        return undefined;
    };
    visit(root);
    return out.join('');
}

function bodyNodeOf(node) {
    const field = node.childForFieldName('body') || node.childForFieldName('consequence');
    if (field) return field;
    if (node.type === 'type_spec') return bodyNodeOf(node.childForFieldName('type') || node);
    return named(node).reverse().find(c => BLOCK_TYPES.has(c.type)) || null;
}

/** Where the head starts: include `export …`, Go `type`, never decorators on other lines. */
function headStart(node) {
    const p = node.parent;
    const wraps = p && ['export_statement', 'type_declaration'].includes(p.type);
    return wraps ? p.startIndex : node.startIndex;
}

function logicalIndexAt(ctx, line) {
    return ctx.logicalByLine.has(line) ? ctx.logicalByLine.get(line) : -1;
}

function headText(ctx, node, body) {
    const line = node.startPosition.row + 1;
    if (ctx.langId === 'py') {
        const idx = logicalIndexAt(ctx, line);
        return idx === -1 ? '' : ctx.logical[idx].text;
    }
    const end = body ? body.startIndex : node.endIndex;
    return ctx.masked.slice(headStart(node), end).replace(/\s+/g, ' ').replace(/\{\s*$/, '').trim();
}

function setBody(ctx, e, body, node) {
    if (ctx.langId === 'py') {
        const endLine = (body || node).endPosition.row + 1;
        e.logicalIndex = logicalIndexAt(ctx, e.line);
        let to = e.logicalIndex + 1;
        while (to < ctx.logical.length && ctx.logical[to].line <= endLine) to++;
        e.bodyTo = to;
        e.endLine = endLine;
        e.oneLiner = body ? body.startPosition.row === node.startPosition.row : false;
        return;
    }
    const target = body || node;
    const braced = ctx.masked[target.startIndex] === '{';
    e.bodyStart = braced ? target.startIndex + 1 : target.startIndex;
    e.bodyEnd = braced ? target.endIndex - 1 : target.endIndex;
}

function makeEntry(ctx, node, kind, head, body, parent, lineNode) {
    const e = {
        kind,
        head,
        headIndex: node.startIndex,
        line: (lineNode || node).startPosition.row + 1,
        parent,
        depth: (parent ? parent.depth : 0) + (kind ? 1 : 0),
        isExpr: false,
    };
    setBody(ctx, e, body, node);
    if (ctx.langId === 'py' && e.logicalIndex === -1) return null;
    ctx.entries.push(e);
    return e;
}

// --- functions --------------------------------------------------------------------

function cppDeclaratorName(node) {
    let d = node.childForFieldName('declarator');
    while (d && d.type !== 'function_declarator' && d.childForFieldName('declarator')) d = d.childForFieldName('declarator');
    const fnDecl = d && d.type === 'function_declarator' ? d : null;
    const nameNode = fnDecl && fnDecl.childForFieldName('declarator');
    return { name: nameNode ? nameNode.text : null, params: fnDecl ? fnDecl.childForFieldName('parameters') : null, nameNode };
}

/** Name for arrow functions / function expressions: the variable, property or field they are bound to. */
function boundName(node) {
    const p = node.parent;
    if (!p) return null;
    const holder = p.childForFieldName('name') || p.childForFieldName('key') || p.childForFieldName('left');
    const bindsThis = holder && ['variable_declarator', 'pair', 'assignment_expression', 'public_field_definition',
        'field_definition', 'property_assignment'].includes(p.type);
    return bindsThis ? holder : null;
}

function paramTexts(paramsNode, langId) {
    if (!paramsNode) return [];
    const out = [];
    for (const c of named(paramsNode)) {
        const names = langId === 'go' ? c.childrenForFieldName('name') : [];
        // Go `a, b string`: one declaration, two parameters (the type sits on the last)
        if (names.length > 1) names.forEach((n, i) => out.push(i === names.length - 1 ? `${n.text} ${c.childForFieldName('type').text}` : n.text));
        else out.push(c.text.replace(/\s+/g, ' '));
    }
    return cleanParams(out, langId);
}

function goReceiver(node) {
    const recv = node.childForFieldName('receiver');
    const decl = recv && named(recv)[0];
    const type = decl && decl.childForFieldName('type');
    return type ? type.text.replace(/[*\s]/g, '').replace(/\[.*$/, '') : null;
}

function functionRecord(ctx, node, e, body) {
    const isCpp = ctx.langId === 'cpp' && node.type === 'function_definition';
    const cpp = isCpp ? cppDeclaratorName(node) : null;
    const nameNode = cpp ? cpp.nameNode : node.childForFieldName('name') || boundName(node);
    const paramsNode = cpp ? cpp.params : node.childForFieldName('parameters') || node.childForFieldName('parameter');
    const single = paramsNode && paramsNode.type === 'identifier';
    const params = single ? [paramsNode.text] : paramTexts(paramsNode, ctx.langId);
    const decorated = node.parent && node.parent.type === 'decorated_definition';
    const modifiers = ctx.langId === 'py'
        ? (decorated ? named(node.parent).filter(c => c.type === 'decorator').map(c => c.text).join(' ') : '')
        : ctx.masked.slice(headStart(node), nameNode ? nameNode.startIndex : node.startIndex).replace(/\s+/g, ' ').trim();
    const fn = {
        name: nameNode ? nameNode.text : '(anonymous)',
        params,
        head: e.head,
        modifiers,
        receiver: ctx.langId === 'go' ? goReceiver(node) : null,
        line: e.line,
        entry: e,
    };
    Object.assign(fn, ctx.langId === 'py'
        ? { logicalIndex: e.logicalIndex, bodyTo: e.bodyTo, endLine: e.endLine }
        : { bodyStart: e.bodyStart, bodyEnd: e.bodyEnd });
    e.fn = fn;
    ctx.fns.push(fn);
    return fn;
}

// --- visitors (dispatch by category; no nested branching) ----------------------------

function walkChildren(ctx, node, parent) {
    for (const c of named(node)) walk(ctx, c, parent);
}

function visitIf(ctx, node, parent, prefix) {
    const body = node.childForFieldName('consequence');
    const e = makeEntry(ctx, node, 'if', (prefix || '') + headText(ctx, node, body), body, parent);
    const alternatives = node.childrenForFieldName('alternative');
    for (const c of named(node)) {
        if (!alternatives.some(a => a.id === c.id)) walk(ctx, c, e || parent);
    }
    // else / else if / elif sit beside the `if`, not inside it
    for (const alt of alternatives) visitAlternative(ctx, alt, parent);
}

const ALTERNATIVE = {
    if_statement: (ctx, alt, parent) => visitIf(ctx, alt, parent, 'else '),
    if_expression: (ctx, alt, parent) => visitIf(ctx, alt, parent, 'else '),
    elif_clause: (ctx, alt, parent) => visitIf(ctx, alt, parent, ''),
    else_clause: (ctx, alt, parent) => {
        const inner = alt.childForFieldName('body') || named(alt)[0];
        if (inner && CATEGORY.get(inner.type) === 'if') return visitIf(ctx, inner, parent, 'else ');
        const e = makeEntry(ctx, alt, 'if', ctx.langId === 'py' ? headText(ctx, alt, inner) : 'else', inner, parent);
        return inner ? walkChildren(ctx, inner, e || parent) : undefined;
    },
};

function visitAlternative(ctx, alt, parent) {
    const handler = ALTERNATIVE[alt.type];
    if (handler) return handler(ctx, alt, parent);
    // Java / C# / Go: `else { … }` is the block itself
    const e = makeEntry(ctx, alt, 'if', 'else', alt, parent);
    return walkChildren(ctx, alt, e || parent);
}

function visitBlock(ctx, node, parent, kind) {
    const body = bodyNodeOf(node);
    const e = makeEntry(ctx, node, kind === 'scope' ? null : kind, headText(ctx, node, body), body, parent);
    const siblings = kind === 'try' || node.type === 'for_statement' || node.type === 'while_statement';
    for (const c of named(node)) {
        const beside = siblings && TRY_SIBLINGS.has(c.type);
        if (beside) visitClause(ctx, c, parent);
        else walk(ctx, c, e || parent);
    }
}

/** catch / except / finally / loop-else: a `try`-kind entry beside its statement. */
function visitClause(ctx, node, parent) {
    const body = bodyNodeOf(node) || named(node).reverse().find(c => BLOCK_TYPES.has(c.type));
    const kind = node.type === 'else_clause' && ctx.langId === 'py' ? 'if' : 'try';
    const e = makeEntry(ctx, node, kind, headText(ctx, node, body), body, parent);
    walkChildren(ctx, node, e || parent);
}

function visitFunction(ctx, node, parent) {
    const body = node.childForFieldName('body');
    const blockBody = body && (ctx.langId === 'py' || BLOCK_TYPES.has(body.type));
    if (!blockBody) return walkChildren(ctx, node, parent); // expression-bodied lambda / declaration
    const nameNode = node.childForFieldName('name');
    const e = makeEntry(ctx, node, null, headText(ctx, node, body), body, parent, nameNode);
    if (e) functionRecord(ctx, node, e, body);
    return walkChildren(ctx, node, e || parent);
}

function visitClass(ctx, node, parent) {
    const typed = node.type === 'type_spec' ? node.childForFieldName('type') : null;
    if (typed && !['struct_type', 'interface_type'].includes(typed.type)) return walkChildren(ctx, node, parent);
    const body = bodyNodeOf(node);
    const nameNode = node.childForFieldName('name') || node.childForFieldName('type');
    const e = makeEntry(ctx, node, null, headText(ctx, node, body), body, parent, nameNode);
    return walkChildren(ctx, node, e || parent);
}

/** Java `new Runnable() { … }`: an entry whose head marks it as an anonymous class body. */
function visitObjectCreation(ctx, node, parent) {
    const body = named(node).find(c => c.type === 'class_body');
    if (!body) return walkChildren(ctx, node, parent);
    const e = makeEntry(ctx, node, null, headText(ctx, node, body), body, parent);
    return walkChildren(ctx, body, e || parent);
}

const VISIT = {
    if: (ctx, n, p) => visitIf(ctx, n, p, ''),
    loop: (ctx, n, p) => visitBlock(ctx, n, p, 'loop'),
    switch: (ctx, n, p) => visitBlock(ctx, n, p, 'switch'),
    try: (ctx, n, p) => visitBlock(ctx, n, p, 'try'),
    scope: (ctx, n, p) => visitBlock(ctx, n, p, 'scope'),
    fn: visitFunction,
    class: visitClass,
};

function walk(ctx, node, parent) {
    if (node.type === 'object_creation_expression') return visitObjectCreation(ctx, node, parent);
    const visit = VISIT[CATEGORY.get(node.type)];
    return visit ? visit(ctx, node, parent) : walkChildren(ctx, node, parent);
}

// --- entry point ----------------------------------------------------------------------

/**
 * Scan model from a syntax tree, or null (not installed, unsupported
 * language, parse failure) — the caller then uses regex scanning.
 *
 * @param {string} text
 * @param {string} langId     id from _languages.js
 * @param {string} filePath   picks the TSX grammar for .tsx
 * @param {string} [parserDir] configured install location (smells.parserPath)
 */
async function scan(text, langId, filePath, parserDir) {
    const grammar = grammarFor(langId, filePath);
    if (!grammar || !text) return null;
    try {
        const parser = await parserFor(grammar, parserDir);
        if (!parser) return null;
        const tree = parser.parse(text);
        const masked = astMask(text, tree.rootNode);
        const logical = langId === 'py' ? pyLogicalLines(masked) : null;
        const ctx = {
            langId, text, masked, logical, entries: [], fns: [],
            logicalByLine: new Map((logical || []).map((l, i) => [l.line, i])),
        };
        walkChildren(ctx, tree.rootNode, null);
        tree.delete();
        parser.delete();
        return {
            langId, text, masked, lines: masked.split('\n'), logical,
            entries: ctx.entries, fns: ctx.fns, backend: 'tree-sitter',
        };
    } catch {
        return null;
    }
}

function available(parserDir) {
    return Boolean(resolvePackage(parserDir));
}

module.exports = { scan, available, defaultParserDir, PKG, GRAMMAR };
