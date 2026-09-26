class UserStore:
    def __init__(self, cursor):
        self.cursor = cursor

    def get(self, uid):
        return self.cursor.execute("select * from users where id = %s", (uid,))
