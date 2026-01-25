# Notification System - Quick Reference

## TL;DR - Best Practices

```python
from app.services.notification_utils import create_targeted_notification, get_users_by_role

# ✅ DO: Target specific users
create_targeted_notification(
    school_id=school_id,
    title="Your notification title",
    message="Your message",
    notification_type='attendance',  # or bus, substitution, timetable, news, etc.
    created_by=current_user_id,
    target_user_ids=[1, 2, 3],  # Specific user IDs (automatically deduplicated)
    priority='normal'  # or 'low', 'high', 'urgent'
)

# ❌ DON'T: Use target_role for small groups
# Bad: target_role='school_admin'  # Unless it's truly for ALL admins
```

---

## Common Scenarios

### 1. Notify a Single Student
```python
from app.services.notification_service import notify_student_attendance

notify_student_attendance(
    student_id=student.id,
    school_id=school_id,
    attendance_record={
        'is_absent': True,
        'subject_name': 'Math',
        'class_name': '10-A',
        'teacher_name': 'Ahmed Ali',
        'date': '2026-01-22',
        'class_time_num': 3
    },
    created_by=teacher_id
)
```

### 2. Notify Affected Teachers (Timetable Change)
```python
from app.services.notification_service import notify_teachers_timetable_change

# Automatically finds and notifies only affected teachers
notify_teachers_timetable_change(
    school_id=school_id,
    timetable_data={
        'id': timetable.id,
        'timetable_name': 'Semester 1',
        'change_description': 'Updated Math classes'
    },
    created_by=admin_id,
    affected_teacher_ids=None  # Auto-detect from timetable
)
```

### 3. Notify Substitute Teacher
```python
from app.services.notification_service import notify_teacher_substitution

notify_teacher_substitution(
    teacher_id=substitute_teacher_id,
    school_id=school_id,
    substitution_data={
        'id': substitution.id,
        'class_name': '10-A',
        'subject_name': 'Math',
        'absent_teacher_name': 'Ahmed Ali',
        'period': 3,
        'date': '2026-01-22'
    },
    created_by=admin_id
)
```

### 4. Notify All Students (News)
```python
from app.services.notification_service import notify_students_school_news

notify_students_school_news(
    school_id=school_id,
    news_data={
        'id': news.id,
        'title': 'School Holiday',
        'content': 'School will be closed tomorrow...'
    },
    created_by=admin_id
)
```

### 5. Notify Specific Users (Custom)
```python
from app.services.notification_utils import create_targeted_notification

# Get specific users
from app.models import Student, Class

class_obj = Class.query.get(class_id)
student_ids = [s.id for s in class_obj.students]

create_targeted_notification(
    school_id=school_id,
    title="Class Activity Tomorrow",
    message="Don't forget to bring your art supplies!",
    notification_type='general',
    created_by=teacher_id,
    target_user_ids=student_ids,
    priority='normal',
    action_url='/app/dashboard'
)
```

### 6. Conditional Admin Notification
```python
from app.services.notification_utils import (
    should_notify_admin_for_attendance,
    get_users_by_role,
    create_targeted_notification
)

# Count attendance issues
absent_count = 7
late_count = 3

# Only notify if serious
if should_notify_admin_for_attendance(absent_count, 0, late_count):
    admin_ids = get_users_by_role('school_admin', school_id)
    
    create_targeted_notification(
        school_id=school_id,
        title="⚠️ Serious Attendance Issue",
        message=f"Class 10-A: {absent_count} absent, {late_count} late",
        notification_type='attendance',
        created_by=teacher_id,
        target_user_ids=admin_ids,
        priority='high'
    )
```

---

## Utility Functions Cheat Sheet

### Get Users by Role
```python
from app.services.notification_utils import get_users_by_role

# Get all active teachers in a school
teacher_ids = get_users_by_role('teacher', school_id)

# Get all students except certain ones
student_ids = get_users_by_role('student', school_id, exclude_user_ids=[1, 2, 3])

# Available roles: 'student', 'teacher', 'school_admin', 'data_analyst', 'driver'
```

### Deduplicate User IDs
```python
from app.services.notification_utils import deduplicate_user_ids

user_ids = [1, 2, 3, 2, 1, 4, 3]  # Has duplicates
unique_ids = deduplicate_user_ids(user_ids)  # [1, 2, 3, 4]
```

### Get Affected Teachers from Timetable
```python
from app.services.notification_utils import get_affected_teachers_from_timetable_change

# Get all teachers who have schedules in this timetable
teacher_ids = get_affected_teachers_from_timetable_change(
    timetable_id=timetable.id,
    school_id=school_id
)
```

### Get Students in Class
```python
from app.services.notification_utils import get_students_in_class

student_ids = get_students_in_class(class_id=1, school_id=school_id)
```

### Filter by Preferences
```python
from app.services.notification_utils import filter_users_by_notification_preferences

# Only get users who have attendance notifications enabled
filtered_ids = filter_users_by_notification_preferences(
    user_ids=[1, 2, 3, 4, 5],
    notification_type='attendance'
)
```

---

## Decision Tree

### "Should I notify admins?"

```
Is it a safety issue? (students forgotten on bus)
├─ YES → Notify admins (high priority)
└─ NO
    └─ Is it a serious operational issue? (7+ absences)
        ├─ YES → Notify admins (high priority)
        └─ NO → DON'T notify admins (they can check dashboard)
```

