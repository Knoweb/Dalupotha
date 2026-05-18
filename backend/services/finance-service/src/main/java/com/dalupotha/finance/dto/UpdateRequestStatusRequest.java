package com.dalupotha.finance.dto;

import com.dalupotha.finance.model.RequestStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class UpdateRequestStatusRequest {

    @NotNull
    private RequestStatus status;
    private UUID approverId;
    @JsonProperty("approverComment")
    private String approverComment;
    private java.math.BigDecimal approvedAmount;

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public UUID getApproverId() { return approverId; }
    public void setApproverId(UUID approverId) { this.approverId = approverId; }

    public String getApproverComment() { return approverComment; }
    public void setApproverComment(String approverComment) { this.approverComment = approverComment; }

    @JsonProperty("amount")
    public java.math.BigDecimal getAmount() { return approvedAmount; }
    @JsonProperty("amount")
    public void setAmount(java.math.BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
}
