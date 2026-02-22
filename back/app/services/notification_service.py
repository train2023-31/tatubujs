"""
Notification Service - Centralized notification creation for all user roles
"""
from app import db
from app.models import Notification, User, Student, Teacher
from app.config import get_oman_time
from datetime import datetime, timedelta
import json


def create_notification(school_id, title, message, notification_type, 
                       created_by, priority='normal', target_role=None,
                       target_user_ids=None, target_class_ids=None,
                       related_entity_type=None, related_entity_id=None,
                       action_url=None, expires_at=None):
    """
    Helper function to create a notification and send push notifications
    """
    try:
        notification = Notification(
            school_id=school_id,
            title=title,
            message=message,
            type=notification_type,
            priority=priority,
            target_role=target_role,
            target_user_ids=json.dumps(target_user_ids) if target_user_ids else None,
            target_class_ids=json.dumps(target_class_ids) if target_class_ids else None,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            created_by=created_by,
            action_url=action_url,
            expires_at=expires_at,
            is_active=True
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Send push notifications in background (import here to avoid circular imports)
        try:
            from app.routes.notification_routes import send_push_notification
            send_push_notification(notification)
        except Exception as e:
            print(f"Warning: Could not send push notification: {str(e)}")
        
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {str(e)}")
        return None


# ============================================================================
# STUDENT NOTIFICATIONS
# ============================================================================

def notify_student_attendance(student_id, school_id, attendance_record, created_by):
    """
    Notify student about their attendance status (absent, late, excuse)
    Similar to WhatsApp message format
    """
    try:
        student = Student.query.get(student_id)
        if not student:
            return None
        
        # Determine status and create appropriate message
        status_emoji = ""
        status_text = ""
        
        if attendance_record.get('is_absent'):
            status_emoji = "❌"
            status_text = "هروب من الحصة"
            priority = "high"
        elif attendance_record.get('is_late'):
            status_emoji = "⏰"
            status_text = "تأخر عن الحصة"
            priority = "normal"
        elif attendance_record.get('is_excused'):
            status_emoji = "📝"
            status_text = "غياب"
            priority = "normal"
        else:
            return None  # No need to notify for present
        
        # Format message like WhatsApp
        message = f"""
{status_emoji} {status_text}

📚 المادة: {attendance_record.get('subject_name', 'غير محدد')}
🎓 الفصل: {attendance_record.get('class_name', 'غير محدد')}
👨‍🏫 المعلم: {attendance_record.get('teacher_name', 'غير محدد')}
📅 التاريخ: {attendance_record.get('date', get_oman_time().strftime('%Y-%m-%d'))}
🕐 الحصة: {attendance_record.get('class_time_num', '-')}
"""
        
        if attendance_record.get('excuse_note'):
            message += f"\n📋 ملاحظة العذر: {attendance_record['excuse_note']}"
        
        title = f"{status_emoji} {status_text}"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='attendance',
            created_by=created_by,
            priority=priority,
            target_user_ids=[student_id],
            related_entity_type='attendance',
            related_entity_id=attendance_record.get('id'),
            action_url='/app/dashboard'
        )
    except Exception as e:
        print(f"Error notifying student about attendance: {str(e)}")
        return None


