package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.TransportAgent;
import com.dalupotha.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransportAgentRepository extends JpaRepository<TransportAgent, UUID> {
    Optional<TransportAgent> findByEmployeeId(String employeeId);
    Optional<TransportAgent> findByUser(User user);
    boolean existsByEmployeeId(String employeeId);
}
