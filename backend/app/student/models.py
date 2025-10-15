from ..database import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records
from ..program.models import Program

class Student:
    """Student model using raw SQL operations"""

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    def create_student(student_id, firstname, lastname, course, year, gender):
        """Create a new student"""
        student_data = {
            'id': student_id,
            'firstname': firstname,
            'lastname': lastname,
            'course': course,
            'year': year,
            'gender': gender
        }
        return insert_record("student", student_data, returning="*")

    @staticmethod
    def update_student(student_id, firstname=None, lastname=None, course=None, year=None, gender=None):
        """Update student information"""
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
        """Delete a student"""
        return delete_record("student", "id = %s", params=[student_id])

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
    def get_student_stats():
        """Get student statistics"""
        # Get year distribution
        year_stats_query = """
            SELECT year, COUNT(*) as count
            FROM student
            GROUP BY year
            ORDER BY year
        """
        year_stats = execute_raw_sql(year_stats_query, fetch=True)

        # Get course distribution
        course_stats_query = """
            SELECT course, COUNT(*) as count
            FROM student
            GROUP BY course
            ORDER BY course
        """
        course_stats = execute_raw_sql(course_stats_query, fetch=True)

        return {
            'by_year': [{'year': stat['year'], 'count': stat['count']} for stat in year_stats or []],
            'by_course': [{'course': stat['course'], 'count': stat['count']} for stat in course_stats or []]
        }

    def __init__(self, student_id, firstname, lastname, course, year, gender):
        """Initialize Student object"""
        self.id = student_id
        self.firstname = firstname
        self.lastname = lastname
        self.course = course
        self.year = year
        self.gender = gender

    def save(self):
        """Save student to database"""
        if hasattr(self, '_id') and self._id:
            # Update existing student
            return Student.update_student(self.id, self.firstname, self.lastname, self.course, self.year, self.gender)
        else:
            # Create new student
            result = Student.create_student(self.id, self.firstname, self.lastname, self.course, self.year, self.gender)
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
            'gender': self.gender
        }

    def __repr__(self):
        return f'<Student {self.firstname} {self.lastname} ({self.id})>'
