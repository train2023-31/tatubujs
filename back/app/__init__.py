# app/__init__.py

from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
import re
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# --- Initialize Extensions ---
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

# Production-ready rate limiter (Redis backend)
# Change "localhost" to your VPS IP or Docker container name if needed
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"  # ? avoids the in-memory warning
)

def create_app():

    app = Flask(__name__ ,static_folder="../front/dist", template_folder="../front/dist")
    app.config.from_object('app.config.Config')

    # --- CORS Configuration ---
    # Define allowed origins explicitly (including all variations for mobile browsers)
    allowed_origins_list = [
        # Domain patterns (Flask-CORS supports regex patterns)
        r"https://.*\.tatubu\.com",
        r"https://.*\.pythonanywhere\.com",
        r"https://.*\.hostinger\.com",
        r"https://.*\.000webhostapp\.com",
        r"https://.*\.vercel\.app",
        # Localhost for development
        r"https?://localhost(:\d+)?",
        # IP address variations (mobile browsers may send with or without port)
        r"https://38\.60\.243\.25:443",
        r"https://38\.60\.243\.25",
        r"http://38\.60\.243\.25:80",
        r"http://38\.60\.243\.25",
    ]
    
    # Initialize CORS with explicit origin patterns
    CORS(app, 
         supports_credentials=True,
         origins=allowed_origins_list,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
         expose_headers=['Content-Type', 'Authorization', 'X-Total-Count'],
         max_age=3600)
    
    # Helper function to check if origin is allowed (for manual fallback)
    def cors_origin_check(origin):
        """Check if origin is allowed, with special handling for mobile browsers"""
        if not origin or origin == 'null':
            return None
        
        # Normalize origin (remove trailing slash)
        origin = origin.rstrip('/')
        
        # Check against allowed patterns
        for pattern in allowed_origins_list:
            if re.match(pattern, origin):
                return origin
        
        return None

    # Handle OPTIONS preflight requests globally
    @app.before_request
    def handle_preflight():
        """Handle OPTIONS preflight requests for CORS"""
        if request.method == 'OPTIONS':
            origin = request.headers.get('Origin')
            if origin:
                allowed_origin = cors_origin_check(origin)
                if allowed_origin:
                    response = jsonify({})
                    response.headers['Access-Control-Allow-Origin'] = allowed_origin
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
                    response.headers['Access-Control-Max-Age'] = '3600'
                    return response
            return jsonify({}), 200


    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    app.config['JSON_AS_ASCII'] = False
    limiter.init_app(app)  # ? Initialize Limiter with app



    # Import models to register them with SQLAlchemy
    from app import models

    # Register blueprints
    from app.routes.auth import auth_blueprint
    from app.routes.class_routes import class_blueprint
    from app.routes.attendance_routes import attendance_blueprint
    from app.routes.user_routes import user_blueprint  # Import the new user routes
    from app.routes.static_routes import static_blueprint
    from app.routes.bus_routes import bus_blueprint
    from app.routes.timetable_routes import timetable_bp
    from app.routes.substitution_routes import substitution_bp



    app.register_blueprint(auth_blueprint, url_prefix='/api/auth')
    app.register_blueprint(class_blueprint, url_prefix='/api/classes')
    app.register_blueprint(attendance_blueprint, url_prefix='/api/attendance')
    app.register_blueprint(user_blueprint, url_prefix='/api/users')  # Register under '/api/users'
    app.register_blueprint(static_blueprint, url_prefix='/api/static')
    app.register_blueprint(bus_blueprint, url_prefix='/api/bus')
    app.register_blueprint(timetable_bp, url_prefix='/api/timetable')
    app.register_blueprint(substitution_bp, url_prefix='/api/substitutions')


    # --- Security Headers and CORS ---
    @app.after_request
    def unified_after_request(response):
        from urllib.parse import urlparse
        import re
    
        # Get Origin or fallback from Referer (for mobile)
        origin = request.headers.get('Origin')
        referer = request.headers.get('Referer')
        if not origin and referer:
            try:
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
            except:
                origin = None
    
        # Allowed origins (exact, with regex)
        allowed_patterns = [
            r"^https://.*\.tatubu\.com$",
            r"^https://tatubu\.com$",
            r"^https://.*\.vercel\.app$",
            r"^https://.*\.pythonanywhere\.com$",
            r"^https://.*\.hostinger\.com$",
            r"^https://.*\.000webhostapp\.com$",
            r"^https?://localhost(:\d+)?$",
            r"^https?://38\.60\.243\.25(:\d+)?$"
        ]
    
        # Match origin and set CORS headers
        if origin:
            for pattern in allowed_patterns:
                if re.match(pattern, origin):
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
                    response.headers['Access-Control-Expose-Headers'] = 'Content-Type, Authorization, X-Total-Count'
                    break
    
        # Security headers (only if not already set by CORS)
        if 'X-Content-Type-Options' not in response.headers:
            response.headers['X-Content-Type-Options'] = 'nosniff'
        if 'X-Frame-Options' not in response.headers:
            response.headers['X-Frame-Options'] = 'DENY'
        if 'X-XSS-Protection' not in response.headers:
            response.headers['X-XSS-Protection'] = '1; mode=block'
        if 'Strict-Transport-Security' not in response.headers:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        if 'Referrer-Policy' not in response.headers:
            response.headers['Referrer-Policy'] = 'origin-when-cross-origin'
        if 'Content-Security-Policy' not in response.headers:
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https://*; "
                "connect-src 'self' https://api.tatubu.com https://*.tatubu.com "
                "http://localhost:3000 http://localhost:5000;"
            )
    
        return response




    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """
        Serve the Vue.js frontend application.
        """
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, "index.html")


    # --- Rate Limiting Defaults ---
    @limiter.request_filter
    def exempt_static_files():
        """Exclude static assets from rate limiting."""
        return request.path.startswith('/static/') or request.path.endswith(('.js', '.css', '.png', '.jpg', '.svg'))


    return app
