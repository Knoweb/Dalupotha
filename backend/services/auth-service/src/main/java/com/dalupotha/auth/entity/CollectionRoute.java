package com.dalupotha.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "collection_routes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "route_id", updatable = false, nullable = false)
    private UUID routeId;

    @Column(nullable = false)
    private String name;

    @Column(length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estate_id", nullable = false)
    @JsonIgnore
    private Estate estate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
