package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.SmallHolder;
import com.dalupotha.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SmallHolderRepository extends JpaRepository<SmallHolder, UUID> {
    Optional<SmallHolder> findByUser_UserId(UUID userId);
    Optional<SmallHolder> findByUser(User user);
    Optional<SmallHolder> findByPassbookNo(String passbookNo);
    boolean existsByPassbookNo(String passbookNo);
}
