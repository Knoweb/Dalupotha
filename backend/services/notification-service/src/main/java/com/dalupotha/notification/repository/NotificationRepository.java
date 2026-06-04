package com.dalupotha.notification.repository;

import com.dalupotha.notification.entity.NotificationAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationAlert, UUID> {

    @Query("SELECT n FROM NotificationAlert n WHERE n.isDismissed = false " +
           "AND (n.estateId IS NULL OR n.estateId = :estateId) " +
           "AND (n.targetRole = '*' OR n.targetRole = :targetRole) " +
           "ORDER BY n.timestamp DESC")
    List<NotificationAlert> findActiveNotifications(
            @Param("estateId") UUID estateId,
            @Param("targetRole") String targetRole
    );
}
