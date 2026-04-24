package com.dalupotha.finance.dto;

import com.dalupotha.finance.model.RequestType;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class CreateServiceRequestRequest {

    @NotNull
    private UUID supplierId;

    @NotNull
    private UUID createdById;

    @NotNull
    private RequestType requestType;

    private UUID itemId;
    private Integer quantity;
    private BigDecimal requestedAmount;
    private String notes;
    private String itemType;
    private String itemDetails;
    private String supplierName;
    private String passbookNo;
    private String creatorName;
    private String creatorId;

    public CreateServiceRequestRequest() {}

    public CreateServiceRequestRequest(UUID supplierId, UUID createdById, RequestType requestType) {
        this.supplierId = supplierId;
        this.createdById = createdById;
        this.requestType = requestType;
    }

    public UUID getSupplierId() { return supplierId; }
    public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }

    public UUID getCreatedById() { return createdById; }
    public void setCreatedById(UUID createdById) { this.createdById = createdById; }

    public RequestType getRequestType() { return requestType; }
    public void setRequestType(RequestType requestType) { this.requestType = requestType; }

    public UUID getItemId() { return itemId; }
    public void setItemId(UUID itemId) { this.itemId = itemId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public String getItemDetails() { return itemDetails; }
    public void setItemDetails(String itemDetails) { this.itemDetails = itemDetails; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getPassbookNo() { return passbookNo; }
    public void setPassbookNo(String passbookNo) { this.passbookNo = passbookNo; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public String getCreatorId() { return creatorId; }
    public void setCreatorId(String creatorId) { this.creatorId = creatorId; }
}
