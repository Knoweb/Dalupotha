package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.EstateSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EstateSettingRepository extends JpaRepository<EstateSettingEntity, UUID> {
    Optional<EstateSettingEntity> findBySettingKey(String settingKey);

    @org.springframework.data.jpa.repository.Query("select s from EstateSettingEntity s where s.settingKey = :settingKey and (s.estateId = :estateId or s.estateId is null) order by s.estateId asc nulls last")
    java.util.List<EstateSettingEntity> findByKeyAndEstate(@org.springframework.data.repository.query.Param("settingKey") String settingKey, @org.springframework.data.repository.query.Param("estateId") UUID estateId);
}
