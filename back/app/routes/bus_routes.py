from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Bus, BusScan, Student, User, School, bus_students, Driver
from app import db
from datetime import datetime, date, timezone
from app.config import get_oman_time
from app.logger import log_action
from sqlalchemy import func, and_, or_
from flask_cors import CORS

bus_blueprint = Blueprint('bus_blueprint', __name__)

CORS(bus_blueprint)

# =============== Driver Info ===============

@bus_blueprint.route('/driver/my-bus', methods=['GET'])
@jwt_required()
def get_driver_bus():
    """Get the bus assigned to the logged-in driver"""
    user_id = get_jwt_identity()
    driver = Driver.query.get(user_id)
    
    if not driver:
        return jsonify(message="User is not a driver"), 403
    
    if not driver.bus:
        return jsonify(message="No bus assigned to this driver", has_bus=False), 404
    
    return jsonify({
        'has_bus': True,
        'bus': driver.bus.to_dict()
    }), 200


# =============== Bus Management ===============

@bus_blueprint.route('/buses', methods=['GET'])
@jwt_required()
def get_buses():
    """Get all buses for the school"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.school_id:
        return jsonify(message="User not associated with a school"), 400
    
    # Admin can see all buses, school_admin sees only their school's buses
    if user.user_role == 'admin':
        buses = Bus.query.all()
    else:
        buses = Bus.query.filter_by(school_id=user.school_id).all()
    
    return jsonify([bus.to_dict() for bus in buses]), 200


@bus_blueprint.route('/buses/<int:bus_id>', methods=['GET'])
@jwt_required()
def get_bus(bus_id):
    """Get single bus details"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    return jsonify(bus.to_dict()), 200


@bus_blueprint.route('/buses', methods=['POST'])
@jwt_required()
@log_action("إضافة", description="إضافة حافلة جديدة")
def create_bus():
    """Create a new bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify(message="Permission denied"), 403
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('bus_number') or not data.get('bus_name'):
        return jsonify(message="Bus number and name are required"), 400
    
    school_id = data.get('school_id') if user.user_role == 'admin' else user.school_id
    
    new_bus = Bus(
        bus_number=data['bus_number'],
        bus_name=data['bus_name'],
        school_id=school_id,
        driver_id=data.get('driver_id'),
        capacity=data.get('capacity', 50),
        plate_number=data.get('plate_number'),
        location=data.get('location'),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(new_bus)
    db.session.commit()
    
    return jsonify(message="Bus created successfully", bus=new_bus.to_dict()), 201


@bus_blueprint.route('/buses/<int:bus_id>', methods=['PUT'])
@jwt_required()
@log_action("تعديل", description="تعديل بيانات حافلة")
def update_bus(bus_id):
    """Update bus information"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify(message="Permission denied"), 403
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    data = request.get_json()
    
    # Update fields
    if 'bus_number' in data:
        bus.bus_number = data['bus_number']
    if 'bus_name' in data:
        bus.bus_name = data['bus_name']
    if 'driver_id' in data:
        bus.driver_id = data['driver_id']
    if 'capacity' in data:
        bus.capacity = data['capacity']
    if 'plate_number' in data:
        bus.plate_number = data['plate_number']
    if 'location' in data:
        bus.location = data['location']
    if 'is_active' in data:
        bus.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify(message="Bus updated successfully", bus=bus.to_dict()), 200


@bus_blueprint.route('/buses/<int:bus_id>', methods=['DELETE'])
@jwt_required()
@log_action("حذف", description="حذف حافلة")
def delete_bus(bus_id):
    """Delete a bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify(message="Permission denied"), 403
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    db.session.delete(bus)
    db.session.commit()
    
    return jsonify(message="Bus deleted successfully"), 200


# =============== Student-Bus Assignment ===============

@bus_blueprint.route('/buses/<int:bus_id>/students', methods=['GET'])
@jwt_required()
def get_bus_students(bus_id):
    """Get all students assigned to a bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    students = bus.students
    students_list = []
    for student in students:
        student_dict = student.to_dict()
        student_dict['classes'] = [cls.name for cls in student.classes]
        students_list.append(student_dict)
    
    return jsonify(students_list), 200


