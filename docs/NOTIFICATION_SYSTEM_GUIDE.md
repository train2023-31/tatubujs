# Notification System Implementation Guide

## Overview

This comprehensive notification system sends targeted, WhatsApp-style notifications to specific users based on their roles and actions. All notifications are sent to specific user IDs and include detailed, formatted messages with emojis for better user experience.

## Architecture

### Core Components

1. **Notification Service** (`back/app/services/notification_service.py`)
   - Centralized notification creation functions
   - Role-specific notification formatting
   - WhatsApp-style message templates with emojis

2. **Integration Points**
   - Attendance tracking (`attendance_routes.py`)
   - Bus scanning (`bus_routes.py`)
   - News creation (`static_routes.py`)
   - Timetable management (`timetable_routes.py`)
   - Substitution management (`substitution_routes.py`)

3. **Notification Delivery**
   - Database storage (immediate query access)
   - Push notifications (background/offline delivery)
   - In-app notifications (real-time)

## Notification Types by User Role

### 📚 Students

#### 1. Attendance Notifications
**When:** Student is marked absent, late, or excused
**Priority:** High (absent), Normal (late/excuse)
**Format:**
```
❌ هروب من الحصة

📚 المادة: الرياضيات
🎓 الفصل: الصف الثامن أ
👨‍🏫 المعلم: أحمد محمد
📅 التاريخ: 2026-01-22
🕐 الحصة: 3
```

**Implementation:**
```python
notify_student_attendance(
    student_id=student.id,
    school_id=user.school_id,
    attendance_record={
        'is_absent': True,
        'subject_name': 'الرياضيات',
        'class_name': 'الصف الثامن أ',
        'teacher_name': 'أحمد محمد',
        'date': '2026-01-22',
        'class_time_num': 3,
        'excuse_note': 'عذر طبي'  # Optional
    },
    created_by=teacher_id
)
```

#### 2. Bus Scan Notifications
**When:** Student boards or exits the bus
**Priority:** Normal
**Format:**
```
🚌 تم صعود على الحافلة

🚍 رقم الحافلة: 101
🕐 الوقت: 07:30 AM
📍 الموقع: مسقط
```

**Implementation:**
```python
notify_student_bus_scan(
    student_id=student.id,
    school_id=bus.school_id,
    scan_data={
        'scan_type': 'board',  # or 'exit'
        'scan_time': datetime.now(),
        'bus_number': '101',
        'location': 'مسقط'
    },
    created_by=driver_id
)
```

#### 3. Behavior Note Notifications
**When:** Teacher adds a behavior note
**Priority:** High
**Format:**
```
📝 ملاحظة سلوك جديدة

👨‍🏫 من المعلم: محمد علي
📋 الملاحظة: سلوك ممتاز في الفصل
📅 التاريخ: 2026-01-22
```

**Implementation:**
```python
notify_student_behavior_note(
    student_id=student.id,
    school_id=school.id,
    behavior_data={
        'note': 'سلوك ممتاز في الفصل',
        'teacher_name': 'محمد علي'
    },
    created_by=teacher_id
)
```

#### 4. School News Notifications
**When:** School admin publishes school news
**Priority:** Normal
**Target:** All students in the school
**Implementation:**
```python
notify_students_school_news(
    school_id=school.id,
    news_data={
        'id': news.id,
        'title': 'إعلان مهم',
        'content': 'تم تأجيل الاختبارات...'
    },
    created_by=admin_id
)
```

---

### 👨‍🏫 Teachers & Analysts

#### 1. Timetable Change Notifications
**When:** Timetable is created or updated
**Priority:** High
**Format:**
```
📅 تحديث الجدول الدراسي

📚 الجدول: الفصل الدراسي الأول
📝 التغيير: تم رفع جدول دراسي جديد
📅 التاريخ: 2026-01-22

⚠️ يرجى مراجعة جدولك الدراسي المحدث
```

**Implementation:**
```python
notify_teachers_timetable_change(
    school_id=school.id,
    timetable_data={
        'id': timetable.id,
        'timetable_name': 'الفصل الدراسي الأول',
        'change_description': 'تم رفع جدول دراسي جديد'
    },
    created_by=admin_id,
    affected_teacher_ids=None  # None = all teachers
)
```

#### 2. Substitution Notifications
**When:** Teacher is assigned as substitute
**Priority:** Urgent
**Format:**
```
🔄 إحتياط جديد

👨‍🏫 بديل عن: محمد علي
🎓 الفصل: الصف التاسع ب
📚 المادة: العلوم
🕐 الحصة: 2
📅 التاريخ: 2026-01-23

⚠️ يرجى الاستعداد للحصة
```

