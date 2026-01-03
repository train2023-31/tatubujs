# app/routes/auth.py

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User, Student, Teacher, School ,Class , Subject , student_classes ,Attendance ,News ,ActionLog
from app import db ,limiter
import csv
from flask import send_file, Response
from werkzeug.security import generate_password_hash
from io import StringIO
import pandas as pd
import re
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from time import time, sleep 
from app.logger import log_action
from app.config import get_oman_time
import logging

logger = logging.getLogger(__name__)



auth_blueprint = Blueprint('auth_blueprint', __name__)

# Memory-based failed login tracking (replace with Redis for production)
FAILED_LOGINS = {}
MAX_ATTEMPTS = 5
BLOCK_TIME_SECONDS = 300  # 5 minutes

@auth_blueprint.route('/login', methods=['POST'])
@limiter.limit("10 per minute")  # Increased rate limiting: 10 requests per minute per IP
@log_action("تسجيل ", description="تسجيل الدخول للموقع " , content='')
def login():
    try:
        ip = request.remote_addr
        now = time()

        # Parse login data with error handling
        try:
            data = request.get_json()
            if not data:
                return jsonify(message="Invalid JSON data"), 400
        except Exception as e:
            return jsonify(message="Invalid request data"), 400

        username_or_email = data.get('username')
        password = data.get('password')

        if not username_or_email or not password:
            return jsonify(message="اسم المستخدم/رمز المرور مطلوب. Username/email and password are required."), 400

        # 🔐 Check if IP is blocked
        if ip in FAILED_LOGINS:
            if now - FAILED_LOGINS[ip]['first_try'] < BLOCK_TIME_SECONDS:
                if FAILED_LOGINS[ip]['count'] >= MAX_ATTEMPTS:
                    return jsonify(message=" تم حظر المحاولة مؤقتاً بسبب عدد محاولات خاطئة كثيرة. الرجاء الانتظار والمحاولة بعد 5 دقائق."), 429
            else:
                FAILED_LOGINS.pop(ip)  # Reset expired block

        # Find user by username or email (case-insensitive) with error handling
        try:
            user = User.query.filter(
                (User.username.ilike(username_or_email)) | (User.email.ilike(username_or_email))
            ).first()
        except Exception as e:
            print(f"Database query error: {str(e)}")
            return jsonify(message="Database connection error. Please try again."), 500

        # Check if user exists and is active
        if not user:
            # Track failed login
            FAILED_LOGINS[ip] = FAILED_LOGINS.get(ip, {"count": 0, "first_try": now})
            FAILED_LOGINS[ip]['count'] += 1
            sleep(1)  # Delay for failed attempts
            return jsonify(message="لا يوجد مستخدم بهذا الإسم. Username not found."), 400

        if not user.is_active:
            # Track failed login for inactive accounts
            FAILED_LOGINS[ip] = FAILED_LOGINS.get(ip, {"count": 0, "first_try": now})
            FAILED_LOGINS[ip]['count'] += 1
            sleep(1)  # Delay for failed attempts
            return jsonify(message="الحساب غير مفعل. الرجاء التواصل مع الإدارة. Account is inactive."), 400

        # Check password with error handling
        try:
            password_valid = check_password_hash(user.password, password)
        except Exception as e:
            print(f"Password check error: {str(e)}")
            return jsonify(message="Authentication error. Please try again."), 500

        if not password_valid:
            # Track failed login
            FAILED_LOGINS[ip] = FAILED_LOGINS.get(ip, {"count": 0, "first_try": now})
            FAILED_LOGINS[ip]['count'] += 1
            sleep(1)  # Delay for failed attempts
            return jsonify(message="اسم المستخدم أو كلمة المرور غير صحيحة. Incorrect username or password."), 401

        # ✅ Success — Clear failed attempts for this IP
        if ip in FAILED_LOGINS:
            FAILED_LOGINS.pop(ip)

        # Create access token with error handling
        try:
            access_token = create_access_token(identity=user.id)
            return jsonify(access_token=access_token), 200
        except Exception as e:
            print(f"Token creation error: {str(e)}")
            return jsonify(message="Token generation error. Please try again."), 500

    except Exception as e:
        print(f"Unexpected login error: {str(e)}")
        return jsonify(message="Internal server error. Please try again."), 500


