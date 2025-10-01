# app/routes/attendance_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Teacher, Class, Attendance, Student,User,Subject,ConformAtt
from datetime import datetime , date ,timedelta
from app import db
from collections import defaultdict
from app.logger import log_action
from app.config import get_oman_time
from sqlalchemy import func , or_ ,case, and_



attendance_blueprint = Blueprint('attendance_blueprint', __name__)

@attendance_blueprint.route('/takes', methods=['POST'])
@jwt_required()
@log_action("تسجيل", description="تسجيل الحضور للطلاب")
def take_attendances():
    data = request.get_json()

    # Extract and validate input data
    class_id = data.get('class_id')
    attendance_records = data.get('attendance_records')  # List of {student_id, is_present, is_Acsent, is_Excus, ExcusNote}
    attendance_date_str = data.get('date')  # Optional date parameter

    if not class_id or not attendance_records:
        return jsonify(message="Class ID and attendance records are required."), 400

    teacher_id = get_jwt_identity()
    class_obj = Class.query.get(class_id)

    # Validate the class and teacher association
    if not class_obj:
        return jsonify(message="Unauthorized or class not found."), 403

    # Parse the date, defaulting to today's date if none is provided
    if attendance_date_str:
        try:
            attendance_date = datetime.strptime(attendance_date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400
    else:
        attendance_date = date.today()

    # Verify that the students belong to the class
    class_student_ids = {student.id for student in class_obj.students}
    for record in attendance_records:
        if record['student_id'] not in class_student_ids:
            return jsonify(message=f"Student ID {record['student_id']} is not in this class."), 400

    # Validate `class_time_num` and `subject_id` association
    for record in attendance_records:
        class_time_num = record.get('class_time_num', 0)
        subject_id = record['subject_id']

        # Check if the same `class_time_num` is already used for a different subject on the same date
        existing_time_conflict = Attendance.query.filter_by(
            class_id=class_id,
            date=attendance_date,
            class_time_num=class_time_num,
        ).filter(Attendance.subject_id != subject_id).first()

        if existing_time_conflict:
            return jsonify(message=f"Class time number {class_time_num} is already assigned to another subject."), 400

    # Record attendance
    for record in attendance_records:
        student_id = record['student_id']
        is_present = record.get('is_present', False)
        is_Acsent = record.get('is_Acsent', False)
        is_Excus = record.get('is_Excus', False)
        is_late = record.get('is_late', False)
        class_time_num = record.get('class_time_num', 0)
        subject_id = record['subject_id']
        ExcusNote = record.get('ExcusNote', '')

        # Check if attendance record already exists for the given date, class_time_num, and subject_id
        try:
            existing_attendance = Attendance.query.filter_by(
                student_id=student_id,
                class_id=class_id,
                date=attendance_date,
                class_time_num=class_time_num,
                subject_id=subject_id,
            ).first()

            if existing_attendance:
                # Update the existing attendance record
                existing_attendance.is_present = is_present
                existing_attendance.is_Acsent = is_Acsent
                existing_attendance.is_Excus = is_Excus
                existing_attendance.is_late = is_late
                existing_attendance.ExcusNote = ExcusNote
            else:
                # Create a new attendance record
                attendance = Attendance(
                    student_id=student_id,
                    teacher_id=teacher_id,
                    class_id=class_id,
                    date=attendance_date,
                    class_time_num=class_time_num,
                    subject_id=subject_id,
                    is_present=is_present,
                    is_Acsent=is_Acsent,
                    is_late=is_late,
                    is_Excus=is_Excus,
                    ExcusNote=ExcusNote
                )
                db.session.add(attendance)

        except Exception as e:
            db.session.rollback()
            return jsonify(message=f"Error processing attendance: {str(e)}"), 400

    # Commit changes once for all records
    db.session.commit()

    return jsonify(message="Attendance recorded , تم التسجيل بنجاح"), 200



@attendance_blueprint.route('/attendanceByClass/<int:class_id>', methods=['GET'])
@jwt_required()
def get_attendance_by_class(class_id):
    teacher_id = get_jwt_identity()
    class_obj = Class.query.get(class_id)
    user = User.query.get(teacher_id)

    if user.user_role !='admin':
    # Validate class ownership
        if not class_obj:
            return jsonify(message="Unauthorized or class not found."), 403

    # Parse the requested month and year, defaulting to the current month if none is provided
    year = request.args.get('year', type=int, default=date.today().year)
    month = request.args.get('month', type=int, default=date.today().month)

    # Calculate the number of days in the specified month
    try:
        days_in_month = (datetime(year, month + 1, 1) - timedelta(days=1)).day
    except ValueError:
        return jsonify(message="Invalid year or month format."), 400

    # Prepare a dictionary to hold attendance records for each day
    monthly_attendance = {}
    for day in range(1, days_in_month + 1):
        attendance_date = date(year, month, day)

        # Fetch all attendance records for the class on this date
        attendances = Attendance.query.filter_by(class_id=class_id, date=attendance_date).all()

        # Prepare daily attendance data
        daily_attendance = []
        for att in attendances:
            student = Student.query.get(att.student_id)
            if student:  # Ensure student exists
                attendance_data = {
                    "student_id": att.student_id,
                    "student_FullName": student.fullName,
                    # "phone_number": student.phone_number,
                    "date": att.date.strftime('%Y-%m-%d'),
                    "is_present": att.is_present,
                    "is_absent": att.is_Acsent,
                    "is_late": att.is_late,
                    "is_excused": att.is_Excus,
                    "excuse_note": att.ExcusNote
                }
                daily_attendance.append(attendance_data)

        # Add daily attendance records, even if empty, to maintain day structure
        monthly_attendance[attendance_date.strftime('%Y-%m-%d')] = daily_attendance

    return jsonify(monthly_attendance), 200


@attendance_blueprint.route('/attendanceByClass_subject/<int:class_id>', methods=['GET'])
@jwt_required()
def get_attendance_by_class_and_subject(class_id):
    teacher_id = get_jwt_identity()
    class_obj = Class.query.get(class_id)
    user = User.query.get(teacher_id)

    # Authorization validation (uncomment if needed)
    # if user.user_role != 'admin':
    #     if not class_obj or class_obj.teacher_id != teacher_id:
    #         return jsonify(message="Unauthorized or class not found."), 403

    # Parse requested date; default to today if not provided
    selected_date_str = request.args.get('date', default=date.today().isoformat())
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    # Parse optional subject_id
    selected_subject_id = request.args.get('subject_id', type=int)

    # Initialize the response structure
    grouped_by_class_time = defaultdict(lambda: {"subjects": [], "attendance": []})

    # Query attendance for this class on the selected date
    query = Attendance.query.filter_by(class_id=class_id, date=selected_date)

    # If a subject_id is provided, filter by subject_id
    if selected_subject_id:
        query = query.filter_by(subject_id=selected_subject_id)

    attendances = query.all()

    # Process attendance records
    for att in attendances:
        student = Student.query.get(att.student_id)
        subject = Subject.query.get(att.subject_id)

        if student and subject:
            # Add subject details to the corresponding class_time_num
            if not any(s["subject_id"] == subject.id for s in grouped_by_class_time[att.class_time_num]["subjects"]):
                grouped_by_class_time[att.class_time_num]["subjects"].append({
                    "subject_id": subject.id,
                    "subject_name": subject.name
                })

            # Add attendance details to the corresponding class_time_num
            grouped_by_class_time[att.class_time_num]["attendance"].append({
                "student_id": att.student_id,
                "student_name": student.fullName,
                # "phone_number": student.phone_number,
                "is_present": att.is_present,
                "is_absent": att.is_Acsent,
                "is_late": att.is_late,
                "is_excused": att.is_Excus
            })

    # Return the structured response grouped by class_time_num
    return jsonify({
        "class_time_data": grouped_by_class_time
    }), 200


@attendance_blueprint.route('/attendanceSummary', methods=['GET'])
@jwt_required()
def get_attendance_summary_all_classes():
    try:
        teacher_id = get_jwt_identity()
        user = User.query.get(teacher_id)

        # Authorization validation
        if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
            return jsonify(message="Unauthorized access."), 403

        # Parse requested date; default to today if not provided
        selected_date_str = request.args.get('date', default=date.today().isoformat())
        try:
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

        # Get all classes with teachers in one optimized query
        classes_data = db.session.query(
            Class.id,
            Class.name,
            Teacher.fullName.label('teacher_name')
        ).join(Teacher, Teacher.id == Class.teacher_id).filter(
            Class.school_id == user.school_id
        ).all()

        if not classes_data:
            return jsonify({
                "date": selected_date.strftime('%Y-%m-%d'),
                "attendance_summary": [],
                "total_not_in_class_time_nums": 0,
                "total_class_time_nums": 0
            }), 200

        class_ids = [class_data[0] for class_data in classes_data]
        class_map = {class_data[0]: {'name': class_data[1], 'teacher_name': class_data[2]} for class_data in classes_data}

        # Get all attendance data for all classes in one optimized query
        attendance_stats = db.session.query(
            Attendance.class_id,
            func.count(func.distinct(Attendance.student_id)).label('total_students'),
            func.count(func.distinct(case((Attendance.is_present == True, Attendance.student_id), else_=None))).label('total_present'),
            func.count(func.distinct(case((Attendance.is_Acsent == True, Attendance.student_id), else_=None))).label('total_absent'),
            func.count(func.distinct(case((Attendance.is_Excus == True, Attendance.student_id), else_=None))).label('total_excused'),
            func.count(func.distinct(case((Attendance.is_late == True, Attendance.student_id), else_=None))).label('total_late')
        ).filter(
            and_(
                Attendance.class_id.in_(class_ids),
                Attendance.date == selected_date
            )
        ).group_by(Attendance.class_id).all()

        # Get all absent/excused students with their details in one optimized query
        absent_students_data = db.session.query(
            Attendance.class_id,
            Attendance.student_id,
            Attendance.teacher_id,
            Attendance.subject_id,
            Attendance.class_time_num,
            Attendance.ExcusNote,
            Attendance.is_Acsent,
            Student.fullName.label('student_name'),
            Teacher.fullName.label('teacher_name'),
            Subject.name.label('subject_name')
        ).join(
            Student, Student.id == Attendance.student_id
        ).join(
            Teacher, Teacher.id == Attendance.teacher_id
        ).join(
            Subject, Subject.id == Attendance.subject_id
        ).filter(
            and_(
                Attendance.class_id.in_(class_ids),
                Attendance.date == selected_date,
                or_(Attendance.is_Acsent == True, Attendance.is_Excus == True)
            )
        ).all()

        # Get unique class_time_nums for each class in one optimized query
        class_time_nums_data = db.session.query(
            Attendance.class_id,
            Attendance.class_time_num
        ).filter(
            and_(
                Attendance.class_id.in_(class_ids),
                Attendance.date == selected_date
            )
        ).distinct().all()

        # Process the data
        attendance_summary = []
        total_not_in_class_time_nums = 0
        total_class_time_nums = 0

        # Create lookup dictionaries
        stats_dict = {stat.class_id: stat for stat in attendance_stats}

        # Group class_time_nums by class_id
        time_nums_dict = {}
        for data in class_time_nums_data:
            if data.class_id not in time_nums_dict:
                time_nums_dict[data.class_id] = []
            time_nums_dict[data.class_id].append(data.class_time_num)

        absent_students_dict = {}

        # Group absent students by class
        for record in absent_students_data:
            if record.class_id not in absent_students_dict:
                absent_students_dict[record.class_id] = []

            absent_students_dict[record.class_id].append({
                "student_id": record.student_id,
                "student_name": record.student_name,
                "teacher_name": record.teacher_name,
                "subject_name": record.subject_name,
                "class_time_num": record.class_time_num,
                "excus_note": record.ExcusNote,
                "is_absent": record.is_Acsent
            })

        # Build response for each class
        for class_id, class_info in class_map.items():
            stats = stats_dict.get(class_id)
            class_time_nums = time_nums_dict.get(class_id, [])
            absent_students = absent_students_dict.get(class_id, [])

            # Calculate missing class_time_nums
            all_possible_time_nums = set(range(1, 9))  # All possible class_time_nums (1-8)
            not_in_class_time_nums = list(all_possible_time_nums - set(class_time_nums))

            # Update counters
            total_not_in_class_time_nums += len(not_in_class_time_nums)
            total_class_time_nums += len(class_time_nums)

            attendance_summary.append({
                "class_id": class_id,
                "class_name": class_info['name'],
                "teacher_name": class_info['teacher_name'],
                "total_students": stats.total_students if stats else 0,
                "total_present": stats.total_present if stats else 0,
                "total_absent": stats.total_absent if stats else 0,
                "total_late": stats.total_late if stats else 0,
                "total_excused": stats.total_excused if stats else 0,
                "absent_students": absent_students,
                "class_time_nums": class_time_nums,
                "not_in_class_time_nums": not_in_class_time_nums
            })

        # Return the response with total counts
        return jsonify({
            "date": selected_date.strftime('%Y-%m-%d'),
            "attendance_summary": attendance_summary,
            "total_not_in_class_time_nums": total_not_in_class_time_nums,  # Total missing class_time_nums
            "total_class_time_nums": total_class_time_nums  # Total present class_time_nums
        }), 200

    except Exception as e:
        print(f"Error in attendanceSummary: {str(e)}")
        return jsonify(message=f"Internal server error: {str(e)}"), 500


@attendance_blueprint.route('/attendanceDetailsByStudent', methods=['GET'])
@jwt_required()
def get_attendance_details_by_student():
    teacher_id = get_jwt_identity()
    user = User.query.get(teacher_id)

    # Authorization validation
    if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
        return jsonify(message="Unauthorized access."), 403

    # Parse requested date; default to today if not provided
    selected_date_str = request.args.get('date', default=date.today().isoformat())
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    # Fetch all relevant class IDs in a single query with optimized filtering
    if user.user_role == 'teacher':
        class_ids = db.session.query(Class.id, Class.name).filter_by(teacher_id=teacher_id).all()
    else:
        class_ids = db.session.query(Class.id, Class.name).filter_by(school_id=user.school_id).all()

    if not class_ids:
        return jsonify({
            "date": selected_date.strftime('%Y-%m-%d'),
            "attendance_details": []
        }), 200

    # Create a mapping of class_id to class_name for later use
    class_map = {class_id: class_name for class_id, class_name in class_ids}
    class_id_list = [class_id for class_id, _ in class_ids]

    # OPTIMIZATION 1: Single optimized query with all needed data
    # Use select_from to avoid multiple joins and get all data in one query
    attendance_records = db.session.query(
        Attendance.class_id,
        Attendance.student_id,
        Attendance.class_time_num,
        Attendance.is_Acsent,
        Attendance.is_Excus,
        Attendance.is_late,
        Attendance.ExcusNote,
        Student.fullName.label('student_name'),
        Student.phone_number,
        Teacher.fullName.label('teacher_name')
    ).select_from(Attendance).join(
        Student, Student.id == Attendance.student_id
    ).join(
        Teacher, Teacher.id == Attendance.teacher_id
    ).filter(
        Attendance.class_id.in_(class_id_list),
        Attendance.date == selected_date,
        db.or_(
            Attendance.is_Acsent == True,
            Attendance.is_Excus == True,
            Attendance.is_late == True
        )
    ).order_by( Attendance.class_id).all()

    # OPTIMIZATION 2: Use dictionaries for faster lookups
    class_data = {}
    classes_with_attendance = set()

    # Process attendance records efficiently
    for record in attendance_records:
        class_name = class_map[record.class_id]
        classes_with_attendance.add(record.class_id)
        student_id = record.student_id

        # Initialize class data structure if not already present
        if class_name not in class_data:
            class_data[class_name] = {}

        # Initialize student data structure if not already present
        if student_id not in class_data[class_name]:
            class_data[class_name][student_id] = {
                "student_name": record.student_name,
                "phone_number": record.phone_number,
                "absent_times": [],
                "late_times": [],
                "excused_times": [],
                "teachers_by_period": {},
                "is_has_exuse": False,
                "class_id": record.class_id
            }

        # Add class_time_num to the respective list and store teacher for each period
        if record.is_Acsent:
            class_data[class_name][student_id]["absent_times"].append(record.class_time_num)
            class_data[class_name][student_id]["teachers_by_period"][record.class_time_num] = record.teacher_name
        if record.is_Excus:
            class_data[class_name][student_id]["excused_times"].append(record.class_time_num)
            class_data[class_name][student_id]["teachers_by_period"][record.class_time_num] = record.teacher_name
        if record.is_late:
            class_data[class_name][student_id]["late_times"].append(record.class_time_num)
            class_data[class_name][student_id]["teachers_by_period"][record.class_time_num] = record.teacher_name

        # Check ExcusNote only once per student
        if record.ExcusNote and record.ExcusNote.strip() not in [None, "-", "", " "]:
            class_data[class_name][student_id]["is_has_exuse"] = True

    # OPTIMIZATION 3: Build response efficiently
    response = []

    # Add classes with absent/late/excused students
    for class_name, students in class_data.items():
        for student_id, data in students.items():
            # Include only students with absent or excused times
            if data["absent_times"] or data["excused_times"] or data["late_times"]:
                response.append({
                    "class_id": data["class_id"],
                    "class_name": class_name,
                    "student_id": student_id,
                    "student_name": data["student_name"],
                    "phone_number": data["phone_number"],
                    "teachers_by_period": data["teachers_by_period"],
                    "absent_times": data["absent_times"],
                    "late_times": data["late_times"],
                    "excused_times": data["excused_times"],
                    "is_has_exuse": data["is_has_exuse"]
                })

    # Add classes with no absences/late/excused but have attendance records
    for class_id, class_name in class_ids:
        if class_id in classes_with_attendance and class_name not in class_data:
            response.append({
                "class_id": class_id,
                "class_name": class_name,
                "student_id": None,
                "student_name": None,
                "phone_number": None,
                "teachers_by_period": {},
                "absent_times": [],
                "late_times": [],
                "excused_times": [],
                "is_has_exuse": False,
                "status": "no absent today"
            })

    # Add classes with no attendance records at all
    for class_id, class_name in class_ids:
        if class_id not in classes_with_attendance:
            response.append({
                "class_id": class_id,
                "class_name": class_name,
                "student_id": None,
                "student_name": None,
                "phone_number": None,
                "teachers_by_period": {},
                "absent_times": [],
                "late_times": [],
                "excused_times": [],
                "is_has_exuse": False,
                "status": "no record yet"
            })

    # Sort response by class_id for consistent ordering
    response.sort(key=lambda x: x.get("class_id", 0) if x.get("class_id") is not None else 0)

    return jsonify({
        "date": selected_date.strftime('%Y-%m-%d'),
        "attendance_details": response
    }), 200


@attendance_blueprint.route('/attendanceDetailsByStudents', methods=['GET'])
@jwt_required()
def get_attendance_details_by_students():
    teacher_id = get_jwt_identity()
    user = User.query.get(teacher_id)

    # Authorization validation
    if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
        return jsonify(message="Unauthorized access."), 403

    # Parse requested date; default to today if not provided
    selected_date_str = request.args.get('date', default=date.today().isoformat())
    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400

    # Fetch all classes associated with the school or teacher
    if user.user_role == 'teacher':
        classes = Class.query.filter_by(teacher_id=teacher_id).all()
    else:
        classes = Class.query.filter_by(school_id=user.school_id).all()

    # Fetch all students in the classes
    student_data = {}

    for class_obj in classes:
        # Query attendance records for the specific class and date
        attendance_records = Attendance.query.filter_by(class_id=class_obj.id, date=selected_date).all()

        for record in attendance_records:
            student = Student.query.get(record.student_id)
            if student:
                if student.id not in student_data:
                    student_data[student.id] = {
                        "student_id": student.id,
                        "student_name": student.fullName,
                        "phone_number": student.phone_number,
                        "class_details": []
                    }

                # Add class details for the student
                student_data[student.id]["class_details"].append({
                    "class_id": class_obj.id,
                    "class_name": class_obj.name,
                    "class_time_num": record.class_time_num,
                    "subject_name": Subject.query.get(record.subject_id).name,
                    "is_present": record.is_present,
                    "is_absent": record.is_Acsent,
                    "is_late": record.is_late,
                    "is_excused": record.is_Excus
                })

    # Return the response grouped by student
    return jsonify({
        "date": selected_date.strftime('%Y-%m-%d'),
        "students": list(student_data.values())
    }), 200


@attendance_blueprint.route('/students_with_excused_attendance', methods=['GET'])
@jwt_required()
def get_students_with_excused_attendance():
    """
    Retrieve all students who have excused attendance for a specific date in the school.
    """

    # Get the authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can access this endpoint
    if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Get the school ID based on the user role
    school_id = user.school_id if user.user_role != 'admin' else request.args.get('school_id')

    if not school_id:
        return jsonify({
            "message": {
                "en": "School ID is required for admins.",
                "ar": "مطلوب معرف المدرسة للمسؤولين."
            },
            "flag": 2
        }), 400

    # Parse the selected date (default to today)
    selected_date_str = request.args.get('date', default=date.today().isoformat())

    try:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({
            "message": {
                "en": "Invalid date format. Use YYYY-MM-DD.",
                "ar": "تنسيق التاريخ غير صحيح. استخدم YYYY-MM-DD."
            },
            "flag": 3
        }), 400

    # Query for excused attendance records
    excused_attendance_records = (
        db.session.query(
            Attendance.student_id,
            Student.fullName.label("student_name"),
            Student.phone_number,
            Class.name.label("class_name"),
            Class.id.label("class_id"),
            Attendance.class_time_num,
            Subject.name.label("subject_name"),
            Subject.id.label("subject_id"),
            Attendance.ExcusNote.label("excus_note")
        )
        .join(Student, Student.id == Attendance.student_id)
        .join(Class, Class.id == Attendance.class_id)
        .join(Subject, Subject.id == Attendance.subject_id)
        .filter(
            Attendance.is_Excus == True,
            Class.school_id == school_id,
            Attendance.date == selected_date
        )
        .all()
    )

    # Format the response
    students_list = [
        {
            "student_id": record.student_id,
            "student_name": record.student_name,
            "class_id": record.class_id,
            "class_name": record.class_name,
            "class_time_num": record.class_time_num,
            "subject_name": record.subject_name,
            "subject_id": record.subject_id,
            "excus_note": record.excus_note
        }
        for record in excused_attendance_records
    ]

    return jsonify({
        "date": selected_date.strftime('%Y-%m-%d'),
        "students": students_list
    }), 200



@attendance_blueprint.route('/update_excuse_note', methods=['PUT'])
@jwt_required()
@log_action("تعديل", description="تعديل سجل الأعذار")
def update_excuse_note():
    """
    Updates the excuse note for multiple attendance records in bulk.
    """

    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can update attendance
    if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Parse the request JSON data
    try:
        data = request.get_json()
    except Exception as e:
        return jsonify({
            "message": {
                "en": f"Invalid JSON format: {str(e)}",
                "ar": f"تنسيق JSON غير صالح: {str(e)}"
            },
            "flag": 2
        }), 400
    print(data)
    # Ensure input is a list
    if not isinstance(data, list) or not data:
        return jsonify({
            "message": {
                "en": "Invalid request. Expected a list of attendance updates.",
                "ar": "طلب غير صالح. متوقع قائمة بتحديثات الحضور."
            },
            "flag": 3
        }), 400

    updated_count = 0  # Track number of updated records
    response = []

    for record in data:
        student_id = record.get("student_id")
        class_id = record.get("class_id")
        subject_id = record.get("subject_id")
        class_time_num = record.get("class_time_num")
        new_excus_note = record.get("excus_note")


        # Validate required fields
        if not all([student_id, class_id, subject_id, class_time_num]):
            response.append({
                "student_id": student_id,
                "message": {
                    "en": "Missing required fields.",
                    "ar": "هناك حقول مفقودة."
                },
                "flag": 4
            })
            continue



        # Check if the attendance record exists
        attendance_record = Attendance.query.filter_by(
            student_id=student_id,
            class_id=class_id,
            subject_id=subject_id,
            class_time_num=class_time_num,

            is_Excus=True  # Only update if the student was excused
        ).first()

        if attendance_record:
            attendance_record.ExcusNote = new_excus_note
            db.session.add(attendance_record)
            updated_count += 1
            response.append({
                "student_id": student_id,
                "message": {
                    "en": "Excuse note updated successfully.",
                    "ar": "تم تحديث الملاحظة بنجاح."
                },
                "flag": 6
            })
        else:
            response.append({
                "student_id": student_id,
                "message": {
                    "en": "No excused attendance record found.",
                    "ar": "لم يتم العثور على سجل حضور معفى."
                },
                "flag": 7
            })

    # Commit changes to the database
    try:
        db.session.commit()
        return jsonify({
            "message": {
                "en": f"Successfully updated {updated_count} records.",
                "ar": f"تم تحديث {updated_count} سجل بنجاح."
            },
            "updated_count": updated_count,
            "details": response
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": {
                "en": f"Database error: {str(e)}",
                "ar": f"خطأ في قاعدة البيانات: {str(e)}"
            },
            "flag": 8
        }), 500



