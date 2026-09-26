---
type: regex
pattern: '^\s*(export\s+)?(default\s+)?(abstract\s+)?(class|interface)\s+\w+|\bnew\s+\w*(Factory|Strategy|Formatter)\s*\('
match: not_contains
flags: m
target: last_message
---

A single formatting function needs no class, interface, factory or strategy
(SKILL.md §3, anti-overuse). `Intl.NumberFormat` is fine.
