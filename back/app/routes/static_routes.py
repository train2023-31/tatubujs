# app/routes/user_routes.py

from flask import Blueprint, jsonify ,request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Student, Teacher, School ,Class,Attendance ,student_classes,News,Subject,Timetable,TeacherSubstitution,Driver,Bus
from app import db
from werkzeug.security import generate_password_hash
from io import StringIO
import pandas as pd
from sqlalchemy import func, and_ ,or_, case
from datetime import datetime, date ,timedelta
from twilio.rest import Client
from app.logger import log_action
from datetime import datetime, timedelta
from app.config import get_oman_time
import logging
import requests
import json
from ibulk_sms_service import get_ibulk_sms_service, IBulkSMSService

logger = logging.getLogger(__name__)

static_blueprint = Blueprint('static_blueprint', __name__)


def get_school_statistics(user, school_id, selected_date):
    """Get statistics for a school based on user role."""

    # Ensure the selected_date is a `date` object
    if isinstance(selected_date, str):
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()

    # Retrieve the school
    school = db.session.query(School).filter(School.id == school_id, School.is_active == True).first()
    if not school:
        return {"error": "School not found or inactive"}

    # Active class IDs
    classes = db.session.query(Class.id).filter(
        and_(Class.school_id == school_id, Class.is_active == True)
    ).subquery()

    # Number of active students
    num_students = db.session.query(func.count(Student.id)).filter(
        and_(Student.school_id == school_id, Student.is_active == True)
    ).scalar()

    # Number of active teachers
    num_teachers = db.session.query(func.count(Teacher.id)).filter(
        and_(Teacher.school_id == school_id, Teacher.is_active == True)
    ).scalar()

    # Number of active classes
    num_classes = db.session.query(func.count(Class.id)).filter(
        Class.id.in_(classes)
    ).scalar()

    # Count distinct student_ids for each attendance category
    num_absents = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
        and_(
            Attendance.class_id.in_(classes),
            Attendance.date == selected_date,
            Attendance.is_Acsent == True
        )
    ).scalar()

    num_lates = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
        and_(
            Attendance.class_id.in_(classes),
            Attendance.date == selected_date,
            Attendance.is_late == True
        )
    ).scalar()

    num_presents = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
        and_(
            Attendance.class_id.in_(classes),
            Attendance.date == selected_date,
            Attendance.is_present == True
        )
    ).scalar()

    number_excus = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
        and_(
            Attendance.class_id.in_(classes),
            Attendance.date == selected_date,
            Attendance.is_Excus == True
        )
    ).scalar()

    return {
        "school_name": school.name,
        "number_of_students": num_students,
        "number_of_teachers": num_teachers,
        "number_of_classes": num_classes,
        "number_of_absents": num_absents,
        "number_of_lates": num_lates,
        "number_of_presents": num_presents,
        "number_of_excus": number_excus
    }


def get_class_statistics(user, school_id, selected_date):
    """Get the number of absents, presents, excused, total students, and teacher's name for each active class in a school on a specific date."""

    # Ensure the selected_date is a `date` object
    if isinstance(selected_date, str):
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()

    # Filter classes in this school
    class_query = db.session.query(Class.id, Class.name, Teacher.fullName).join(Teacher).filter(
        and_(Class.school_id == school_id, Class.is_active == True)
    )

    classes = class_query.all()

    # Collect statistics for each class
    class_stats = []
    for class_id, class_name, teacher_name in classes:
        # Total students in the class
        total_students = db.session.query(func.count(student_classes.c.student_id)).filter(
            student_classes.c.class_id == class_id
        ).scalar()

        # Number of presents
        number_of_presents = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
            and_(
                Attendance.class_id == class_id,
                Attendance.date == selected_date,
                Attendance.is_present == True
            )
        ).scalar()

        # Number of absents
        number_of_absents = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
            and_(
                Attendance.class_id == class_id,
                Attendance.date == selected_date,
                Attendance.is_Acsent == True
            )
        ).scalar()

        # Number of excused
        number_of_excus = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
            and_(
                Attendance.class_id == class_id,
                Attendance.date == selected_date,
                Attendance.is_Excus == True
            )
        ).scalar()

        # Number of lates
        number_of_lates = db.session.query(func.count(func.distinct(Attendance.student_id))).filter(
            and_(
                Attendance.class_id == class_id,
                Attendance.date == selected_date,
                Attendance.is_late == True
            )
        ).scalar()

        class_stats.append({
            "class_id": class_id,
            "class_name": class_name,
            "teacher_name": teacher_name,
            "total_students": total_students,
            "number_of_presents": number_of_presents,
            "number_of_absents": number_of_absents,
            "number_of_lates": number_of_lates,
            "number_of_excus": number_of_excus
        })

    return class_stats




def get_school_with_class_statistics(user, school_id, selected_date):
    """Get school statistics along with class-level stats for a specific date."""
    school_stats = get_school_statistics(user, school_id, selected_date)
    class_stats = get_class_statistics(user, school_id, selected_date)
    school_stats['classes'] = class_stats
    return school_stats



@static_blueprint.route('/', methods=['GET'])
@jwt_required()
def school_statistics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    # print(f"User ID: {user_id}, Role: {user.user_role}")

    # Retrieve the school_id dynamically based on user role
    if user.user_role == "admin":
        school_id = 1
        if not school_id:
            return jsonify({"error": "School ID is required for admins"}), 400
    else:
        school_id = user.school_id
        if not school_id:
            return jsonify({"error": "User does not belong to any school"}), 400

    selected_date = request.args.get('date')
    if not selected_date:
        return jsonify({"error": "Date parameter is required"}), 400

    try:
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # print(f"School ID: {school_id}, Date: {selected_date}")

    # Retrieve school statistics
    stats = get_school_with_class_statistics(user, school_id, selected_date)
    # print(f"Statistics: {stats}")

    return jsonify(stats)


