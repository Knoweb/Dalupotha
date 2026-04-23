package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.SmallHolder;
import com.dalupotha.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SmallHolderRepository extends JpaRepository<SmallHolder, UUID> {
    Optional<SmallHolder> findByUser_UserId(UUID userId);
    Optional<SmallHolder> findByUser(User user);
    Optional<SmallHolder> findByPassbookNo(String passbookNo);
    Optional<SmallHolder> findByPassbookNoIgnoreCase(String passbookNo);
    boolean existsByPassbookNo(String passbookNo);

    @org.springframework.data.jpa.repository.Query("""
        SELECT sh FROM SmallHolder sh
        JOIN sh.user u
        WHERE (:estateId IS NULL OR sh.estate.estateId = :estateId)
        AND (:hasSearch = false OR (
            LOWER(u.fullName) LIKE LOWER(:search)
            OR LOWER(sh.passbookNo) LIKE LOWER(:search)
        ))
        ORDER BY u.fullName ASC
    """)
    List<SmallHolder> searchSuppliers(
            @org.springframework.data.repository.query.Param("estateId") UUID estateId,
            @org.springframework.data.repository.query.Param("hasSearch") boolean hasSearch,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );
}
