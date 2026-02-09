# Push Notifications Not Working on Phones – Checklist

Use this checklist when push notifications are not received on phones.

---

## 0. Quick check: Does the backend see your subscription?

On the **Notifications** page (الإشعارات), after you tap **تفعيل الإشعارات الفورية** and see "✓ مشترك":

- You should see a green line: **"✓ السيرفر: جهاز واحد مسجل"** (or "X أجهزة مسجلة").
- If you see **"⚠ السيرفر لا يرى اشتراكك"** then the backend did not save your subscription. Fix: tap **تحديث الحالة** once, or unsubscribe and subscribe again. Check backend logs for "Push: Subscription saved for user_id=...".
- If the line never appears, the `/notifications/push-status` request may be failing (e.g. 401/CORS). Check Network tab.

---

## 1. Service worker is active

Push only works if a **service worker** is registered and active.

- **Production (tatubu.com):** The app registers the service worker when:
  - The build is production (`NODE_ENV=production`), or
  - The site is opened from `tatubu.com` or `*.tatubu.com`.
- **Local/dev:** The service worker is **not** registered on `localhost` to avoid cache issues.

**Check in the browser (on the phone or desktop):**

1. Open your site (e.g. https://tatubu.com).
2. Open DevTools (or use Chrome remote debugging for the phone).
3. Go to **Application** → **Service Workers**.
4. You should see `/service-worker.js` with status **activated**.

If there is no service worker or it is not activated, push will not work. Rebuild and redeploy the frontend, then reload the site (and, if needed, “Update on reload” in DevTools).

---

## 2. User is actually subscribed

The backend only sends push to **stored** push subscriptions.

**Check in the backend (DB):**

```sql
SELECT id, user_id, endpoint, is_active, created_at
FROM push_subscriptions
WHERE is_active = 1
ORDER BY created_at DESC
LIMIT 20;
```

- There must be at least one row with `is_active = 1` for the user you expect to receive the notification.
- If there are no rows (or none for that user), the user never subscribed or the subscribe request failed.

**Check in the frontend:**

- Open **الإشعارات** (Notifications).
- Click **تفعيل الإشعارات الفورية** and allow notifications when the browser asks.
- You should see **✓ مشترك في الإشعارات الفورية**.
- If the button stays on “تفعيل…” or you see an error, check the browser console and the Network tab for the `/notifications/subscribe` request (status 201).

---

## 3. VAPID keys match

The **same VAPID key pair** must be used in the frontend (public) and backend (private).

- **Frontend:** `REACT_APP_VAPID_PUBLIC_KEY` in `frontend/.env` (or build env).
- **Backend:** `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` in `back/.env`.

If the public key in the frontend does not match the key pair of the backend’s private key, push will fail (often with 401 from the push service).

**Check:**

- Regenerate a pair once: `python back/generate_vapid_keys.py`.
- Put the **public** key in the frontend and the **private** (and optionally public) in the backend.
- Rebuild frontend and restart backend after changing env.

---

## 4. Backend has VAPID private key and sends push

**Backend logs when a notification is created:**

- You should see:  
  `Push: Sending to N subscription(s) for notification id=...`
- If you see:  
  `Push: No active subscriptions for this notification target.`  
  then either no one is subscribed for that notification’s target (user/role/school), or the DB has no active subscriptions.
- If you see:  
  `Warning: VAPID_PRIVATE_KEY not configured`  
  then set `VAPID_PRIVATE_KEY` in the backend environment and restart.

**Backend env (e.g. `back/.env`):**

```env
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_CLAIM_EMAIL=mailto:admin@tatubu.com
```

Restart the backend after changing.

---

## 5. Test notification targets the current user

The “إرسال إشعار تجريبي” (Send test notification) button now sends **only to the current user** (`is_test: true`).

- Use it while logged in as the same user on the phone (or the same user that has the push subscription in the DB).
- If you have multiple devices, make sure the subscription in the DB is for that user and that device’s endpoint.

---

## 6. Notification preferences

The backend skips push if the user has disabled push or the notification type.

**Check in DB:**

```sql
SELECT user_id, push_enabled, general_enabled
FROM notification_preferences
WHERE user_id = YOUR_USER_ID;
```

- `push_enabled` must be `1` (or row missing so defaults apply).
- For a “general” test notification, `general_enabled` should be `1` (or default on).

---

## 7. HTTPS and origin

- Push requires **HTTPS** (or `localhost`). Phones must use `https://tatubu.com` (or your HTTPS domain).
- The backend CORS must allow your frontend origin (e.g. `https://tatubu.com`) and the `Authorization` header. If the browser blocks the request with CORS, the subscribe or send request will fail.

---

## 8. iOS specifics

- **iOS 16.4+** required.
- User must **Add to Home Screen** and open the app **from the home screen** (not from Safari’s address bar).
- Push is only supported when the PWA is running in **standalone** mode (installed).
- Notification permission must be granted when the app asks.
- Testing only in Safari (not from home screen) will not deliver push.

## 8b. Android specifics

- Use **Chrome**. Allow notifications when the site asks. Site must be **https://tatubu.com**.
- If Chrome is restricted in the background (battery/background limits), allow it to run in the background.

---

## 9. Quick backend check (subscriptions and push)

On the server:

```bash
cd back
python -c "
from app import create_app, db
from app.models import PushSubscription
app = create_app()
with app.app_context():
    subs = PushSubscription.query.filter_by(is_active=True).all()
    print('Active push subscriptions:', len(subs))
    for s in subs[:5]:
        print('  user_id=%s endpoint=%s...' % (s.user_id, (s.endpoint or '')[:60]))
"
```

If this shows 0 subscriptions, no one will get push until they subscribe again from the app.

---

## 10. Summary checklist

| Check | Where | What to verify |
|-------|--------|----------------|
| Service worker | Browser → Application → Service Workers | `/service-worker.js` active on production host |
| Subscribe API | Network tab | POST `/api/notifications/subscribe` returns 201 |
| DB subscriptions | `push_subscriptions` | Rows with `is_active=1` for the user |
| VAPID | Frontend + Backend env | Same key pair; `VAPID_PRIVATE_KEY` set in backend |
| Backend logs | Server logs | “Push: Sending to N subscription(s)” and no VAPID warning |
| Test button | App | “إرسال إشعار تجريبي” used while logged in as that user |
| iOS | Device | 16.4+, installed to home screen, opened from home screen |

After fixing any failing step, try “إرسال إشعار تجريبي” again and watch backend logs and the phone for the notification.
