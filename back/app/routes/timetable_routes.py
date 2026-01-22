from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    Timetable, TimetableDay, TimetablePeriod, 
    TimetableTeacherMapping, TimetableSchedule, Teacher, User
)
from datetime import datetime
from flask_cors import CORS
from app.routes.notification_routes import create_notification
from app.services.notification_service import notify_teachers_timetable_change
timetable_bp = Blueprint('timetable', __name__)
CORS(timetable_bp)

@timetable_bp.route('/timetables', methods=['GET'])
@jwt_required()
def get_timetables():
    """Get all timetables for the user's school"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        if not current_user or not current_user.school_id:
            return jsonify({'error': 'User not associated with a school'}), 400
        
        timetables = Timetable.query.filter_by(school_id=current_user.school_id).order_by(Timetable.created_at.desc()).all()
        return jsonify([t.to_dict() for t in timetables]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>', methods=['GET'])
@jwt_required()
def get_timetable(timetable_id):
    """Get a specific timetable with all its data"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Build complete timetable data
        data = timetable.to_dict()
        data['days'] = [d.to_dict() for d in timetable.days]
        data['periods'] = [p.to_dict() for p in timetable.periods]
        data['schedules'] = [s.to_dict() for s in timetable.schedules]
        data['teacher_mappings'] = [tm.to_dict() for tm in timetable.teacher_mappings]
        
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables', methods=['POST'])
@jwt_required()
def create_timetable():
    """Create a new timetable from XML data"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Timetable name is required'}), 400
        
        if not data.get('days') or not data.get('periods') or not data.get('schedules'):
            return jsonify({'error': 'Incomplete timetable data'}), 400
        
        # Create main timetable
        timetable = Timetable(
            name=data['name'],
            school_id=current_user.school_id,
            user_id=current_user.id,
            xml_data=data.get('xml_data'),
            is_active=True
        )
        db.session.add(timetable)
        db.session.flush()  # Get timetable ID
        
        # Create days
        for day_data in data['days']:
            day = TimetableDay(
                timetable_id=timetable.id,
                day_id=day_data['id'],
                name=day_data['name'],
                short_name=day_data.get('short')
            )
            db.session.add(day)
        
        # Create periods
        for period_data in data['periods']:
            period = TimetablePeriod(
                timetable_id=timetable.id,
                period_id=period_data['id'],
                period_number=int(period_data['id']),
                start_time=period_data['startTime'],
                end_time=period_data['endTime']
            )
            db.session.add(period)
        
        # Create teacher mappings
        teachers_data = data.get('teachers', [])
        for teacher_data in teachers_data:
            mapping = TimetableTeacherMapping(
                timetable_id=timetable.id,
                xml_teacher_id=teacher_data['id'],
                xml_teacher_name=teacher_data['name'],
                teacher_id=None  # Will be mapped later
            )
            db.session.add(mapping)
        
        # Create schedules
        for schedule_data in data['schedules']:
            schedule = TimetableSchedule(
                timetable_id=timetable.id,
                class_name=schedule_data.get('className', ''),
                class_xml_id=schedule_data.get('classId', ''),
                subject_name=schedule_data.get('subjectName', ''),
                subject_xml_id=schedule_data.get('subjectGradeId', ''),
                teacher_xml_id=schedule_data.get('teacherId'),
                classroom_name=schedule_data.get('classroomName'),
                day_xml_id=schedule_data.get('dayId', ''),
                period_xml_id=schedule_data.get('period', '')
            )
            db.session.add(schedule)
        
        db.session.commit()
        
        # Create notification for new timetable - notify all teachers and analysts
        try:
            timetable_data = {
                'id': timetable.id,
                'timetable_name': data['name'],
                'change_description': f"تم رفع جدول دراسي جديد"
            }
            
            # Notify all teachers and analysts about the new timetable
            notify_teachers_timetable_change(
                school_id=current_user.school_id,
                timetable_data=timetable_data,
                created_by=user_id,
                affected_teacher_ids=None  # None means notify all teachers
            )
        except Exception as e:
            print(f"Error creating timetable notification: {str(e)}")
        
        return jsonify({
            'message': 'Timetable created successfully',
            'timetable_id': timetable.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>', methods=['PUT'])
@jwt_required()
def update_timetable(timetable_id):
    """Update an existing timetable"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update basic info
        if 'name' in data:
            timetable.name = data['name']
        if 'is_active' in data:
            timetable.is_active = data['is_active']
        
        timetable.updated_at = datetime.utcnow()
        
        # If full data update, delete and recreate
        if 'days' in data and 'periods' in data and 'schedules' in data:
            # Delete existing related data
            TimetableDay.query.filter_by(timetable_id=timetable_id).delete()
            TimetablePeriod.query.filter_by(timetable_id=timetable_id).delete()
            TimetableSchedule.query.filter_by(timetable_id=timetable_id).delete()
            TimetableTeacherMapping.query.filter_by(timetable_id=timetable_id).delete()
            
            # Create days
            for day_data in data['days']:
                day = TimetableDay(
                    timetable_id=timetable.id,
                    day_id=day_data['id'],
                    name=day_data['name'],
                    short_name=day_data.get('short')
                )
                db.session.add(day)
            
            # Create periods
            for period_data in data['periods']:
                period = TimetablePeriod(
                    timetable_id=timetable.id,
                    period_id=period_data['id'],
                    period_number=int(period_data['id']),
                    start_time=period_data['startTime'],
                    end_time=period_data['endTime']
                )
                db.session.add(period)
            
            # Create teacher mappings
            teachers_data = data.get('teachers', [])
            for teacher_data in teachers_data:
                mapping = TimetableTeacherMapping(
                    timetable_id=timetable.id,
                    xml_teacher_id=teacher_data['id'],
                    xml_teacher_name=teacher_data['name'],
                    teacher_id=None
                )
                db.session.add(mapping)
            
            # Create schedules
            for schedule_data in data['schedules']:
                schedule = TimetableSchedule(
                    timetable_id=timetable.id,
                    class_name=schedule_data.get('className', ''),
                    class_xml_id=schedule_data.get('classId', ''),
                    subject_name=schedule_data.get('subjectName', ''),
                    subject_xml_id=schedule_data.get('subjectGradeId', ''),
                    teacher_xml_id=schedule_data.get('teacherId'),
                    classroom_name=schedule_data.get('classroomName'),
                    day_xml_id=schedule_data.get('dayId', ''),
                    period_xml_id=schedule_data.get('period', '')
                )
                db.session.add(schedule)
        
        db.session.commit()
        
        # Notify teachers about timetable update
        try:
            timetable_data = {
                'id': timetable.id,
                'timetable_name': timetable.name,
                'change_description': 'تم تحديث الجدول الدراسي'
            }
            
            notify_teachers_timetable_change(
                school_id=current_user.school_id,
                timetable_data=timetable_data,
                created_by=user_id,
                affected_teacher_ids=None
            )
        except Exception as e:
            print(f"Error creating timetable update notification: {str(e)}")
        
        return jsonify({'message': 'Timetable updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>', methods=['DELETE'])
@jwt_required()
def delete_timetable(timetable_id):
    """Delete a timetable"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(timetable)
        db.session.commit()
        
        return jsonify({'message': 'Timetable deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>/teacher-mappings', methods=['GET'])
@jwt_required()
def get_teacher_mappings(timetable_id):
    """Get teacher mappings for a timetable along with available school teachers"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get mappings
        mappings = TimetableTeacherMapping.query.filter_by(timetable_id=timetable_id).all()
        
        # Get school teachers
        teachers = Teacher.query.filter_by(school_id=current_user.school_id, is_active=True).all()
        
        return jsonify({
            'mappings': [m.to_dict() for m in mappings],
            'teachers': [t.to_dict() for t in teachers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>/teacher-mappings', methods=['PUT'])
@jwt_required()
def update_teacher_mappings(timetable_id):
    """Update teacher mappings for a timetable"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        mappings_data = data.get('mappings', [])
        
        for mapping_data in mappings_data:
            xml_teacher_id = mapping_data.get('xml_teacher_id')
            teacher_id = mapping_data.get('teacher_id')
            
            mapping = TimetableTeacherMapping.query.filter_by(
                timetable_id=timetable_id,
                xml_teacher_id=xml_teacher_id
            ).first()
            
            if mapping:
                mapping.teacher_id = teacher_id
        
        timetable.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Teacher mappings updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/timetables/<int:timetable_id>/activate', methods=['POST'])
@jwt_required()
def activate_timetable(timetable_id):
    """Activate a timetable and deactivate others"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({'error': 'Timetable not found'}), 404
        
        if timetable.school_id != current_user.school_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Deactivate all other timetables for this school
        Timetable.query.filter_by(school_id=current_user.school_id).update({'is_active': False})
        
        # Activate this timetable
        timetable.is_active = True
        timetable.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Timetable activated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@timetable_bp.route('/teacher/my-timetable', methods=['GET'])
@jwt_required()
def get_teacher_timetable():
    """Get timetable for the current teacher"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        # Check if user is a teacher
        teacher = Teacher.query.get(current_user.id)
        if not teacher:
            return jsonify({'error': 'User is not a teacher'}), 403
        
        # Get active timetable for the school
        active_timetable = Timetable.query.filter_by(
            school_id=current_user.school_id,
            is_active=True
        ).first()
        
        if not active_timetable:
            return jsonify({'timetable': None, 'message': 'No active timetable found'}), 200
        
        # Get teacher mapping
        teacher_mapping = TimetableTeacherMapping.query.filter_by(
            timetable_id=active_timetable.id,
            teacher_id=current_user.id
        ).first()
        
        if not teacher_mapping:
            return jsonify({'timetable': None, 'message': 'Teacher not mapped in timetable'}), 200
        
        # Get all schedules for this teacher (using xml_teacher_id)
        schedules = TimetableSchedule.query.filter_by(
            timetable_id=active_timetable.id,
            teacher_xml_id=teacher_mapping.xml_teacher_id
        ).all()
        
        # Get days and periods
        days = TimetableDay.query.filter_by(timetable_id=active_timetable.id).order_by(TimetableDay.id).all()
        periods = TimetablePeriod.query.filter_by(timetable_id=active_timetable.id).order_by(TimetablePeriod.period_number).all()
        
        # Build timetable structure
        timetable_data = {
            'timetable_id': active_timetable.id,
            'timetable_name': active_timetable.name,
            'days': [{'id': d.day_id, 'name': d.name, 'short': d.short_name} for d in days],
            'periods': [{'id': p.period_id, 'number': p.period_number, 'startTime': p.start_time, 'endTime': p.end_time} for p in periods],
            'schedules': []
        }
        
        # Build schedule data
        for schedule in schedules:
            timetable_data['schedules'].append({
                'classId': schedule.class_xml_id,
                'className': schedule.class_name,
                'subjectId': schedule.subject_xml_id,
                'subjectName': schedule.subject_name,
                'classroomName': schedule.classroom_name,
                'dayId': schedule.day_xml_id,
                'period': schedule.period_xml_id
            })
        
        return jsonify({'timetable': timetable_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
