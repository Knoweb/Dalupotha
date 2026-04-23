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
    private String supplierName;
    private String passbookNo;

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

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getPassbookNo() { return passbookNo; }
    public void setPassbookNo(String passbookNo) { this.passbookNo = passbookNo; }
}
