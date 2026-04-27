package com.dalupotha.collection.controller;

import com.dalupotha.collection.dto.CollectionHistoryItemResponse;
import com.dalupotha.collection.dto.CollectionSyncRequest;
import com.dalupotha.collection.dto.CollectionSyncResponse;
import com.dalupotha.collection.dto.SupplierSummaryResponse;
import com.dalupotha.collection.service.CollectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collection")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @GetMapping("/suppliers")
    public List<SupplierSummaryResponse> getSuppliers(
            @RequestParam(required = false) UUID estateId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit
    ) {
        return collectionService.getSuppliers(estateId, search, limit);
    }

    @PostMapping("/sync")
    public CollectionSyncResponse syncCollections(@Valid @RequestBody CollectionSyncRequest request) {
        return collectionService.syncCollections(request);
    }

    @GetMapping("/recent")
    public List<CollectionHistoryItemResponse> getRecentCollections(
            @RequestParam(required = false) Integer limit
    ) {
        return collectionService.getRecentCollections(limit);
    }

    @GetMapping("/history/agent/{transportAgentId}")
    public List<CollectionHistoryItemResponse> getAgentHistory(
            @PathVariable UUID transportAgentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer limit
    ) {
        return collectionService.getAgentHistory(transportAgentId, status, limit);
    }

    @GetMapping("/history/{supplierId}")
    public List<CollectionHistoryItemResponse> getSupplierHistory(
            @PathVariable UUID supplierId,
            @RequestParam(required = false) Integer limit
    ) {
        return collectionService.getSupplierHistory(supplierId, limit);
    }
}
