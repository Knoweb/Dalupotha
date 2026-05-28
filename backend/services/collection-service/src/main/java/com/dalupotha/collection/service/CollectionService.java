package com.dalupotha.collection.service;

import com.dalupotha.collection.dto.CollectionHistoryItemResponse;
import com.dalupotha.collection.dto.CollectionSyncItemRequest;
import com.dalupotha.collection.dto.CollectionSyncItemResult;
import com.dalupotha.collection.dto.CollectionSyncRequest;
import com.dalupotha.collection.dto.CollectionSyncResponse;
import com.dalupotha.collection.dto.SupplierSummaryResponse;
import com.dalupotha.collection.entity.AppUser;
import com.dalupotha.collection.entity.GpsStatus;
import com.dalupotha.collection.entity.LeafCollection;
import com.dalupotha.collection.entity.SmallHolder;
import com.dalupotha.collection.entity.SyncStatus;
import com.dalupotha.collection.entity.UserRole;
import com.dalupotha.collection.repository.AppUserRepository;
import com.dalupotha.collection.repository.LeafCollectionRepository;
import com.dalupotha.collection.repository.SmallHolderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class CollectionService {

    private static final Logger log = LoggerFactory.getLogger(CollectionService.class);

    private final SmallHolderRepository smallHolderRepository;
    private final LeafCollectionRepository leafCollectionRepository;
    private final AppUserRepository appUserRepository;
    private final SupabaseRealtimePublisher supabaseRealtimePublisher;
    private final NotificationPublisher notificationPublisher;

    public CollectionService(
            SmallHolderRepository smallHolderRepository,
            LeafCollectionRepository leafCollectionRepository,
            AppUserRepository appUserRepository,
            SupabaseRealtimePublisher supabaseRealtimePublisher,
            NotificationPublisher notificationPublisher
    ) {
        this.smallHolderRepository = smallHolderRepository;
        this.leafCollectionRepository = leafCollectionRepository;
        this.appUserRepository = appUserRepository;
        this.supabaseRealtimePublisher = supabaseRealtimePublisher;
        this.notificationPublisher = notificationPublisher;
    }

    public List<SupplierSummaryResponse> getSuppliers(UUID estateId, String search, Integer limit) {
        int pageSize = normalizeLimit(limit, 100, 200);
        String searchTerm = normalizeSearchTerm(search);
        boolean hasSearch = searchTerm != null;
        String searchPattern = hasSearch ? "%" + searchTerm.toLowerCase() + "%" : null;

        return smallHolderRepository.searchSuppliers(estateId, hasSearch, searchPattern, PageRequest.of(0, pageSize))
                .stream()
                .map(sh -> new SupplierSummaryResponse(
                        sh.getSupplierId(),
                        sh.getUser().getFullName(),
                        sh.getPassbookNo(),
                        sh.getLandName(),
                        sh.getEstateId(),
                        sh.getArcs()
                ))
                .toList();
    }

    private String normalizeSearchTerm(String search) {
        if (search == null) {
            return null;
        }

        String trimmed = search.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public List<CollectionHistoryItemResponse> getAgentHistory(UUID transportAgentId, String status, Integer limit) {
        SyncStatus syncStatus = parseSyncStatus(status);
        int pageSize = normalizeLimit(limit, 50, 200);
        try {
            return leafCollectionRepository.findByAgentHistory(transportAgentId, syncStatus, PageRequest.of(0, pageSize))
                    .stream()
                    .map(this::toHistoryResponse)
                    .toList();
        } catch (Exception ex) {
            log.error("Failed to load agent history for {}. Returning empty list.", transportAgentId, ex);
            return List.of();
        }
    }

    public List<CollectionHistoryItemResponse> getSupplierHistory(UUID supplierId, Integer limit) {
        int pageSize = normalizeLimit(limit, 50, 200);
        try {
            return leafCollectionRepository.findBySupplierHistory(supplierId, PageRequest.of(0, pageSize))
                    .stream()
                    .map(this::toHistoryResponse)
                    .toList();
        } catch (Exception ex) {
            log.error("Failed to load supplier history for {}. Returning empty list.", supplierId, ex);
            return List.of();
        }
    }

    public CollectionSyncResponse syncCollections(CollectionSyncRequest request) {
        List<CollectionSyncItemResult> results = new ArrayList<>();
        int syncedCount = 0;
        int failedCount = 0;

        for (CollectionSyncItemRequest item : request.getCollections()) {
            try {
                // Auto-sync metadata if missing locally
                AppUser transportAgent = appUserRepository.findById(item.getTransportAgentId())
                        .orElseGet(() -> {
                            AppUser newUser = new AppUser();
                            newUser.setUserId(item.getTransportAgentId());
                            newUser.setRole(UserRole.TA);
                            newUser.setFullName(item.getTransportAgentName() != null ? item.getTransportAgentName() : "Unknown Agent");
                            return appUserRepository.save(newUser);
                        });

                // Ensure Supplier has a dedicated User shadow record
                SmallHolder supplier = smallHolderRepository.findById(item.getSupplierId())
                        .orElseGet(() -> {
                            // 1. First ensure the supplier's User entry exists
                            AppUser supplierUser = appUserRepository.findById(item.getSupplierId()) // Supplier users often share the same ID as the supplier record in this app
                                    .orElseGet(() -> {
                                        AppUser newUser = new AppUser();
                                        newUser.setUserId(item.getSupplierId());
                                        newUser.setRole(UserRole.SH); // Supplier role
                                        newUser.setFullName(item.getSupplierName() != null ? item.getSupplierName() : "Unknown Supplier");
                                        return appUserRepository.save(newUser);
                                    });

                            // 2. Then create the SmallHolder record linking to that User
                            SmallHolder newSh = new SmallHolder();
                            newSh.setSupplierId(item.getSupplierId());
                            newSh.setUser(supplierUser);
                            newSh.setPassbookNo(item.getPassbookNo() != null ? item.getPassbookNo() : "Pending");
                            newSh.setLandName("Registered via TA Sync");
                            newSh.setEstateId(item.getEstateId());
                            return smallHolderRepository.save(newSh);
                        });

                LeafCollection entity = new LeafCollection();
                entity.setSupplier(supplier);
                entity.setTransportAgentId(transportAgent.getUserId());
                entity.setGrossWeight(item.getGrossWeight());
                entity.setNetWeight(item.getNetWeight());
                entity.setGpsLat(item.getGpsLat());
                entity.setGpsLong(item.getGpsLong());
                entity.setGpsStatus(resolveGpsStatus(item));
                entity.setManualOverride(Boolean.TRUE.equals(item.getManualOverride()));
                entity.setOverrideReason(item.getOverrideReason());
                entity.setSyncStatus(SyncStatus.SYNCED);
                entity.setCollectedAt(item.getCollectedAt() != null ? item.getCollectedAt() : OffsetDateTime.now());
                entity.setSyncedAt(OffsetDateTime.now());

                LeafCollection saved = leafCollectionRepository.save(entity);
                syncedCount++;

                Map<String, Object> payload = new HashMap<>();
                payload.put("collectionId", saved.getCollectionId());
                payload.put("supplierId", supplier.getSupplierId());
                payload.put("supplierName", supplier.getUser().getFullName());
                payload.put("transportAgentId", transportAgent.getUserId());
                payload.put("transportAgentName", transportAgent.getFullName());
                payload.put("grossWeight", saved.getGrossWeight());
                payload.put("collectedAt", saved.getCollectedAt());
                payload.put("syncStatus", saved.getSyncStatus().name());
                supabaseRealtimePublisher.broadcastCollectionSync(payload);

                // Async fire-and-forget: push notification to notification-service
                notificationPublisher.publishCollectionSynced(
                        supplier.getUser().getFullName(),
                        saved.getGrossWeight(),
                        transportAgent.getFullName(),
                        saved.getCollectionId().toString(),
                        supplier.getEstateId()
                );

                results.add(new CollectionSyncItemResult(
                        item.getClientRef(),
                        saved.getCollectionId(),
                        SyncStatus.SYNCED.name(),
                        "Collection synced"
                ));
            } catch (Exception ex) {
                failedCount++;
                results.add(new CollectionSyncItemResult(
                        item.getClientRef(),
                        null,
                        SyncStatus.FAILED.name(),
                        ex.getMessage()
                ));
            }
        }

        return new CollectionSyncResponse(syncedCount, failedCount, results);
    }

    private CollectionHistoryItemResponse toHistoryResponse(LeafCollection lc) {
        String agentName = "Unknown Agent";
        if (lc.getTransportAgentId() != null) {
            agentName = appUserRepository.findById(lc.getTransportAgentId())
                    .map(AppUser::getFullName)
                    .orElse("Unknown Agent");
        }
        return new CollectionHistoryItemResponse(
                lc.getCollectionId(),
                lc.getSupplier() != null ? lc.getSupplier().getSupplierId() : null,
                (lc.getSupplier() != null && lc.getSupplier().getUser() != null) ? lc.getSupplier().getUser().getFullName() : "Unknown",
                lc.getSupplier() != null ? lc.getSupplier().getPassbookNo() : "N/A",
                lc.getGrossWeight(),
                lc.getNetWeight(),
                lc.getCollectedAt() != null ? lc.getCollectedAt().toInstant() : null,
                lc.getSyncStatus() != null ? lc.getSyncStatus().name() : SyncStatus.SYNCED.name(),
                lc.getGpsStatus() != null ? lc.getGpsStatus().name() : GpsStatus.NO_GPS.name(),
                lc.isManualOverride(),
                lc.getSupervisorNotes(),
                lc.getTransportAgentId(),
                agentName,
                lc.getProcessedByName(),
                lc.getProcessedAt() != null ? lc.getProcessedAt().toInstant() : null,
                lc.getGpsLat(),
                lc.getGpsLong()
        );
    }

    private SyncStatus parseSyncStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return SyncStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid sync status: " + status);
        }
    }

    private GpsStatus resolveGpsStatus(CollectionSyncItemRequest item) {
        if (item.getGpsStatus() != null && !item.getGpsStatus().isBlank()) {
            try {
                return GpsStatus.valueOf(item.getGpsStatus().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid GPS status: " + item.getGpsStatus());
            }
        }
        if (Boolean.TRUE.equals(item.getManualOverride())) {
            return GpsStatus.MANUAL;
        }
        return hasCoordinates(item.getGpsLat(), item.getGpsLong()) ? GpsStatus.GPS : GpsStatus.NO_GPS;
    }

    private boolean hasCoordinates(BigDecimal lat, BigDecimal lon) {
        return lat != null && lon != null;
    }

    public List<CollectionHistoryItemResponse> getRecentCollections(UUID estateId, Integer limit) {
        int pageSize = normalizeLimit(limit, 50, 200);
        if (estateId != null) {
            return leafCollectionRepository.findBySupplierEstate(estateId, PageRequest.of(0, pageSize))
                    .stream()
                    .map(this::toHistoryResponse)
                    .toList();
        }
        return leafCollectionRepository.findAll(PageRequest.of(0, pageSize, org.springframework.data.domain.Sort.by("collectedAt").descending()))
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    public Map<String, Object> getSupplierSummary(UUID supplierId) {
        List<LeafCollection> history = leafCollectionRepository.findBySupplierHistory(supplierId, PageRequest.of(0, 1000));

        // ALL-TIME gross weight (including unprocessed) — used for display only
        BigDecimal totalGross = history.stream()
                .map(LeafCollection::getGrossWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── CRITICAL FIX ──────────────────────────────────────────────────────────
        // Only sum netWeight for collections that have ACTUALLY been processed
        // by factory staff (netWeight IS NOT NULL). Unprocessed collections must
        // NOT fall back to grossWeight — they should be excluded from earnings.
        BigDecimal totalNet = history.stream()
                .filter(lc -> lc.getNetWeight() != null)   // processed only
                .map(LeafCollection::getNetWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long processedCount = history.stream().filter(lc -> lc.getNetWeight() != null).count();
        long pendingCount   = history.size() - processedCount;

        Map<String, Object> summary = new HashMap<>();
        summary.put("supplierId", supplierId);
        summary.put("totalGrossWeight", totalGross);
        summary.put("totalNetWeight", totalNet);          // <-- only processed net
        summary.put("collectionCount", history.size());
        summary.put("processedCount", processedCount);
        summary.put("pendingCount", pendingCount);
        return summary;
    }

    public void updateNotes(UUID collectionId, String notes) {
        LeafCollection leafCollection = leafCollectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Collection not found: " + collectionId));
        leafCollection.setSupervisorNotes(notes);
        leafCollectionRepository.save(leafCollection);
    }

    public void applyDeduction(UUID collectionId, BigDecimal deductionWeight, String processedByName) {
        LeafCollection lc = leafCollectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Collection not found: " + collectionId));
        BigDecimal net = lc.getGrossWeight().subtract(deductionWeight);
        if (net.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Deduction cannot exceed gross weight");
        }
        lc.setNetWeight(net);
        lc.setProcessedByName(processedByName);
        lc.setProcessedAt(java.time.OffsetDateTime.now());
        leafCollectionRepository.save(lc);
    }

    private int normalizeLimit(Integer requested, int fallback, int max) {
        if (requested == null) {
            return fallback;
        }
        if (requested < 1) {
            throw new ResponseStatusException(BAD_REQUEST, "limit must be greater than 0");
        }
        return Math.min(requested, max);
    }
}
