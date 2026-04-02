package com.dalupotha.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

// ──────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────

public class AuthDtos {

    /** Staff / TA login */
    @Data
    public static class StaffLoginRequest {
        @NotBlank(message = "Employee ID is required")
        private String employeeId;

        @NotBlank(message = "Password is required")
        private String password;
    }

    /** Send OTP to Small Holder's phone */
    @Data
    public static class OtpSendRequest {
        @NotBlank(message = "Contact number is required")
        private String contact;   // e.g. +94711001001
        private String purpose = "LOGIN"; // LOGIN | REGISTRATION
    }

    /** Verify OTP submitted by Small Holder */
    @Data
    public static class OtpVerifyRequest {
        @NotBlank(message = "Contact is required")
        private String contact;

        @NotBlank(message = "OTP code is required")
        private String code;

        private String purpose = "LOGIN";
    }

    /** Small Holder self-registration */
    @Data
    public static class SmallHolderRegisterRequest {
        @NotBlank private String contact;
        @NotBlank private String otpCode;
        @NotBlank private String fullName;
        @NotBlank private String passbookNo;
        @NotBlank private String landName;
        private String address;
        private Double gpsLat;
        private Double gpsLong;
        private String inChargeId;  // UUID of EXT officer
    }

    // ──────────────────────────────────────────────
    // Response DTOs
    // ──────────────────────────────────────────────

    @Data
    public static class AuthResponse {
        private String token;
        private String role;
        private String userId;
        private String employeeId;
        private String fullName;
        private String contact;
        private long   expiresIn;  // seconds

        public AuthResponse(String token, String role, String userId,
                            String employeeId, String fullName, String contact, long expiresIn) {
            this.token      = token;
            this.role       = role;
            this.userId     = userId;
            this.employeeId = employeeId;
            this.fullName   = fullName;
            this.contact    = contact;
            this.expiresIn  = expiresIn;
        }
    }

    @Data
    public static class OtpSendResponse {
        private String message;
        private String contact;
        private int    expiryMinutes;

        public OtpSendResponse(String contact, int expiryMinutes) {
            this.message      = "OTP sent successfully";
            this.contact      = contact;
            this.expiryMinutes = expiryMinutes;
        }
    }

    @Data
    public static class ErrorResponse {
        private int    status;
        private String error;
        private String message;

        public ErrorResponse(int status, String error, String message) {
            this.status  = status;
            this.error   = error;
            this.message = message;
        }
    }
}
