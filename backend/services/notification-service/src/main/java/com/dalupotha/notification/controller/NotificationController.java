package com.dalupotha.notification.controller;

import com.dalupotha.notification.dto.NotificationPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * REST endpoint called by other microservices (e.g. collection-service)
     * to publish a notification to all connected WebSocket clients.
     */
    @PostMapping("/publish")
    public ResponseEntity<Map<String, String>> publish(@RequestBody NotificationPayload payload) {
        if (payload.getTimestamp() == null) {
            payload.setTimestamp(Instant.now().toString());
        }

        // Broadcast to all subscribers on /topic/notifications
        messagingTemplate.convertAndSend("/topic/notifications", payload);

        // If there's a specific role target, also broadcast on the role-specific topic
        if (payload.getTargetRole() != null && !payload.getTargetRole().equals("*")) {
            messagingTemplate.convertAndSend("/topic/notifications/" + payload.getTargetRole(), payload);
        }

        log.info("Published notification [{}] → target={}", payload.getType(), payload.getTargetRole());
        return ResponseEntity.ok(Map.of("status", "published"));
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "notification-service", "status", "UP");
    }
}
