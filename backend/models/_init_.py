from backend.extensions import db
from .college import College
from .program import Program
from .student import Student
from .user import User

__all__ = [
    "db",
    "College",
    "Program",
    "Student",
    "User",
]