def notify_student_bus_scan(student_id, school_id, scan_data, created_by):
    """
    Notify student when they board/exit the bus
    """
    try:
        student = Student.query.get(student_id)
        if not student:
            return None
        
        scan_type = scan_data.get('scan_type')
        scan_time = scan_data.get('scan_time', get_oman_time())
        bus_number = scan_data.get('bus_number', 'غير محدد')
        location = scan_data.get('location', '')
        
        if scan_type == 'board':
            emoji = "🚌"
            action = "صعود على الحافلة"
            priority = "normal"
        else:  # exit
            emoji = "🏁"
            action = "نزول من الحافلة"
            priority = "normal"
        
        # Format time
        if isinstance(scan_time, str):
            try:
                scan_time = datetime.fromisoformat(scan_time.replace('Z', '+00:00'))
            except:
                pass
        
        time_str = scan_time.strftime('%I:%M %p') if isinstance(scan_time, datetime) else str(scan_time)
        
        message = f"""
{emoji} تم {action}

🚍 رقم الحافلة: {bus_number}
🕐 الوقت: {time_str}
"""
        
        if location:
            message += f"📍 الموقع: {location}\n"
        
        title = f"{emoji} {action}"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='bus',
            created_by=created_by,
            priority=priority,
            target_user_ids=[student_id],
            related_entity_type='bus_scan',
            related_entity_id=scan_data.get('id'),
            action_url='/app/dashboard'
        )
    except Exception as e:
        print(f"Error notifying student about bus scan: {str(e)}")
        return None


def notify_student_behavior_note(student_id, school_id, behavior_data, created_by):
    """
    Notify student about behavior note updates
    """
    try:
        student = Student.query.get(student_id)
        if not student:
            return None
        
        note = behavior_data.get('note', '')
        teacher_name = behavior_data.get('teacher_name', 'المعلم')
        
        message = f"""

👨‍🏫 من المعلم: {teacher_name}
📋 الملاحظة: {note}
📅 التاريخ: {get_oman_time().strftime('%Y-%m-%d')}
"""
        
        title = "📝 ملاحظة سلوك جديدة"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='behavior',
            created_by=created_by,
            priority='high',
            target_user_ids=[student_id],
            related_entity_type='behavior',
            related_entity_id=behavior_data.get('id'),
            action_url='/app/dashboard'
        )
    except Exception as e:
        print(f"Error notifying student about behavior note: {str(e)}")
        return None


def notify_students_school_news(school_id, news_data, created_by):
    """
    Notify all students about school news.
    BEST PRACTICE: Use role-based targeting for broad announcements to students.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification
        
        title = news_data.get('title', 'خبر جديد')
        content = news_data.get('content', '')
        
        # Truncate content if too long
        if len(content) > 200:
            content = content[:200] + "..."
        
        message = f"""
📰 {title}

{content}
"""
        
        # Get all active students in the school
        student_ids = get_users_by_role('student', school_id)
        
        if not student_ids:
            print(f"No students to notify in school {school_id}")
            return None
        
        return create_targeted_notification(
            school_id=school_id,
            title=f"📰 {title}",
            message=message.strip(),
            notification_type='news',
            created_by=created_by,
            target_user_ids=student_ids,
            priority='normal',
            related_entity_type='news',
            related_entity_id=news_data.get('id'),
            action_url='/app/news',
            expires_at=get_oman_time() + timedelta(days=30)
        )
    except Exception as e:
        print(f"Error notifying students about school news: {str(e)}")
        return None


# ============================================================================
# TEACHER/ANALYST NOTIFICATIONS
# ============================================================================

def notify_teachers_timetable_change(school_id, timetable_data, created_by, affected_teacher_ids=None):
    """
    Notify teachers about timetable changes.
    BEST PRACTICE: Only notify teachers who are actually affected by the change.
    If no affected_teacher_ids provided, use get_affected_teachers_from_timetable_change
    """
    try:
        from app.services.notification_utils import (
            get_affected_teachers_from_timetable_change,
            create_targeted_notification
        )
        
        change_description = timetable_data.get('change_description', 'تم تحديث الجدول الدراسي')
        timetable_name = timetable_data.get('timetable_name', 'الجدول الدراسي')
        timetable_id = timetable_data.get('id')
        
        # If no specific teachers provided, get all affected teachers from timetable
        if not affected_teacher_ids and timetable_id:
            affected_teacher_ids = get_affected_teachers_from_timetable_change(
                timetable_id=timetable_id,
                school_id=school_id
            )
        
        if not affected_teacher_ids:
            print(f"No teachers to notify for timetable change in school {school_id}")
            return None
        
        message = f"""

