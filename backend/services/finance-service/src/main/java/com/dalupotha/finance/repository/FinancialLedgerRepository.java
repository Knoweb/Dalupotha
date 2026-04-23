package com.dalupotha.finance.repository;

import com.dalupotha.finance.entity.FinancialLedgerEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancialLedgerRepository extends JpaRepository<FinancialLedgerEntity, UUID> {
    List<FinancialLedgerEntity> findBySupplierIdOrderByTransactionDateDesc(UUID supplierId);
}
