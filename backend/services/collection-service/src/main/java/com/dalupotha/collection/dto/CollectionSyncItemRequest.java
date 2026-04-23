package com.dalupotha.collection.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class CollectionSyncItemRequest {

    private String clientRef;

    @NotNull
    private UUID supplierId;

    @NotNull
    private UUID transportAgentId;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal grossWeight;

    private BigDecimal netWeight;
    private BigDecimal gpsLat;
    private BigDecimal gpsLong;
    private String gpsStatus;
    private Boolean manualOverride;
    private String overrideReason;
    private String supplierName;
    private String passbookNo;
    private String transportAgentName;
    private OffsetDateTime collectedAt;

    public String getClientRef() {
        return clientRef;
    }

    public void setClientRef(String clientRef) {
        this.clientRef = clientRef;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(UUID supplierId) {
        this.supplierId = supplierId;
    }

    public UUID getTransportAgentId() {
        return transportAgentId;
    }

    public void setTransportAgentId(UUID transportAgentId) {
        this.transportAgentId = transportAgentId;
    }

    public BigDecimal getGrossWeight() {
        return grossWeight;
    }

    public void setGrossWeight(BigDecimal grossWeight) {
        this.grossWeight = grossWeight;
    }

    public BigDecimal getNetWeight() {
        return netWeight;
    }

    public void setNetWeight(BigDecimal netWeight) {
        this.netWeight = netWeight;
    }

    public BigDecimal getGpsLat() {
        return gpsLat;
    }

    public void setGpsLat(BigDecimal gpsLat) {
        this.gpsLat = gpsLat;
    }

    public BigDecimal getGpsLong() {
        return gpsLong;
    }

    public void setGpsLong(BigDecimal gpsLong) {
        this.gpsLong = gpsLong;
    }

    public String getGpsStatus() {
        return gpsStatus;
    }

    public void setGpsStatus(String gpsStatus) {
        this.gpsStatus = gpsStatus;
    }

    public Boolean getManualOverride() {
        return manualOverride;
    }

    public void setManualOverride(Boolean manualOverride) {
        this.manualOverride = manualOverride;
    }

    public String getOverrideReason() {
        return overrideReason;
    }

    public void setOverrideReason(String overrideReason) {
        this.overrideReason = overrideReason;
    }

    public OffsetDateTime getCollectedAt() {
        return collectedAt;
    }

    public void setCollectedAt(OffsetDateTime collectedAt) {
        this.collectedAt = collectedAt;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getPassbookNo() {
        return passbookNo;
    }

    public void setPassbookNo(String passbookNo) {
        this.passbookNo = passbookNo;
    }

    public String getTransportAgentName() {
        return transportAgentName;
    }

    public void setTransportAgentName(String transportAgentName) {
        this.transportAgentName = transportAgentName;
    }
}
