from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ..database import (
    get_all, get_one, insert_record, update_record, delete_record,
    count_records, execute_raw_sql, paginate_query, db_manager
)
from .models import Program
import re

program_bp = Blueprint("program", __name__, url_prefix="/programs")

def validate_program_data(data, program_code=None):
    """Validate program data"""
    errors = []

    required_fields = ["code", "name", "college"]
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    if "code" in data and data["code"]:
        code = data["code"].strip()
        if not re.match(r"^[A-Za-z0-9\-]{2,10}$", code):
            errors.append("Program code must be 2-10 characters, letters, numbers, and hyphens only")

        # Check if program code already exists using case-insensitive raw SQL
        existing = get_one("program", where_clause="UPPER(code) = %s", params=[code.upper()])
        if existing:
            # If this is an update and the existing code is different from current program code, it's a conflict
            if program_code and existing["code"].upper() != program_code.upper():
                errors.append("Program code already exists")
            # If this is a create and code exists, it's a conflict
            elif not program_code:
                errors.append("Program code already exists")

    if "name" in data and data["name"]:
        if len(data["name"].strip()) < 5:
            errors.append("Program name must be at least 5 characters long")
        if len(data["name"].strip()) > 100:
            errors.append("Program name must not exceed 100 characters")

    if "college" in data and data["college"]:
        # Check if college exists using case-insensitive raw SQL
        college = get_one("college", where_clause="UPPER(code) = %s", params=[data["college"].upper()])
        if not college:
            errors.append("Invalid college code")

    return errors


@program_bp.route("", methods=["GET"])
def get_programs():
    """Get all programs with pagination, search, and sorting"""
    try:
        # Reset connection if needed to avoid transaction errors
        db_manager.get_connection()  # This will reset if connection is bad
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
                where_conditions.append("(p.code ILIKE %s OR p.name ILIKE %s OR c.name ILIKE %s OR c.code ILIKE %s)")
                params.extend([search_term, search_term, search_term, search_term])
            elif filter_field == "code":
                where_conditions.append("p.code ILIKE %s")
                params.append(search_term)
            elif filter_field == "name":
                where_conditions.append("p.name ILIKE %s")
                params.append(search_term)
            elif filter_field == "college":
                where_conditions.append("(c.name ILIKE %s OR c.code ILIKE %s)")
                params.extend([search_term, search_term])

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
        count_query = "SELECT COUNT(*) as count FROM program p LEFT JOIN college c ON p.college = c.code"
        if where_clause:
            count_query += f" WHERE {where_clause}"

        total_count_result = execute_raw_sql(count_query, params=params, fetch=True)
        total_count = total_count_result[0]['count'] if total_count_result else 0

        # Build main query with LEFT JOIN
        query = """
            SELECT p.code, p.name, p.college, c.name as college_name
            FROM program p
            LEFT JOIN college c ON p.college = c.code
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
        # Get program with college info using case-insensitive raw SQL
        program_query = """
            SELECT p.code, p.name, p.college, c.name as college_name
            FROM program p
            LEFT JOIN college c ON p.college = c.code
            WHERE UPPER(p.code) = %s
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

        # Get year distribution stats using case-insensitive raw SQL
        year_stats_query = """
            SELECT year, COUNT(*) as count
            FROM student
            WHERE UPPER(course) = %s
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

        # Insert program using raw SQL - store original case but normalized
        program_data = {
            'code': data["code"].strip(),
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
    """Update an existing program with proper cascading support"""
    try:
        # Check if program exists using case-insensitive lookup
        existing_program = get_one("program", where_clause="UPPER(code) = %s", params=[program_code.upper()])
        if not existing_program:
            return jsonify({"error": "Program not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_program_data(data, program_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Handle program code changes with proper cascading
        old_code = existing_program['code']
        update_data = {}
        code_changed = False

        if "name" in data:
            update_data['name'] = data["name"].strip()
        if "college" in data:
            update_data['college'] = data["college"].upper().strip()
        if "code" in data:
            new_code = data["code"].strip()
            if new_code.upper() != old_code.upper():
                update_data['code'] = new_code
                code_changed = True

        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        # Use transaction for atomic updates
        with db_manager.get_cursor(commit=True) as cursor:
            if code_changed:
                # First, get all students that will be affected by the cascade
                affected_students = cursor.execute(
                    "SELECT id, course FROM student WHERE UPPER(course) = %s",
                    [old_code.upper()]
                )
                affected_students = cursor.fetchall()

                # Update program code - this should cascade to students due to ON UPDATE CASCADE
                cursor.execute(
                    "UPDATE program SET code = %s WHERE UPPER(code) = %s",
                    [update_data['code'], old_code.upper()]
                )

                # Verify the cascade worked
                updated_students = cursor.execute(
                    "SELECT id, course FROM student WHERE course = %s",
                    [update_data['code']]
                )
                updated_students = cursor.fetchall()

                # Log the cascading update for transparency
                print(f"Program code updated from '{old_code}' to '{update_data['code']}'")
                print(f"Affected {len(affected_students)} student records")

                if len(updated_students) != len(affected_students):
                    # Rollback if cascade didn't work properly
                    cursor.execute("ROLLBACK")
                    return jsonify({
                        "error": "Failed to update all student references. Transaction rolled back."
                    }), 500
            else:
                # Simple update without code change
                set_clause = ", ".join([f"{key} = %s" for key in update_data.keys()])
                where_params = [old_code.upper()]

                query = f"UPDATE program SET {set_clause} WHERE UPPER(code) = %s"
                all_params = list(update_data.values()) + where_params

                cursor.execute(query, all_params)

        # Get updated program using the new code if it changed
        final_code = update_data.get('code', old_code)
        updated_program = get_one("program", where_clause="UPPER(code) = %s", params=[final_code.upper()])

        return jsonify({
            "message": "Program updated successfully",
            "program": updated_program,
            "code_changed": code_changed,
            "affected_students": len(affected_students) if code_changed else 0
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["DELETE"])
def delete_program(program_code):
    """Delete a program"""
    try:
        # Check if program exists using case-insensitive lookup
        program = get_one("program", where_clause="UPPER(code) = %s", params=[program_code.upper()])
        if not program:
            return jsonify({"error": "Program not found"}), 404

        # Delete program using case-insensitive raw SQL (students will have course field set to NULL)
        rows_deleted = delete_record("program", "UPPER(code) = %s", params=[program_code.upper()])

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
            LEFT JOIN college c ON p.college = c.code
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
