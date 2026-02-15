# app/routes/user_routes.py

from flask import Blueprint, jsonify ,request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Student, Teacher, School,Class, Subject, student_classes, Driver
from app import db
from werkzeug.security import generate_password_hash
from io import StringIO
from app.logger import log_action
import pandas as pd
from flask_cors import CORS

user_blueprint = Blueprint('user_blueprint', __name__)
CORS(user_blueprint)

@user_blueprint.route('/my-school', methods=['GET'])
@jwt_required()
def get_users_of_my_school():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found."), 404

    # Check user role
    if user.user_role == 'teacher' or user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        # Retrieve the Teacher instance to get school_id
        teacher = Teacher.query.get(user_id)
        if not teacher or not user.school_id:
            return jsonify(message="User is not associated with a school."), 400
        school_id = user.school_id

        # Fetch all students and teachers in the school
        students = Student.query.filter_by(school_id=school_id).all()
        teachers = Teacher.query.filter_by(school_id=school_id).all()
        drivers = Driver.query.filter_by(school_id=school_id).all()

    elif user.user_role == 'admin':
        # Admin can fetch all users from all schools
        teachers = Teacher.query.filter_by(user_role='school_admin').all()
        students = []
        drivers = []

    else:
        # Users with insufficient permissions
        return jsonify(message="Access forbidden: insufficient permissions."), 403

    # Serialize the data
    user_list = [teacher.to_dict() for teacher in teachers] + [student.to_dict() for student in students] + [driver.to_dict() for driver in drivers]

    return jsonify(user_list ), 200

@user_blueprint.route('/my-school-Teachers', methods=['GET'])
@jwt_required()
def get_Teachers_of_my_school():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found."), 404

    # Check user role
    if user.user_role == 'teacher' or user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        # Retrieve the Teacher instance to get school_id
        teacher = Teacher.query.get(user_id)
        if not teacher or not user.school_id:
            return jsonify(message="User is not associated with a school."), 400
        school_id = user.school_id

        # Fetch all students and teachers in the school
        teachers = Teacher.query.filter_by(school_id=school_id).all()

    elif user.user_role == 'admin':
        # Admin can fetch all users from all schools
        teachers = Teacher.query.all()

    else:
        # Users with insufficient permissions
        return jsonify(message="Access forbidden: insufficient permissions."), 403

    # Serialize the data
    user_list = [teacher.to_dict() for teacher in teachers]

    return jsonify(user_list ), 200


@user_blueprint.route('/my-school-Students', methods=['GET'])
@jwt_required()
def get_Students_of_my_school():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found."), 404

    # Check user role and get school_id
    if user.user_role == 'teacher' or user.user_role == 'school_admin' or user.user_role == 'data_analyst':
        if not user.school_id:
            return jsonify(message="User is not associated with a school."), 400
        school_id = user.school_id

        # Optimized query with eager loading of classes
        students = db.session.query(Student, Class.name.label('class_name')).outerjoin(
            student_classes, Student.id == student_classes.c.student_id
        ).outerjoin(
            Class, student_classes.c.class_id == Class.id
        ).filter(
            Student.school_id == school_id
        ).order_by(Student.fullName.asc()).all()

    elif user.user_role == 'admin':
        # Admin can fetch all users from all schools with optimized query
        students = db.session.query(Student, Class.name.label('class_name')).outerjoin(
            student_classes, Student.id == student_classes.c.student_id
        ).outerjoin(
            Class, student_classes.c.class_id == Class.id
        ).order_by(Student.fullName.asc()).all()

    else:
        # Users with insufficient permissions
        return jsonify(message="Access forbidden: insufficient permissions."), 403

    # Serialize the data - no more N+1 queries
    user_list = []
    for student, class_name in students:
        user_list.append({
            "id": student.id,
            "username": student.username,
            "location": student.location,
            "fullName": student.fullName,
            "phone_number": student.phone_number,
            "is_active": student.is_active,
            "class_name": class_name,
            "behavior_note": student.behavior_note
        })

    return jsonify(user_list), 200


@user_blueprint.route('/update-student-behavior-note/<int:student_id>', methods=['PUT'])
@jwt_required()
def update_student_behavior_note(student_id):
    """Update behavior note for a specific student"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found."), 404

    # Check if user has permission to update student behavior notes
    if user.user_role not in ['teacher', 'school_admin', 'admin', 'data_analyst']:
        return jsonify(message="Access forbidden: insufficient permissions."), 403

    # Get the student
    student = Student.query.get(student_id)
    if not student:
        return jsonify(message="Student not found."), 404

    # Check if user has access to this student's school
    if user.user_role in ['teacher', 'school_admin', 'data_analyst']:
        if user.school_id != student.school_id:
            return jsonify(message="Access forbidden: cannot update student from different school."), 403

    # Get the behavior note from request
    data = request.get_json()
    if not data or 'behavior_note' not in data:
        return jsonify(message="Behavior note is required."), 400

    # Update the behavior note
    student.behavior_note = data['behavior_note']

    try:
        db.session.commit()
        return jsonify(message="Behavior note updated successfully."), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(message="Failed to update behavior note."), 500



def deactivate_school(school_id):
    """
    Set is_active to False for all related tables of the given school_id.
    """
    try:
        # Deactivate the school
        # school = School.query.get(school_id)
        # if not school:
        #     return {"message": "School not found"}, 404
        # school.is_active = False

        # Deactivate related students
        students = Student.query.filter_by(school_id=school_id).all()
        for student in students:
            student.is_active = False

        # Deactivate related teachers
        teachers = Teacher.query.filter_by(school_id=school_id).all()
        for teacher in teachers:
            teacher.is_active = False

        # Deactivate related classes
        classes = Class.query.filter_by(school_id=school_id).all()
        for class_obj in classes:
            class_obj.is_active = False

        # Deactivate related subjects
        subjects = Subject.query.filter_by(school_id=school_id).all()
        for subject in subjects:
            subject.is_active = False

        # Commit changes to the database
        db.session.commit()
        return {"message": "All related records have been deactivated."}, 200
    except Exception as e:
        db.session.rollback()
        return {"message": f"An error occurred: {str(e)}"}, 500


@user_blueprint.route('/deactivate_school/<int:school_id>', methods=['POST'])
@jwt_required()
@log_action("تعديل ", description="تعديل حالة المدرسة")
def deactivate_school_route(school_id):
    response, status_code = deactivate_school(school_id)
    return jsonify(response), status_code
