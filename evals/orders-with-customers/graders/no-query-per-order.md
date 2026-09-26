---
type: regex
pattern: '(for\s*\(|\.map\(|\.forEach\()[^;]*?(findUnique|findFirst)\('
match: not_contains
flags: s
target: last_message
---

A `findUnique` / `findFirst` per order inside a loop or `.map` is the N+1.
