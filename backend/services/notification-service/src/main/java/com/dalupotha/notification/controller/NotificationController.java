package com.dalupotha.notification.controller;

import com.dalupotha.notification.dto.NotificationPayload;
import com.dalupotha.notification.entity.NotificationAlert;
import com.dalupotha.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    /**
     * REST endpoint called by other microservices (e.g. collection-service)
     * to publish a notification, persist it, and broadcast to all connected WebSocket clients.
     */
    @PostMapping("/publish")
    @Transactional
    public ResponseEntity<Map<String, String>> publish(@RequestBody NotificationPayload payload) {
        if (payload.getTimestamp() == null) {
            payload.setTimestamp(Instant.now().toString());
        }

        // 1. Persist to database
        UUID notificationId = UUID.randomUUID();
        UUID estateId = null;

        if (payload.getMeta() != null && payload.getMeta().containsKey("estateId")) {
            try {
                Object eid = payload.getMeta().get("estateId");
                if (eid != null) {
                    estateId = UUID.fromString(eid.toString());
                }
            } catch (Exception e) {
                log.warn("Invalid estateId format in metadata: {}", payload.getMeta().get("estateId"));
            }
        }

        NotificationAlert alert = NotificationAlert.builder()
                .id(notificationId)
                .type(payload.getType() != null ? payload.getType() : "system")
                .title(payload.getTitle())
                .message(payload.getMessage())
                .timestamp(payload.getTimestamp())
                .targetRole(payload.getTargetRole() != null ? payload.getTargetRole() : "*")
                .estateId(estateId)
                .isRead(false)
                .isDismissed(false)
                .build();

        notificationRepository.save(alert);
        log.info("Persisted notification: {}", notificationId);

        // Put the ID in the payload's metadata so the client knows how to dismiss it on the DB
        Map<String, Object> newMeta = payload.getMeta() != null ? new HashMap<>(payload.getMeta()) : new HashMap<>();
        newMeta.put("dbId", notificationId.toString());
        payload.setMeta(newMeta);

        // 2. Broadcast to all subscribers on /topic/notifications
        messagingTemplate.convertAndSend("/topic/notifications", payload);

        // If there's a specific role target, also broadcast on the role-specific topic
        if (payload.getTargetRole() != null && !payload.getTargetRole().equals("*")) {
            messagingTemplate.convertAndSend("/topic/notifications/" + payload.getTargetRole(), payload);
        }

        log.info("Published notification [{}] → target={}", payload.getType(), payload.getTargetRole());
        return ResponseEntity.ok(Map.of("status", "published", "id", notificationId.toString()));
    }

    /**
     * Fetch active (undismissed) alerts for a given estate and role.
     */
    @GetMapping("/active")
    public ResponseEntity<List<NotificationAlert>> getActive(
            @RequestParam(value = "estateId", required = false) String estateIdStr,
            @RequestParam(value = "role", required = false) String role) {

        UUID estateId = null;
        if (estateIdStr != null && !estateIdStr.trim().isEmpty() && !estateIdStr.equals("null")) {
            try {
                estateId = UUID.fromString(estateIdStr);
            } catch (Exception ignored) {}
        }

        String targetRole = (role != null) ? role : "*";
        List<NotificationAlert> alerts = notificationRepository.findActiveNotifications(estateId, targetRole);
        return ResponseEntity.ok(alerts);
    }

    /**
     * Mark a specific notification as dismissed.
     */
    @PostMapping("/{id}/dismiss")
    @Transactional
    public ResponseEntity<Map<String, String>> dismiss(@PathVariable("id") UUID id) {
        Optional<NotificationAlert> optionalAlert = notificationRepository.findById(id);
        if (optionalAlert.isPresent()) {
            NotificationAlert alert = optionalAlert.get();
            alert.setIsDismissed(true);
            alert.setIsRead(true);
            notificationRepository.save(alert);
            log.info("Dismissed notification: {}", id);
            return ResponseEntity.ok(Map.of("status", "dismissed"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "notification-service", "status", "UP");
    }
}

