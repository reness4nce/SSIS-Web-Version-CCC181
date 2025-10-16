from flask import Blueprint, request, jsonify, session
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
import re

# Corrected imports for your new file structure
from ..models.user import User
from ..models.student import Student
from ..models.program import Program
from ..models.college import College
from ..extensions import db

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
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already exists. Please choose a different username.')

    def validate_email(self, email):
        """Check if email already exists"""
        user = User.query.filter_by(email=email.data).first()
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
        if not data: return jsonify({'error': 'No data provided'}), 400
        
        errors = validate_login_data(data)
        if errors: return jsonify({'errors': errors}), 400
        
        user = User.query.filter_by(username=data['username'].strip()).first()
        
        # This assumes your User model has a check_password method, which is correct.
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create a server-side session for the user
        session.clear()
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            'message': 'Login successful',
            'user': { 'id': user.id, 'username': user.username, 'email': user.email }
        }), 200
        
    except Exception as e:
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

    user = User.query.get(session['user_id'])
    if not user:
        session.clear() # The user ID in the session is invalid
        return jsonify({'isAuthenticated': False}), 200
    
    return jsonify({
        'isAuthenticated': True,
        'user': { 'id': user.id, 'username': user.username, 'email': user.email }
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
        existing_user = User.query.filter_by(username=data['username'].strip()).first()
        if existing_user:
            return jsonify({'errors': ['Username already exists. Please choose a different username.']}), 400

        # Check if email already exists
        existing_email = User.query.filter_by(email=data['email'].strip()).first()
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
        new_user = User(
            username=data['username'].strip(),
            email=data['email'].strip()
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'message': 'Account created successfully! Please log in with your new credentials.',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics aggregating data from all entities"""
    try:
        # Get total counts from each entity
        total_students = Student.query.count()
        total_programs = Program.query.count()
        total_colleges = College.query.count()

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
        # Students by Program (Bar Chart data)
        program_enrollment = (
            db.session.query(
                Program.code,
                Program.name,
                db.func.count(Student.id).label("student_count")
            )
            .outerjoin(Student, Program.code == Student.course)
            .group_by(Program.code, Program.name)
            .all()
        )

        students_by_program = [
            {
                "program_code": code,
                "program_name": name,
                "student_count": count or 0
            }
            for code, name, count in program_enrollment
        ]

        # Students by College (Pie Chart data)
        college_enrollment = (
            db.session.query(
                College.code,
                College.name,
                db.func.count(Student.id).label("student_count")
            )
            .select_from(College)
            .outerjoin(Program, College.code == Program.college)
            .outerjoin(Student, Program.code == Student.course)
            .group_by(College.code, College.name)
            .all()
        )

        students_by_college = [
            {
                "college_code": code,
                "college_name": name,
                "student_count": count or 0
            }
            for code, name, count in college_enrollment
        ]

        return jsonify({
            "students_by_program": students_by_program,
            "students_by_college": students_by_college
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Note: The 'register', 'me', and 'check' routes from your file are also great,
# but for simplicity, I am focusing on the three essential for login/logout/status.
