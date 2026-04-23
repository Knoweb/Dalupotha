package com.dalupotha.collection.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SupplierSummaryResponse(
        UUID supplierId,
        String fullName,
        String passbookNo,
        String landName,
        UUID estateId,
        BigDecimal arcs
) {
}
