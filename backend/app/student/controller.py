from flask import Blueprint, request, jsonify, session
from functools import lru_cache
import logging
import re
import os

from .models import Student
from ..program.models import Program
from ..auth.controller import require_auth

# Configure logging
logger = logging.getLogger(__name__)

student_bp = Blueprint("student", __name__)

# Constants 
MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 10
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_TYPES = ['jpeg', 'png', 'webp']


# ============================================
# CACHING 
# ============================================
@lru_cache(maxsize=128)
def get_valid_programs_cached():
    """Cache valid programs for faster validation"""
    try:
        programs = Program.get_all_programs()
        return {p['code'].upper(): p for p in programs}
    except Exception as e:
        logger.error(f"Error caching programs: {e}")
        return {}


# ============================================
# VALIDATION
# ============================================
def validate_student_data(data, student_id=None):
    """Validate student data with cached program validation"""
    errors = []

    required_fields = ["id", "firstname", "lastname", "course", "year", "gender"]
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"{field} is required")

    # Validate student ID format
    if "id" in data and data["id"]:
        sid = data["id"].upper()
        logger.debug(f"Validating student ID: {sid}")

        if not re.match(r"^[0-9]{4}-[0-9]{4}$", sid):
            logger.warning(f"Invalid ID format: {sid}")
            errors.append("Student ID must follow format YYYY-NNNN (e.g., 2024-0001)")
        else:
            # Check if ID already exists
            existing = Student.get_by_id(sid)
            if existing and (not student_id or existing["id"] != student_id):
                logger.warning(f"Duplicate student ID: {sid}")
                errors.append("Student ID already exists")

    # Validate year
    if "year" in data and data["year"]:
        try:
            year = int(data["year"])
            if year < 1 or year > 6:
                errors.append("Year must be between 1 and 6")
        except ValueError:
            errors.append("Year must be a number")

    # Validate gender
    if "gender" in data and data["gender"]:
        valid_genders = ["male", "female", "non-binary", "prefer not to say", "other"]
        if data["gender"].lower() not in valid_genders:
            errors.append("Gender must be Male, Female, Non-binary, Prefer not to say, or Other")

    # Validate program (CACHED - MEDIUM PRIORITY #8)
    if "course" in data and data["course"]:
        valid_programs = get_valid_programs_cached()
        course_upper = data["course"].upper()
        
        if course_upper not in valid_programs:
            available = list(valid_programs.keys())[:5]
            error_msg = f"Invalid program code '{data['course']}'"
            if available:
                error_msg += f". Available: {', '.join(available)}..."
            errors.append(error_msg)

    return errors


