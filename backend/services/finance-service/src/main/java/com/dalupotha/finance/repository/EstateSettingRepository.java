package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.EstateSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EstateSettingRepository extends JpaRepository<EstateSettingEntity, UUID> {
    Optional<EstateSettingEntity> findBySettingKey(String settingKey);
}
