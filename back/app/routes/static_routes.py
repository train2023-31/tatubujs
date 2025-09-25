# app/routes/user_routes.py

from flask import Blueprint, jsonify ,request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Student, Teacher, School ,Class,Attendance ,student_classes,News,Subject
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

static_blueprint = Blueprint('static_blueprint', __name__)


def get_school_statistics(user, school_id, selected_date):
    """Get statistics for a school based on user role."""
    
    # Ensure the selected_date is a `date` object
    if isinstance(selected_date, str):
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()

    # Get school info and basic counts in one optimized query
    school_info = db.session.query(
        School.name,
        func.count(Student.id).label('num_students'),
        func.count(Teacher.id).label('num_teachers'),
        func.count(Class.id).label('num_classes')
    ).outerjoin(Student, and_(Student.school_id == School.id, Student.is_active == True))\
     .outerjoin(Teacher, and_(Teacher.school_id == School.id, Teacher.is_active == True))\
     .outerjoin(Class, and_(Class.school_id == School.id, Class.is_active == True))\
     .filter(School.id == school_id, School.is_active == True)\
     .group_by(School.id, School.name).first()

    if not school_info:
        return {"error": "School not found or inactive"}

    # Get active class IDs
    active_class_ids = db.session.query(Class.id).filter(
        and_(Class.school_id == school_id, Class.is_active == True)
    ).subquery()

    # Get all attendance data for the date in one optimized query
    attendance_counts = db.session.query(
        func.count(func.distinct(Attendance.student_id)).label('total_students'),
        func.sum(case((Attendance.is_present == True, 1), else_=0)).label('presents'),
        func.sum(case((Attendance.is_Acsent == True, 1), else_=0)).label('absents'),
        func.sum(case((Attendance.is_late == True, 1), else_=0)).label('lates'),
        func.sum(case((Attendance.is_Excus == True, 1), else_=0)).label('excused')
    ).filter(
        and_(
            Attendance.class_id.in_(active_class_ids),
            Attendance.date == selected_date
        )
    ).first()

    return {
        "school_name": school_info.name,
        "number_of_students": school_info.num_students,
        "number_of_teachers": school_info.num_teachers,
        "number_of_classes": school_info.num_classes,
        "number_of_absents": attendance_counts.absents or 0,
        "number_of_lates": attendance_counts.lates or 0,
        "number_of_presents": attendance_counts.presents or 0,
        "number_of_excus": attendance_counts.excused or 0
    }