📚 الجدول: {timetable_name}
📝 التغيير: {change_description}
📅 التاريخ: {get_oman_time().strftime('%Y-%m-%d')}

⚠️ يرجى مراجعة جدولك الدراسي المحدث
"""
        
        title = "📅 تحديث الجدول الدراسي"
        
        # Use targeted notification with deduplication
        return create_targeted_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='timetable',
            created_by=created_by,
            target_user_ids=affected_teacher_ids,
            priority='high',
            related_entity_type='timetable',
            related_entity_id=timetable_id,
            action_url='/app/school-timetable'
        )
    except Exception as e:
        print(f"Error notifying teachers about timetable change: {str(e)}")
        return None


def notify_teacher_substitution(teacher_id, school_id, substitution_data, created_by):
    """
    Notify a specific teacher about their substitution assignment
    """
    try:
        teacher = Teacher.query.get(teacher_id)
        if not teacher:
            return None
        
        class_name = substitution_data.get('class_name', 'غير محدد')
        subject_name = substitution_data.get('subject_name', 'غير محدد')
        absent_teacher = substitution_data.get('absent_teacher_name', 'غير محدد')
        period = substitution_data.get('period', '-')
        date = substitution_data.get('date', get_oman_time().strftime('%Y-%m-%d'))
        
        message = f"""

👨‍🏫 بديل عن: {absent_teacher}
🎓 الفصل: {class_name}
📚 المادة: {subject_name}
🕐 الحصة: {period}
📅 التاريخ: {date}

⚠️ يرجى الاستعداد للحصة
"""
        
        title = "🔄 إحتياط جديد"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='substitution',
            created_by=created_by,
            priority='urgent',
            target_user_ids=[teacher_id],
            related_entity_type='substitution',
            related_entity_id=substitution_data.get('id'),
            action_url='/app/teacher-substitution'
        )
    except Exception as e:
        print(f"Error notifying teacher about substitution: {str(e)}")
        return None


def notify_teachers_school_news(school_id, news_data, created_by):
    """
    Notify all teachers and analysts about school news.
    BEST PRACTICE: Combine teachers and analysts into one notification to avoid duplicates.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification
        
        title = news_data.get('title', 'خبر جديد')
        content = news_data.get('content', '')
        
        # Truncate content if too long
        if len(content) > 200:
            content = content[:200] + "..."
        
        message = f"""
📰 {title}

{content}
"""
        
        # Get all teachers and analysts (combined to avoid duplicate notifications)
        teacher_ids = get_users_by_role('teacher', school_id)
        analyst_ids = get_users_by_role('data_analyst', school_id)
        
        # Combine and deduplicate
        all_user_ids = list(set(teacher_ids + analyst_ids))
        
        if not all_user_ids:
            print(f"No teachers/analysts to notify in school {school_id}")
            return None
        
        # Single notification to all relevant users
        return create_targeted_notification(
            school_id=school_id,
            title=f"📰 {title}",
            message=message.strip(),
            notification_type='news',
            created_by=created_by,
            target_user_ids=all_user_ids,
            priority='normal',
            related_entity_type='news',
            related_entity_id=news_data.get('id'),
            action_url='/app/news',
            expires_at=get_oman_time() + timedelta(days=30)
        )
    except Exception as e:
        print(f"Error notifying teachers about school news: {str(e)}")
        return None


def notify_teachers_system_news(school_id, news_data, created_by):
    """
    Notify teachers and analysts about system-wide news.
    BEST PRACTICE: Single notification to all relevant users, deduplicated.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification
        
        title = news_data.get('title', 'خبر جديد من النظام')
        content = news_data.get('content', '')
        
        # Truncate content if too long
        if len(content) > 200:
            content = content[:200] + "..."
        
        message = f"""
🔔 إعلان من النظام

{title}

