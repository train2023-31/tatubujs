-- Script to check and create notification_preferences table if missing
-- Run this on your VPS database if you get 500 errors

-- 1. Check if table exists
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'notification_preferences';

-- 2. If table doesn't exist, create it:
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

-- 3. Verify table structure
DESCRIBE notification_preferences;

-- 4. Check existing data
SELECT COUNT(*) as total_preferences FROM notification_preferences;

-- 5. Create default preferences for existing users (optional)
-- INSERT INTO notification_preferences (user_id) 
-- SELECT id FROM users 
-- WHERE id NOT IN (SELECT user_id FROM notification_preferences);
