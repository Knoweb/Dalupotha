package com.dalupotha.collection.repository;

import com.dalupotha.collection.entity.AppUser;
import com.dalupotha.collection.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUserIdAndRole(UUID userId, UserRole role);
}
