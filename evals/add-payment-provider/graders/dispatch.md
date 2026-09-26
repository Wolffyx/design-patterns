---
type: llm
weight: 2
---

Pass when the updated file routes providers through a lookup (a dict / map
of provider name → handler function, or an equivalent registry) instead of
an if/elif chain, includes "adyen" calling
`adyen_client.authorise(customer_id, amount_cents, currency="EUR")`, and
still raises a clear error for an unknown provider. Fail when it adds a
fourth `elif`, or when it introduces class hierarchies / abstract base
classes for four one-line handlers (over-engineering).
