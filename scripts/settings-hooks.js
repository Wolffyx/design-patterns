#!/usr/bin/env node
/**
 * Add or remove this plugin's hook entries in a Claude Code settings.json and
 * leave every other hook alone. Used by install.sh and uninstall.sh.
 *
 *   node scripts/settings-hooks.js add    <settings.json> <settings.example.json>
 *   node scripts/settings-hooks.js remove <settings.json> <settings.example.json>
 *
 * "Ours" means a command that runs one of the hook scripts named in the
 * example file from ~/.claude/design-patterns/hooks/ (current layout) or
 * ~/.claude/hooks/ (the pre-1.1 symlink), with the home directory written as
 * $HOME, ${HOME}, ~ or the expanded path. `add` first removes our old entries,
 * so running it twice changes nothing. Paths arrive as arguments and are never
 * spliced into code. A settings.json that is not valid JSON is left untouched
 * and the script exits 1.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK_DIRS = ['.claude/design-patterns/hooks', '.claude/hooks'];

function readSettings(p) {
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Hook script file names the example registers (`session-start-reminder.js`, …). */
function scriptNames(example) {
    const text = JSON.stringify(example.hooks || {});
    return [...new Set([...text.matchAll(/([\w-]+\.js)\b/g)].map(m => m[1]))];
}

/** Every spelling of "<home>/<hook dir>/<script>" that marks a command as ours. */
function ownMarks(example, home) {
    const homes = ['$HOME', '${HOME}', '~', home.replace(/\\/g, '/')];
    const names = scriptNames(example);
    return homes.flatMap(h => HOOK_DIRS.flatMap(d => names.map(n => `${h}/${d}/${n}`)));
}

function isOurs(hook, marks) {
    const cmd = hook && typeof hook.command === 'string' ? hook.command.replace(/\\/g, '/') : '';
    return marks.some(m => cmd.includes(m));
}

/** The group without our hooks; null when that empties a group that had hooks. */
function stripGroup(group, marks) {
    if (!group || !Array.isArray(group.hooks)) return group;
    const hooks = group.hooks.filter(h => !isOurs(h, marks));
    return hooks.length || !group.hooks.length ? { ...group, hooks } : null;
}

/** settings.hooks without our entries; events left empty are dropped. */
function stripOurs(hooks, marks) {
    const out = {};
    for (const [event, groups] of Object.entries(hooks || {})) {
        const kept = Array.isArray(groups) ? groups.map(g => stripGroup(g, marks)).filter(g => g !== null) : groups;
        if (!Array.isArray(kept) || kept.length) out[event] = kept;
    }
    return out;
}

/** The example's hooks with the literal $HOME in commands replaced by the real home. */
function expandHome(hooks, home) {
    return JSON.parse(JSON.stringify(hooks || {}, (k, v) =>
        (k === 'command' && typeof v === 'string' ? v.split('$HOME').join(home) : v)));
}

function appendHooks(hooks, extra) {
    const out = { ...hooks };
    for (const [event, groups] of Object.entries(extra)) {
        out[event] = (Array.isArray(out[event]) ? out[event] : []).concat(groups);
    }
    return out;
}

const ACTIONS = {
    add: (hooks, example, home) => appendHooks(stripOurs(hooks, ownMarks(example, home)), expandHome(example.hooks, home)),
    remove: (hooks, example, home) => stripOurs(hooks, ownMarks(example, home)),
};

/** settings with the action applied to its hooks block (dropped when empty). */
function apply(action, settings, example, home) {
    const hooks = ACTIONS[action](settings.hooks, example, home);
    const out = { ...settings, hooks };
    if (!Object.keys(hooks).length) delete out.hooks;
    return out;
}

function main(argv) {
    const [action, settingsPath, examplePath] = argv;
    if (!ACTIONS[action] || !settingsPath || !examplePath) {
        process.stderr.write('usage: settings-hooks.js add|remove <settings.json> <settings.example.json>\n');
        return 2;
    }
    const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    const settings = apply(action, readSettings(settingsPath), example, os.homedir());
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    return 0;
}

module.exports = { apply, ownMarks, stripOurs };

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (e) {
        process.stderr.write(`✗ settings-hooks: ${e.message}\n`);
        process.exit(1);
    }
}
