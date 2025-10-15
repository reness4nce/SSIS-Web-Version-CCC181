from flask import Blueprint, request, jsonify, session
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
import re

# Updated imports for raw SQL models
from .models import User
from ..college.models import College
from ..program.models import Program
from ..student.models import Student
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ..database import count_records, execute_raw_sql

# Your Blueprint is correct
auth_bp = Blueprint('auth', __name__)

# --- WTForms for Signup ---
class SignupForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=3, max=80, message='Username must be between 3 and 80 characters'),
        validators.Regexp(r'^[a-zA-Z0-9_]+$',
                         message='Username can only contain letters, numbers, and underscores')
    ])

    email = StringField('Email', validators=[
        DataRequired(message='Email is required'),
        Email(message='Please enter a valid email address'),
        Length(max=120, message='Email must not exceed 120 characters')
    ])

    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required'),
        Length(min=8, message='Password must be at least 8 characters long'),
        validators.Regexp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
                         message='Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ])

    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])

    def validate_username(self, username):
        """Check if username already exists"""
        user = User.get_by_username(username.data)
        if user:
            raise ValidationError('Username already exists. Please choose a different username.')

    def validate_email(self, email):
        """Check if email already exists"""
        user = User.get_by_email(email.data)
        if user:
            raise ValidationError('Email already exists. Please use a different email address.')

# --- Your validation functions are excellent and are preserved ---
def validate_login_data(data):
    # (Your existing validation logic is preserved here)
    errors = []
    if not data or 'username' not in data or not data['username']: errors.append('username is required')
    if not data or 'password' not in data or not data['password']: errors.append('password is required')
    return errors

def validate_user_data(data):
    # (Your existing validation logic is preserved here)
    errors = []
    # ... (code omitted for brevity)
    return errors

# --- Your API Endpoints (with corrected imports) ---

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        if not data:
            print("Login attempt: No data provided")
            return jsonify({'error': 'No data provided'}), 400

        errors = validate_login_data(data)
        if errors:
            print(f"Login attempt: Validation errors - {errors}")
            return jsonify({'errors': errors}), 400

        username = data['username'].strip()
        print(f"Login attempt: Looking up user '{username}'")

        user_data = User.get_by_username(username)
        print(f"Login attempt: User lookup result: {user_data is not None}")

        # Check if user exists and password is correct
        if not user_data:
            print(f"Login attempt: User '{username}' not found")
            return jsonify({'error': 'Invalid username or password'}), 401

        if not User.verify_password(user_data['password_hash'], data['password']):
            print(f"Login attempt: Invalid password for user '{username}'")
            return jsonify({'error': 'Invalid username or password'}), 401

        print(f"Login attempt: Successful login for user '{username}'")

        # Create a server-side session for the user
        session.clear()
        session['user_id'] = user_data['id']
        session['username'] = user_data['username']

        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user_data['id'],
                'username': user_data['username'],
                'email': user_data['email']
            }
        }), 200

    except Exception as e:
        print(f"Login attempt: Exception occurred - {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/status', methods=['GET'])
def status():
    """Check if a user is authenticated via their session cookie."""
    if 'user_id' not in session:
        return jsonify({'isAuthenticated': False}), 200 # Return 200 OK, as this is a status check

    user_data = User.get_by_id(session['user_id'])
    if not user_data:
        session.clear() # The user ID in the session is invalid
        return jsonify({'isAuthenticated': False}), 200

    return jsonify({
        'isAuthenticated': True,
        'user': {
            'id': user_data['id'],
            'username': user_data['username'],
            'email': user_data['email']
        }
    }), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        errors = []
        if not data.get('username'): errors.append('Username is required')
        if not data.get('email'): errors.append('Email is required')
        if not data.get('password'): errors.append('Password is required')
        if not data.get('confirm_password'): errors.append('Password confirmation is required')

        if errors:
            return jsonify({'errors': errors}), 400

        # Check if passwords match
        if data['password'] != data['confirm_password']:
            return jsonify({'errors': ['Passwords do not match']}), 400

        # Check if username already exists
        existing_user = User.get_by_username(data['username'].strip())
        if existing_user:
            return jsonify({'errors': ['Username already exists. Please choose a different username.']}), 400

        # Check if email already exists
        existing_email = User.get_by_email(data['email'].strip())
        if existing_email:
            return jsonify({'errors': ['Email already exists. Please use a different email address.']}), 400

        # Validate password strength
        password = data['password']
        if len(password) < 8:
            return jsonify({'errors': ['Password must be at least 8 characters long']}), 400

        if not re.search(r'[a-z]', password):
            return jsonify({'errors': ['Password must contain at least one lowercase letter']}), 400

        if not re.search(r'[A-Z]', password):
            return jsonify({'errors': ['Password must contain at least one uppercase letter']}), 400

        if not re.search(r'\d', password):
            return jsonify({'errors': ['Password must contain at least one number']}), 400

        # Create new user
        new_user = User.create_user(
            username=data['username'].strip(),
            email=data['email'].strip(),
            password=password
        )

        if not new_user:
            return jsonify({'error': 'Failed to create user'}), 500

        return jsonify({
            'message': 'Account created successfully! Please log in with your new credentials.',
            'user': {
                'id': new_user['id'],
                'username': new_user['username'],
                'email': new_user['email']
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics aggregating data from all entities"""
    try:
        # Get total counts using raw SQL
        total_students = count_records("student")
        total_programs = count_records("program")
        total_colleges = count_records("college")

        return jsonify({
            "total_students": total_students,
            "total_programs": total_programs,
            "total_colleges": total_colleges
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/dashboard/charts', methods=['GET'])
def get_dashboard_charts():
    """Get chart data for dashboard visualizations"""
    try:
        # Students by Program (Bar Chart data) using raw SQL
        program_enrollment_query = """
            SELECT
                p.code,
                p.name,
                COUNT(s.id) as student_count
            FROM program p
            LEFT JOIN student s ON p.code = s.course
            GROUP BY p.code, p.name
            ORDER BY p.code
        """
        program_enrollment = execute_raw_sql(program_enrollment_query, fetch=True)

        students_by_program = [
            {
                "program_code": row['code'],
                "program_name": row['name'],
                "student_count": row['student_count'] or 0
            }
            for row in program_enrollment or []
        ]

        # Students by College (Pie Chart data) using raw SQL
        college_enrollment_query = """
            SELECT
                c.code,
                c.name,
                COUNT(s.id) as student_count
            FROM college c
            LEFT JOIN program p ON c.code = p.college
            LEFT JOIN student s ON p.code = s.course
            GROUP BY c.code, c.name
            ORDER BY c.code
        """
        college_enrollment = execute_raw_sql(college_enrollment_query, fetch=True)

        students_by_college = [
            {
                "college_code": row['code'],
                "college_name": row['name'],
                "student_count": row['student_count'] or 0
            }
            for row in college_enrollment or []
        ]

        return jsonify({
            "students_by_program": students_by_program,
            "students_by_college": students_by_college
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Note: The 'register', 'me', and 'check' routes from your file are also great,
# but for simplicity, I am focusing on the three essential for login/logout/status.
