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
public class OtpSimulatorService {

    @Value("${vonage.api.key}")
    private String apiKey;

    @Value("${vonage.api.secret}")
    private String apiSecret;

    @Value("${vonage.sender.id:VonageAPIs}")
    private String senderId;

    public void sendOtp(String contact, String code) {
        String message = String.format("Dalupotha OTP: %s", code);
        
        log.info("Sending REAL SMS to {} via Vonage...", contact);
        
        // Vonage expects numbers in strictly E.164 format without the + (e.g. 94754796701)
        String formattedContact = contact.replace("+", "");
        
        // If the user entered a local Sri Lankan format (07XXXXXXXX), convert it to 947XXXXXXXX
        if (formattedContact.startsWith("0") && formattedContact.length() == 10) {
            formattedContact = "94" + formattedContact.substring(1);
        }

        if (apiKey == null || apiKey.isBlank() || apiKey.contains("your-api")) {
            log.warn("============================================");
            log.warn("  [DEV OTP SIMULATOR]");
            log.warn("  VONAGE KEYS NOT FULLY CONFIGURED!");
            log.warn("  To     : {}", formattedContact);
            log.warn("  Code   : {}", code);
            log.warn("============================================");
            return;
        }

        try {
            String url = "https://rest.nexmo.com/sms/json";

            String cleanApiKey = apiKey.trim();
            String cleanApiSecret = apiSecret.trim();
            String cleanSenderId = senderId.trim();

            String formData = "from=" + java.net.URLEncoder.encode(cleanSenderId, java.nio.charset.StandardCharsets.UTF_8) +
                              "&to=" + java.net.URLEncoder.encode(formattedContact, java.nio.charset.StandardCharsets.UTF_8) +
                              "&text=" + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8) +
                              "&api_key=" + java.net.URLEncoder.encode(cleanApiKey, java.nio.charset.StandardCharsets.UTF_8) +
                              "&api_secret=" + java.net.URLEncoder.encode(cleanApiSecret, java.nio.charset.StandardCharsets.UTF_8);


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

        } catch (Exception e) {
            log.error("Failed to send real SMS via Vonage: {}", e.getMessage());
        }

        log.info("============================================");
        log.info("  [LOCAL BACKUP SIMULATOR]");
        log.info("  To     : {}", formattedContact);
        log.info("  Code   : {}", code);
        log.info("============================================");
    }
}
