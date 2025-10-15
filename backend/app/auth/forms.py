from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError, Regexp

class SignupForm(FlaskForm):
    """Form for user registration"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required'),
        Length(min=3, max=80, message='Username must be between 3 and 80 characters'),
        Regexp(r'^[a-zA-Z0-9_]+$',
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
        Regexp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
               message='Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ])

    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message='Please confirm your password'),
        EqualTo('password', message='Passwords must match')
    ])

class LoginForm(FlaskForm):
    """Form for user login"""
    username = StringField('Username', validators=[
        DataRequired(message='Username is required')
    ])

    password = PasswordField('Password', validators=[
        DataRequired(message='Password is required')
    ])
