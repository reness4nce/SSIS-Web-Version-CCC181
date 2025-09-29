from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from extensions import db
from models.program import Program
from models.college import College
from models.student import Student
import re

program_bp = Blueprint("program", __name__, url_prefix="/api/programs")

def validate_program_data(data, program_code=None):
    """Validate program data"""
    errors = []

    required_fields = ["code", "name", "college"]
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    if "code" in data and data["code"]:
        code = data["code"].upper()
        if not re.match(r"^[A-Z0-9\-]{2,10}$", code):
            errors.append("Program code must be 2-10 characters, letters, numbers, and hyphens only")

        existing = Program.query.filter_by(code=code).first()
        if existing and (not program_code or existing.code != program_code):
            errors.append("Program code already exists")

    if "name" in data and data["name"]:
        if len(data["name"].strip()) < 5:
            errors.append("Program name must be at least 5 characters long")
        if len(data["name"].strip()) > 100:
            errors.append("Program name must not exceed 100 characters")

    if "college" in data and data["college"]:
        college = College.query.get(data["college"])
        if not college:
            errors.append("Invalid college code")

    return errors


@program_bp.route("", methods=["GET"])
def get_programs():
    """Get all programs with pagination, search, and sorting"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 10, type=int), 100)
        search = request.args.get("search", "", type=str)
        sort = request.args.get("sort", "code", type=str)
        order = request.args.get("order", "asc", type=str)
        college_filter = request.args.get("college", "", type=str)

        query = Program.query.join(College)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Program.code.ilike(search_term),
                    Program.name.ilike(search_term),
                    College.name.ilike(search_term),
                )
            )

        if college_filter:
            query = query.filter(Program.college == college_filter)

        valid_sort_fields = ["code", "name", "college"]
        if sort in valid_sort_fields:
            sort_column = College.name if sort == "college" else getattr(Program, sort)
            if order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(Program.code.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        programs = [program.to_dict() for program in pagination.items]

        return jsonify({
            "items": programs,
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["GET"])
def get_program(program_code):
    """Get a specific program by code"""
    try:
        program = Program.query.get_or_404(program_code.upper())
        program_dict = program.to_dict()

        year_stats = (
            db.session.query(Student.year, db.func.count(Student.id).label("count"))
            .filter(Student.course == program_code.upper())
            .group_by(Student.year)
            .all()
        )
        program_dict["year_distribution"] = [{"year": year, "count": count} for year, count in year_stats]

        return jsonify(program_dict), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("", methods=["POST"])
def create_program():
    """Create a new program"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_program_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        new_program = Program(
            code=data["code"].upper().strip(),
            name=data["name"].strip(),
            college=data["college"].upper().strip(),
        )
        db.session.add(new_program)
        db.session.commit()

        return jsonify({"message": "Program created successfully", "program": new_program.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["PUT"])
def update_program(program_code):
    """Update an existing program"""
    try:
        program = Program.query.get_or_404(program_code.upper())
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_program_data(data, program_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        program.name = data.get("name", program.name).strip()
        program.college = data.get("college", program.college).upper().strip()
        db.session.commit()

        return jsonify({"message": "Program updated successfully", "program": program.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["DELETE"])
def delete_program(program_code):
    """Delete a program"""
    try:
        program = Program.query.get_or_404(program_code.upper())
        student_count = Student.query.filter_by(course=program_code.upper()).count()
        if student_count > 0:
            return jsonify({"error": f"Cannot delete program. {student_count} students are enrolled."}), 400

        db.session.delete(program)
        db.session.commit()
        return jsonify({"message": "Program deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@program_bp.route("/stats", methods=["GET"])
def get_program_stats():
    """Get program statistics"""
    try:
        total_programs = Program.query.count()
        college_stats = (
            db.session.query(
                Program.college,
                College.name,
                db.func.count(Program.code).label("count"),
            )
            .join(College)
            .group_by(Program.college, College.name)
            .all()
        )
        enrollment_stats = (
            db.session.query(
                Program.code,
                Program.name,
                db.func.count(Student.id).label("enrollment"),
            )
            .outerjoin(Student)
            .group_by(Program.code, Program.name)
            .all()
        )

        return jsonify(
            {
                "total_programs": total_programs,
                "by_college": [{"code": code, "college_name": name, "count": count} for code, name, count in college_stats],
                "enrollment": [{"code": code, "name": name, "enrollment": enrollment} for code, name, enrollment in enrollment_stats],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
