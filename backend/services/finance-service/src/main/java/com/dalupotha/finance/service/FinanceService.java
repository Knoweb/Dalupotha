package com.dalupotha.finance.service;

import com.dalupotha.finance.dto.CreateServiceRequestRequest;
import com.dalupotha.finance.dto.ServiceRequestResponse;
import com.dalupotha.finance.dto.SupplierLedgerResponse;
import com.dalupotha.finance.dto.UpdateRequestStatusRequest;
import com.dalupotha.finance.dto.LedgerTransactionResponse;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Slf4j
@Service
public class FinanceService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final FinancialLedgerRepository financialLedgerRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<UUID, UserIdentity> identityCache = new ConcurrentHashMap<>();

    @Value("${dalupotha.services.auth-url}")
    private String authServiceUrl;

    public FinanceService(ServiceRequestRepository serviceRequestRepository,
                          FinancialLedgerRepository financialLedgerRepository) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.financialLedgerRepository = financialLedgerRepository;
    }

    public ServiceRequestResponse createRequest(CreateServiceRequestRequest request) {
        log.info("CREATING REQUEST: Category: {}, Creator: {}, Supplier: {}, ItemType: {}", 
            request.getRequestType(), request.getCreatedById(), request.getSupplierName(), request.getItemType());

        ServiceRequestEntity entity = new ServiceRequestEntity();
        entity.setSupplierId(request.getSupplierId());
        entity.setCreatedById(request.getCreatedById());
        entity.setRequestType(request.getRequestType());
        entity.setItemId(request.getItemId());
        entity.setQuantity(request.getQuantity());
        entity.setRequestedAmount(request.getRequestedAmount());
        entity.setNotes(request.getNotes());
        entity.setItemType(request.getItemType());
        entity.setItemDetails(request.getItemDetails());
        entity.setSupplierName(request.getSupplierName());
        entity.setPassbookNo(request.getPassbookNo());
        entity.setStatus(RequestStatus.PENDING);

        // Fetch identity from Auth Service if not provided
        String name = request.getCreatorName();
        String id = request.getCreatorId();
        
        if (name == null || name.isBlank() || id == null || id.isBlank()) {
            UserIdentity identity = fetchUserIdentity(request.getCreatedById());
            if (identity != null) {
                name = identity.fullName();
                id = identity.employeeId();
            }
        }
        
        entity.setCreatorName(name);
        entity.setCreatorId(id);

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
        if (request.getApproverComment() != null && !request.getApproverComment().isBlank()) {
            entity.setApproverComment(request.getApproverComment());
        }

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);
        return toResponse(saved);
    }

    public List<LedgerTransactionResponse> getLedgerTransactions(UUID supplierId) {
        return financialLedgerRepository.findBySupplierIdOrderByTransactionDateDesc(supplierId)
                .stream()
                .map(this::toLedgerTransactionResponse)
                .collect(Collectors.toList());
    }

    private LedgerTransactionResponse toLedgerTransactionResponse(FinancialLedgerEntity entity) {
        return new LedgerTransactionResponse(
                entity.getTransactionId(),
                entity.getSupplierId(),
                entity.getApproverId(),
                entity.getTransactionType(),
                entity.getAmount(),
                entity.getGrossAmount(),
                entity.getDeductions(),
                entity.getRemaining(),
                entity.getDescription(),
                entity.getTransactionDate(),
                entity.getStatus()
        );
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

    private UserIdentity fetchUserIdentity(UUID userId) {
        if (userId == null) return null;
        if (identityCache.containsKey(userId)) return identityCache.get(userId);
        
        String url = authServiceUrl + "/api/auth/users/" + userId;
        log.info("Attempting identity lookup for user {} at URL: {}", userId, url);
        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.get("fullName") != null) {
                UserIdentity identity = new UserIdentity(
                    (String) response.get("fullName"),
                    (String) response.get("employeeId")
                );
                log.info("Successfully fetched identity for {}: Name={}, ID={}", 
                    userId, identity.fullName(), identity.employeeId());
                identityCache.put(userId, identity);
                return identity;
            } else {
                log.warn("Auth Service returned empty or invalid identity for {}", userId);
            }
        } catch (Exception e) {
            log.error("Failed to fetch user identity from {}: {}", url, e.getMessage());
        }
        return null;
    }

    private ServiceRequestResponse toResponse(ServiceRequestEntity entity) {
        String name = entity.getCreatorName();
        String id = entity.getCreatorId();
        
        // Enrich old requests if identity is missing
        if ((name == null || name.isBlank()) && entity.getCreatedById() != null) {
            UserIdentity identity = fetchUserIdentity(entity.getCreatedById());
            if (identity != null) {
                name = identity.fullName();
                id = identity.employeeId();
            }
        }

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
                entity.getItemType(),
                entity.getItemDetails(),
                name,
                id,
                entity.getNotes(),
                entity.getApproverComment(),
                entity.getRequestDate(),
                entity.getUpdatedAt()
        );
    }

    private record UserIdentity(String fullName, String employeeId) {}
}
