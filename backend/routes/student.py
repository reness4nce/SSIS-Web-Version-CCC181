from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from extensions import db
from models.student import Student
from models.program import Program
import re

student_bp = Blueprint("student", __name__, url_prefix="/api/students")

def validate_student_data(data, student_id=None):
    """Validate student data"""
    errors = []

    required_fields = ["id", "firstname", "lastname", "course", "year", "gender"]
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    if "id" in data and data["id"]:
        sid = data["id"].upper()
        if not re.match(r"^[0-9]{4}-[0-9]{4}$", sid):
            errors.append("Student ID must follow format YYYY-NNNN")
        existing = Student.query.filter_by(id=sid).first()
        if existing and (not student_id or existing.id != student_id):
            errors.append("Student ID already exists")

    if "year" in data and data["year"]:
        try:
            year = int(data["year"])
            if year < 1 or year > 6:
                errors.append("Year must be between 1 and 6")
        except ValueError:
            errors.append("Year must be a number")

    if "gender" in data and data["gender"]:
        if data["gender"].lower() not in ["male", "female"]:
            errors.append("Gender must be Male or Female")

    if "course" in data and data["course"]:
        course = Program.query.get(data["course"].upper())
        if not course:
            errors.append("Invalid program code")

    return errors


@student_bp.route("", methods=["GET"])
def get_students():
    """Get all students with pagination, search, and sorting"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 10, type=int), 100)
        search = request.args.get("search", "", type=str)
        sort = request.args.get("sort", "id", type=str)
        order = request.args.get("order", "asc", type=str)
        course_filter = request.args.get("course", "", type=str)

        query = Student.query

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Student.id.ilike(search_term),
                    Student.firstname.ilike(search_term),
                    Student.lastname.ilike(search_term),
                )
            )

        if course_filter:
            query = query.filter(Student.course == course_filter)

        valid_sort_fields = ["id", "firstname", "lastname", "course", "year", "gender"]
        if sort in valid_sort_fields:
            sort_column = getattr(Student, sort)
            if order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(Student.id.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        students = [student.to_dict() for student in pagination.items]

        return jsonify({
            "items": students,
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    """Get a specific student by ID"""
    try:
        student = Student.query.get_or_404(student_id.upper())
        return jsonify(student.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("", methods=["POST"])
def create_student():
    """Create a new student"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        new_student = Student(
            id=data["id"].upper().strip(),
            firstname=data["firstname"].strip(),
            lastname=data["lastname"].strip(),
            course=data["course"].upper().strip(),
            year=int(data["year"]),
            gender=data["gender"].capitalize(),
        )
        db.session.add(new_student)
        db.session.commit()

        return jsonify({"message": "Student created successfully", "student": new_student.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["PUT"])
def update_student(student_id):
    """Update an existing student"""
    try:
        student = Student.query.get_or_404(student_id.upper())
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data, student_id.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        student.firstname = data.get("firstname", student.firstname).strip()
        student.lastname = data.get("lastname", student.lastname).strip()
        student.course = data.get("course", student.course).upper().strip()
        student.year = int(data.get("year", student.year))
        student.gender = data.get("gender", student.gender).capitalize()
        db.session.commit()

        return jsonify({"message": "Student updated successfully", "student": student.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    """Delete a student"""
    try:
        student = Student.query.get_or_404(student_id.upper())
        db.session.delete(student)
        db.session.commit()
        return jsonify({"message": "Student deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@student_bp.route("/stats", methods=["GET"])
def get_student_stats():
    """Get student statistics"""
    try:
        total_students = Student.query.count()
        year_stats = (
            db.session.query(Student.year, db.func.count(Student.id).label("count"))
            .group_by(Student.year)
            .all()
        )
        course_stats = (
            db.session.query(Student.course, db.func.count(Student.id).label("count"))
            .group_by(Student.course)
            .all()
        )

        return jsonify(
            {
                "total_students": total_students,
                "by_year": [{"year": year, "count": count} for year, count in year_stats],
                "by_course": [{"course": course, "count": count} for course, count in course_stats],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
