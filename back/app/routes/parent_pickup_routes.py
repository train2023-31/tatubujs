# app/routes/parent_pickup_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from app.models import User, Student, ParentPickup, School
from app import db
from app.config import get_oman_time
from datetime import datetime, date
from sqlalchemy import and_
from app.logger import log_action
import logging
from flask_cors import CORS
logger = logging.getLogger(__name__)

parent_pickup_bp = Blueprint('parent_pickup', __name__)

CORS(parent_pickup_bp, supports_credentials=True)

@parent_pickup_bp.route('/parent-login', methods=['POST'])
@log_action("تسجيل دخول ولي أمر", description="تسجيل دخول ولي أمر عبر QR")
def parent_login():
    """
    Parent login by scanning student QR code and verifying with phone number
    """
    try:
        from app.qr_payload import decode_student_qr_payload
        data = request.get_json()
        scanned = data.get('student_username')
        student_username = decode_student_qr_payload(scanned) if scanned else None
        parent_phone = data.get('parent_phone')
        
        if not student_username or not parent_phone:
            return jsonify(message="Student username and parent phone are required."), 400
        
        # Find student by username
        student = Student.query.filter_by(username=student_username).first()
        
        if not student:
            return jsonify(message="الطالب غير موجود. Student not found."), 404
        
        # Verify parent phone matches student's phone
        if not student.phone_number or student.phone_number != parent_phone:
            return jsonify(message="رقم الهاتف غير صحيح. Phone number does not match."), 401
        
        # Check if student is active
        if not student.is_active:
            return jsonify(message="حساب الطالب غير مفعل. Student account is inactive."), 403
        
        # Create access token for parent (identity must be string per JWT spec)
        access_token = create_access_token(identity=str(student.id))
        
        return jsonify({
            'access_token': access_token,
            'student': {
                'id': student.id,
                'username': student.username,
                'fullName': student.fullName,
                'school_id': student.school_id
            },
            'message': 'تم تسجيل الدخول بنجاح'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in parent_login: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/request-pickup', methods=['POST'])
@jwt_required()
@log_action("طلب استلام طالب", description="ولي أمر يطلب استلام طالبه")
def request_pickup():
    """
    Parent requests to pick up their student
    """
    try:
        student_id = int(get_jwt_identity())
        student = Student.query.get(student_id)
        
        if not student:
            return jsonify(message="Student not found."), 404
        
        current_date = get_oman_time().date()
        current_time = get_oman_time()
        
        # Limit: max 3 completed pickups per day
        MAX_PICKUPS_PER_DAY = 3
        today_completed_count = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date,
                ParentPickup.status == 'completed'
            )
        ).count()
        
        if today_completed_count >= MAX_PICKUPS_PER_DAY:
            return jsonify(
                message="تم الوصول للحد الأقصى (3 طلبات استلام في اليوم). Maximum 3 pickups per day.",
                today_completed_count=today_completed_count,
                max_per_day=MAX_PICKUPS_PER_DAY
            ), 400
        
        # Check if there's already a pending or confirmed request today
        existing_request = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date,
                ParentPickup.status.in_(['pending', 'confirmed'])
            )
        ).first()
        
        if existing_request:
            return jsonify(
                message="يوجد طلب استلام سابق لليوم. A pickup request already exists for today.",
                pickup=existing_request.to_dict()
            ), 400
        
        # Create new pickup request
        new_pickup = ParentPickup(
            student_id=student_id,
            school_id=student.school_id,
            parent_phone=student.phone_number,
            status='pending',
            request_time=current_time,
            pickup_date=current_date
        )
        
        db.session.add(new_pickup)
        db.session.commit()
        
        return jsonify(
            message="تم إرسال طلب الاستلام بنجاح. Pickup request submitted successfully.",
            pickup=new_pickup.to_dict()
        ), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in request_pickup: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/confirm-pickup', methods=['POST'])
