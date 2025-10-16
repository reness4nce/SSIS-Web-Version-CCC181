from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from db import (
    get_all, get_one, insert_record, update_record, delete_record,
    count_records, execute_raw_sql, paginate_query
)
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

        # Check if college code already exists using raw SQL
        existing = get_one("college", where_clause="code = %s", params=[code])
        if existing and (not college_code or existing["code"] != college_code):
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
        filter_field = request.args.get("filter", "all", type=str)
        sort = request.args.get("sort", "code", type=str)
        order = request.args.get("order", "asc", type=str)

        # Build WHERE clause for search
        where_conditions = []
        params = []

        if search:
            search_term = f"%{search}%"
            if filter_field == "all":
                where_conditions.append("(code ILIKE %s OR name ILIKE %s)")
                params.extend([search_term, search_term])
            elif filter_field == "code":
                where_conditions.append("code ILIKE %s")
                params.append(search_term)
            elif filter_field == "name":
                where_conditions.append("name ILIKE %s")
                params.append(search_term)

        where_clause = " AND ".join(where_conditions) if where_conditions else None

        # Build ORDER BY clause
        valid_sort_fields = ["code", "name"]
        if sort in valid_sort_fields:
            order_direction = "DESC" if order.lower() == "desc" else "ASC"
            order_clause = f"{sort} {order_direction}"
        else:
            order_clause = "code ASC"

        # Get total count for pagination
        total_count = count_records("college", where_clause=where_clause, params=params if where_clause else None)

        # Build main query
        query = f"SELECT * FROM college"
        if where_clause:
            query += f" WHERE {where_clause}"
        query += f" ORDER BY {order_clause} LIMIT {per_page} OFFSET {(page - 1) * per_page}"

        # Execute query
        colleges = execute_raw_sql(query, params=params, fetch=True)

        return jsonify({
            "items": colleges or [],
            "total": total_count,
            "page": page,
            "pages": (total_count + per_page - 1) // per_page if total_count > 0 else 0,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["GET"])
def get_college(college_code):
    """Get a specific college by code"""
    try:
        # Get college using raw SQL
        college = get_one("college", where_clause="code = %s", params=[college_code.upper()])

        if not college:
            return jsonify({"error": "College not found"}), 404

        college_dict = {
            'code': college['code'],
            'name': college['name']
        }

        # Get programs for this college
        programs = get_all("program", where_clause="college = %s", params=[college_code.upper()])

        # Get student count for each program
        programs_with_count = []
        for program in programs or []:
            student_count = count_records("student", where_clause="course = %s", params=[program['code']])
            programs_with_count.append({
                "code": program['code'],
                "name": program['name'],
                "student_count": student_count
            })

        college_dict["programs"] = programs_with_count

        # Get total students in this college using raw SQL
        total_students_query = """
            SELECT COUNT(DISTINCT s.id) as count
            FROM student s
            JOIN program p ON s.course = p.code
            WHERE p.college = %s
        """
        total_students_result = execute_raw_sql(total_students_query, params=[college_code.upper()], fetch=True)
        college_dict["total_students"] = total_students_result[0]['count'] if total_students_result else 0

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

        # Insert college using raw SQL
        college_data = {
            'code': data["code"].upper().strip(),
            'name': data["name"].strip()
        }

        new_college = insert_record("college", college_data, returning="*")

        return jsonify({
            "message": "College created successfully",
            "college": new_college
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["PUT"])
def update_college(college_code):
    """Update an existing college"""
    try:
        # Check if college exists
        college = get_one("college", where_clause="code = %s", params=[college_code.upper()])
        if not college:
            return jsonify({"error": "College not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_college_data(data, college_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Update college using raw SQL
        update_data = {'name': data.get("name", college['name']).strip()}
        where_params = [college_code.upper()]

        rows_updated = update_record(
            "college",
            update_data,
            "code = %s",
            params={'name': update_data['name'], 'code': college_code.upper()}
        )

        if rows_updated == 0:
            return jsonify({"error": "College not found"}), 404

        # Get updated college
        updated_college = get_one("college", where_clause="code = %s", params=[college_code.upper()])

        return jsonify({
            "message": "College updated successfully",
            "college": updated_college
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_code>", methods=["DELETE"])
def delete_college(college_code):
    """Delete a college"""
    try:
        # Check if college exists
        college = get_one("college", where_clause="code = %s", params=[college_code.upper()])
        if not college:
            return jsonify({"error": "College not found"}), 404

        # Check if college has programs
        program_count = count_records("program", where_clause="college = %s", params=[college_code.upper()])
        if program_count > 0:
            return jsonify({"error": f"Cannot delete college. {program_count} programs belong to this college."}), 400

        # Delete college using raw SQL
        rows_deleted = delete_record("college", "code = %s", params=[college_code.upper()])

        if rows_deleted == 0:
            return jsonify({"error": "College not found"}), 404

        return jsonify({"message": "College deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@college_bp.route("/stats", methods=["GET"])
def get_college_stats():
    """Get college statistics"""
    try:
        # Get total colleges count
        total_colleges = count_records("college")

        # Get college statistics with program and student counts using raw SQL
        stats_query = """
            SELECT
                c.code,
                c.name,
                COUNT(DISTINCT p.code) as program_count,
                COUNT(DISTINCT s.id) as student_count
            FROM college c
            LEFT JOIN program p ON c.code = p.college
            LEFT JOIN student s ON p.code = s.course
            GROUP BY c.code, c.name
            ORDER BY c.code
        """

        college_stats = execute_raw_sql(stats_query, fetch=True)

        return jsonify(
            {
                "total_colleges": total_colleges,
                "colleges": [
                    {
                        "code": stat['code'],
                        "name": stat['name'],
                        "program_count": stat['program_count'] or 0,
                        "student_count": stat['student_count'] or 0,
                    }
                    for stat in college_stats or []
                ],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
