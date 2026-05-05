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
import com.dalupotha.finance.repository.LeafPriceRepository;
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

    @Value("${dalupotha.services.collection-url}")
    private String collectionServiceUrl;

    @Value("${dalupotha.services.inventory-url}")
    private String inventoryServiceUrl;

    private final LeafPriceRepository leafPriceRepository;
    private final NotificationPublisher notificationPublisher;

    public FinanceService(ServiceRequestRepository serviceRequestRepository,
                          FinancialLedgerRepository financialLedgerRepository,
                          LeafPriceRepository leafPriceRepository,
                          NotificationPublisher notificationPublisher) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.financialLedgerRepository = financialLedgerRepository;
        this.leafPriceRepository = leafPriceRepository;
        this.notificationPublisher = notificationPublisher;
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

        // Automatically generate ledger entries for financial impact
        if (request.getRequestedAmount() != null) {
            LedgerTransactionType transactionType = LedgerTransactionType.DEBT;
            
            if (request.getRequestType() == RequestType.ADVANCE) {
                transactionType = LedgerTransactionType.ADVANCE;
            }

            FinancialLedgerEntity ledger = new FinancialLedgerEntity();
            ledger.setSupplierId(request.getSupplierId());
            ledger.setTransactionType(transactionType);
            ledger.setAmount(request.getRequestedAmount());
            ledger.setRequestId(saved.getRequestId());
            ledger.setDescription(request.getRequestType().name() + ": " + (request.getNotes() != null ? request.getNotes() : "Standard service charge"));
            ledger.setStatus(LedgerStatus.PENDING);
            financialLedgerRepository.save(ledger);
        }

        // Send Notification
        try {
            String amountOrQty = "";
            if (saved.getRequestedAmount() != null && saved.getRequestedAmount().compareTo(BigDecimal.ZERO) > 0) {
                amountOrQty = "Rs. " + saved.getRequestedAmount();
            } else if (saved.getQuantity() != null) {
                amountOrQty = saved.getQuantity() + (saved.getRequestType() == RequestType.FERTILIZER ? " kg" : " units");
            }
            notificationPublisher.publishRequestCreated(
                saved.getSupplierName(),
                saved.getRequestType().name(),
                amountOrQty,
                saved.getRequestId().toString()
            );
        } catch (Exception e) {
            log.warn("Failed to trigger notification: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    public List<ServiceRequestResponse> getRequests(UUID createdById,
                                                    UUID supplierId,
                                                    String passbookNo,
                                                    RequestType requestType,
                                                    RequestStatus status,
                                                    Integer limit) {
        int pageSize = limit == null ? 100 : Math.min(Math.max(limit, 1), 300);
        return serviceRequestRepository.search(
                        createdById,
                        supplierId,
                        passbookNo,
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
        if (request.getAmount() != null) {
            entity.setRequestedAmount(request.getAmount());
        }
        if (request.getApproverComment() != null && !request.getApproverComment().isBlank()) {
            entity.setApproverComment(request.getApproverComment());
        }

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);

        // Update corresponding ledger entry if exists
        financialLedgerRepository.findOptionalByRequestId(requestId).ifPresent(ledger -> {
            if (request.getAmount() != null) {
                ledger.setAmount(request.getAmount());
            }
            if (request.getStatus() == RequestStatus.APPROVED_BY_EXT || request.getStatus() == RequestStatus.DISPATCHED) {
                ledger.setStatus(LedgerStatus.APPROVED);
                ledger.setApproverId(request.getApproverId());
            } else if (request.getStatus() == RequestStatus.REJECTED) {
                ledger.setStatus(LedgerStatus.REJECTED);
            }
            financialLedgerRepository.save(ledger);
        });

        // If dispatched, update inventory stock
        if (request.getStatus() == RequestStatus.DISPATCHED && entity.getItemId() != null && entity.getQuantity() != null) {
            try {
                String url = inventoryServiceUrl + "/api/inventory/" + entity.getItemId();
                Map<String, Object> itemResponse = restTemplate.getForObject(url, Map.class);
                if (itemResponse != null && itemResponse.get("quantityInStock") != null) {
                    Number currentStock = (Number) itemResponse.get("quantityInStock");
                    double newStock = Math.max(0, currentStock.doubleValue() - entity.getQuantity().doubleValue());
                    itemResponse.put("quantityInStock", newStock);
                    restTemplate.put(url, itemResponse);
                    log.info("Successfully deducted {} units from item {} upon dispatch", entity.getQuantity(), entity.getItemId());
                }
            } catch (Exception e) {
                log.error("Failed to update inventory for item {}: {}", entity.getItemId(), e.getMessage());
            }
        }

        // Send Notification for status update
        try {
            notificationPublisher.publishRequestStatusUpdate(
                saved.getSupplierName(),
                saved.getRequestType().name(),
                saved.getStatus().name(),
                saved.getRequestId().toString()
            );
        } catch (Exception e) {
            log.warn("Failed to trigger status update notification: {}", e.getMessage());
        }

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

        // Calculate LIVE ESTIMATE based on supplied weights
        BigDecimal totalNetWeight = fetchTotalNetWeight(supplierId);
        BigDecimal currentPrice = leafPriceRepository.findFirstByIsActiveTrueOrderByEffectiveDateDesc()
                .map(com.dalupotha.finance.entity.LeafPriceEntity::getPricePerKg)
                .orElse(new BigDecimal("240.00")); // Fallback

        BigDecimal totalGrossEarnings = totalNetWeight.multiply(currentPrice);
        
        // Estimated Balance = (Gross Earnings from Leaf) - (Past Payouts) - (Outstanding Advances) - (Outstanding Debts)
        // Wait, payoutTotal is already money RECEIVED. 
        // Real Estimated Balance = GrossEarnings - PayoutTotal - CurrentDebt - AdvanceTaken
        // If PayoutTotal covers some earnings, it reduces the remaining estimate.
        BigDecimal estimatedBalance = totalGrossEarnings.subtract(payoutTotal).subtract(currentDebt).subtract(advanceTaken);

        return new SupplierLedgerResponse(
                supplierId,
                currentDebt,
                advanceTaken,
                payoutTotal,
                estimatedBalance.max(BigDecimal.ZERO)
        );
    }

    private BigDecimal fetchTotalNetWeight(UUID supplierId) {
        String url = collectionServiceUrl + "/api/collection/summary/" + supplierId;
        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.get("totalNetWeight") != null) {
                return new BigDecimal(response.get("totalNetWeight").toString());
            }
        } catch (Exception e) {
            log.error("Failed to fetch weight summary from collection-service: {}", e.getMessage());
        }
        return BigDecimal.ZERO;
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
                entity.getItemId(),
                entity.getRequestDate(),
                entity.getUpdatedAt()
        );
    }

    private record UserIdentity(String fullName, String employeeId) {}
}
