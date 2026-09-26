// Golden fixture: every line flagged here is intentional.
import java.util.List;

public class Smells {
    private static Smells instance;
    private Smells() {}
    public static Smells getInstance() { return instance; }

    public Smells(String id, String customer, int total, String currency, String notes) {}

    public String describe(Object x) {
        if (x instanceof Integer) {
            return "int";
        } else if (x instanceof String) {
            return "str";
        } else if (x instanceof List) {
            return "list";
        }
        return "?";
    }

    public void ship(Order order) {
        if (order != null) {
            if (order.isPaid()) {
                for (Item item : order.items()) {
                    log(item);
                }
            }
        }
    }

    public int fee(Order order) {
        if ("new".equals(order.status())) {
            return 1;
        } else if ("paid".equals(order.status())) {
            return 2;
        } else if ("shipped".equals(order.status())) {
            return 3;
        }
        return 0;
    }

    public String render(List<String> items, boolean compact) { return ""; }

    public void loadAll(List<Long> ids) {
        List<Order> orders = orderRepository.findAll();
        for (Order o : orders) {
            String name = o.getCustomer().getName();
        }
        for (Long id : ids) {
            userRepository.findById(id);
        }
        try {
            risky();
        } catch (Exception e) {}
    }
}

abstract class Report {
    protected abstract String header();
    protected abstract String body();
    public String render() { return header() + body(); }
}
