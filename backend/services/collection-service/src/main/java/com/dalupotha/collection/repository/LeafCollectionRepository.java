package com.dalupotha.collection.repository;

import com.dalupotha.collection.entity.LeafCollection;
import com.dalupotha.collection.entity.SyncStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LeafCollectionRepository extends JpaRepository<LeafCollection, UUID> {

    @Query("""
        select lc
        from LeafCollection lc
        left join fetch lc.supplier sh
        left join fetch sh.user u
        where lc.transportAgentId = :transportAgentId
          and (:status is null or lc.syncStatus = :status)
        order by lc.collectedAt desc
        """)
    List<LeafCollection> findByAgentHistory(
            @Param("transportAgentId") UUID transportAgentId,
            @Param("status") SyncStatus status,
            Pageable pageable
    );

    @Query("""
        select lc
        from LeafCollection lc
        left join fetch lc.supplier sh
        left join fetch sh.user u
        where sh.supplierId = :supplierId
        order by lc.collectedAt desc
        """)
    List<LeafCollection> findBySupplierHistory(
            @Param("supplierId") UUID supplierId,
            Pageable pageable
    );
}
