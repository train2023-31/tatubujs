# Notification Filtering and Deletion - Fixes Applied

## Problems Fixed

### 1. ❌ School Admin Seeing All Notifications

**Problem:**
- School admins were seeing ALL notifications in their school
- This happened because the filter included `Notification.target_role.is_(None)`
- Any notification without a `target_role` was shown to everyone

**Root Cause:**
```python
# OLD CODE (WRONG):
query = query.filter(
    or_(
        Notification.target_role == user.user_role,
        Notification.target_role.is_(None),  # ❌ This shows all notifications without target_role
        Notification.target_user_ids.like(f'%{user.id}%')
    )
)
```

**Fix:**
- Removed `Notification.target_role.is_(None)` from all filters
- Now only shows notifications where:
  - `target_role` matches user's role, OR
  - User ID is in `target_user_ids`
- Notifications must have explicit targeting (no broadcast to everyone)

**New Code:**
```python
# Build conditions for targeting
conditions = []

# Condition 1: Role-based targeting
if user.user_role:
    conditions.append(Notification.target_role == user.user_role)

# Condition 2: User-specific targeting
user_id = user.id
conditions.append(
    or_(
        Notification.target_user_ids.like(f'%[{user_id}]%'),  # [1,2,3] format
        Notification.target_user_ids.like(f'%"{user_id}"%'),  # ["1","2","3"] format
        Notification.target_user_ids.like(f'%{user_id}%')     # Fallback
    )
)

# Apply filter - user must match either role OR be in target_user_ids
query = query.filter(or_(*conditions))
```

**Files Fixed:**
- `back/app/routes/notification_routes.py`:
  - `get_notifications()` - Line 219-226
  - `get_unread_count()` - Line 302-307
  - `mark_all_notifications_read()` - Line 384-388

---

### 2. ❌ Incorrect Unread Count

**Problem:**
- Unread count was calculated using the same broken filter
- It included notifications that users shouldn't see
- Count was higher than actual unread notifications

**Fix:**
- Applied the same fixed filtering logic to `get_unread_count()`
- Now counts only notifications the user is actually targeted for
- Excludes deleted notifications (see below)

---

### 3. ✅ Added Delete Notification Feature

**New Feature:**
- Users can now delete their own notifications
- Soft delete (per-user) - notification still exists but hidden from that user
- Other users can still see the notification if they're targeted

**Implementation:**

1. **New Model:** `NotificationDeleted`
   - Tracks which users deleted which notifications
   - Soft delete per user (notification not deleted globally)

2. **New Endpoint:** `DELETE /api/notifications/<id>/delete`
   - Verifies user has access to notification
   - Creates deletion record
   - Returns success/error

3. **Updated Filtering:**
   - All notification queries now exclude deleted notifications
   - Uses `NotificationDeleted` table to filter

4. **Frontend:**
   - Added `deleteNotification()` function in `NotificationContext`
   - Added delete button in `Notifications.js` page
   - Added delete button in `NotificationBell.js` dropdown

**Files Added/Modified:**

**Backend:**
- `back/app/models.py` - Added `NotificationDeleted` model
- `back/app/routes/notification_routes.py`:
  - Added `NotificationDeleted` import
  - Updated all queries to exclude deleted notifications
  - Added `delete_notification()` endpoint
- `back/migrations/add_notification_deleted_table.sql` - Migration script

**Frontend:**
- `frontend/src/contexts/NotificationContext.js` - Added `deleteNotification()`
- `frontend/src/pages/Notifications/Notifications.js` - Added delete button
- `frontend/src/components/Notifications/NotificationBell.js` - Added delete button

---

## How It Works Now

### Notification Filtering

**Before (WRONG):**
```
User sees notification if:
- target_role matches user's role, OR
- target_role is None (shows to everyone!), OR
- user ID in target_user_ids
```

**After (CORRECT):**
```
User sees notification if:
- target_role matches user's role, OR
- user ID in target_user_ids

NOT if target_role is None (invalid/broadcast notifications are hidden)
```

### Deletion

**Soft Delete (Per User):**
- When user deletes a notification, it's hidden from them only
- Other users can still see it if they're targeted
- Deletion is tracked in `notification_deleted` table
- Notification itself is not deleted (stays in database)

**Filtering:**
- All queries exclude notifications where user has a deletion record
- Works for:
  - `get_notifications()`
  - `get_unread_count()`
  - `mark_all_notifications_read()`

---

## Database Migration

### Run Migration

```sql
-- Run this SQL to create the notification_deleted table
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
```

Or use the migration file:
```bash
mysql -u username -p database_name < back/migrations/add_notification_deleted_table.sql
```

---

## API Endpoints

### Delete Notification

**Endpoint:** `DELETE /api/notifications/<notification_id>/delete`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "message": "Notification deleted successfully"
}
```

**Errors:**
- `404` - Notification not found or user not targeted
- `403` - Notification belongs to different school
- `500` - Server error

---

## Frontend Usage

### Delete Notification

```javascript
const { deleteNotification } = useNotifications();

// Delete a notification
await deleteNotification(notificationId);
```

**UI:**
- Delete button (trash icon) appears on each notification
- Click shows confirmation dialog
- After deletion, notification is removed from list
- Unread count is automatically updated

---

## Testing

### Test Filtering

1. **Create notification for specific teacher:**
   ```python
   create_notification(
       target_user_ids=[teacher_id],
       ...
   )
   ```

2. **Login as school admin:**
   - Should NOT see the notification
   - Only the targeted teacher should see it

3. **Create notification for all teachers:**
   ```python
   create_notification(
       target_role='teacher',
       ...
   )
   ```

4. **Login as school admin:**
   - Should NOT see the notification
   - Only teachers should see it

### Test Deletion

1. **View notifications:**
   - See list of notifications

2. **Click delete button:**
   - Confirm deletion
   - Notification disappears from list

3. **Check unread count:**
   - Count decreases if deleted notification was unread

4. **Refresh page:**
   - Deleted notification doesn't reappear

---

## Summary of Changes

### Backend
- ✅ Fixed notification filtering (removed `target_role.is_(None)`)
- ✅ Fixed unread count calculation
- ✅ Added `NotificationDeleted` model
- ✅ Added delete endpoint
- ✅ Updated all queries to exclude deleted notifications

### Frontend
- ✅ Added `deleteNotification()` function
- ✅ Added delete buttons in notification lists
- ✅ Added confirmation dialog

### Database
- ✅ Migration script for `notification_deleted` table

---

## Important Notes

1. **Targeting is Required:**
   - All notifications MUST have either `target_role` or `target_user_ids`
   - Notifications without targeting are hidden (considered invalid)

2. **Soft Delete:**
   - Deletion is per-user, not global
   - Notification remains in database
   - Other users can still see it

3. **Migration Required:**
   - Run the SQL migration to create `notification_deleted` table
   - Without this table, deletion won't work

4. **Backward Compatibility:**
   - Old notifications without targeting are now hidden
   - This is correct behavior (they shouldn't have been shown to everyone)

---

## Related Files

- `back/app/routes/notification_routes.py` - Fixed filtering and added delete
- `back/app/models.py` - Added NotificationDeleted model
- `back/migrations/add_notification_deleted_table.sql` - Migration script
- `frontend/src/contexts/NotificationContext.js` - Added deleteNotification
- `frontend/src/pages/Notifications/Notifications.js` - Added delete button
- `frontend/src/components/Notifications/NotificationBell.js` - Added delete button
