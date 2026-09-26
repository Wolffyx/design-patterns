---
type: regex
pattern: 'except(\s+Exception)?\s*(as\s+\w+)?\s*:\s*\n\s*(pass|return\s+(dict\()?DEFAULTS)'
match: not_contains
target: last_message
---

A bare / broad `except` that silently falls back to defaults hides corrupt
config files and permission errors.
