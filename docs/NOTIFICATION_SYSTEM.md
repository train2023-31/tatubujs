# Notification System Documentation

## Overview

This project now includes a comprehensive notification system that supports:
- Real-time in-app notifications
- PWA push notifications (works when app is installed on home screen)
- Role-based notification targeting
- User-specific notification preferences
- Multiple notification types (attendance, bus, behavior, timetable, substitution, news, general)

## Features

### 1. Database Models

#### Notification
- Stores notification content, type, priority, and targeting information
- Supports role-based targeting (all teachers, all students, etc.)
- Supports user-specific targeting (individual users or classes)
- Links to related entities (attendance records, bus scans, etc.)
- Includes action URLs for deep linking

#### NotificationRead
- Tracks which users have read which notifications
- Prevents duplicate read records

#### PushSubscription
- Stores browser push notification subscriptions
- Supports multiple devices per user
- Tracks subscription status and last usage

#### NotificationPreference
- User-specific notification preferences
- Control which notification types to receive
- Enable/disable push notifications

### 2. Backend API

#### Notification Routes (`/api/notifications`)

**GET `/api/notifications`**
- Fetch notifications for current user
- Query parameters:
  - `page`: Page number (default: 1)
  - `per_page`: Items per page (default: 20)
  - `unread_only`: Show only unread (true/false)
  - `type`: Filter by notification type

**GET `/api/notifications/unread-count`**
- Get count of unread notifications

**POST `/api/notifications/:id/read`**
- Mark a notification as read

**POST `/api/notifications/mark-all-read`**
- Mark all notifications as read

**POST `/api/notifications`**
- Create a new notification (admin/teacher only)

**POST `/api/notifications/subscribe`**
- Subscribe to push notifications
- Body: `{ endpoint, keys: { p256dh, auth } }`

**POST `/api/notifications/unsubscribe`**
- Unsubscribe from push notifications

**GET `/api/notifications/preferences`**
- Get user notification preferences

**PUT `/api/notifications/preferences`**
- Update user notification preferences

### 3. Frontend Components

#### NotificationBell
- Bell icon in header showing unread count
- Dropdown with recent notifications
- Filter by notification type
- Mark as read functionality

#### NotificationPreferences
- Toggle notification types on/off
- Enable/disable push notifications
- Save preferences

#### Notifications Page
- Full-page view of all notifications
- Pagination support
- Filter by type
- Mark all as read

### 4. PWA Push Notifications

#### Service Worker (`/service-worker.js`)
- Handles push notification events
- Shows notifications even when app is closed
- Supports notification actions (view, close)
- Caches app resources for offline use

#### Setup Requirements
1. App must be installed on home screen (PWA)
2. User must grant notification permission
3. User must subscribe to push notifications

## Integration Points

### Attendance System
- Notifies students when marked absent
- Notifies admins when multiple students are absent
- Priority: normal to high

### Bus Tracking System
- Notifies students when they board/exit bus
- Real-time updates for parents/guardians
- Priority: normal

### Timetable System
- Notifies teachers when new timetable is uploaded
- Notifies admins of timetable changes
- Priority: high

### Substitution System
- Notifies absent teacher when substitution is created
- Notifies substitute teachers of their assignments
- Notifies admins of new substitutions
- Priority: high

### Behavior Notes
- Can be integrated to notify students/parents of behavior notes
- Priority: normal to high

## Usage Examples

### Creating a Notification (Backend)

```python
from app.routes.notification_routes import create_notification

# Notify all teachers
create_notification(
    school_id=1,
    title="اجتماع هام",
    message="اجتماع المعلمين غداً الساعة 10 صباحاً",
    notification_type='general',
    created_by=admin_user_id,
    priority='high',
    target_role='teacher',
    action_url='/app/news'
)

# Notify specific student
create_notification(
    school_id=1,
    title="غياب",
    message="تم تسجيل غيابك اليوم",
    notification_type='attendance',
    created_by=teacher_id,
    priority='normal',
    target_user_ids=[student_id],
    related_entity_type='attendance',
    related_entity_id=attendance_id,
    action_url='/app/attendance-details'
)
```

### Using Notifications (Frontend)

```javascript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    subscribeToPush
  } = useNotifications();

  // Subscribe to push notifications
  const handleSubscribe = async () => {
    const success = await subscribeToPush();
    if (success) {
      console.log('Subscribed to push notifications');
    }
  };

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <button onClick={handleSubscribe}>Enable Notifications</button>
    </div>
  );
}
```

## Database Migration

Run the migration to create notification tables:

```bash
cd back
# Update the down_revision in add_notification_system.py with your latest migration ID
flask db upgrade
```

## Environment Variables

Add to your `.env` file:

```
# Optional: VAPID keys for web push (generate using web-push library)
REACT_APP_VAPID_PUBLIC_KEY=your_public_key_here
```

## Testing

### Test Push Notifications

1. Install the app on your home screen (PWA)
2. Grant notification permission when prompted
3. Go to Notification Settings
4. Enable push notifications
5. Create a test notification from the backend
6. You should receive a push notification even with the app closed

### Test In-App Notifications

1. Log in as a teacher
2. Mark a student as absent
3. Log in as that student
4. Click the bell icon in the header
5. You should see the absence notification

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari iOS: Limited (no background push, requires app open)
- Safari macOS: Full support (macOS 13+)

## Security Considerations

1. Notifications are filtered by school_id to prevent cross-school access
2. Role-based targeting ensures users only see relevant notifications
3. Push subscriptions are tied to user accounts
4. Notification preferences are user-specific

## Future Enhancements

- [ ] Email notifications for critical alerts
- [ ] SMS notifications integration
- [ ] Notification scheduling
- [ ] Rich notifications with images
- [ ] Notification templates
- [ ] Analytics dashboard
- [ ] Batch notification sending
- [ ] Notification history export

## Troubleshooting

### Push notifications not working

1. Check if service worker is registered: `navigator.serviceWorker.getRegistration()`
2. Check notification permission: `Notification.permission`
3. Check if subscribed: Look in browser DevTools > Application > Service Workers
4. Check browser console for errors
5. Ensure HTTPS is enabled (required for push notifications)

### Notifications not showing

1. Check user notification preferences
2. Verify school_id matches
3. Check if notification is expired
4. Verify role targeting is correct

## API Reference

See the full API documentation in the backend routes:
- `back/app/routes/notification_routes.py`

## Contributing

When adding new notification types:
1. Add the type to the database enum
2. Add icon and label in frontend components
3. Update notification preferences
4. Add integration in relevant backend routes
5. Test thoroughly

---

**Version:** 1.0.0  
**Last Updated:** January 2026
