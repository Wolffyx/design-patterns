// Golden fixture: every line flagged here is intentional.
#include <string>
#include <vector>

class Config {
public:
    static Config& instance() { static Config c; return c; }
private:
    Config() {}
};

class Report {
public:
    virtual std::string header() = 0;
    virtual std::string body() = 0;
    std::string render() { return header() + body(); }
};

class Order {
public:
    Order(int id, int customer, int total, int currency, int notes) {}
};

std::string describe(Base* x) {
    if (dynamic_cast<A*>(x)) {
        return "a";
    } else if (dynamic_cast<B*>(x)) {
        return "b";
    } else if (dynamic_cast<C*>(x)) {
        return "c";
    }
    return "?";
}

void ship(Order* o) {
    if (o) {
        if (o->paid) {
            for (auto& item : o->items) {
                log(item);
            }
        }
    }
}

std::string render(const std::vector<std::string>& items, bool compact) { return ""; }

void risky() {
    try { work(); } catch (...) {}
}
