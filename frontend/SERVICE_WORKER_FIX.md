# Service Worker Registration Error Fix

## Error
```
Failed to update a ServiceWorker for scope ('http://localhost:3000/') 
with script ('http://localhost:3000/service-worker.js'): 
An unknown error occurred when fetching the script.
```

## Common Causes & Solutions

### 1. Service Worker File Not Accessible

**Check if file exists:**
- File should be at: `frontend/public/service-worker.js`
- Should be accessible at: `http://localhost:3000/service-worker.js`

**Solution:**
1. Verify the file exists in `frontend/public/` directory
2. Check browser console for 404 errors
3. Try accessing `http://localhost:3000/service-worker.js` directly in browser

### 2. Syntax Errors in Service Worker

**Check for syntax errors:**
- Open browser DevTools → Application → Service Workers
- Check for red error messages
- Check browser console for JavaScript errors

**Solution:**
1. Validate JavaScript syntax in `service-worker.js`
2. Check for unclosed brackets, quotes, etc.
3. Use a JavaScript linter/validator

### 3. Cached Broken Service Worker

**Clear service worker cache:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for all service workers
5. Go to **Storage** → **Clear site data**
6. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### 4. Registration Timing Issues

**The registration code has been improved** to:
- Wait for page load
- Add a small delay
- Better error handling
- Automatic cleanup of broken workers

### 5. Development Server Issues

**If using Create React App:**
- Service workers in `public/` should be served automatically
- Make sure you're using `npm start` (not a custom server)
- Check if `public/service-worker.js` is being copied to build

**Solution:**
1. Stop the dev server
2. Clear `node_modules/.cache` if it exists
3. Restart: `npm start`

### 6. Browser Cache Issues

**Clear browser cache:**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select **Empty Cache and Hard Reload**

Or:
1. Go to browser settings
2. Clear browsing data
3. Select "Cached images and files"
4. Clear data

### 7. HTTPS/Localhost Requirements

**Service workers require:**
- HTTPS (in production)
- `localhost` or `127.0.0.1` (for development)
- Not `file://` protocol

**Solution:**
- Make sure you're accessing via `http://localhost:3000` (not `file://`)
- For production, ensure HTTPS is enabled

## Step-by-Step Fix

### Step 1: Unregister All Service Workers

1. Open `http://localhost:3000/sw-diagnostic.html` in your browser
2. Click **Unregister All Service Workers**
3. Or manually:
   - Open DevTools (F12)
   - Application → Service Workers
   - Click **Unregister** for each one

### Step 2: Clear Browser Cache

1. DevTools → Application → Storage
2. Click **Clear site data**
3. Or: Settings → Clear browsing data → Cached files

### Step 3: Verify Service Worker File

1. Open `http://localhost:3000/service-worker.js` directly
2. Should see the JavaScript code (not 404)
3. Check for syntax errors

### Step 4: Restart Dev Server

```bash
# Stop server (Ctrl+C)
# Clear cache
rm -rf node_modules/.cache  # Linux/Mac
# or
rmdir /s node_modules\.cache  # Windows

# Restart
npm start
```

### Step 5: Hard Refresh

1. Open `http://localhost:3000`
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Check console for service worker registration

## Verification

After fixing, you should see in console:
```
✅ Service Worker registered successfully: http://localhost:3000/
```

## Still Not Working?

1. **Check browser console** for specific error messages
2. **Check Network tab** - see if `service-worker.js` is being fetched
3. **Try different browser** - Chrome, Firefox, Edge
4. **Check file permissions** - make sure file is readable
5. **Verify file encoding** - should be UTF-8

## Alternative: Disable Service Worker (Temporary)

If you need to disable service worker temporarily for debugging:

1. Comment out the registration code in `frontend/src/index.js`:
   ```javascript
   // if ('serviceWorker' in navigator) {
   //   ... registration code ...
   // }
   ```

2. Unregister existing workers using `sw-diagnostic.html`

3. Restart dev server

## Need More Help?

- Check browser console for detailed error messages
- Use `sw-diagnostic.html` to diagnose issues
- Check `SERVICE_WORKER_TROUBLESHOOTING.md` for more details
