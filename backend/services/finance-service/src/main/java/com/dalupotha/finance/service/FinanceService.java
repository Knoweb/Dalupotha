package com.dalupotha.finance.service;

import com.dalupotha.finance.dto.CreateServiceRequestRequest;
import com.dalupotha.finance.dto.ServiceRequestResponse;
import com.dalupotha.finance.dto.SupplierLedgerResponse;
import com.dalupotha.finance.dto.UpdateRequestStatusRequest;
import com.dalupotha.finance.dto.LedgerTransactionResponse;
import com.dalupotha.finance.entity.EstateSettingEntity;
import com.dalupotha.finance.entity.FinancialLedgerEntity;
import com.dalupotha.finance.entity.ServiceRequestEntity;
import com.dalupotha.finance.model.LedgerStatus;
import com.dalupotha.finance.model.LedgerTransactionType;
import com.dalupotha.finance.model.RequestStatus;
import com.dalupotha.finance.model.RequestType;
import com.dalupotha.finance.repository.EstateSettingRepository;
import com.dalupotha.finance.repository.FinancialLedgerRepository;
import com.dalupotha.finance.repository.LeafPriceRepository;
import com.dalupotha.finance.repository.ServiceRequestRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
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
    private final EstateSettingRepository estateSettingRepository;
    private final NotificationPublisher notificationPublisher;

    public FinanceService(ServiceRequestRepository serviceRequestRepository,
                          FinancialLedgerRepository financialLedgerRepository,
                          LeafPriceRepository leafPriceRepository,
                          EstateSettingRepository estateSettingRepository,
                          NotificationPublisher notificationPublisher) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.financialLedgerRepository = financialLedgerRepository;
        this.leafPriceRepository = leafPriceRepository;
        this.estateSettingRepository = estateSettingRepository;
        this.notificationPublisher = notificationPublisher;
    }

    public ServiceRequestResponse createRequest(CreateServiceRequestRequest request) {
        log.info("CREATING REQUEST: Category: {}, Creator: {}, Supplier: {}, ItemType: {}",
            request.getRequestType(), request.getCreatedById(), request.getSupplierName(), request.getItemType());

        // ── Enforce advance limit ────────────────────────────────────
        if (request.getRequestType() == RequestType.ADVANCE && request.getRequestedAmount() != null) {
            BigDecimal limit = getAdvanceLimitValue();
            if (request.getRequestedAmount().compareTo(limit) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Advance request of Rs. " + request.getRequestedAmount() +
                    " exceeds the configured advance limit of Rs. " + limit);
            }
        }

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

        // Fetch assigned agent (inChargeId) from Auth Service
        try {
            String supplierDetailUrl = authServiceUrl + "/api/auth/users/" + request.getSupplierId() + "/detailed";
            Map<String, Object> supplierDetail = restTemplate.getForObject(supplierDetailUrl, Map.class);
            if (supplierDetail != null && supplierDetail.get("inChargeId") != null) {
                entity.setAssignedAgentId(UUID.fromString(supplierDetail.get("inChargeId").toString()));
                log.info("SUCCESS: Automatically assigned agent {} to request for supplier {}", entity.getAssignedAgentId(), entity.getSupplierName());
            } else {
                log.warn("WARNING: No inChargeId found for supplier {} in Auth Service response: {}", entity.getSupplierName(), supplierDetail);
            }
        } catch (Exception e) {
            log.error("ERROR: Failed to fetch assigned agent for supplier {}: {}", request.getSupplierId(), e.getMessage());
        }

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
                                                    UUID assignedAgentId,
                                                    Integer limit) {
        int pageSize = limit == null ? 100 : Math.min(Math.max(limit, 1), 300);
        return serviceRequestRepository.search(
                        createdById,
                        supplierId,
                        passbookNo,
                        requestType,
                        status,
                        assignedAgentId,
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
            entity.setApprovedAmount(request.getAmount());
        }
        if (request.getApproverComment() != null && !request.getApproverComment().isBlank()) {
            entity.setApproverComment(request.getApproverComment());
        }

        // For TRANSPORT approval: resolve + PERSIST the agent if missing
        if (entity.getRequestType() == RequestType.TRANSPORT
                && request.getStatus() == RequestStatus.APPROVED_BY_EXT
                && entity.getAssignedAgentId() == null
                && entity.getSupplierId() != null) {
            try {
                String agentLookupUrl = authServiceUrl + "/api/auth/suppliers/" + entity.getSupplierId() + "/agent";
                Map<String, Object> agentData = restTemplate.getForObject(agentLookupUrl, Map.class);
                if (agentData != null && agentData.get("inChargeId") != null) {
                    UUID agentId = UUID.fromString(agentData.get("inChargeId").toString());
                    entity.setAssignedAgentId(agentId);
                    serviceRequestRepository.save(entity);  // persist to DB
                    log.info("PERSISTED assignedAgentId {} to transport request {} for supplier {}",
                            agentId, entity.getRequestId(), entity.getSupplierName());
                }
            } catch (Exception e) {
                log.warn("Could not persist assignedAgentId for request {}: {}", entity.getRequestId(), e.getMessage());
            }
        }

        ServiceRequestEntity saved = serviceRequestRepository.save(entity);

        // Update or create ledger entry on status change
        Optional<FinancialLedgerEntity> existingLedger = financialLedgerRepository.findOptionalByRequestId(requestId);
        if (existingLedger.isPresent()) {
            // Update the existing ledger entry
            FinancialLedgerEntity ledger = existingLedger.get();
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
        } else if ((request.getStatus() == RequestStatus.APPROVED_BY_EXT || request.getStatus() == RequestStatus.DISPATCHED)
                && request.getAmount() != null
                && request.getAmount().compareTo(BigDecimal.ZERO) > 0
                && saved.getSupplierId() != null) {
            // No ledger existed (e.g. transport request had no amount at submission).
            // Create one now with the manager-set fee, charged to the supplier.
            FinancialLedgerEntity ledger = new FinancialLedgerEntity();
            ledger.setSupplierId(saved.getSupplierId());
            ledger.setTransactionType(LedgerTransactionType.DEBT);
            ledger.setAmount(request.getAmount());
            ledger.setRequestId(saved.getRequestId());
            ledger.setDescription(saved.getRequestType().name() + " charge: " + (saved.getNotes() != null ? saved.getNotes() : "Transport service"));
            ledger.setStatus(LedgerStatus.APPROVED);
            ledger.setApproverId(request.getApproverId());
            financialLedgerRepository.save(ledger);
            log.info("Created ledger entry of Rs.{} for {} request {} against supplier {}",
                    request.getAmount(), saved.getRequestType(), saved.getRequestId(), saved.getSupplierName());
        }


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
            String targetRole = "*";

            if (saved.getRequestType() == RequestType.TRANSPORT && saved.getStatus() == RequestStatus.APPROVED_BY_EXT) {
                if (saved.getAssignedAgentId() != null) {
                    targetRole = saved.getAssignedAgentId().toString();
                    log.info("NOTIFY → agent {} for supplier {} transport request", targetRole, saved.getSupplierName());
                } else {
                    log.error("NOTIFY FAILED: assignedAgentId still null after persistence attempt for request {}", saved.getRequestId());
                }
            }

            notificationPublisher.publishRequestStatusUpdate(
                saved.getSupplierName(),
                saved.getRequestType().name(),
                saved.getStatus().name(),
                saved.getRequestId().toString(),
                targetRole
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
        String approverName = null;
        if (entity.getApproverId() != null) {
            UserIdentity approverIdentity = fetchUserIdentity(entity.getApproverId());
            if (approverIdentity != null) {
                approverName = approverIdentity.fullName();
            }
        }
        return new LedgerTransactionResponse(
                entity.getTransactionId(),
                entity.getSupplierId(),
                entity.getApproverId(),
                entity.getRequestId(),
                entity.getTransactionType(),
                entity.getAmount(),
                entity.getGrossAmount(),
                entity.getDeductions(),
                entity.getRemaining(),
                entity.getDescription(),
                entity.getTransactionDate(),
                entity.getStatus(),
                approverName
        );
    }

    public LedgerTransactionResponse processPayout(UUID supplierId, BigDecimal amount, UUID requesterId, String description, boolean immediate) {
        log.info("PROCESSING PAYOUT: Supplier: {}, Amount: {}, Requester: {}, Immediate: {}", supplierId, amount, requesterId, immediate);

        Optional<FinancialLedgerEntity> existingOpt = financialLedgerRepository.findBySupplierIdOrderByTransactionDateDesc(supplierId)
                .stream()
                .filter(e -> e.getTransactionType() == LedgerTransactionType.PAYOUT && e.getStatus() == LedgerStatus.AWAITING_APPROVAL)
                .findFirst();

        FinancialLedgerEntity ledger = existingOpt.orElseGet(FinancialLedgerEntity::new);
        
        ledger.setSupplierId(supplierId);
        ledger.setTransactionType(LedgerTransactionType.PAYOUT);
        ledger.setAmount(amount);
        ledger.setApproverId(immediate ? requesterId : null); // Only set approver if immediate
        ledger.setDescription(description != null ? description : "Balance Payment Payout");
        ledger.setStatus(immediate ? LedgerStatus.APPROVED : LedgerStatus.AWAITING_APPROVAL);
        
        FinancialLedgerEntity saved = financialLedgerRepository.save(ledger);
        return toLedgerTransactionResponse(saved);
    }

    public void bulkProcessPayouts(List<UUID> supplierIds, UUID requesterId, boolean immediate) {
        log.info("BULK PROCESSING PAYOUTS: Count: {}, Requester: {}, Immediate: {}", supplierIds.size(), requesterId, immediate);
        for (UUID sid : supplierIds) {
            SupplierLedgerResponse ledger = getSupplierLedger(sid);
            if (ledger.estimatedBalance().compareTo(BigDecimal.ZERO) > 0) {
                processPayout(sid, ledger.estimatedBalance(), requesterId, "Bulk Monthly Payout", immediate);
            }
        }
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
                estimatedBalance.max(BigDecimal.ZERO),
                totalNetWeight,
                currentPrice,
                totalGrossEarnings
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

        // Resolve assigned agent name
        UUID resolvedAgentId = entity.getAssignedAgentId();
        String assignedAgentName = null;

        if (resolvedAgentId != null) {
            // Use stored assignedAgentId directly
            UserIdentity agentIdentity = fetchUserIdentity(resolvedAgentId);
            if (agentIdentity != null) {
                assignedAgentName = agentIdentity.fullName();
            }
        } else if (entity.getSupplierId() != null) {
            // Fallback for ALL request types: look up supplier's assigned agent (inChargeId) from Auth Service
            try {
                String agentLookupUrl = authServiceUrl + "/api/auth/suppliers/" + entity.getSupplierId() + "/agent";
                Map<String, Object> agentData = restTemplate.getForObject(agentLookupUrl, Map.class);
                if (agentData != null && agentData.get("inChargeId") != null) {
                    resolvedAgentId = UUID.fromString(agentData.get("inChargeId").toString());
                    assignedAgentName = agentData.get("inChargeName") != null
                            ? agentData.get("inChargeName").toString() : null;
                    log.info("Fallback: resolved agent {} ({}) for {} request {}",
                            assignedAgentName, resolvedAgentId, entity.getRequestType(), entity.getRequestId());
                }
            } catch (Exception e) {
                log.warn("Could not resolve assigned agent via fallback for request {}: {}", entity.getRequestId(), e.getMessage());
            }
        }

        // Resolve approver name from auth-service
        String approverName = null;
        if (entity.getApproverId() != null) {
            try {
                UserIdentity approverIdentity = fetchUserIdentity(entity.getApproverId());
                if (approverIdentity != null) {
                    approverName = approverIdentity.fullName();
                }
            } catch (Exception e) {
                log.warn("Could not resolve approver name for request {}: {}", entity.getRequestId(), e.getMessage());
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
                entity.getUpdatedAt(),
                resolvedAgentId,
                assignedAgentName,
                approverName,
                entity.getApprovedAmount()
        );
    }


    public java.util.Map<String, Object> getCurrentLeafPrice() {
        return leafPriceRepository.findFirstByIsActiveTrueOrderByEffectiveDateDesc()
            .map(lp -> {
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("pricePerKg", lp.getPricePerKg());
                result.put("effectiveDate", lp.getEffectiveDate());
                result.put("priceId", lp.getPriceId());
                return result;
            })
            .orElseGet(() -> {
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("pricePerKg", new BigDecimal("240.00"));
                result.put("effectiveDate", null);
                result.put("priceId", null);
                return result;
            });
    }

    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> setLeafPrice(BigDecimal pricePerKg) {
        // Deactivate all existing active rates
        leafPriceRepository.findAll().forEach(lp -> {
            if (lp.isActive()) {
                lp.setActive(false);
                leafPriceRepository.save(lp);
            }
        });

        // Insert new active rate
        com.dalupotha.finance.entity.LeafPriceEntity newPrice = new com.dalupotha.finance.entity.LeafPriceEntity();
        newPrice.setPricePerKg(pricePerKg);
        newPrice.setActive(true);
        leafPriceRepository.save(newPrice);

        log.info("Leaf price updated to Rs. {} per kg", pricePerKg);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("pricePerKg", newPrice.getPricePerKg());
        result.put("effectiveDate", newPrice.getEffectiveDate());
        result.put("priceId", newPrice.getPriceId());
        return result;
    }

    // ── Advance Limit ────────────────────────────────────────────────────────
    private static final BigDecimal DEFAULT_ADVANCE_LIMIT = new BigDecimal("25000.00");
    private static final String KEY_ADVANCE_LIMIT = "advance_limit";

    private BigDecimal getAdvanceLimitValue() {
        return estateSettingRepository.findBySettingKey(KEY_ADVANCE_LIMIT)
            .map(s -> new BigDecimal(s.getSettingValue()))
            .orElse(DEFAULT_ADVANCE_LIMIT);
    }

    public java.util.Map<String, Object> getAdvanceLimit() {
        BigDecimal limit = getAdvanceLimitValue();
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("advanceLimit", limit);
        return result;
    }

    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> setAdvanceLimit(BigDecimal limit) {
        EstateSettingEntity entity = estateSettingRepository.findBySettingKey(KEY_ADVANCE_LIMIT)
            .orElseGet(() -> {
                EstateSettingEntity e = new EstateSettingEntity();
                e.setSettingKey(KEY_ADVANCE_LIMIT);
                return e;
            });
        entity.setSettingValue(limit.toPlainString());
        estateSettingRepository.save(entity);
        log.info("Advance limit updated to Rs. {}", limit);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("advanceLimit", limit);
        return result;
    }

    private record UserIdentity(String fullName, String employeeId) {}
}
