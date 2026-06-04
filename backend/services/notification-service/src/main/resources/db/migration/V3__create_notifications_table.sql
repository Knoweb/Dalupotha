-- ==========================================
-- notification_db :: V3 — Create notifications table
-- ==========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    target_role VARCHAR(50) NOT NULL,
    estate_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_notifications_target_role ON notifications(target_role);
CREATE INDEX idx_notifications_estate_id ON notifications(estate_id);
