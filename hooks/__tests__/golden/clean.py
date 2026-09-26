# Golden fixture: well-shaped code — must produce no findings.
FEES = {"new": 1, "paid": 2, "shipped": 3}


def fee(status):
    return FEES.get(status, 0)


def ship(order):
    if order is None or not order.paid:
        return None
    for item in order.items:
        if not item:
            continue
        print(item)
    return order


def load_all(session, ids):
    orders = Order.objects.select_related("customer").filter(id__in=ids)
    for o in orders:
        print(o.customer.name)
    return list(orders)


def poll(client):
    token = ""
    while token is not None:
        token = client.list(token)


def parse(raw):
    try:
        return int(raw)
    except ValueError:
        # non-numeric input means "no limit"
        return None


def set_verbose(verbose: bool):
    return verbose
