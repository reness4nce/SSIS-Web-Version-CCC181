from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records
from ..college.models import College

class Program:
    """Program model using Supabase operations"""

    @staticmethod
    def create_table():
        """Create program table if it doesn't exist"""
        # First ensure college table exists
        College.create_table()

        create_table_query = """
            CREATE TABLE IF NOT EXISTS program (
                code VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                college VARCHAR(20) REFERENCES college(code) ON UPDATE CASCADE ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        execute_raw_sql(create_table_query, commit=True)

    @staticmethod
    def get_by_code(program_code):
        """Get program by code (case-insensitive)"""
        return get_one("program", where_clause="UPPER(code) = %s", params=[program_code.upper()])

    @staticmethod
    def get_all_programs():
        """Get all programs"""
        return get_all("program")

    @staticmethod
    def get_programs_by_college(college_code):
        """Get all programs for a specific college"""
        return get_all("program", where_clause="college = %s", params=[college_code])

    @staticmethod
    def create_program(code, name, college):
        """Create a new program"""
        program_data = {
            'code': code,
            'name': name,
            'college': college
        }
        return insert_record("program", program_data, returning="*")

    @staticmethod
    def update_program(program_code, name=None, college=None, code=None):
        """Update program information"""
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if college is not None:
            update_data['college'] = college
        if code is not None:
            update_data['code'] = code

        if not update_data:
            return None

        return update_record(
            "program",
            update_data,
            "code = %s",
            params=[program_code]
        )

    @staticmethod
    def delete_program(program_code):
        """Delete a program"""
        return delete_record("program", "code = %s", params=[program_code])

    @staticmethod
    def get_students(program_code):
        """Get all students in a program (case-insensitive)"""
        return get_all("student", where_clause="UPPER(course) = %s", params=[program_code.upper()])

    @staticmethod
    def get_student_count(program_code):
        """Get number of students in a program (case-insensitive)"""
        return count_records("student", where_clause="UPPER(course) = %s", params=[program_code.upper()])

    @staticmethod
    def get_program_stats():
        """Get program statistics with student counts"""
        try:
            # Use PostgreSQL function to get program stats
            query = "SELECT * FROM get_program_stats()"
            result = execute_raw_sql(query, fetch=True)
            return result or []
        except Exception as e:
            print(f"Error getting program stats: {e}")
            return []

    @staticmethod
    def get_programs_with_college_info():
        """Get all programs with college information"""
        try:
            # Use JOIN query to get programs with college info
            query = """
                SELECT p.code, p.name, p.college, c.name as college_name
                FROM program p
                LEFT JOIN college c ON p.college = c.code
            """
            result = execute_raw_sql(query, fetch=True)
            return result or []
        except Exception as e:
            print(f"Error getting programs with college info: {e}")
            return []

    def __init__(self, code, name, college):
        """Initialize Program object"""
        self.code = code
        self.name = name
        self.college = college

    def save(self):
        """Save program to database"""
        if hasattr(self, '_code') and self._code:
            # Update existing program
            return Program.update_program(self.code, self.name, self.college)
        else:
            # Create new program
            result = Program.create_program(self.code, self.name, self.college)
            if result:
                self._code = result['code']
                return True
            return False

    def to_dict(self):
        """Convert program to dictionary"""
        return {
            'code': self.code,
            'name': self.name,
            'college': self.college
        }

    def to_dict_with_college_name(self):
        """Convert program to dictionary with college name"""
        college = College.get_by_code(self.college)
        return {
            'code': self.code,
            'name': self.name,
            'college': self.college,
            'college_name': college['name'] if college else None
        }

    def __repr__(self):
        return f'<Program {self.code}: {self.name} ({self.college})>'
