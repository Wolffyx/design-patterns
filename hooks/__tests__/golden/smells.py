# Golden fixture: every line flagged here is intentional.
from abc import ABC, abstractmethod


class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance


class Report(ABC):
    @abstractmethod
    def header(self): ...

    @abstractmethod
    def body(self): ...

    def render(self):
        return self.header() + self.body()


class Order:
    def __init__(self, id, customer, total, currency, notes):
        self.id = id


def describe(x):
    if isinstance(x, int):
        return "int"
    elif isinstance(x, str):
        return "str"
    elif isinstance(x, list):
        return "list"
    return "?"


def ship(order):
    if order:
        if order.paid:
            for item in order.items:
                print(item)
    if not order:
        return None
    else:
        return order


def fee(order):
    if order.status == "new":
        return 1
    elif order.status == "paid":
        return 2
    elif order.status == "shipped":
        return 3
    return 0


def render(items, compact: bool = False):
    return ""


def build(a, b, c, d, e):
    return a


def load_all(ids, cursor):
    orders = Order.objects.filter(active=True)
    for o in orders:
        print(o.customer.name)
    for uid in ids:
        cursor.execute("select * from users where id = %s", (uid,))
    try:
        risky()
    except ValueError:
        pass
    return [requests.get(u) for u in ids]


def resolve_author(root, info):
    return User.objects.get(id=root.author_id)


class AccountManager:
    def open(self): ...
    def close(self): ...
    def deposit(self): ...
    def withdraw(self): ...
    def transfer(self): ...
    def statement(self): ...
    def freeze(self): ...
    def audit(self): ...
