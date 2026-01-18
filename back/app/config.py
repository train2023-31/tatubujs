# app/config.py

import os
from datetime import timezone

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'j4djdbvjk464ljbdljvbj7lkk63ndlk99nsleiputpecbvcx8jborwuteouthebvljoxas24255446n45m5n7nknlk7nk65pinpi')  # Replace with a strong secret key

    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI') or \
    #    'mssql+pyodbc://DESKTOP-QFE0CLH/db?driver=ODBC+Driver+17+for+SQL+Server' #DESKTOP-A7AI1NE   LAPTOP-MHFSLEH2   DESKTOP-QFE0CLH

    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI') or \
    #   'mysql+pymysql://u401922667_sultan0095:Su107140ltan@auth-db1755.hstgr.io/u401922667_tatabu'

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI') or \
      'mysql+pymysql://root:root@localhost:3306/db'
    
    # SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI') or \
    #   'mysql+pymysql://sultan00095:Su107140ltan@sultan00095.mysql.pythonanywhere-services.com/sultan00095$db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database connection pooling settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 120,
        'pool_pre_ping': True,
        'pool_timeout': 20,
        'max_overflow': 20,
        'echo': False
    }
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'f8276b9a3dffa9c0d6ed13184b9dbeeb15d11h86g8jo0c1f29a327d5eb95eb7d262ab32b0e9')  # Replace with a strong secret key your-jwt-secret-key
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 60 * 60 * 24))  # Default: 15 minutes (in seconds)
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 1 * 24 * 60 * 60))  # Default: 7 days (in seconds)
    
    # VAPID keys for Web Push Notifications (Background notifications)
    # Generate these using one of these methods:
    # 1. pip install py_vapid && python -c "from py_vapid import Vapid01; v = Vapid01(); print('Private:', v.private_key.pem); print('Public:', v.public_key.pem)"
    # 2. Use online generator: https://web-push-codelab.glitch.me/
    # 3. Use the generate_vapid_keys() function (see BACKGROUND_NOTIFICATIONS_GUIDE.md)
    VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw')
    VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
    VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@tatubu.com')
     




# config/timezone.py
from datetime import datetime
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from pytz import timezone as ZoneInfo  # Fallback for Python < 3.9


def get_oman_time():
    """Get current time in Oman MCT timezone as naive datetime"""
    try:
        oman_tz = ZoneInfo("Asia/Muscat")
        oman_dt = datetime.now(oman_tz)
        # Return as naive datetime (Oman local time)
        return oman_dt.replace(tzinfo=None)
    except Exception:
        import pytz
        oman_tz = pytz.timezone("Asia/Muscat")
        oman_dt = datetime.now(oman_tz)
        # Return as naive datetime (Oman local time)
        return oman_dt.replace(tzinfo=None)
