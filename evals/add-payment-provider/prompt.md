---
name: add-payment-provider
tags: [control-flow, n-plus-one-branches]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

This is `payments.py` from our billing service:

```python
{file:fixtures/payments.py}
```

Add support for the "adyen" provider. Adyen is charged with
`adyen_client.authorise(customer_id, amount_cents, currency="EUR")`.
Reply with the complete updated file.
