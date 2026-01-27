# 🔔 دليل إعداد VAPID Keys للإشعارات الفورية - خطوة بخطوة

## 📋 نظرة عامة

هذا الدليل سيرشدك خطوة بخطوة لإعداد VAPID keys للإشعارات الفورية (Push Notifications) في نظام تتبع.

**المتطلبات:**
- Backend على VPS Server
- Frontend (React)
- Python 3.x على VPS
- Node.js على جهاز التطوير

---

## 🎯 الخطوة 1: توليد VAPID Keys

### الطريقة 1: استخدام Python (موصى بها)

**على VPS Server:**

```bash
# 1. الاتصال بـ VPS
ssh user@your-vps-ip

# 2. الانتقال إلى مجلد المشروع
cd /path/to/your/project/back

# 3. تثبيت المكتبة المطلوبة
pip install py_vapid

# 4. توليد المفاتيح
python -c "from py_vapid import Vapid01; v = Vapid01(); print('Public Key:', v.public_key.pem); print('Private Key:', v.private_key.pem)"
```

**مثال على المخرجات:**
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
Private Key: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

**⚠️ مهم جداً:**
- احفظ **Public Key** و **Private Key** في مكان آمن
- ستحتاجهم في الخطوات التالية

### الطريقة 2: استخدام Online Generator

1. افتح: https://web-push-codelab.glitch.me/
2. اضغط على "Generate Keys"
3. انسخ **Public Key** و **Private Key**

### الطريقة 3: استخدام Node.js

```bash
npm install -g web-push
web-push generate-vapid-keys
```

---

## 🖥️ الخطوة 2: إعداد Backend على VPS

### 2.1: إنشاء/تحديث ملف `.env` في Backend

**على VPS Server:**

```bash
# الانتقال إلى مجلد backend
cd /path/to/your/project/back

# إنشاء ملف .env إذا لم يكن موجوداً
nano .env
# أو
vi .env
```

**أضف/حدث المحتوى التالي:**

```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VAPID_CLAIM_EMAIL=admin@tatubu.com
```

**مثال:**
```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
VAPID_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
VAPID_CLAIM_EMAIL=admin@tatubu.com
```

**⚠️ ملاحظات مهمة:**
- استبدل `YOUR_PUBLIC_KEY_HERE` بالمفتاح العام الذي حصلت عليه
- استبدل `YOUR_PRIVATE_KEY_HERE` بالمفتاح الخاص (كامل مع `-----BEGIN PRIVATE KEY-----` و `-----END PRIVATE KEY-----`)
- إذا كان Private Key متعدد الأسطر، احتفظ به كما هو في ملف `.env`

### 2.2: التحقق من ملف `config.py`

**تأكد من أن `back/app/config.py` يحتوي على:**

```python
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'default_key_here')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@tatubu.com')
```

**✅ هذا موجود بالفعل في الكود - لا حاجة لتعديله**

### 2.3: تثبيت المكتبات المطلوبة

**على VPS:**

```bash
cd /path/to/your/project/back

# تثبيت pywebpush
pip install pywebpush

# أو إذا كنت تستخدم requirements.txt
pip install -r requirements.txt
```

**تأكد من أن `requirements.txt` يحتوي على:**
```
pywebpush
```

### 2.4: إعادة تشغيل Backend Server

**إذا كنت تستخدم systemd:**

```bash
sudo systemctl restart your-flask-service
# أو
sudo systemctl restart gunicorn
```

**إذا كنت تستخدم screen/tmux:**

```bash
# ابحث عن الجلسة
screen -ls
# أو
tmux ls

# أدخل الجلسة وأعد التشغيل
# Ctrl+C لإيقاف
# ثم: python run.py
```

**إذا كنت تستخدم PM2:**

```bash
pm2 restart your-app-name
```

---

## 💻 الخطوة 3: إعداد Frontend

### 3.1: إنشاء/تحديث ملف `.env` في Frontend

**على جهاز التطوير:**

```bash
# الانتقال إلى مجلد frontend
cd /path/to/your/project/frontend

# إنشاء ملف .env إذا لم يكن موجوداً
# Windows
type nul > .env
# Linux/Mac
touch .env
```

**أضف المحتوى التالي:**

```env
REACT_APP_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
```

