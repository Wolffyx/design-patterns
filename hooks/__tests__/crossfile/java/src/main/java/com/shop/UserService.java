package com.shop;

public class UserService {
    private final UserRepository repo;

    public User getUser(long id) {
        return repo.findById(id).orElseThrow();
    }
}
