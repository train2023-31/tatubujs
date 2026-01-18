# Notification System Migration Guide

## Overview
This guide explains how to set up the notification system database tables.

## Files Created
- `notification_tables.sql` - SQL script to create all notification tables
- `versions/add_notification_system.py` - Alembic migration (alternative method)

## Method 1: Direct SQL Execution (Recommended for Manual Setup)

### MySQL/MariaDB
```bash
# Connect to your database
mysql -u root -p db

# Run the migration
source back/migrations/notification_tables.sql;

# Or using command line
mysql -u root -p db < back/migrations/notification_tables.sql
```

### Using Python
```python
# In Python console or script
from app import db
from sqlalchemy import text

# Read and execute SQL file
with open('back/migrations/notification_tables.sql', 'r') as f:
    sql_commands = f.read()
    
# Split by semicolons and execute each statement
for command in sql_commands.split(';'):
    if command.strip():
        db.session.execute(text(command))
        
db.session.commit()
print("✅ Notification tables created successfully!")
```

## Method 2: Using Alembic (Recommended for Version Control)

### Update Migration File
1. Open `back/migrations/versions/add_notification_system.py`
2. Update the `down_revision` line with your latest migration ID:
   ```python
   down_revision = 'YOUR_LATEST_MIGRATION_ID'  # Find from alembic_version table
   ```

### Run Migration
```bash
cd back

# Check current migration status
flask db current

# Run the migration
flask db upgrade

# Verify tables were created
flask db current
```

## Verification

### Check Tables Exist
```sql
-- MySQL/MariaDB
SHOW TABLES LIKE 'notification%';
SHOW TABLES LIKE 'push_subscriptions';

-- Expected output:
-- notifications
-- notification_reads
-- notification_preferences
-- push_subscriptions
```

### Check Table Structure
```sql
-- View table structure
DESCRIBE notifications;
DESCRIBE notification_reads;
DESCRIBE push_subscriptions;
DESCRIBE notification_preferences;
```

### Verify Indexes
```sql
-- Check indexes on notifications table
SHOW INDEX FROM notifications;

-- Check foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_SCHEMA = 'db'
    AND TABLE_NAME IN ('notifications', 'notification_reads', 'push_subscriptions', 'notification_preferences');
```

## Tables Created

### 1. notifications
Main table storing all notifications
- **Columns**: id, school_id, title, message, type, priority, target_role, etc.
- **Indexes**: school_id, type, created_at, target_role, is_active
- **Foreign Keys**: school_id → schools, created_by → users

### 2. notification_reads
Tracks which users have read which notifications
- **Columns**: id, notification_id, user_id, read_at
- **Unique Constraint**: (notification_id, user_id)
- **Foreign Keys**: notification_id → notifications, user_id → users

### 3. push_subscriptions
Stores PWA push notification subscriptions
- **Columns**: id, user_id, endpoint, p256dh_key, auth_key, device_name, etc.
- **Unique Constraint**: (user_id, endpoint)
- **Foreign Keys**: user_id → users

### 4. notification_preferences
User notification settings
- **Columns**: id, user_id, attendance_enabled, bus_enabled, etc.
- **Unique Constraint**: user_id
- **Foreign Keys**: user_id → users

## Post-Migration Steps

### 1. Create Default Preferences for Existing Users
```sql
-- Create notification preferences for all existing users
INSERT INTO notification_preferences (user_id) 
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences);
```

### 2. Test Notification Creation
```python
from app.routes.notification_routes import create_notification

# Test notification
notification = create_notification(
    school_id=1,
    title="Test Notification",
    message="Testing the notification system",
    notification_type='general',
    created_by=1,  # Admin user ID
    priority='normal'
)

if notification:
    print("✅ Notification created successfully!")
else:
    print("❌ Failed to create notification")
```

### 3. Test via API
```bash
# Get notifications (requires authentication)
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unread count
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get preferences
curl -X GET http://localhost:5000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback (If Needed)

### Drop All Notification Tables
```sql
-- Drop in reverse order due to foreign keys
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS notification_reads;
DROP TABLE IF EXISTS notifications;
```

### Using Alembic
```bash
# Downgrade one step
flask db downgrade -1

# Or downgrade to specific revision
flask db downgrade REVISION_ID
```

## Troubleshooting

### Error: Table already exists
```sql
-- Check if tables exist
SHOW TABLES LIKE 'notification%';

-- If they exist but are empty/incorrect, drop them:
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS notification_reads;
DROP TABLE IF EXISTS notifications;

-- Then re-run the migration
```

### Error: Foreign key constraint fails
- Ensure `schools` and `users` tables exist before running migration
- Check that foreign key columns have matching data types

### Error: Cannot add index
- Check for duplicate entries in columns with unique constraints
- Verify column types match index requirements

## Database Requirements

- **MySQL**: 5.7 or higher
- **MariaDB**: 10.2 or higher
- **InnoDB**: Required for foreign key support

## Performance Considerations

- Indexes are created on frequently queried columns
- Consider adding composite indexes if needed:
  ```sql
  CREATE INDEX idx_notifications_school_type_active 
  ON notifications(school_id, type, is_active);
  ```

## Security Notes

1. **Sensitive Data**: Push subscription keys are stored but encrypted in transit
2. **Access Control**: Notifications filtered by school_id and role
3. **Data Retention**: Consider archiving old notifications periodically

## Next Steps

After successful migration:
1. ✅ Test notification creation
2. ✅ Configure PWA push notifications
3. ✅ Set up notification preferences UI
4. ✅ Test with different user roles
5. ✅ Monitor notification performance

---

**Last Updated**: January 2026  
**Database Version**: 1.0.0