# ============================================
# STUDENT CRUD ENDPOINTS
# ============================================
@student_bp.route("", methods=["GET"])
@require_auth
def get_students():
    """Get students with database-level filterin"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int), MAX_PAGE_SIZE)
        search = request.args.get("search", "", type=str)
        filter_field = request.args.get("filter", "all", type=str)
        sort = request.args.get("sort", "id", type=str)
        order = request.args.get("order", "asc", type=str)
        course_filter = request.args.get("course", "", type=str)
        year_filter = request.args.get("year", "", type=str)

        logger.debug(f"Get students: page={page}, search='{search}', filter={filter_field}")

        # Build WHERE clause for database filtering
        where_conditions = []
        params = []

        # Course filter
        if course_filter:
            where_conditions.append("course = %s")
            params.append(course_filter)

        # Year filter
        if year_filter:
            where_conditions.append("year = %s")
            params.append(int(year_filter))

        # Search filter
        if search:
            search_term = f"%{search}%"
            if filter_field == "all":
                where_conditions.append("(id ILIKE %s OR firstname ILIKE %s OR lastname ILIKE %s OR course ILIKE %s)")
                params.extend([search_term] * 4)
            else:
                where_conditions.append(f"{filter_field} ILIKE %s")
                params.append(search_term)

        where_clause = " AND ".join(where_conditions) if where_conditions else None

        # Get total count
        total = Student.count_students_filtered(where_clause, params)

        # Get paginated data with sorting
        students = Student.get_all_students_filtered(
            where_clause=where_clause,
            params=params,
            order_by=sort,
            order_direction=order.upper(),
            limit=per_page,
            offset=(page - 1) * per_page
        )

        return jsonify({
            "items": students,
            "total": total,
            "page": page,
            "pages": (total + per_page - 1) // per_page if total > 0 else 0,
        }), 200

    except Exception as e:
        logger.error(f"Error getting students: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch students"}), 500


@student_bp.route("/<student_id>", methods=["GET"])
@require_auth
def get_student(student_id):
    """Get specific student by ID"""
    try:
        logger.debug(f"Fetching student: {student_id}")
        student = Student.get_by_id(student_id.upper())

        if not student:
            logger.warning(f"Student not found: {student_id}")
            return jsonify({"error": "Student not found"}), 404

        return jsonify(student), 200

    except Exception as e:
        logger.error(f"Error fetching student {student_id}: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch student"}), 500


@student_bp.route("", methods=["POST"])
@require_auth
def create_student():
    """Create new student"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data)
        if errors:
            logger.warning(f"Student creation validation failed: {errors}")
            return jsonify({"errors": errors}), 400

        # Get exact program code
        valid_programs = get_valid_programs_cached()
        course_upper = data["course"].upper()
        actual_program = valid_programs.get(course_upper)

        new_student = Student.create_student(
            student_id=data["id"].upper().strip(),
            firstname=data["firstname"].strip(),
            lastname=data["lastname"].strip(),
            course=actual_program["code"] if actual_program else course_upper,
            year=int(data["year"]),
            gender=data["gender"].capitalize(),
            profile_photo_url=data.get("profile_photo_url"),
            profile_photo_filename=data.get("profile_photo_filename")
        )

        logger.info(f"Student created: {new_student['id']}")

        return jsonify({
            "message": "Student created successfully",
            "student": new_student
        }), 201

    except Exception as e:
        logger.error(f"Error creating student: {e}", exc_info=True)
        return jsonify({"error": "Failed to create student"}), 500


@student_bp.route("/<student_id>", methods=["PUT"])
@require_auth
def update_student(student_id):
    """Update existing student"""
    try:
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = validate_student_data(data, student_id.upper())
        if errors:
            logger.warning(f"Student update validation failed: {errors}")
            return jsonify({"errors": errors}), 400

        # Handle year conversion
        year_value = None
        if data.get("year"):
            try:
                year_value = int(data["year"])
            except (ValueError, TypeError):
                year_value = None

        logger.debug(f"Updating student: {student_id.upper()}")

        success = Student.update_student(
            student_id=student_id.upper(),
            firstname=data.get("firstname", "").strip() if data.get("firstname") else None,
            lastname=data.get("lastname", "").strip() if data.get("lastname") else None,
            course=data.get("course", "").upper().strip() if data.get("course") else None,
            year=year_value,
            gender=data.get("gender", "").capitalize() if data.get("gender") else None,
            profile_photo_url=data.get("profile_photo_url"),
            profile_photo_filename=data.get("profile_photo_filename")
        )

        if not success:
            return jsonify({"error": "Student not found or no changes made"}), 404

        updated_student = Student.get_by_id(student_id.upper())
        logger.info(f"Student updated: {student_id.upper()}")

        return jsonify({
            "message": "Student updated successfully",
            "student": updated_student
        }), 200

    except Exception as e:
        logger.error(f"Error updating student: {e}", exc_info=True)
        return jsonify({"error": "Failed to update student"}), 500


@student_bp.route("/<student_id>", methods=["DELETE"])
@require_auth
def delete_student(student_id):
    """Delete student"""
    try:
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        rows_deleted = Student.delete_student(student_id.upper())

        if not rows_deleted:
            return jsonify({"error": "Student not found"}), 404

        logger.info(f"Student deleted: {student_id.upper()}")
        return jsonify({"message": "Student deleted successfully"}), 200

    except Exception as e:
        logger.error(f"Error deleting student: {e}", exc_info=True)
        return jsonify({"error": "Failed to delete student"}), 500


