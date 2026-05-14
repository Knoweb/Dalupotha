package com.dalupotha.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends OTP SMS via Infobip REST API.
 *
 * Why Infobip?
 *  - Free trial sends to ANY number (no "verified number" restriction like Twilio/Vonage trial)
 *  - Officially supports Sri Lanka (+94)
 *  - Simple REST API, no SDK needed
 *
 * Setup (2 minutes):
 *  1. Create free account at https://portal.infobip.com/signup
 *  2. From dashboard copy: API Key + Base URL (e.g. xxxxx.api.infobip.com)
 *  3. Paste into backend/.env as INFOBIP_API_KEY and INFOBIP_BASE_URL
 *  4. Set DEV_MODE=false and rebuild: docker compose up -d --build auth-service
 */
@Slf4j
@Service
public class InfobipSmsService implements SmsProvider {

    @Value("${infobip.api-key:}")
    private String apiKey;

    /** Account-specific base URL, e.g. "xxxxx.api.infobip.com" */
    @Value("${infobip.base-url:}")
    private String baseUrl;

    @Value("${infobip.sender:Dalupotha}")
    private String sender;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank()
                && baseUrl != null && !baseUrl.isBlank();
    }

    /**
     * Formats a Sri Lanka number to international E.164 format.
     * Accepts: 0712345678, +94712345678, 94712345678
     */
    private String formatToE164(String contact) {
        String digits = contact.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() == 10) {
            return "+94" + digits.substring(1);
        }
        if (digits.startsWith("94") && digits.length() == 11) {
            return "+" + digits;
        }
        // Assume already correct
        return contact.startsWith("+") ? contact : "+" + digits;
    }

    @Override
    public void sendOtp(String contact, String code) throws Exception {
        if (!isConfigured()) {
            throw new RuntimeException("Infobip credentials not configured (INFOBIP_API_KEY / INFOBIP_BASE_URL)");
        }

        String to = formatToE164(contact);
        String text = "Your Dalupotha verification code is: " + code + ". Valid for 5 minutes. Do not share this code.";

        // Build Infobip SMS request body (v3 format as per screenshot)
        Map<String, Object> body = Map.of(
                "messages", List.of(
                        Map.of(
                                "sender", "ServiceSMS",
                                "destinations", List.of(Map.of("to", to)),
                                "content", Map.of("text", text)
                        )
                )
        );

        String jsonBody = objectMapper.writeValueAsString(body);
        String url = "https://" + baseUrl.trim() + "/sms/3/messages";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "App " + apiKey.trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        log.info("Infobip SMS Response [{}]: {}", response.statusCode(), response.body());

        if (response.statusCode() >= 400) {
            throw new RuntimeException("Infobip API error " + response.statusCode() + ": " + response.body());
        }

        // Check for message-level errors in the response
        var jsonResponse = objectMapper.readTree(response.body());
        var messages = jsonResponse.path("messages");
        if (messages.isArray() && messages.size() > 0) {
            var status = messages.get(0).path("status");
            String groupName = status.path("groupName").asText("");
            if ("REJECTED".equals(groupName) || "UNDELIVERABLE".equals(groupName)) {
                String description = status.path("description").asText("Unknown error");
                throw new RuntimeException("Infobip rejected message: " + description);
            }
        }

        log.info("Infobip OTP sent successfully to {}", to);
    }
}