**Implementation:**
```python
notify_teacher_substitution(
    teacher_id=substitute_teacher.id,
    school_id=school.id,
    substitution_data={
        'id': substitution.id,
        'class_name': 'الصف التاسع ب',
        'subject_name': 'العلوم',
        'absent_teacher_name': 'محمد علي',
        'period': '2',
        'date': '2026-01-23'
    },
    created_by=admin_id
)
```

#### 3. School News Notifications
**When:** School admin publishes school news
**Priority:** Normal
**Target:** All teachers and analysts
**Implementation:**
```python
notify_teachers_school_news(
    school_id=school.id,
    news_data={
        'id': news.id,
        'title': 'إعلان للمعلمين',
        'content': 'اجتماع المعلمين غداً...'
    },
    created_by=admin_id
)
```

#### 4. System News Notifications
**When:** System admin publishes global news
**Priority:** Normal
**Target:** All teachers and analysts across all schools
**Implementation:**
```python
notify_teachers_system_news(
    school_id=school.id,
    news_data={
        'id': news.id,
        'title': 'تحديث النظام',
        'content': 'سيتم تحديث النظام...'
    },
    created_by=system_admin_id
)
```

---

### 🚌 Drivers

#### 1. Forgot Students Alert
**When:** Students left on bus at end of day
**Priority:** Urgent
**Format:**
```
⚠️ تحذير: طلاب على الحافلة

🚍 الحافلة: 101
👥 عدد الطلاب: 3

الطلاب:
• أحمد محمد
• فاطمة علي
• سارة حسن

⚠️ يرجى التأكد من نزول جميع الطلاب
```

**Implementation:**
```python
notify_driver_forgot_students(
    driver_id=driver.id,
    school_id=school.id,
    bus_data={
        'id': bus.id,
        'bus_number': '101',
        'students_count': 3,
        'student_names': ['أحمد محمد', 'فاطمة علي', 'سارة حسن']
    },
    created_by=system_id
)
```

#### 2. School News Notifications
**When:** School admin publishes school news
**Priority:** Normal
**Target:** All drivers
**Implementation:**
```python
notify_driver_school_news(
    school_id=school.id,
    news_data={
        'id': news.id,
        'title': 'إعلان للسائقين',
        'content': 'تغيير مواعيد الرحلات...'
    },
    created_by=admin_id
)
```

---

### 👔 School Admins

#### 1. Forgot Students Alert
**When:** Students left on bus at end of day
**Priority:** Urgent
**Format:**
```
⚠️ تنبيه: طلاب على الحافلة

🚍 الحافلة: 101
👤 السائق: محمد حسن
👥 عدد الطلاب: 3

الطلاب:
• أحمد محمد
• فاطمة علي
• سارة حسن

⚠️ يرجى التواصل مع السائق فوراً
```

**Implementation:**
```python
notify_admin_forgot_students_on_bus(
    school_id=school.id,
    bus_data={
        'id': bus.id,
        'bus_number': '101',
        'driver_name': 'محمد حسن',
        'students_count': 3,
        'student_names': ['أحمد محمد', 'فاطمة علي', 'سارة حسن']
    },
    created_by=system_id
)
```

#### 2. System News Notifications
**When:** System admin publishes global news
**Priority:** High
**Target:** All school admins
**Implementation:**
```python
notify_admin_system_news(
    school_id=school.id,
    news_data={
        'id': news.id,
        'title': 'إعلان مهم',
        'content': 'تحديث النظام القادم...'
    },
    created_by=system_admin_id
)
```

---

## Automatic Checks

### Check for Forgotten Students on Buses

**Endpoint:** `POST /api/buses/check-forgotten-students`
**Auth:** JWT Required (school_admin or admin only)
**Purpose:** Check all buses for students who boarded but haven't exited

**How it works:**
1. Gets today's bus scans
2. Groups scans by student
3. Checks if last scan is 'board' (not exited)
4. Sends notifications to:
   - Driver (urgent)
   - School admins (urgent)

**Response:**
```json
{
  "message": "Check completed successfully",
  "buses_with_students": 2,
  "notifications_sent": 4,
  "details": {
    "buses": [
      {
        "bus_number": "101",
        "students_count": 3,
        "student_names": ["أحمد محمد", "فاطمة علي"],
        "driver_name": "محمد حسن"
      }
    ],
    "notifications": [
      {
        "type": "driver",
        "recipient_id": 123,
        "bus_number": "101"
      },
      {
        "type": "admin",
        "school_id": 1,
        "bus_number": "101"
      }
    ]
  }
}
```

**Usage:**
```bash
# Manual trigger
curl -X POST http://localhost:5000/api/buses/check-forgotten-students \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or schedule via cron (recommended at end of school day, e.g., 3:00 PM)
0 15 * * * curl -X POST http://localhost:5000/api/buses/check-forgotten-students \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Integration Examples

### Example 1: Attendance Tracking Integration

```python
# In attendance_routes.py

