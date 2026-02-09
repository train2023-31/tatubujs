# Quick Start Guide - PWA Push Notifications

This guide will get you up and running with push notifications in under 5 minutes.

---

## Prerequisites

- Python 3.8+
- Node.js 14+
- HTTPS enabled (or localhost for testing)

---

## Step 1: Install Dependencies

### Backend

```bash
cd back
pip install -r requirements.txt
```

This installs `pywebpush` and other required packages.

### Frontend

```bash
cd frontend
npm install
```

---

## Step 2: Generate VAPID Keys

```bash
cd back
python generate_vapid_keys.py
```

**Output:**
```
🔑 Generating VAPID Keys...
✅ VAPID Keys Generated Successfully!

📱 FRONTEND (.env file in /frontend folder):
REACT_APP_VAPID_PUBLIC_KEY=BF8xh...

🔒 BACKEND (.env file in /back folder):
VAPID_PUBLIC_KEY=BF8xh...
VAPID_PRIVATE_KEY=your-private-key
VAPID_CLAIM_EMAIL=mailto:your-email@example.com
```

---

## Step 3: Configure Environment Variables

### Frontend: `frontend/.env`

```env
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-from-step-2
```

### Backend: `back/.env`

Create this file and add:

```env
VAPID_PUBLIC_KEY=your-public-key-from-step-2
VAPID_PRIVATE_KEY=your-private-key-from-step-2
VAPID_CLAIM_EMAIL=mailto:admin@yourdomain.com
```

**⚠️ IMPORTANT**: Never commit the private key to git!

---

## Step 4: Start Servers

### Backend

```bash
cd back
python run.py
```

Should see: `Running on http://127.0.0.1:5000`

### Frontend

```bash
cd frontend
npm start
```

Should see: `Compiled successfully!`

---

## Step 5: Test Push Notifications

### Option A: Using the React Hook

Add this to any component:

```javascript
import { usePushNotifications } from '../hooks/usePushNotifications';

function TestComponent() {
  const { 
    subscribe, 
    isSubscribed, 
    sendTestNotification 
  } = usePushNotifications();

  return (
    <div>
      <button onClick={subscribe}>
        {isSubscribed ? 'Subscribed ✓' : 'Subscribe'}
      </button>
      
      {isSubscribed && (
        <button onClick={sendTestNotification}>
          Send Test Notification
        </button>
      )}
    </div>
  );
}
```

### Option B: Using API Directly

1. **Subscribe to push** (automatic when user grants permission)
2. **Send test notification** via API:

```bash
curl -X POST https://api.tatubu.com/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "Hello from Tatubu!",
    "type": "general",
    "priority": "normal",
    "target_role": "student"
  }'
```

---

## Step 6: Install as PWA

### On Desktop (Chrome/Edge)

1. Open the app in browser
2. Look for install icon in address bar (⊕)
3. Click "Install"
4. App opens in standalone window

### On Android

1. Open in Chrome
2. Tap menu (⋮)
3. Tap "Add to Home screen"
4. Tap "Add"
5. Open from home screen

### On iOS (16.4+)

1. Open in Safari
2. Tap Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Open from home screen (must use standalone mode for push)

---

## Verification Checklist

### ✅ Service Worker Registered

Open browser console (F12) and check:

```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', reg.active !== null);
});
```

Should show: `SW registered: true`

### ✅ Push Permission Granted

```javascript
console.log('Permission:', Notification.permission);
```

Should show: `Permission: granted`

### ✅ Subscription Created

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscribed:', sub !== null);
  });
});
```

Should show: `Subscribed: true`

### ✅ Backend Configured

Check backend logs when app starts:

```
VAPID public key: BF8xh... (87 chars)
```

If you see "VAPID_PRIVATE_KEY not configured", check your `.env` file.

---

## Common Issues & Quick Fixes

### Issue: "Service worker registration failed"

**Fix:**
```bash
# Check service worker file exists
ls frontend/public/service-worker.js

# Clear browser cache (Ctrl+Shift+Delete)
# Restart frontend server
```

### Issue: "Push subscription failed"

**Fix:**
1. Check VAPID public key in `frontend/.env`
2. Ensure it matches the key from Step 2
3. Restart frontend server

### Issue: "Notifications not working on iOS"

**Fix:**
1. Ensure iOS 16.4 or later
2. Install app to home screen
3. Open from home screen (not Safari browser)
4. Grant notification permission

### Issue: "Backend error: 401 Unauthorized"

**Fix:**
1. Verify VAPID keys match in frontend and backend
2. Check `VAPID_CLAIM_EMAIL` is set in backend `.env`
3. Restart backend server

---

## Next Steps

- Read the full [PWA Setup Guide](./PWA_SETUP_GUIDE.md)
- Customize notification types in `notification_service.py`
- Set up production HTTPS deployment
- Configure notification preferences per user

---

## Development Tips

### Hot Reload Service Worker

When developing the service worker:

1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Check "Update on reload"
4. Refresh page to get latest service worker

### Test Push Without Backend

Use browser DevTools:

1. Open DevTools (F12)
2. Application → Service Workers
3. Find your service worker
4. Click "Push" button
5. Enter JSON payload

### Debug Push Events

Add logging to service worker:

```javascript
self.addEventListener('push', (event) => {
  console.log('Push received:', event.data.text());
  // ... rest of code
});
```

---

## Production Deployment

### Before Deploying

1. Generate **new** VAPID keys for production
2. Add production keys to server environment variables
3. Configure HTTPS (required for PWA)
4. Test on real devices (Android, iOS, Desktop)

### Environment Variables (Production)

**Frontend** (build time):
```bash
REACT_APP_VAPID_PUBLIC_KEY=production-public-key
```

**Backend** (runtime):
```bash
VAPID_PUBLIC_KEY=production-public-key
VAPID_PRIVATE_KEY=production-private-key-keep-secret
VAPID_CLAIM_EMAIL=mailto:admin@yourdomain.com
```

### Build Frontend

```bash
cd frontend
npm run build
```

Deploy the `build/` folder to your web server.

---

## Testing Checklist

- [ ] Desktop Chrome: Notifications work
- [ ] Desktop Firefox: Notifications work
- [ ] Desktop Edge: Notifications work
- [ ] Android Chrome: Notifications work
- [ ] iOS Safari 16.4+: Notifications work (installed to home screen)
- [ ] Offline mode: App loads cached version
- [ ] Push while app is closed: Notification appears
- [ ] Click notification: App opens to correct page
- [ ] Unsubscribe: No more notifications received

---

## Support

Need help? Check:

1. **Browser console**: Look for errors
2. **Backend logs**: Check for push sending errors
3. **Network tab**: Verify subscription API call succeeds
4. **Full documentation**: [PWA_SETUP_GUIDE.md](./PWA_SETUP_GUIDE.md)

---

## Summary

You should now have:
- ✅ Service worker registered
- ✅ Push notifications enabled
- ✅ PWA installable on all devices
- ✅ Backend sending notifications via VAPID

**Estimated setup time**: 5 minutes ⏱️

Enjoy your fully functional PWA! 🎉
