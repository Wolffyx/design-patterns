package com.shop.report;

import com.shop.UserService;
import java.util.List;

public class ReportService {
    private final UserService users;

    public void build(List<Long> ids) {
        for (Long id : ids) {
            users.getUser(id);
        }
    }
}
