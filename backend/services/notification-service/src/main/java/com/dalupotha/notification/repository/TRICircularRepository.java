package com.dalupotha.notification.repository;

import com.dalupotha.notification.entity.TRICircular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TRICircularRepository extends JpaRepository<TRICircular, UUID> {
    List<TRICircular> findByIsActiveTrueOrderByPublishedDateDesc();
    List<TRICircular> findByTargetAudienceAndIsActiveTrueOrderByPublishedDateDesc(String targetAudience);
    boolean existsByDisplayIdAndIsActiveTrue(String displayId);
}
