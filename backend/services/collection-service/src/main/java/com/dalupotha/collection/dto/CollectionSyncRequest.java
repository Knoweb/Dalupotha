package com.dalupotha.collection.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CollectionSyncRequest {

    @Valid
    @NotEmpty
    private List<CollectionSyncItemRequest> collections;

    public List<CollectionSyncItemRequest> getCollections() {
        return collections;
    }

    public void setCollections(List<CollectionSyncItemRequest> collections) {
        this.collections = collections;
    }
}
