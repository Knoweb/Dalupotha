package com.dalupotha.finance.dto;

import com.dalupotha.finance.model.RequestStatus;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class UpdateRequestStatusRequest {

    @NotNull
    private RequestStatus status;
    private UUID approverId;
    private String notes;

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public UUID getApproverId() { return approverId; }
    public void setApproverId(UUID approverId) { this.approverId = approverId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
