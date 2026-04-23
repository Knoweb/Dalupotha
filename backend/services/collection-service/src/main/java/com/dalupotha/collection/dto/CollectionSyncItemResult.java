package com.dalupotha.collection.dto;

import java.util.UUID;

public record CollectionSyncItemResult(
        String clientRef,
        UUID collectionId,
        String status,
        String message
) {
}