@bus_blueprint.route('/buses/<int:bus_id>/assign-students', methods=['POST'])
@jwt_required()
@log_action("تعيين", description="تعيين طلاب للحافلة")
def assign_students_to_bus(bus_id):
    """Assign multiple students to a bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify(message="Permission denied"), 403
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    data = request.get_json()
    student_ids = data.get('student_ids', [])
    
    if not student_ids:
        return jsonify(message="No students provided"), 400
    
    # Check capacity
    current_count = len(bus.students)
    if current_count + len(student_ids) > bus.capacity:
        return jsonify(message=f"Bus capacity exceeded. Current: {current_count}, Capacity: {bus.capacity}"), 400
    
    assigned_count = 0
    already_assigned = 0
    
    for student_id in student_ids:
        student = Student.query.get(student_id)
        if student and student.school_id == bus.school_id:
            if student not in bus.students:
                bus.students.append(student)
                assigned_count += 1
            else:
                already_assigned += 1
    
    db.session.commit()
    
    return jsonify(
        message=f"Assigned {assigned_count} students. {already_assigned} already assigned.",
        assigned_count=assigned_count,
        already_assigned=already_assigned
    ), 200


@bus_blueprint.route('/buses/<int:bus_id>/remove-students', methods=['POST'])
@jwt_required()
@log_action("إزالة", description="إزالة طلاب من الحافلة")
def remove_students_from_bus(bus_id):
    """Remove students from a bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.user_role not in ['admin', 'school_admin']:
        return jsonify(message="Permission denied"), 403
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    data = request.get_json()
    student_ids = data.get('student_ids', [])
    
    if not student_ids:
        return jsonify(message="No students provided"), 400
    
    removed_count = 0
    
    for student_id in student_ids:
        student = Student.query.get(student_id)
        if student and student in bus.students:
            bus.students.remove(student)
            removed_count += 1
    
    db.session.commit()
    
    return jsonify(message=f"Removed {removed_count} students from bus", removed_count=removed_count), 200


# =============== Bus Scanning (QR Code) ===============

@bus_blueprint.route('/scan', methods=['POST'])
@jwt_required()
@log_action("مسح QR", description="مسح كود الطالب للحافلة")
def scan_student():
    """Scan student QR code (board or exit)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    data = request.get_json()
    
    # Get student by username (from QR code)
    username = data.get('username')
    bus_id = data.get('bus_id')
    scan_type = data.get('scan_type')  # 'board' or 'exit'
    location = data.get('location')
    notes = data.get('notes')
    
    if not username or not bus_id or not scan_type:
        return jsonify(message="Missing required fields"), 400
    
    if scan_type not in ['board', 'exit']:
        return jsonify(message="Invalid scan type. Must be 'board' or 'exit'"), 400
    
    # Find student
    student = Student.query.filter_by(username=username).first()
    if not student:
        return jsonify(message="Student not found"), 404
    
    # Find bus
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check if student is assigned to this bus
    if student not in bus.students:
        return jsonify(message="Student is not assigned to this bus", warning=True), 400
    
    # Get current Oman MCT time (stored directly as Oman local time)
    oman_now = get_oman_time()
    
    # Check for duplicate scans (prevent scanning twice in short time)
    last_scan = BusScan.query.filter_by(
        student_id=student.id,
        bus_id=bus_id
    ).order_by(BusScan.scan_time.desc()).first()
    
    if last_scan:
        # Calculate time difference (both are naive datetimes in Oman time)
        time_diff = (oman_now - last_scan.scan_time).total_seconds()
        # Prevent duplicate scans within 30 seconds
        if time_diff < 30 and last_scan.scan_type == scan_type:
            return jsonify(
                message=f"Student was already scanned as '{scan_type}' {int(time_diff)} seconds ago",
                duplicate=True,
                last_scan=last_scan.to_dict()
            ), 400
    
    # Create scan record with Oman MCT time (stored directly as Oman local time)
    scan = BusScan(
        student_id=student.id,
        bus_id=bus_id,
        scan_type=scan_type,
        scan_time=oman_now,
        location=location,
        scanned_by=user_id,
        notes=notes
    )
    
    db.session.add(scan)
    db.session.commit()
    
    # Return student info for confirmation
    return jsonify(
        message=f"Student {'boarded' if scan_type == 'board' else 'exited'} successfully",
        scan=scan.to_dict(),
        student={
            'id': student.id,
            'fullName': student.fullName,
            'username': student.username,
            'phone_number': student.phone_number
        }
    ), 201


@bus_blueprint.route('/scans', methods=['GET'])
@jwt_required()
def get_scans():
    """Get scan history with filters"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Query parameters
    bus_id = request.args.get('bus_id', type=int)
    student_id = request.args.get('student_id', type=int)
    scan_date = request.args.get('date')  # Format: YYYY-MM-DD
    scan_type = request.args.get('scan_type')
    
    query = BusScan.query
    
    # Filter by school
    if user.user_role != 'admin':
        query = query.join(Bus).filter(Bus.school_id == user.school_id)
    
    # Apply filters
    if bus_id:
        query = query.filter(BusScan.bus_id == bus_id)
    
    if student_id:
        query = query.filter(BusScan.student_id == student_id)
    
    if scan_date:
        try:
            target_date = datetime.strptime(scan_date, '%Y-%m-%d').date()
            query = query.filter(func.date(BusScan.scan_time) == target_date)
        except ValueError:
            return jsonify(message="Invalid date format. Use YYYY-MM-DD"), 400
    
    if scan_type:
        query = query.filter(BusScan.scan_type == scan_type)
    
    scans = query.order_by(BusScan.scan_time.desc()).limit(1000).all()
    
    return jsonify([scan.to_dict() for scan in scans]), 200


