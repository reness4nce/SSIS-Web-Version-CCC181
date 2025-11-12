from ..supabase import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records, supabase_manager
from ..program.models import Program
from typing import Optional
import os
import uuid
from datetime import datetime

class Student:
    """Student model using Supabase operations with profile photo support"""

    @staticmethod
    def create_table():
        """Create student table if it doesn't exist"""
        # First ensure program table exists
        Program.create_table()

        create_table_query = """
            CREATE TABLE IF NOT EXISTS student (
                id VARCHAR(20) PRIMARY KEY,
                firstname VARCHAR(50) NOT NULL,
                lastname VARCHAR(50) NOT NULL,
                course VARCHAR(20) REFERENCES program(code) ON UPDATE CASCADE ON DELETE SET NULL,
                year INTEGER NOT NULL,
                gender VARCHAR(10) NOT NULL,
                profile_photo_url TEXT,
                profile_photo_filename TEXT,
                profile_photo_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """
        execute_raw_sql(create_table_query, commit=True)

    @staticmethod
    def get_by_id(student_id):
        """Get student by ID"""
        return get_one("student", where_clause="id = %s", params=[student_id])

    @staticmethod
    def get_all_students(limit=None, offset=None, course_filter=None, year_filter=None):
        """Get all students with optional filters"""
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
    def create_student(student_id, firstname, lastname, course, year, gender, profile_photo_url=None, profile_photo_filename=None):
        """Create a new student with optional profile photo"""
        student_data = {
            'id': student_id,
            'firstname': firstname,
            'lastname': lastname,
            'course': course,
            'year': year,
            'gender': gender,
            'profile_photo_url': profile_photo_url,
            'profile_photo_filename': profile_photo_filename,
            'profile_photo_updated_at': datetime.utcnow().isoformat()
        }
        return insert_record("student", student_data, returning="*")

    @staticmethod
    def update_student(student_id, firstname=None, lastname=None, course=None, year=None, gender=None, profile_photo_url=None, profile_photo_filename=None):
        """Update student information including profile photo"""
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
            return None

        return update_record(
            "student",
            update_data,
            "id = %s",
            params={**update_data, 'id': student_id}
        )

    @staticmethod
    def delete_student(student_id):
        """Delete a student (also delete associated photo from storage)"""
        # First get student info to check for photo
        student = Student.get_by_id(student_id)
        
        # Delete student record
        result = delete_record("student", "id = %s", params=[student_id])
        
        # If student had a photo, delete it from storage
        if student and student.get('profile_photo_url'):
            try:
                Student.delete_profile_photo(student_id, student['profile_photo_filename'])
            except Exception as e:
                print(f"Warning: Could not delete profile photo: {e}")
        
        return result

    @staticmethod
    def get_students_by_course(course):
        """Get all students in a specific course"""
        return get_all("student", where_clause="course = %s", params=[course])

    @staticmethod
    def get_students_by_year(year):
        """Get all students in a specific year"""
        return get_all("student", where_clause="year = %s", params=[year])

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
    def upload_profile_photo(student_id, file_data, filename):
        """Upload profile photo to Supabase Storage"""
        try:
            # Generate unique filename
            file_extension = os.path.splitext(filename)[1].lower()
            unique_filename = f"{student_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{file_extension}"
            
            # Upload to Supabase Storage
            bucket = supabase_manager.get_client().storage.from_('student-photos')
            response = bucket.upload(unique_filename, file_data, {
                'content-type': 'image/jpeg'
            })
            
            if response.data:
                # Get public URL
                public_url = bucket.get_public_url(unique_filename)
                
                # Update student record with photo info
                Student.update_student(
                    student_id,
                    profile_photo_url=public_url,
                    profile_photo_filename=unique_filename
                )
                
                return {
                    'success': True,
                    'url': public_url,
                    'filename': unique_filename
                }
            else:
                return {'success': False, 'error': 'Upload failed'}
                
        except Exception as e:
            print(f"Error uploading profile photo: {e}")
            return {'success': False, 'error': str(e)}

    @staticmethod
    def delete_profile_photo(student_id, filename):
        """Delete profile photo from Supabase Storage"""
        try:
            bucket = supabase_manager.get_client().storage.from_('student-photos')
            response = bucket.remove([filename])
            
            if response.data:
                # Update student record to remove photo info
                Student.update_student(
                    student_id,
                    profile_photo_url=None,
                    profile_photo_filename=None
                )
                return {'success': True}
            else:
                return {'success': False, 'error': 'Delete failed'}
                
        except Exception as e:
            print(f"Error deleting profile photo: {e}")
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_student_with_photo(student_id):
        """Get student with full photo information"""
        return get_one("student", where_clause="id = %s", params=[student_id])

    @staticmethod
    def get_student_stats():
        """Get student statistics using Supabase functions"""
        try:
            # Use Supabase RPC function or fallback to direct queries
            result = supabase_manager.get_client().rpc('get_student_stats').execute()
            if result.data:
                return {
                    'by_year': result.data.get('by_year', []),
                    'by_course': result.data.get('by_course', [])
                }
        except Exception as e:
            print(f"Error getting student stats via RPC: {e}")
        
        # Fallback to direct Supabase queries
        try:
            # Get year distribution
            year_stats = supabase_manager.get_client().table('student').select('year, count:id').group('year').execute()
            
            # Get course distribution  
            course_stats = supabase_manager.get_client().table('student').select('course, count:id').group('course').execute()
            
            return {
                'by_year': [{'year': stat['year'], 'count': stat['count']} for stat in year_stats.data or []],
                'by_course': [{'course': stat['course'], 'count': stat['count']} for stat in course_stats.data or []]
            }
        except Exception as e:
            print(f"Error getting student stats: {e}")
            return {'by_year': [], 'by_course': []}

    def __init__(self, student_id, firstname, lastname, course, year, gender, profile_photo_url=None, profile_photo_filename=None):
        """Initialize Student object with photo support"""
        self.id = student_id
        self.firstname = firstname
        self.lastname = lastname
        self.course = course
        self.year = year
        self.gender = gender
        self.profile_photo_url = profile_photo_url
        self.profile_photo_filename = profile_photo_filename
        self.profile_photo_updated_at = None

    def save(self):
        """Save student to database"""
        if hasattr(self, '_id') and self._id:
            # Update existing student
            return Student.update_student(
                self.id, self.firstname, self.lastname, self.course, 
                self.year, self.gender, self.profile_photo_url, self.profile_photo_filename
            )
        else:
            # Create new student
            result = Student.create_student(
                self.id, self.firstname, self.lastname, self.course, 
                self.year, self.gender, self.profile_photo_url, self.profile_photo_filename
            )
            if result:
                self._id = result['id']
                return True
            return False

    def to_dict(self):
        """Convert student to dictionary"""
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'course': self.course,
            'year': self.year,
            'gender': self.gender,
            'profile_photo_url': self.profile_photo_url,
            'profile_photo_filename': self.profile_photo_filename,
            'profile_photo_updated_at': self.profile_photo_updated_at
        }

    def __repr__(self):
        return f'<Student {self.firstname} {self.lastname} ({self.id})>'
