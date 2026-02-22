from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    Notification, NotificationRead, NotificationDeleted, PushSubscription, 
    NotificationPreference, User, Student, Teacher, School
)
from app.config import get_oman_time, Config
from datetime import datetime, timedelta
import json
from sqlalchemy import or_, and_
import threading
from flask_cors import CORS

notification_blueprint = Blueprint('notification_blueprint', __name__, url_prefix='/api/notifications')
# CORS is handled at app level - no need for blueprint-level CORS
CORS(notification_blueprint, supports_credentials=True)

def send_push_notification(notification):
    """
    Send push notification to all subscribed users who should receive this notification.
    This works when the app is in the background or closed (mobile, Windows, Mac).
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("Warning: pywebpush not installed. Install with: pip install pywebpush")
        return
    
    try:
        # Get VAPID keys from config
        vapid_private_key = (current_app.config.get('VAPID_PRIVATE_KEY') or Config.VAPID_PRIVATE_KEY or '').strip()
        vapid_claim_email = current_app.config.get('VAPID_CLAIM_EMAIL') or Config.VAPID_CLAIM_EMAIL
        if vapid_claim_email and not str(vapid_claim_email).strip().startswith('mailto:'):
            vapid_claim_email = 'mailto:' + str(vapid_claim_email).strip()
        else:
            vapid_claim_email = (vapid_claim_email or '').strip() or 'mailto:admin@tatubu.com'
        
        if not vapid_private_key:
            print("Warning: VAPID_PRIVATE_KEY not configured. Push notifications will not be sent.")
            return
        
        # Get all active push subscriptions for users who should receive this notification
        query = PushSubscription.query.filter_by(is_active=True)
        
        # Filter by target users if specified
        if notification.target_user_ids:
            target_user_ids = json.loads(notification.target_user_ids)
            if target_user_ids:
                query = query.filter(PushSubscription.user_id.in_(target_user_ids))
        # Filter by target role if specified
        elif notification.target_role:
            users_with_role = User.query.filter_by(
                user_role=notification.target_role,
                school_id=notification.school_id
            ).all()
            user_ids = [u.id for u in users_with_role]
            if user_ids:
                query = query.filter(PushSubscription.user_id.in_(user_ids))
        else:
            # Send to all users in the school
            users_in_school = User.query.filter_by(school_id=notification.school_id).all()
            user_ids = [u.id for u in users_in_school]
            if user_ids:
                query = query.filter(PushSubscription.user_id.in_(user_ids))
        
        subscriptions = query.all()
        target_user_ids_flat = list(set(s.user_id for s in subscriptions))
        
        if not subscriptions:
            print("Push: No active subscriptions for this notification target (notification_id=%s)." % (notification.id,))
            return
        
        print("Push: Sending to %s subscription(s) for notification id=%s (user_ids=%s)" % (
            len(subscriptions), notification.id, target_user_ids_flat))
        
        vapid_claims = {"sub": vapid_claim_email or "mailto:admin@tatubu.com"}
        
        # Prepare notification payload for background push
        payload = {
            "title": notification.title,
            "message": notification.message,
            "body": notification.message,
            "type": notification.type,
            "id": notification.id,
            "notification_id": notification.id,
            "priority": notification.priority,
            "action_url": notification.action_url or "/app/notifications",
            "url": notification.action_url or "/app/notifications",
            "icon": "/logo.png",
            "badge": "/logo.png",
            "tag": f"notification-{notification.id}",
            "sound": "/Audio-10_7_2025.m4a",
            "silent": False,
            "requireInteraction": notification.priority in ['urgent', 'high'],
            "vibrate": [200, 100, 200] if notification.priority == 'urgent' else [200, 100, 200, 100, 200],
            "timestamp": get_oman_time().isoformat()
        }
        
        # Send push notification to each subscription in background thread
        def send_to_subscription(subscription):
            try:
                # Check user preferences
                user_pref = NotificationPreference.query.filter_by(user_id=subscription.user_id).first()
                if user_pref and not user_pref.push_enabled:
                    return
                
                # Check type-specific preferences
                if user_pref:
                    type_enabled_map = {
                        'attendance': user_pref.attendance_enabled,
                        'bus': user_pref.bus_enabled,
                        'behavior': user_pref.behavior_enabled,
                        'timetable': user_pref.timetable_enabled,
                        'substitution': user_pref.substitution_enabled,
                        'news': user_pref.news_enabled,
                        'general': user_pref.general_enabled
                    }
                    if notification.type in type_enabled_map and not type_enabled_map[notification.type]:
                        return
                
                subscription_data = {
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh_key,
                        "auth": subscription.auth_key
                    }
                }
                
                webpush(
                    subscription_info=subscription_data,
                    data=json.dumps(payload),
                    vapid_private_key=vapid_private_key,
                    vapid_claims=vapid_claims
                )
                print(f"✅ Push notification sent to user {subscription.user_id}")
            except WebPushException as e:
                # Handle expired/invalid subscriptions
                status = e.response.status_code if e.response else None
                body = (e.response.text or "")[:200] if e.response else ""
                if status in [410, 404]:
                    print("⚠️ Subscription expired for user %s (HTTP %s), marking inactive" % (subscription.user_id, status))
                    subscription.is_active = False
                    db.session.commit()
                else:
                    print("❌ Push failed user %s: HTTP %s %s" % (subscription.user_id, status, body or str(e)))
            except Exception as e:
                import traceback
                print("❌ Push error user %s: %s" % (subscription.user_id, str(e)))
                traceback.print_exc()
        
        # Send notifications in background thread to avoid blocking
        thread = threading.Thread(target=lambda: [send_to_subscription(sub) for sub in subscriptions])
        thread.daemon = True
        thread.start()
        
    except Exception as e:
        print(f"❌ Error in send_push_notification: {str(e)}")
def create_notification(school_id, title, message, notification_type, 
                       created_by, priority='normal', target_role=None,
                       target_user_ids=None, target_class_ids=None,
                       related_entity_type=None, related_entity_id=None,
                       action_url=None, expires_at=None):
    """
    Helper function to create a notification
    """
    try:
        notification = Notification(
            school_id=school_id,
            title=title,
            message=message,
            type=notification_type,
            priority=priority,
            target_role=target_role,
            target_user_ids=json.dumps(target_user_ids) if target_user_ids else None,
            target_class_ids=json.dumps(target_class_ids) if target_class_ids else None,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            created_by=created_by,
            action_url=action_url,
            expires_at=expires_at,
            is_active=True
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Send push notifications to subscribed users (works when app is in background)
        send_push_notification(notification)
        
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {str(e)}")
        return None


@notification_blueprint.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_notifications():
    """Get notifications for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        notification_type = request.args.get('type', None)
        
        # School filter: for super admin, also show notifications where they are in target_user_ids (e.g. WhatsApp requests from any school)
        user_id = user.id
        target_ids_conditions = or_(
            Notification.target_user_ids.like(f'%[{user_id}]%'),
            Notification.target_user_ids.like(f'%"{user_id}"%'),
            Notification.target_user_ids.like(f'%{user_id}%')
        )
        if user.user_role == 'admin':
            school_filter = or_(
                Notification.school_id == user.school_id,
                target_ids_conditions
            )
        else:
            school_filter = Notification.school_id == user.school_id
        
        # Build base query
        query = Notification.query.filter(
            school_filter,
            Notification.is_active == True
        )
        
        # Filter by expiration
        now = get_oman_time()
        query = query.filter(
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > now
            )
        )
        
        # Filter by target (role-based or specific user)
        # IMPORTANT: Only show notifications where user is explicitly targeted
        # - target_role matches user's role, OR
        # - user ID is in target_user_ids
        # DO NOT show notifications with target_role=None (those are invalid/broadcast)
        
        # Build conditions for targeting
        conditions = []
        
        # Condition 1: Role-based targeting
        if user.user_role:
            conditions.append(Notification.target_role == user.user_role)
        
        # Condition 2: User-specific targeting (check if user ID is in JSON array)
        # Handle both JSON array format [1,2,3] and string format (user_id already set above)
        conditions.append(
            or_(
                Notification.target_user_ids.like(f'%[{user_id}]%'),  # [1,2,3] format
                Notification.target_user_ids.like(f'%"{user_id}"%'),  # ["1","2","3"] format
                Notification.target_user_ids.like(f'%{user_id}%')     # Fallback
            )
        )
        
        # Apply filter - user must match either role OR be in target_user_ids
        query = query.filter(or_(*conditions))
        
        # Filter by type if specified
        if notification_type:
            query = query.filter(Notification.type == notification_type)
        
        # Exclude deleted notifications for this user
        deleted_notification_ids = db.session.query(NotificationDeleted.notification_id).filter(
            NotificationDeleted.user_id == current_user_id
        ).all()
        deleted_ids = [d[0] for d in deleted_notification_ids]
        if deleted_ids:
            query = query.filter(~Notification.id.in_(deleted_ids))
        
        # Get user's read notification IDs
        if unread_only:
            read_notification_ids = db.session.query(NotificationRead.notification_id).filter(
                NotificationRead.user_id == current_user_id
            ).all()
            read_ids = [r[0] for r in read_notification_ids]
            
            if read_ids:
                query = query.filter(~Notification.id.in_(read_ids))
        
        # Order by priority and created date
        priority_order = db.case(
            (Notification.priority == 'urgent', 1),
            (Notification.priority == 'high', 2),
            (Notification.priority == 'normal', 3),
            (Notification.priority == 'low', 4),
            else_=5
        )
        query = query.order_by(priority_order, Notification.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        notifications = pagination.items
        
        # Get read status for each notification
        read_notification_ids = db.session.query(NotificationRead.notification_id).filter(
            NotificationRead.user_id == current_user_id,
            NotificationRead.notification_id.in_([n.id for n in notifications])
        ).all()
        read_ids = set([r[0] for r in read_notification_ids])
        
        # Get deleted notification IDs for this user (should already be filtered, but double-check)
        deleted_notification_ids = db.session.query(NotificationDeleted.notification_id).filter(
            NotificationDeleted.user_id == current_user_id,
            NotificationDeleted.notification_id.in_([n.id for n in notifications])
        ).all()
        deleted_ids = set([d[0] for d in deleted_notification_ids])
        
        # Prepare response (exclude deleted notifications)
        notification_list = []
        for notif in notifications:
            if notif.id not in deleted_ids:  # Double-check: don't include deleted
                notif_dict = notif.to_dict()
                notif_dict['is_read'] = notif.id in read_ids
                notification_list.append(notif_dict)
        
        return jsonify({
            "notifications": notification_list,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page
        }), 200
        
    except Exception as e:
        return jsonify({"message": f"Error fetching notifications: {str(e)}"}), 500


@notification_blueprint.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Get all active notifications for the user (same filtering as get_notifications)
        now = get_oman_time()
        user_id = user.id
        target_ids_conditions = or_(
            Notification.target_user_ids.like(f'%[{user_id}]%'),
            Notification.target_user_ids.like(f'%"{user_id}"%'),
            Notification.target_user_ids.like(f'%{user_id}%')
        )
        school_filter = or_(Notification.school_id == user.school_id, target_ids_conditions) if user.user_role == 'admin' else (Notification.school_id == user.school_id)
        
        # Build conditions for targeting (same logic as get_notifications)
        conditions = []
        if user.user_role:
            conditions.append(Notification.target_role == user.user_role)
        conditions.append(target_ids_conditions)
        
        notifications_query = Notification.query.filter(
            school_filter,
            Notification.is_active == True,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > now
            ),
            or_(*conditions)  # User must match either role OR be in target_user_ids
        )
        
        # Exclude deleted notifications for this user
        deleted_notification_ids = db.session.query(NotificationDeleted.notification_id).filter(
            NotificationDeleted.user_id == current_user_id
        ).all()
        deleted_ids = [d[0] for d in deleted_notification_ids]
        if deleted_ids:
            notifications_query = notifications_query.filter(~Notification.id.in_(deleted_ids))
        
        # Get read notification IDs
        read_notification_ids = db.session.query(NotificationRead.notification_id).filter(
            NotificationRead.user_id == current_user_id
        ).all()
        read_ids = [r[0] for r in read_notification_ids]
        
        # Count unread (excluding deleted and read notifications)
        if read_ids:
            unread_count = notifications_query.filter(~Notification.id.in_(read_ids)).count()
        else:
            unread_count = notifications_query.count()
        
        return jsonify({"unread_count": unread_count}), 200
        
    except Exception as e:
        return jsonify({"message": f"Error fetching unread count: {str(e)}"}), 500


