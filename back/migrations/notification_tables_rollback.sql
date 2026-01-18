-- Notification System Rollback Script
-- Run this SQL to remove all notification system tables
-- WARNING: This will delete all notification data permanently!

-- Check tables before deletion
SELECT 
    'Before Deletion' as status,
    'notifications' as table_name, 
    COUNT(*) as record_count 
FROM notifications
UNION ALL
SELECT 
    'Before Deletion' as status,
    'notification_reads' as table_name, 
    COUNT(*) as record_count 
FROM notification_reads
UNION ALL
SELECT 
    'Before Deletion' as status,
    'push_subscriptions' as table_name, 
    COUNT(*) as record_count 
FROM push_subscriptions
UNION ALL
SELECT 
    'Before Deletion' as status,
    'notification_preferences' as table_name, 
    COUNT(*) as record_count 
FROM notification_preferences;

-- Disable foreign key checks temporarily (for easier deletion)
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse order (child tables first)
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS notification_reads;
DROP TABLE IF EXISTS notifications;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify tables were deleted
SELECT 
    TABLE_NAME 
FROM 
    INFORMATION_SCHEMA.TABLES 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('notifications', 'notification_reads', 'push_subscriptions', 'notification_preferences');

-- If no results, tables were successfully deleted
-- Note: If you see any table names, they weren't deleted. Check for foreign key constraints.