@static_blueprint.route('/teacher_attendance_this_week', methods=['GET'])
@jwt_required()
def teacher_attendance_this_week():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # 1️⃣ Get selected date
    selected_date_str = request.args.get('date')
    if not selected_date_str:
        return jsonify(message="Missing date parameter."), 400

    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    # 2️⃣ Adjust the start (Sunday) and end (Thursday) of the current week
    weekday = selected_date.weekday()  # Monday=0, Sunday=6
    adjusted_day = (weekday + 1) % 7  # Sunday becomes 0
    start_of_week = selected_date - timedelta(days=adjusted_day)
    end_of_week = start_of_week + timedelta(days=4)

    teacher_attendance_summary = []

    # 3️⃣ If user is a teacher
    if user.user_role == 'teacher':
        teacher = Teacher.query.get(user.id)
        if not teacher:
            return jsonify(message="Teacher not found."), 404

        attendance_count = db.session.query(
            func.count(
                func.distinct(
                    func.concat(
                        Attendance.class_id, '-', Attendance.class_time_num, '-', func.date(Attendance.date)
                    )
                )
            )
        ).filter(
            and_(
                Attendance.teacher_id == teacher.id,
                func.date(Attendance.date) >= start_of_week.date(),
                func.date(Attendance.date) <= end_of_week.date()
            )
        ).scalar()

        teacher_attendance_summary.append({
            "teacher_id": teacher.id,
            "teacher_name": teacher.fullName,
            "job_name": teacher.job_name,
            "recorded_class_sessions_this_week": attendance_count,
            "week_Classes_Number": teacher.week_Classes_Number
        })

    # 4️⃣ If user is a school_admin
    elif user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        teachers = Teacher.query.filter_by(school_id=user.school_id, is_active=True).all()

        for teacher in teachers:
            attendance_count = db.session.query(
                func.count(
                    func.distinct(
                        func.concat(
                            Attendance.class_id, '-', Attendance.class_time_num, '-', func.date(Attendance.date)
                        )
                    )
                )
            ).filter(
                and_(
                    Attendance.teacher_id == teacher.id,
                    func.date(Attendance.date) >= start_of_week.date(),
                    func.date(Attendance.date) <= end_of_week.date()
                )
            ).scalar()

            teacher_attendance_summary.append({
                "teacher_id": teacher.id,
                "teacher_name": teacher.fullName,
                "job_name": teacher.job_name,
                "recorded_class_sessions_this_week": attendance_count,
                "week_Classes_Number": teacher.week_Classes_Number
            })

    else:
        return jsonify(message="Unauthorized access."), 403

    return jsonify({
        "week_range": {
            "start": start_of_week.strftime('%Y-%m-%d'),
            "end": end_of_week.strftime('%Y-%m-%d')
        },
        "data": teacher_attendance_summary
    }), 200



@static_blueprint.route('/teacher_master_report', methods=['GET'])
@jwt_required()
def teacher_master_report():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify(message="User not found."), 404

        # Get date range parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        if not start_date_str or not end_date_str:
            return jsonify(message="Missing start_date or end_date parameter."), 400

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

        # Validate date range
        if start_date > end_date:
            return jsonify(message="Start date cannot be after end date."), 400

        teacher_master_summary = []

        # If user is a teacher
        if user.user_role == 'teacher':
            teacher = Teacher.query.get(user.id)
            if not teacher:
                return jsonify(message="Teacher not found."), 404

            # Calculate recorded days (days with at least one record) for the date range
            recorded_days = db.session.query(
                func.count(func.distinct(func.date(Attendance.date)))
            ).filter(
                and_(
                    Attendance.teacher_id == teacher.id,
                    func.date(Attendance.date) >= start_date,
                    func.date(Attendance.date) <= end_date
                )
            ).scalar()

            # Calculate total expected classes for the date range
            # Count working days (Sunday to Thursday) in the date range
            working_days = 0
            current_date = start_date
            while current_date <= end_date:
                # Sunday = 6, Monday = 0, Tuesday = 1, Wednesday = 2, Thursday = 3
                if current_date.weekday() in [6, 0, 1, 2, 3]:  # Sunday to Thursday
                    working_days += 1
                current_date += timedelta(days=1)

            # Handle case where week_Classes_Number is None or 0
            week_classes = teacher.week_Classes_Number or 0
            total_expected_classes = working_days * week_classes
            percentage = round((recorded_days / working_days * 100) if working_days > 0 else 0, 2)

            teacher_master_summary.append({
                "teacher_id": teacher.id,
                "teacher_name": teacher.fullName,
                "job_name": teacher.job_name,
                "recorded_days": recorded_days,
                "working_days": working_days,
                "week_classes": week_classes,
                "total_expected_classes": total_expected_classes,
                "percentage": percentage
            })

        # If user is a school_admin
        elif user.user_role == 'school_admin' or user.user_role == 'data_analyst':
            teachers = Teacher.query.filter_by(school_id=user.school_id).all()

            for teacher in teachers:
                # Calculate recorded days (days with at least one record) for the date range
                recorded_days = db.session.query(
                    func.count(func.distinct(func.date(Attendance.date)))
                ).filter(
                    and_(
                        Attendance.teacher_id == teacher.id,
                        func.date(Attendance.date) >= start_date,
                        func.date(Attendance.date) <= end_date
                    )
                ).scalar()

                # Calculate total expected classes for the date range
                # Count working days (Sunday to Thursday) in the date range
                working_days = 0
                current_date = start_date
                while current_date <= end_date:
                    # Sunday = 6, Monday = 0, Tuesday = 1, Wednesday = 2, Thursday = 3
                    if current_date.weekday() in [6, 0, 1, 2, 3]:  # Sunday to Thursday
                        working_days += 1
                    current_date += timedelta(days=1)

                # Handle case where week_Classes_Number is None or 0
                week_classes = teacher.week_Classes_Number or 0
                total_expected_classes = working_days * week_classes
                percentage = round((recorded_days / working_days * 100) if working_days > 0 else 0, 2)

                teacher_master_summary.append({
                    "teacher_id": teacher.id,
                    "teacher_name": teacher.fullName,
                    "job_name": teacher.job_name,
                    "recorded_days": recorded_days,
                    "working_days": working_days,
                    "week_classes": week_classes,
                    "total_expected_classes": total_expected_classes,
                    "percentage": percentage
                })

        else:
            return jsonify(message="Unauthorized access."), 403

        return jsonify({
            "date_range": {
                "start": start_date.strftime('%Y-%m-%d'),
                "end": end_date.strftime('%Y-%m-%d')
            },
            "data": teacher_master_summary
        }), 200
    except Exception as e:
        print(f"Error in teacher_master_report: {str(e)}")
        return jsonify(message=f"Internal server error: {str(e)}"), 500



