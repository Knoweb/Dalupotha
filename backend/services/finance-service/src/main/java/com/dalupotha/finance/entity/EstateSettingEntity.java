package com.dalupotha.finance.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Simple key-value settings store for estate-level configuration
 * (e.g. advance_limit, factory_name).
 */
@Entity
@Table(name = "estate_settings")
public class EstateSettingEntity {

    @Id
    @Column(name = "setting_id")
    private UUID settingId;

    @Column(name = "setting_key", nullable = false)
    private String settingKey;

    @Column(name = "setting_value", nullable = false)
    private String settingValue;

    @Column(name = "estate_id")
    private UUID estateId;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        if (settingId == null) settingId = UUID.randomUUID();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getSettingId() { return settingId; }
    public void setSettingId(UUID settingId) { this.settingId = settingId; }
    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }
    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public UUID getEstateId() { return estateId; }
    public void setEstateId(UUID estateId) { this.estateId = estateId; }
}
