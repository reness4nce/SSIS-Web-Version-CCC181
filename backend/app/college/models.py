from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records

class College:
    """College model using raw SQL operations"""

    @staticmethod
    def create_table():
        """Create college table if it doesn't exist"""
        create_table_query = """
            CREATE TABLE IF NOT EXISTS college (
                code VARCHAR(20) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        execute_raw_sql(create_table_query, commit=True)

    @staticmethod
    def get_by_id(college_id):
        """Get college by uniqueID"""
        return get_one("college", where_clause="id = %s", params=[college_id])

    @staticmethod
    def get_by_code(college_code):
        """Get college by code"""
        return get_one("college", where_clause="code = %s", params=[college_code])

    @staticmethod
    def get_all_colleges():
        """Get all colleges"""
        return get_all("college")

    @staticmethod
    def create_college(code, name):
        """Create a new college"""
        college_data = {
            'code': code,
            'name': name
        }
        return insert_record("college", college_data, returning="*")

    @staticmethod
    def update_college(college_id=None, college_code=None, name=None):
        """Update college information by ID or code"""
        if not college_id and not college_code:
            return None

        update_data = {}
        if name:
            update_data['name'] = name

        if not update_data:
            return None

        # Update by ID if provided, otherwise by code
        if college_id:
            where_clause = "id = %s"
            params = {**update_data, 'id': college_id}
        else:
            where_clause = "code = %s"
            params = {**update_data, 'code': college_code}

        return update_record("college", update_data, where_clause, params=params)

    @staticmethod
    def delete_college(college_id=None, college_code=None):
        """Delete a college by ID or code"""
        if not college_id and not college_code:
            return None

        # Delete by ID if provided, otherwise by code
        if college_id:
            return delete_record("college", "id = %s", params=[college_id])
        else:
            return delete_record("college", "code = %s", params=[college_code])

    @staticmethod
    def get_programs(college_code):
        """Get all programs for a college"""
        return get_all("program", where_clause="college = %s", params=[college_code])

    @staticmethod
    def get_student_count(college_code):
        """Get total number of students in a college"""
        count_query = """
            SELECT COUNT(DISTINCT s.id) as count
            FROM student s
            JOIN program p ON s.course = p.code
            WHERE p.college = %s
        """
        result = execute_raw_sql(count_query, params=[college_code], fetch=True)
        return result[0]['count'] if result else 0

    @staticmethod
    def get_college_stats():
        """Get college statistics"""
        stats_query = """
            SELECT
                c.id,
                c.code,
                c.name,
                COUNT(DISTINCT p.code) as program_count,
                COUNT(DISTINCT s.id) as student_count
            FROM college c
            LEFT JOIN program p ON c.code = p.college
            LEFT JOIN student s ON p.code = s.course
            GROUP BY c.id, c.code, c.name
            ORDER BY c.code
        """
        return execute_raw_sql(stats_query, fetch=True)

    def __init__(self, code, name, unique_id=None):
        """Initialize College object"""
        self.id = unique_id
        self.code = code
        self.name = name

    def save(self):
        """Save college to database"""
        if self.id:
            # Update existing college by ID
            return College.update_college(college_id=self.id, name=self.name)
        elif hasattr(self, '_code') and self._code:
            # Update existing college by code
            return College.update_college(college_code=self.code, name=self.name)
        else:
            # Create new college
            result = College.create_college(self.code, self.name)
            if result:
                self.id = result['id']
                self._code = result['code']
                return True
            return False

    def to_dict(self):
        """Convert college to dictionary"""
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name
        }

    def __repr__(self):
        return f'<College {self.code}: {self.name}>'
