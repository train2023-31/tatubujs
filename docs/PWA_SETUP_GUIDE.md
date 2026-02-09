# PWA Setup and Push Notifications Guide

## Overview

This project is a Progressive Web App (PWA) that supports:
- ✅ **Offline functionality** (caching)
- ✅ **Push notifications** (background & foreground)
- ✅ **Install to home screen** (Android, iOS 16.4+, Desktop)
- ✅ **VAPID Web Push** (no Firebase needed)

---

## Architecture

### Frontend (React)
- **Service Worker**: `/frontend/public/service-worker.js`
- **Manifest**: `/frontend/public/manifest.json`
- **Registration**: `/frontend/src/index.js`
- **Push Hook**: `/frontend/src/hooks/usePushNotifications.js`
- **Environment**: `/frontend/.env`

### Backend (Flask)
- **Push Routes**: `/back/app/routes/notification_routes.py`
- **Push Service**: `/back/app/services/notification_service.py`
- **Config**: `/back/app/config.py`
- **VAPID Generator**: `/back/generate_vapid_keys.py`

---

## Initial Setup

### 1. Generate VAPID Keys

VAPID keys are required for Web Push notifications.

```bash
cd back
python generate_vapid_keys.py
```

This will output:
- **Public key** → Add to `frontend/.env`
- **Private key** → Add to `back/.env` (keep secret!)

### 2. Configure Frontend Environment

Edit `frontend/.env`:

```env
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here
```

### 3. Configure Backend Environment

Create `back/.env` (use `back/.env.example` as template):

```env
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_CLAIM_EMAIL=mailto:admin@yourdomain.com
```

### 4. Install Backend Dependencies

```bash
cd back
pip install -r requirements.txt
```

Key package: `pywebpush==1.14.1`

---

## Development

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000` by default.

**For HTTPS (required for PWA features in production):**

```bash
npm run dev
# or
npm run start:https
```

### Backend (Flask)

```bash
cd back
python run.py
```

Runs on `http://localhost:5000` by default.

---

## Testing Push Notifications

### 1. Request Permission

Use the `usePushNotifications` hook:

```javascript
import { usePushNotifications } from '../hooks/usePushNotifications';

function MyComponent() {
  const { subscribe, isSubscribed, isLoading } = usePushNotifications();
  
  return (
    <button onClick={subscribe} disabled={isLoading}>
      {isSubscribed ? 'Subscribed ✓' : 'Subscribe to Notifications'}
    </button>
  );
}
```

### 2. Send Test Notification

From frontend:

```javascript
const { sendTestNotification } = usePushNotifications();
sendTestNotification();
```

From backend (Python):

```python
from app.routes.notification_routes import create_notification

create_notification(
    school_id=1,
    title="Test Notification",
    message="This is a test push notification",
    notification_type="general",
    created_by=1,
    target_role="student"  # or target_user_ids=[1,2,3]
)
```

### 3. Backend API Endpoint

```bash
POST /api/notifications
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Test",
  "message": "Hello world",
  "type": "general",
  "priority": "normal",
  "target_role": "student"
}
```

---

## How Push Notifications Work

### Flow Diagram

```
User Browser                  Frontend                Backend (Flask)
     |                           |                           |
     |-- Request Permission ---->|                           |
     |<-- "Granted" -------------|                           |
     |                           |                           |
     |                           |-- Subscribe (VAPID) ----->|
     |                           |<-- Subscription Object ---|
     |                           |                           |
     |                           |-- POST /subscribe ------->|
     |                           |<-- 201 Created -----------|
     |                           |                           |
     |                           |                           |-- Create Notification
     |                           |                           |   (triggers send_push_notification)
     |                           |                           |
     |<------------------------- Push Message ---------------|
     |                           |                           |
     |-- Show Notification       |                           |
     |                           |                           |
     |-- Click Notification      |                           |
     |-- Open App/URL ---------->|                           |
```

### Key Components

#### 1. Service Worker (`service-worker.js`)

Handles:
- Push event (`push`)
- Notification click (`notificationclick`)
- Background sync
- Offline caching

#### 2. Push Subscription

When user subscribes:
1. Browser generates encryption keys
2. Subscription object sent to backend
3. Backend stores in `PushSubscription` table

Subscription object:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "encryption-key",
    "auth": "auth-token"
  }
}
```

#### 3. Backend Push Sender

Uses `pywebpush` library:

```python
from pywebpush import webpush

