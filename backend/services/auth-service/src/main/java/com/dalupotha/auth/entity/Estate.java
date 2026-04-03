package com.dalupotha.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "estates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Estate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "estate_id")
    private UUID estateId;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
