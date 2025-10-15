from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records
from ..college.models import College

class Program:
    """Program model using raw SQL operations"""

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
    def update_program(program_code, name=None, college=None):
        """Update program information"""
        update_data = {}
        if name:
            update_data['name'] = name
        if college:
            update_data['college'] = college

        if not update_data:
            return None

        return update_record(
            "program",
            update_data,
            "code = %s",
            params={**update_data, 'code': program_code}
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
        """Get program statistics"""
        stats_query = """
            SELECT
                p.code,
                p.name,
                p.college,
                c.name as college_name,
                COUNT(s.id) as student_count
            FROM program p
            LEFT JOIN college c ON p.college = c.code
            LEFT JOIN student s ON p.code = s.course
            GROUP BY p.code, p.name, p.college, c.name
            ORDER BY p.college, p.code
        """
        return execute_raw_sql(stats_query, fetch=True)

    @staticmethod
    def get_programs_with_college_info():
        """Get all programs with college information"""
        query = """
            SELECT p.code, p.name, p.college, c.name as college_name
            FROM program p
            LEFT JOIN college c ON p.college = c.code
            ORDER BY c.name, p.name
        """
        return execute_raw_sql(query, fetch=True)

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
