#!/usr/bin/env bash
# uninstall.sh — reverse install.sh.
#
# - removes ~/.claude/skills/design-patterns and ~/.claude/hooks if they are
#   symlinks pointing inside this repo,
# - restores the most-recent ~/.claude/backups/design-patterns-* if present,
# - strips pattern-related entries from ~/.claude/settings.json hooks block.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILL_LINK="$CLAUDE_DIR/skills/design-patterns"
HOOKS_LINK="$CLAUDE_DIR/hooks"
SETTINGS="$CLAUDE_DIR/settings.json"
TS="$(date +%Y%m%d-%H%M%S)"

remove_symlink() {
  local target="$1" expectedPrefix="$2"
  if [ -L "$target" ]; then
    local actual
    actual="$(readlink -f "$target" 2>/dev/null || readlink "$target")"
    case "$actual" in
      "$expectedPrefix"*)
        rm "$target"
        echo "▸ removed symlink $target"
        ;;
      *)
        echo "▸ skipping $target — symlink does not point into $expectedPrefix"
        ;;
    esac
  fi
}

remove_symlink "$SKILL_LINK" "$REPO"
remove_symlink "$HOOKS_LINK" "$REPO"

# --- restore latest backup if any ----------------------------------------

LATEST_BACKUP="$(ls -1dt "$CLAUDE_DIR/backups/design-patterns-"* 2>/dev/null | head -n 1 || true)"
if [ -n "$LATEST_BACKUP" ]; then
  if [ -d "$LATEST_BACKUP/skills-design-patterns" ] && [ ! -e "$SKILL_LINK" ]; then
    mv "$LATEST_BACKUP/skills-design-patterns" "$SKILL_LINK"
    echo "▸ restored $SKILL_LINK from $LATEST_BACKUP"
  fi
  if [ -d "$LATEST_BACKUP/hooks" ] && [ ! -e "$HOOKS_LINK" ]; then
    mv "$LATEST_BACKUP/hooks" "$HOOKS_LINK"
    echo "▸ restored $HOOKS_LINK from $LATEST_BACKUP"
  fi
  rmdir "$LATEST_BACKUP" 2>/dev/null || true
fi

# --- strip hooks entries from settings.json ------------------------------

if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.bak-$TS"
  node - <<'NODE'
const fs = require('fs');
const path = require('path');
const settingsPath = process.env.HOME + '/.claude/settings.json';
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const PATTERN_RE = /(pattern-|session-start-reminder|user-prompt-reminder)/i;

function stripGroup(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(group => {
    if (!group || !Array.isArray(group.hooks)) return group;
    const filtered = group.hooks.filter(h =>
      !(h && typeof h.command === 'string' && PATTERN_RE.test(h.command)));
    if (filtered.length === 0) return null;
    return { ...group, hooks: filtered };
  }).filter(Boolean);
}

if (settings.hooks && typeof settings.hooks === 'object') {
  for (const evt of Object.keys(settings.hooks)) {
    settings.hooks[evt] = stripGroup(settings.hooks[evt]);
    if (Array.isArray(settings.hooks[evt]) && settings.hooks[evt].length === 0) {
      delete settings.hooks[evt];
    }
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
NODE
  echo "▸ stripped pattern hooks from $SETTINGS (backup: $SETTINGS.bak-$TS)"
fi

cat <<EOF

✔ design-patterns uninstalled.
Restart Claude Code to clear loaded hooks.
EOF