@bus_blueprint.route('/students/<int:student_id>/bus-status', methods=['GET'])
@jwt_required()
def get_student_bus_status(student_id):
    """Get current bus status for a student (are they on the bus?)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    student = Student.query.get(student_id)
    if not student:
        return jsonify(message="Student not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and student.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    # Get today's scans
    today = date.today()
    scans_today = BusScan.query.filter(
        BusScan.student_id == student_id,
        func.date(BusScan.scan_time) == today
    ).order_by(BusScan.scan_time.desc()).all()
    
    # Determine current status
    on_bus = False
    current_bus = None
    last_scan = None
    
    if scans_today:
        last_scan = scans_today[0]
        if last_scan.scan_type == 'board':
            on_bus = True
            current_bus = last_scan.bus
    
    return jsonify({
        'student_id': student_id,
        'student_name': student.fullName,
        'on_bus': on_bus,
        'current_bus': current_bus.to_dict() if current_bus else None,
        'last_scan': last_scan.to_dict() if last_scan else None,
        'scans_today': [scan.to_dict() for scan in scans_today]
    }), 200


@bus_blueprint.route('/buses/<int:bus_id>/current-students', methods=['GET'])
@jwt_required()
def get_current_students_on_bus(bus_id):
    """Get list of students currently on the bus"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    bus = Bus.query.get(bus_id)
    if not bus:
        return jsonify(message="Bus not found"), 404
    
    # Check permission
    if user.user_role != 'admin' and bus.school_id != user.school_id:
        return jsonify(message="Access forbidden"), 403
    
    # Get today's scans
    today = date.today()
    
    # Get all students assigned to this bus
    assigned_students = bus.students
    
    current_students = []
    
    for student in assigned_students:
        # Get last scan for this student today
        last_scan = BusScan.query.filter(
            BusScan.student_id == student.id,
            BusScan.bus_id == bus_id,
            func.date(BusScan.scan_time) == today
        ).order_by(BusScan.scan_time.desc()).first()
        
        # If last scan is 'board', student is on bus
        if last_scan and last_scan.scan_type == 'board':
            student_dict = student.to_dict()
            student_dict['board_time'] = last_scan.scan_time.isoformat()
            current_students.append(student_dict)
    
    return jsonify({
        'bus_id': bus_id,
        'bus_number': bus.bus_number,
        'current_count': len(current_students),
        'capacity': bus.capacity,
        'students': current_students
    }), 200


# =============== Reports ===============

@bus_blueprint.route('/reports/daily', methods=['GET'])
@jwt_required()
def get_daily_bus_report():
    """Get daily bus attendance report"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Query parameters
    report_date = request.args.get('date')  # Format: YYYY-MM-DD
    bus_id = request.args.get('bus_id', type=int)
    
    if not report_date:
        report_date = date.today().isoformat()
    
    try:
        target_date = datetime.strptime(report_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify(message="Invalid date format. Use YYYY-MM-DD"), 400
    
    # Get buses
    if user.user_role == 'admin':
        buses_query = Bus.query
    else:
        buses_query = Bus.query.filter_by(school_id=user.school_id)
    
    if bus_id:
        buses_query = buses_query.filter_by(id=bus_id)
    
    buses = buses_query.all()
    
    report = []
    
    for bus in buses:
        # Get scans for this bus on target date
        scans = BusScan.query.filter(
            BusScan.bus_id == bus.id,
            func.date(BusScan.scan_time) == target_date
        ).all()
        
        board_count = sum(1 for scan in scans if scan.scan_type == 'board')
        exit_count = sum(1 for scan in scans if scan.scan_type == 'exit')
        
        # Get assigned students count
        assigned_count = len(bus.students)
        
        report.append({
            'bus': bus.to_dict(),
            'date': report_date,
            'assigned_students': assigned_count,
            'boarded_count': board_count,
            'exited_count': exit_count,
            'currently_on_bus': board_count - exit_count,
            'scans': [scan.to_dict() for scan in scans]
        })
    
    return jsonify(report), 200