# ============================================
# PHOTO MANAGEMENT 
# ============================================
@student_bp.route("/<student_id>/photo", methods=["POST"])
@require_auth
def upload_student_photo(student_id):
    """Upload student photo with proper validation"""
    try:
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if 'photo' not in request.files:
            return jsonify({"error": "No photo file provided"}), 400

        file = request.files['photo']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Read file data
        file_data = file.read()

        # Validate file size (HIGH PRIORITY #2)
        if len(file_data) > MAX_FILE_SIZE_BYTES:
            logger.warning(f"File too large: {len(file_data)} bytes")
            return jsonify({"error": f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB"}), 400

        # Validate image format using basic file extension check (simplified due to imghdr removal)
        filename_lower = file.filename.lower()
        if not any(filename_lower.endswith(ext) for ext in ALLOWED_IMAGE_TYPES):
            logger.warning(f"Invalid file extension: {file.filename}")
            return jsonify({"error": f"Invalid image format. Allowed formats: {', '.join(ALLOWED_IMAGE_TYPES).upper()}"}), 400

        logger.info(f"Uploading photo for student: {student_id.upper()}")

        # Upload photo
        result = Student.upload_profile_photo(
            student_id=student_id.upper(),
            file_data=file_data,
            filename=file.filename
        )

        if result['success']:
            logger.info(f"Photo uploaded successfully: {student_id.upper()}")
            return jsonify({
                "message": "Photo uploaded successfully",
                "photo_url": result['url'],
                "filename": result['filename']
            }), 200
        else:
            logger.error(f"Photo upload failed: {result.get('error')}")
            return jsonify({"error": f"Upload failed: {result.get('error', 'Unknown error')}"}), 500

    except Exception as e:
        logger.error(f"Error uploading photo: {e}", exc_info=True)
        return jsonify({"error": "Failed to upload photo"}), 500


@student_bp.route("/<student_id>/photo", methods=["DELETE"])
@require_auth
def delete_student_photo(student_id):
    """Delete student photo"""
    try:
        student = Student.get_by_id(student_id.upper())
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if not student.get('profile_photo_filename'):
            return jsonify({"error": "Student has no profile photo"}), 400

        result = Student.delete_profile_photo(
            student_id=student_id.upper(),
            filename=student['profile_photo_filename']
        )

        if result['success']:
            logger.info(f"Photo deleted: {student_id.upper()}")
            return jsonify({"message": "Photo deleted successfully"}), 200
        else:
            logger.error(f"Photo delete failed: {result.get('error')}")
            return jsonify({"error": f"Delete failed: {result.get('error', 'Unknown error')}"}), 500

    except Exception as e:
        logger.error(f"Error deleting photo: {e}", exc_info=True)
        return jsonify({"error": "Failed to delete photo"}), 500


# ============================================
# UTILITY ENDPOINTS
# ============================================
@student_bp.route("/validate-program/<program_code>", methods=["GET"])
@require_auth
def validate_program_code(program_code):
    """Validate program code"""
    try:
        valid_programs = get_valid_programs_cached()
        course_upper = program_code.upper()

        if course_upper not in valid_programs:
            program_list = list(valid_programs.keys())
            return jsonify({
                "valid": False,
                "message": f"Program '{program_code}' not found",
                "available_programs": program_list
            }), 200

        program = valid_programs[course_upper]
        return jsonify({
            "valid": True,
            "program": {
                "code": program["code"],
                "name": program["name"]
            }
        }), 200

    except Exception as e:
        logger.error(f"Error validating program: {e}", exc_info=True)
        return jsonify({"error": "Failed to validate program"}), 500


@student_bp.route("/stats", methods=["GET"])
@require_auth
def get_student_stats():
    """Get student statistics"""
    try:
        stats = Student.get_student_stats()
        total_students = Student.count_students()

        return jsonify({
            "total_students": total_students,
            "by_year": stats.get("by_year", []),
            "by_course": stats.get("by_course", []),
        }), 200

    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch statistics"}), 500


# ============================================
# DEBUG ENDPOINTS (GATED
# ============================================
if os.getenv('FLASK_ENV') == 'development':
    @student_bp.route("/debug/search", methods=["GET"])
    def debug_search():
        """Debug search functionality (development only)"""
        try:
            students = Student.get_all_students_filtered(limit=5)
            logger.debug(f"Debug: Retrieved {len(students)} students")
            
            return jsonify({
                "total_students": len(students),
                "sample_students": students
            }), 200

        except Exception as e:
            logger.error(f"Debug error: {e}", exc_info=True)
            return jsonify({"error": str(e)}), 500
