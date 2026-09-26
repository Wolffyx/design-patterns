#!/usr/bin/env bash
# uninstall.sh — reverse install.sh.
#
# - removes ~/.claude/skills/design-patterns, ~/.claude/design-patterns/hooks
#   and the pre-1.1 ~/.claude/hooks link if they are symlinks pointing inside
#   this repo,
# - restores the most-recent ~/.claude/backups/design-patterns-* if present,
# - removes this plugin's hook entries from ~/.claude/settings.json — only
#   commands that run our hook scripts from our install paths; every other
#   hook is kept (scripts/settings-hooks.js).

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILL_LINK="$CLAUDE_DIR/skills/design-patterns"
HOOKS_LINK="$CLAUDE_DIR/design-patterns/hooks"
LEGACY_HOOKS_LINK="$CLAUDE_DIR/hooks"
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
remove_symlink "$LEGACY_HOOKS_LINK" "$REPO"
rmdir "$CLAUDE_DIR/design-patterns" 2>/dev/null || true

# remove command symlinks that point into this repo
if [ -d "$CLAUDE_DIR/commands" ]; then
  for cmd in "$REPO"/commands/*.md; do
    [ -e "$cmd" ] || continue
    remove_symlink "$CLAUDE_DIR/commands/$(basename "$cmd")" "$REPO"
  done
  rmdir "$CLAUDE_DIR/commands" 2>/dev/null || true
fi

# --- restore latest backup if any ----------------------------------------

# backup dirs end in a sortable YYYYmmdd-HHMMSS stamp: glob order is
# chronological, so the last match is the newest
LATEST_BACKUP=""
for dir in "$CLAUDE_DIR/backups/design-patterns-"*; do
  [ -d "$dir" ] && LATEST_BACKUP="$dir"
done
if [ -n "$LATEST_BACKUP" ]; then
  if [ -d "$LATEST_BACKUP/skills-design-patterns" ] && [ ! -e "$SKILL_LINK" ]; then
    mv "$LATEST_BACKUP/skills-design-patterns" "$SKILL_LINK"
    echo "▸ restored $SKILL_LINK from $LATEST_BACKUP"
  fi
  if [ -d "$LATEST_BACKUP/design-patterns-hooks" ] && [ ! -e "$HOOKS_LINK" ]; then
    mkdir -p "$(dirname "$HOOKS_LINK")"
    mv "$LATEST_BACKUP/design-patterns-hooks" "$HOOKS_LINK"
    echo "▸ restored $HOOKS_LINK from $LATEST_BACKUP"
  fi
  # pre-1.1 installs backed up the user's own ~/.claude/hooks under this name
  if [ -d "$LATEST_BACKUP/hooks" ] && [ ! -e "$LEGACY_HOOKS_LINK" ]; then
    mv "$LATEST_BACKUP/hooks" "$LEGACY_HOOKS_LINK"
    echo "▸ restored $LEGACY_HOOKS_LINK from $LATEST_BACKUP"
  fi
  rmdir "$LATEST_BACKUP" 2>/dev/null || true
fi

# --- strip hooks entries from settings.json ------------------------------

if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.bak-$TS"
  node "$REPO/scripts/settings-hooks.js" remove "$SETTINGS" "$REPO/settings.example.json"
  echo "▸ removed design-patterns hooks from $SETTINGS, other hooks kept (backup: $SETTINGS.bak-$TS)"
fi

cat <<EOF

✔ design-patterns uninstalled.
Restart Claude Code to clear loaded hooks.
EOF
