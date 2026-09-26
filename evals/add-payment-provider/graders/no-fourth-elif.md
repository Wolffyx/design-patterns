---
type: regex
pattern: '^\s*elif\s+provider\s*==\s*"adyen"'
match: not_contains
flags: m
target: last_message
---

Adding a fourth `elif` branch to the provider ladder is what the N+1 branches
rule forbids: the 4th variant should move the dispatch to a map.

Anchored to the start of a line so only code counts: a reply that uses a map
and mentions the `elif provider == "adyen"` alternative in its prose passes.
