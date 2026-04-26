#!/usr/bin/env bash
# install.sh — install the design-patterns skill + hooks into ~/.claude/.
#
# Two modes:
#   1. Run from a checkout:  ./install.sh
#   2. curl-pipe one-liner:   curl -fsSL <repo>/install.sh | bash -s -- --auto-clone
#
# Steps:
#   - require node ≥ 18
#   - back up existing real (non-symlink) ~/.claude/{skills/design-patterns,hooks}
#   - symlink ~/.claude/skills/design-patterns → <repo>/skills/design-patterns
#   - symlink ~/.claude/hooks                  → <repo>/hooks
#   - merge hooks block from settings.example.json into ~/.claude/settings.json
#     (replacing $HOME with the user's actual home)
#
# Recommended path: install via Claude Code plugin instead.
#   /plugin marketplace add <user>/design-patterns
#   /plugin install design-patterns@design-patterns
# This script is provided for older CC versions or users who want a
# single-machine install outside the plugin sandbox.

set -euo pipefail

REPO_DEFAULT_DIR="${HOME}/design-patterns"
REPO_GIT_URL="${CLAUDE_DESIGN_PATTERNS_REPO:-https://github.com/wolffyx/design-patterns.git}"
AUTO_CLONE=0

for arg in "$@"; do
  case "$arg" in
    --auto-clone) AUTO_CLONE=1 ;;
    -h|--help)
      cat <<EOF
Usage: install.sh [--auto-clone]

  --auto-clone   git-clone the repo into ${REPO_DEFAULT_DIR} if this script
                 is being run from outside a checkout (curl|bash mode).

Environment:
  CLAUDE_DESIGN_PATTERNS_REPO   override the default git URL.
EOF
      exit 0 ;;
  esac
done

# --- resolve REPO ---------------------------------------------------------

if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  REPO=""
fi

if [ -z "$REPO" ] || [ ! -f "$REPO/.claude-plugin/plugin.json" ]; then
  if [ "$AUTO_CLONE" -eq 1 ]; then
    if [ ! -d "$REPO_DEFAULT_DIR/.claude-plugin" ]; then
      echo "▸ cloning $REPO_GIT_URL into $REPO_DEFAULT_DIR …"
      git clone --depth 1 "$REPO_GIT_URL" "$REPO_DEFAULT_DIR"
    fi
    REPO="$REPO_DEFAULT_DIR"
  else
    echo "✗ install.sh must be run from inside the repo checkout, or with --auto-clone." >&2
    exit 1
  fi
fi

echo "▸ repo: $REPO"

# --- check node ≥ 18 ------------------------------------------------------

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node not found on PATH. Install Node.js ≥ 18 first." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ node ${NODE_MAJOR}.x is too old. Need ≥ 18." >&2
  exit 1
fi
echo "▸ node $(node -v)"

# --- backup existing real dirs -------------------------------------------

CLAUDE_DIR="$HOME/.claude"
SKILL_LINK="$CLAUDE_DIR/skills/design-patterns"
HOOKS_LINK="$CLAUDE_DIR/hooks"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$CLAUDE_DIR/backups/design-patterns-$TS"

mkdir -p "$CLAUDE_DIR/skills"

backup_if_real() {
  local target="$1" name="$2"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "▸ backing up $target → $BACKUP_DIR/$name"
    mv "$target" "$BACKUP_DIR/$name"
  fi
}

backup_if_real "$SKILL_LINK" "skills-design-patterns"
backup_if_real "$HOOKS_LINK" "hooks"

# --- create symlinks ------------------------------------------------------

ln -sfn "$REPO/skills/design-patterns" "$SKILL_LINK"
ln -sfn "$REPO/hooks" "$HOOKS_LINK"
echo "▸ symlinked $SKILL_LINK"
echo "▸ symlinked $HOOKS_LINK"

# --- merge hooks block into settings.json ---------------------------------

SETTINGS="$CLAUDE_DIR/settings.json"
EXAMPLE="$REPO/settings.example.json"

[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
cp "$SETTINGS" "$SETTINGS.bak-$TS"

node - <<NODE
const fs = require('fs');
const path = require('path');
const settingsPath = '$SETTINGS';
const examplePath  = '$EXAMPLE';
const home = process.env.HOME;

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const example  = JSON.parse(fs.readFileSync(examplePath,  'utf8'));

// substitute \$HOME literal in example commands
function subst(node) {
  if (Array.isArray(node)) return node.map(subst);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = (k === 'command' && typeof v === 'string')
        ? v.replace(/\\\$HOME/g, home)
        : subst(v);
    }
    return out;
  }
  return node;
}

settings.hooks = subst(example.hooks);
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
NODE

echo "▸ merged hooks block into $SETTINGS (backup: $SETTINGS.bak-$TS)"

cat <<EOF

✔ design-patterns installed.

Next:
  - Restart Claude Code so the new hooks take effect.
  - Per-project setup (optional):
      cp '$REPO/docs/CLAUDE.rule0.md' ./CLAUDE.md          # or paste into existing
      mkdir -p .claude
      cp '$REPO/docs/design-patterns-project-usage.md' .claude/
      cp '$REPO/pattern-check.config.example.json' .claude/pattern-check.config.json

Uninstall:  '$REPO/uninstall.sh'

Tip: prefer the Claude Code plugin install when possible:
       /plugin marketplace add wolffyx/design-patterns
       /plugin install design-patterns@design-patterns
EOF
