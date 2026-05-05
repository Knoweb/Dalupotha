package com.dalupotha.collection.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final RestTemplate restTemplate;
    private final String notificationServiceUrl;

    public NotificationPublisher(
            RestTemplate restTemplate,
            @Value("${dalupotha.notification-url:http://notification-service:8085}") String notificationServiceUrl
    ) {
        this.restTemplate = restTemplate;
        this.notificationServiceUrl = notificationServiceUrl;
    }

    /**
     * Fire-and-forget: publishes a "new collection synced" notification.
     * Runs asynchronously so it never blocks the sync response.
     */
    @Async
    public void publishCollectionSynced(String supplierName, Object grossWeight, String agentName, String collectionId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "new_collection");
            payload.put("title", "New Collection Synced");
            payload.put("message", supplierName + " — " + grossWeight + " kg (Agent: " + agentName + ")");
            payload.put("timestamp", Instant.now().toString());
            payload.put("targetRole", "*");

            Map<String, Object> meta = new HashMap<>();
            meta.put("collectionId", collectionId);
            meta.put("supplierName", supplierName);
            meta.put("grossWeight", grossWeight);
            meta.put("agentName", agentName);
            payload.put("meta", meta);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(
                    notificationServiceUrl + "/api/notifications/publish",
                    request,
                    Void.class
            );
            log.debug("Notification published for collection sync: supplier={}", supplierName);
        } catch (Exception e) {
            log.warn("Failed to publish notification to notification-service: {}", e.getMessage());
        }
    }
}
