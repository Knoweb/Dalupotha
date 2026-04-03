package com.dalupotha.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "small_holders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SmallHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "supplier_id", updatable = false, nullable = false)
    private UUID supplierId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "passbook_no", nullable = false, unique = true)
    private String passbookNo;

    @Column(name = "land_name", nullable = false)
    private String landName;

    @Column(name = "address")
    private String address;

    @Column(name = "gps_lat", precision = 10, scale = 8)
    private BigDecimal gpsLat;

    @Column(name = "gps_long", precision = 11, scale = 8)
    private BigDecimal gpsLong;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "in_charge_id")
    private User inCharge;  // EXT officer

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estate_id")
    private Estate estate;

    @Column(name = "arcs", precision = 10, scale = 2)
    private BigDecimal arcs;

    @Column(name = "registered_at", updatable = false)
    private LocalDateTime registeredAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        registeredAt = LocalDateTime.now();
        updatedAt    = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
