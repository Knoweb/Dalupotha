package com.dalupotha.finance.dto;

import com.dalupotha.finance.model.LedgerStatus;
import com.dalupotha.finance.model.LedgerTransactionType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LedgerTransactionResponse(
        UUID transactionId,
        UUID supplierId,
        UUID approverId,
        LedgerTransactionType transactionType,
        BigDecimal amount,
        BigDecimal grossAmount,
        BigDecimal deductions,
        BigDecimal remaining,
        String description,
        OffsetDateTime transactionDate,
        LedgerStatus status
) {
}
