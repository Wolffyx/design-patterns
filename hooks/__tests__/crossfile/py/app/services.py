from app.store import UserStore


class UserService:
    def __init__(self, cursor):
        self.store = UserStore(cursor)

    def get_user(self, uid):
        return self.store.get(uid)
