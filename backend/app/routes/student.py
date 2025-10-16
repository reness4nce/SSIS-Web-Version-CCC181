from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from db import (
    get_all, get_one, insert_record, update_record, delete_record,
    count_records, execute_raw_sql, paginate_query
)
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
            errors.append("Student ID must follow format YYYY-NNNN (e.g., 2024-0001)")
        # Check if student ID already exists using raw SQL
        existing = get_one("student", where_clause="id = %s", params=[sid])
        if existing and (not student_id or existing["id"] != student_id):
            errors.append("Student ID already exists")

    if "year" in data and data["year"]:
        try:
            year = int(data["year"])
            if year < 1 or year > 6:
                errors.append("Year must be between 1 and 6")
        except ValueError:
            errors.append("Year must be a number")

    if "gender" in data and data["gender"]:
        valid_genders = ["male", "female", "non-binary", "prefer not to say", "other"]
        if data["gender"].lower() not in valid_genders:
            errors.append("Gender must be Male, Female, Non-binary, Prefer not to say, or Other")

    if "course" in data and data["course"]:
        # Check if program exists using raw SQL
        course = get_one("program", where_clause="code = %s", params=[data["course"].upper()])
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
        filter_field = request.args.get("filter", "all", type=str)
        sort = request.args.get("sort", "id", type=str)
        order = request.args.get("order", "asc", type=str)
        course_filter = request.args.get("course", "", type=str)

        # Build WHERE clause for search and filters
        where_conditions = []
        params = []

        if search:
            search_term = f"%{search}%"
            if filter_field == "all":
                where_conditions.append("(id ILIKE %s OR firstname ILIKE %s OR lastname ILIKE %s OR course ILIKE %s)")
                params.extend([search_term, search_term, search_term, search_term])
            elif filter_field == "id":
                where_conditions.append("id ILIKE %s")
                params.append(search_term)
            elif filter_field == "firstname":
                where_conditions.append("firstname ILIKE %s")
                params.append(search_term)
            elif filter_field == "lastname":
                where_conditions.append("lastname ILIKE %s")
                params.append(search_term)
            elif filter_field == "course":
                where_conditions.append("course ILIKE %s")
                params.append(search_term)

        if course_filter:
            where_conditions.append("course = %s")
            params.append(course_filter)

        where_clause = " AND ".join(where_conditions) if where_conditions else None

        # Build ORDER BY clause
        valid_sort_fields = ["id", "firstname", "lastname", "course", "year", "gender"]
        if sort in valid_sort_fields:
            order_direction = "DESC" if order.lower() == "desc" else "ASC"
            order_clause = f"{sort} {order_direction}"
        else:
            order_clause = "id ASC"

        # Get total count for pagination
        total_count = count_records("student", where_clause=where_clause, params=params if where_clause else None)

        # Build main query
        query = f"SELECT * FROM student"
        if where_clause:
            query += f" WHERE {where_clause}"
        query += f" ORDER BY {order_clause} LIMIT {per_page} OFFSET {(page - 1) * per_page}"

        # Execute query
        students = execute_raw_sql(query, params=params, fetch=True)

        return jsonify({
            "items": students or [],
            "total": total_count,
            "page": page,
            "pages": (total_count + per_page - 1) // per_page if total_count > 0 else 0,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    """Get a specific student by ID"""
    try:
        # Get student using raw SQL
        student = get_one("student", where_clause="id = %s", params=[student_id.upper()])

        if not student:
            return jsonify({"error": "Student not found"}), 404

        return jsonify(student), 200
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

        # Insert student using raw SQL
        student_data = {
            'id': data["id"].upper().strip(),
            'firstname': data["firstname"].strip(),
            'lastname': data["lastname"].strip(),
            'course': data["course"].upper().strip(),
            'year': int(data["year"]),
            'gender': data["gender"].capitalize()
        }

        new_student = insert_record("student", student_data, returning="*")

        return jsonify({
            "message": "Student created successfully",
            "student": new_student
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["PUT"])
def update_student(student_id):
    """Update an existing student"""
    try:
        # Check if student exists
        student = get_one("student", where_clause="id = %s", params=[student_id.upper()])
        if not student:
            return jsonify({"error": "Student not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data, student_id.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Update student using raw SQL
        update_data = {
            'firstname': data.get("firstname", student['firstname']).strip(),
            'lastname': data.get("lastname", student['lastname']).strip(),
            'course': data.get("course", student['course']).upper().strip(),
            'year': int(data.get("year", student['year'])),
            'gender': data.get("gender", student['gender']).capitalize()
        }

        rows_updated = update_record(
            "student",
            update_data,
            "id = %s",
            params={
                'firstname': update_data['firstname'],
                'lastname': update_data['lastname'],
                'course': update_data['course'],
                'year': update_data['year'],
                'gender': update_data['gender'],
                'id': student_id.upper()
            }
        )

        if rows_updated == 0:
            return jsonify({"error": "Student not found"}), 404

        # Get updated student
        updated_student = get_one("student", where_clause="id = %s", params=[student_id.upper()])

        return jsonify({
            "message": "Student updated successfully",
            "student": updated_student
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    """Delete a student"""
    try:
        # Check if student exists
        student = get_one("student", where_clause="id = %s", params=[student_id.upper()])
        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Delete student using raw SQL
        rows_deleted = delete_record("student", "id = %s", params=[student_id.upper()])

        if rows_deleted == 0:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({"message": "Student deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/stats", methods=["GET"])
def get_student_stats():
    """Get student statistics"""
    try:
        # Get total students count
        total_students = count_records("student")

        # Get year statistics using raw SQL
        year_stats_query = """
            SELECT year, COUNT(*) as count
            FROM student
            GROUP BY year
            ORDER BY year
        """
        year_stats = execute_raw_sql(year_stats_query, fetch=True)

        # Get course statistics using raw SQL
        course_stats_query = """
            SELECT course, COUNT(*) as count
            FROM student
            GROUP BY course
            ORDER BY course
        """
        course_stats = execute_raw_sql(course_stats_query, fetch=True)

        return jsonify(
            {
                "total_students": total_students,
                "by_year": [{"year": stat['year'], "count": stat['count']} for stat in year_stats or []],
                "by_course": [{"course": stat['course'], "count": stat['count']} for stat in course_stats or []],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
