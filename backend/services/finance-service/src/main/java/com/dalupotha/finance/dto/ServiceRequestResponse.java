package com.dalupotha.finance.dto;

import com.dalupotha.finance.model.RequestStatus;
import com.dalupotha.finance.model.RequestType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ServiceRequestResponse(
        UUID requestId,
        UUID supplierId,
        String supplierName,
        String passbookNo,
        UUID createdById,
        UUID approverId,
        RequestType requestType,
        RequestStatus status,
        Integer quantity,
        BigDecimal requestedAmount,
        String itemType,
        String itemDetails,
        String creatorName,
        String creatorId,
        String notes,
        OffsetDateTime requestDate,
        OffsetDateTime updatedAt
) {
}
