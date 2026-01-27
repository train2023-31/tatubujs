-- Migration: Add notification_deleted table
-- This table tracks which users have deleted which notifications (soft delete per user)
-- Run this SQL to add the table

CREATE TABLE IF NOT EXISTS notification_deleted (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_notification_deleted (notification_id, user_id),
    INDEX idx_notification_deleted_user_id (user_id),
    INDEX idx_notification_deleted_notification_id (notification_id),
    INDEX idx_notification_deleted_deleted_at (deleted_at)
);

-- Verify table was created
SELECT 
    'notification_deleted' as table_name,
    COUNT(*) as record_count 
FROM notification_deleted;
