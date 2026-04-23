package com.dalupotha.finance.service;

import com.dalupotha.finance.dto.CreateServiceRequestRequest;
import com.dalupotha.finance.dto.ServiceRequestResponse;
import com.dalupotha.finance.dto.SupplierLedgerResponse;
import com.dalupotha.finance.dto.UpdateRequestStatusRequest;
import com.dalupotha.finance.entity.FinancialLedgerEntity;
import com.dalupotha.finance.entity.ServiceRequestEntity;
import com.dalupotha.finance.model.LedgerStatus;
import com.dalupotha.finance.model.LedgerTransactionType;
import com.dalupotha.finance.model.RequestStatus;
import com.dalupotha.finance.model.RequestType;
import com.dalupotha.finance.repository.FinancialLedgerRepository;
import com.dalupotha.finance.repository.ServiceRequestRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class FinanceService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final FinancialLedgerRepository financialLedgerRepository;

    public FinanceService(ServiceRequestRepository serviceRequestRepository,
                          FinancialLedgerRepository financialLedgerRepository) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.financialLedgerRepository = financialLedgerRepository;
    }

    public ServiceRequestResponse createRequest(CreateServiceRequestRequest request) {
        ServiceRequestEntity entity = new ServiceRequestEntity();
        entity.setSupplierId(request.getSupplierId());
        entity.setCreatedById(request.getCreatedById());
        entity.setRequestType(request.getRequestType());
        entity.setItemId(request.getItemId());
        entity.setQuantity(request.getQuantity());
        entity.setRequestedAmount(request.getRequestedAmount());
        entity.setNotes(request.getNotes());
        entity.setSupplierName(request.getSupplierName());
        entity.setPassbookNo(request.getPassbookNo());
        entity.setStatus(RequestStatus.PENDING);

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);

        if (request.getRequestType() == RequestType.ADVANCE && request.getRequestedAmount() != null) {
            FinancialLedgerEntity ledger = new FinancialLedgerEntity();
            ledger.setSupplierId(request.getSupplierId());
            ledger.setTransactionType(LedgerTransactionType.ADVANCE);
            ledger.setAmount(request.getRequestedAmount());
            ledger.setDescription(request.getNotes());
            ledger.setStatus(LedgerStatus.PENDING);
            financialLedgerRepository.save(ledger);
        }

        return toResponse(saved);
    }

    public List<ServiceRequestResponse> getRequests(UUID createdById,
                                                    UUID supplierId,
                                                    RequestType requestType,
                                                    RequestStatus status,
                                                    Integer limit) {
        int pageSize = limit == null ? 100 : Math.min(Math.max(limit, 1), 300);
        return serviceRequestRepository.search(
                        createdById,
                        supplierId,
                        requestType,
                        status,
                        PageRequest.of(0, pageSize)
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ServiceRequestResponse updateRequestStatus(UUID requestId, UpdateRequestStatusRequest request) {
        ServiceRequestEntity entity = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Request not found"));

        entity.setStatus(request.getStatus());
        entity.setApproverId(request.getApproverId());
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            entity.setNotes(request.getNotes());
        }

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        return toResponse(saved);
    }

    public SupplierLedgerResponse getSupplierLedger(UUID supplierId) {
        List<FinancialLedgerEntity> entries = financialLedgerRepository.findBySupplierIdOrderByTransactionDateDesc(supplierId);

        BigDecimal currentDebt = entries.stream()
                .filter(e -> e.getTransactionType() == LedgerTransactionType.DEBT)
                .filter(e -> e.getStatus() == LedgerStatus.PENDING || e.getStatus() == LedgerStatus.APPROVED)
                .map(FinancialLedgerEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal advanceTaken = entries.stream()
                .filter(e -> e.getTransactionType() == LedgerTransactionType.ADVANCE)
                .filter(e -> e.getStatus() == LedgerStatus.PENDING || e.getStatus() == LedgerStatus.APPROVED)
                .map(FinancialLedgerEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal payoutTotal = entries.stream()
                .filter(e -> e.getTransactionType() == LedgerTransactionType.PAYOUT)
                .filter(e -> e.getStatus() == LedgerStatus.APPROVED || e.getStatus() == LedgerStatus.CLEARED)
                .map(FinancialLedgerEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal estimatedBalance = payoutTotal.subtract(currentDebt).subtract(advanceTaken);

        return new SupplierLedgerResponse(
                supplierId,
                currentDebt,
                advanceTaken,
                payoutTotal,
                estimatedBalance
        );
    }

    private ServiceRequestResponse toResponse(ServiceRequestEntity entity) {
        return new ServiceRequestResponse(
                entity.getRequestId(),
                entity.getSupplierId(),
                entity.getSupplierName(),
                entity.getPassbookNo(),
                entity.getCreatedById(),
                entity.getApproverId(),
                entity.getRequestType(),
                entity.getStatus(),
                entity.getQuantity(),
                entity.getRequestedAmount(),
                entity.getNotes(),
                entity.getRequestDate(),
                entity.getUpdatedAt()
        );
    }
}