@jwt_required()
@log_action("تأكيد استلام طالب", description="ولي أمر يؤكد استلام طالبه")
def confirm_pickup():
    """
    Parent confirms they are at school ready to pick up student
    """
    try:
        student_id = int(get_jwt_identity())
        student = Student.query.get(student_id)
        
        if not student:
            return jsonify(message="Student not found."), 404
        
        current_date = get_oman_time().date()
        current_time = get_oman_time()
        
        # Find pending request for today
        pickup_request = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date,
                ParentPickup.status == 'pending'
            )
        ).first()
        
        if not pickup_request:
            return jsonify(message="لا يوجد طلب استلام للتأكيد. No pending pickup request found."), 404
        
        # Update status to confirmed
        pickup_request.status = 'confirmed'
        pickup_request.confirmation_time = current_time
        
        db.session.commit()
        
        return jsonify(
            message="تم تأكيد وصولك. سيتم إخطار المدرسة. Confirmation successful. School will be notified.",
            pickup=pickup_request.to_dict()
        ), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in confirm_pickup: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/complete-pickup', methods=['POST'])
@jwt_required()
@log_action("إتمام استلام طالب", description="ولي أمر يؤكد استلامه للطالب")
def complete_pickup():
    """
    Parent confirms they have picked up the student and are leaving
    """
    try:
        student_id = int(get_jwt_identity())
        student = Student.query.get(student_id)
        
        if not student:
            return jsonify(message="Student not found."), 404
        
        current_date = get_oman_time().date()
        current_time = get_oman_time()
        
        # Find confirmed request for today
        pickup_request = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date,
                ParentPickup.status == 'confirmed'
            )
        ).first()
        
        if not pickup_request:
            return jsonify(message="لا يوجد طلب مؤكد للإكمال. No confirmed pickup request found."), 404
        
        # Update status to completed
        pickup_request.status = 'completed'
        pickup_request.completed_time = current_time
        
        db.session.commit()
        
        return jsonify(
            message="تم تأكيد استلام الطالب بنجاح. Pickup completed successfully.",
            pickup=pickup_request.to_dict()
        ), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in complete_pickup: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/my-pickup-status', methods=['GET'])
