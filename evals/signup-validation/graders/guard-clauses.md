---
type: llm
---

Pass when the function is written with guard clauses: each rule is a flat
`if (...) return "...";` at the top level of the function, with no `if`
nested inside another `if` and no `else` after a `return`. The age rule may
combine both conditions in one expression (`user.age < 16 && !user.parentConsent`).
Fail when any `if` is nested inside another `if`, or an `else` follows a `return`.
