from ..supabase import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records, supabase_manager
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
        Get filtered students with sorting (HIGH PRIORITY #3)
        Moves filtering to database level for better performance
        FIXED: Uses Supabase client directly to avoid order clause issues
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

            desc = order_direction.upper() == 'DESC'

            logger.debug(f"Fetching students: where={where_clause}, order={order_by} {order_direction}, limit={limit}, offset={offset}")

            # Use Supabase client directly for proper query building
            query = supabase_manager.get_client().table('student').select('*')

            # Apply where clause if provided
            if where_clause and params:
                # Handle ILIKE searches
                if 'ILIKE' in where_clause.upper():
                    search_term = params[0].replace('%', '') if params else ''
                    
                    if 'OR' in where_clause.upper():
                        # Multiple field search - use .or_() filter
                        # Extract field names from where_clause
                        # Example: "(id ILIKE %s OR firstname ILIKE %s OR lastname ILIKE %s OR course ILIKE %s)"
                        fields = []
                        if 'id ILIKE' in where_clause:
                            fields.append(f'id.ilike.%{search_term}%')
                        if 'firstname ILIKE' in where_clause:
                            fields.append(f'firstname.ilike.%{search_term}%')
                        if 'lastname ILIKE' in where_clause:
                            fields.append(f'lastname.ilike.%{search_term}%')
                        if 'course ILIKE' in where_clause:
                            fields.append(f'course.ilike.%{search_term}%')
                        
                        if fields:
                            query = query.or_(','.join(fields))
                    else:
                        # Single field search
                        # Extract field name
                        field_match = where_clause.split()[0]
                        query = query.ilike(field_match, f'%{search_term}%')
                
                elif '=' in where_clause:
                    # Exact match filters (course, year)
                    if 'course' in where_clause and params:
                        query = query.eq('course', params[0])
                    if 'year' in where_clause and params:
                        year_param = params[-1] if len(params) > 0 else params[0]
                        query = query.eq('year', year_param)

            # Apply ordering (FIXED: separate column and direction)
            query = query.order(order_by, desc=desc)

            # Apply pagination
            if offset is not None and limit:
                end = offset + limit - 1
                query = query.range(offset, end)
            elif limit:
                query = query.limit(limit)

            # Execute query
            result = query.execute()
            
            logger.debug(f"Query returned {len(result.data) if result.data else 0} students")
            
            return result.data if result.data else []

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
        """Count students matching filter (HIGH PRIORITY #3) - FIXED"""
        try:
            # Use Supabase client directly for accurate counting
            query = supabase_manager.get_client().table('student').select('*', count='exact')

            # Apply same filters as get_all_students_filtered
            if where_clause and params:
                if 'ILIKE' in where_clause.upper():
                    search_term = params[0].replace('%', '') if params else ''
                    
                    if 'OR' in where_clause.upper():
                        fields = []
                        if 'id ILIKE' in where_clause:
                            fields.append(f'id.ilike.%{search_term}%')
                        if 'firstname ILIKE' in where_clause:
                            fields.append(f'firstname.ilike.%{search_term}%')
                        if 'lastname ILIKE' in where_clause:
                            fields.append(f'lastname.ilike.%{search_term}%')
                        if 'course ILIKE' in where_clause:
                            fields.append(f'course.ilike.%{search_term}%')
                        
                        if fields:
                            query = query.or_(','.join(fields))
                    else:
                        field_match = where_clause.split()[0]
                        query = query.ilike(field_match, f'%{search_term}%')
                
                elif '=' in where_clause:
                    if 'course' in where_clause and params:
                        query = query.eq('course', params[0])
                    if 'year' in where_clause and params:
                        year_param = params[-1] if len(params) > 0 else params[0]
                        query = query.eq('year', year_param)

            result = query.execute()
            return result.count if hasattr(result, 'count') else len(result.data or [])

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
    def update_student(student_id, firstname=None, lastname=None, course=None, year=None, gender=None, profile_photo_url=None, profile_photo_filename=None):
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
            
            logger.info(f"Student updated: {student_id}")
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
        """Upload profile photo to Supabase Storage"""
        try:
            # Generate unique filename
            file_extension = os.path.splitext(filename)[1].lower()
            unique_filename = f"{student_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{file_extension}"

            logger.debug(f"Uploading photo: {unique_filename}")

            # Upload to Supabase Storage
            bucket = supabase_manager.get_service_role_client().storage.from_('student-photos')
            response = bucket.upload(unique_filename, file_data, {
                'content-type': f'image/{file_extension[1:]}'
            })

            if response:
                # Get public URL
                public_url = bucket.get_public_url(unique_filename)

                # Update student record
                Student.update_student(
                    student_id,
                    profile_photo_url=public_url,
                    profile_photo_filename=unique_filename
                )

                logger.info(f"Photo uploaded: {unique_filename}")

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
                # Update student record
                Student.update_student(
                    student_id,
                    profile_photo_url=None,
                    profile_photo_filename=None
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
            # Try RPC function first
            result = supabase_manager.get_client().rpc('get_student_stats').execute()
            if result.data:
                return {
                    'by_year': result.data.get('by_year', []),
                    'by_course': result.data.get('by_course', [])
                }
        except Exception as e:
            logger.debug(f"RPC stats not available, using fallback: {e}")

        # Fallback to direct queries
        try:
            year_stats = supabase_manager.get_client().table('student').select('year, count:id').group('year').execute()
            course_stats = supabase_manager.get_client().table('student').select('course, count:id').group('course').execute()

            return {
                'by_year': [{'year': s['year'], 'count': s['count']} for s in year_stats.data or []],
                'by_course': [{'course': s['course'], 'count': s['count']} for s in course_stats.data or []]
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
