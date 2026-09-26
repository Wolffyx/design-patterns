---
name: add-payment-provider
tags: [control-flow, n-plus-one-branches]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

This is `payments.py` from our billing service:

```python
def charge(provider, amount_cents, customer_id):
    if provider == "stripe":
        return stripe_client.charge(customer_id, amount_cents)
    elif provider == "paypal":
        return paypal_client.pay(customer_id, amount_cents / 100)
    elif provider == "braintree":
        return braintree_client.transaction(customer_id, amount_cents)
    else:
        raise ValueError(f"unknown provider {provider}")
```

Add support for the "adyen" provider. Adyen is charged with
`adyen_client.authorise(customer_id, amount_cents, currency="EUR")`.
Reply with the complete updated file.
