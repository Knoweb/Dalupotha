package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.Estate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EstateRepository extends JpaRepository<Estate, UUID> {
    Optional<Estate> findByCode(String code);
}
