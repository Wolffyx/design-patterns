// Golden fixture: well-shaped code — must produce no findings.
#include <string>
#include <unordered_map>

static const std::unordered_map<std::string, int> kFees{{"new", 1}, {"paid", 2}};

int fee(const std::string& status) {
    auto it = kFees.find(status);
    return it == kFees.end() ? 0 : it->second;
}

void ship(const Order* o) {
    if (!o || !o->paid) return;
    for (const auto& item : o->items) {
        if (item.empty()) continue;
        log(item);
    }
}

void setVisible(bool visible) {}