@auth_blueprint.route('/register', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة مستخدم جديد ")
def register():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    if Login_user.user_role != 'admin':  # Ensure only admin can register users
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    fullName = data.get('fullName')
    phone_number = data.get('phone_number')
    role = data.get('role')
    job_name = data.get('job_name')
    school_id = data.get('school_id')

    # Validate required fields
    if not all([username, password, email, role, school_id]):
        return jsonify(message="Missing required fields."), 400

    # Check if username or email already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing_user:
        return jsonify(message="Username or email already exists."), 409

    # Hash the password
    hashed_password = generate_password_hash(password)
    # Ensure school exists
    school = School.query.get(school_id)
    if not school:
        return jsonify(message="School not found."), 404

    if role == 'student':
        new_user = Student(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            fullName=fullName,
            user_role=role,
            school_id=school_id
        )
    elif role == 'teacher':
        new_user = Teacher(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role=role,
             job_name = job_name,
            fullName=fullName,
            school_id=school_id
        )
    elif role == 'school_admin':
        new_user = Teacher(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role=role,
            fullName=fullName,
            school_id=school_id
        )
    elif role == 'data_analyst':
        new_user = Teacher(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role=role,
            fullName=fullName,
            school_id=school_id
        )
    else:
        return jsonify(message="Invalid role specified."), 400

    db.session.add(new_user)
    db.session.commit()

    return jsonify(message="User registered successfully"), 201


@auth_blueprint.route('/register_single_teacher', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة معلم جديد " ,content='')
def register_single_teacher():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    if Login_user.user_role != 'school_admin' and Login_user.user_role != 'data_analyst':  # Ensure only school_admin or data_analyst can register teachers
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400
    
    data = request.get_json()
    username = data.get('username')
    # password = data.get('password')
    email = data.get('email')
    fullName = data.get('fullName')
    phone_number = data.get('phone_number')
    job_name = data.get('job_name')  # New job_name field
    # /role = data.get('role')
    # school_id = data.get('school_id')

    # Validate required fields
    if not all([username, email,fullName ]):
        return jsonify(message="Missing required fields."), 400

    # Check if username or email already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing_user:
        return jsonify(message="Username or email already exists."), 409
    
    # Ensure school exists
    school = School.query.get(Login_user.school_id)

    # Hash the password
    hashed_password = generate_password_hash(school.password)

    # Ensure school exists
    school = School.query.get(Login_user.school_id)
    if not school:
        return jsonify(message="School not found."), 404

  
 
    new_user = Teacher(
        password=hashed_password,
        email=email,
        phone_number=phone_number,
        user_role='teacher',
        fullName=fullName,
        job_name = job_name,
        school_id=Login_user.school_id,
        username=username,)
       
   
    db.session.add(new_user)
    db.session.commit()

    return jsonify(message="User registered successfully , تم إضافة المعلم بنجاح"), 201


@auth_blueprint.route('/register_Teacher', methods=['POST']) 
@jwt_required()
@log_action("إضافة", description="إضافة قائمة معلمين جدد ")
def register_Users():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    data = request.get_json()
    
    if Login_user.user_role != 'school_admin' and Login_user.user_role != 'data_analyst':  # Ensure only school_admin or data_analyst can register teachers
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400
    
    if not isinstance(data, list):  # Ensure data is a list of users
        return jsonify(message={"en": "Invalid data format. Expecting a list of users.", "ar": "تنسيق بيانات غير صالح. يجب أن تكون قائمة من المستخدمين."}, flag=2), 400
 # ✅ Limit number of students
    MAX_STUDENTS = 10000
    if len(data) > MAX_STUDENTS:
        return jsonify(message={
            "en": f"Maximum allowed students is {MAX_STUDENTS}.",
            "ar": f"الحد الأقصى المسموح به لإرسال الطلاب هو {MAX_STUDENTS}."
        }, flag=5), 400
    
    response = []  # To collect responses for each user
    for user_data in data:
        username = user_data.get('username')
        email = user_data.get('email')
        fullName = user_data.get('fullName')
        phone_number = user_data.get('phone_number')
        job_name = user_data.get('job_name')  # New job_name field
        week_Classes_Number = user_data.get('week_Classes_Number')
        
        # Validate required fields
        if not all([username, fullName, email]):
            response.append({
                "username": username, 
                "message": {
                    "en": "Missing required fields.", 
                    "ar": "هناك حقول مفقودة."
                },
                "flag": 3
            })
            continue
        
        
    
        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            response.append({
                "username": username, 
                "message": {
                    "en": "Username or email already exists.", 
                    "ar": "اسم المستخدم أو البريد الإلكتروني موجود بالفعل."
                },
                "flag": 4
            })
            continue
        
        # Ensure school exists
        school = School.query.get(Login_user.school_id)

        # Hash the password (Default password or generate one)
        hashed_password = generate_password_hash(school.password)  # Default password for new teachers
        
        if not school:
            response.append({
                "username": username, 
                "message": {
                    "en": "School not found.", 
                    "ar": "لم يتم العثور على المدرسة."
                },
                "flag": 5
            })
            continue
        
        new_user = Teacher(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role='teacher',
            fullName=fullName,
            school_id=Login_user.school_id,
            job_name=job_name , # Assign job_name
            week_Classes_Number=week_Classes_Number

        )
        
        db.session.add(new_user)
        response.append({
            "username": username, 
            "message": {
                "en": "User registered successfully.", 
                "ar": "تم تسجيل المستخدم بنجاح."
            },
            "flag": 6
        })
    
    # Commit all users at once
    try:
        db.session.commit()
    except Exception as e:
        return jsonify(message={"en": f"Database error: {str(e)}", "ar": f"خطأ في قاعدة البيانات: {str(e)}"}, flag=7), 500

    return jsonify(response), 201

@auth_blueprint.route('/register_single_data_analyst', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة محلل بيانات جديد " ,content='')
def register_single_data_analyst():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    if Login_user.user_role != 'school_admin':  # Ensure only school_admin can register data_analyst
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400
    
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    fullName = data.get('fullName')
    phone_number = data.get('phone_number')
    job_name = data.get('job_name')

    # Validate required fields
    if not all([username, email, fullName]):
        return jsonify(message="Missing required fields."), 400

    # Check if username or email already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing_user:
        return jsonify(message="Username or email already exists."), 409
    
    # Ensure school exists
    school = School.query.get(Login_user.school_id)

    # Hash the password
    hashed_password = generate_password_hash(school.password)

    # Ensure school exists
    school = School.query.get(Login_user.school_id)
    if not school:
        return jsonify(message="School not found."), 404

    new_user = Teacher(
        password=hashed_password,
        email=email,
        phone_number=phone_number,
        user_role='data_analyst',
        fullName=fullName,
        job_name=job_name,
        school_id=Login_user.school_id,
        username=username,
    )
       
    db.session.add(new_user)
    db.session.commit()

    return jsonify(message="Data analyst registered successfully , تم إضافة محلل البيانات بنجاح"), 201


@auth_blueprint.route('/register_single_assign_student', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة طالب جديد ")
def register_single_assign_student():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # ✅ تحقق من صلاحية المستخدم
    if Login_user.user_role != 'school_admin':
        return jsonify(message="Unauthorized to make this action."), 403

    

    # ✅ قراءة البيانات
    try:
        data = request.get_json()
    except Exception as e:
        return jsonify(message=f"Failed to parse JSON: {str(e)}"), 400

    # ✅ استخراج البيانات المطلوبة
    class_id = data.get('class_id')
    student_data = data.get('student')  # 🔸 هنا نتوقع كائن طالب واحد فقط

    if not class_id or not isinstance(student_data, dict):
        return jsonify(message="class_id and student object are required."), 400

    class_obj = Class.query.get(class_id)
    if not class_obj or class_obj.school_id != Login_user.school_id:
        return jsonify(message="Invalid class or unauthorized access."), 403

    # ✅ بيانات الطالب
    username = student_data.get('username')
    fullName = student_data.get('fullName')
    phone_number = student_data.get('phone_number')
    email = student_data.get('email')

    if not username or not fullName:
        return jsonify(message="Missing required fields."), 400

    # ✅ التحقق من تكرار اسم المستخدم
    if User.query.filter_by(username=username).first():
        return jsonify(message="Username already exists."), 409

    hashed_password = generate_password_hash('12345678')

    # ✅ إنشاء الطالب
    new_student = Student(
        username=username,
        password=hashed_password,
        email=email,
        phone_number=phone_number,
        user_role='student',
        fullName=fullName,
        school_id=Login_user.school_id
    )

    try:
        db.session.add(new_student)
        db.session.flush()  # Get student ID

        # ✅ ربط الطالب بالفصل
        class_obj.students.append(new_student)

        db.session.commit()
        return jsonify(message="Student registered and assigned to class."), 201

    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500


@auth_blueprint.route('/register_Students', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة قائمة طلاب جدد ")
def register_Students():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # Authorization check
    if Login_user.user_role != 'school_admin':
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 403

    # Ensure the request content type is application/json
    if not request.content_type or 'application/json' not in request.content_type:
        return jsonify(message={"en": "Invalid content type. Expecting application/json.", "ar": "تنسيق غير صالح. يجب أن يكون نوع المحتوى application/json."}, flag=2), 400

    # Parse JSON data
    try:
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify(message={"en": f"Failed to parse JSON: {str(e)}", "ar": f"فشل في تحليل البيانات: {str(e)}"}, flag=3), 400

    # Validate input is a list
    if not isinstance(data, list):
        return jsonify(message={"en": "Invalid data format. Expecting a list of users.", "ar": "تنسيق بيانات غير صالح. يجب أن تكون القائمة عبارة عن مجموعة من المستخدمين."}, flag=4), 400
    

    # ✅ Limit number of students
    MAX_STUDENTS = 10000
    if len(data) > MAX_STUDENTS:
        return jsonify(message={
            "en": f"Maximum allowed students is {MAX_STUDENTS}.",
            "ar": f"الحد الأقصى المسموح به لإرسال الطلاب هو {MAX_STUDENTS}."
        }, flag=5), 400

    response = []
    for user_data in data:
        username = user_data.get('username')
        fullName = user_data.get('fullName')
        phone_number = user_data.get('phone_number')
        email = user_data.get('email')

        # Validate required fields
        if not username or not fullName:
            response.append({
                "username": username,
                "message": {
                    "en": "Missing required fields.",
                    "ar": "هناك حقول مفقودة."
                },
                "flag": 5
            })
            continue

        # Check for duplicate username
        if User.query.filter_by(username=username).first():
            response.append({
                "username": username,
                "message": {
                    "en": "Username already exists.",
                    "ar": "اسم المستخدم موجود بالفعل."
                },
                "flag": 6
            })
            continue

        # Hash the default password
        # hashed_password = generate_password_hash('12345678')

        # Ensure the school exists
        school = School.query.get(Login_user.school_id)

        hashed_password = generate_password_hash(school.password)

        if not school:
            response.append({
                "username": username,
                "message": {
                    "en": "School not found.",
                    "ar": "لم يتم العثور على المدرسة."
                },
                "flag": 7
            })
            continue

        # Create a new student
        new_user = Student(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role='student',
            fullName=fullName,
            school_id=Login_user.school_id
        )

        db.session.add(new_user)
        response.append({
            "username": username,
            "message": {
                "en": "User registered successfully.",
                "ar": "تم تسجيل المستخدم بنجاح."
            },
            "flag": 8
        })

    # Commit all changes
    try:
        db.session.commit()
    except Exception as e:
        return jsonify(message={"en": f"Database error: {str(e)}", "ar": f"خطأ في قاعدة البيانات: {str(e)}"}, flag=9), 500

    return jsonify(response), 201


@auth_blueprint.route('/update_students_phone_numbers', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة قائمة الهواتف للطلبة  ")
def update_students_phone_numbers():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # Ensure only school_admin can update student phone numbers
    if Login_user.user_role != 'school_admin':
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 403

    # Ensure the request content type is application/json
    if not request.content_type or 'application/json' not in request.content_type:
        return jsonify(message={"en": "Invalid content type. Expecting application/json.", "ar": "تنسيق غير صالح. يجب أن يكون نوع المحتوى application/json."}, flag=2), 400

    # Parse JSON data
    try:
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify(message={"en": f"Failed to parse JSON: {str(e)}", "ar": f"فشل في تحليل البيانات: {str(e)}"}, flag=3), 400
    students_data = data.get('students')  # List of student details
    # Validate input is a list
    if not isinstance(students_data, list):
        return jsonify(message={"en": "Invalid data format. Expecting a list of students.", "ar": "تنسيق بيانات غير صالح. يجب أن تكون القائمة عبارة عن مجموعة من الطلاب."}, flag=4), 400
    
    # ✅ Limit number of students
    MAX_STUDENTS = 10000
    if len(data) > MAX_STUDENTS:
        return jsonify(message={
            "en": f"Maximum allowed students is {MAX_STUDENTS}.",
            "ar": f"الحد الأقصى المسموح به لإرسال الطلاب هو {MAX_STUDENTS}."
        }, flag=5), 400

    response = []
    for student_data in students_data:
        username = student_data.get('username')
        phone_number = student_data.get('phone_number')

        # Validate required fields
        if not username or not phone_number:
            response.append({
                "username": username,
                "message": {
                    "en": "Missing required fields.",
                    "ar": "هناك حقول مفقودة."
                },
                "flag": 5
            })
            continue

        # Find the student by username
        student = Student.query.filter_by(username=username, school_id=Login_user.school_id).first()

        if not student:
            response.append({
                "username": username,
                "message": {
                    "en": "Student not found.",
                    "ar": "لم يتم العثور على الطالب."
                },
                "flag": 6
            })
            continue

        # Update the phone number
        student.phone_number = phone_number
        response.append({
            "username": username,
            "message": {
                "en": "Phone number updated successfully.",
                "ar": "تم تحديث رقم الهاتف بنجاح."
            },
            "flag": 7
        })

    # Commit all changes
    try:
        db.session.commit()
    except Exception as e:
        return jsonify(message={"en": f"Database error: {str(e)}", "ar": f"خطأ في قاعدة البيانات: {str(e)}"}, flag=8), 500

    return jsonify(response), 200



@auth_blueprint.route('/register_and_assign_students', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة وتسجيل طلاب جدد ")
def register_and_assign_students():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # Authorization check
    if not Login_user.user_role == 'school_admin':
        return jsonify(message="Unauthorized to make this action."), 403

    # Ensure the request content type is application/json
    if not request.content_type or 'application/json' not in request.content_type:
        return jsonify(message="Invalid content type. Expecting application/json."), 400

    # Parse JSON data
    try:
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify(message=f"Failed to parse JSON: {str(e)}"), 400

    # Extract class ID and students data
    class_id = data.get('class_id')
    students_data = data.get('students')  # List of student details

    if not class_id or not isinstance(students_data, list):
        return jsonify(message="Class ID and a list of students are required."), 400

    # Ensure the class exists and is managed by the school_admin's school
    class_obj = Class.query.get(class_id)
    if not class_obj or class_obj.school_id != Login_user.school_id:
        return jsonify(message="Invalid class or unauthorized access."), 403

    # Prepare response and register students
    response = []
    for student_data in students_data:
        username = student_data.get('username')
        fullName = student_data.get('fullName')
        phone_number = student_data.get('phone_number')
        email = student_data.get('email')

        # Validate required fields
        if not username or not fullName:
            response.append({"username": username, "message": "Missing required fields."})
            continue

        # Check for duplicate username
        if User.query.filter_by(username=username).first():
            response.append({"username": username, "message": "Username already exists."})
            continue

        # Hash the default password
        hashed_password = generate_password_hash('12345678')

        # Register the student
        new_student = Student(
            username=username,
            password=hashed_password,
            email=email,
            phone_number=phone_number,
            user_role='student',
            fullName=fullName,
            school_id=Login_user.school_id
        )

        db.session.add(new_student)
        db.session.flush()  # Flush to get the student ID for assignment

        # Assign student to the class
        class_obj.students.append(new_student)
        response.append({"username": username, "message": "Student registered and assigned to class."})

    # Commit all changes
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500

    return jsonify(response), 201

@auth_blueprint.route('/register_and_assign_students_v2', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة وتسجيل طلاب جدد ")
def register_and_assign_students_v2():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # Authorization check
    if Login_user.user_role != 'school_admin':
        return jsonify(message="Unauthorized to make this action."), 403

    # Ensure the request content type is application/json
    if not request.content_type or 'application/json' not in request.content_type:
        return jsonify(message="Invalid content type. Expecting application/json."), 400

    # Parse JSON data
    try:
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify(message=f"Failed to parse JSON: {str(e)}"), 400
    
    students_data = data.get('students')  # List of student details

    # Validate input format
    if not isinstance(students_data, list):
        return jsonify(message="Invalid data format. Expecting a list of students."), 400

    # Fetch all classes in the school for faster lookup
    school_classes = {cls.name: cls for cls in Class.query.filter_by(school_id=Login_user.school_id).all()}

    # Track students created in this batch to handle duplicates within the same batch
    batch_students = {}  # {username: student_object}
    # Track class assignments in this batch: {username: set of class_ids}
    batch_class_assignments = {}

    # Prepare response and register students
    response = []
    for student_data in students_data:
        username = student_data.get('username')
        fullName = student_data.get('fullName')
        class_name = student_data.get('class')  # Class name field
        # phone_number = student_data.get('phone_number')
        # email = student_data.get('email')

        # Validate required fields
        if not username or not fullName or not class_name:
            response.append({"username": username, "message": "Missing required fields.", "status": "failed"})
            continue

        # Ensure the class exists in the school
        class_obj = school_classes.get(class_name)
        if not class_obj:
            response.append({"username": username, "message": f"Class '{class_name}' not found.", "status": "failed"})
            continue

        # Check if student was created in this batch first
        student = batch_students.get(username)
        
        # If not in batch, check database and session (includes flushed but uncommitted objects)
        if not student:
            # First check for pending/new objects in session (not yet flushed)
            # This catches objects added in current batch but not yet flushed
            for obj in db.session.new:
                if isinstance(obj, User) and hasattr(obj, 'username') and obj.username == username:
                    if isinstance(obj, Student) and obj.school_id == Login_user.school_id:
                        student = obj
                        batch_students[username] = student
                        break
                    elif not isinstance(obj, Student):
                        # Username exists as non-student user in pending objects
                        response.append({
                            "username": username,
                            "message": {
                                "en": "Username already exists as non-student user.",
                                "ar": "اسم المستخدم موجود بالفعل كمستخدم غير طالب."
                            },
                            "status": "failed"
                        })
                        continue
            
            # Query database - this will see both committed AND flushed objects in current session
            if not student:
                existing_user = db.session.query(User).filter_by(username=username).first()
                
                if existing_user:
                    # If it's a student in the same school, use it (don't create, just enroll)
                    if isinstance(existing_user, Student) and existing_user.school_id == Login_user.school_id:
                        student = existing_user
                        batch_students[username] = student
                    else:
                        # Username exists but not as a student in this school
                        response.append({
                            "username": username,
                            "message": {
                                "en": "Username already exists as non-student user.",
                                "ar": "اسم المستخدم موجود بالفعل كمستخدم غير طالب."
                            },
                            "status": "failed"
                        })
                        continue

        # If student exists (either in DB or in current batch), just enroll to classes
        if student:
            # Check if already in this class - check batch assignments first (faster)
            batch_class_ids = batch_class_assignments.get(username, set())
            
            if class_obj.id in batch_class_ids:
                # Student already enrolled in this class in current batch
                response.append({
                    "username": username,
                    "message": {
                        "en": "Student already enrolled in class '{class_name}'.",
                        "ar": "الطالب مسجل بالفعل في الفصل '{class_name}'."
                    },
                    "status": "skipped"
                })
                continue
            
            # Check database directly via student_classes table (more efficient than loading relationships)
            existing_enrollment = db.session.query(student_classes).filter(
                student_classes.c.student_id == student.id,
                student_classes.c.class_id == class_obj.id
            ).first()
            
            if existing_enrollment:
                # Student already in this class in database
                response.append({
                    "username": username,
                    "message": {
                        "en": "Student already enrolled in class '{class_name}'.",
                        "ar": "الطالب مسجل بالفعل في الفصل '{class_name}'."
                    },
                    "status": "skipped"
                })
                continue
            else:
                # Student exists but not in this class - enroll them to the class
                class_obj.students.append(student)
                # Track this assignment in batch
                if username not in batch_class_assignments:
                    batch_class_assignments[username] = set()
                batch_class_assignments[username].add(class_obj.id)
                response.append({
                    "username": username,
                    "message": {
                        "en": "Student enrolled in class '{class_name}'.",
                        "ar": "تم تسجيل الطالب في الفصل '{class_name}'."
                    },
                    "status": "success"
                })
                continue

        # Student doesn't exist - create new student and enroll to class
        # Hash the default password
        hashed_password = generate_password_hash('12345678')

        # Register the student
        new_student = Student(
            username=username,
            password=hashed_password,
            email=username,
            # phone_number=phone_number,
            user_role='student',
            fullName=fullName,
            school_id=Login_user.school_id
        )

        db.session.add(new_student)
        
        try:
            db.session.flush()  # Flush to get the student ID for assignment
        except IntegrityError as e:
            # If unique constraint violation, student already exists in DB
            # This should rarely happen since we check first, but handle it gracefully
            db.session.expunge(new_student)
            # Re-query to get the existing student
            existing_user = db.session.query(User).filter_by(username=username).first()
            
            if existing_user and isinstance(existing_user, Student) and existing_user.school_id == Login_user.school_id:
                # Use existing student and enroll to class
                student = existing_user
                batch_students[username] = student
                
                # Check if already in this class - check batch assignments first
                batch_class_ids = batch_class_assignments.get(username, set())
                
                if class_obj.id in batch_class_ids:
                    response.append({
                        "username": username,
                        "message": {
                            "en": "Student already enrolled in class '{class_name}'.",
                            "ar": "الطالب مسجل بالفعل في الفصل '{class_name}'."
                        },
                        "status": "skipped"
                    })
                    continue
                
                # Check database directly via student_classes table
                existing_enrollment = db.session.query(student_classes).filter(
                    student_classes.c.student_id == student.id,
                    student_classes.c.class_id == class_obj.id
                ).first()
                
                if not existing_enrollment:
                    # Enroll to class
                    class_obj.students.append(student)
                    if username not in batch_class_assignments:
                        batch_class_assignments[username] = set()
                    batch_class_assignments[username].add(class_obj.id)
                    response.append({
                        "username": username,
                        "message": {
                            "en": "Student enrolled in class '{class_name}'.",
                            "ar": "تم تسجيل الطالب في الفصل '{class_name}'."
                        },
                        "status": "success"
                    })
                else:
                    response.append({
                        "username": username,
                        "message": {
                            "en": "Student already enrolled in class '{class_name}'.",
                            "ar": "الطالب مسجل بالفعل في الفصل '{class_name}'."
                        },
                        "status": "skipped"
                    })
                continue
            else:
                # Unexpected error
                response.append({
                    "username": username,
                    "message": {
                        "en": "Username already exists.",
                        "ar": "اسم المستخدم موجود بالفعل."
                    },
                    "status": "failed"
                })
                continue
        
        # Track this student in the batch dictionary
        batch_students[username] = new_student

        # Enroll student to the class
        class_obj.students.append(new_student)
        
        # Track this class assignment in batch
        if username not in batch_class_assignments:
            batch_class_assignments[username] = set()
        batch_class_assignments[username].add(class_obj.id)
        
        response.append({"username": username, "message": {
            "en": "Student created and enrolled in class '{class_name}'.",
            "ar": "تم إنشاء الطالب وتسجيله في الفصل '{class_name}'."
        }, "status": "success"})

    # Commit all changes
    try:
        db.session.commit()
    except IntegrityError as e:
        # Handle unique constraint violations during commit
        db.session.rollback()
        error_msg = str(e)
        # Return partial results with error info
        return jsonify({
            "message": {
                "en": "Some students could not be processed due to database constraints.",
                "ar": "لم يتم معالجة بعض الطلاب بسبب حدوث خطأ في قاعدة البيانات."
            },
            "error": "integrity_error",
            "details": error_msg,
            "partial_results": response
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500

    return jsonify(response), 201


@auth_blueprint.route('/user', methods=['GET'])
@jwt_required()
def get_user_details():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found"), 404
    
    school_name = None  # Default to None if no school is applicable

    school = School.query.get(user.school_id)
    school_name = school.name if school else "Unknown School"  # Handle case if school is not found

    if user.user_role == 'admin':
        # Admin can fetch all users from all schools
        school_name = "School Admin"

    if isinstance(user, Student):
        user_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "role": user.user_role,
        "school_name": school_name
    }
        user_data["school_id"] = user.school_id
    elif isinstance(user, Teacher):
        user_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "role": user.user_role,
        "job_name": user.job_name,
        "week_Classes_Number": user.week_Classes_Number,
        "school_name": school_name
    }
    else:
        user_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "role": user.user_role,
        "school_name": school_name
        }
    
        user_data["school_id"] = user.school_id
        # Add additional teacher-specific fields if any (e.g., salary)
        user_data["salary"] = user.salary if hasattr(user, 'salary') else None

    return jsonify(user_data), 200


@auth_blueprint.route('/update_user/<int:user_id>', methods=['POST'])
@jwt_required()
@log_action("تعديل", description="تعديل بيانات مستخدم")
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    # Authorization check
    if current_user.user_role not in ['admin', 'school_admin'] and current_user_id != user_id:
        return jsonify(message="Unauthorized to update this user."), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found."), 404

    data = request.get_json()

    # Common fields for all users
    username = data.get('username')
    email = data.get('email')
    fullName = data.get('fullName')
    phone_number = data.get('phone_number')
    password = data.get('password')
    school_id = data.get('school_id')
    user_role = data.get('user_role')
    is_active = data.get('is_active')

    # Teacher-specific fields
    job_name = data.get('job_name')
    week_Classes_Number = data.get('week_Classes_Number')
    salary = data.get('salary')

    # Validate uniqueness
    if username and User.query.filter(User.username == username, User.id != user_id).first():
        return jsonify(message="Username already exists."), 409
    if email and User.query.filter(User.email == email, User.id != user_id).first():
        return jsonify(message="Email already exists."), 409

    if school_id:
        school = School.query.get(school_id)
        if not school:
            return jsonify(message="School not found."), 404

    # Update shared fields
    if username:
        user.username = username
    if email:
        user.email = email
    if fullName:
        user.fullName = fullName
    if phone_number:
        user.phone_number = phone_number
    if password:
        user.password = generate_password_hash(password)
    if is_active is not None:
        user.is_active = is_active
    if user_role:
        user.user_role = user_role
    if school_id and hasattr(user, 'school_id'):
        user.school_id = school_id

    # Update teacher-specific fields if the user is a Teacher
    if isinstance(user, Teacher):
        if job_name is not None:
            user.job_name = job_name
        if week_Classes_Number is not None:
            user.week_Classes_Number = week_Classes_Number
        if salary is not None:
            user.salary = salary

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500

    # Serialize only fields that apply to user type
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "is_active": user.is_active,
        "user_role": user.user_role,
    }

    if isinstance(user, Teacher):
        user_data.update({
            "job_name": user.job_name,
            "week_Classes_Number": user.week_Classes_Number,
            "salary": user.salary,
        })

    return jsonify(message="User updated successfully.", user=user_data), 200


@auth_blueprint.route('/getUser/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_details_id(user_id):
    # Get the current user's ID from the JWT token
    current_user_id = get_jwt_identity()
    
    # Fetch the user details
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found."), 404
    

    # Add additional fields if the user is a student or teacher
    if isinstance(user, Student):
        user_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "user_role": user.user_role,
        "is_active": user.is_active
    }
        user_data["school_id"] = user.school_id
    elif isinstance(user, Teacher):
        user_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": user.fullName,
        "phone_number": user.phone_number,
        "user_role": user.user_role,
        "job_name": user.job_name,
        "week_Classes_Number": user.week_Classes_Number,
        "is_active": user.is_active
    }
        user_data["school_id"] = user.school_id
        # Add additional teacher-specific fields if any (e.g., salary)
        user_data["salary"] = user.salary if hasattr(user, 'salary') else None

    return jsonify(user_data), 200

@auth_blueprint.route('/user/<int:user_id>', methods=['DELETE'])
@jwt_required()
@log_action("حذف", description="حذف بيانات مستخدم")
def delete_user(user_id):
    # Get the current user's ID from the JWT token
    current_user_id = get_jwt_identity()
    
    # Fetch the user to be deleted
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="المستخدم غير موجود."), 404

    # Check if the user is active
    if not user.is_active:
        return jsonify(message="لا يمكن حذف حساب مستخدم غير نشط."), 400

    # Check if the user has associated classes (for teachers)
    if isinstance(user, Teacher):
        associated_classes = Class.query.filter_by(teacher_id=user_id).count()
        if associated_classes > 0:
            return jsonify(
                message=f"لا يمكن حذف المعلم '{user.fullName}' لأنه مرتبط بـ {associated_classes} فصل دراسي. يرجى إلغاء ربطه من الفصول أولاً.",
                details={
                    "user_name": user.fullName,
                    "associated_classes_count": associated_classes,
                    "reason": "معلم مرتبط بفصول دراسية"
                }
            ), 400

    # Check if the user has attendance records (for students)
    if isinstance(user, Student):
        from app.models import Attendance
        attendance_records = Attendance.query.filter_by(student_id=user_id).count()
        if attendance_records > 0:
            return jsonify(
                message=f"لا يمكن حذف الطالب '{user.fullName}' لأنه لديه {attendance_records} سجل حضور. يرجى حذف سجلات الحضور أولاً.",
                details={
                    "user_name": user.fullName,
                    "attendance_records_count": attendance_records,
                    "reason": "طالب لديه سجلات حضور"
                }
            ), 400

    # Check if the user has any other related records
    # Check for any logs or other related data
    from app.models import Log
    user_logs = Log.query.filter_by(user_id=user_id).count()
    if user_logs > 0:
        return jsonify(
            message=f"لا يمكن حذف المستخدم '{user.fullName}' لأنه لديه {user_logs} سجل في النظام. يرجى مراجعة السجلات أولاً.",
            details={
                "user_name": user.fullName,
                "logs_count": user_logs,
                "reason": "مستخدم لديه سجلات في النظام"
            }
        ), 400

    # Authorization check (only allow admins or the user themselves to delete)
    current_user = User.query.get(current_user_id)
    if current_user.user_role != 'admin' and current_user_id != user_id:
        return jsonify(message="غير مصرح لك بحذف هذا المستخدم."), 403

    # Additional check: prevent admin from deleting themselves
    if current_user_id == user_id and current_user.user_role == 'admin':
        return jsonify(message="لا يمكن للمدير حذف حسابه الخاص."), 400

    # Delete the user
    db.session.delete(user)
    db.session.commit()

    return jsonify(
        message=f"تم حذف المستخدم '{user.fullName}' بنجاح.",
        details={
            "user_name": user.fullName,
            "user_role": user.user_role
        }
    ), 200


@auth_blueprint.route('/send-absence-notifications', methods=['POST'])
@jwt_required()
@log_action("إرسال إشعارات الغياب", description="إرسال رسائل WhatsApp للطلاب المتغيبين")
def send_absence_notifications():
    """
    Send WhatsApp notifications to students with absences
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check authorization (only school admins and data analysts)
        if current_user.user_role not in ['school_admin', 'data_analyst', 'admin']:
            return jsonify(message="غير مصرح لك بإرسال إشعارات الغياب."), 403
        
        # Get request data
        data = request.get_json() or {}
        school_id = data.get('school_id')
        days_back = data.get('days_back', 7)
        custom_message = data.get('custom_message')
        
        # Validate days_back
        if not isinstance(days_back, int) or days_back < 1 or days_back > 30:
            return jsonify(message="عدد الأيام يجب أن يكون بين 1 و 30."), 400
        
        # Import the messaging service
        try:
            from whatsapp_automation import AbsenceMessagingService
        except ImportError as e:
            logger.error(f"Failed to import whatsapp_automation: {str(e)}")
            return jsonify(message=f"خطأ في تحميل نظام WhatsApp: {str(e)}"), 500
        except Exception as e:
            logger.error(f"Unexpected error importing whatsapp_automation: {str(e)}")
            return jsonify(message=f"خطأ غير متوقع في تحميل نظام WhatsApp: {str(e)}"), 500
        
        # Initialize and run the messaging service
        messaging_service = AbsenceMessagingService()
        results = messaging_service.send_absence_notifications(
            school_id=school_id or current_user.school_id,
            days_back=days_back,
            custom_message=custom_message
        )
        
        if results['success']:
            return jsonify({
                "message": results['message'],
                "total": results['total'],
                "sent": results['sent'],
                "failed": results['failed'],
                "failed_contacts": results.get('failed_contacts', [])
            }), 200
        else:
            return jsonify({
                "message": results['message'],
                "error": True
            }), 500
            
    except Exception as e:
        logger.error(f"Error in send_absence_notifications: {str(e)}")
        return jsonify(message=f"حدث خطأ أثناء إرسال الإشعارات: {str(e)}"), 500


@auth_blueprint.route('/get-absence-stats', methods=['GET'])
@jwt_required()
def get_absence_stats():
    """
    Get statistics about students with absences
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check authorization
        if current_user.user_role not in ['school_admin', 'data_analyst', 'admin']:
            return jsonify(message="غير مصرح لك بعرض إحصائيات الغياب."), 403
        
        # Get query parameters
        school_id = request.args.get('school_id', type=int)
        days_back = request.args.get('days_back', 7, type=int)
        
        # Validate days_back
        if days_back < 1 or days_back > 30:
            return jsonify(message="عدد الأيام يجب أن يكون بين 1 و 30."), 400
        
        # Import the messaging service to get stats
        try:
            from whatsapp_automation import AbsenceMessagingService
        except ImportError as e:
            logger.error(f"Failed to import whatsapp_automation: {str(e)}")
            return jsonify(message=f"خطأ في تحميل نظام WhatsApp: {str(e)}"), 500
        except Exception as e:
            logger.error(f"Unexpected error importing whatsapp_automation: {str(e)}")
            return jsonify(message=f"خطأ غير متوقع في تحميل نظام WhatsApp: {str(e)}"), 500
        
        messaging_service = AbsenceMessagingService()
        students_data = messaging_service.get_students_with_absences(school_id, days_back)
        
        # Calculate statistics
        total_students = len(students_data)
        students_with_phone = len([s for s in students_data if s.get('phone')])
        total_absences = sum(s['absence_count'] for s in students_data)
        
        # Group by absence count
        absence_groups = {}
        for student in students_data:
            count = student['absence_count']
            if count not in absence_groups:
                absence_groups[count] = 0
            absence_groups[count] += 1
        
        return jsonify({
            "total_students_with_absences": total_students,
            "students_with_phone_numbers": students_with_phone,
            "total_absence_records": total_absences,
            "absence_distribution": absence_groups,
            "days_checked": days_back,
            "school_id": school_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_absence_stats: {str(e)}")
        return jsonify(message=f"حدث خطأ أثناء جلب الإحصائيات: {str(e)}"), 500


def validate_password_strength(password):
    """
    Validates that the password meets the following criteria:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one number
    """
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'\d', password):
        return "Password must contain at least one number."
    return None

@auth_blueprint.route('/change_password', methods=['PUT'])
@jwt_required()
@log_action("تعديل", description="تعديل رمز المرور للمستخدم")
def change_password():
    # Get the current user ID from the JWT
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found."), 404

    # Parse the request body
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_new_password = data.get('confirm_new_password')

    # Validate input
    if not current_password or not new_password or not confirm_new_password:
        return jsonify(message="All fields are required."), 400

    if new_password != confirm_new_password:
        return jsonify(message="New passwords do not match."), 400

    # Check if the current password is correct
    if not check_password_hash(user.password, current_password):
        return jsonify(message="Current password is incorrect."), 403

    # Validate the strength of the new password
    password_error = validate_password_strength(new_password)
    if password_error:
        return jsonify(message=password_error), 400

    # Hash the new password and update the user's password
    user.password = generate_password_hash(new_password)

    # Commit the changes
    try:
        db.session.commit()
        return jsonify(message="Password updated successfully."), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message=f"Database error: {str(e)}"), 500



@auth_blueprint.route('/delete_school_data', methods=['DELETE'])
@jwt_required()
@log_action("حذف", description="حذف بيانات المدرسة")
def delete_school_data():
    """
    Allows school admin to selectively delete data related to a given school.
    The user can choose to delete attendance, subjects, classes, students, teachers, or the entire school.
    The school admin will NEVER be deleted.
    """

    # Get authenticated user
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)
    school_id = Login_user.school_id 

    # Ensure only school_admins can perform deletion
    if Login_user.user_role != 'school_admin':
        return jsonify({
            "message": {
                "en": "Unauthorized to delete school data.",
                "ar": "غير مصرح لك بحذف بيانات المدرسة."
            },
            "flag": 1
        }), 403

    # Parse delete options from request body
    try:
        data = request.get_json()  # Explicitly parse JSON
        delete_options = data.get("delete_options", [])
    except Exception:
        return jsonify({
            "message": {
                "en": "Invalid JSON format. Expected application/json.",
                "ar": "تنسيق JSON غير صالح. يجب أن يكون application/json."
            },
            "flag": 2
        }), 400

    print("Delete options received:", delete_options)

    # Ensure delete_options is a list
    if not isinstance(delete_options, list) or not delete_options:
        return jsonify({
            "message": {
                "en": "Invalid request. Please provide a list of items to delete.",
                "ar": "طلب غير صالح. يرجى تقديم قائمة بالعناصر المراد حذفها."
            },
            "flag": 3
        }), 400

    # Fetch the school
    school = School.query.get(school_id)
    if not school:
        return jsonify({
            "message": {
                "en": "School not found.",
                "ar": "لم يتم العثور على المدرسة."
            },
            "flag": 4
        }), 404

    try:
        ### **1️⃣ Delete Attendance Records (if selected)**
        if "attendance" in delete_options:
            db.session.query(Attendance).filter(
                Attendance.class_id.in_(
                    db.session.query(Class.id).filter_by(school_id=school_id)
                )
            ).delete(synchronize_session=False)

        ### **2️⃣ Delete Student-Class Relationships (if students or classes are selected)**
        if "students" in delete_options or "classes" in delete_options:
            db.session.query(student_classes).filter(
                student_classes.c.class_id.in_(
                    db.session.query(Class.id).filter_by(school_id=school_id)
                )
            ).delete(synchronize_session=False)

        ### **3️⃣ Delete Students (if selected)**
        if "students" in delete_options:
            student_ids = [s.id for s in Student.query.filter_by(school_id=school_id).all()]
            if student_ids:
                db.session.query(Student).filter(Student.id.in_(student_ids)).delete(synchronize_session=False)
                db.session.query(User).filter(User.id.in_(student_ids)).delete(synchronize_session=False)

        ### **4️⃣ Delete Teachers (if selected)**
        if "teachers" in delete_options:
            # Get teacher IDs excluding school_admins
            teacher_ids = [
                t.id for t in Teacher.query.filter(
                    Teacher.school_id == school_id,
                    Teacher.user_role != "school_admin"  # Exclude school_admins
                ).all()
            ]
            if teacher_ids:
                db.session.query(Teacher).filter(Teacher.id.in_(teacher_ids)).delete(synchronize_session=False)
                db.session.query(User).filter(User.id.in_(teacher_ids)).delete(synchronize_session=False)


        ### **5️⃣ Delete Subjects (if selected)**
        if "subjects" in delete_options:
            db.session.query(Subject).filter_by(school_id=school_id).delete(synchronize_session=False)

        ### **6️⃣ Delete Classes (if selected)**
        if "classes" in delete_options:
            db.session.query(Class).filter_by(school_id=school_id).delete(synchronize_session=False)

            ### **8️⃣ Delete News (if selected)**
        if "news" in delete_options:
            db.session.query(News).filter_by(school_id=school_id).delete(synchronize_session=False)

        ### **7️⃣ Delete School (if selected)**
        if "school" in delete_options:
            # Ensure the school admin is NOT deleted
            db.session.query(User).filter(
                and_(User.school_id == school_id, User.user_role != "school_admin")
            ).delete(synchronize_session=False)
            db.session.delete(school)

        ### **🧾 Delete Logs for users in this school**
        if "logs" in delete_options:
            user_ids_in_school = [u.id for u in User.query.filter_by(school_id=school_id).all()]
            db.session.query(ActionLog).filter(ActionLog.user_id.in_(user_ids_in_school)).delete(synchronize_session=False)

        # Commit changes
        db.session.commit()

        return jsonify({
            "message": {
                "en": "Selected school data deleted successfully.",
                "ar": "تم حذف بيانات المدرسة المحددة بنجاح."
            },
            "flag": 5
        }), 200

    except Exception as e:
        db.session.rollback()  # Rollback if an error occurs
        return jsonify({
            "message": {
                "en": f"Database error: {str(e)}",
                "ar": f"خطأ في قاعدة البيانات: {str(e)}"
            },
            "flag": 6
        }), 500


@auth_blueprint.route('/toggle_school_status/<int:school_id>', methods=['PUT'])
@jwt_required()
@log_action("تعديل", description="تعديل حالة المدرسة")
def toggle_school_status(school_id):
    """
    Toggles the active status of a school and all its users except the school_admin.
    If the school is active, deactivate it along with its users.
    If the school is inactive, activate it along with its users.
    """
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)

    # Ensure only school_admins can perform this action
    if Login_user.user_role != 'admin':
        return jsonify({
            "message": {
                "en": "Unauthorized to change the school status.",
                "ar": "غير مصرح لك بتغيير حالة المدرسة."
            },
            "flag": 1
        }), 403

    # Ensure the school exists
    school = School.query.get(school_id)
    if not school:
        return jsonify({
            "message": {
                "en": "School not found.",
                "ar": "لم يتم العثور على المدرسة."
            },
            "flag": 2
        }), 404

    try:
        # Toggle status
        new_status = not school.is_active  # Switch status

        # Update all users except school_admin
        db.session.query(User).filter(
            User.school_id == school_id,
            # User.user_role != 'school_admin'
        ).update({"is_active": new_status}, synchronize_session=False)

        # Update school status
        school.is_active = new_status

        db.session.commit()

        return jsonify({
            "message": {
                "en": f"The school and its users have been {'activated' if new_status else 'deactivated'}.",
                "ar": f"تم {'تنشيط' if new_status else 'تعطيل'} المدرسة والمستخدمين."
            },
            "status": new_status,
            "flag": 3
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": {
                "en": f"Database error: {str(e)}",
                "ar": f"خطأ في قاعدة البيانات: {str(e)}"
            },
            "flag": 4
        }), 500


@auth_blueprint.route('/view_logs', methods=['GET'])
@jwt_required()
def view_logs():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="Unauthorized"), 403

    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Limit per_page to prevent excessive data loading
    per_page = min(per_page, 100)
    
    # Get date filter parameter (optional)
    days_back = request.args.get('days', 30, type=int)
    days_back = min(days_back, 90)  # Limit to 90 days max
    
    # 🔍 Calculate the date filter
    date_filter = get_oman_time() - timedelta(days=days_back)

    # Build optimized query with proper joins and eager loading
    query = db.session.query(ActionLog, User.fullName, User.user_role).join(
        User, ActionLog.user_id == User.id
    )

    if user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        query = query.filter(User.school_id == user.school_id)
    elif user.user_role == 'admin':
        pass
    else:
        return jsonify(message="Access denied"), 403

    # ⏳ Filter logs from the specified date range
    query = query.filter(ActionLog.timestamp >= date_filter)

    # Get total count for pagination info
    total_count = query.count()
    
    # Apply pagination and ordering
    logs_data = query.order_by(ActionLog.timestamp.desc()).paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )

    role_map = {
        "teacher": "tch",
        "student": "std",
        "school_admin": "Asch"
    }

    # Build response with pagination info
    response_data = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user_fullName,
            "role": role_map.get(user_role),
            "endpoint": log.endpoint,
            "method": log.method,
            "ip_address": log.ip_address,
            "mac_address": log.mac_address,
            "action_type": log.action_type,
            "description": log.description,
            "content": log.content,
            "timestamp": log.timestamp.strftime('%d-%m-%Y %I:%M %p'),
            "status_code": log.status_code
        }
        for log, user_fullName, user_role in logs_data.items
    ]

    return jsonify({
        "logs": response_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total_count,
            "pages": logs_data.pages,
            "has_next": logs_data.has_next,
            "has_prev": logs_data.has_prev
        }
    }), 200
