package com.dalupotha.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "leaf_price")
public class LeafPriceEntity {

    @Id
    @Column(name = "price_id")
    private UUID priceId;

    @Column(name = "price_per_kg", nullable = false)
    private BigDecimal pricePerKg;

    @Column(name = "effective_date")
    private OffsetDateTime effectiveDate;

    @Column(name = "is_active")
    private boolean isActive;

    @PrePersist
    public void onCreate() {
        if (priceId == null) priceId = UUID.randomUUID();
        if (effectiveDate == null) effectiveDate = OffsetDateTime.now();
    }

    public UUID getPriceId() { return priceId; }
    public void setPriceId(UUID priceId) { this.priceId = priceId; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }
    public OffsetDateTime getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(OffsetDateTime effectiveDate) { this.effectiveDate = effectiveDate; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
