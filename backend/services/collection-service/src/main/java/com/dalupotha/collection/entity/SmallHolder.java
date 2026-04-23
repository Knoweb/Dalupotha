package com.dalupotha.collection.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "small_holders")
public class SmallHolder {

    @Id
    @Column(name = "supplier_id", nullable = false, updatable = false)
    private UUID supplierId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "passbook_no", nullable = false)
    private String passbookNo;

    @Column(name = "land_name", nullable = false)
    private String landName;

    @Column(name = "estate_id")
    private UUID estateId;

    @Column(name = "arcs", precision = 10, scale = 2)
    private BigDecimal arcs;

    public UUID getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(UUID supplierId) {
        this.supplierId = supplierId;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public String getPassbookNo() {
        return passbookNo;
    }

    public void setPassbookNo(String passbookNo) {
        this.passbookNo = passbookNo;
    }

    public String getLandName() {
        return landName;
    }

    public void setLandName(String landName) {
        this.landName = landName;
    }

    public UUID getEstateId() {
        return estateId;
    }

    public void setEstateId(UUID estateId) {
        this.estateId = estateId;
    }

    public BigDecimal getArcs() {
        return arcs;
    }

    public void setArcs(BigDecimal arcs) {
        this.arcs = arcs;
    }
}
