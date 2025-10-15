from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ..database import (
    get_all, get_one, insert_record, update_record, delete_record,
    count_records, execute_raw_sql, paginate_query
)
from .models import Student
import re

student_bp = Blueprint("student", __name__, url_prefix="/api/students")

def validate_student_data(data, student_id=None):
    """Validate student data with live program data"""
    errors = []

    required_fields = ["id", "firstname", "lastname", "course", "year", "gender"]
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    if "id" in data and data["id"]:
        sid = data["id"].upper()
        print(f"🔍 Backend validation: Checking ID format for: {sid}")

        if not re.match(r"^[0-9]{4}-[0-9]{4}$", sid):
            print(f"❌ Backend validation: Invalid format for ID: {sid}")
            errors.append("Student ID must follow format YYYY-NNNN (e.g., 2024-0001)")
        else:
            print(f"✅ Backend validation: Valid format for ID: {sid}")

        # Check if student ID already exists using raw SQL
        existing = get_one("student", where_clause="id = %s", params=[sid])
        if existing and (not student_id or existing["id"] != student_id):
            print(f"❌ Backend validation: ID {sid} already exists")
            errors.append("Student ID already exists")
        else:
            print(f"✅ Backend validation: ID {sid} is available")

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
        # Check if program exists using case-insensitive raw SQL with live data
        course = get_one("program", where_clause="UPPER(code) = %s", params=[data["course"].upper()])
        if not course:
            # Provide helpful error message with available programs
            available_programs = get_all("program", columns="code, name")
            program_codes = [p["code"] for p in available_programs] if available_programs else []
            if program_codes:
                errors.append(f"Invalid program code '{data['course']}'. Available programs: {', '.join(program_codes[:5])}{'...' if len(program_codes) > 5 else ''}")
            else:
                errors.append("Invalid program code and no programs are currently available")

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
        print(f"🔍 Backend: Checking student existence for ID: {student_id}")

        # Get student using raw SQL
        student = get_one("student", where_clause="id = %s", params=[student_id.upper()])

        if not student:
            print(f"❌ Backend: Student {student_id} not found - returning 404")
            return jsonify({"error": "Student not found"}), 404

        print(f"✅ Backend: Student {student_id} found - returning 200")
        return jsonify(student), 200
    except Exception as e:
        print(f"❌ Backend: Error checking student {student_id}: {str(e)}")
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

        # Get the EXACT program code as stored in database (not uppercase conversion)
        actual_program = get_one("program", where_clause="UPPER(code) = %s", params=[data["course"].upper()])

        # Insert student using raw SQL with exact program code
        student_data = {
            'id': data["id"].upper().strip(),
            'firstname': data["firstname"].strip(),
            'lastname': data["lastname"].strip(),
            'course': actual_program["code"] if actual_program else data["course"].strip(),  # Use exact stored code
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

        # Update student using raw SQL with exact program code
        update_data = {}
        if "id" in data:
            update_data['id'] = data["id"].upper().strip()
        if "firstname" in data:
            update_data['firstname'] = data["firstname"].strip()
        if "lastname" in data:
            update_data['lastname'] = data["lastname"].strip()
        if "course" in data:
            # Get the EXACT program code as stored in database
            actual_program = get_one("program", where_clause="UPPER(code) = %s", params=[data["course"].upper()])
            update_data['course'] = actual_program["code"] if actual_program else data["course"].strip()
        if "year" in data:
            update_data['year'] = int(data["year"])
        if "gender" in data:
            update_data['gender'] = data["gender"].capitalize()

        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        rows_updated = update_record(
            "student",
            update_data,
            "id = %s",
            params=[student_id.upper()]  # WHERE parameter only
        )

        if rows_updated == 0:
            return jsonify({"error": "Student not found or no changes made"}), 404

        # Get updated student - use new ID if it was changed
        updated_student_id = update_data.get('id', student_id.upper())
        updated_student = get_one("student", where_clause="id = %s", params=[updated_student_id])

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


@student_bp.route("/debug-id/<student_id>", methods=["GET"])
def debug_student_id(student_id):
    """Debug endpoint to check student ID existence"""
    try:
        print(f"🔍 Debug: Checking student ID: {student_id}")

        # Check with original case
        student_original = get_one("student", where_clause="id = %s", params=[student_id])
        print(f"🔍 Debug: Original case check result: {student_original}")

        # Check with uppercase
        student_upper = get_one("student", where_clause="id = %s", params=[student_id.upper()])
        print(f"🔍 Debug: Uppercase check result: {student_upper}")

        # Test the specific case mentioned by user
        test_cases = [
            student_id,
            student_id.upper(),
            student_id.lower()
        ]

        results = {}
        for test_id in test_cases:
            exists = get_one("student", where_clause="id = %s", params=[test_id])
            results[test_id] = exists is not None

        return jsonify({
            "id_checked": student_id,
            "test_cases": results,
            "all_cases_available": all(not exists for exists in results.values()),
            "original_case_exists": student_original is not None,
            "uppercase_exists": student_upper is not None,
            "original_case_result": student_original,
            "uppercase_result": student_upper
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@student_bp.route("/validate-program/<program_code>", methods=["GET"])
def validate_program_code(program_code):
    """Validate if a program code exists (for real-time validation)"""
    try:
        # Check if program exists using case-insensitive lookup
        program = get_one("program", where_clause="UPPER(code) = %s", params=[program_code.upper()])

        if not program:
            # Provide available programs for better error messaging
            available_programs = get_all("program", columns="code, name")
            program_list = [p["code"] for p in available_programs] if available_programs else []

            return jsonify({
                "valid": False,
                "message": f"Program '{program_code}' not found. Available programs: {', '.join(program_list[:5])}{'...' if len(program_list) > 5 else ''}",
                "available_programs": program_list
            }), 200

        # Return program details with EXACT stored code (not transformed)
        return jsonify({
            "valid": True,
            "program": {
                "code": program["code"],  # Use exact code as stored in database
                "name": program["name"]
            }
        }), 200

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
