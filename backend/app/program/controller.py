from flask import Blueprint, request, jsonify
from .models import Program
from ..college.models import College
from ..student.models import Student
from ..supabase import get_all, get_one, insert_record, update_record, delete_record, count_records, execute_raw_sql, paginate_query, supabase_manager
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

        # Check if program code already exists using Supabase model
        existing = Program.get_by_code(code)
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
        # Check if college exists using Supabase model
        college = College.get_by_code(data["college"].upper())
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

        # Get programs with college information using Supabase model
        programs = Program.get_programs_with_college_info()
        
        # Apply college filter if specified
        if college_filter:
            programs = [p for p in programs if p['college'].upper() == college_filter.upper()]
        
        # Apply search filter
        if search:
            search_term = search.lower()
            if filter_field == "all":
                programs = [p for p in programs if 
                           search_term in p['code'].lower() or 
                           search_term in p['name'].lower() or 
                           search_term in p.get('college_name', '').lower() or
                           search_term in p['college'].lower()]
            elif filter_field == "code":
                programs = [p for p in programs if search_term in p['code'].lower()]
            elif filter_field == "name":
                programs = [p for p in programs if search_term in p['name'].lower()]
            elif filter_field == "college":
                programs = [p for p in programs if 
                           search_term in p['college'].lower() or 
                           search_term in p.get('college_name', '').lower()]

        # Apply sorting
        reverse = order.lower() == "desc"
        if sort == "code":
            programs.sort(key=lambda x: x['code'], reverse=reverse)
        elif sort == "name":
            programs.sort(key=lambda x: x['name'], reverse=reverse)
        elif sort == "college":
            programs.sort(key=lambda x: x.get('college_name', ''), reverse=reverse)

        # Apply pagination
        total = len(programs)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_programs = programs[start:end]

        return jsonify({
            "items": paginated_programs,
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0,
        }), 200
    except Exception as e:
        print(f"Error getting programs: {e}")
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["GET"])
def get_program(program_code):
    """Get a specific program by code"""
    try:
        # Get program using Supabase model (case-insensitive)
        program = Program.get_by_code(program_code)
        
        if not program:
            return jsonify({"error": "Program not found"}), 404

        # Add college name to program data
        college = College.get_by_code(program['college'])
        program['college_name'] = college['name'] if college else None

        # Get year distribution stats using Supabase model
        try:
            students = Student.get_students_by_course(program['code'])
            year_distribution = {}
            for student in students or []:
                year = student['year']
                year_distribution[year] = year_distribution.get(year, 0) + 1
            
            program["year_distribution"] = [{"year": year, "count": count} 
                                          for year, count in sorted(year_distribution.items())]
        except Exception as e:
            print(f"Error getting year distribution: {e}")
            program["year_distribution"] = []

        return jsonify(program), 200
    except Exception as e:
        print(f"Error getting program: {e}")
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

        # Create program using Supabase model
        new_program = Program.create_program(
            code=data["code"].strip(),
            name=data["name"].strip(),
            college=data["college"].upper().strip()
        )

        return jsonify({
            "message": "Program created successfully",
            "program": new_program
        }), 201

    except Exception as e:
        print(f"Error creating program: {e}")
        return jsonify({"error": str(e)}), 500


@program_bp.route("/<program_code>", methods=["PUT"])
def update_program(program_code):
    """Update an existing program"""
    try:
        # Check if program exists using Supabase model
        existing_program = Program.get_by_code(program_code)
        if not existing_program:
            return jsonify({"error": "Program not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_program_data(data, program_code.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Handle program updates
        update_data = {}
        code_changed = False

        if "name" in data:
            update_data['name'] = data["name"].strip()
        if "college" in data:
            update_data['college'] = data["college"].upper().strip()
        if "code" in data:
            new_code = data["code"].strip()
            if new_code.upper() != program_code.upper():
                update_data['code'] = new_code
                code_changed = True

        if not update_data:
            return jsonify({"error": "No fields to update"}), 400

        # Update program using Supabase model
        success = Program.update_program(
            program_code=program_code,
            name=update_data.get('name'),
            college=update_data.get('college'),
            code=update_data.get('code')
        )

        if not success:
            return jsonify({"error": "Failed to update program"}), 500

        # Get updated program using the new code if it changed
        final_code = update_data.get('code', program_code)
        updated_program = Program.get_by_code(final_code)

        return jsonify({
            "message": "Program updated successfully",
            "program": updated_program,
            "code_changed": code_changed
        }), 200

    except Exception as e:
        print(f"Error updating program: {e}")
        error_message = str(e)
        if "violates foreign key constraint" in error_message:
            return jsonify({
                "error": "Cannot update program code because it has linked students. Please contact administrator or update students first."
            }), 400
        else:
            return jsonify({"error": error_message}), 500


@program_bp.route("/<program_code>", methods=["DELETE"])
def delete_program(program_code):
    """Delete a program"""
    try:
        # Check if program exists using Supabase model
        program = Program.get_by_code(program_code)
        if not program:
            return jsonify({"error": "Program not found"}), 404

        # Delete program using Supabase model (students will have course field set to NULL)
        rows_deleted = Program.delete_program(program_code)

        if not rows_deleted:
            return jsonify({"error": "Program not found"}), 404

        return jsonify({"message": "Program deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting program: {e}")
        return jsonify({"error": str(e)}), 500


@program_bp.route("/stats", methods=["GET"])
def get_program_stats():
    """Get program statistics"""
    try:
        # Get program statistics using Supabase model
        program_stats = Program.get_program_stats()

        # Get programs by college using Supabase model
        programs = Program.get_all_programs()
        by_college = {}
        for program in programs or []:
            college_code = program['college']
            if college_code not in by_college:
                by_college[college_code] = {'code': college_code, 'count': 0}
            by_college[college_code]['count'] += 1

        # Get enrollment statistics using Supabase model
        enrollment = []
        for program in programs or []:
            try:
                student_count = Program.get_student_count(program['code'])
                enrollment.append({
                    "code": program['code'],
                    "name": program['name'],
                    "enrollment": student_count
                })
            except Exception as e:
                print(f"Error counting students for program {program['code']}: {e}")
                enrollment.append({
                    "code": program['code'],
                    "name": program['name'],
                    "enrollment": 0
                })

        return jsonify(
            {
                "total_programs": len(program_stats) if program_stats else 0,
                "by_college": list(by_college.values()),
                "enrollment": enrollment,
            }
        ), 200
    except Exception as e:
        print(f"Error getting program stats: {e}")
        return jsonify({"error": str(e)}), 500
