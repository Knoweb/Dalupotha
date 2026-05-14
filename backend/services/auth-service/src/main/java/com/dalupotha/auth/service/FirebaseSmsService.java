package com.dalupotha.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

/**
 * Calls the Firebase Auth REST API to:
 *  1. Send an SMS OTP to a phone number   → sendVerificationCode()
 *  2. Verify the code the user entered     → verifyCode()
 *
 * Firebase free tier: 10,000 SMS/month, officially supports Sri Lanka (+94).
 *
 * Setup:
 *  - Create a Firebase project → Authentication → Sign-in method → Phone → Enable
 *  - Copy the Web API key from Project Settings → General
 *  - Set FIREBASE_API_KEY in backend/.env
 */
@Slf4j
@Service
public class FirebaseSmsService {

    private static final String FIREBASE_SEND_URL =
            "https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=";
    private static final String FIREBASE_VERIFY_URL =
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=";

    @Value("${firebase.api-key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Sends an OTP SMS via Firebase.
     *
     * @param phoneNumber  E.164 format, e.g. "+94712345678"
     * @param recaptchaToken  Token obtained from the mobile app's Firebase reCAPTCHA WebView
     * @return sessionInfo token (opaque string) — must be stored and used in verifyCode()
     * @throws RuntimeException if Firebase rejects the request
     */
    public String sendVerificationCode(String phoneNumber, String recaptchaToken) {
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "phoneNumber", phoneNumber,
                    "recaptchaToken", recaptchaToken
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FIREBASE_SEND_URL + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (response.statusCode() != 200) {
                String errMsg = json.path("error").path("message").asText("Unknown Firebase error");
                log.error("Firebase sendVerificationCode failed: {}", errMsg);
                throw new RuntimeException("Firebase SMS failed: " + errMsg);
            }

            String sessionInfo = json.path("sessionInfo").asText();
            log.info("Firebase OTP sent to {} — sessionInfo obtained", phoneNumber);
            return sessionInfo;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Firebase sendVerificationCode exception", e);
            throw new RuntimeException("Firebase SMS error: " + e.getMessage());
        }
    }

    /**
     * Verifies the OTP code the user entered.
     *
     * @param sessionInfo  The token returned by sendVerificationCode()
     * @param code         The 6-digit code the user typed
     * @return Firebase ID token (can be used to identify the verified phone)
     * @throws RuntimeException if code is wrong or expired
     */
    public String verifyCode(String sessionInfo, String code) {
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "sessionInfo", sessionInfo,
                    "code", code
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FIREBASE_VERIFY_URL + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            if (response.statusCode() != 200) {
                String errMsg = json.path("error").path("message").asText("Unknown Firebase error");
                log.error("Firebase verifyCode failed: {}", errMsg);
                throw new RuntimeException("Invalid or expired OTP.");
            }

            String idToken = json.path("idToken").asText();
            log.info("Firebase OTP verified successfully");
            return idToken;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Firebase verifyCode exception", e);
            throw new RuntimeException("Firebase verify error: " + e.getMessage());
        }
    }
}
