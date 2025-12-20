from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records

class College:
    """College model using Supabase operations"""

    @staticmethod
    def create_table():
        """Create college table if it doesn't exist"""
        create_table_query = """
            CREATE TABLE IF NOT EXISTS college (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
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
        query = "INSERT INTO college (code, name) VALUES (%s, %s) RETURNING *"
        return execute_raw_sql(query, params=[code, name], fetch=True)

    @staticmethod
    def update_college(college_id=None, college_code=None, name=None, new_code=None):
        """Update college information by ID or code"""
        if not college_id and not college_code:
            return None

        update_data = {}
        if name:
            update_data['name'] = name
        if new_code:
            update_data['code'] = new_code

        if not update_data:
            return None

        # Update by ID if provided, otherwise by code
        if college_id:
            where_clause = "id = %s"
            params = [college_id]  # FIXED: Use list for WHERE clause parameter
        else:
            where_clause = "code = %s"
            params = [college_code]  

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
        try:
            # Use PostgreSQL function to get college stats
            query = "SELECT student_count FROM get_college_stats() WHERE college_code = %s"
            result = execute_raw_sql(query, params=[college_code], fetch=True)
            if result and len(result) > 0:
                return result[0]['student_count'] or 0
            return 0
        except Exception as e:
            print(f"Error getting student count: {e}")
            return 0

    @staticmethod
    def get_college_stats():
        """Get college statistics with student counts"""
        try:
            # Use PostgreSQL function to get college stats
            query = "SELECT * FROM get_college_stats()"
            result = execute_raw_sql(query, fetch=True)
            return result or []
        except Exception as e:
            print(f"Error getting college stats: {e}")
            return []

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
