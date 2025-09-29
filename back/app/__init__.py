# app/__init__.py

from flask import Flask ,send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
 
    app = Flask(__name__ ,static_folder="../front/dist", template_folder="../front/dist")
    app.config.from_object('app.config.Config')
    
    # Configure CORS with specific origins for better security
    CORS(app, 
         supports_credentials=True,
         origins=[
             "http://localhost:8080",  # Vue dev server
             "http://localhost:3000",  # Alternative dev port
             "https://sultan00095.pythonanywhere.com",  # Your PythonAnywhere domain
             "https://*.pythonanywhere.com",  # PythonAnywhere subdomains
             "https://tatubu.com",  # Your production domain
             "https://www.tatubu.com",  # Your production domain with www
             "https://*.hostinger.com",  # Hostinger domains
             "https://*.000webhostapp.com"  # Hostinger free hosting
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "content_type"],
         expose_headers=["Content-Type", "Authorization"]
    )
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

    @app.after_request
    def add_security_headers(response):
        """Add security headers to all responses."""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://sultan00095.pythonanywhere.com https://*.pythonanywhere.com;"
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



    return app
