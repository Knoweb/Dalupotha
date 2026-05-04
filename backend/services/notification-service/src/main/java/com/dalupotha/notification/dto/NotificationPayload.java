package com.dalupotha.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationPayload {
    /** e.g. "new_collection", "service_request", "system" */
    private String type;
    private String title;
    private String message;
    private String timestamp;
    /** Target role: "manager", "factory-staff", or "*" for all */
    private String targetRole;
    /** Optional extra data */
    private Map<String, Object> meta;
}
