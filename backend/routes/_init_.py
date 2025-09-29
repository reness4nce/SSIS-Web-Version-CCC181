from flask import Blueprint

# Blueprints
student_bp = Blueprint("student", __name__, url_prefix="/students")
program_bp = Blueprint("program", __name__, url_prefix="/programs")
college_bp = Blueprint("college", __name__, url_prefix="/colleges")

# Import route modules
from . import student, program, college
