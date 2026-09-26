// Golden fixture: well-shaped code — must produce no findings.
import java.util.List;
import java.util.Map;

public class Clean {
    private static final Map<String, Integer> FEES = Map.of("new", 1, "paid", 2);

    public int fee(String status) {
        return FEES.getOrDefault(status, 0);
    }

    public void ship(Order order) {
        if (order == null || !order.isPaid()) return;
        for (Item item : order.items()) {
            if (item == null) continue;
            log(item);
        }
    }

    public List<User> loadAll(List<Long> ids) {
        return userRepository.findAllById(ids);
    }

    public void setVisible(boolean visible) {}
}
