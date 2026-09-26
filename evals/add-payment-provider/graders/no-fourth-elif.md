---
type: regex
pattern: 'elif\s+provider\s*==\s*"adyen"'
match: not_contains
target: last_message
---

Adding a fourth `elif` branch to the provider ladder is what the N+1 branches
rule forbids: the 4th variant should move the dispatch to a map.
