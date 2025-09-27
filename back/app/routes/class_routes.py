# app/routes/class_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Teacher, Class, Student, student_classes, School ,User,Subject
from app import db
from app.logger import log_action

class_blueprint = Blueprint('class_blueprint', __name__)

@class_blueprint.route('/addSchool', methods=['POST'])
@log_action("إضافة ", description="إضافة مدرسة جديدة")
@jwt_required()
def create_school():
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)
    if Login_user.user_role != 'admin':  # Ensure only school_admin can register teachers
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400
    
    data = request.get_json()
    new_school = School(
        name=data['name'],
        address=data['address'],
        phone_number=data.get('phone_number', ''),
        password=data['password'],
        is_active=data.get('is_active', True))
    db.session.add(new_school)
    db.session.commit()
    return jsonify(message="School added"), 201

@class_blueprint.route('/updateSchool/<int:school_id>', methods=['PUT'])
@jwt_required()
@log_action("تعديل", description="تعديل بيانات المدرسة")
def update_school(school_id):
    user_id = get_jwt_identity()
    Login_user = User.query.get(user_id)
    
    if Login_user.user_role != 'admin':  # Ensure only admin can update schools
        return jsonify(message={"en": "Unauthorized to make this action.", "ar": "غير مصرح لك بتنفيذ هذا الإجراء."}, flag=1), 400

    data = request.get_json()
    
    if not data:
        return jsonify(message="No data provided"), 400

    school = School.query.get(school_id)
    if not school:
        return jsonify(message="School not found"), 404

    # Update school fields
    if 'name' in data:
        school.name = data['name']
    if 'address' in data:
        school.address = data['address']
    if 'phone_number' in data:
        school.phone_number = data['phone_number']
    if 'password' in data and data['password']:
        school.password = data['password']
    if 'is_active' in data:
        school.is_active = data['is_active']

    try:
        db.session.commit()
        return jsonify(message="School updated successfully"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message="Failed to update school"), 500

@class_blueprint.route('/create', methods=['POST'])
@jwt_required()
@log_action("إضافة ", description="إضافة فصل جديدة")
def create_class():
    data = request.get_json()
    name = data.get('name')
    
    print(name)

    if not name:
        return jsonify(message="Class name is required."), 400

    user_id = get_jwt_identity()
  
    user = User.query.get(user_id)

    if not user.user_role == 'school_admin':
        return jsonify(message="Only admin can create classes."), 403

    new_class = Class(
        name=name,
        school_id=user.school_id,
        teacher_id=user.id
    )

    db.session.add(new_class)
    db.session.commit()

    return jsonify(message="Class created successfully", class_id=new_class.id), 201

@class_blueprint.route('/createClasses', methods=['POST'])
@jwt_required()
@log_action("إضافة ", description="إضافة فصل جديدة")
def create_classes():
    data = request.get_json('class_List')

    print(data)

    if not isinstance(data, list) or not data:
        return jsonify(message="Invalid data format. Expected a list of class names."), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if user.user_role != 'school_admin':
        return jsonify(message="Only admin can create classes."), 403

    existing_classes = {cls.name for cls in Class.query.filter_by(school_id=user.school_id).all()}  # Fetch existing class names
    response = []

    for name in data:  # Iterate over the list of class names
        if not name:
            response.append({"name": name, "message": "Class name is required.", "status": "failed"})
            continue

        if name in existing_classes:  # Check if class already exists
            response.append({"name": name, "message": "Class already exists.", "status": "failed"})
            continue

        new_class = Class(
            name=name,
            school_id=user.school_id,
            teacher_id=user.id
        )

        db.session.add(new_class)
        existing_classes.add(name)  # Update the set with newly added class
        response.append({"name": name, "message": "Class created successfully", "status": "success"})

    db.session.commit()

    return jsonify(response), 201



@class_blueprint.route('/update-classes', methods=['PUT'])
@jwt_required()
@log_action("تعديل ", description="تعديل بيانات فصل ")
def update_multiple_classes():
    data = request.get_json()
    lists = data.get('lists')

    if not isinstance(lists, list):
        return jsonify(message="Invalid data format. Expecting a list of class updates."), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure the user is a school admin
    if user.user_role != 'school_admin':
        return jsonify(message="Only school admins can update class names."), 403

    updated_classes = []
    not_found_classes = []
    unauthorized_classes = []

    for class_data in lists:
        class_id = class_data.get('id')
        new_name = class_data.get('name')

        if not class_id or not new_name:
            continue  # Skip invalid entries

        class_obj = Class.query.filter_by(id=class_id, school_id=user.school_id).first()

        if not class_obj:
            not_found_classes.append(class_id)
            continue  # Skip classes that do not exist or belong to another school

        # Update the class name
        class_obj.name = new_name
        updated_classes.append({"class_id": class_obj.id, "new_name": class_obj.name})

    db.session.commit()

    return jsonify({
        "message": "Classes updated successfully",
        "updated_classes": updated_classes,
        "not_found_classes": not_found_classes,
        "unauthorized_classes": unauthorized_classes
    }), 200



