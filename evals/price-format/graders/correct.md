---
type: llm
---

Judge only whether the code returns the right strings. Trace the function by
hand for each input and write down each result before deciding:

- `1234` → `"$12.34"`
- `-5` → `"-$0.05"`
- `0` → `"$0.00"`

Pass when all three results match exactly. Input validation (for example
throwing on non-integer cents), intermediate variables, `Intl.NumberFormat`
and thousands separators are all fine and do not affect the verdict. Fail
only when at least one of the three results is wrong or the reply contains
no function. Code structure (classes, factories) is graded separately by
`no-ceremony`.
