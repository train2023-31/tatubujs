# app/__init__.py

from flask import Flask, send_from_directory, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
import re
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():

    app = Flask(__name__ ,static_folder="../front/dist", template_folder="../front/dist")
    app.config.from_object('app.config.Config')

    # --- CORS Configuration ---
    # Initialize CORS to handle OPTIONS requests and credentials globally.
    # We will set the specific origin header manually in an after_request hook.
    CORS(app, supports_credentials=True)

    @app.after_request
    def after_request_func(response):
        origin = request.headers.get('Origin')
        
        allowed_origins_re = [
            # This pattern now correctly matches the apex domain (e.g., https://tatubu.com)
            # AND any subdomains (e.g., https://www.tatubu.com)
            re.compile(r"^https://(.+\.)*tatubu\.com$"),
            re.compile(r"^https://(.+\.)*pythonanywhere\.com$"),
            re.compile(r"^https://(.+\.)*hostinger\.com$"),
            re.compile(r"^https://(.+\.)*000webhostapp\.com$"),
            re.compile(r"^https://(.+\.)*vercel\.app$"),
            # Also match localhost for development
            re.compile(r"^https?://localhost:?[0-9]*$"),
        ]

        if origin:
            for regex in allowed_origins_re:
                if regex.match(origin):
                    response.headers['Access-Control-Allow-Origin'] = origin
                    break
        
        return response


    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    app.config['JSON_AS_ASCII'] = False
    limiter.init_app(app)  # ✅ Initialize Limiter with app



    # Import models to register them with SQLAlchemy
    from app import models

    # Register blueprints
    from app.routes.auth import auth_blueprint
    from app.routes.class_routes import class_blueprint
    from app.routes.attendance_routes import attendance_blueprint
    from app.routes.user_routes import user_blueprint  # Import the new user routes
    from app.routes.static_routes import static_blueprint


    app.register_blueprint(auth_blueprint, url_prefix='/api/auth')
    app.register_blueprint(class_blueprint, url_prefix='/api/classes')
    app.register_blueprint(attendance_blueprint, url_prefix='/api/attendance')
    app.register_blueprint(user_blueprint, url_prefix='/api/users')  # Register under '/api/users'
    app.register_blueprint(static_blueprint, url_prefix='/api/static')


    # --- Security Headers ---
    @app.after_request
    def add_security_headers(response):
        """Add security headers. CORS is handled by the Flask-CORS extension."""
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('X-XSS-Protection', '1; mode=block')
        response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        response.headers.setdefault('Referrer-Policy', 'origin-when-cross-origin')
        
        # CSP is important but can be complex. Ensure it includes all necessary sources.
        response.headers.setdefault(
            'Content-Security-Policy',
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
