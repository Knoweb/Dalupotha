package com.dalupotha.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "otp_codes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtpCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "otp_id", updatable = false, nullable = false)
    private UUID otpId;

    @Column(name = "contact", nullable = false)
    private String contact;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "purpose", nullable = false)
    private String purpose = "LOGIN";

    @Column(name = "is_used", nullable = false)
    private boolean isUsed = false;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
