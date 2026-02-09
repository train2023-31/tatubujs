# VAPID Keys Configuration Check

## Quick Check Guide

This document helps you verify that VAPID keys are properly configured in both frontend and backend.

---

## 🔍 Manual Check Steps

### 1. Check Backend Configuration

#### File: `back/app/config.py`

Look for these lines (around line 36-43):

```python
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@tatubu.com')
```

**✅ What to check:**
- `VAPID_PUBLIC_KEY` should have a value (not empty)
- `VAPID_PRIVATE_KEY` should have a value (not empty) - **CRITICAL**
- `VAPID_CLAIM_EMAIL` should have an email address

#### Environment Variables

Check if you have a `back/.env` file or environment variables set:

```bash
# In back/.env or environment variables:
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here  # PEM format
VAPID_CLAIM_EMAIL=admin@tatubu.com
```

**⚠️ Important:** 
- `VAPID_PRIVATE_KEY` is **REQUIRED** for push notifications to work
- If it's empty, push notifications will fail
- The private key should be in PEM format (starts with `-----BEGIN PRIVATE KEY-----`)

---

### 2. Check Frontend Configuration

#### File: `frontend/.env` or `frontend/.env.local`

Should contain:

```bash
REACT_APP_VAPID_PUBLIC_KEY=your-public-key-here
```

**✅ What to check:**
- File exists: `frontend/.env` or `frontend/.env.local`
- Contains `REACT_APP_VAPID_PUBLIC_KEY`
- Value is not empty
- **MUST match** the backend `VAPID_PUBLIC_KEY` exactly

#### File: `frontend/src/contexts/NotificationContext.js`

Look for this code (around line 164):

```javascript
const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw';
```

**✅ What to check:**
- Code references `process.env.REACT_APP_VAPID_PUBLIC_KEY`
- Has a fallback key (for development)
- **For production:** Make sure `.env` is set, don't rely on fallback

---

### 3. Check Key Matching

**CRITICAL:** Frontend and backend **MUST** use the **SAME** public key!

```bash
# Backend (back/app/config.py or back/.env)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw

# Frontend (frontend/.env)
REACT_APP_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
```

**✅ They must be identical!**

---

## 🛠️ Automated Check Script

Run the provided script to check everything automatically:

```bash
python check_vapid_keys.py
```

This script will:
- ✅ Check backend config.py
- ✅ Check backend environment variables
- ✅ Check frontend .env files
- ✅ Check frontend NotificationContext.js
- ✅ Verify keys match between frontend and backend
- ✅ Provide detailed feedback

---

## 📋 Current Status Check

### Backend Status

Based on your `back/app/config.py`:

```python
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')  # ⚠️ Empty default!
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@tatubu.com')
```

**Status:**
- ✅ `VAPID_PUBLIC_KEY`: Has default value
- ⚠️ `VAPID_PRIVATE_KEY`: **Empty default** - Must be set in environment!
- ✅ `VAPID_CLAIM_EMAIL`: Has default value

**Action Required:**
- Set `VAPID_PRIVATE_KEY` in environment variables or `back/.env`

### Frontend Status

Based on your `frontend/src/contexts/NotificationContext.js`:

```javascript
const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw';
```

**Status:**
- ✅ Code references `REACT_APP_VAPID_PUBLIC_KEY`
- ✅ Has fallback key (same as backend default)
- ⚠️ Need to check if `frontend/.env` exists

**Action Required:**
- Create `frontend/.env` if it doesn't exist
- Add `REACT_APP_VAPID_PUBLIC_KEY` matching backend key

---

## 🔧 How to Fix Issues

### Issue 1: VAPID_PRIVATE_KEY is Empty

**Problem:** Backend can't send push notifications without private key.

**Solution:**

1. **Generate VAPID keys:**
   ```bash
   python generate_vapid_keys.py
   ```

2. **Add to `back/.env`:**
   ```bash
   VAPID_PUBLIC_KEY=your-generated-public-key
   VAPID_PRIVATE_KEY=your-generated-private-key
   VAPID_CLAIM_EMAIL=admin@tatubu.com
   ```

3. **Or set as environment variables:**
   ```bash
   export VAPID_PUBLIC_KEY=your-generated-public-key
   export VAPID_PRIVATE_KEY=your-generated-private-key
   export VAPID_CLAIM_EMAIL=admin@tatubu.com
   ```

4. **Restart backend server**

### Issue 2: Frontend .env Missing

**Problem:** Frontend can't read VAPID public key.

**Solution:**

