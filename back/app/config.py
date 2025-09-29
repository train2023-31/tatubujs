# app/config.py

import os

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
     




# config/timezone.py
from datetime import datetime
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:
    from pytz import timezone as ZoneInfo  # Fallback for Python < 3.9


def get_oman_time():
    try:
        return datetime.now(ZoneInfo("Asia/Muscat"))
    except Exception:
        import pytz
        return datetime.now(pytz.timezone("Asia/Muscat"))
