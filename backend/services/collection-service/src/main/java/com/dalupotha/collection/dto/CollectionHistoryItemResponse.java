package com.dalupotha.collection.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CollectionHistoryItemResponse(
        UUID collectionId,
        UUID supplierId,
        String supplierName,
        String passbookNo,
        BigDecimal grossWeight,
        BigDecimal netWeight,
        @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", timezone = "UTC")
        java.time.Instant collectedAt,
        String syncStatus,
        String gpsStatus,
        boolean manualOverride
) {
}
