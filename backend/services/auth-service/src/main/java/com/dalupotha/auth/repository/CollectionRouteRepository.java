package com.dalupotha.auth.repository;

import com.dalupotha.auth.entity.CollectionRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CollectionRouteRepository extends JpaRepository<CollectionRoute, UUID> {
    List<CollectionRoute> findByEstate_EstateId(UUID estateId);
    boolean existsByNameAndEstate_EstateId(String name, UUID estateId);
}
