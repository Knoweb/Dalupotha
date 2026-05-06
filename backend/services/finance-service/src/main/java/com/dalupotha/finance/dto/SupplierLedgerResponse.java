package com.dalupotha.finance.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SupplierLedgerResponse(
        UUID supplierId,
        BigDecimal currentDebt,
        BigDecimal advanceTaken,
        BigDecimal payoutTotal,
        BigDecimal estimatedBalance,
        BigDecimal totalNetWeight,
        BigDecimal leafPrice,
        BigDecimal grossEarnings
) {
}
