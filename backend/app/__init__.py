import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Corrected import: Only imports what extensions.py provides
from .extensions import db, migrate
from .models.user import User

# --- Main Application Factory ---
def create_app(config=None):
    """Creates and a new Flask application."""
    import os as os_module
    app = Flask(__name__, instance_path=os_module.path.join(os_module.path.dirname(os_module.path.abspath(__file__)), 'instance'))

    # --- Configuration ---
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "a-very-secret-dev-key"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", f"sqlite:///{app.instance_path}/sis.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    if config:
        app.config.update(config)

    os_module.makedirs(app.instance_path, exist_ok=True)

    # --- Initialize Extensions with the App ---
    db.init_app(app)
    migrate.init_app(app, db) # Initialize migrate with the app and db

    # --- Enable CORS for Frontend Communication ---
    CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    # --- Register API Blueprints ---
    from .routes.auth import auth_bp
    from .routes.college import college_bp
    from .routes.program import program_bp
    from .routes.student import student_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(college_bp, url_prefix='/api/colleges')
    app.register_blueprint(program_bp, url_prefix='/api/programs')
    app.register_blueprint(student_bp, url_prefix='/api/students')
    
    # --- Register CLI Commands ---
    import sys
    import os as os_module
    sys.path.append(os_module.path.dirname(os_module.path.dirname(os_module.path.abspath(__file__))))
    import seed_data
    @app.cli.command("seed-db")
    def seed_db_command():
        with app.app_context():
            seed_data.seed_database()

    @app.cli.command("init-db")
    def init_db_command():
        with app.app_context():
            db.create_all()
        print("Database initialized.")

    return app