@static_blueprint.route('/news', methods=['POST'])
@jwt_required()
@log_action("إضافة ", description="إضافة خبر جديد")
def add_news():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    news_type = data.get('type')  # 'global' or 'school'
    is_active = data.get('is_active', True)
    end_at_str = data.get('end_at')  # ISO format
    end_at = get_oman_time().fromisoformat(end_at_str) if end_at_str else None

    if user.user_role == 'admin':
        news_type = 'global'

    if user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        news_type = 'school'

    if not title or not description or not news_type:
        return jsonify(message="Missing required fields."), 400

    # Validation
    if news_type not in ['global', 'school']:
        return jsonify(message="Invalid news type. Use 'global' or 'school'."), 400

    school_id = user.school_id if news_type == 'school' else None

    new_news = News(
        created_by=user.id,
        type=news_type,
        title=title,
        description=description,
        is_active=is_active,
        school_id=school_id,
        end_at=end_at
    )
    db.session.add(new_news)
    # log_action("إضافة ", description="إضافة خبر جديد", content=description)
    db.session.commit()



    return jsonify(message="News created successfully.", news=new_news.to_dict()), 201


@static_blueprint.route('/news', methods=['GET'])
@jwt_required()
def get_news():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    today = get_oman_time().utcnow()

    query = News.query.filter(
        News.is_active == True,
        or_(News.end_at == None, News.end_at >= today)
    )

    if user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        query = query.filter(
            or_(
                News.type == 'global',
                and_(News.type == 'school', News.school_id == user.school_id)
            )
        )
    elif user.user_role == 'admin':
        pass
    else:
        query = query.filter(
            or_(
                News.type == 'global',
                and_(News.type == 'school', News.school_id == user.school_id)
            )
        )

    news_list = query.order_by(News.created_at.desc()).all()

    formatted_news = []
    for news in news_list:
        creator = User.query.get(news.created_by)
        formatted_news.append({
            "id": news.id,
            "title": news.title,
            "description": news.description,
            "type": news.type,
            "is_active": news.is_active,
            # "school_id": news.school_id,
            "created_by": news.created_by,
            "created_by_name": creator.fullName if creator else "Unknown",
            "created_at": news.created_at.strftime('%d-%m-%Y'),
            "end_at": news.end_at.strftime('%d-%m-%Y') if news.end_at else None
        })

    return jsonify(formatted_news), 200



