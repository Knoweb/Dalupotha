package com.dalupotha.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tri_circulars")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TRICircular {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "circular_id", updatable = false, nullable = false)
    private UUID circularId;
    
    @Column(name = "display_id", length = 20)
    private String displayId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "content_url", nullable = false, length = 255)
    private String contentUrl;

    @CreationTimestamp
    @Column(name = "published_date", updatable = false)
    private LocalDateTime publishedDate;

    @Column(name = "target_audience", length = 50)
    @Builder.Default
    private String targetAudience = "ALL";

    @Column(name = "published_by_id")
    private UUID publishedById;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
