# Service Worker Troubleshooting Guide

## Common Errors and Solutions

### Error: "Failed to fetch" in Service Worker

This error typically occurs when the service worker tries to fetch resources that are unavailable or blocked.

#### Solutions:

1. **Clear Service Worker Cache**
   ```javascript
   // In browser console (F12)
   navigator.serviceWorker.getRegistrations().then(registrations => {
     for(let registration of registrations) {
       registration.unregister();
     }
   });
   
   // Then clear caches
   caches.keys().then(cacheNames => {
     return Promise.all(
       cacheNames.map(cacheName => {
         return caches.delete(cacheName);
       })
     );
   });
   
   // Reload the page
   location.reload();
   ```

2. **Check Service Worker Status**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log('Active Service Workers:', registrations);
   });
   ```

3. **Enable Debug Mode**
   Edit `frontend/public/service-worker.js`:
   ```javascript
   const CONFIG = {
     debug: true,  // Change from false to true
     // ... rest of config
   };
   ```

4. **Check Network Tab**
   - Open DevTools (F12)
   - Go to Network tab
   - Look for failed requests (red)
   - Check if they're API calls or static assets

### Error: "Dashboard 500 Internal Server Error"

This is a **server-side error**, not related to the service worker.

#### Solutions:

1. **Check Backend Logs**
   ```bash
   cd back
   # Check if server is running
   # Look for error messages in terminal
   ```

2. **Common Causes:**

   **a) Missing Database Tables**
   ```bash
   # Run notification migration
   cd back
   mysql -u root -p db < migrations/notification_tables.sql
   ```

   **b) Import Error**
   Check `back/app/routes/attendance_routes.py` line 13:
   ```python
   from app.routes.notification_routes import create_notification
   ```
   
   Make sure `notification_routes.py` exists and has no syntax errors.

   **c) Database Connection Issues**
   ```python
   # Check config.py
   SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:root@localhost:3306/db'
   ```

3. **Test Backend Directly**
   ```bash
   cd back
   python
   >>> from app import create_app
   >>> app = create_app()
   >>> # Check for import errors
   ```

4. **Check Import Circular Dependencies**
   ```bash
   cd back
   # Test imports
   python -c "from app.routes.notification_routes import create_notification; print('✅ Import OK')"
   ```

### Error: Service Worker Won't Update

**Solution:**
1. Unregister old service worker:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
   });
   ```

2. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

3. Clear browser cache:
   - Chrome: Settings > Privacy > Clear browsing data
   - Firefox: Settings > Privacy > Clear Data

### Error: Notifications Not Working

**Check These Steps:**

1. **Verify Tables Exist**
   ```sql
   USE db;
   SHOW TABLES LIKE 'notification%';
   -- Should show: notifications, notification_reads, notification_preferences
   SHOW TABLES LIKE 'push_subscriptions';
   ```

2. **Check Notification Permission**
   ```javascript
   // In browser console
   console.log('Notification permission:', Notification.permission);
   // Should be: "granted"
   ```

3. **Test Notification Creation**
   ```javascript
   // In browser console (after logging in)
   fetch('/api/notifications', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       title: 'Test',
       message: 'Testing notifications',
       type: 'general'
     })
   }).then(r => r.json()).then(console.log);
   ```

## Debugging Steps

### 1. Check Service Worker Registration

```javascript
// In browser console
navigator.serviceWorker.getRegistration('/service-worker.js')
  .then(registration => {
    if (registration) {
      console.log('✅ Service Worker registered');
      console.log('State:', registration.active?.state);
      console.log('Scope:', registration.scope);
    } else {
      console.log('❌ Service Worker not registered');
    }
  });
```

### 2. Monitor Service Worker Events

```javascript
// Add this to your app
navigator.serviceWorker.addEventListener('message', event => {
  console.log('[SW Message]', event.data);
});

navigator.serviceWorker.addEventListener('error', event => {
  console.error('[SW Error]', event);
});
```

### 3. Check Service Worker Console

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **console** link next to your service worker
5. Look for errors

### 4. Test Without Service Worker

```javascript
// Disable service worker temporarily
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Reload page and test if error persists
```

## Service Worker Configuration

### Enable Debug Logging

Edit `frontend/public/service-worker.js`:

```javascript
const CONFIG = {
  debug: true,  // Enable debug logs
  cacheStaticAssets: true,
  cacheTimeout: 5000,
  // ...
};
```

### Adjust Cache Timeout

If you have slow network:

```javascript
const CONFIG = {
  cacheTimeout: 10000,  // Increase to 10 seconds
  // ...
};
```

### Disable Caching During Development

```javascript
const CONFIG = {
  cacheStaticAssets: false,  // Disable caching
  // ...
};
```

## Backend Errors (500)

### Quick Fixes:

1. **Restart Backend Server**
   ```bash
   # Stop current server (Ctrl+C)
   cd back
   python run.py
   ```

2. **Check for Syntax Errors**
   ```bash
   cd back
   python -m py_compile app/routes/notification_routes.py
   python -m py_compile app/routes/attendance_routes.py
   ```

3. **Verify Database Connection**
   ```bash
   cd back
   python
   >>> from app import db, create_app
   >>> app = create_app()
   >>> with app.app_context():
   ...     print(db.engine.url)
   ...     db.session.execute("SELECT 1").fetchone()
   ```

4. **Check Missing Dependencies**
   ```bash
   cd back
   pip install flask-cors
   # or
   pip install -r requirements.txt
   ```

## Prevention Tips

1. **Always test after major changes:**
   ```bash
   # Clear everything and test fresh
   - Clear browser cache
   - Unregister service worker
   - Restart backend
   - Test in incognito mode
   ```

2. **Use Browser DevTools:**
   - Network tab: Check failed requests
   - Console tab: Check JavaScript errors
   - Application tab: Check Service Worker status

3. **Monitor Backend Logs:**
   ```bash
   cd back
   python run.py 2>&1 | tee server.log
   ```

4. **Version Service Worker:**
   ```javascript
   // Change cache name when updating
   const CACHE_NAME = 'tatubu-v2';  // Increment version
   ```

## Getting Help

If errors persist:

1. **Collect Information:**
   - Browser console errors (screenshot)
   - Network tab (screenshot)
   - Backend terminal output
   - Service worker logs

2. **Check these files:**
   - `frontend/public/service-worker.js`
   - `back/app/routes/notification_routes.py`
   - `back/app/__init__.py`

3. **Common Error Patterns:**
   - `ImportError`: Missing/incorrect imports
   - `500 Error`: Backend code error
   - `CORS Error`: CORS configuration issue
   - `Failed to fetch`: Network/caching issue

---

**Last Updated**: January 2026
