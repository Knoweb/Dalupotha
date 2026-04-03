package com.dalupotha.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transport_agents")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID transportAgentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "employee_id", unique = true, nullable = false)
    private String employeeId;

    @Column(name = "vehicle_no")
    private String vehicleNo;

    @Column(name = "route_name")
    private String routeName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estate_id")
    private Estate estate;

    @CreationTimestamp
    private LocalDateTime registeredAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