@class_blueprint.route('/update-Subject', methods=['PUT'])
@jwt_required()
@log_action("تعديل ", description="تعديل بيانات المواد")
def update_multiple_Subject():
    data = request.get_json()
    lists = data.get('lists')

    if not isinstance(lists, list):
        return jsonify(message="Invalid data format. Expecting a list of class updates."), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    # Ensure the user is a school admin
    if user.user_role != 'school_admin':
        return jsonify(message="Only school admins can update class names."), 403

    updated_Subject = []
    not_found_Subject = []
    unauthorized_Subject = []

    for data in lists:
        sub_id = data.get('id')
        new_name = data.get('name')

        if not sub_id or not new_name:
            continue  # Skip invalid entries

        sub_obj = Subject.query.filter_by(id=sub_id, school_id=user.school_id).first()

        if not sub_obj:
            not_found_Subject.append(sub_id)
            continue  # Skip Subject that do not exist or belong to another school

        # Update the class name
        sub_obj.name = new_name
        updated_Subject.append({"class_id": sub_obj.id, "new_name": sub_obj.name})

    db.session.commit()

    return jsonify({
        "message": "Subjects updated successfully",
        "updated_Subject": updated_Subject,
        "not_found_Subject": not_found_Subject,
        "unauthorized_Subject": unauthorized_Subject
    }), 200



@class_blueprint.route('/create_subject', methods=['POST'])
@jwt_required()
@log_action("إضافة ", description="إضافة مادة جديدة")
def create_subject():
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify(message="Class name is required."), 400

    user_id = get_jwt_identity()
  
    user = User.query.get(user_id)

    if not user.user_role == 'school_admin':
        return jsonify(message="Only admin can create classes."), 403

    new_class = Subject(
        name=name,
        school_id=user.school_id,
        teacher_id=user.id
    )

    db.session.add(new_class)
    db.session.commit()

    return jsonify(message="Class created successfully", class_id=new_class.id), 201



@class_blueprint.route('/myClasses', methods=['GET'])
@jwt_required()
def get_my_classes():
    teacher_id = get_jwt_identity()
    teacher = Teacher.query.get(teacher_id)

    if not teacher:
        return jsonify(message={"Only teachers can view their classes ,يمكن للمعلمين فقط عرض فصولهم."}), 403

    # Retrieve only classes that belong to the teacher's school
    classes = Class.query.filter_by(school_id=teacher.school_id).all()

    class_list = [{"id": cls.id, "name": cls.name} for cls in classes]

    return jsonify(class_list), 200

@class_blueprint.route('/AllSchool', methods=['GET'])
@jwt_required()
def get_Schools():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Only admin can access all schools data
    if user.user_role != 'admin':
        return jsonify(message={"en": "Unauthorized to access this resource.", "ar": "غير مصرح لك بالوصول إلى هذا المورد."}, flag=1), 403
  
    Schools = School.query.all()
    SchoolList = [{
        "id": sls.id, 
        "name": sls.name, 
        "is_active": sls.is_active, 
        "address": sls.address, 
        "phone_number": sls.phone_number,
        "password": sls.password  # Include password for admin access
    } for sls in Schools]
 
    return jsonify(SchoolList), 200

@class_blueprint.route('/AllClass', methods=['GET'])
@jwt_required()
def get_Class():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Fetch all classes
    classes = Class.query.all()
    
    # Build the list with teacher information from the User table
    class_list = []
    for cls in classes:
        # Fetch the teacher's user record by teacher_id
        teacher = User.query.get(cls.teacher_id)
        teacher_name = teacher.fullName if teacher else "Unknown"  # Handle cases where the teacher might not exist

        class_list.append({
            "id": cls.id,
            "name": cls.name,
            "teacher_id": cls.teacher_id,
            "teacher_name": teacher_name
        })
    
    return jsonify(class_list), 200

@class_blueprint.route('/AllSubject', methods=['GET'])
@jwt_required()
def get_subjects():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message={"User not found. ,لم يتم العثور على المستخدم."}), 404

    # Fetch only subjects that belong to the user's school
    subjects = Subject.query.filter_by(school_id=user.school_id).all()

    # Build the list with teacher information
    subject_list = []
    for subject in subjects:
        teacher = User.query.get(subject.teacher_id)
        teacher_name = teacher.fullName if teacher else "Unknown"  # Handle missing teacher records

        subject_list.append({
            "id": subject.id,
            "name": subject.name,
            "teacher_id": subject.teacher_id,
            "teacher_name": teacher_name
        })

    return jsonify(subject_list), 200



