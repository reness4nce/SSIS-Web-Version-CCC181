from flask import Blueprint, request, jsonify
from .models import Student
from ..program.models import Program
from ..supabase import get_all, get_one, insert_record, update_record, delete_record, count_records, execute_raw_sql, paginate_query, supabase_manager
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

        # Check if student ID already exists using Supabase model
        existing = Student.get_by_id(sid)
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
        # Check if program exists using Supabase model (case-insensitive)
        program = Program.get_by_code(data["course"].upper())
        if not program:
            # Provide helpful error message with available programs
            available_programs = Program.get_all_programs()
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
        year_filter = request.args.get("year", "", type=str)

        # Get students using Supabase model
        students = Student.get_all_students(
            course_filter=course_filter if course_filter else None,
            year_filter=int(year_filter) if year_filter else None
        )
        
        # Apply search filter
        if search:
            search_term = search.lower()
            if filter_field == "all":
                students = [s for s in students if 
                           search_term in s['id'].lower() or 
                           search_term in s['firstname'].lower() or 
                           search_term in s['lastname'].lower() or
                           search_term in s['course'].lower()]
            elif filter_field == "id":
                students = [s for s in students if search_term in s['id'].lower()]
            elif filter_field == "firstname":
                students = [s for s in students if search_term in s['firstname'].lower()]
            elif filter_field == "lastname":
                students = [s for s in students if search_term in s['lastname'].lower()]
            elif filter_field == "course":
                students = [s for s in students if search_term in s['course'].lower()]

        # Apply sorting
        reverse = order.lower() == "desc"
        if sort == "id":
            students.sort(key=lambda x: x['id'], reverse=reverse)
        elif sort == "firstname":
            students.sort(key=lambda x: x['firstname'], reverse=reverse)
        elif sort == "lastname":
            students.sort(key=lambda x: x['lastname'], reverse=reverse)
        elif sort == "course":
            students.sort(key=lambda x: x['course'], reverse=reverse)
        elif sort == "year":
            students.sort(key=lambda x: x['year'], reverse=reverse)
        elif sort == "gender":
            students.sort(key=lambda x: x['gender'], reverse=reverse)

        # Apply pagination
        total = len(students)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_students = students[start:end]

        return jsonify({
            "items": paginated_students,
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0,
        }), 200
    except Exception as e:
        print(f"Error getting students: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    """Get a specific student by ID"""
    try:
        print(f"🔍 Backend: Checking student existence for ID: {student_id}")

        # Get student using Supabase model
        student = Student.get_by_id(student_id.upper())

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
        actual_program = Program.get_by_code(data["course"].upper())

        # Create student using Supabase model
        new_student = Student.create_student(
            student_id=data["id"].upper().strip(),
            firstname=data["firstname"].strip(),
            lastname=data["lastname"].strip(),
            course=actual_program["code"] if actual_program else data["course"].strip(),  # Use exact stored code
            year=int(data["year"]),
            gender=data["gender"].capitalize(),
            profile_photo_url=data.get("profile_photo_url"),
            profile_photo_filename=data.get("profile_photo_filename")
        )

        return jsonify({
            "message": "Student created successfully",
            "student": new_student
        }), 201

    except Exception as e:
        print(f"Error creating student: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["PUT"])
def update_student(student_id):
    """Update an existing student"""
    try:
        # Check if student exists
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data, student_id.upper())
        if errors:
            return jsonify({"errors": errors}), 400

        # Update student using Supabase model
        success = Student.update_student(
            student_id=student_id.upper(),
            firstname=data.get("firstname", "").strip() if data.get("firstname") else None,
            lastname=data.get("lastname", "").strip() if data.get("lastname") else None,
            course=data.get("course", "").upper().strip() if data.get("course") else None,
            year=int(data["year"]) if data.get("year") else None,
            gender=data.get("gender", "").capitalize() if data.get("gender") else None,
            profile_photo_url=data.get("profile_photo_url"),
            profile_photo_filename=data.get("profile_photo_filename")
        )

        if not success:
            return jsonify({"error": "Student not found or no changes made"}), 404

        # Get updated student
        updated_student = Student.get_by_id(student_id.upper())

        return jsonify({
            "message": "Student updated successfully",
            "student": updated_student
        }), 200

    except Exception as e:
        print(f"Error updating student: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    """Delete a student (includes photo cleanup)"""
    try:
        # Check if student exists
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Delete student using Supabase model (includes photo cleanup)
        rows_deleted = Student.delete_student(student_id.upper())

        if not rows_deleted:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({"message": "Student deleted successfully"}), 200

    except Exception as e:
        print(f"Error deleting student: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>/photo", methods=["POST"])
def upload_student_photo(student_id):
    """Upload profile photo for a student"""
    try:
        # Check if student exists
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Check if file is provided
        if 'photo' not in request.files:
            return jsonify({"error": "No photo file provided"}), 400

        file = request.files['photo']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Read file data
        file_data = file.read()
        
        # Validate file size (5MB limit)
        if len(file_data) > 5 * 1024 * 1024:
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if file.content_type not in allowed_types:
            return jsonify({"error": "Invalid file type. Only JPEG, PNG, and WebP are allowed"}), 400

        # Upload photo using Supabase model
        result = Student.upload_profile_photo(
            student_id=student_id.upper(),
            file_data=file_data,
            filename=file.filename
        )

        if result['success']:
            return jsonify({
                "message": "Photo uploaded successfully",
                "photo_url": result['url'],
                "filename": result['filename']
            }), 200
        else:
            return jsonify({"error": f"Upload failed: {result.get('error', 'Unknown error')}"}), 500

    except Exception as e:
        print(f"Error uploading student photo: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/<student_id>/photo", methods=["DELETE"])
def delete_student_photo(student_id):
    """Delete profile photo for a student"""
    try:
        # Check if student exists
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Check if student has a photo
        if not student.get('profile_photo_filename'):
            return jsonify({"error": "Student has no profile photo"}), 400

        # Delete photo using Supabase model
        result = Student.delete_profile_photo(
            student_id=student_id.upper(),
            filename=student['profile_photo_filename']
        )

        if result['success']:
            return jsonify({"message": "Photo deleted successfully"}), 200
        else:
            return jsonify({"error": f"Delete failed: {result.get('error', 'Unknown error')}"}), 500

    except Exception as e:
        print(f"Error deleting student photo: {e}")
        return jsonify({"error": str(e)}), 500


@student_bp.route("/debug-id/<student_id>", methods=["GET"])
def debug_student_id(student_id):
    """Debug endpoint to check student ID existence"""
    try:
        print(f"🔍 Debug: Checking student ID: {student_id}")

        # Check with original case
        student_original = Student.get_by_id(student_id)
        print(f"🔍 Debug: Original case check result: {student_original}")

        # Check with uppercase
        student_upper = Student.get_by_id(student_id.upper())
        print(f"🔍 Debug: Uppercase check result: {student_upper}")

        # Test the specific case mentioned by user
        test_cases = [
            student_id,
            student_id.upper(),
            student_id.lower()
        ]

        results = {}
        for test_id in test_cases:
            exists = Student.get_by_id(test_id)
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
        # Check if program exists using Supabase model (case-insensitive)
        program = Program.get_by_code(program_code.upper())

        if not program:
            # Provide available programs for better error messaging
            available_programs = Program.get_all_programs()
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
        # Get student statistics using Supabase model
        stats = Student.get_student_stats()

        # Get total students count
        total_students = Student.count_students()

        return jsonify(
            {
                "total_students": total_students,
                "by_year": stats.get("by_year", []),
                "by_course": stats.get("by_course", []),
            }
        ), 200
    except Exception as e:
        print(f"Error getting student stats: {e}")
        return jsonify({"error": str(e)}), 500