@notification_blueprint.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if notification exists
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"message": "Notification not found"}), 404
        
        # Check if already marked as read
        existing_read = NotificationRead.query.filter_by(
            notification_id=notification_id,
            user_id=current_user_id
        ).first()
        
        if existing_read:
            return jsonify({"message": "Notification already marked as read"}), 200
        
        # Create read record
        notification_read = NotificationRead(
            notification_id=notification_id,
            user_id=current_user_id
        )
        
        db.session.add(notification_read)
        db.session.commit()
        
        return jsonify({"message": "Notification marked as read"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error marking notification as read: {str(e)}"}), 500


@notification_blueprint.route('/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Get all unread notifications (same filtering as get_notifications)
        now = get_oman_time()
        user_id = user.id
        target_ids_conditions = or_(
            Notification.target_user_ids.like(f'%[{user_id}]%'),
            Notification.target_user_ids.like(f'%"{user_id}"%'),
            Notification.target_user_ids.like(f'%{user_id}%')
        )
        school_filter = or_(Notification.school_id == user.school_id, target_ids_conditions) if user.user_role == 'admin' else (Notification.school_id == user.school_id)
        
        conditions = []
        if user.user_role:
            conditions.append(Notification.target_role == user.user_role)
        conditions.append(target_ids_conditions)
        
        notifications = Notification.query.filter(
            school_filter,
            Notification.is_active == True,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > now
            ),
            or_(*conditions)  # User must match either role OR be in target_user_ids
        ).all()
        
        # Get already read notification IDs
        read_notification_ids = db.session.query(NotificationRead.notification_id).filter(
            NotificationRead.user_id == current_user_id
        ).all()
        read_ids = set([r[0] for r in read_notification_ids])
        
        # Mark unread ones as read
        count = 0
        for notification in notifications:
            if notification.id not in read_ids:
                notification_read = NotificationRead(
                    notification_id=notification.id,
                    user_id=current_user_id
                )
                db.session.add(notification_read)
                count += 1
        
        db.session.commit()
        
        return jsonify({
            "message": f"Marked {count} notifications as read",
            "count": count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error marking notifications as read: {str(e)}"}), 500


@notification_blueprint.route('/delete-all', methods=['POST'])
@jwt_required()
def delete_all_notifications():
    """Soft-delete all notifications for the current user (per-user deletion)."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        now = get_oman_time()
        user_id = user.id
        target_ids_conditions = or_(
            Notification.target_user_ids.like(f'%[{user_id}]%'),
            Notification.target_user_ids.like(f'%"{user_id}"%'),
            Notification.target_user_ids.like(f'%{user_id}%')
        )
        school_filter = or_(Notification.school_id == user.school_id, target_ids_conditions) if user.user_role == 'admin' else (Notification.school_id == user.school_id)
        
        conditions = []
        if user.user_role:
            conditions.append(Notification.target_role == user.user_role)
        conditions.append(target_ids_conditions)
        
        notifications = Notification.query.filter(
            school_filter,
            Notification.is_active == True,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > now
            ),
            or_(*conditions)
        ).all()
        
        already_deleted = set(
            r[0] for r in db.session.query(NotificationDeleted.notification_id).filter(
                NotificationDeleted.user_id == current_user_id
            ).all()
        )
        
        count = 0
        for notification in notifications:
            if notification.id not in already_deleted:
                db.session.add(NotificationDeleted(
                    notification_id=notification.id,
                    user_id=current_user_id
                ))
                count += 1
                already_deleted.add(notification.id)
        
        db.session.commit()
        
        return jsonify({
            "message": "تم حذف جميع الإشعارات" if count > 0 else "لا توجد إشعارات للحذف",
            "count": count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting notifications: {str(e)}"}), 500


@notification_blueprint.route('/<int:notification_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification for the current user (soft delete - per user)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Check if notification exists and user has access to it
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({"message": "Notification not found"}), 404
        
        # Verify notification belongs to user's school (super admin can see notifications where they are in target_user_ids)
        if notification.school_id != user.school_id and user.user_role != 'admin':
            return jsonify({"message": "Unauthorized"}), 403
        
        # Verify user is targeted by this notification
        user_is_targeted = False
        
        # Check role-based targeting
        if notification.target_role == user.user_role:
            user_is_targeted = True
        
        # Check user-specific targeting
        if notification.target_user_ids:
            try:
                target_user_ids = json.loads(notification.target_user_ids)
                if isinstance(target_user_ids, list) and current_user_id in target_user_ids:
                    user_is_targeted = True
            except:
                # Fallback: check if user ID appears in string
                if str(current_user_id) in notification.target_user_ids:
                    user_is_targeted = True
        
        if not user_is_targeted:
            return jsonify({"message": "Notification not found or not accessible"}), 404
        
        # Check if already deleted
        existing_deletion = NotificationDeleted.query.filter_by(
            notification_id=notification_id,
            user_id=current_user_id
        ).first()
        
        if existing_deletion:
            return jsonify({"message": "Notification already deleted"}), 200
        
        # Create deletion record
        notification_deleted = NotificationDeleted(
            notification_id=notification_id,
            user_id=current_user_id
        )
        
        db.session.add(notification_deleted)
        db.session.commit()
        
        return jsonify({"message": "Notification deleted successfully"}), 200
        
    except Exception as e:
        import traceback
        db.session.rollback()
        print(f"Error deleting notification: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"Error deleting notification: {str(e)}"}), 500


@notification_blueprint.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_notification_endpoint():
    """Create a new notification (admin/teacher only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Check permissions (only admins and teachers can create notifications)
        if user.user_role not in ['school_admin', 'admin', 'teacher']:
            return jsonify({"message": "Unauthorized"}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['title', 'message', 'type']):
            return jsonify({"message": "Missing required fields"}), 400
        
        # Parse expires_at if provided
        expires_at = None
        if 'expires_at' in data and data['expires_at']:
            try:
                expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except:
                pass
        
        # Test notifications: send only to the current user
        target_user_ids = data.get('target_user_ids')
        if data.get('is_test'):
            target_user_ids = [current_user_id]
        
        notification = create_notification(
            school_id=user.school_id,
            title=data['title'],
            message=data['message'],
            notification_type=data['type'],
            created_by=current_user_id,
            priority=data.get('priority', 'normal'),
            target_role=data.get('target_role'),
            target_user_ids=target_user_ids,
            target_class_ids=data.get('target_class_ids'),
            related_entity_type=data.get('related_entity_type'),
            related_entity_id=data.get('related_entity_id'),
            action_url=data.get('action_url'),
            expires_at=expires_at
        )
        
        if notification:
            return jsonify({
                "message": "Notification created successfully",
                "notification": notification.to_dict()
            }), 201
        else:
            return jsonify({"message": "Failed to create notification"}), 500
        
    except Exception as e:
        return jsonify({"message": f"Error creating notification: {str(e)}"}), 500


# Push status (for debugging: does the backend see this user's subscription?)
@notification_blueprint.route('/push-status', methods=['GET'])
@jwt_required()
def push_status():
    """Return whether the current user has active push subscription(s). Use for debugging."""
    try:
        current_user_id = get_jwt_identity()
        count = PushSubscription.query.filter_by(user_id=current_user_id, is_active=True).count()
        return jsonify({
            "subscribed": count > 0,
            "subscription_count": count,
            "message": "جهاز واحد مسجل" if count == 1 else ("%s أجهزة مسجلة" % count) if count > 1 else "لا يوجد جهاز مسجل للدفع"
        }), 200
    except Exception as e:
        return jsonify({"subscribed": False, "subscription_count": 0, "message": str(e)}), 500


# Push Subscription Routes
@notification_blueprint.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_push():
    """Subscribe to push notifications"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['endpoint', 'keys']):
            return jsonify({"message": "Missing subscription data"}), 400
        
        if not all(k in data['keys'] for k in ['p256dh', 'auth']):
            return jsonify({"message": "Missing encryption keys"}), 400
        
        # Check if subscription already exists
        existing_subscription = PushSubscription.query.filter_by(
            user_id=current_user_id,
            endpoint=data['endpoint']
        ).first()
        
        if existing_subscription:
            # Update last used timestamp
            existing_subscription.last_used_at = get_oman_time()
            existing_subscription.is_active = True
            db.session.commit()
            
            return jsonify({
                "message": "Subscription updated",
                "subscription": existing_subscription.to_dict()
            }), 200
        
        # Create new subscription
        subscription = PushSubscription(
            user_id=current_user_id,
            endpoint=data['endpoint'],
            p256dh_key=data['keys']['p256dh'],
            auth_key=data['keys']['auth'],
            user_agent=request.headers.get('User-Agent'),
            device_name=data.get('device_name')
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        print("Push: Subscription saved for user_id=%s endpoint=%s..." % (
            current_user_id, (subscription.endpoint or "")[:60]))
        
        return jsonify({
            "message": "Subscribed successfully",
            "subscription": subscription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print("Push: Subscribe failed: %s" % str(e))
        return jsonify({"message": f"Error subscribing to push notifications: {str(e)}"}), 500


@notification_blueprint.route('/unsubscribe', methods=['POST'])
@jwt_required()
def unsubscribe_push():
    """Unsubscribe from push notifications"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if 'endpoint' not in data:
            return jsonify({"message": "Missing endpoint"}), 400
        
        subscription = PushSubscription.query.filter_by(
            user_id=current_user_id,
            endpoint=data['endpoint']
        ).first()
        
        if not subscription:
            return jsonify({"message": "Subscription not found"}), 404
        
        subscription.is_active = False
        db.session.commit()
        
        return jsonify({"message": "Unsubscribed successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error unsubscribing: {str(e)}"}), 500


# Notification Preferences Routes
@notification_blueprint.route('/preferences', methods=['GET'])
@jwt_required()
def get_notification_preferences():
    """Get notification preferences for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        if not current_user_id:
            return jsonify({"message": "User not authenticated"}), 401
        
        # Check if user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        preferences = NotificationPreference.query.filter_by(user_id=current_user_id).first()
        
        if not preferences:
            # Create default preferences
            try:
                preferences = NotificationPreference(user_id=current_user_id)
                db.session.add(preferences)
                db.session.commit()
            except Exception as create_error:
                db.session.rollback()
                import traceback
                print(f"Error creating notification preferences: {str(create_error)}")
                print(traceback.format_exc())
                # Return default preferences as dict if creation fails
                return jsonify({
                    'id': None,
                    'user_id': current_user_id,
                    'attendance_enabled': True,
                    'bus_enabled': True,
                    'behavior_enabled': True,
                    'timetable_enabled': True,
                    'substitution_enabled': True,
                    'news_enabled': True,
                    'general_enabled': True,
                    'push_enabled': True,
                    'updated_at': None
                }), 200
        
        return jsonify(preferences.to_dict()), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching notification preferences: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"Error fetching preferences: {str(e)}"}), 500


@notification_blueprint.route('/preferences', methods=['PUT'])
@jwt_required()
def update_notification_preferences():
    """Update notification preferences for the current user"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        preferences = NotificationPreference.query.filter_by(user_id=current_user_id).first()
        
        if not preferences:
            preferences = NotificationPreference(user_id=current_user_id)
            db.session.add(preferences)
        
        # Update preferences
        if 'attendance_enabled' in data:
            preferences.attendance_enabled = data['attendance_enabled']
        if 'bus_enabled' in data:
            preferences.bus_enabled = data['bus_enabled']
        if 'behavior_enabled' in data:
            preferences.behavior_enabled = data['behavior_enabled']
        if 'timetable_enabled' in data:
            preferences.timetable_enabled = data['timetable_enabled']
        if 'substitution_enabled' in data:
            preferences.substitution_enabled = data['substitution_enabled']
        if 'news_enabled' in data:
            preferences.news_enabled = data['news_enabled']
        if 'general_enabled' in data:
            preferences.general_enabled = data['general_enabled']
        if 'push_enabled' in data:
            preferences.push_enabled = data['push_enabled']
        
        preferences.updated_at = get_oman_time()
        db.session.commit()
        
        return jsonify({
            "message": "Preferences updated successfully",
            "preferences": preferences.to_dict()
        }), 200
        
    except Exception as e:
        import traceback
        db.session.rollback()
        print(f"Error updating notification preferences: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"message": f"Error updating preferences: {str(e)}"}), 500
