package com.dalupotha.collection.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Supabase Realtime Publisher
 *
 * When a TA syncs a collection from their offline mobile device,
 * this service publishes the event to Supabase Realtime.
 * The factory web dashboard subscribes to this channel and updates live.
 *
 * Flow:
 *   Mobile (offline) → sync endpoint → CollectionService → PostgreSQL (primary)
 *                                                        → SupabasePublisher → Supabase Realtime
 *                                                                           → Web Dashboard (live update)
 */
@Service
public class SupabaseRealtimePublisher {

    private static final Logger log = LoggerFactory.getLogger(SupabaseRealtimePublisher.class);

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.realtime-channel}")
    private String channel;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Broadcasts a collection sync event to Supabase Realtime.
     * Called after a collection is saved to PostgreSQL.
     *
     * @param payload Map of collection data to broadcast
     */
    public void broadcastCollectionSync(Map<String, Object> payload) {
        if (supabaseUrl.contains("placeholder")) {
            log.warn("[Supabase] Not configured — skipping realtime broadcast. " +
                     "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
            return;
        }

        try {
            String broadcastUrl = supabaseUrl + "/rest/v1/rpc/broadcast";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", serviceRoleKey);
            headers.set("Authorization", "Bearer " + serviceRoleKey);

            Map<String, Object> body = Map.of(
                "channel",  channel,
                "event",    "COLLECTION_SYNCED",
                "payload",  payload
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                broadcastUrl, request, String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[Supabase] Collection sync broadcast successful → channel: {}", channel);
            } else {
                log.warn("[Supabase] Broadcast returned status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            // Non-critical — don't let Supabase failure break the main sync flow
            log.error("[Supabase] Failed to broadcast collection sync event: {}", e.getMessage());
        }
    }
}
