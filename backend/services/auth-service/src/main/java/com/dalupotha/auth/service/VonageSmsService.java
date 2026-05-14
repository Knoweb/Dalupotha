package com.dalupotha.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Service
public class VonageSmsService implements SmsProvider {

    @Value("${vonage.api.key}")
    private String apiKey;

    @Value("${vonage.api.secret}")
    private String apiSecret;

    @Value("${vonage.sender.id:VonageAPIs}")
    private String senderId;

    @Override
    public void sendOtp(String contact, String code) throws Exception {
        String message = String.format("Dalupotha OTP: %s", code);

        String formattedContact = contact.replace("+", "").replace(" ", "").replace("-", "");
        if (formattedContact.startsWith("0") && formattedContact.length() == 10) {
            formattedContact = "94" + formattedContact.substring(1);
        }

        if (apiKey == null || apiKey.isBlank() || apiSecret == null || apiSecret.isBlank()) {
            log.warn("VONAGE KEYS NOT FULLY CONFIGURED!");
            throw new RuntimeException("Vonage API credentials are not configured");
        }

        try {
            String url = "https://rest.nexmo.com/sms/json";

            String formData = "from=" + java.net.URLEncoder.encode(senderId.trim(), java.nio.charset.StandardCharsets.UTF_8) +
                    "&to=" + java.net.URLEncoder.encode(formattedContact, java.nio.charset.StandardCharsets.UTF_8) +
                    "&text=" + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8) +
                    "&api_key=" + java.net.URLEncoder.encode(apiKey.trim(), java.nio.charset.StandardCharsets.UTF_8) +
                    "&api_secret=" + java.net.URLEncoder.encode(apiSecret.trim(), java.nio.charset.StandardCharsets.UTF_8);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formData))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Vonage API Response [Status {}]: {}", response.statusCode(), response.body());

            if (response.statusCode() >= 400) {
                throw new RuntimeException("Vonage API error: " + response.body());
            }
        } catch (Exception e) {
            log.error("Failed to send OTP via Vonage: {}", e.getMessage(), e);
            throw e;
        }
    }
}
