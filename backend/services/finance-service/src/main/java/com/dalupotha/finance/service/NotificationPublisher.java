package com.dalupotha.finance.service;

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

    private final RestTemplate restTemplate = new RestTemplate();
    private final String notificationServiceUrl;

    public NotificationPublisher(
            @Value("${dalupotha.notification-url:http://notification-service:8085}") String notificationServiceUrl
    ) {
        this.notificationServiceUrl = notificationServiceUrl;
    }

    /**
     * Publishes a "service_request" notification when a new request is created.
     */
    @Async
    public void publishRequestCreated(String supplierName, String requestType, String amountOrQty, String requestId, java.util.UUID estateId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "service_request");
            payload.put("title", "New Service Request");
            payload.put("message", "New " + requestType + " request from " + supplierName + " (" + amountOrQty + ")");
            payload.put("timestamp", Instant.now().toString());
            payload.put("targetRole", "manager"); // Notify managers and extension officers

            Map<String, Object> meta = new HashMap<>();
            meta.put("requestId", requestId);
            meta.put("supplierName", supplierName);
            meta.put("requestType", requestType);
            if (estateId != null) {
                meta.put("estateId", estateId.toString());
            }
            payload.put("meta", meta);

            send(payload);
        } catch (Exception e) {
            log.warn("Failed to publish request notification: {}", e.getMessage());
        }
    }

    /**
     * Publishes a notification when a request status is updated (Approved/Rejected/Dispatched).
     */
    @Async
    public void publishRequestStatusUpdate(String supplierName, String requestType, String status, String requestId, String targetRole, java.util.UUID estateId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "service_request");
            payload.put("title", "Request " + status);
            payload.put("message", "Request for " + requestType + " (" + supplierName + ") has been " + status.toLowerCase());
            payload.put("timestamp", Instant.now().toString());
            payload.put("targetRole", targetRole); // Notify targeted user or everyone

            Map<String, Object> meta = new HashMap<>();
            meta.put("requestId", requestId);
            meta.put("status", status);
            if (estateId != null) {
                meta.put("estateId", estateId.toString());
            }
            payload.put("meta", meta);

            send(payload);
        } catch (Exception e) {
            log.warn("Failed to publish status update notification: {}", e.getMessage());
        }
    }

    private void send(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity(
                notificationServiceUrl + "/api/notifications/publish",
                request,
                Void.class
        );
        log.info("Notification published: type={}, title={}", payload.get("type"), payload.get("title"));
    }
}
