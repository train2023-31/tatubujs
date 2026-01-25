"""
Notification Utilities - Helper functions for targeted and deduplicated notifications
"""
from app import db
from app.models import (
    User, Student, Teacher, TimetableSchedule, TimetableTeacherMapping,
    SubstitutionAssignment, Class
)
from typing import List, Set, Optional
import json


def deduplicate_user_ids(user_ids: List[int]) -> List[int]:
    """
    Remove duplicate user IDs while preserving order
    """
    seen = set()
    result = []
    for user_id in user_ids:
        if user_id not in seen:
            seen.add(user_id)
            result.append(user_id)
    return result


def get_affected_teachers_from_timetable_change(
    timetable_id: int, 
    school_id: int,
    changed_schedules: Optional[List[int]] = None
) -> List[int]:
    """
    Get list of teacher IDs affected by timetable changes.
    Only returns teachers who have schedules in the timetable.
    
    Args:
        timetable_id: The timetable ID
        school_id: The school ID
        changed_schedules: Optional list of specific schedule IDs that changed
        
    Returns:
        List of unique teacher user IDs affected by the change
    """
    # Get all teacher XML IDs from schedules in this timetable
    if changed_schedules:
        # Only get teachers from specific changed schedules
        schedules = TimetableSchedule.query.filter(
            TimetableSchedule.timetable_id == timetable_id,
            TimetableSchedule.id.in_(changed_schedules)
        ).all()
    else:
        # Get all teachers from the timetable
        schedules = TimetableSchedule.query.filter_by(
            timetable_id=timetable_id
        ).all()
    
    teacher_xml_ids = set()
    for schedule in schedules:
        if schedule.teacher_xml_id:
            teacher_xml_ids.add(schedule.teacher_xml_id)
    
    if not teacher_xml_ids:
        return []
    
    # Map XML IDs to actual teacher user IDs
    teacher_mappings = TimetableTeacherMapping.query.filter(
        TimetableTeacherMapping.timetable_id == timetable_id,
        TimetableTeacherMapping.xml_teacher_id.in_(teacher_xml_ids),
        TimetableTeacherMapping.teacher_id.isnot(None)
    ).all()
    
    teacher_user_ids = []
    for mapping in teacher_mappings:
        if mapping.teacher_id:
            # Verify the teacher belongs to the correct school
            teacher = Teacher.query.get(mapping.teacher_id)
            if teacher and teacher.school_id == school_id:
                teacher_user_ids.append(teacher.id)
    
    return deduplicate_user_ids(teacher_user_ids)


def get_students_in_class(class_id: int, school_id: int) -> List[int]:
    """
    Get all student IDs in a specific class
    
    Args:
        class_id: The class ID
        school_id: The school ID for validation
        
    Returns:
        List of unique student user IDs
    """
    class_obj = Class.query.filter_by(id=class_id, school_id=school_id).first()
    if not class_obj:
        return []
    
    student_ids = [student.id for student in class_obj.students if student.school_id == school_id]
    return deduplicate_user_ids(student_ids)


def get_substitute_teachers_from_substitution(substitution_id: int) -> List[int]:
    """
    Get all substitute teacher IDs from a substitution
    
    Args:
        substitution_id: The substitution ID
        
    Returns:
        List of unique substitute teacher user IDs
    """
    assignments = SubstitutionAssignment.query.filter_by(
        substitution_id=substitution_id
    ).all()
    
    teacher_ids = []
    for assignment in assignments:
        if assignment.substitute_teacher_user_id:
            teacher_ids.append(assignment.substitute_teacher_user_id)
    
    return deduplicate_user_ids(teacher_ids)


def get_teachers_by_subject(subject_name: str, school_id: int, exclude_teacher_ids: Optional[List[int]] = None) -> List[int]:
    """
    Get teachers who teach a specific subject
    
    Args:
        subject_name: Name of the subject
        school_id: The school ID
        exclude_teacher_ids: Optional list of teacher IDs to exclude
        
    Returns:
        List of teacher user IDs who teach this subject
    """
    from app.models import Subject
    
    subjects = Subject.query.filter_by(
        name=subject_name,
        school_id=school_id,
        is_active=True
    ).all()
    
    teacher_ids = []
    for subject in subjects:
        if subject.teacher_id:
            if not exclude_teacher_ids or subject.teacher_id not in exclude_teacher_ids:
                teacher_ids.append(subject.teacher_id)
    
    return deduplicate_user_ids(teacher_ids)


