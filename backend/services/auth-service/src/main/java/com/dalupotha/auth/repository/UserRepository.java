package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmployeeId(String employeeId);
    Optional<User> findByContact(String contact);
    boolean existsByContact(String contact);
    boolean existsByEmployeeId(String employeeId);
}