**⚠️ مهم جداً:**
- استخدم **نفس Public Key** الذي استخدمته في Backend
- يجب أن يكون **مطابق تماماً**

**مثال:**
```env
REACT_APP_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
```

### 3.2: التحقق من `NotificationContext.js`

**تأكد من أن `frontend/src/contexts/NotificationContext.js` يحتوي على:**

```javascript
const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
  'fallback_key_here';
```

**✅ هذا موجود بالفعل - لكن تأكد من أن fallback_key يطابق المفتاح الجديد**

### 3.3: إعادة تشغيل React Dev Server

```bash
# إيقاف الخادم الحالي (Ctrl+C)
# ثم إعادة التشغيل
npm start
```

**⚠️ مهم:**
- React لا يقرأ `.env` تلقائياً عند التعديل
- **يجب إعادة تشغيل الخادم** بعد أي تعديل على `.env`

---

## ✅ الخطوة 4: التحقق من الإعداد

### 4.1: التحقق من Backend

**على VPS، أنشئ ملف اختبار:**

```bash
cd /path/to/your/project/back
nano test_vapid.py
```

**أضف المحتوى:**

```python
import os
from dotenv import load_dotenv

# تحميل .env
load_dotenv()

# قراءة المفاتيح
public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
private_key = os.environ.get('VAPID_PRIVATE_KEY', '')
email = os.environ.get('VAPID_CLAIM_EMAIL', '')

print("=" * 50)
print("VAPID Configuration Check")
print("=" * 50)
print(f"Public Key: {public_key[:50]}..." if public_key else "Public Key: ❌ NOT SET")
print(f"Private Key: {'✅ SET' if private_key else '❌ NOT SET'}")
print(f"Email: {email}")
print("=" * 50)

if not public_key:
    print("❌ ERROR: VAPID_PUBLIC_KEY is not set!")
if not private_key:
    print("❌ ERROR: VAPID_PRIVATE_KEY is not set!")
if public_key and private_key:
    print("✅ All keys are set correctly!")
```

**شغّل الاختبار:**

```bash
python test_vapid.py
```

**النتيجة المتوقعة:**
```
==================================================
VAPID Configuration Check
==================================================
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
Private Key: ✅ SET
Email: admin@tatubu.com
==================================================
✅ All keys are set correctly!
```

### 4.2: التحقق من Frontend

**في متصفح الويب (F12 → Console):**

```javascript
// تحقق من أن المفتاح محمّل
console.log('VAPID Key:', process.env.REACT_APP_VAPID_PUBLIC_KEY);
```

**النتيجة المتوقعة:**
```
VAPID Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw
```

**إذا كانت `undefined`:**
- تأكد من وجود ملف `.env` في `frontend/`
- تأكد من إعادة تشغيل React dev server
- تأكد من أن المفتاح يبدأ بـ `REACT_APP_`

### 4.3: التحقق من تطابق المفاتيح

**تأكد من أن:**
- `VAPID_PUBLIC_KEY` في Backend = `REACT_APP_VAPID_PUBLIC_KEY` في Frontend
- **يجب أن يكونا متطابقين تماماً**

---

## 🧪 الخطوة 5: اختبار الإشعارات

### 5.1: اختبار الاشتراك

1. **افتح التطبيق في المتصفح**
2. **اذهب إلى إعدادات الإشعارات**
   - `/app/notification-settings`
3. **فعّل "Push Notifications"**
4. **تحقق من:**
   - ✅ رسالة نجاح: "تم الاشتراك في الإشعارات بنجاح"
   - ✅ لا توجد أخطاء في Console (F12)
   - ✅ لا توجد أخطاء في Backend logs

### 5.2: اختبار إرسال إشعار

**في Backend logs، يجب أن ترى:**
```
Push notification sent successfully
```

**في المتصفح:**
- يجب أن تظهر إشعار فوري (حتى لو كان التطبيق مغلقاً)

### 5.3: التحقق من قاعدة البيانات

**على VPS:**

```bash
# الاتصال بقاعدة البيانات
mysql -u username -p database_name

# أو
python manage.py shell
```

**تحقق من جدول `push_subscriptions`:**

```sql
SELECT * FROM push_subscriptions WHERE is_active = 1;
```

**يجب أن ترى:**
- سجلات للمستخدمين المشتركين
- `is_active = 1`
- `endpoint` يحتوي على URL

