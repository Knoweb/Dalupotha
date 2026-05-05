package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.LeafPriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LeafPriceRepository extends JpaRepository<LeafPriceEntity, UUID> {
    Optional<LeafPriceEntity> findFirstByIsActiveTrueOrderByEffectiveDateDesc();
}