@class_blueprint.route('/assign-students', methods=['POST'])
@jwt_required()
@log_action("إضافة ", description="إضافة طلاب في الفصول")
def assign_students():
    data = request.get_json()
    class_id = data.get('class_id')
    student_ids = data.get('student_ids')  # List of student IDs

    if not class_id or not student_ids:
        return jsonify(message="Class ID and student IDs are required."), 400

    teacher_id = get_jwt_identity()
    class_obj = Class.query.get(class_id)

    if not class_obj or class_obj.teacher_id != teacher_id:
        return jsonify(message="Unauthorized or class not found."), 403

    # Fetch students and add them to the class
    students = Student.query.filter(
        Student.id.in_(student_ids),
        Student.school_id == class_obj.school_id
    ).all()

    if not students:
        return jsonify(message="No valid students found."), 404

    class_obj.students.extend(students)
    db.session.commit()

    return jsonify(message="Students assigned to class"), 200

@class_blueprint.route('/students/<int:class_id>', methods=['GET'])
@jwt_required()
def get_class_students(class_id):
    teacher_id = get_jwt_identity()
    class_obj = Class.query.get(class_id)

    if not class_obj:
        return jsonify(message={"en": "Class not found.", "ar": "لم يتم العثور على الفصل."}), 404

    # Ensure that only active students are returned
    active_students = [student for student in class_obj.students if student.is_active]

    student_list = []
    for student in active_students:
        student_list.append({
            "id": student.id, 
            "fullName": student.fullName, 
            "phone_number": student.phone_number,
            "class_name": class_obj.name,
            "behavior_note": student.behavior_note
        })

    return jsonify(student_list), 200


@class_blueprint.route('/my-school-students', methods=['GET'])
@jwt_required()
def get_students_from_my_school():
    teacher_id = get_jwt_identity()
    teacher = Teacher.query.get(teacher_id)

    if not teacher:
        return jsonify(message="Only teachers can access this resource."), 403

    # Query students in the teacher's school who are not assigned to any class
    students = Student.query.filter(
        Student.school_id == teacher.school_id,
        ~Student.classes.any()  # Students with no associated classes
    ).all()

    # Prepare the student list for the response
    student_list = []
    for student in students:
        # Get the first class name for the student (assuming students are in one class)
        class_name = None
        if student.classes:
            class_name = student.classes[0].name
        
        student_list.append({
            "id": student.id, 
            "fullName": student.fullName, 
            "phone_number": student.phone_number,
            "class_name": class_name,
            "behavior_note": student.behavior_note
        })

    return jsonify(student_list), 200




@class_blueprint.route('/remove-students', methods=['POST'])
@jwt_required()
@log_action("حذف ", description="حذف طلاب من الفصول")
def remove_students():
    """
    Remove students from a class.
    Expected JSON payload:
    {
        "class_id": <int>,
        "student_ids": [<int>, <int>, ...]
    }
    """
    data = request.get_json()
    class_id = data.get('class_id')
    student_ids = data.get('student_ids')  # List of student IDs to remove

    # Validate required fields
    if not class_id or not student_ids:
        return jsonify(message="Class ID and student IDs are required."), 400

    # Get the authenticated teacher's ID
    teacher_id = get_jwt_identity()

    # Fetch the class and verify ownership
    class_obj = Class.query.get(class_id)
    if not class_obj:
        return jsonify(message="Class not found."), 404

    if class_obj.teacher_id != teacher_id:
        return jsonify(message="Unauthorized: You are not the teacher of this class."), 403

    # Fetch the students to be removed who are part of the class
    students_to_remove = Student.query.filter(
        Student.id.in_(student_ids),
        Student.school_id == class_obj.school_id,
        Class.students.any(id=Student.id)  # Ensures the student is part of the class
    ).all()

    if not students_to_remove:
        return jsonify(message="No valid students found to remove."), 404

    # Identify student IDs not part of the class
    class_student_ids = {student.id for student in class_obj.students}
    provided_student_ids = set(student_ids)
    found_student_ids = {student.id for student in students_to_remove}
    invalid_student_ids = provided_student_ids - found_student_ids

    # Remove the students from the class
    for student in students_to_remove:
        class_obj.students.remove(student)

    # Commit the changes to the database
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify(message="An error occurred while removing students.", error=str(e)), 500

    # Prepare the response
    response = {
        "message": "Students removed from class successfully.",
        "removed_student_ids": list(found_student_ids),
        "invalid_student_ids": list(invalid_student_ids)
    }

    return jsonify(response), 200





