from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, validators
from wtforms.validators import DataRequired, Length, Regexp

class ProgramForm(FlaskForm):
    """Form for program creation and updates"""
    code = StringField('Program Code', validators=[
        DataRequired(message='Program code is required'),
        Length(min=2, max=20, message='Program code must be 2-20 characters'),
        Regexp(r'^[A-Z0-9\-]+$', message='Program code must contain only letters, numbers, and hyphens')
    ])

    name = StringField('Program Name', validators=[
        DataRequired(message='Program name is required'),
        Length(min=5, max=100, message='Program name must be 5-100 characters')
    ])

    college = SelectField('College', validators=[
        DataRequired(message='College selection is required')
    ])