@static_blueprint.route('/send-bulk-daily-reports', methods=['POST'])
@jwt_required()
@log_action("إرسال تقارير يومية مجمعة", description="إرسال تقارير الحضور اليومية عبر WhatsApp")
def send_bulk_daily_reports():
    """
    Send bulk daily reports using pywhatkit
    Optimized for PythonAnywhere deployment
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        # Check authorization (only school admins and data analysts)
        if current_user.user_role not in ['school_admin', 'data_analyst', 'admin']:
            return jsonify(message="غير مصرح لك بإرسال التقارير اليومية."), 403

        # Get request data
        data = request.get_json() or {}
        date = data.get('date')
        school_id = data.get('school_id', current_user.school_id)
        delay_between_messages = data.get('delay_between_messages', 0.25)  # 15 seconds default

        if not date:
            return jsonify(message="تاريخ التقرير مطلوب."), 400

        # Import the bulk messaging service
        try:
            from bulk_whatsapp_service import get_daily_report_service
            daily_report_service = get_daily_report_service()
            logger.info("Successfully loaded daily report service")
        except ImportError as e:
            logger.error(f"Failed to import bulk_whatsapp_service: {str(e)}")
            return jsonify(message=f"خطأ في تحميل نظام الإرسال المجمع: {str(e)}"), 500
        except Exception as e:
            logger.error(f"Error loading bulk_whatsapp_service: {str(e)}")
            if 'DISPLAY' in str(e) or 'display' in str(e).lower():
                logger.warning("DISPLAY error detected - this is expected in headless environments")
                # DISPLAY errors are expected in headless environments, continue anyway
                try:
                    from bulk_whatsapp_service import get_daily_report_service
                    daily_report_service = get_daily_report_service()
                    logger.info("Successfully loaded bulk service despite DISPLAY error")
                except Exception as retry_error:
                    logger.error(f"Failed to load bulk service: {retry_error}")
                    return jsonify(message="خطأ في تحميل نظام الإرسال المجمع - يرجى المحاولة مرة أخرى"), 500
            else:
                return jsonify(message=f"خطأ في تحميل نظام الإرسال المجمع: {str(e)}"), 500

        # Get students with attendance records for the specified date
        from app.models import Attendance, Student, Class
        from sqlalchemy import and_, or_

        # Query students with attendance records for the date
        attendance_records = db.session.query(Attendance, Student, Class).join(
            Student, Attendance.student_id == Student.id
        ).join(
            Class, Attendance.class_id == Class.id
        ).filter(
            and_(
                Attendance.date == date,
                Student.school_id == school_id,
                Student.phone_number.isnot(None),
                Student.phone_number != ''
            )
        ).all()

        if not attendance_records:
            return jsonify({
                "message": "لا توجد سجلات حضور للتاريخ المحدد أو لا توجد أرقام هواتف متاحة",
                "total": 0,
                "sent": 0,
                "failed": 0
            }), 200

        # Prepare students data
        students_data = []
        for attendance, student, class_obj in attendance_records:
            # Get attendance details
            absent_times = []
            late_times = []
            excused_times = []

            # Parse attendance periods
            if attendance.absent_periods:
                try:
                    absent_times = eval(attendance.absent_periods) if isinstance(attendance.absent_periods, str) else attendance.absent_periods
                except:
                    absent_times = []

            if attendance.late_periods:
                try:
                    late_times = eval(attendance.late_periods) if isinstance(attendance.late_periods, str) else attendance.late_periods
                except:
                    late_times = []

            if attendance.excused_periods:
                try:
                    excused_times = eval(attendance.excused_periods) if isinstance(attendance.excused_periods, str) else attendance.excused_periods
                except:
                    excused_times = []

            # Only include students with attendance issues
            if absent_times or late_times or excused_times:
                students_data.append({
                    'student_name': student.student_name,
                    'class_name': class_obj.class_name,
                    'phone_number': student.phone_number,
                    'absent_times': absent_times,
                    'late_times': late_times,
                    'excused_times': excused_times,
                    'is_has_exuse': attendance.is_has_exuse or False
                })

        if not students_data:
            return jsonify({
                "message": "لا توجد طلاب لديهم مشاكل في الحضور للتاريخ المحدد",
                "total": 0,
                "sent": 0,
                "failed": 0
            }), 200

        # Get school name and phone number
        from app.models import School
        school = School.query.get(school_id)
        school_name = school.school_name if school else "المدرسة"
        school_phone = school.phone_number if school and school.phone_number else None

        # Send bulk daily reports
        results = daily_report_service.send_daily_reports(
            students_data=students_data,
            school_name=school_name,
            date=date,
            delay_between_messages=delay_between_messages,
            sender_phone=school_phone
        )

        if results['success']:
            return jsonify({
                "message": results['message'],
                "total": results['total'],
                "sent": results['sent'],
                "failed": results['failed'],
                "scheduled_messages": results.get('scheduled_messages', []),
                "failed_contacts": results.get('failed_contacts', [])
            }), 200
        else:
            return jsonify({
                "message": results['message'],
                "error": True,
                "total": results['total'],
                "sent": results['sent'],
                "failed": results['failed']
            }), 500

    except Exception as e:
        logger.error(f"Error in send_bulk_daily_reports: {str(e)}")
        error_message = str(e)

        # Handle DISPLAY errors gracefully
        if 'DISPLAY' in error_message or 'display' in error_message.lower():
            logger.warning("DISPLAY error detected in send_bulk_daily_reports - this is expected in headless environments")
            return jsonify(message="خطأ في البيئة الرسومية - يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني"), 500

        # Handle other specific errors
        if 'pywhatkit' in error_message.lower():
            return jsonify(message="خطأ في نظام الإرسال - يرجى التحقق من إعدادات WhatsApp"), 500

        # Generic error message
        return jsonify(message=f"حدث خطأ أثناء إرسال التقارير: {error_message}"), 500


@static_blueprint.route('/bulk-messaging-status', methods=['GET'])
@jwt_required()
def check_bulk_messaging_status():
    """
    Check the status of bulk messaging service
    """
    try:
        from bulk_whatsapp_service import get_bulk_whatsapp_service, get_daily_report_service

        # Test service loading
        bulk_service = get_bulk_whatsapp_service()
        daily_service = get_daily_report_service()

        return jsonify({
            "status": "success",
            "message": "نظام الإرسال المجمع جاهز للاستخدام",
            "bulk_service_available": bulk_service.is_available,
            "services_loaded": True
        }), 200

    except Exception as e:
        error_msg = str(e)
        if 'DISPLAY' in error_msg or 'display' in error_msg.lower():
            return jsonify({
                "status": "warning",
                "message": "نظام الإرسال المجمع جاهز للاستخدام (مشكلة في البيئة الرسومية متوقعة)",
                "bulk_service_available": True,
                "services_loaded": True,
                "note": "DISPLAY errors are expected in headless environments"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": f"خطأ في تحميل نظام الإرسال المجمع: {error_msg}",
                "bulk_service_available": False,
                "services_loaded": False
            }), 500


@static_blueprint.route('/news/<int:news_id>', methods=['DELETE'])
@jwt_required()
@log_action("حذف ", description="حذف خبر ")
def delete_news(news_id):

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Fetch the news item
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify(message="News not found."), 404

    # Only allow deletion based on role and ownership
    if user.user_role == 'admin':
        pass  # Admin can delete any news
    elif user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        if news_item.type != 'school' or news_item.school_id != user.school_id:
            return jsonify(message="Unauthorized to delete this news item."), 403
    else:
        return jsonify(message="Unauthorized user."), 403

    try:
        db.session.delete(news_item)
        db.session.commit()
        # log_action("حذف ", description="حذف خبر ", content= news_item.description)
        return jsonify(message="News item deleted successfully."), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500


@static_blueprint.route('/school_absence_statistics', methods=['GET'])
@jwt_required()
def school_absence_statistics():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user.user_role not in ['admin', 'school_admin','teacher', 'data_analyst']:
        return jsonify(message="Unauthorized access"), 403

    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if start_date and end_date:
            custom_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            custom_end = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            today = get_oman_time().date()
            custom_start = custom_end = today
    except:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD"), 400

    # Cache query result for active classes
    class_ids = [c[0] for c in db.session.query(Class.id).filter_by(
        school_id=user.school_id, is_active=True).all()]

    if not class_ids:
        return jsonify({
            "weekly_by_day": [],
            "monthly_by_week": [],
            "custom_by_day": []
        }), 200

    # --- Pre-compute date ranges for all queries ---
    # WEEKLY: Get full week (Sunday to Thursday) containing start_date
    weekday = custom_start.weekday()
    adjusted_day = (weekday + 1) % 7
    start_of_week = custom_start - timedelta(days=adjusted_day)
    week_days = [(start_of_week + timedelta(days=i)) for i in range(5)]

    # MONTHLY: Use start_date's month
    start_of_month = custom_start.replace(day=1)
    end_of_month = (start_of_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    last_day = min(end_of_month, custom_end)

    # Adjust to first Sunday on or before the start of month
    weekday = start_of_month.weekday()
    adjusted_day = (weekday + 1) % 7  # Makes Sunday == 0
    first_sunday = start_of_month - timedelta(days=adjusted_day)

    # --- FETCH ALL ATTENDANCE DATA FOR THE GIVEN DATE RANGE AT ONCE ---
    # Find the earliest and latest dates needed for any query
    earliest_date = min(start_of_week, first_sunday, custom_start)
    latest_date = max(start_of_week + timedelta(days=4), last_day, custom_end)

    # Get all attendance records for the entire date range in a single query
    all_attendance = db.session.query(
        Attendance.date,
        Attendance.student_id,
        Attendance.is_Acsent,
        Attendance.is_late,
        Attendance.is_Excus
    ).filter(
        Attendance.class_id.in_(class_ids),
        Attendance.date.between(earliest_date, latest_date)
    ).all()

    # Create an index for faster lookups
    attendance_by_date = {}
    for record in all_attendance:
        date_str = record.date.strftime('%Y-%m-%d')
        if date_str not in attendance_by_date:
            attendance_by_date[date_str] = []
        attendance_by_date[date_str].append(record)

    # --- WEEKLY: Process the pre-fetched data ---
    weekly = []
    for day in week_days:
        day_str = day.strftime('%Y-%m-%d')
        day_records = attendance_by_date.get(day_str, [])

        absent_students = set()
        late_students = set()
        excused_students = set()

        for record in day_records:
            if record.is_Acsent:
                absent_students.add(record.student_id)
            if record.is_late:
                late_students.add(record.student_id)
            if record.is_Excus:
                excused_students.add(record.student_id)

        weekly.append({
            "date": day_str,
            "absent": len(absent_students),
            "late": len(late_students),
            "excused": len(excused_students)
        })

    # --- MONTHLY: Process the pre-fetched data ---
    month_stats = []
    current = first_sunday
    while current <= last_day:
        week_start = current
        week_end = week_start + timedelta(days=4)  # Sunday to Thursday

        if week_end > last_day:
            week_end = last_day

        absent_students = set()
        late_students = set()
        excused_students = set()

        # Process each day in the week
        day = week_start
        while day <= week_end:
            day_str = day.strftime('%Y-%m-%d')
            day_records = attendance_by_date.get(day_str, [])

            for record in day_records:
                if record.is_Acsent:
                    absent_students.add(record.student_id)
                if record.is_late:
                    late_students.add(record.student_id)
                if record.is_Excus:
                    excused_students.add(record.student_id)

            day += timedelta(days=1)

        month_stats.append({
            "start": week_start.strftime('%Y-%m-%d'),
            "end": week_end.strftime('%Y-%m-%d'),
            "absent": len(absent_students),
            "late": len(late_students),
            "excused": len(excused_students)
        })

        current += timedelta(days=7)

    # --- CUSTOM DAILY: Process the pre-fetched data ---
    custom_daily = []
    current_day = custom_start
    while current_day <= custom_end:
        day_str = current_day.strftime('%Y-%m-%d')
        day_records = attendance_by_date.get(day_str, [])

        absent_students = set()
        late_students = set()
        excused_students = set()

        for record in day_records:
            if record.is_Acsent:
                absent_students.add(record.student_id)
            if record.is_late:
                late_students.add(record.student_id)
            if record.is_Excus:
                excused_students.add(record.student_id)

        custom_daily.append({
            "date": day_str,
            "absent": len(absent_students),
            "late": len(late_students),
            "excused": len(excused_students)
        })

        current_day += timedelta(days=1)

    return jsonify({
        "weekly_by_day": weekly,
        "monthly_by_week": month_stats,
        "custom_by_day": custom_daily
    }), 200

@static_blueprint.route('/schools-statistics', methods=['GET'])
@jwt_required()
def get_schools_statistics():
    """
    Admin only: Get static numbers for each active school between start_date and end_date (or current month if not provided).
    Includes number of students, teachers, classes, attendance, absents, presents, lates, and overall totals.
    """

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or user.user_role != 'admin':
        return jsonify(message="Unauthorized access"), 403

    today = get_oman_time().date()

    # ✅ قراءة الفترات المطلوبة
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    try:
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            start_date = today.replace(day=1)
            end_date = today
    except:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    active_schools = School.query.filter_by(is_active=True).all()

    results = []

    total_students = 0
    total_teachers = 0
    total_classes = 0
    total_attendances = 0
    total_absents = 0
    total_presents = 0
    total_lates = 0
    total_Excus =0

    for school in active_schools:
        num_students = Student.query.filter_by(school_id=school.id, is_active=True).count()
        num_teachers = Teacher.query.filter_by(school_id=school.id, is_active=True).count()
        num_classes = Class.query.filter_by(school_id=school.id, is_active=True).count()

        class_ids = db.session.query(Class.id).filter_by(school_id=school.id, is_active=True).subquery()

        num_attendances = db.session.query(Attendance.id).filter(
            Attendance.class_id.in_(class_ids),
            Attendance.date.between(start_date, end_date)
        ).count()

        num_absents = db.session.query(Attendance.id).filter(
            Attendance.class_id.in_(class_ids),
            Attendance.date.between(start_date, end_date),
            Attendance.is_Acsent == True
        ).count()

        num_presents = db.session.query(Attendance.id).filter(
            Attendance.class_id.in_(class_ids),
            Attendance.date.between(start_date, end_date),
            Attendance.is_present == True
        ).count()

        num_lates = db.session.query(Attendance.id).filter(
            Attendance.class_id.in_(class_ids),
            Attendance.date.between(start_date, end_date),
            Attendance.is_late == True
        ).count()

        num_Excus = db.session.query(Attendance.id).filter(
            Attendance.class_id.in_(class_ids),
            Attendance.date.between(start_date, end_date),
            Attendance.is_Excus == True
        ).count()

        results.append({
            "school_id": school.id,
            "school_name": school.name,
            "num_students": num_students,
            "num_teachers": num_teachers,
            "num_classes": num_classes,
            "num_attendances_in_period": num_attendances,
            "num_absents_in_period": num_absents,
            "num_exuse_in_period": num_Excus,
            "num_presents_in_period": num_presents,
            "num_lates_in_period": num_lates
        })

        # ✅ Add to totals
        total_students += num_students
        total_teachers += num_teachers
        total_classes += num_classes
        total_attendances += num_attendances
        total_absents += num_absents
        total_presents += num_presents
        total_lates += num_lates
        total_Excus += num_Excus

    return jsonify({
        "start_date": start_date.strftime('%Y-%m-%d'),
        "end_date": end_date.strftime('%Y-%m-%d'),
        "total_schools": len(active_schools),
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "total_attendances": total_attendances,
        "total_absents": total_absents,
        "total_presents": total_presents,
        "total_Excus": total_Excus,
        "total_lates": total_lates,
        "schools_statistics": results
    }), 200

@static_blueprint.route('/bulk-operations-status', methods=['GET'])
@jwt_required()
def get_bulk_operations_status():
    """
    Get the status of bulk operations setup steps for the school.
    Returns which steps are completed and which need attention.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get school ID based on user role
    school_id = user.school_id if user.user_role != 'admin' else request.args.get('school_id')

    if not school_id:
        return jsonify({"error": "School ID is required"}), 400

    # Check each step completion status
    step_status = {}


    # Step 1: Check if teachers exist (ignore 'school admin' users)
    teachers_count = Teacher.query.filter(
        Teacher.school_id == school_id,
        Teacher.is_active == True,
        Teacher.user_role != 'school_admin'
    ).count()
    step_status['step1_teachers'] = {
        'completed': teachers_count > 0,
        'count': teachers_count,
        'message': f"Found {teachers_count} active teachers (excluding school admins)" if teachers_count > 0 else "No teachers found (excluding school admins)"
    }

    # Step 2: Check if students and classes exist
    students_count = Student.query.filter_by(school_id=school_id, is_active=True).count()
    classes_count = Class.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step2_students_classes'] = {
        'completed': students_count > 0 and classes_count > 0,
        'students_count': students_count,
        'classes_count': classes_count,
        'message': f"Found {students_count} students and {classes_count} classes" if students_count > 0 and classes_count > 0 else f"Students: {students_count}, Classes: {classes_count}"
    }

    # Step 3: Check if students have phone numbers
    students_with_phones = Student.query.filter(
        and_(
            Student.school_id == school_id,
            Student.is_active == True,
            Student.phone_number.isnot(None),
            Student.phone_number != '',
            Student.phone_number != '0'
        )
    ).count()
    step_status['step3_phone_numbers'] = {
        'completed': students_with_phones > 0,
        'students_with_phones': students_with_phones,
        'total_students': students_count,
        'percentage': round((students_with_phones / students_count * 100), 2) if students_count > 0 else 0,
        'message': f"{students_with_phones}/{students_count} students have phone numbers ({round((students_with_phones / students_count * 100), 2)}%)" if students_count > 0 else "No students found"
    }

    # Step 4: Check if subjects exist
    subjects_count = Subject.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step4_subjects'] = {
        'completed': subjects_count > 0,
        'count': subjects_count,
        'message': f"Found {subjects_count} active subjects" if subjects_count > 0 else "No subjects found"
    }

    # Step 5: Check if timetable exists
    timetable_count = Timetable.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step5_timetable'] = {
        'completed': timetable_count > 0,
        'count': timetable_count,
        'message': f"Found {timetable_count} active timetable(s)" if timetable_count > 0 else "No timetable found"
    }

    # Step 6: Check if substitutions exist
    substitutions_count = TeacherSubstitution.query.filter_by(school_id=school_id).count()
    step_status['step6_substitutions'] = {
        'completed': substitutions_count > 0,
        'count': substitutions_count,
        'message': f"Found {substitutions_count} substitution record(s)" if substitutions_count > 0 else "No substitutions found"
    }

    # Step 7: Check if attendance has been taken (any attendance records exist)
    attendance_count = Attendance.query.join(Class).filter(
        and_(
            Class.school_id == school_id,
            Attendance.date >= date.today() - timedelta(days=30)  # Check last 30 days
        )
    ).count()
    step_status['step7_attendance'] = {
        'completed': attendance_count > 0,
        'count': attendance_count,
        'message': f"Found {attendance_count} attendance records in the last 30 days" if attendance_count > 0 else "No attendance records found"
    }

    # Step 8: Check if drivers exist
    drivers_count = Driver.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step8_drivers'] = {
        'completed': drivers_count > 0,
        'count': drivers_count,
        'message': f"Found {drivers_count} active driver(s)" if drivers_count > 0 else "No drivers found"
    }

    # Step 9: Check if buses exist
    buses_count = Bus.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step9_buses'] = {
        'completed': buses_count > 0,
        'count': buses_count,
        'message': f"Found {buses_count} active bus(es)" if buses_count > 0 else "No buses found"
    }

    # Calculate overall completion status
    completed_steps = sum(1 for step in step_status.values() if step['completed'])
    total_steps = len(step_status)
    overall_completion = round((completed_steps / total_steps * 100), 2)

    # Determine if setup is needed
    needs_setup = completed_steps < total_steps

    return jsonify({
        'school_id': school_id,
        'needs_setup': needs_setup,
        'overall_completion': overall_completion,
        'completed_steps': completed_steps,
        'total_steps': total_steps,
        'step_status': step_status,
        'setup_complete': not needs_setup
    }), 200