1. **Create `frontend/.env` file:**
   ```bash
   cd frontend
   touch .env  # Linux/Mac
   # or
   type nul > .env  # Windows
   ```

2. **Add the key:**
   ```bash
   REACT_APP_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
   ```

3. **Restart React dev server:**
   ```bash
   npm start
   ```

### Issue 3: Keys Don't Match

**Problem:** Frontend and backend using different keys.

**Solution:**

1. **Get backend public key:**
   - Check `back/.env` or environment variable `VAPID_PUBLIC_KEY`
   - Or check default in `back/app/config.py`

2. **Update frontend `.env`:**
   ```bash
   REACT_APP_VAPID_PUBLIC_KEY=<same-as-backend>
   ```

3. **Restart both servers**

---

## ✅ Verification Checklist

Use this checklist to verify everything is set up correctly:

### Backend
- [ ] `VAPID_PUBLIC_KEY` is set (in .env or environment)
- [ ] `VAPID_PRIVATE_KEY` is set (in .env or environment) - **REQUIRED**
- [ ] `VAPID_CLAIM_EMAIL` is set (in .env or environment)
- [ ] Backend server restarted after changes
- [ ] Can import `Config` and see non-empty values

### Frontend
- [ ] `frontend/.env` file exists
- [ ] `REACT_APP_VAPID_PUBLIC_KEY` is in `.env`
- [ ] Value is not empty
- [ ] React dev server restarted after changes
- [ ] `process.env.REACT_APP_VAPID_PUBLIC_KEY` is accessible in code

### Matching
- [ ] Frontend `REACT_APP_VAPID_PUBLIC_KEY` = Backend `VAPID_PUBLIC_KEY`
- [ ] Keys are exactly the same (no extra spaces, same format)

### Testing
- [ ] Can subscribe to push notifications in browser
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Push notification subscription succeeds

---

## 🧪 Test Push Notifications

### 1. Test Subscription

1. Open your app in browser
2. Go to Notification Settings
3. Enable "Push Notifications"
4. Check browser console for errors
5. Check backend logs for subscription success

### 2. Test Sending

1. Create a notification (e.g., mark student absent)
2. Check if push notification is sent
3. Check backend logs for:
   - `✅ Push notification sent to user X`
   - Or error messages

### 3. Common Errors

**Error: "VAPID_PRIVATE_KEY not configured"**
- Solution: Set `VAPID_PRIVATE_KEY` in backend environment

**Error: "Invalid VAPID key"**
- Solution: Check if keys match between frontend and backend

**Error: "Subscription failed"**
- Solution: Check browser console for specific error
- Make sure HTTPS is enabled (required for push)

---

## 📝 Quick Reference

### Backend Environment Variables

```bash
# back/.env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
VAPID_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...your private key here...
-----END PRIVATE KEY-----
VAPID_CLAIM_EMAIL=admin@tatubu.com
```

### Frontend Environment Variables

```bash
# frontend/.env
REACT_APP_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
```

### Generate New Keys

```bash
python generate_vapid_keys.py
```

This will output:
- Private key (PEM format) → Use for `VAPID_PRIVATE_KEY`
- Public key (base64url) → Use for both `VAPID_PUBLIC_KEY` and `REACT_APP_VAPID_PUBLIC_KEY`

---

## 🎯 Summary

**Current Configuration Status:**

✅ **Backend:**
- Config file has VAPID keys defined
- Public key has default value
- ⚠️ **Private key default is empty** - Must be set!

✅ **Frontend:**
- Code references `REACT_APP_VAPID_PUBLIC_KEY`
- Has fallback key
- ⚠️ Need to verify `.env` file exists

**Action Items:**
1. ✅ Check if `back/.env` exists and has `VAPID_PRIVATE_KEY`
2. ✅ Check if `frontend/.env` exists and has `REACT_APP_VAPID_PUBLIC_KEY`
3. ✅ Verify keys match between frontend and backend
4. ✅ Run `python check_vapid_keys.py` for automated check

---

## 📞 Need Help?

If push notifications still don't work after checking everything:

1. **Check browser console** for JavaScript errors
2. **Check backend logs** for Python errors
3. **Verify HTTPS** is enabled (required for push)
4. **Test in different browser** (Chrome, Firefox, Edge)
5. **Check Service Worker** is registered and active

For more details, see:
- `BACKGROUND_NOTIFICATIONS_GUIDE.md`
- `VPS_SETUP_NOTIFICATIONS.md`
- `frontend/ENV_SETUP.md`
