from flask import Blueprint, request, jsonify, session
from functools import wraps
import logging
import re

from .models import User
from ..college.models import College
from ..program.models import Program
from ..student.models import Student

# Configure logging
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


# ============================================
# AUTHENTICATION DECORATOR
# ============================================
def require_auth(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            logger.warning(f"Unauthorized access attempt to {request.endpoint}")
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ============================================
# VALIDATION FUNCTIONS
# ============================================
def validate_login(data):
    """Validate login data"""
    errors = []
    if not data.get('username'):
        errors.append('Username is required')
    if not data.get('password'):
        errors.append('Password is required')
    return errors


def validate_signup(data):
    """Validate signup data"""
    errors = []
    if not data.get('username'):
        errors.append('Username is required')
    if not data.get('email'):
        errors.append('Email is required')
    if not data.get('password'):
        errors.append('Password is required')
    if not data.get('confirm_password'):
        errors.append('Password confirmation is required')
    if data.get('password') != data.get('confirm_password'):
        errors.append('Passwords must match')
    
    # Password strength validation
    password = data.get('password', '')
    if len(password) < 8:
        errors.append('Password must be at least 8 characters long')
    if not re.search(r'[a-z]', password):
        errors.append('Password must contain at least one lowercase letter')
    if not re.search(r'[A-Z]', password):
        errors.append('Password must contain at least one uppercase letter')
    if not re.search(r'\d', password):
        errors.append('Password must contain at least one number')
    
    return errors


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================
@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        if not data:
            logger.warning("Login attempt with no data")
            return jsonify({'error': 'No data provided'}), 400

        errors = validate_login(data)
        if errors:
            logger.warning(f"Login validation failed: {errors}")
            return jsonify({'errors': errors}), 400

        username = data['username'].strip()
        password = data['password']
        
        logger.info(f"Login attempt for user: {username}")

        # Get user and verify password
        user = User.get_by_username(username)
        if not user or not User.verify_password(user['password_hash'], password):
            logger.warning(f"Failed login attempt for user: {username}")
            return jsonify({'error': 'Invalid username or password'}), 401

        logger.info(f"Successful login for user: {username}")

        # Create session
        session.clear()
        session['user_id'] = user['id']
        session['username'] = user['username']

        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during login'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    try:
        username = session.get('username', 'Unknown')
        session.clear()
        logger.info(f"User logged out: {username}")
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during logout'}), 500


@auth_bp.route('/status', methods=['GET'])
def status():
    """Check if user is authenticated"""
    try:
        if 'user_id' not in session:
            return jsonify({'isAuthenticated': False}), 200
        
        user = User.get_by_id(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'isAuthenticated': False}), 200
        
        return jsonify({
            'isAuthenticated': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }), 200
    except Exception as e:
        logger.error(f"Status check error: {str(e)}", exc_info=True)
        return jsonify({'isAuthenticated': False}), 200


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        if not data:
            logger.warning("Signup attempt with no data")
            return jsonify({'error': 'No data provided'}), 400

        errors = validate_signup(data)
        if errors:
            logger.warning(f"Signup validation failed: {errors}")
            return jsonify({'errors': errors}), 400

        username = data['username'].strip()
        email = data['email'].strip()

        # Check if username exists
        if User.get_by_username(username):
            logger.warning(f"Signup failed - username exists: {username}")
            return jsonify({'errors': ['Username already exists.']}), 400

        # Check if email exists
        if User.get_by_email(email):
            logger.warning(f"Signup failed - email exists: {email}")
            return jsonify({'errors': ['Email already exists.']}), 400

        # Create user
        new_user = User.create_user(
            username=username,
            email=email,
            password=data['password']
        )

        if not new_user:
            logger.error(f"Failed to create user: {username}")
            return jsonify({'error': 'Failed to create user'}), 500

        logger.info(f"New user created: {username}")
        
        return jsonify({
            'message': 'Account created successfully! Please log in.',
            'user': {
                'id': new_user['id'],
                'username': new_user['username'],
                'email': new_user['email']
            }
        }), 201

    except Exception as e:
        logger.error(f"Signup error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred during signup'}), 500


# ============================================
# DASHBOARD ENDPOINTS (PROTECTED)
# ============================================
@auth_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        total_students = Student.count_students()
        total_programs = len(Program.get_all_programs())
        total_colleges = len(College.get_all_colleges())

        return jsonify({
            "total_students": total_students,
            "total_programs": total_programs,
            "total_colleges": total_colleges
        }), 200

    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to fetch dashboard statistics'}), 500


@auth_bp.route('/dashboard/charts', methods=['GET'])
@require_auth
def get_dashboard_charts():
    """Get chart data for dashboard"""
    try:
        # Students by Program
        try:
            program_stats = Program.get_program_stats()
            students_by_program = [
                {
                    "program_code": prog['code'],
                    "program_name": prog.get('name', 'Unknown'),
                    "student_count": prog.get('student_count', 0)
                }
                for prog in program_stats or []
            ]
        except Exception as e:
            logger.error(f"Error getting program stats: {e}")
            students_by_program = []

        # Students by College
        try:
            college_stats = College.get_college_stats()
            students_by_college = [
                {
                    "college_code": col['code'],
                    "college_name": col['name'],
                    "student_count": col.get('student_count', 0)
                }
                for col in college_stats or []
            ]
        except Exception as e:
            logger.error(f"Error getting college stats: {e}")
            students_by_college = []

        return jsonify({
            "students_by_program": students_by_program,
            "students_by_college": students_by_college
        }), 200

    except Exception as e:
        logger.error(f"Dashboard charts error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to fetch chart data'}), 500
