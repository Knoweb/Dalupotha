package com.dalupotha.collection.dto;

import java.util.List;

public record CollectionSyncResponse(
        int syncedCount,
        int failedCount,
        List<CollectionSyncItemResult> results
) {
}
