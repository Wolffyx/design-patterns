def charge(provider, amount_cents, customer_id):
    if provider == "stripe":
        return stripe_client.charge(customer_id, amount_cents)
    elif provider == "paypal":
        return paypal_client.pay(customer_id, amount_cents / 100)
    elif provider == "braintree":
        return braintree_client.transaction(customer_id, amount_cents)
    else:
        raise ValueError(f"unknown provider {provider}")