{content}
"""
        
        # Get teachers and analysts (combined for single notification)
        teacher_ids = get_users_by_role('teacher', school_id)
        analyst_ids = get_users_by_role('data_analyst', school_id)
        
        # Combine and deduplicate
        all_user_ids = list(set(teacher_ids + analyst_ids))
        
        if not all_user_ids:
            print(f"No teachers/analysts to notify in school {school_id}")
            return None
        
        return create_targeted_notification(
            school_id=school_id,
            title=f"🔔 {title}",
            message=message.strip(),
            notification_type='news',
            created_by=created_by,
            target_user_ids=all_user_ids,
            priority='normal',
            related_entity_type='news',
            related_entity_id=news_data.get('id'),
            action_url='/app/news',
            expires_at=get_oman_time() + timedelta(days=30)
        )
    except Exception as e:
        print(f"Error notifying teachers about system news: {str(e)}")
        return None


# ============================================================================
# DRIVER NOTIFICATIONS
# ============================================================================

def notify_driver_school_news(school_id, news_data, created_by):
    """
    Notify all drivers about school news.
    BEST PRACTICE: Target specific drivers rather than using role-based.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification
        
        title = news_data.get('title', 'خبر جديد')
        content = news_data.get('content', '')
        
        # Truncate content if too long
        if len(content) > 200:
            content = content[:200] + "..."
        
        message = f"""
📰 {title}

{content}
"""
        
        # Get all drivers in the school
        driver_ids = get_users_by_role('driver', school_id)
        
        if not driver_ids:
            print(f"No drivers to notify in school {school_id}")
            return None
        
        return create_targeted_notification(
            school_id=school_id,
            title=f"📰 {title}",
            message=message.strip(),
            notification_type='news',
            created_by=created_by,
            target_user_ids=driver_ids,
            priority='normal',
            related_entity_type='news',
            related_entity_id=news_data.get('id'),
            action_url='/app/news',
            expires_at=get_oman_time() + timedelta(days=30)
        )
    except Exception as e:
        print(f"Error notifying drivers about school news: {str(e)}")
        return None


def notify_driver_forgot_students(driver_id, school_id, bus_data, created_by):
    """
    Notify driver if they forgot students on the bus
    """
    try:
        bus_number = bus_data.get('bus_number', 'غير محدد')
        students_count = bus_data.get('students_count', 0)
        student_names = bus_data.get('student_names', [])
        
        message = f"""

🚍 الحافلة: {bus_number}
👥 عدد الطلاب: {students_count}

الطلاب:
"""
        
        for name in student_names[:5]:  # Show max 5 names
            message += f"• {name}\n"
        
        if len(student_names) > 5:
            message += f"... و {len(student_names) - 5} طلاب آخرين\n"
        
        message += "\n⚠️ يرجى التأكد من نزول جميع الطلاب"
        
        title = "⚠️ تحذير: طلاب على الحافلة"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='bus',
            created_by=created_by,
            priority='urgent',
            target_user_ids=[driver_id],
            related_entity_type='bus',
            related_entity_id=bus_data.get('id'),
            action_url='/app/bus-scanner'
        )
    except Exception as e:
        print(f"Error notifying driver about forgot students: {str(e)}")
        return None


# ============================================================================
# SCHOOL ADMIN NOTIFICATIONS
# ============================================================================

def notify_admin_system_news(school_id, news_data, created_by):
    """
    Notify school admins about system-wide news.
    BEST PRACTICE: Only for important system announcements directed at admins.
    This should be used sparingly - only for admin-relevant news.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification
        
        title = news_data.get('title', 'خبر جديد من النظام')
        content = news_data.get('content', '')
        
        # Truncate content if too long
        if len(content) > 200:
            content = content[:200] + "..."
        
        message = f"""
🔔 إعلان من النظام

{title}

