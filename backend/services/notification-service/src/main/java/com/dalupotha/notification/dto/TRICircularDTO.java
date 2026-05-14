package com.dalupotha.notification.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TRICircularDTO {
    private UUID circularId;
    private String id;           // For web UI (e.g., "LU 01")
    private String title;
    private String contentUrl;
    private String url;          // Alias for contentUrl (for mobile/web compatibility)
    private LocalDateTime publishedDate;
    private String date;         // Formatted date for display
    private String targetAudience;
    private UUID publishedById;
    private Boolean isActive;
}
