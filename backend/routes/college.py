from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from extensions import db
from models.college import College
from models.program import Program
from models.student import Student
import re

# Create Blueprint for college routes
college_bp = Blueprint("college", __name__, url_prefix="/api/colleges")

def validate_college_data(data, college_code=None):
    """Validate college data"""
    errors = []
    required_fields = ["code", "name"]

    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    if "code" in data and data["code"]:
        code = data["code"].upper()
        if not re.match(r"^[A-Z0-9\-]{2,10}$", code):
            errors.append("College code must be 2-10 characters, letters, numbers, and hyphens only")

        existing = College.query.filter_by(code=code).first()
        if existing and (not college_code or existing.code != college_code):
            errors.append("College code already exists")

    if "name" in data and data["name"]:
        if len(data["name"].strip()) < 5:
            errors.append("College name must be at least 5 characters long")
        if len(data["name"].strip()) > 100:
            errors.append("College name must not exceed 100 characters")

    return errors


@college_bp.route("", methods=["GET"])
def get_colleges():
    """Get all colleges with pagination, search, and sorting"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 10, type=int), 100)
        search = request.args.get("search", "", type=str)
        sort = request.args.get("sort", "code", type=str)
        order = request.args.get("order", "asc", type=str)

        query = College.query

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    College.code.ilike(search_term),
                    College.name.ilike(search_term),
                )
            )

        valid_sort_fields = ["code", "name"]
        if sort in valid_sort_fields:
            sort_column = getattr(College, sort)
            if order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(College.code.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        colleges = [college.to_dict() for college in pagination.items]

        return jsonify({
            "items": colleges,
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["GET"])
def get_college(college_code):
    """Get a specific college by code"""
    try:
        college = College.query.get_or_404(college_code.upper())
        college_dict = college.to_dict()

        programs = Program.query.filter_by(college=college_code.upper()).all()
        college_dict["programs"] = [
            {"code": p.code, "name": p.name, "student_count": Student.query.filter_by(course=p.code).count()}
            for p in programs
        ]

        total_students = (
            db.session.query(db.func.count(Student.id))
            .join(Program)
            .filter(Program.college == college_code.upper())
            .scalar()
        )
        college_dict["total_students"] = total_students or 0

        return jsonify(college_dict), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("", methods=["POST"])
def create_college():
    """Create a new college"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_college_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        new_college = College(code=data["code"].upper().strip(), name=data["name"].strip())
        db.session.add(new_college)
        db.session.commit()

        return jsonify({"message": "College created successfully", "college": new_college.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["PUT"])
def update_college(college_code):
    """Update an existing college"""
    try:
        college = College.query.get_or_404(college_code.upper())
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_college_data(data, college_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        college.name = data.get("name", college.name).strip()
        db.session.commit()

        return jsonify({"message": "College updated successfully", "college": college.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["DELETE"])
def delete_college(college_code):
    """Delete a college"""
    try:
        college = College.query.get_or_404(college_code.upper())
        program_count = Program.query.filter_by(college=college_code.upper()).count()
        if program_count > 0:
            return jsonify({"error": f"Cannot delete college. {program_count} programs belong to this college."}), 400

        db.session.delete(college)
        db.session.commit()
        return jsonify({"message": "College deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@college_bp.route("/stats", methods=["GET"])
def get_college_stats():
    """Get college statistics"""
    try:
        total_colleges = College.query.count()
        college_stats = (
            db.session.query(
                College.code,
                College.name,
                db.func.count(db.distinct(Program.code)).label("program_count"),
                db.func.count(Student.id).label("student_count"),
            )
            .outerjoin(Program)
            .outerjoin(Student)
            .group_by(College.code, College.name)
            .all()
        )

        return jsonify(
            {
                "total_colleges": total_colleges,
                "colleges": [
                    {
                        "code": code,
                        "name": name,
                        "program_count": program_count or 0,
                        "student_count": student_count or 0,
                    }
                    for code, name, program_count, student_count in college_stats
                ],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
