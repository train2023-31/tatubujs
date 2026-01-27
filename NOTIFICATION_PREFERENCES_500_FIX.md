# 🔧 إصلاح خطأ 500 في Notification Preferences

## ❌ المشكلة

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

يحدث عند محاولة تحميل صفحة `/app/notification-settings`

## ✅ الحلول المطبقة

### 1. إصلاح استخدام `get_oman_time()` في النموذج

**المشكلة:**
```python
# ❌ خطأ
created_at = db.Column(db.DateTime, default=get_oman_time().utcnow)
updated_at = db.Column(db.DateTime, default=get_oman_time().utcnow, onupdate=get_oman_time().utcnow)
```

**الحل:**
```python
# ✅ صحيح
created_at = db.Column(db.DateTime, default=get_oman_time)
updated_at = db.Column(db.DateTime, default=get_oman_time, onupdate=get_oman_time)
```

**السبب:**
- `get_oman_time()` يرجع `datetime` object مباشرة
- لا يحتوي على `.utcnow` method
- يجب استخدامه كدالة مباشرة

### 2. تحسين معالجة الأخطاء في Backend

**تم إضافة:**
- ✅ التحقق من وجود المستخدم
- ✅ معالجة أفضل لإنشاء preferences افتراضية
- ✅ Fallback لإرجاع preferences افتراضية إذا فشل الإنشاء
- ✅ رسائل خطأ مفصلة مع traceback

### 3. التحقق من وجود الجدول

**تأكد من أن جدول `notification_preferences` موجود:**

```sql
-- على VPS
mysql -u username -p database_name

-- تحقق من وجود الجدول
SHOW TABLES LIKE 'notification_preferences';

-- إذا لم يكن موجوداً، أنشئه:
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    attendance_enabled BOOLEAN DEFAULT TRUE,
    bus_enabled BOOLEAN DEFAULT TRUE,
    behavior_enabled BOOLEAN DEFAULT TRUE,
    timetable_enabled BOOLEAN DEFAULT TRUE,
    substitution_enabled BOOLEAN DEFAULT TRUE,
    news_enabled BOOLEAN DEFAULT TRUE,
    general_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_preferences_user_id (user_id)
);
```

---

## 🔍 خطوات التحقق

### 1. تحقق من Backend Logs

**على VPS:**
```bash
# تحقق من logs
tail -f /var/log/your-app.log
# أو
journalctl -u your-service -f
```

**ابحث عن:**
```
Error fetching notification preferences: ...
```

### 2. تحقق من قاعدة البيانات

```sql
-- تحقق من وجود الجدول
DESCRIBE notification_preferences;

-- تحقق من البيانات
SELECT * FROM notification_preferences LIMIT 5;
```

### 3. اختبر Endpoint مباشرة

```bash
# على VPS
curl -X GET http://localhost:5000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 حل المشاكل الشائعة

### المشكلة 1: الجدول غير موجود

**الأعراض:**
- خطأ 500
- `Table 'database.notification_preferences' doesn't exist`

**الحل:**
```bash
# على VPS
cd /opt/backend
mysql -u username -p database_name < migrations/notification_tables.sql
```

### المشكلة 2: خطأ في `get_oman_time()`

**الأعراض:**
- خطأ 500 عند إنشاء preferences
- `'datetime' object has no attribute 'utcnow'`

**الحل:**
- ✅ تم إصلاحه في `back/app/models.py`

### المشكلة 3: Foreign Key Constraint

**الأعراض:**
- خطأ عند إنشاء preferences
- `Cannot add or update a child row`

**الحل:**
```sql
-- تحقق من وجود المستخدم
SELECT id FROM users WHERE id = YOUR_USER_ID;

-- إذا لم يكن موجوداً، أنشئه أو استخدم user_id صحيح
```

---

## ✅ Checklist

- [ ] تم إصلاح `get_oman_time()` في `models.py`
- [ ] تم تحسين معالجة الأخطاء في `notification_routes.py`
- [ ] جدول `notification_preferences` موجود في قاعدة البيانات
- [ ] تم إعادة تشغيل Backend server
- [ ] لا توجد أخطاء في Backend logs
- [ ] يمكن الوصول إلى `/api/notifications/preferences`

---

## 🚀 بعد الإصلاح

1. **أعد تشغيل Backend:**
```bash
sudo systemctl restart your-service
```

2. **اختبر الصفحة:**
- افتح `/app/notification-settings`
- يجب أن تعمل بدون أخطاء

3. **تحقق من Console:**
- لا توجد أخطاء 500
- Preferences يتم تحميلها بنجاح

---

**تاريخ الإنشاء:** 2026-01-24
