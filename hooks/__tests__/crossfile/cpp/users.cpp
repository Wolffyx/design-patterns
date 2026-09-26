#include "users.h"

User getUser(int id) {
    return db.query("select * from users where id = $1", id);
}