@attendance_blueprint.route('/student_attendance_log', methods=['GET'])
@jwt_required()
def get_student_attendance_log():
    student_id = request.args.get("student_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not student_id or not start_date or not end_date:
        return jsonify(message="Missing parameters"), 400

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD"), 400

    records = Attendance.query.filter(
        Attendance.student_id == student_id,
        Attendance.date.between(start, end),
        or_(
            Attendance.is_late == True,
            Attendance.is_Acsent == True,
            Attendance.is_Excus == True
        )
    ).order_by(Attendance.date.asc()).all()

    result_by_date = {}
    for record in records:
        date_str = record.date.strftime('%Y-%m-%d')
        if date_str not in result_by_date:
            result_by_date[date_str] = {
                "date": date_str,
                "late_times": [],
                "absent_times": [],
                "excused_times": [],
                "excuse_notes": [],
                "subjects": [],
                "classes": []
            }

        if record.is_late:
            result_by_date[date_str]["late_times"].append(record.class_time_num)
        if record.is_Acsent:
            result_by_date[date_str]["absent_times"].append(record.class_time_num)
        if record.is_Excus:
            result_by_date[date_str]["excused_times"].append(record.class_time_num)
            if record.ExcusNote:
                result_by_date[date_str]["excuse_notes"].append(record.ExcusNote)

        # إضافة اسم المادة إن وجدت
        if record.subject and record.subject.name not in result_by_date[date_str]["subjects"]:
            result_by_date[date_str]["subjects"].append(record.subject.name)
        # Add class name
        if record.class_obj and record.class_obj.name not in result_by_date[date_str]["classes"]:
            result_by_date[date_str]["classes"].append(record.class_obj.name)

    result = list(result_by_date.values())
    return jsonify(result), 200


@attendance_blueprint.route('/update-excuse-for-student', methods=['POST'])
@jwt_required()
@log_action("تعديل", description="تعديل الأعذار للطالب/ة")
def update_excuse():
    data = request.get_json()
    student_id = data.get('student_id')
    date_str = data.get('date')  # Format: YYYY-MM-DD
    is_has_exuse = data.get('is_has_exuse')  # Expected to be True or False

    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can update attendance
    if user.user_role not in ['school_admin', 'data_analyst']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    if not student_id or not date_str or is_has_exuse is None:
        return jsonify(message="Missing required fields: student_id, date, or is_has_exuse"), 400

    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format, use YYYY-MM-DD"), 400

    # Determine the excuse note
    excuse_note = 'لديه عذر (has excuses)' if is_has_exuse else '-'

    # Update matching attendance records
    updated = Attendance.query.filter_by(student_id=student_id, date=selected_date).update(
        {
            Attendance.is_has_exuse: is_has_exuse,
            Attendance.ExcusNote: excuse_note
        }
    )
    db.session.commit()

    return jsonify(message=f"{updated} attendance record(s) updated."), 200



@attendance_blueprint.route('/confirm-day-absents', methods=['POST'])
@jwt_required()
@log_action("تأكيد", description="تأكيد غياب اليوم")
def confirm_day_absents():
    """
    Confirm day absents for school admin.
    """
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only school_admin can confirm
    if user.user_role != 'school_admin':
        return jsonify({
            "message": {
                "en": "Unauthorized access. Only school admin can confirm day absents.",
                "ar": "ليس لديك صلاحية الوصول. فقط مدير المدرسة يمكنه تأكيد غياب اليوم."
            },
            "flag": 1
        }), 403

    # Parse request data
    data = request.get_json()
    date_str = data.get('date')
    is_confirm = data.get('is_confirm', True)

    if not date_str:
        return jsonify({
            "message": {
                "en": "Date is required.",
                "ar": "التاريخ مطلوب."
            },
            "flag": 2
        }), 400

    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({
            "message": {
                "en": "Invalid date format. Use YYYY-MM-DD.",
                "ar": "تنسيق التاريخ غير صحيح. استخدم YYYY-MM-DD."
            },
            "flag": 3
        }), 400

    # Check if confirmation already exists
    existing_confirmation = ConformAtt.query.filter_by(
        school_id=user.school_id,
        date=selected_date
    ).first()

    if existing_confirmation:
        # Update existing confirmation
        existing_confirmation.is_confirm = is_confirm
        existing_confirmation.updated_at = get_oman_time().utcnow()
        db.session.commit()

        return jsonify({
            "message": {
                "en": f"Day absents confirmation updated successfully.",
                "ar": f"تم تحديث تأكيد غياب اليوم بنجاح."
            },
            "confirmation": existing_confirmation.to_dict(),
            "flag": 4
        }), 200
    else:
        # Create new confirmation
        new_confirmation = ConformAtt(
            school_id=user.school_id,
            date=selected_date,
            is_confirm=is_confirm
        )
        db.session.add(new_confirmation)
        db.session.commit()

        return jsonify({
            "message": {
                "en": f"Day absents confirmation created successfully.",
                "ar": f"تم إنشاء تأكيد غياب اليوم بنجاح."
            },
            "confirmation": new_confirmation.to_dict(),
            "flag": 5
        }), 201


@attendance_blueprint.route('/get-confirmation-status', methods=['GET'])
@jwt_required()
def get_confirmation_status():
    """
    Get confirmation status for a specific date.
    """
    # Get authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only authorized roles can access
    if user.user_role not in ['admin', 'school_admin', 'teacher', 'data_analyst']:
        return jsonify({
            "message": {
                "en": "Unauthorized access.",
                "ar": "ليس لديك صلاحية الوصول."
            },
            "flag": 1
        }), 403

    # Parse date parameter
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({
            "message": {
                "en": "Date parameter is required.",
                "ar": "معامل التاريخ مطلوب."
            },
            "flag": 2
        }), 400

    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({
            "message": {
                "en": "Invalid date format. Use YYYY-MM-DD.",
                "ar": "تنسيق التاريخ غير صحيح. استخدم YYYY-MM-DD."
            },
            "flag": 3
        }), 400

    # Get school_id based on user role
    school_id = user.school_id if user.user_role != 'admin' else request.args.get('school_id')

    if not school_id:
        return jsonify({
            "message": {
                "en": "School ID is required for admins.",
                "ar": "معرف المدرسة مطلوب للمسؤولين."
            },
            "flag": 4
        }), 400

    # Query confirmation status
    confirmation = ConformAtt.query.filter_by(
        school_id=school_id,
        date=selected_date
    ).first()

    if confirmation:
        return jsonify({
            "date": selected_date.strftime('%Y-%m-%d'),
            "school_id": school_id,
            "is_confirm": confirmation.is_confirm,
            "created_at": confirmation.created_at.isoformat() if confirmation.created_at else None,
            "updated_at": confirmation.updated_at.isoformat() if confirmation.updated_at else None,
            "flag": 5
        }), 200
    else:
        return jsonify({
            "date": selected_date.strftime('%Y-%m-%d'),
            "school_id": school_id,
            "is_confirm": False,
            "created_at": None,
            "updated_at": None,
            "flag": 6
        }), 200


@attendance_blueprint.route('/student/my-attendance-history', methods=['GET'])
@jwt_required()
def get_my_attendance_history():
    """
    Get complete attendance history for the authenticated student.
    """
    # Get the authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only students can access this endpoint
    if user.user_role != 'student':
        return jsonify({
            "message": {
                "en": "Unauthorized access. Only students can access this endpoint.",
                "ar": "ليس لديك صلاحية الوصول. فقط الطلاب يمكنهم الوصول لهذا الم endpoint."
            },
            "flag": 1
        }), 403

    # Get all attendance records for this student (excluding present records)
    attendance_records = db.session.query(
        Attendance.date,
        Attendance.class_time_num,
        Attendance.is_present,
        Attendance.is_Acsent,
        Attendance.is_Excus,
        Attendance.is_late,
        Attendance.ExcusNote,
        Class.name.label('class_name'),
        Class.id.label('class_id'),
        Subject.name.label('subject_name'),
        Teacher.fullName.label('teacher_name')
    ).join(
        Class, Class.id == Attendance.class_id
    ).join(
        Subject, Subject.id == Attendance.subject_id
    ).join(
        Teacher, Teacher.id == Attendance.teacher_id
    ).filter(
        Attendance.student_id == user_id,
        or_(
            Attendance.is_Acsent == True,
            Attendance.is_Excus == True,
            Attendance.is_late == True
        )
    ).order_by(Attendance.date.desc()).all()

    # Process the data
    attendance_data = []
    for record in attendance_records:
        attendance_data.append({
            "date": record.date.strftime('%Y-%m-%d'),
            "class_time_num": record.class_time_num,
            "class_name": record.class_name,
            "class_id": record.class_id,
            "subject_name": record.subject_name,
            "teacher_name": record.teacher_name,
            "is_present": record.is_present,
            "is_absent": record.is_Acsent,
            "is_excused": record.is_Excus,
            "is_late": record.is_late,
            "excuse_note": record.ExcusNote
        })

    return jsonify({
        "student_id": user_id,
        "student_name": user.fullName,
        "total_records": len(attendance_data),
        "attendance_history": attendance_data
    }), 200


@attendance_blueprint.route('/student/my-attendance-stats', methods=['GET'])
@jwt_required()
def get_my_attendance_stats():
    """
    Get attendance statistics for the authenticated student.
    """
    # Get the authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only students can access this endpoint
    if user.user_role != 'student':
        return jsonify({
            "message": {
                "en": "Unauthorized access. Only students can access this endpoint.",
                "ar": "ليس لديك صلاحية الوصول. فقط الطلاب يمكنهم الوصول لهذا الم endpoint."
            },
            "flag": 1
        }), 403

    # Get attendance statistics
    stats = db.session.query(
        func.count(Attendance.id).label('total_records'),
        func.count(func.distinct(Attendance.date)).label('total_days'),
        func.count(case((Attendance.is_present == True, Attendance.id), else_=None)).label('present_count'),
        func.count(case((Attendance.is_Acsent == True, Attendance.id), else_=None)).label('absent_count'),
        func.count(case((Attendance.is_Excus == True, Attendance.id), else_=None)).label('excused_count'),
        func.count(case((Attendance.is_late == True, Attendance.id), else_=None)).label('late_count')
    ).filter(
        Attendance.student_id == user_id
    ).first()

    # Get student behavior note
    student = Student.query.get(user_id)
    behavior_note = student.behavior_note if student and student.behavior_note else ""

    # Calculate percentages
    total_records = stats.total_records or 0
    present_count = stats.present_count or 0
    absent_count = stats.absent_count or 0
    excused_count = stats.excused_count or 0
    late_count = stats.late_count or 0

    attendance_rate = (present_count / total_records * 100) if total_records > 0 else 0
    absence_rate = (absent_count / total_records * 100) if total_records > 0 else 0
    excuse_rate = (excused_count / total_records * 100) if total_records > 0 else 0
    late_rate = (late_count / total_records * 100) if total_records > 0 else 0

    return jsonify({
        "student_id": user_id,
        "student_name": user.fullName,
        "statistics": {
            "total_records": total_records,
            "total_days": stats.total_days or 0,
            "present_count": present_count,
            "absent_count": absent_count,
            "excused_count": excused_count,
            "late_count": late_count,
            "attendance_rate": round(attendance_rate, 2),
            "absence_rate": round(absence_rate, 2),
            "excuse_rate": round(excuse_rate, 2),
            "late_rate": round(late_rate, 2),
            "behavior_note": behavior_note
        }
    }), 200


@attendance_blueprint.route('/student/my-profile', methods=['GET'])
@jwt_required()
def get_my_profile():
    """
    Get profile information for the authenticated student.
    """
    # Get the authenticated user
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure only students can access this endpoint
    if user.user_role != 'student':
        return jsonify({
            "message": {
                "en": "Unauthorized access. Only students can access this endpoint.",
                "ar": "ليس لديك صلاحية الوصول. فقط الطلاب يمكنهم الوصول لهذا الم endpoint."
            },
            "flag": 1
        }), 403

    # Get student's classes
    student_classes = db.session.query(
        Class.id,
        Class.name,
        Teacher.fullName.label('teacher_name')
    ).join(
        Teacher, Teacher.id == Class.teacher_id
    ).filter(
        Class.students.any(Student.id == user_id)
    ).all()

    classes_data = []
    for class_obj in student_classes:
        classes_data.append({
            "class_id": class_obj.id,
            "class_name": class_obj.name,
            "teacher_name": class_obj.teacher_name
        })

    return jsonify({
        "student_id": user_id,
        "username": user.username,
        "fullName": user.fullName,
        "email": user.email,
        "phone_number": user.phone_number,
        "user_role": user.user_role,
        "school_id": user.school_id,
        "classes": classes_data,
        "total_classes": len(classes_data)
    }), 200
