package com.dalupotha.inventory.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory")
public class InventoryItem {

    @Id
    @Column(name = "item_id")
    private UUID itemId;

    @Column(name = "item_category", nullable = false)
    private String itemCategory; // FERTILIZER, LEAF_BAG, TOOLS

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "quantity_in_stock")
    private BigDecimal quantityInStock;

    @Column(name = "reserved_quantity")
    private BigDecimal reservedQuantity;

    @Column(name = "reorder_level")
    private BigDecimal reorderLevel;

    @Column(name = "unit")
    private String unit;

    @Column(name = "unit_cost", precision = 10, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Column(name = "estate_id")
    private UUID estateId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (itemId == null) itemId = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (lastUpdated == null) lastUpdated = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }
    public String getItemCategory() { return itemCategory; }
    public void setItemCategory(String itemCategory) { this.itemCategory = itemCategory; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public BigDecimal getQuantityInStock() { return quantityInStock; }
    public void setQuantityInStock(BigDecimal quantityInStock) { this.quantityInStock = quantityInStock; }
    public BigDecimal getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(BigDecimal reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public BigDecimal getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(BigDecimal reorderLevel) { this.reorderLevel = reorderLevel; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public UUID getEstateId() { return estateId; }
    public void setEstateId(UUID estateId) { this.estateId = estateId; }
}