from app.services.notification_service import notify_student_attendance

# After recording attendance
for record in attendance_records:
    student = Student.query.get(record['student_id'])
    subject = Subject.query.get(record['subject_id'])
    teacher = Teacher.query.get(teacher_id)
    
    # Prepare attendance data
    attendance_data = {
        'is_absent': record.get('is_Acsent', False),
        'is_late': record.get('is_late', False),
        'is_excused': record.get('is_Excus', False),
        'subject_name': subject.name,
        'class_name': class_obj.name,
        'teacher_name': teacher.fullName,
        'date': attendance_date.strftime('%Y-%m-%d'),
        'class_time_num': record.get('class_time_num', '-'),
        'excuse_note': record.get('ExcusNote', '')
    }
    
    # Send notification if student has any status
    if record.get('is_Acsent') or record.get('is_late') or record.get('is_Excus'):
        notify_student_attendance(
            student_id=student.id,
            school_id=user.school_id,
            attendance_record=attendance_data,
            created_by=teacher_id
        )
```

### Example 2: News Publication Integration

```python
# In static_routes.py

from app.services.notification_service import (
    notify_students_school_news,
    notify_teachers_school_news,
    notify_driver_school_news,
    notify_teachers_system_news,
    notify_admin_system_news
)

# After creating news
news_data = {
    'id': new_news.id,
    'title': title,
    'content': description
}

if news_type == 'school':
    # School news - notify students, teachers, and drivers
    notify_students_school_news(school_id, news_data, user.id)
    notify_teachers_school_news(school_id, news_data, user.id)
    notify_driver_school_news(school_id, news_data, user.id)
elif news_type == 'global':
    # System news - notify teachers and admins across all schools
    schools = School.query.all()
    for school in schools:
        notify_teachers_system_news(school.id, news_data, user.id)
        notify_admin_system_news(school.id, news_data, user.id)
```

---

## Features

### ✅ Implemented
- **Student notifications:** Attendance, bus scans, school news
- **Teacher notifications:** Timetable changes, substitutions, school/system news
- **Driver notifications:** Forgot students alert, school news
- **Admin notifications:** Forgot students alert, system news
- **Automatic checks:** Endpoint for checking forgotten students on buses
- **WhatsApp-style formatting:** Emoji icons and structured messages
- **Priority levels:** Urgent, high, normal, low
- **Push notifications:** Background/offline delivery support

### ⏳ Pending Integration
- **Behavior note notifications:** Function exists, needs endpoint integration

---

## Best Practices

1. **Always specify user IDs:** Target specific users whenever possible
2. **Use appropriate priority:** Urgent for safety issues, high for important updates, normal for general info
3. **Include context:** Add all relevant details (class, subject, time, etc.)
4. **Format consistently:** Use emoji icons and structured format
5. **Error handling:** Wrap notification calls in try-except blocks
6. **Don't block main flow:** Notifications should not fail the main operation

---

## Testing

### Manual Testing

```python
# Test attendance notification
from app.services.notification_service import notify_student_attendance

notify_student_attendance(
    student_id=123,
    school_id=1,
    attendance_record={
        'is_absent': True,
        'subject_name': 'Test Subject',
        'class_name': 'Test Class',
        'teacher_name': 'Test Teacher',
        'date': '2026-01-22',
        'class_time_num': 1
    },
    created_by=1
)
```

### Verify Notification Created

```python
# Check database
from app.models import Notification
notification = Notification.query.order_by(Notification.created_at.desc()).first()
print(notification.title)
print(notification.message)
print(notification.target_user_ids)
```

---

## Database Schema

Notifications are stored in the `notifications` table with:
- `target_user_ids`: JSON array of specific user IDs
- `target_role`: Broad role targeting (optional)
- `type`: Notification type (attendance, bus, timetable, substitution, news, behavior)
- `priority`: Urgency level
- `related_entity_type`: Link to source entity
- `action_url`: Deep link to relevant page
- `is_active`: Soft delete flag
- `expires_at`: Optional expiration

---

## Troubleshooting

### Notifications not appearing
1. Check `is_active = True`
2. Verify `target_user_ids` contains correct user ID
3. Check `expires_at` hasn't passed
4. Verify user's school_id matches notification's school_id

### Push notifications not working
1. Verify VAPID keys are configured
2. Check user has active push subscription
3. Ensure `pywebpush` is installed
4. Check browser supports push notifications

---

## Support

For issues or questions:
1. Check this documentation
2. Review notification service code
3. Test with manual function calls
4. Check database records directly
