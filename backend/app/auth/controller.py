from flask import Blueprint, request, jsonify, session
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
import re


from .models import User
from ..college.models import College
from ..program.models import Program
from ..student.models import Student


auth_bp = Blueprint('auth', __name__)


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


def validate_login_data(data):

    errors = []
    if not data or 'username' not in data or not data['username']: errors.append('username is required')
    if not data or 'password' not in data or not data['password']: errors.append('password is required')
    return errors

def validate_user_data(data):
 
    errors = []
  
    return errors



@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint - NOW USES SERVICE_ROLE AUTHENTICATION"""
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
        password = data['password']
        print(f"Login attempt: Authenticating user '{username}' using service_role")


        from ..supabase import auth_verify_user_credentials

       
        user_data = auth_verify_user_credentials(username, password)

        if not user_data:
            print(f"Login attempt: Authentication failed for user '{username}'")
            return jsonify({'error': 'Invalid username or password'}), 401

        print(f"Login attempt: Successful login for user '{username}'")


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
        return jsonify({'isAuthenticated': False}), 200 

    user_data = User.get_by_id(session['user_id'])
    if not user_data:
        session.clear() 
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
        
        total_students = Student.count_students()
        total_programs = len(Program.get_all_programs())
        total_colleges = len(College.get_all_colleges())

        return jsonify({
            "total_students": total_students,
            "total_programs": total_programs,
            "total_colleges": total_colleges
        }), 200

    except Exception as e:
        print(f"Dashboard stats error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/dashboard/charts', methods=['GET'])
def get_dashboard_charts():
    """Get chart data for dashboard visualizations"""
    try:
       
        try:
            
            program_stats = Program.get_program_stats()
            students_by_program = [
                {
                    "program_code": prog['code'],
                    "program_name": prog.get('name', prog.get('program_name', 'Unknown')),
                    "student_count": prog.get('student_count', 0)
                }
                for prog in program_stats or []
            ]
        except Exception as e:
            print(f"Error getting program stats: {e}")
          
            programs = Program.get_all_programs()
            students_by_program = []
            for program in programs or []:
                try:
                    student_count = Student.count_students(course_filter=program['code'])
                    students_by_program.append({
                        "program_code": program['code'],
                        "program_name": program['name'],
                        "student_count": student_count
                    })
                except Exception as e:
                    print(f"Error counting students for program {program['code']}: {e}")
                    students_by_program.append({
                        "program_code": program['code'],
                        "program_name": program['name'],
                        "student_count": 0
                    })

        
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
            print(f"Error getting college stats: {e}")
            # Fallback to manual counting
            colleges = College.get_all_colleges()
            students_by_college = []
            for college in colleges or []:
                try:
                    student_count = College.get_student_count(college['code'])
                    students_by_colploye.append({
                        "college_code": college['code'],
                        "college_name": college['name'],
                        "student_count": student_count
                    })
                except Exception as e:
                    print(f"Error counting students for college {college['code']}: {e}")
                    students_by_college.append({
                        "college_code": college['code'],
                        "college_name": college['name'],
                        "student_count": 0
                    })

        return jsonify({
            "students_by_program": students_by_program,
            "students_by_college": students_by_college
        }), 200

    except Exception as e:
        print(f"Dashboard charts error: {str(e)}")
        return jsonify({'error': str(e)}), 500
