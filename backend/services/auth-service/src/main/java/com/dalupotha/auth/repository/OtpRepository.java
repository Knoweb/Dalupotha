package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpRepository extends JpaRepository<OtpCode, UUID> {

    Optional<OtpCode> findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String contact, LocalDateTime now);

    @Modifying
    @Query("UPDATE OtpCode o SET o.isUsed = true WHERE o.contact = :contact AND o.isUsed = false")
    void invalidateAllForContact(String contact);
}
