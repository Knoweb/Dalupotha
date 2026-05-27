package com.dalupotha.finance.controller;

import com.dalupotha.finance.dto.CreateServiceRequestRequest;
import com.dalupotha.finance.dto.LedgerTransactionResponse;
import com.dalupotha.finance.dto.ServiceRequestResponse;
import com.dalupotha.finance.dto.SupplierLedgerResponse;
import com.dalupotha.finance.dto.UpdateRequestStatusRequest;
import com.dalupotha.finance.model.RequestStatus;
import com.dalupotha.finance.model.RequestType;
import com.dalupotha.finance.service.FinanceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/api/finance/ledger/{supplierId}")
    public SupplierLedgerResponse getLedger(@PathVariable UUID supplierId) {
        return financeService.getSupplierLedger(supplierId);
    }

    @GetMapping("/api/finance/ledger/{supplierId}/transactions")
    public List<LedgerTransactionResponse> getLedgerTransactions(@PathVariable UUID supplierId) {
        return financeService.getLedgerTransactions(supplierId);
    }

    @PostMapping("/api/finance/advance-request")
    public ServiceRequestResponse createAdvanceRequest(@Valid @RequestBody CreateServiceRequestRequest request) {
        request.setRequestType(RequestType.ADVANCE);
        return financeService.createRequest(request);
    }

    @PostMapping("/api/services/request")
    public ServiceRequestResponse createRequest(@Valid @RequestBody CreateServiceRequestRequest request) {
        return financeService.createRequest(request);
    }

    @GetMapping("/api/services/request")
    public List<ServiceRequestResponse> getRequests(
            @RequestParam(required = false) UUID createdById,
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(required = false) UUID assignedAgentId,
            @RequestParam(required = false) RequestType requestType,
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) UUID estateId,
            @RequestParam(required = false) Integer limit
    ) {
        return financeService.getRequests(createdById, supplierId, null, requestType, status, assignedAgentId, estateId, limit);
    }

    @PatchMapping("/api/services/request/{requestId}/status")
    public ServiceRequestResponse updateRequestStatus(
            @PathVariable UUID requestId,
            @Valid @RequestBody UpdateRequestStatusRequest request
    ) {
        return financeService.updateRequestStatus(requestId, request);
    }

    // ── Configuration Endpoints ─────────────────────────────────────
    @GetMapping("/api/finance/leaf-price")
    public java.util.Map<String, Object> getLeafPrice(@RequestParam(required = false) UUID estateId) {
        return financeService.getCurrentLeafPrice(estateId);
    }

    @PostMapping("/api/finance/leaf-price")
    public java.util.Map<String, Object> setLeafPrice(
            @RequestBody com.dalupotha.finance.dto.LeafPriceRequest request,
            @RequestParam(required = false) UUID estateId
    ) {
        return financeService.setLeafPrice(request.pricePerKg(), estateId);
    }

    @GetMapping("/api/finance/advance-limit")
    public java.util.Map<String, Object> getAdvanceLimit(@RequestParam(required = false) UUID estateId) {
        return financeService.getAdvanceLimit(estateId);
    }

    @PostMapping("/api/finance/advance-limit")
    public java.util.Map<String, Object> setAdvanceLimit(
            @RequestBody com.dalupotha.finance.dto.AdvanceLimitRequest request,
            @RequestParam(required = false) UUID estateId
    ) {
        return financeService.setAdvanceLimit(request.advanceLimit(), estateId);
    }

    @PostMapping("/api/finance/payout")
    public LedgerTransactionResponse processPayout(@Valid @RequestBody com.dalupotha.finance.dto.ProcessPayoutRequest request) {
        return financeService.processPayout(
                request.getSupplierId(),
                request.getAmount(),
                request.getRequesterId(),
                request.getDescription(),
                request.isImmediate()
        );
    }

    @PostMapping("/api/finance/payout/bulk")
    public void processBulkPayout(
            @RequestParam List<UUID> supplierIds,
            @RequestParam UUID requesterId,
            @RequestParam(required = false, defaultValue = "false") boolean immediate
    ) {
        financeService.bulkProcessPayouts(supplierIds, requesterId, immediate);
    }
}
