from flask import Blueprint, request, jsonify
from .models import College
from ..student.models import Student
from ..program.models import Program
from ..cache import clear_dashboard_cache
from ..supabase import get_all, get_one, insert_record, update_record, delete_record, count_records, execute_raw_sql, paginate_query, supabase_manager
import re


college_bp = Blueprint("college", __name__, url_prefix="/api/colleges")

def validate_college_data(data, college_code=None, is_update=False):
    """Validate college data"""
    errors = []

    if is_update:
        if "name" in data and not data["name"]:
            errors.append("name cannot be empty")
        if "code" in data and not data["code"]:
            errors.append("code cannot be empty")
    else:
        required_fields = ["code", "name"]
        for field in required_fields:
            if field not in data or not data[field]:
                errors.append(f"{field} is required")

    if "code" in data and data["code"]:
        code = data["code"].upper()
        if not re.match(r"^[A-Z0-9\-]{2,10}$", code):
            errors.append("College code must be 2-10 characters, letters, numbers, and hyphens only")

        existing = College.get_by_code(code)
        if existing:
            
            if is_update and college_code and existing["code"] != college_code:
                errors.append("College code already exists")
            
            elif not is_update:
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

        
        colleges = College.get_all_colleges()
        
        # Apply search filter (null-safe)
        if search:
            search_term = search.lower()
            if filter_field == "all":
                colleges = [c for c in colleges if search_term in (c.get('code') or '').lower() or search_term in (c.get('name') or '').lower()]
            elif filter_field == "code":
                colleges = [c for c in colleges if search_term in (c.get('code') or '').lower()]
            elif filter_field == "name":
                colleges = [c for c in colleges if search_term in (c.get('name') or '').lower()]

        # Apply sorting
        reverse = order.lower() == "desc"
        if sort == "code":
            colleges.sort(key=lambda x: x['code'], reverse=reverse)
        elif sort == "name":
            colleges.sort(key=lambda x: x['name'], reverse=reverse)

        # Apply pagination
        total = len(colleges)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_colleges = colleges[start:end]

        return jsonify({
            "items": paginated_colleges,
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0,
        }), 200

    except Exception as e:
        print(f"Error getting colleges: {e}")
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_identifier>", methods=["GET"])
def get_college(college_identifier):
    """Get a specific college by code or ID"""
    try:
        # Get college by code (primary identifier)
        college = College.get_by_code(college_identifier.upper())

        if not college:
            return jsonify({"error": "College not found"}), 404

        # Get programs for this college
        programs = College.get_programs(college['code'])

        # Get student count for each program
        programs_with_count = []
        for program in programs or []:
            student_count = Student.count_students(course_filter=program['code'])
            programs_with_count.append({
                "code": program['code'],
                "name": program['name'],
                "student_count": student_count
            })

        # Get total students in this college
        total_students = College.get_student_count(college['code'])

        college_dict = {
            'id': college.get('id'),
            'code': college['code'],
            'name': college['name'],
            'programs': programs_with_count,
            'total_students': total_students
        }

        return jsonify(college_dict), 200
    except Exception as e:
        print(f"Error getting college: {e}")
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

        # Create college using Supabase model
        new_college = College.create_college(
            code=data["code"].upper().strip(),
            name=data["name"].strip()
        )

        # Clear dashboard cache since stats changed
        clear_dashboard_cache()

        return jsonify({
            "message": "College created successfully",
            "college": new_college
        }), 201

    except Exception as e:
        print(f"Error creating college: {e}")
        return jsonify({"error": str(e)}), 500


@college_bp.route("/<college_identifier>", methods=["PUT"])
def update_college(college_identifier):
    """Update an existing college by code or ID"""
    try:
        # Get college by code (primary identifier)
        college = College.get_by_code(college_identifier.upper())

        if not college:
            return jsonify({"error": "College not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_college_data(data, college['code'], is_update=True)
        if errors:
            return jsonify({"errors": errors}), 400

        # Update college using Supabase model
        update_data = {}
        if "name" in data:
            update_data['name'] = data["name"].strip()
        if "code" in data:
            update_data['code'] = data["code"].upper().strip()

        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        # Update by code (since database uses code as primary identifier)
        rows_updated = College.update_college(
            college_code=college_identifier.upper(),
            name=update_data.get('name'),
            new_code=update_data.get('code')
        )

        if not rows_updated:
            return jsonify({"error": "College not found"}), 404

        # Get updated college using the new college code if code was updated
        final_college_code = update_data.get('code', college['code'])
        updated_college = College.get_by_code(final_college_code)

        # Clear dashboard cache since stats may have changed
        clear_dashboard_cache()

        return jsonify({
            "message": "College updated successfully",
            "college": updated_college
        }), 200

    except Exception as e:
        error_message = str(e)
        print(f"Error updating college: {e}")
        if "violates foreign key constraint" in error_message:
            return jsonify({
                "error": "Cannot update college code because it has linked programs. Please contact administrator or update programs first."
            }), 400
        else:
            return jsonify({"error": error_message}), 500


@college_bp.route("/<college_identifier>", methods=["DELETE"])
def delete_college(college_identifier):
    """Delete a college by code or ID"""
    try:
        # Get college by code (primary identifier)
        college = College.get_by_code(college_identifier.upper())

        if not college:
            return jsonify({"error": "College not found"}), 404

        # Delete college using Supabase model (programs will have college field set to NULL)
        rows_deleted = College.delete_college(college_code=college_identifier.upper())

        if not rows_deleted:
            return jsonify({"error": "College not found"}), 404

        # Clear dashboard cache since stats changed
        clear_dashboard_cache()

        return jsonify({"message": "College deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting college: {e}")
        return jsonify({"error": str(e)}), 500


@college_bp.route("/stats", methods=["GET"])
def get_college_stats():
    """Get college statistics"""
    try:
        # Get college statistics using Supabase model
        college_stats = College.get_college_stats()

        return jsonify(
            {
                "total_colleges": len(college_stats) if college_stats else 0,
                "colleges": [
                    {
                        "id": stat.get('id'),
                        "code": stat.get('college_code', ''),
                        "name": stat.get('college_name', ''),
                        "program_count": stat.get('program_count', 0) or 0,
                        "student_count": stat.get('student_count', 0) or 0,
                    }
                    for stat in college_stats or []
                ],
            }
        ), 200
    except Exception as e:
        print(f"Error getting college stats: {e}")
        return jsonify({"error": str(e)}), 500