@static_blueprint.route('/sms-config', methods=['GET'])
@jwt_required()
def get_sms_config():
    """
    Get SMS configuration for a school
    """
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can access SMS config
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Get school_id
    school_id = request.args.get('school_id', user.school_id)
    
    if user.user_role == 'admin' and not school_id:
        return jsonify({
            "message": {
                "en": "School ID is required for admins.",
                "ar": "معرف المدرسة مطلوب للمسؤولين."
            },
            "flag": 2
        }), 400

    try:
        # Get school
        school = School.query.get(school_id)
        if not school:
            return jsonify({
                "message": {
                    "en": "School not found.",
                    "ar": "المدرسة غير موجودة."
                },
                "flag": 3
            }), 404

        return jsonify({
            "message": {
                "en": "SMS configuration retrieved successfully",
                "ar": "تم استرجاع إعدادات SMS بنجاح"
            },
            "sms_config": {
                "ibulk_username": school.ibulk_username,
                "ibulk_sender_id": school.ibulk_sender_id,
                "ibulk_api_url": school.ibulk_api_url,
                "ibulk_balance_threshold": school.ibulk_balance_threshold,
                "ibulk_current_balance": school.ibulk_current_balance,
                "ibulk_last_balance_check": school.ibulk_last_balance_check.isoformat() if school.ibulk_last_balance_check else None
            },
            "school_id": school_id,
            "flag": 4
        }), 200

    except Exception as e:
        return jsonify({
            "message": {
                "en": f"Error retrieving SMS configuration: {str(e)}",
                "ar": f"خطأ في استرجاع إعدادات SMS: {str(e)}"
            },
            "flag": 5
        }), 500