---

## 🐛 حل المشاكل الشائعة

### المشكلة 1: "InvalidAccessError: applicationServerKey is not valid"

**السبب:** المفاتيح غير متطابقة

**الحل:**
1. تأكد من أن `VAPID_PUBLIC_KEY` في Backend = `REACT_APP_VAPID_PUBLIC_KEY` في Frontend
2. تأكد من عدم وجود مسافات إضافية
3. أعد تشغيل كلا الخادمين

### المشكلة 2: "VAPID_PRIVATE_KEY not configured"

**السبب:** المفتاح الخاص غير موجود في Backend

**الحل:**
1. تحقق من ملف `back/.env`
2. تأكد من أن `VAPID_PRIVATE_KEY` موجود
3. تأكد من أن المفتاح كامل (مع `-----BEGIN PRIVATE KEY-----` و `-----END PRIVATE KEY-----`)
4. أعد تشغيل Backend

### المشكلة 3: "Failed to fetch" من api.tatubu.com

**السبب:** Service Worker يمنع الطلبات

**الحل:**
- ✅ تم إصلاحه بالفعل في `service-worker.js`
- تأكد من تحديث Service Worker في المتصفح

### المشكلة 4: الإشعارات لا تظهر

**التحقق:**
1. تحقق من أن المستخدم مشترك: `SELECT * FROM push_subscriptions`
2. تحقق من Backend logs للأخطاء
3. تحقق من أن `VAPID_PRIVATE_KEY` موجود
4. تحقق من أن `pywebpush` مثبت

---

## 📁 ملخص الملفات المطلوبة

### Backend (VPS)
```
back/
├── .env                    ← أضف VAPID keys هنا
├── app/
│   ├── config.py          ← ✅ موجود (لا حاجة لتعديل)
│   └── routes/
│       └── notification_routes.py  ← ✅ موجود
└── requirements.txt        ← تأكد من وجود pywebpush
```

### Frontend
```
frontend/
├── .env                   ← أضف REACT_APP_VAPID_PUBLIC_KEY هنا
└── src/
    └── contexts/
        └── NotificationContext.js  ← ✅ موجود (لا حاجة لتعديل)
```

---

## ✅ Checklist النهائي

### Backend (VPS)
- [ ] تم توليد VAPID keys
- [ ] تم إضافة `VAPID_PUBLIC_KEY` في `back/.env`
- [ ] تم إضافة `VAPID_PRIVATE_KEY` في `back/.env`
- [ ] تم إضافة `VAPID_CLAIM_EMAIL` في `back/.env`
- [ ] تم تثبيت `pywebpush`
- [ ] تم إعادة تشغيل Backend server
- [ ] تم التحقق من المفاتيح (test_vapid.py)

### Frontend
- [ ] تم إنشاء `frontend/.env`
- [ ] تم إضافة `REACT_APP_VAPID_PUBLIC_KEY` (نفس مفتاح Backend)
- [ ] تم إعادة تشغيل React dev server
- [ ] تم التحقق من المفتاح في Console

### التحقق
- [ ] المفاتيح متطابقة (Backend = Frontend)
- [ ] لا توجد أخطاء في Console
- [ ] لا توجد أخطاء في Backend logs
- [ ] يمكن الاشتراك في Push Notifications
- [ ] الإشعارات تصل بنجاح

---

## 🚀 الخطوات السريعة (Quick Reference)

```bash
# 1. توليد المفاتيح (على VPS)
pip install py_vapid
python -c "from py_vapid import Vapid01; v = Vapid01(); print('Public:', v.public_key.pem); print('Private:', v.private_key.pem)"

# 2. إعداد Backend .env
nano back/.env
# أضف:
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
# VAPID_CLAIM_EMAIL=admin@tatubu.com

# 3. إعداد Frontend .env
nano frontend/.env
# أضف:
# REACT_APP_VAPID_PUBLIC_KEY=... (نفس Public Key)

# 4. إعادة التشغيل
# Backend
sudo systemctl restart your-service
# Frontend
npm start
```

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من Backend logs
2. تحقق من Browser Console
3. تحقق من أن المفاتيح متطابقة
4. تأكد من إعادة تشغيل الخوادم بعد التعديلات

---

**تاريخ الإنشاء:** 2026-01-24
**آخر تحديث:** 2026-01-24
