---
name: price-format
tags: [anti-overuse]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a TypeScript function that formats a price given in integer cents as
US dollars, e.g. `1234` → `"$12.34"` and `-5` → `"-$0.05"`. Reply with just
the code.
