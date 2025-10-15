from flask_wtf import FlaskForm
from wtforms import StringField, validators
from wtforms.validators import DataRequired, Length, Regexp

class CollegeForm(FlaskForm):
    """Form for college creation and updates"""
    code = StringField('College Code', validators=[
        DataRequired(message='College code is required'),
        Length(min=2, max=10, message='College code must be 2-10 characters'),
        Regexp(r'^[A-Z0-9\-]+$', message='College code must contain only letters, numbers, and hyphens')
    ])

    name = StringField('College Name', validators=[
        DataRequired(message='College name is required'),
        Length(min=5, max=100, message='College name must be 5-100 characters')
    ])
