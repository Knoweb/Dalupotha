package com.dalupotha.collection.repository;

import com.dalupotha.collection.entity.SmallHolder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SmallHolderRepository extends JpaRepository<SmallHolder, UUID> {

    @Query("""
        select sh
        from SmallHolder sh
        join fetch sh.user u
        where (:estateId is null or sh.estateId = :estateId)
          and (
            :hasSearch = false
            or lower(u.fullName) like :searchPattern
            or lower(sh.passbookNo) like :searchPattern
          )
        order by u.fullName asc
        """)
    List<SmallHolder> searchSuppliers(
            @Param("estateId") UUID estateId,
            @Param("hasSearch") boolean hasSearch,
            @Param("searchPattern") String searchPattern,
            Pageable pageable
    );

    @Query("""
        select sh
        from SmallHolder sh
        join fetch sh.user u
        where sh.supplierId = :supplierId
        """)
    Optional<SmallHolder> findByIdWithUser(@Param("supplierId") UUID supplierId);
}
