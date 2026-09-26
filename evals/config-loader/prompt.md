---
name: config-loader
tags: [errors, swallowed-exception]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a Python function `load_config(path)` that reads a JSON config file and
returns it merged over `DEFAULTS` (a module-level dict). If the file does not
exist yet, return a copy of `DEFAULTS`. Reply with just the code.