{content}
"""
        
        # Get school admins
        admin_ids = get_users_by_role('school_admin', school_id)
        
        if not admin_ids:
            print(f"No admins to notify in school {school_id}")
            return None
        
        return create_targeted_notification(
            school_id=school_id,
            title=f"🔔 {title}",
            message=message.strip(),
            notification_type='news',
            created_by=created_by,
            target_user_ids=admin_ids,
            priority='high',
            related_entity_type='news',
            related_entity_id=news_data.get('id'),
            action_url='/app/news',
            expires_at=get_oman_time() + timedelta(days=30)
        )
    except Exception as e:
        print(f"Error notifying admins about system news: {str(e)}")
        return None


def notify_admin_forgot_students_on_bus(school_id, bus_data, created_by):
    """
    Notify school admins if a bus forgot students
    """
    try:
        bus_number = bus_data.get('bus_number', 'غير محدد')
        driver_name = bus_data.get('driver_name', 'غير محدد')
        students_count = bus_data.get('students_count', 0)
        student_names = bus_data.get('student_names', [])
        
        message = f"""
🚍 الحافلة: {bus_number}
👤 السائق: {driver_name}
👥 عدد الطلاب: {students_count}

الطلاب:
"""
        
        for name in student_names[:10]:  # Show max 10 names
            message += f"• {name}\n"
        
        if len(student_names) > 10:
            message += f"... و {len(student_names) - 10} طلاب آخرين\n"
        
        message += "\n⚠️ يرجى التواصل مع السائق فوراً"
        
        title = "⚠️ تنبيه: طلاب على الحافلة"
        
        return create_notification(
            school_id=school_id,
            title=title,
            message=message.strip(),
            notification_type='bus',
            created_by=created_by,
            priority='urgent',
            target_role='school_admin',
            related_entity_type='bus',
            related_entity_id=bus_data.get('id'),
            action_url='/app/buses'
        )
    except Exception as e:
        print(f"Error notifying admins about forgot students: {str(e)}")
        return None


# ============================================================================
# WHATSAPP NOTIFICATIONS
# ============================================================================

def notify_super_admin_whatsapp_request(school_id, school_name, created_by):
    """
    Notify super admin when a school requests WhatsApp API activation.
    """
    try:
        admin_users = User.query.filter(
            User.user_role == 'admin',
            User.is_active == True
        ).all()
        admin_ids = [u.id for u in admin_users]
        if not admin_ids:
            return None
        return create_notification(
            school_id=school_id,
            title="طلب تفعيل WhatsApp",
            message=f"مدرسة {school_name} تطلب تفعيل خدمة WhatsApp. يرجى إضافة رابط API ومفتاح API للمدرسة.",
            notification_type='general',
            created_by=created_by,
            priority='high',
            target_user_ids=admin_ids,
            related_entity_type='whatsapp',
            action_url='/app/whatsapp-config'
        )
    except Exception as e:
        print(f"Error notifying super admin about WhatsApp request: {str(e)}")
        return None


def notify_school_admins_whatsapp_activated(school_id, created_by):
    """
    Notify school admins and data analysts when super admin successfully connects/configures WhatsApp for their school.
    """
    try:
        from app.services.notification_utils import get_users_by_role, create_targeted_notification, deduplicate_user_ids
        admin_ids = get_users_by_role('school_admin', school_id)
        analyst_ids = get_users_by_role('data_analyst', school_id)
        target_ids = deduplicate_user_ids(admin_ids + analyst_ids)
        if not target_ids:
            return None
        return create_targeted_notification(
            school_id=school_id,
            title="تم تفعيل WhatsApp لمدرستك",
            message="تم ربط WhatsApp بنجاح من قبل مدير النظام. يمكنك الآن إضافة رقم الهاتف واسم الـ Instance ومسح رمز QR.",
            notification_type='general',
            created_by=created_by,
            target_user_ids=target_ids,
            priority='high',
            related_entity_type='whatsapp',
            action_url='/app/whatsapp-config'
        )
    except Exception as e:
        print(f"Error notifying school admins about WhatsApp activation: {str(e)}")
        return None
