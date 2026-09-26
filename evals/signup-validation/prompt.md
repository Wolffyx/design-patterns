---
name: signup-validation
tags: [control-flow, nested-if]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a TypeScript function `validateSignup(user)` for our signup form. It
returns an error message string, or `null` when the input is valid:

- `user` may be `null` or `undefined` → "missing user"
- `email` must contain "@" → "invalid email"
- `password` must be at least 12 characters → "password too short"
- `age` must be at least 16, unless `parentConsent` is `true` → "too young"

Reply with just the function.
