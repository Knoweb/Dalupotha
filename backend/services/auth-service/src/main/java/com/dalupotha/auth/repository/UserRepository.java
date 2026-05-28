package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.entity.UserRole;
import com.dalupotha.auth.entity.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmployeeId(String employeeId);
    Optional<User> findByContact(String contact);
    boolean existsByContact(String contact);
    boolean existsByEmployeeId(String employeeId);
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByNic(String nic);
    List<User> findByEstate_EstateId(UUID estateId);
    List<User> findByEstate_EstateIdAndRoleAndStatus(UUID estateId, UserRole role, UserStatus status);
}
