# Background Notifications Guide

This guide explains how background push notifications work on mobile devices, Windows, and Mac.

## How It Works

### When App is in Background or Closed

1. **Backend sends push notification**:
   - When a notification is created (e.g., student absent, bus scan, timetable update)
   - The `send_push_notification()` function automatically sends push notifications to all subscribed users
   - Uses Web Push Protocol with VAPID authentication

2. **Service Worker receives push event**:
   - The service worker runs independently of the main app
   - It receives push events even when the app is closed or in background
   - Works on:
     - **Mobile (iOS/Android)**: When app is in background or closed
     - **Windows/Mac**: When browser tab is minimized or in background
     - **PWA**: When installed as a standalone app

3. **Browser shows notification**:
   - Service worker displays a browser notification
   - Sound plays automatically (if configured)
   - Vibration occurs on mobile devices (if supported)
   - Notification appears in system notification center

4. **User clicks notification**:
   - Opens the app (or focuses existing window)
   - Navigates to the relevant page
   - Marks notification as read

## Setup Requirements

> **Note**: If your backend is on a VPS server, see [VPS_SETUP_NOTIFICATIONS.md](./VPS_SETUP_NOTIFICATIONS.md) for detailed VPS-specific instructions.

### 1. Install pywebpush

**Local Development:**
```bash
pip install pywebpush==1.14.0
```

**VPS Server:**
```bash
ssh user@your-vps-ip
cd /path/to/tatubujs/back
source venv/bin/activate  # if using virtual environment
pip install pywebpush==1.14.0
```

### 2. Generate VAPID Keys

**Option 1: Using the provided script (Easiest)**

```bash
cd back
python generate_vapid_keys.py
```

This will generate and display both keys with instructions.

**Option 2: Using py_vapid library**

```bash
pip install py_vapid
python -c "from py_vapid import Vapid01; v = Vapid01(); print('Private Key:', v.private_key.pem); print('Public Key:', v.public_key.pem)"
```

**Option 3: Online generator**

You can also use an online VAPID key generator: https://web-push-codelab.glitch.me/

### 3. Set Environment Variables

```bash
# Backend (.env or environment)
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_CLAIM_EMAIL=admin@tatubu.com

# Frontend (.env)
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here  # Must match backend
```

### 4. User Subscription

Users must:
1. Open the app in a browser
2. Grant notification permissions when prompted
3. Go to Notification Settings
4. Enable "Push Notifications"

## Platform-Specific Behavior

### Mobile Devices (iOS/Android)

- **Background**: Notifications appear in system notification center
- **Closed**: Notifications still appear (service worker is active)
- **Sound**: Plays system notification sound
- **Vibration**: Works on supported devices
- **PWA**: Works when installed to home screen

### Windows/Mac Desktop

- **Background Tab**: Notification appears in system tray/notification center
- **Minimized Browser**: Notification still appears
- **Sound**: Plays system notification sound
- **Click Action**: Opens/focuses browser tab

### Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 16.4+, macOS)
- ⚠️ Opera (Limited support)

## Testing Background Notifications

### Test on Mobile

1. Install the app on your phone (add to home screen)
2. Grant notification permissions
3. Enable push notifications in settings
4. **Close the app completely** (swipe away from recent apps)
5. Create a notification from backend (e.g., mark student absent)
6. You should receive a notification with sound

### Test on Desktop

1. Open the app in a browser
2. Grant notification permissions
3. Enable push notifications in settings
4. **Minimize the browser or switch to another tab**
5. Create a notification from backend
6. You should see a notification in the system tray/notification center

### Test When App is Closed

1. Close the browser completely (or close the PWA)
2. Create a notification from backend
3. You should still receive the notification
4. Clicking it will open the app

## Troubleshooting

### Notifications Not Appearing

1. **Check Permissions**:
   - Browser must have notification permissions granted
   - Check browser settings → Notifications

2. **Check Subscription**:
   - Verify user has subscribed to push notifications
   - Check `push_subscriptions` table in database
   - Subscription must be active (`is_active = true`)

3. **Check VAPID Keys**:
   - Public key must match in frontend and backend
   - Private key must be set in backend
   - Regenerate keys if needed

4. **Check Service Worker**:
   - Service worker must be registered
   - Check browser console for service worker errors
   - Use `sw-diagnostic.html` to diagnose issues

5. **Check Backend Logs**:
   - Look for "✅ Push notification sent" messages
   - Check for errors in push sending

### Sound Not Playing

1. **Check Device Settings**:
   - Device must not be in silent/do-not-disturb mode
   - Browser notification sounds must be enabled

2. **Check Sound File**:
   - Sound file must exist at `/Audio-10_7_2025.m4a`
   - File must be accessible (not blocked by CORS)

3. **Browser Compatibility**:
   - Chrome/Edge: Full sound support
   - Firefox: Limited sound support
   - Safari: Uses system sound

### Notifications Only Work When App is Open

- This usually means:
  - Service worker is not properly registered
  - Push subscription is not active
  - VAPID keys are incorrect
  - Browser doesn't support background push

## Code Flow

```
1. Notification Created (Backend)
   ↓
2. send_push_notification() called
   ↓
3. Find subscribed users
   ↓
4. Send push via pywebpush
   ↓
5. Browser Push Service receives push
   ↓
6. Service Worker receives 'push' event
   ↓
7. Service Worker shows notification
   ↓
8. User sees notification (even if app is closed)
   ↓
9. User clicks notification
   ↓
10. App opens and navigates to relevant page
```

## Key Files

- **Backend**: `back/app/routes/notification_routes.py`
  - `send_push_notification()`: Sends push notifications
  - `create_notification()`: Creates notification and triggers push

- **Frontend**: `frontend/public/service-worker.js`
  - `push` event listener: Handles incoming push notifications
  - `notificationclick` event listener: Handles notification clicks

- **Frontend**: `frontend/src/contexts/NotificationContext.js`
  - Manages push subscriptions
  - Listens for service worker messages
  - Refreshes notifications when app comes to foreground

## Security Notes

- **VAPID Private Key**: Never expose publicly. Keep in environment variables only.
- **HTTPS Required**: Push notifications require HTTPS (except localhost)
- **User Consent**: Always request permission before subscribing
- **Subscription Expiry**: Expired subscriptions are automatically marked inactive

## Next Steps

1. Install pywebpush: `pip install pywebpush==1.14.0`
2. Generate VAPID keys
3. Set environment variables
4. Test on mobile and desktop
5. Monitor notification delivery rates
6. Collect user feedback
