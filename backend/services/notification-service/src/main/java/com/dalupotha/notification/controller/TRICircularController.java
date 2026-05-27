package com.dalupotha.notification.controller;

import com.dalupotha.notification.dto.TRICircularDTO;
import com.dalupotha.notification.entity.TRICircular;
import com.dalupotha.notification.repository.TRICircularRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/notifications/tri-circulars")
@RequiredArgsConstructor
public class TRICircularController {

    private final TRICircularRepository triCircularRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy");

    /**
     * GET /api/notifications/tri-circulars
     * Fetch all active TRI circulars (for mobile app suppliers)
     */
    @GetMapping
    public ResponseEntity<List<TRICircularDTO>> getAllCirculars(
            @RequestParam(required = false) String audience) {
        try {
            List<TRICircular> circulars;
            if (audience != null && !audience.isEmpty()) {
                circulars = triCircularRepository.findByTargetAudienceAndIsActiveTrueOrderByPublishedDateDesc(audience);
            } else {
                circulars = triCircularRepository.findByIsActiveTrueOrderByPublishedDateDesc();
            }

            List<TRICircularDTO> dtos = circulars.stream()
                    .map(this::entityToDTO)
                    .collect(Collectors.toList());

            log.info("Fetched {} TRI circulars", dtos.size());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("Error fetching TRI circulars", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/notifications/tri-circulars/{id}
     * Fetch single circular by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<TRICircularDTO> getCircularById(@PathVariable UUID id) {
        try {
            return triCircularRepository.findById(id)
                    .map(circular -> ResponseEntity.ok(entityToDTO(circular)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching circular {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/notifications/tri-circulars
     * Create/distribute a new TRI circular (from manager dashboard)
     */
    @PostMapping
    public ResponseEntity<TRICircularDTO> createCircular(
            @RequestBody CreateTRICircularRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID publishedByUserId) {
        try {
            if (request.getTitle() == null || request.getTitle().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            if (request.getId() != null && !request.getId().isEmpty() && triCircularRepository.existsByDisplayIdAndIsActiveTrue(request.getId())) {
                log.warn("Circular with display ID {} already exists. Rejecting duplicate.", request.getId());
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }

            TRICircular circular = TRICircular.builder()
                    .displayId(request.getId())
                    .title(request.getTitle())
                    .contentUrl(request.getUrl() != null ? request.getUrl() : request.getContentUrl())
                    .targetAudience(request.getTargetAudience() != null ? request.getTargetAudience() : "ALL")
                    .publishedById(publishedByUserId)
                    .isActive(true)
                    .build();

            TRICircular saved = triCircularRepository.save(circular);
            log.info("Created TRI circular [{}] by user {}", saved.getCircularId(), publishedByUserId);

            return ResponseEntity.status(HttpStatus.CREATED).body(entityToDTO(saved));
        } catch (Exception e) {
            log.error("Error creating TRI circular", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * PUT /api/notifications/tri-circulars/{id}
     * Update a circular
     */
    @PutMapping("/{id}")
    public ResponseEntity<TRICircularDTO> updateCircular(
            @PathVariable UUID id,
            @RequestBody CreateTRICircularRequest request) {
        try {
            return triCircularRepository.findById(id)
                    .map(circular -> {
                        if (request.getTitle() != null) circular.setTitle(request.getTitle());
                        if (request.getUrl() != null) circular.setContentUrl(request.getUrl());
                        if (request.getTargetAudience() != null) circular.setTargetAudience(request.getTargetAudience());
                        
                        TRICircular updated = triCircularRepository.save(circular);
                        log.info("Updated TRI circular [{}]", id);
                        return ResponseEntity.ok(entityToDTO(updated));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error updating TRI circular {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * DELETE /api/notifications/tri-circulars/{id}
     * Soft delete (mark inactive)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCircular(@PathVariable UUID id) {
        try {
            return triCircularRepository.findById(id)
                    .map(circular -> {
                        circular.setIsActive(false);
                        triCircularRepository.save(circular);
                        log.info("Deactivated TRI circular [{}]", id);
                        return ResponseEntity.noContent().<Void>build();
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error deleting TRI circular {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Convert entity to DTO with formatted date
     */
    private TRICircularDTO entityToDTO(TRICircular circular) {
        String formattedDate = circular.getPublishedDate() != null 
                ? circular.getPublishedDate().format(DATE_FORMATTER)
                : "";

        return TRICircularDTO.builder()
                .circularId(circular.getCircularId())
                .id(circular.getDisplayId()) // Map displayId to DTO id
                .title(circular.getTitle())
                .contentUrl(circular.getContentUrl())
                .url(circular.getContentUrl()) // Alias for compatibility
                .publishedDate(circular.getPublishedDate())
                .date(formattedDate) // Formatted date for UI
                .targetAudience(circular.getTargetAudience())
                .publishedById(circular.getPublishedById())
                .isActive(circular.getIsActive())
                .build();
    }

    public static class CreateTRICircularRequest {
        private String id;              // Circular ID (e.g., "LU 01") — for UI display only
        private String title;
        private String url;             // Content URL
        private String contentUrl;      // Alias for url
        private String targetAudience; // ALL, SMALL_HOLDERS, MANAGEMENT

        public CreateTRICircularRequest() {}

        public CreateTRICircularRequest(String id, String title, String url, String contentUrl, String targetAudience) {
            this.id = id;
            this.title = title;
            this.url = url;
            this.contentUrl = contentUrl;
            this.targetAudience = targetAudience;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }

        public String getContentUrl() { return contentUrl; }
        public void setContentUrl(String contentUrl) { this.contentUrl = contentUrl; }

        public String getTargetAudience() { return targetAudience; }
        public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }
    }
}
