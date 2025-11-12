from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, IntegerField, validators
from wtforms.validators import DataRequired, Length, Regexp, NumberRange, AnyOf

class StudentForm(FlaskForm):
    """Form for student creation and updates"""
    id = StringField('Student ID', validators=[
        DataRequired(message='Student ID is required'),
        Regexp(r'^[0-9]{4}-[0-9]{4}$', message='Student ID must follow format YYYY-NNNN (e.g., 2024-0001)')
    ])

    firstname = StringField('First Name', validators=[
        DataRequired(message='First name is required'),
        Length(min=1, max=50, message='First name must be 1-50 characters')
    ])

    lastname = StringField('Last Name', validators=[
        DataRequired(message='Last name is required'),
        Length(min=1, max=50, message='Last name must be 1-50 characters')
    ])

    course = SelectField('Program', validators=[
        DataRequired(message='Program selection is required')
    ])

    year = IntegerField('Year Level', validators=[
        DataRequired(message='Year level is required'),
        NumberRange(min=1, max=6, message='Year level must be between 1 and 6')
    ])

    gender = SelectField('Gender', validators=[
        DataRequired(message='Gender selection is required')
    ], choices=[
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other')
    ])