webpush(
    subscription_info={
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh_key,
            "auth": subscription.auth_key
        }
    },
    data=json.dumps({
        "title": "Hello",
        "message": "World"
    }),
    vapid_private_key=VAPID_PRIVATE_KEY,
    vapid_claims={"sub": "mailto:admin@example.com"}
)
```

---

## Browser Support

### Desktop

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 42+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| Firefox | 44+ | ✅ Full |
| Safari | 16+ | ✅ Full |

### Mobile

| OS | Browser | Version | Support |
|----|---------|---------|---------|
| Android | Chrome | All | ✅ Full |
| iOS | Safari | 16.4+ | ✅ Full |
| iOS | Chrome | - | ⚠️ Uses Safari engine |

**Note**: On iOS, all browsers use Safari's WebKit engine.

---

## iOS Specific Considerations

### iOS 16.4+ Requirements

1. **Add to Home Screen**: User must install the PWA first
2. **Standalone Mode**: Push only works in standalone mode
3. **Manifest**: Must have valid `manifest.json`
4. **HTTPS**: Required (except localhost)

### Testing on iOS

1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. Open from home screen (not browser)
4. Grant notification permission
5. Test push notifications

### iOS Limitations

- No background push if app is force-closed
- Notifications expire after 7 days
- Limited notification actions

---

## Deployment

### Production Checklist

- [ ] Generate production VAPID keys
- [ ] Set `VAPID_PRIVATE_KEY` in backend .env (keep secret!)
- [ ] Set `REACT_APP_VAPID_PUBLIC_KEY` in frontend .env
- [ ] Set `VAPID_CLAIM_EMAIL` to your real email
- [ ] Serve frontend over HTTPS
- [ ] Serve backend over HTTPS
- [ ] Configure CORS for your domain
- [ ] Test on multiple devices (Android, iOS, Desktop)
- [ ] Add proper icons (192x192, 512x512)
- [ ] Test offline functionality

### HTTPS Setup

**Frontend (nginx example):**

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

**Backend (Flask with gunicorn):**

```bash
gunicorn -w 4 -b 0.0.0.0:5000 --certfile=cert.pem --keyfile=key.pem run:app
```

Or use a reverse proxy (nginx/Apache).

---

## Troubleshooting

### Push Notifications Not Working

#### 1. Check Permission

```javascript
console.log('Notification permission:', Notification.permission);
```

If "denied", user must manually enable in browser settings.

#### 2. Check Service Worker

```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
});
```

Should show active service worker.

#### 3. Check Subscription

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

Should show endpoint and keys.

#### 4. Check Backend Logs

Look for:
```
✅ Push notification sent to user X
```

Or errors:
```
❌ Error sending push to user X: ...
```

#### 5. Check VAPID Keys

Frontend:
```javascript
console.log('VAPID Public Key:', process.env.REACT_APP_VAPID_PUBLIC_KEY);
```

Backend:
```python
print('VAPID Private Key:', Config.VAPID_PRIVATE_KEY)
```

Both should be non-empty base64 strings (87-88 characters).

### Common Issues

**Issue**: "Service worker registration failed"
- **Fix**: Check console for errors. Ensure service worker file exists at `/service-worker.js`

**Issue**: "Push subscription failed"
- **Fix**: Check VAPID public key is set in `.env` and matches backend

**Issue**: "Notifications not showing on iOS"
- **Fix**: Ensure app is installed to home screen and opened in standalone mode

**Issue**: "Backend error: 401 Unauthorized"
- **Fix**: VAPID keys don't match. Regenerate and update both frontend and backend

**Issue**: "Subscription expired (410 error)"
- **Fix**: Service worker marks as inactive automatically. User needs to resubscribe

---

## Database Schema

### PushSubscription Table

```sql
CREATE TABLE push_subscription (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Notification Table

```sql
CREATE TABLE notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    target_role VARCHAR(50),
    target_user_ids TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## API Reference

### Subscribe to Push

```http
POST /api/notifications/subscribe
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response**: 201 Created

### Unsubscribe

```http
POST /api/notifications/unsubscribe
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response**: 200 OK

### Create Notification

```http
POST /api/notifications
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Title",
  "message": "Message body",
  "type": "general",
  "priority": "normal",
  "target_role": "student",
  "action_url": "/app/dashboard"
}
```

**Response**: 201 Created

### Get Notifications

```http
GET /api/notifications?page=1&per_page=20&unread_only=true
Authorization: Bearer <jwt-token>
```

**Response**: 200 OK

---

## Security Best Practices

1. **Never expose VAPID private key** in frontend or logs
2. **Use HTTPS** in production (required for PWA)
3. **Validate JWT tokens** before sending notifications
4. **Rate limit** notification endpoints
5. **Expire old subscriptions** (check `last_used_at`)
6. **Sanitize notification content** to prevent XSS
7. **Implement user preferences** for notification types
8. **Log subscription changes** for audit trail

---

## Performance Optimization

1. **Batch notifications** for multiple users
2. **Use background threads** for sending push (already implemented)
3. **Cache service worker** assets aggressively
4. **Minimize payload size** (max ~4KB)
5. **Remove inactive subscriptions** periodically
6. **Use Redis** for rate limiting
7. **Index database** on `user_id`, `endpoint`, `is_active`

---

## Resources

- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web.dev: PWA Guide](https://web.dev/progressive-web-apps/)
- [pywebpush Documentation](https://github.com/web-push-libs/pywebpush)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

---

## License

This PWA implementation is part of the Tatubu School Management System.

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console and backend logs
3. Verify VAPID keys are correctly configured
4. Test on different devices and browsers

Last updated: February 2026
