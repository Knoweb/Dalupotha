package com.dalupotha.inventory.repository;

import com.dalupotha.inventory.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<InventoryItem, UUID> {
    List<InventoryItem> findByItemCategory(String itemCategory);

    @org.springframework.data.jpa.repository.Query("select i from InventoryItem i where i.estateId = :estateId or i.estateId is null")
    List<InventoryItem> findByEstateId(@org.springframework.data.repository.query.Param("estateId") UUID estateId);
}
