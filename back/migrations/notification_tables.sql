-- Notification System Database Migration
-- Run this SQL to create the necessary tables for the notification system
-- This file creates all tables needed for managing notifications, push subscriptions, and preferences

-- 1. Create notifications table (Main notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    school_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    target_role VARCHAR(50),
    target_user_ids TEXT,
    target_class_ids TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at DATETIME,
    action_url VARCHAR(500),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_school_id (school_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_target_role (target_role),
    INDEX idx_notifications_is_active (is_active),
    INDEX idx_notifications_expires_at (expires_at),
    INDEX idx_notifications_priority (priority)
);

-- 2. Create notification_reads table (Track which users read which notifications)
CREATE TABLE IF NOT EXISTS notification_reads (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_notification_read (notification_id, user_id),
    INDEX idx_notification_reads_user_id (user_id),
    INDEX idx_notification_reads_notification_id (notification_id),
    INDEX idx_notification_reads_read_at (read_at)
);

-- 3. Create push_subscriptions table (Store push notification subscriptions for PWA)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    device_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_subscription (user_id, endpoint(255)),
    INDEX idx_push_subscriptions_user_id (user_id),
    INDEX idx_push_subscriptions_is_active (is_active),
    INDEX idx_push_subscriptions_last_used (last_used_at)
);

-- 4. Create notification_preferences table (User notification preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    behavior_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timetable_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    substitution_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    news_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    general_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_preferences_user_id (user_id)
);

-- Verify tables were created
SELECT 
    'notifications' as table_name, 
    COUNT(*) as record_count 
FROM notifications
UNION ALL
SELECT 
    'notification_reads' as table_name, 
    COUNT(*) as record_count 
FROM notification_reads
UNION ALL
SELECT 
    'push_subscriptions' as table_name, 
    COUNT(*) as record_count 
FROM push_subscriptions
UNION ALL
SELECT 
    'notification_preferences' as table_name, 
    COUNT(*) as record_count 
FROM notification_preferences;

-- Notes:
-- 1. All tables use InnoDB engine (default) for foreign key support and transactions
-- 2. Foreign keys use CASCADE on DELETE to automatically clean up related records
-- 3. Indexes are added for performance optimization on frequently queried columns
-- 4. The unique constraint on notification_reads ensures users can't mark the same notification as read multiple times
-- 5. The unique constraint on push_subscriptions prevents duplicate subscriptions for the same user/endpoint
-- 6. The user_id in notification_preferences is unique to ensure one preference record per user
-- 7. All timestamps use CURRENT_TIMESTAMP for automatic date/time tracking
-- 8. Notification types: 'attendance', 'bus', 'behavior', 'timetable', 'substitution', 'news', 'general'
-- 9. Priority levels: 'low', 'normal', 'high', 'urgent'
-- 10. Target roles: 'student', 'teacher', 'school_admin', 'data_analyst', 'driver', 'admin'

-- Sample data insertion (optional - for testing)
-- INSERT INTO notification_preferences (user_id) 
-- SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM notification_preferences);
