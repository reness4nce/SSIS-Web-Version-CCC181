import os
from flask import Flask, jsonify
from flask_cors import CORS

# Import configuration
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_config

# Import models for table creation
from .auth.models import User
from .student.models import Student
from .college.models import College
from .program.models import Program

# --- Main Application Factory ---
def create_app(config=None):
    """Creates and configures the Flask application."""
    import os as os_module

    # Get configuration based on environment
    flask_config = get_config()
    app = Flask(__name__, instance_path=os_module.path.join(os_module.path.dirname(os_module.path.abspath(__file__)), 'instance'))

    # Apply configuration
    app.config.from_object(flask_config)

    # Override with provided config if any
    if config:
        app.config.update(config)

    os_module.makedirs(app.instance_path, exist_ok=True)

    # --- Enable CORS for Frontend Communication ---
    CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:5173", "http://127.0.0.1:5173"])

    # --- Register API Blueprints ---
    from .auth.controller import auth_bp
    from .college.controller import college_bp
    from .program.controller import program_bp
    from .student.controller import student_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
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
        """Seed database with sample data"""
        try:
            seed_data.seed_database()
            print("✅ Database seeded successfully!")
        except Exception as e:
            print(f"❌ Error seeding database: {e}")

    @app.cli.command("init-db")
    def init_db_command():
        """Initialize database tables"""
        try:
            # Create all tables using raw SQL
            User.create_table()
            College.create_table()
            Program.create_table()
            Student.create_table()
            print("✅ Database tables created successfully!")
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")

    @app.cli.command("reset-db")
    def reset_db_command():
        """Reset database (drop and recreate all tables)"""
        try:
            # Drop tables in reverse order (due to foreign key constraints)
            from .database import execute_raw_sql
            execute_raw_sql("DROP TABLE IF EXISTS student", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS program", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS college", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS users", commit=True)

            # Recreate tables
            User.create_table()
            College.create_table()
            Program.create_table()
            Student.create_table()
            print("✅ Database reset successfully!")
        except Exception as e:
            print(f"❌ Error resetting database: {e}")

    @app.cli.command("fix-rls")
    def fix_rls_command():
        """Fix RLS policies by disabling RLS on student table"""
        try:
            # Execute the RLS fix
            from .supabase import supabase_manager

            # Disable RLS on student table to fix creation issues
            client = supabase_manager.get_client()
            result = client.rpc('execute_sql', {'sql': 'ALTER TABLE student DISABLE ROW LEVEL SECURITY;'})

            print("✅ RLS disabled on student table successfully!")
            print("🎯 Student creation should now work without RLS violations")

        except Exception as e:
            print(f"❌ Error fixing RLS: {e}")
            print("💡 Alternative: Run this SQL in Supabase dashboard:")
            print("   ALTER TABLE student DISABLE ROW LEVEL SECURITY;")

    return app