### "Should I use role-based or specific IDs?"

```
How many users?
├─ 1-10 users → Use specific IDs
├─ 10-50 users → Use specific IDs (get via get_users_by_role)
└─ 50+ users (e.g., all students) → Use specific IDs (get via get_users_by_role)

NEVER use target_role directly - always get IDs first for deduplication
```

### "How do I avoid duplicates?"

```
Always use one of these:
1. create_targeted_notification() - handles deduplication automatically
2. deduplicate_user_ids() - if building your own list
3. Track notified_user_ids in a set - if sending multiple notifications
```

---

## Examples by Notification Type

### Attendance
```python
# Student absent
notify_student_attendance(student_id, school_id, attendance_data, created_by)

# Multiple absences (serious)
if absent_count >= 5:
    admin_ids = get_users_by_role('school_admin', school_id)
    create_targeted_notification(..., target_user_ids=admin_ids)
```

### Bus
```python
# Student boarded bus
notify_student_bus_scan(student_id, school_id, scan_data, created_by)

# Students forgotten on bus (CRITICAL)
notify_driver_forgot_students(driver_id, school_id, bus_data, created_by)
notify_admin_forgot_students_on_bus(school_id, bus_data, created_by)
```

### Timetable
```python
# Timetable updated
notify_teachers_timetable_change(
    school_id, 
    timetable_data, 
    created_by,
    affected_teacher_ids=None  # Auto-detect
)
```

### Substitution
```python
# Teacher substitution
notify_teacher_substitution(teacher_id, school_id, substitution_data, created_by)

# DON'T notify admins for routine substitutions
```

### News
```python
# School news
notify_students_school_news(school_id, news_data, created_by)
notify_teachers_school_news(school_id, news_data, created_by)  # Includes analysts
notify_driver_school_news(school_id, news_data, created_by)

# System news (admin-relevant only)
notify_admin_system_news(school_id, news_data, created_by)
```

### Behavior
```python
# Behavior note
notify_student_behavior_note(student_id, school_id, behavior_data, created_by)
```

---

## Performance Tips

### ✅ DO
- Batch get user IDs once, then send notifications
- Use `create_targeted_notification` for automatic deduplication
- Filter by preferences to avoid wasted notifications
- Use specific user IDs instead of role-based queries

### ❌ DON'T
- Query database inside loops
- Send notification without deduplication
- Notify admins for routine operations
- Use `target_role` without deduplication

---

## Priority Levels

| Priority | When to Use | User Experience |
|----------|-------------|-----------------|
| `urgent` | Safety issues, critical substitutions | Requires interaction, vibrates strongly |
| `high` | Attendance issues, important timetable changes | High visibility, persistent |
| `normal` | Regular notifications, news | Standard notification |
| `low` | FYI information, non-urgent updates | Low visibility |

---

## Testing Your Notifications

```python
# In your test or route
notification = create_targeted_notification(...)

# Verify it was created
assert notification is not None

# Check recipients
import json
user_ids = json.loads(notification.target_user_ids)
assert len(user_ids) == len(set(user_ids))  # No duplicates

# Check targeting
from app.models import User
users = User.query.filter(User.id.in_(user_ids)).all()
assert all(u.school_id == school_id for u in users)  # Same school
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Notifying admins unnecessarily
```python
# BAD
create_notification(target_role='school_admin', ...)

# GOOD
# Only notify for critical issues
if is_critical_issue:
    admin_ids = get_users_by_role('school_admin', school_id)
    create_targeted_notification(target_user_ids=admin_ids, ...)
```

### ❌ Mistake 2: Not deduplicating
```python
# BAD
for user_id in user_ids:  # May have duplicates
    create_notification(target_user_ids=[user_id], ...)

# GOOD
unique_ids = deduplicate_user_ids(user_ids)
create_targeted_notification(target_user_ids=unique_ids, ...)
```

### ❌ Mistake 3: Using role-based without filtering
```python
# BAD
create_notification(target_role='teacher', ...)  # All teachers

# GOOD
affected_teacher_ids = get_affected_teachers_from_timetable_change(...)
create_targeted_notification(target_user_ids=affected_teacher_ids, ...)
```

---

## Import Shortcuts

```python
# Core functions
from app.services.notification_service import (
    notify_student_attendance,
    notify_teacher_substitution,
    notify_teachers_timetable_change,
    notify_students_school_news,
    notify_teachers_school_news,
    notify_driver_school_news
)

# Utilities
from app.services.notification_utils import (
    create_targeted_notification,
    deduplicate_user_ids,
    get_users_by_role,
    get_affected_teachers_from_timetable_change,
    get_students_in_class,
    should_notify_admin_for_attendance
)

# Models (if needed)
from app.models import Notification, NotificationRead, NotificationPreference
```

---

## Need Help?

1. Check `NOTIFICATION_BEST_PRACTICES.md` for detailed documentation
2. Check `NOTIFICATION_CHANGES_SUMMARY.md` for what changed
3. Look at existing code in `attendance_routes.py` or `substitution_routes.py` for examples
4. Test your notifications in development before deploying

---

## Remember

**The Golden Rule**: 
> "Each user should receive exactly ONE notification per event, and only if they're actually affected by it."

**The Admin Rule**:
> "Only notify admins if it requires their immediate attention. Everything else goes to dashboards."

**The Performance Rule**:
> "Deduplicate first, then send. Never send without deduplication."
