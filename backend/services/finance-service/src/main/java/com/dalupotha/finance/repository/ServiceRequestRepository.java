package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.ServiceRequestEntity;
import com.dalupotha.finance.model.RequestStatus;
import com.dalupotha.finance.model.RequestType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequestEntity, UUID> {

    @Query("""
        select r from ServiceRequestEntity r
        where (:createdById is null or r.createdById = :createdById)
          and (:supplierId is null or r.supplierId = :supplierId)
          and (:requestType is null or r.requestType = :requestType)
          and (:status is null or r.status = :status)
        order by r.requestDate desc
    """)
    List<ServiceRequestEntity> search(
            @Param("createdById") UUID createdById,
            @Param("supplierId") UUID supplierId,
            @Param("requestType") RequestType requestType,
            @Param("status") RequestStatus status,
            Pageable pageable
    );
}
