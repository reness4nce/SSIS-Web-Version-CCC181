import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Corrected import: Only imports what extensions.py provides
from app.extensions import db, migrate

# --- Main Application Factory ---
def create_app(config=None):
    """Creates and configures the Flask application."""
    app = Flask(__name__, instance_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance'))

    # --- Configuration ---
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "a-very-secret-dev-key"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", f"sqlite:///{app.instance_path}/sis.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }
    )
    if config:
        app.config.update(config)

    os.makedirs(app.instance_path, exist_ok=True)

    # --- Initialize Extensions with the App ---
    db.init_app(app)
    
    # Import ALL models so Flask-Migrate can detect them!
    from app.models.user import User
    from app.models.student import Student
    from app.models.college import College
    from app.models.program import Program
    
    migrate.init_app(app, db) # Initialize migrate with the app and db

    # --- Enable CORS for Frontend Communication ---
    CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    # --- Register API Blueprints ---
    from app.routes.auth import auth_bp
    from app.routes.college import college_bp
    from app.routes.program import program_bp
    from app.routes.student import student_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(college_bp, url_prefix='/api/colleges')
    app.register_blueprint(program_bp, url_prefix='/api/programs')
    app.register_blueprint(student_bp, url_prefix='/api/students')
    
    # --- Register CLI Commands ---
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

# --- Create App instance for running with a WSGI server ---
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
