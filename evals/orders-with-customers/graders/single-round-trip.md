---
type: llm
weight: 2
---

Pass when customers are loaded without one query per order: either the
original `findMany` uses `include` / `select` of the `customer` relation, or
all customer ids are collected and loaded with one `findMany({ where: { id:
{ in: ids } } })` followed by an in-memory lookup. Fail when the code awaits
a customer query per order, including inside `Promise.all(orders.map(...))`.