def get_class_statistics(user, school_id, selected_date):
    """Get the number of absents, presents, excused, total students, and teacher's name for each active class in a school on a specific date."""

    # Ensure the selected_date is a `date` object
    if isinstance(selected_date, str):
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()

    # Get all classes with their teachers in one query
    classes = db.session.query(
        Class.id, 
        Class.name, 
        Teacher.fullName
    ).join(Teacher).filter(
        and_(Class.school_id == school_id, Class.is_active == True)
    ).all()

    if not classes:
        return []

    class_ids = [c[0] for c in classes]
    
    # Get total students per class in one query
    student_counts = db.session.query(
        student_classes.c.class_id,
        func.count(student_classes.c.student_id).label('total_students')
    ).filter(
        student_classes.c.class_id.in_(class_ids)
    ).group_by(student_classes.c.class_id).all()
    
    student_count_dict = {class_id: count for class_id, count in student_counts}

    # Get all attendance data for the date and classes in one query
    attendance_data = db.session.query(
        Attendance.class_id,
        Attendance.student_id,
        Attendance.is_present,
        Attendance.is_Acsent,
        Attendance.is_Excus,
        Attendance.is_late
    ).filter(
        and_(
            Attendance.class_id.in_(class_ids),
            Attendance.date == selected_date
        )
    ).all()

    # Process attendance data
    class_attendance = {}
    for class_id in class_ids:
        class_attendance[class_id] = {
            'presents': set(),
            'absents': set(),
            'excused': set(),
            'lates': set()
        }

    for record in attendance_data:
        class_id = record.class_id
        student_id = record.student_id
        
        if record.is_present:
            class_attendance[class_id]['presents'].add(student_id)
        if record.is_Acsent:
            class_attendance[class_id]['absents'].add(student_id)
        if record.is_Excus:
            class_attendance[class_id]['excused'].add(student_id)
        if record.is_late:
            class_attendance[class_id]['lates'].add(student_id)

    # Build the result
    class_stats = []
    for class_id, class_name, teacher_name in classes:
        attendance = class_attendance[class_id]
        total_students = student_count_dict.get(class_id, 0)
        
        class_stats.append({
            "class_id": class_id,
            "class_name": class_name,
            "teacher_name": teacher_name,
            "total_students": total_students,
            "number_of_presents": len(attendance['presents']),
            "number_of_absents": len(attendance['absents']),
            "number_of_lates": len(attendance['lates']),
            "number_of_excus": len(attendance['excused'])
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
    elif user.user_role == 'school_admin':
        teachers = Teacher.query.filter_by(school_id=user.school_id).all()

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
        elif user.user_role == 'school_admin':
            teachers = Teacher.query.filter_by(school_id=user.school_id).all()
            
            if not teachers:
                return jsonify({
                    "date_range": {
                        "start": start_date.strftime('%Y-%m-%d'),
                        "end": end_date.strftime('%Y-%m-%d')
                    },
                    "data": []
                }), 200

            teacher_ids = [teacher.id for teacher in teachers]
            
            # Calculate working days once (same for all teachers)
            working_days = 0
            current_date = start_date
            while current_date <= end_date:
                # Sunday = 6, Monday = 0, Tuesday = 1, Wednesday = 2, Thursday = 3
                if current_date.weekday() in [6, 0, 1, 2, 3]:  # Sunday to Thursday
                    working_days += 1
                current_date += timedelta(days=1)

            # Get all recorded days for all teachers in one query
            recorded_days_data = db.session.query(
                Attendance.teacher_id,
                func.count(func.distinct(func.date(Attendance.date))).label('recorded_days')
            ).filter(
                and_(
                    Attendance.teacher_id.in_(teacher_ids),
                    func.date(Attendance.date) >= start_date,
                    func.date(Attendance.date) <= end_date
                )
            ).group_by(Attendance.teacher_id).all()
            
            recorded_days_dict = {teacher_id: days for teacher_id, days in recorded_days_data}

            for teacher in teachers:
                recorded_days = recorded_days_dict.get(teacher.id, 0)
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



# Twilio credentials
TWILIO_ACCOUNT_SID = 'your_account_sid'
TWILIO_AUTH_TOKEN = 'your_auth_token'
TWILIO_PHONE_NUMBER = 'your_twilio_phone_number'

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


@static_blueprint.route('/send-sms', methods=['POST'])
@jwt_required()
def send_sms():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Get the JSON payload
    data = request.get_json()
    if not data or 'list' not in data or 'date' not in data:
        return jsonify({"error": "Invalid data. 'list' and 'date' are required."}), 400

    List = data['list']  # Expecting a list of dictionaries with student data
    date = data['date']

    if not isinstance(List, list):
        return jsonify({"error": "'list' must be an array."}), 400

    results = []

    for x in List:
        # Validate the required fields in each item
        if not all(key in x for key in ('student_name', 'phone_number', 'excused_times', 'absent_times')):
            results.append({"error": f"Invalid data for item: {x}"})
            continue

        mssg_en = (
            f"Student: {x['student_name']}\n"
            f"The student is absent/with excuse from: {x['excused_times']} class\n"
            f"The student is Runaway from: {x['absent_times']} class\n"
            f"On: {date}.\n\n"
        )

        mssg_ar = (
            f"{x['student_name']} :ولي الأمر الطالب\n"
            f"{x['excused_times']} :الطالب متغيب/بعذر عن حصص\n"
            f"{x['absent_times']} :الطالب هارب عن حصص\n"
            f"{date} :بتاريخ\n"
        )

        try:
            # Assuming `client` is a Twilio Client instance
            message = client.messages.create(
                body=mssg_en + mssg_ar,
                from_=user.phone_number,  # Ensure the user has a valid phone_number
                to=x['phone_number']
            )
            results.append({"number": x['phone_number'], "status": "success", "sid": message.sid})
        except Exception as e:
            results.append({"number": x['phone_number'], "status": "failed", "error": str(e)})

    return jsonify(results), 200



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
    
    if user.user_role == 'school_admin':
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

    if user.user_role == 'school_admin':
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
    elif user.user_role == 'school_admin':
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

    if user.user_role not in ['admin', 'school_admin' , 'teacher']:
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

    classes = db.session.query(Class.id).filter_by(school_id=user.school_id, is_active=True).subquery()

    # --- WEEKLY: Get full week (Sunday to Thursday) containing start_date ---
    weekday = custom_start.weekday()
    adjusted_day = (weekday + 1) % 7
    start_of_week = custom_start - timedelta(days=adjusted_day)
    week_days = [(start_of_week + timedelta(days=i)) for i in range(5)]

    weekly = []
    for day in week_days:
        absents = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == day,
            Attendance.is_Acsent == True
        ).distinct()
        lates = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == day,
            Attendance.is_late == True
        ).distinct()
        excused = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == day,
            Attendance.is_Excus == True
        ).distinct()

        weekly.append({
            "date": day.strftime('%Y-%m-%d'),
            "absent": len(set(a[0] for a in absents)),
            "late": len(set(l[0] for l in lates)),
            "excused": len(set(e[0] for e in excused))
        })

    # --- MONTHLY: Use start_date's month and build week blocks ---
    start_of_month = custom_start.replace(day=1)
    end_of_month = (start_of_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    last_day = min(end_of_month, custom_end)

    month_stats = []
    current = start_of_month
    while current <= last_day:
        week_start = current
        week_end = min(week_start + timedelta(days=6 - week_start.weekday()), last_day)

        absents = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date.between(week_start, week_end),
            Attendance.is_Acsent == True
        ).distinct()
        lates = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date.between(week_start, week_end),
            Attendance.is_late == True
        ).distinct()
        excused = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date.between(week_start, week_end),
            Attendance.is_Excus == True
        ).distinct()

        month_stats.append({
            "start": week_start.strftime('%Y-%m-%d'),
            "end": week_end.strftime('%Y-%m-%d'),
            "absent": len(set(a[0] for a in absents)),
            "late": len(set(l[0] for l in lates)),
            "excused": len(set(e[0] for e in excused))
        })

        current = week_end + timedelta(days=1)

    # --- CUSTOM DAILY ---
    custom_daily = []
    current_day = custom_start
    while current_day <= custom_end:
        absents = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == current_day,
            Attendance.is_Acsent == True
        ).distinct()
        lates = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == current_day,
            Attendance.is_late == True
        ).distinct()
        excused = db.session.query(Attendance.student_id).filter(
            Attendance.class_id.in_(classes),
            Attendance.date == current_day,
            Attendance.is_Excus == True
        ).distinct()

        custom_daily.append({
            "date": current_day.strftime('%Y-%m-%d'),
            "absent": len(set(a[0] for a in absents)),
            "late": len(set(l[0] for l in lates)),
            "excused": len(set(e[0] for e in excused))
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
    
    # Step 1: Check if teachers exist
    teachers_count = Teacher.query.filter_by(school_id=school_id, is_active=True).count()
    step_status['step1_teachers'] = {
        'completed': teachers_count > 0,
        'count': teachers_count,
        'message': f"Found {teachers_count} active teachers" if teachers_count > 0 else "No teachers found"
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
    
    # Step 5: Check if attendance has been taken (any attendance records exist)
    attendance_count = Attendance.query.join(Class).filter(
        and_(
            Class.school_id == school_id,
            Attendance.date >= date.today() - timedelta(days=30)  # Check last 30 days
        )
    ).count()
    step_status['step5_attendance'] = {
        'completed': attendance_count > 0,
        'count': attendance_count,
        'message': f"Found {attendance_count} attendance records in the last 30 days" if attendance_count > 0 else "No attendance records found"
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
