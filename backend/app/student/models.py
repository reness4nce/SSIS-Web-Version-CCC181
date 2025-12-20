from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records
from ..supabase import supabase_manager
from ..program.models import Program
from datetime import datetime
import logging
import os
import uuid

# Configure logging
logger = logging.getLogger(__name__)


class Student:
    """Student model with Supabase operations"""

    @staticmethod
    def create_table(): 
        """Create student table"""
        Program.create_table()

        create_table_query = """
            CREATE TABLE IF NOT EXISTS student (
                id VARCHAR(20) PRIMARY KEY CHECK (id = UPPER(id)),
                firstname VARCHAR(50) NOT NULL,
                lastname VARCHAR(50) NOT NULL,
                course VARCHAR(20) REFERENCES program(code) ON UPDATE CASCADE ON DELETE SET NULL,
                year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
                gender VARCHAR(20) NOT NULL,
                profile_photo_url TEXT,
                profile_photo_filename TEXT,
                profile_photo_updated_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """
        execute_raw_sql(create_table_query, commit=True)
        logger.info("Student table created/verified")

    @staticmethod
    def get_by_id(student_id):
        """Get student by ID"""
        return get_one("student", where_clause="id = %s", params=[student_id])

    @staticmethod
    def get_all_students(limit=None, offset=None, course_filter=None, year_filter=None):
        """Get all students with optional filters (LEGACY - for backward compatibility)"""
        where_conditions = []
        params = []

        if course_filter:
            where_conditions.append("course = %s")
            params.append(course_filter)

        if year_filter:
            where_conditions.append("year = %s")
            params.append(year_filter)

        where_clause = " AND ".join(where_conditions) if where_conditions else None
        return get_all("student", where_clause=where_clause, params=params, limit=limit, offset=offset)

    @staticmethod
    def get_all_students_filtered(where_clause=None, params=None, order_by="id", order_direction="ASC", limit=None, offset=None):
        """
        Get filtered students with sorting
        Uses raw SQL for filtering, ordering, and pagination
        """
        try:
            # Validate order_by to prevent SQL injection
            valid_columns = ['id', 'firstname', 'lastname', 'course', 'year', 'gender', 'created_at']
            if order_by not in valid_columns:
                logger.warning(f"Invalid order_by column: {order_by}, defaulting to 'id'")
                order_by = 'id'

            # Validate order direction
            if order_direction.upper() not in ['ASC', 'DESC']:
                logger.warning(f"Invalid order direction: {order_direction}, defaulting to 'ASC'")
                order_direction = 'ASC'

            logger.debug(f"Fetching students: where={where_clause}, order={order_by} {order_direction}, limit={limit}, offset={offset}")

            # Build SQL query
            query = "SELECT * FROM student"
            query_params = []

            # Apply where clause
            if where_clause and params:
                query += f" WHERE {where_clause}"
                query_params.extend(params)

            # Apply ordering
            query += f" ORDER BY {order_by} {order_direction}"

            # Apply pagination
            if limit:
                query += " LIMIT %s"
                query_params.append(limit)
            if offset:
                query += " OFFSET %s"
                query_params.append(offset)

            # Execute query
            result = execute_raw_sql(query, params=query_params, fetch=True)

            logger.debug(f"Query returned {len(result) if result else 0} students")

            return result if result else []

        except Exception as e:
            logger.error(f"Error fetching filtered students: {e}", exc_info=True)
            # Fallback to legacy method
            return Student.get_all_students(limit=limit, offset=offset)

    @staticmethod
    def count_students(course_filter=None, year_filter=None):
        """Count students with optional filters"""
        where_conditions = []
        params = []

        if course_filter:
            where_conditions.append("course = %s")
            params.append(course_filter)

        if year_filter:
            where_conditions.append("year = %s")
            params.append(year_filter)

        where_clause = " AND ".join(where_conditions) if where_conditions else None
        return count_records("student", where_clause=where_clause, params=params)

    @staticmethod
    def count_students_filtered(where_clause=None, params=None):
        """Count students matching filter"""
        try:
            # Build SQL query for counting
            query = "SELECT COUNT(*) as count FROM student"
            query_params = []

            # Apply where clause
            if where_clause and params:
                query += f" WHERE {where_clause}"
                query_params.extend(params)

            # Execute query
            result = execute_raw_sql(query, params=query_params, fetch=True)

            return result[0]['count'] if result else 0

        except Exception as e:
            logger.error(f"Error counting filtered students: {e}", exc_info=True)
            return 0

    @staticmethod
    def create_student(student_id, firstname, lastname, course, year, gender, profile_photo_url=None, profile_photo_filename=None):
        """Create new student"""
        try:
            student_data = {
                'id': student_id.upper(),
                'firstname': firstname,
                'lastname': lastname,
                'course': course,
                'year': year,
                'gender': gender,
                'profile_photo_url': profile_photo_url,
                'profile_photo_filename': profile_photo_filename,
                'profile_photo_updated_at': datetime.utcnow().isoformat() if profile_photo_url else None
            }
            result = insert_record("student", student_data, returning="*")
            logger.info(f"Student created: {student_id}")
            return result
        except Exception as e:
            logger.error(f"Error creating student: {e}", exc_info=True)
            raise

    @staticmethod
    def update_student(student_id, firstname=None, lastname=None, course=None, year=None, gender=None, new_id=None, profile_photo_url=None, profile_photo_filename=None):
        """Update student information"""
        try:
            update_data = {}
            if firstname:
                update_data['firstname'] = firstname
            if lastname:
                update_data['lastname'] = lastname
            if course:
                update_data['course'] = course
            if year:
                update_data['year'] = year
            if gender:
                update_data['gender'] = gender
            if new_id:
                update_data['id'] = new_id.upper()
            if profile_photo_url is not None:
                update_data['profile_photo_url'] = profile_photo_url
            if profile_photo_filename is not None:
                update_data['profile_photo_filename'] = profile_photo_filename
                update_data['profile_photo_updated_at'] = datetime.utcnow().isoformat()

            if not update_data:
                logger.warning(f"No data to update for student: {student_id}")
                return None

            logger.debug(f"Updating student {student_id}: {update_data}")

            result = update_record(
                "student",
                update_data,
                "id = %s",
                params=[student_id]
            )

            logger.info(f"Student updated: {student_id}" + (f" (new ID: {new_id.upper()})" if new_id else ""))
            return result
        except Exception as e:
            logger.error(f"Error updating student: {e}", exc_info=True)
            raise

    @staticmethod
    def delete_student(student_id):
        """Delete student with photo cleanup (HIGH PRIORITY - proper order)"""
        try:
            # Get student first
            student = Student.get_by_id(student_id)
            if not student:
                logger.warning(f"Student not found for deletion: {student_id}")
                return 0

            # Delete photo FIRST (less critical if fails)
            if student.get('profile_photo_filename'):
                try:
                    Student.delete_profile_photo(student_id, student['profile_photo_filename'])
                    logger.info(f"Photo deleted for student: {student_id}")
                except Exception as e:
                    logger.warning(f"Could not delete photo for {student_id}: {e}")

            # Then delete student record
            result = delete_record("student", "id = %s", params=[student_id])
            logger.info(f"Student deleted: {student_id}")
            return result

        except Exception as e:
            logger.error(f"Error deleting student: {e}", exc_info=True)
            raise

    @staticmethod
    def get_students_by_course(course):
        """Get students by course"""
        return get_all("student", where_clause="course = %s", params=[course])

    @staticmethod
    def get_students_by_year(year):
        """Get students by year"""
        return get_all("student", where_clause="year = %s", params=[year])

    @staticmethod
    def upload_profile_photo(student_id, file_data, filename):
        """Upload profile photo to Supabase Storage - FIXED: Delete old photo before uploading new one"""
        try:
            # Generate unique filename for new photo
            file_extension = os.path.splitext(filename)[1].lower()
            unique_filename = f"{student_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{file_extension}"

            logger.debug(f"Uploading photo: {unique_filename}")

            # Check if student already has a photo that needs to be deleted
            existing_student = Student.get_by_id(student_id)
            old_filename = None
            if existing_student and existing_student.get('profile_photo_filename'):
                old_filename = existing_student['profile_photo_filename']
                logger.debug(f"Found existing photo to delete: {old_filename}")

            # Upload new photo to Supabase Storage
            bucket = supabase_manager.get_service_role_client().storage.from_('student-photos')
            response = bucket.upload(unique_filename, file_data, {
                'content-type': f'image/{file_extension[1:]}'
            })

            if response:
                # Get public URL for new photo
                public_url = bucket.get_public_url(unique_filename)

                # Only delete old photo after new one is successfully uploaded
                if old_filename:
                    try:
                        logger.debug(f"Deleting old photo: {old_filename}")
                        bucket.remove([old_filename])
                        logger.info(f"Old photo deleted: {old_filename}")
                    except Exception as e:
                        logger.warning(f"Could not delete old photo {old_filename}: {e}")
                        # Don't fail the entire operation if old photo deletion fails

                # Update student record with new photo info
                update_record(
                    "student",
                    {
                        'profile_photo_url': public_url,
                        'profile_photo_filename': unique_filename,
                        'profile_photo_updated_at': datetime.utcnow().isoformat()
                    },
                    "id = %s",
                    params=[student_id]
                )

                logger.info(f"Photo uploaded and old photo cleaned up: {unique_filename}")

                return {
                    'success': True,
                    'url': public_url,
                    'filename': unique_filename
                }
            else:
                logger.error("Photo upload failed - no response")
                return {'success': False, 'error': 'Upload failed'}

        except Exception as e:
            logger.error(f"Error uploading photo: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    @staticmethod
    def delete_profile_photo(student_id, filename):
        """Delete profile photo from Supabase Storage"""
        try:
            logger.debug(f"Deleting photo: {filename}")

            bucket = supabase_manager.get_service_role_client().storage.from_('student-photos')
            response = bucket.remove([filename])

            if response:
                # Update student record to clear photo info
                update_record(
                    "student",
                    {
                        'profile_photo_url': None,
                        'profile_photo_filename': None
                    },
                    "id = %s",
                    params=[student_id]
                )

                logger.info(f"Photo deleted: {filename}")
                return {'success': True}
            else:
                logger.error("Photo deletion failed - no response")
                return {'success': False, 'error': 'Delete failed'}

        except Exception as e:
            logger.error(f"Error deleting photo: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_student_stats():
        """Get student statistics"""
        try:
            # Get stats by year
            year_query = "SELECT year, COUNT(*) as count FROM student GROUP BY year ORDER BY year"
            year_result = execute_raw_sql(year_query, fetch=True)

            # Get stats by course
            course_query = "SELECT course, COUNT(*) as count FROM student WHERE course IS NOT NULL GROUP BY course ORDER BY count DESC"
            course_result = execute_raw_sql(course_query, fetch=True)

            return {
                'by_year': [{'year': s['year'], 'count': s['count']} for s in year_result or []],
                'by_course': [{'course': s['course'], 'count': s['count']} for s in course_result or []]
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}", exc_info=True)
            return {'by_year': [], 'by_course': []}

    def __init__(self, student_id, firstname, lastname, course, year, gender, profile_photo_url=None, profile_photo_filename=None):
        """Initialize Student object"""
        self.id = student_id.upper()
        self.firstname = firstname
        self.lastname = lastname
        self.course = course
        self.year = year
        self.gender = gender
        self.profile_photo_url = profile_photo_url
        self.profile_photo_filename = profile_photo_filename

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'course': self.course,
            'year': self.year,
            'gender': self.gender,
            'profile_photo_url': self.profile_photo_url,
            'profile_photo_filename': self.profile_photo_filename
        }

    def __repr__(self):
        return f'<Student {self.firstname} {self.lastname} ({self.id})>'
