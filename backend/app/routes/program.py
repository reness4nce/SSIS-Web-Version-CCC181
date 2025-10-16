from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from db import (
    get_all, get_one, insert_record, update_record, delete_record,
    count_records, execute_raw_sql, paginate_query
)
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

        # Check if program code already exists using raw SQL
        existing = get_one("program", where_clause="code = %s", params=[code])
        if existing and (not program_code or existing["code"] != program_code):
            errors.append("Program code already exists")

    if "name" in data and data["name"]:
        if len(data["name"].strip()) < 5:
            errors.append("Program name must be at least 5 characters long")
        if len(data["name"].strip()) > 100:
            errors.append("Program name must not exceed 100 characters")

    if "college" in data and data["college"]:
        # Check if college exists using raw SQL
        college = get_one("college", where_clause="code = %s", params=[data["college"].upper()])
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
        filter_field = request.args.get("filter", "all", type=str)
        sort = request.args.get("sort", "code", type=str)
        order = request.args.get("order", "asc", type=str)
        college_filter = request.args.get("college", "", type=str)

        # Build WHERE clause for search and filters
        where_conditions = []
        params = []

        if search:
            search_term = f"%{search}%"
            if filter_field == "all":
                where_conditions.append("(p.code ILIKE %s OR p.name ILIKE %s OR c.name ILIKE %s)")
                params.extend([search_term, search_term, search_term])
            elif filter_field == "code":
                where_conditions.append("p.code ILIKE %s")
                params.append(search_term)
            elif filter_field == "name":
                where_conditions.append("p.name ILIKE %s")
                params.append(search_term)
            elif filter_field == "college":
                where_conditions.append("c.name ILIKE %s")
                params.append(search_term)

        if college_filter:
            where_conditions.append("p.college = %s")
            params.append(college_filter)

        where_clause = " AND ".join(where_conditions) if where_conditions else None

        # Build ORDER BY clause
        valid_sort_fields = ["code", "name", "college"]
        if sort in valid_sort_fields:
            sort_column = "c.name" if sort == "college" else f"p.{sort}"
            order_direction = "DESC" if order.lower() == "desc" else "ASC"
            order_clause = f"{sort_column} {order_direction}"
        else:
            order_clause = "p.code ASC"

        # Get total count for pagination
        count_query = "SELECT COUNT(*) as count FROM program p"
        if where_clause:
            count_query += f" WHERE {where_clause}"

        total_count_result = execute_raw_sql(count_query, params=params, fetch=True)
        total_count = total_count_result[0]['count'] if total_count_result else 0

        # Build main query with JOIN
        query = """
            SELECT p.code, p.name, p.college, c.name as college_name
            FROM program p
            JOIN college c ON p.college = c.code
        """
        if where_clause:
            query += f" WHERE {where_clause}"
        query += f" ORDER BY {order_clause} LIMIT {per_page} OFFSET {(page - 1) * per_page}"

        # Execute query
        programs = execute_raw_sql(query, params=params, fetch=True)

        return jsonify({
            "items": programs or [],
            "total": total_count,
            "page": page,
            "pages": (total_count + per_page - 1) // per_page if total_count > 0 else 0,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["GET"])
def get_program(program_code):
    """Get a specific program by code"""
    try:
        # Get program with college info using raw SQL
        program_query = """
            SELECT p.code, p.name, p.college, c.name as college_name
            FROM program p
            JOIN college c ON p.college = c.code
            WHERE p.code = %s
        """
        program = execute_raw_sql(program_query, params=[program_code.upper()], fetch=True)

        if not program:
            return jsonify({"error": "Program not found"}), 404

        program_dict = {
            'code': program[0]['code'],
            'name': program[0]['name'],
            'college': program[0]['college'],
            'college_name': program[0]['college_name']
        }

        # Get year distribution stats using raw SQL
        year_stats_query = """
            SELECT year, COUNT(*) as count
            FROM student
            WHERE course = %s
            GROUP BY year
            ORDER BY year
        """
        year_stats = execute_raw_sql(year_stats_query, params=[program_code.upper()], fetch=True)
        program_dict["year_distribution"] = [{"year": stat['year'], "count": stat['count']} for stat in year_stats]

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

        # Insert program using raw SQL
        program_data = {
            'code': data["code"].upper().strip(),
            'name': data["name"].strip(),
            'college': data["college"].upper().strip()
        }

        new_program = insert_record("program", program_data, returning="*")

        return jsonify({
            "message": "Program created successfully",
            "program": new_program
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["PUT"])
def update_program(program_code):
    """Update an existing program"""
    try:
        # Check if program exists
        program = get_one("program", where_clause="code = %s", params=[program_code.upper()])
        if not program:
            return jsonify({"error": "Program not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_program_data(data, program_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Update program using raw SQL
        update_data = {
            'name': data.get("name", program['name']).strip(),
            'college': data.get("college", program['college']).upper().strip()
        }

        rows_updated = update_record(
            "program",
            update_data,
            "code = %s",
            params={'name': update_data['name'], 'college': update_data['college'], 'code': program_code.upper()}
        )

        if rows_updated == 0:
            return jsonify({"error": "Program not found"}), 404

        # Get updated program
        updated_program = get_one("program", where_clause="code = %s", params=[program_code.upper()])

        return jsonify({
            "message": "Program updated successfully",
            "program": updated_program
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["DELETE"])
def delete_program(program_code):
    """Delete a program"""
    try:
        # Check if program exists
        program = get_one("program", where_clause="code = %s", params=[program_code.upper()])
        if not program:
            return jsonify({"error": "Program not found"}), 404

        # Check if program has enrolled students
        student_count = count_records("student", where_clause="course = %s", params=[program_code.upper()])
        if student_count > 0:
            return jsonify({"error": f"Cannot delete program. {student_count} students are enrolled."}), 400

        # Delete program using raw SQL
        rows_deleted = delete_record("program", "code = %s", params=[program_code.upper()])

        if rows_deleted == 0:
            return jsonify({"error": "Program not found"}), 404

        return jsonify({"message": "Program deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/stats", methods=["GET"])
def get_program_stats():
    """Get program statistics"""
    try:
        # Get total programs count
        total_programs = count_records("program")

        # Get college statistics using raw SQL
        college_stats_query = """
            SELECT
                p.college,
                c.name as college_name,
                COUNT(p.code) as count
            FROM program p
            JOIN college c ON p.college = c.code
            GROUP BY p.college, c.name
            ORDER BY p.college
        """
        college_stats = execute_raw_sql(college_stats_query, fetch=True)

        # Get enrollment statistics using raw SQL
        enrollment_stats_query = """
            SELECT
                p.code,
                p.name,
                COUNT(s.id) as enrollment
            FROM program p
            LEFT JOIN student s ON p.code = s.course
            GROUP BY p.code, p.name
            ORDER BY p.code
        """
        enrollment_stats = execute_raw_sql(enrollment_stats_query, fetch=True)

        return jsonify(
            {
                "total_programs": total_programs,
                "by_college": [
                    {
                        "code": stat['college'],
                        "college_name": stat['college_name'],
                        "count": stat['count']
                    }
                    for stat in college_stats or []
                ],
                "enrollment": [
                    {
                        "code": stat['code'],
                        "name": stat['name'],
                        "enrollment": stat['enrollment'] or 0
                    }
                    for stat in enrollment_stats or []
                ],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
