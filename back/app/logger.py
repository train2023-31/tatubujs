import uuid
from flask import request
from app import db
from app.models import ActionLog
from flask_jwt_extended import get_jwt_identity
from functools import wraps
from app.config import get_oman_time

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers['X-Forwarded-For'].split(',')[0]
    return request.remote_addr

def get_mac_address():
    try:
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff)
                        for ele in range(0, 8 * 6, 8)][::-1])
        return mac
    except:
        return None

def log_action(action_type, description=None, content=''):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            response = func(*args, **kwargs)

            try:
                user_id = get_jwt_identity()
            except Exception:
                user_id = None

            # Extract status code (handle both (data, code) or response object)
            status_code = None
            if isinstance(response, tuple) and len(response) == 2:
                status_code = response[1]
            elif hasattr(response, 'status_code'):
                status_code = response.status_code

            log = ActionLog(
                user_id=user_id,
                action_type=action_type,
                endpoint=request.path,
                method=request.method,
                description=description or request.get_json(silent=True),
                content=content,
                ip_address=get_client_ip(),
                mac_address=get_mac_address(),
                status_code=status_code,
                timestamp= get_oman_time()
            )

            db.session.add(log)
            db.session.commit()

            return response
        return wrapper
    return decorator