def get_users_by_role(role: str, school_id: int, exclude_user_ids: Optional[List[int]] = None) -> List[int]:
    """
    Get all users with a specific role in a school
    
    Args:
        role: User role (student, teacher, school_admin, data_analyst, driver)
        school_id: The school ID
        exclude_user_ids: Optional list of user IDs to exclude
        
    Returns:
        List of user IDs with the specified role
    """
    query = User.query.filter_by(
        user_role=role,
        school_id=school_id,
        is_active=True
    )
    
    users = query.all()
    user_ids = []
    for user in users:
        if not exclude_user_ids or user.id not in exclude_user_ids:
            user_ids.append(user.id)
    
    return deduplicate_user_ids(user_ids)


def should_notify_admin_for_attendance(absent_count: int, excused_count: int, late_count: int) -> bool:
    """
    Determine if school admin should be notified about attendance issues
    Only notify for significant issues (thresholds can be adjusted)
    
    Args:
        absent_count: Number of absent students
        excused_count: Number of excused students
        late_count: Number of late students
        
    Returns:
        True if admin should be notified, False otherwise
    """
    # Notify admin only for significant attendance issues
    return absent_count >= 5 or (absent_count + late_count) >= 8


def filter_users_by_notification_preferences(user_ids: List[int], notification_type: str) -> List[int]:
    """
    Filter user IDs based on their notification preferences
    
    Args:
        user_ids: List of user IDs to filter
        notification_type: Type of notification (attendance, bus, behavior, etc.)
        
    Returns:
        Filtered list of user IDs who have this notification type enabled
    """
    from app.models import NotificationPreference
    
    if not user_ids:
        return []
    
    # Get preferences for these users
    preferences = NotificationPreference.query.filter(
        NotificationPreference.user_id.in_(user_ids)
    ).all()
    
    # Create a mapping of user_id to preferences
    pref_map = {pref.user_id: pref for pref in preferences}
    
    # Filter users based on notification type
    type_field_map = {
        'attendance': 'attendance_enabled',
        'bus': 'bus_enabled',
        'behavior': 'behavior_enabled',
        'timetable': 'timetable_enabled',
        'substitution': 'substitution_enabled',
        'news': 'news_enabled',
        'general': 'general_enabled'
    }
    
    field_name = type_field_map.get(notification_type, 'general_enabled')
    
    filtered_ids = []
    for user_id in user_ids:
        pref = pref_map.get(user_id)
        if not pref:
            # No preference set means all notifications enabled by default
            filtered_ids.append(user_id)
        elif pref.push_enabled and getattr(pref, field_name, True):
            filtered_ids.append(user_id)
    
    return filtered_ids


def create_targeted_notification(
    school_id: int,
    title: str,
    message: str,
    notification_type: str,
    created_by: int,
    target_user_ids: List[int],
    priority: str = 'normal',
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[int] = None,
    action_url: Optional[str] = None,
    expires_at: Optional = None,
    respect_preferences: bool = True
):
    """
    Create a notification targeted to specific users with deduplication
    
    Args:
        school_id: School ID
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        created_by: User ID who created the notification
        target_user_ids: List of target user IDs
        priority: Priority level
        related_entity_type: Related entity type
        related_entity_id: Related entity ID
        action_url: Action URL
        expires_at: Expiration datetime
        respect_preferences: Whether to filter by user preferences
        
    Returns:
        Created notification object or None
    """
    from app.services.notification_service import create_notification
    
    # Deduplicate user IDs
    unique_user_ids = deduplicate_user_ids(target_user_ids)
    
    # Filter by preferences if requested
    if respect_preferences and unique_user_ids:
        unique_user_ids = filter_users_by_notification_preferences(
            unique_user_ids,
            notification_type
        )
    
    if not unique_user_ids:
        print(f"No users to notify after filtering for {notification_type}")
        return None
    
    # Create the notification
    return create_notification(
        school_id=school_id,
        title=title,
        message=message,
        notification_type=notification_type,
        created_by=created_by,
        priority=priority,
        target_user_ids=unique_user_ids,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        action_url=action_url,
        expires_at=expires_at
    )