@static_blueprint.route('/sms-config', methods=['PUT'])
@jwt_required()
@log_action("تحديث", description="تحديث إعدادات SMS للمدرسة")
def update_sms_config():
    """
    Update SMS configuration for a school
    """
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can update SMS config
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Parse request data
    data = request.get_json()
    school_id = data.get('school_id', user.school_id)

    if user.user_role == 'admin' and not school_id:
        return jsonify({
            "message": {
                "en": "School ID is required for admins.",
                "ar": "معرف المدرسة مطلوب للمسؤولين."
            },
            "flag": 2
        }), 400

    try:
        # Get school
        school = School.query.get(school_id)
        if not school:
            return jsonify({
                "message": {
                    "en": "School not found.",
                    "ar": "المدرسة غير موجودة."
                },
                "flag": 3
            }), 404

        # Update SMS configuration
        if 'ibulk_username' in data:
            school.ibulk_username = data['ibulk_username']
        
        if 'ibulk_password' in data:
            school.ibulk_password = data['ibulk_password']
        
        if 'ibulk_sender_id' in data:
            school.ibulk_sender_id = data['ibulk_sender_id']
        
        if 'ibulk_api_url' in data:
            school.ibulk_api_url = data['ibulk_api_url']
        
        if 'ibulk_balance_threshold' in data:
            school.ibulk_balance_threshold = float(data['ibulk_balance_threshold'])

        # Commit changes
        db.session.commit()

        return jsonify({
            "message": {
                "en": "SMS configuration updated successfully",
                "ar": "تم تحديث إعدادات SMS بنجاح"
            },
            "sms_config": {
                "ibulk_username": school.ibulk_username,
                "ibulk_sender_id": school.ibulk_sender_id,
                "ibulk_api_url": school.ibulk_api_url,
                "ibulk_balance_threshold": school.ibulk_balance_threshold,
                "ibulk_current_balance": school.ibulk_current_balance,
                "ibulk_last_balance_check": school.ibulk_last_balance_check.isoformat() if school.ibulk_last_balance_check else None
            },
            "school_id": school_id,
            "flag": 4
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": {
                "en": f"Error updating SMS configuration: {str(e)}",
                "ar": f"خطأ في تحديث إعدادات SMS: {str(e)}"
            },
            "flag": 5
        }), 500


