package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.LeafPriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LeafPriceRepository extends JpaRepository<LeafPriceEntity, UUID> {
    Optional<LeafPriceEntity> findFirstByIsActiveTrueOrderByEffectiveDateDesc();

    @org.springframework.data.jpa.repository.Query("select lp from LeafPriceEntity lp where lp.isActive = true and (lp.estateId = :estateId or lp.estateId is null) order by lp.estateId asc nulls last, lp.effectiveDate desc")
    java.util.List<LeafPriceEntity> findActivePriceByEstate(@org.springframework.data.repository.query.Param("estateId") UUID estateId);

    @org.springframework.data.jpa.repository.Query("select lp from LeafPriceEntity lp where lp.estateId = :estateId or (lp.estateId is null and :estateId is null)")
    java.util.List<LeafPriceEntity> findAllByEstateId(@org.springframework.data.repository.query.Param("estateId") UUID estateId);
}
