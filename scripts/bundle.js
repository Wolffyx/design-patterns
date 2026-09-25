#!/usr/bin/env node
/**
 * Bundle SKILL.md + every references/*.md into a single markdown file
 * suitable for pasting into non-Claude-Code agents (Cursor `.cursorrules`,
 * Aider `--read`, Codex/ChatGPT system prompt, etc.).
 *
 * Output: dist/skill-bundle.md
 *
 * Hooks don't transfer — only the catalog content. The output file is
 * checked into git so users without Node can grab it directly from GitHub
 * raw content.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILL_DIR = path.join(ROOT, 'skills', 'design-patterns');
const REFS_DIR = path.join(SKILL_DIR, 'references');
const OUT = path.join(ROOT, 'dist', 'skill-bundle.md');

const pkgVersion = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || ''; }
    catch { return ''; }
})();

function read(p) { return fs.readFileSync(p, 'utf8'); }

function stripFrontmatter(md) {
    if (md.startsWith('---')) {
        const end = md.indexOf('\n---', 3);
        if (end !== -1) return md.slice(end + 4).replace(/^\n+/, '');
    }
    return md;
}

function rewriteRefLinks(md, slugs) {
    // "references/<slug>.md" (from SKILL.md) and bare "<slug>.md" (between
    // references) — every reference is inline below, so point at its anchor
    return md.replace(/\((?:references\/)?([\w-]+)\.md[^)]*\)/g,
        (whole, slug) => (slugs.has(slug) ? `(#${slug})` : whole));
}

// hook-protocol.md documents Claude Code hook output only — no use to other agents
const HOOK_ONLY = new Set(['hook-protocol.md']);

const refFiles = fs.readdirSync(REFS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_') && !HOOK_ONLY.has(f))
    .sort();
const slugs = new Set(refFiles.map(f => f.replace(/\.md$/, '')));

const skillRaw = read(path.join(SKILL_DIR, 'SKILL.md'));
const skill = rewriteRefLinks(stripFrontmatter(skillRaw), slugs);

const parts = [];
parts.push(`# Design Patterns — Bundled Catalog`);
parts.push('');
parts.push(`> Generated from \`design-patterns\`${pkgVersion ? ` v${pkgVersion}` : ''}.`);
parts.push('> Self-contained markdown — paste into your agent\'s rules/system-prompt.');
parts.push('> Hooks (Pattern Check enforcement) are Claude Code-only and not included here.');
parts.push('');
parts.push('---');
parts.push('');
parts.push(skill.trim());
parts.push('');

for (const file of refFiles) {
    const slug = file.replace(/\.md$/, '');
    const content = rewriteRefLinks(stripFrontmatter(read(path.join(REFS_DIR, file))), slugs);
    parts.push('---');
    parts.push('');
    parts.push(`<a id="${slug}"></a>`);
    parts.push('');
    parts.push(content.trim());
    parts.push('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, parts.join('\n'), 'utf8');
process.stdout.write(`✔ wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${refFiles.length} references)\n`);
