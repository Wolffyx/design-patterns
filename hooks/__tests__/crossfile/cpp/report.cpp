#include "users.h"
#include <vector>

void build(const std::vector<int>& ids) {
    for (auto id : ids) {
        getUser(id);
    }
}
