package com.dalupotha.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

// ──────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────

import java.time.LocalDateTime;

public class AuthDtos {

    /** Staff / TA login with employeeId + PIN */
    @Data
    public static class StaffLoginRequest {
        @NotBlank(message = "Employee ID is required")
        private String employeeId;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class CreateUserRequest {
        private UUID estateId;

        @NotBlank(message = "Role is required")
        private String role;

        @NotBlank(message = "Full Name is required")
        private String fullName;

        @NotBlank(message = "Email is required")
        private String email;

        private String employeeId;

        @NotBlank(message = "Password is required")
        private String password;

        private String contact;
        private String nic;
        private java.time.LocalDate birthdate;

        @NotBlank(message = "Username is required")
        private String username;
    }

    /** Small Holder (Supplier) login with Passbook ID + PIN */
    @Data
    public static class SupplierPinLoginRequest {
        @NotBlank(message = "Passbook number is required")
        private String passbookNo;

        @NotBlank(message = "PIN is required")
        private String pin;
    }

    /** Send OTP to Small Holder's phone */
    @Data
    public static class OtpSendRequest {
        @NotBlank(message = "Contact number is required")
        private String contact;   // e.g. +94711001001
        private String purpose = "LOGIN"; // LOGIN | REGISTRATION
        private String passbookNo;         // optional, for early uniqueness check
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
        private String otpCode;
        @NotBlank private String fullName;
        @NotBlank private String pin;       // 4-digit PIN used for future logins
        @NotBlank private String passbookNo;
        private String landName;
        private String address;
        private UUID   estateId;
        private BigDecimal arcs;
        private Double gpsLat;
        private Double gpsLong;
        private String inChargeId;  // UUID of EXT officer
    }

    /** Transport Agent (TA) self-registration */
    @Data
    public static class AgentRegisterRequest {
        @NotBlank private String contact;
        private String otpCode;
        @NotBlank private String fullName;
        @NotBlank private String employeeId; // To be verified against HR
        @NotBlank private String pin;        // 4-digit PIN used for future logins
        private UUID   estateId;
    }

    // ──────────────────────────────────────────────
    // Response DTOs
    // ──────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        @JsonProperty("token") private String token;
        @JsonProperty("role") private String role;
        @JsonProperty("userId") private String userId;
        @JsonProperty("employeeId") private String employeeId;
        @JsonProperty("fullName") private String fullName;
        @JsonProperty("contact") private String contact;
        @JsonProperty("routeName") private String routeName;
        @JsonProperty("estateId") private UUID   estateId;
        @JsonProperty("estateName") private String estateName;
        @JsonProperty("arcs") private BigDecimal arcs;
        @JsonProperty("passbookNo") private String passbookNo;
        @JsonProperty("expiresIn") private long   expiresIn;
        @JsonProperty("inChargeName") private String inChargeName;
        @JsonProperty("supplierId") private String supplierId;

        public AuthResponse(String token, String role, String userId, String employeeId, String fullName, String contact, String routeName, UUID estateId, String estateName, BigDecimal arcs, String passbookNo, long expiresIn) {
            this.token = token;
            this.role = role;
            this.userId = userId;
            this.employeeId = employeeId;
            this.fullName = fullName;
            this.contact = contact;
            this.routeName = routeName;
            this.estateId = estateId;
            this.estateName = estateName;
            this.arcs = arcs;
            this.passbookNo = passbookNo;
            this.expiresIn = expiresIn;
            this.inChargeName = null;
            this.supplierId = null;
        }
    }

    @Data
    @AllArgsConstructor
    public static class UserResponse {
        private java.util.UUID userId;
        private String fullName;
        private String employeeId;
        private String email;
        private String role;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetailedUserResponse {
        private UUID userId;
        private String id; // employeeId or formatted PB-xxxx
        private String name;
        private String role;
        private String status;
        private String contact;
        private String email;
        private String active;
        private UUID estateId;
        private String estateName;
        private String nic;
        private java.time.LocalDate birthdate;
        
        // Supplier specific
        private String passbookNo;
        private String landName;
        private String address;
        private BigDecimal arcs;
        private String inChargeName;
        private UUID inChargeId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummaryListResponse {
        private String id; // employeeId
        private String userId; // UUID string
        private String name;
        private String role;
        private String status;
        private String active;
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