@static_blueprint.route('/test-sms-connection', methods=['POST'])
@jwt_required()
@log_action("اختبار", description="اختبار اتصال SMS")
def test_sms_connection():
    """
    Test SMS service connection and credentials
    """
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can test SMS connection
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Parse request data
    data = request.get_json()
    school_id = data.get('school_id', user.school_id)

    if user.user_role == 'admin' and not school_id:
        return jsonify({
            "message": {
                "en": "School ID is required for admins.",
                "ar": "معرف المدرسة مطلوب للمسؤولين."
            },
            "flag": 2
        }), 400

    try:
        # Get credentials from request (for testing before saving)
        test_username = data.get('ibulk_username')
        test_password = data.get('ibulk_password')
        test_sender_id = data.get('ibulk_sender_id')
        test_api_url = data.get('ibulk_api_url')
        
        # Validate that credentials are provided
        if not test_username or not test_password:
            return jsonify({
                "message": {
                    "en": "Username and password are required for testing.",
                    "ar": "اسم المستخدم وكلمة المرور مطلوبان للاختبار."
                },
                "flag": 2
            }), 400
        
        # Initialize SMS service without school_id to use provided credentials
        sms_service = IBulkSMSService(school_id=None)
        
        # Set credentials from request data for testing
        sms_service.username = test_username
        sms_service.password = test_password
        sms_service.sender_id = test_sender_id
        sms_service.api_url = test_api_url or 'https://ismartsms.net/RestApi/api/SMS/PostSMS'
        
        # First, try to check balance (if endpoint exists)
        balance_result = sms_service.check_balance()
        
        # If balance check succeeds, return success
        if balance_result['success']:
            return jsonify({
                "message": {
                    "en": "SMS connection test successful",
                    "ar": "تم اختبار اتصال SMS بنجاح"
                },
                "connection_status": {
                    "success": True,
                    "balance": balance_result['balance'],
                    "currency": balance_result.get('currency', 'OMR'),
                    "message": balance_result['message']
                },
                "school_id": school_id,
                "flag": 3
            }), 200
        
        # If balance check fails, try to validate credentials by making a test API call
        # We'll make a minimal request to validate authentication
        # According to API docs: Code 3 = wrong credentials, Code 1 = success
        # Try to validate credentials by making a test call with invalid phone number
        # This will return Code 9 (Invalid Mobile No) if credentials are valid,
        # or Code 3 (User or Password is wrong) if credentials are invalid
        test_payload = {
            'UserID': test_username,
            'Password': test_password,
            'Message': 'Test',
            'Language': '64',  # Arabic
            'MobileNo': ['96800000000'],  # Invalid test number
            'RecipientType': '1',
            'ScheddateTime': ''  # Immediate send
        }
        
        try:
            test_response = requests.post(
                sms_service.api_url,
                json=test_payload,
                headers={'Content-Type': 'application/json', 'Cache-Control': 'no-cache'},
                timeout=30
            )
            
            if test_response.status_code in [200, 201]:
                try:
                    response_data = test_response.json()
                    code = response_data.get('Code', -1)
                    
                    # Code 3 = wrong credentials (authentication failed)
                    if code == 3:
                        return jsonify({
                            "message": {
                                "en": "SMS connection test failed: Invalid credentials",
                                "ar": "فشل اختبار اتصال SMS: بيانات الاعتماد غير صحيحة"
                            },
                            "connection_status": {
                                "success": False,
                                "error": "Invalid username or password (Code 3)",
                                "balance": 0.0
                            },
                            "school_id": school_id,
                            "flag": 4
                        }), 400
                    
                    # Code 9 = Invalid Mobile No (but credentials are valid!)
                    # Code 8 = Mobile No length is empty (but credentials are valid!)
                    # Code 5 = Message is blank (but credentials are valid!)
                    # Code 23 = Mobile Number Optout (but credentials are valid! The number just opted out)
                    # Code 1 = Success (Message Pushed)
                    # Any code other than 3 means credentials are valid
                    if code in [8, 9, 5, 23] or code == 1:
                        # Credentials are valid! 
                        # Code 23 means the test number opted out, but credentials work
                        if code == 23:
                            success_message = "SMS connection test successful: Credentials are valid. Note: Test phone number has opted out (Code 23), but this confirms your credentials are working correctly."
                            ar_message = "تم اختبار اتصال SMS بنجاح: بيانات الاعتماد صحيحة. ملاحظة: رقم الهاتف التجريبي قام بإلغاء الاشتراك (Code 23)، لكن هذا يؤكد أن بيانات الاعتماد تعمل بشكل صحيح."
                        else:
                            success_message = "SMS connection test successful: Credentials are valid"
                            ar_message = "تم اختبار اتصال SMS بنجاح: بيانات الاعتماد صحيحة"
                        
                        return jsonify({
                            "message": {
                                "en": success_message,
                                "ar": ar_message
                            },
                            "connection_status": {
                                "success": True,
                                "balance": balance_result.get('balance', 0.0),
                                "currency": "OMR",
                                "message": "Credentials validated successfully. Balance endpoint may not be available."
                            },
                            "school_id": school_id,
                            "flag": 3
                        }), 200
                    
                    # Code 18 = Web Service User not registered (needs provider activation)
                    if code == 18:
                        return jsonify({
                            "message": {
                                "en": "SMS connection test failed: Web Service User not registered. Please contact your SMS provider (Infocomm/Omantel) to enable REST API access for your account.",
                                "ar": "فشل اختبار اتصال SMS: المستخدم غير مسجل لخدمة REST API. يرجى الاتصال بمزود الخدمة (Infocomm/Omantel) لتفعيل الوصول إلى REST API لحسابك."
                            },
                            "connection_status": {
                                "success": False,
                                "error": "Code 18: Web Service User not registered - Contact SMS provider to enable REST API access",
                                "balance": 0.0
                            },
                            "school_id": school_id,
                            "flag": 4
                        }), 400
                    
                    # Other error codes - credentials might be valid but something else is wrong
                    error_msg = sms_service._get_error_message(code, response_data.get('Message', 'Unknown'))
                    return jsonify({
                        "message": {
                            "en": f"SMS connection test: {error_msg}",
                            "ar": f"اختبار اتصال SMS: {error_msg}"
                        },
                        "connection_status": {
                            "success": False,
                            "error": f"Code {code}: {error_msg}",
                            "balance": 0.0
                        },
                        "school_id": school_id,
                        "flag": 4
                    }), 400
                    
                except json.JSONDecodeError:
                    # Invalid JSON response
                    return jsonify({
                        "message": {
                            "en": "SMS connection test failed: Invalid API response",
                            "ar": "فشل اختبار اتصال SMS: استجابة API غير صحيحة"
                        },
                        "connection_status": {
                            "success": False,
                            "error": f"Invalid response: {test_response.text[:200]}",
                            "balance": 0.0
                        },
                        "school_id": school_id,
                        "flag": 4
                    }), 400
            else:
                # HTTP error
                return jsonify({
                    "message": {
                        "en": f"SMS connection test failed: HTTP {test_response.status_code}",
                        "ar": f"فشل اختبار اتصال SMS: HTTP {test_response.status_code}"
                    },
                    "connection_status": {
                        "success": False,
                        "error": f"HTTP {test_response.status_code}: {test_response.text[:200]}",
                        "balance": 0.0
                    },
                    "school_id": school_id,
                    "flag": 4
                }), 400
                
        except requests.RequestException as e:
            # Network error
            return jsonify({
                "message": {
                    "en": f"SMS connection test failed: Network error",
                    "ar": f"فشل اختبار اتصال SMS: خطأ في الشبكة"
                },
                "connection_status": {
                    "success": False,
                    "error": f"Network error: {str(e)}",
                    "balance": 0.0
                },
                "school_id": school_id,
                "flag": 4
            }), 400
        
        # Fallback to balance result if test call also fails
        return jsonify({
            "message": {
                "en": "SMS connection test failed",
                "ar": "فشل اختبار اتصال SMS"
            },
            "connection_status": {
                "success": False,
                "error": balance_result.get('message', 'Unknown error'),
                "balance": 0.0
            },
            "school_id": school_id,
            "flag": 4
        }), 400

    except Exception as e:
        return jsonify({
            "message": {
                "en": f"Error testing SMS connection: {str(e)}",
                "ar": f"خطأ في اختبار اتصال SMS: {str(e)}"
            },
            "flag": 5
        }), 500


