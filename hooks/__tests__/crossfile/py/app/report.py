from app.services import UserService
from app import helpers
from .helpers import fetch_profile, slug


class Report:
    def __init__(self, cursor):
        self.users = UserService(cursor)

    def build(self, ids):
        for uid in ids:
            self.users.get_user(uid)
        for uid in ids:
            helpers.fetch_profile(uid)
        for uid in ids:
            fetch_profile(uid)
        for uid in ids:
            slug(uid)