@jwt_required()
def get_my_pickup_status():
    """
    Get parent's pickup request status for today.
    Returns the latest request (pending/confirmed in progress, or last completed).
    Also returns today_completed_count for daily limit (max 3).
    """
    try:
        student_id = int(get_jwt_identity())
        current_date = get_oman_time().date()
        
        # Count completed pickups today (for 3-per-day limit)
        today_completed_count = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date,
                ParentPickup.status == 'completed'
            )
        ).count()
        
        # Latest request today: prefer pending/confirmed so parent sees current flow
        pickup_request = ParentPickup.query.filter(
            and_(
                ParentPickup.student_id == student_id,
                ParentPickup.pickup_date == current_date
            )
        ).order_by(ParentPickup.request_time.desc()).first()
        
        if not pickup_request:
            return jsonify(pickup=None, today_completed_count=today_completed_count), 200
        
        return jsonify(
            pickup=pickup_request.to_dict(),
            today_completed_count=today_completed_count
        ), 200
        
    except Exception as e:
        logger.error(f"Error in get_my_pickup_status: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/confirmed-pickups', methods=['GET'])
def get_confirmed_pickups():
    """
    Get all confirmed pickups for TV display (no authentication required)
    Can be filtered by school_id
    """
    try:
        school_id = request.args.get('school_id', type=int)
        current_date = get_oman_time().date()
        
        query = ParentPickup.query.filter(
            and_(
                ParentPickup.pickup_date == current_date,
                ParentPickup.status == 'confirmed'
            )
        )
        
        if school_id:
            query = query.filter(ParentPickup.school_id == school_id)
        
        pickups = query.order_by(ParentPickup.confirmation_time.desc()).all()
        
        return jsonify(pickups=[pickup.to_dict() for pickup in pickups]), 200
        
    except Exception as e:
        logger.error(f"Error in get_confirmed_pickups: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/display-pickups', methods=['GET'])
@jwt_required()
def get_display_pickups():
    """
    Get pickup requests for the logged-in user's school only (secure).
    Requires login; school_id from JWT (User or Student) — no query param.
    """
    try:
        identity = get_jwt_identity()
        try:
            uid = int(identity)
        except (TypeError, ValueError):
            return jsonify(message="Unauthorized."), 401

        school_id = None
        user = User.query.get(uid)
        if user and getattr(user, 'school_id', None) is not None:
            school_id = user.school_id
        if school_id is None:
            student = Student.query.get(uid)
            if student and getattr(student, 'school_id', None) is not None:
                school_id = student.school_id
        if not school_id:
            return jsonify(
                message="لا توجد مدرسة مرتبطة بحسابك.",
                message_en="No school linked to your account."
            ), 403

        current_date = get_oman_time().date()
        query = ParentPickup.query.filter(
            ParentPickup.pickup_date == current_date,
            ParentPickup.school_id == school_id
        )
        pickups = query.all()
        
        # Priority order: confirmed first (oldest first), then pending (oldest first), then completed (newest first)
        def sort_key(p):
            dt = get_oman_time()
            if p.status == 'confirmed':
                t = p.confirmation_time or dt
                t = t.replace(tzinfo=None) if hasattr(t, 'replace') and getattr(t, 'tzinfo', None) else t
                return (0, t)
            if p.status == 'pending':
                t = p.request_time or dt
                t = t.replace(tzinfo=None) if hasattr(t, 'replace') and getattr(t, 'tzinfo', None) else t
                return (1, t)
            # completed: newest first
            t = p.completed_time or dt
            t = t.replace(tzinfo=None) if hasattr(t, 'replace') and getattr(t, 'tzinfo', None) else t
            return (2, t)
        
        pickups_sorted = sorted(pickups, key=sort_key)
        # Reverse completed segment so newest first
        out = []
        completed_list = [p for p in pickups_sorted if p.status == 'completed']
        others = [p for p in pickups_sorted if p.status != 'completed']
        for p in others:
            out.append(p)
        for p in reversed(completed_list):
            out.append(p)
        pickups_sorted = out
        
        school = School.query.get(school_id)
        school_name = school.name if school else None

        return jsonify(
            pickups=[p.to_dict() for p in pickups_sorted],
            school_name=school_name
        ), 200
        
    except Exception as e:
        logger.error(f"Error in get_display_pickups: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/all-pickups', methods=['GET'])
@jwt_required()
def get_all_pickups():
    """
    Get all pickup requests (for school admins)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_role not in ['admin', 'school_admin', 'data_analyst']:
            return jsonify(message="Unauthorized."), 403
        
        # Get filter parameters
        pickup_date = request.args.get('date')
        status = request.args.get('status')
        
        query = ParentPickup.query
        
        # Filter by school for non-admin users
        if user.user_role != 'admin':
            query = query.filter(ParentPickup.school_id == user.school_id)
        
        # Apply date filter
        if pickup_date:
            try:
                filter_date = datetime.strptime(pickup_date, '%Y-%m-%d').date()
                query = query.filter(ParentPickup.pickup_date == filter_date)
            except ValueError:
                return jsonify(message="Invalid date format. Use YYYY-MM-DD."), 400
        else:
            # Default to today
            query = query.filter(ParentPickup.pickup_date == get_oman_time().date())
        
        # Apply status filter
        if status:
            query = query.filter(ParentPickup.status == status)
        
        pickups = query.order_by(ParentPickup.request_time.desc()).all()
        
        return jsonify(pickups=[pickup.to_dict() for pickup in pickups]), 200
        
    except Exception as e:
        logger.error(f"Error in get_all_pickups: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500


@parent_pickup_bp.route('/cancel-pickup', methods=['POST'])
@jwt_required()
@log_action("إلغاء طلب استلام", description="ولي أمر يلغي طلب استلام طالبه")
def cancel_pickup():
    """
    Parent or admin cancels a pickup request
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        data = request.get_json()
        pickup_id = data.get('pickup_id')
        
        if not pickup_id:
            return jsonify(message="Pickup ID is required."), 400
        
        pickup_request = ParentPickup.query.get(pickup_id)
        
        if not pickup_request:
            return jsonify(message="Pickup request not found."), 404
        
        # Check authorization
        is_parent = isinstance(user, Student) and user.id == pickup_request.student_id
        is_admin = user.user_role in ['admin', 'school_admin', 'data_analyst']
        
        if not (is_parent or is_admin):
            return jsonify(message="Unauthorized."), 403
        
        # Delete the pickup request
        db.session.delete(pickup_request)
        db.session.commit()
        
        return jsonify(message="تم إلغاء طلب الاستلام. Pickup request cancelled."), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in cancel_pickup: {str(e)}")
        return jsonify(message=f"حدث خطأ: {str(e)}"), 500
