import os
import sys
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_config

# Import models for table creation
from .auth.models import User
from .student.models import Student
from .college.models import College
from .program.models import Program

# Initialize rate limiter as global singleton (persists across Flask reloads)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)


def setup_logging(app):
    """Configure application logging"""
    log_level = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Set specific log levels for noisy libraries
    logging.getLogger('werkzeug').setLevel(logging.INFO)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    app.logger.setLevel(log_level)
    app.logger.info(f"Application started in {os.getenv('FLASK_ENV', 'development')} mode")


def create_app(config=None):
    """Creates and configures the Flask application with enhanced features."""
    
    # Get configuration based on environment
    flask_config = get_config()
    app = Flask(__name__,
                instance_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance'))
    
    # Apply configuration
    app.config.from_object(flask_config)

    # Override with provided config if any
    if config:
        app.config.update(config)

    # Cache configuration for dashboard optimization
    app.config['CACHE_TYPE'] = 'simple'  # In-memory cache for dashboard stats
    app.config['CACHE_DEFAULT_TIMEOUT'] = 600  # 10 minutes TTL

    # Create instance folder
    os.makedirs(app.instance_path, exist_ok=True)

    # Setup logging
    setup_logging(app)

    # Initialize cache for dashboard optimization
    global cache
    cache = Cache(app)

    # Enable CORS for Frontend Communication
    CORS(app, supports_credentials=True, origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ])

    # Initialize rate limiter with app instance
    limiter.init_app(app)

    # Register API Blueprints with versioning
    from .auth.controller import auth_bp
    from .college.controller import college_bp
    from .program.controller import program_bp
    from .student.controller import student_bp

    # Apply rate limit to photo upload endpoint
    @limiter.limit("10 per hour")
    def rate_limit_photo_upload():
        pass

    # Apply to student photo upload
    student_bp.before_request(lambda: rate_limit_photo_upload() if 'photo' in request.endpoint else None)

    # API v1 endpoints
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(college_bp, url_prefix='/api/v1/colleges')
    app.register_blueprint(program_bp, url_prefix='/api/v1/programs')
    app.register_blueprint(student_bp, url_prefix='/api/v1/students')
    
    # Legacy endpoints (backward compatibility - remove after frontend update)
    app.register_blueprint(auth_bp, url_prefix='/api/auth', name='auth_legacy')
    app.register_blueprint(college_bp, url_prefix='/api/colleges', name='college_legacy')
    app.register_blueprint(program_bp, url_prefix='/api/programs', name='program_legacy')
    app.register_blueprint(student_bp, url_prefix='/api/students', name='student_legacy')

    # Health check endpoint
    @app.route('/health')
    def health():
        return {"status": "healthy", "version": "1.0.0"}, 200
    
    # API info endpoint
    @app.route('/api/v1')
    def api_info():
        return {
            "version": "1.0.0",
            "endpoints": {
                "auth": "/api/v1/auth",
                "students": "/api/v1/students",
                "colleges": "/api/v1/colleges",
                "programs": "/api/v1/programs"
            }
        }, 200

    # Static file serving for React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        # Skip API routes - let them be handled by blueprints
        if path.startswith('api/'):
            from flask import abort
            abort(404)

        # Get the frontend dist directory
        frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend', 'dist')

        # If the path exists as a file, serve it
        if path and os.path.exists(os.path.join(frontend_dist, path)):
            return send_from_directory(frontend_dist, path)

        # For all other routes, serve index.html (SPA routing)
        return send_from_directory(frontend_dist, 'index.html')

    # Handle 404 errors by serving the SPA
    @app.errorhandler(404)
    def page_not_found(error):
        # Only serve SPA for non-API requests
        if request.path.startswith('/api/'):
            return {"error": "API endpoint not found"}, 404

        frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend', 'dist')
        return send_from_directory(frontend_dist, 'index.html')
    
    # Register CLI Commands
    import seed_data
    
    @app.cli.command("seed-db")
    def seed_db_command():
        """Seed database with sample data"""
        try:
            app.logger.info("Starting database seeding...")
            seed_data.seed_database()
            print("✅ Database seeded successfully!")
            app.logger.info("Database seeding completed")
        except Exception as e:
            print(f"❌ Error seeding database: {e}")
            app.logger.error(f"Database seeding failed: {e}", exc_info=True)
    
    @app.cli.command("init-db")
    def init_db_command():
        """Initialize database tables"""
        try:
            app.logger.info("Initializing database tables...")
            User.create_table()
            College.create_table()
            Program.create_table()
            Student.create_table()
            print("✅ Database tables created successfully!")
            app.logger.info("Database initialization completed")
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
            app.logger.error(f"Database initialization failed: {e}", exc_info=True)
    
    @app.cli.command("reset-db")
    def reset_db_command():
        """Reset database (drop and recreate all tables)"""
        try:
            app.logger.warning("Resetting database - all data will be lost!")
            from .supabase import execute_raw_sql
            
            # Drop tables in reverse order
            execute_raw_sql("DROP TABLE IF EXISTS student CASCADE", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS program CASCADE", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS college CASCADE", commit=True)
            execute_raw_sql("DROP TABLE IF EXISTS users CASCADE", commit=True)
            
            # Recreate tables
            User.create_table()
            College.create_table()
            Program.create_table()
            Student.create_table()
            
            print("✅ Database reset successfully!")
            app.logger.info("Database reset completed")
        except Exception as e:
            print(f"❌ Error resetting database: {e}")
            app.logger.error(f"Database reset failed: {e}", exc_info=True)
    
    @app.cli.command("fix-rls")
    def fix_rls_command():
        """Fix RLS policies by disabling RLS on student table"""
        try:
            from .supabase import supabase_manager
            
            app.logger.info("Disabling RLS on student table...")
            client = supabase_manager.get_client()
            result = client.rpc('execute_sql', {'sql': 'ALTER TABLE student DISABLE ROW LEVEL SECURITY;'})
            
            print("✅ RLS disabled on student table successfully!")
            print("🎯 Student creation should now work without RLS violations")
            app.logger.info("RLS fix completed")
        except Exception as e:
            print(f"❌ Error fixing RLS: {e}")
            print("💡 Alternative: Run this SQL in Supabase dashboard:")
            print("   ALTER TABLE student DISABLE ROW LEVEL SECURITY;")
            app.logger.error(f"RLS fix failed: {e}", exc_info=True)
    
    return app
