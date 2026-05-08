package com.dalupotha.finance.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProcessPayoutRequest {
    @NotNull
    private UUID supplierId;
    @NotNull
    private BigDecimal amount;
    @NotNull
    private UUID requesterId;
    private String description;
    private boolean immediate;
}
