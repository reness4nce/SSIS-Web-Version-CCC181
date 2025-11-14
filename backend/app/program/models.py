from ..supabase import get_one, get_all, insert_record, update_record, delete_record, execute_raw_sql, count_records, supabase_manager
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
        """Get program statistics with student counts using optimized RPC query"""
        try:
            # Use optimized RPC function for single query efficiency
            result = supabase_manager.get_client().rpc('get_program_stats').execute()
            if result.data:
                return [
                    {
                        'code': item['program_code'],
                        'name': item['program_name'],
                        'college': item['college_code'],
                        'college_name': item['college_name'],
                        'student_count': item['student_count'] or 0
                    }
                    for item in result.data
                ]
            return []
        except Exception as e:
            print(f"RPC get_program_stats failed, falling back to individual queries: {e}")
            # Fallback to the old method if RPC fails
            try:
                programs_result = supabase_manager.get_client().table('program').select('code, name, college').execute()
                programs = programs_result.data or []

                stats = []
                for program in programs:
                    try:
                        student_count = Program.get_student_count(program['code'])
                        stats.append({
                            'code': program['code'],
                            'name': program['name'],
                            'college': program.get('college'),
                            'student_count': student_count
                        })
                    except Exception as e2:
                        print(f"Error getting student count for program {program['code']}: {e2}")
                        stats.append({
                            'code': program['code'],
                            'name': program['name'],
                            'college': program.get('college'),
                            'student_count': 0
                        })

                return stats
            except Exception as e2:
                print(f"Error getting program stats: {e2}")
                return []

    @staticmethod
    def get_programs_with_college_info():
        """Get all programs with college information using Supabase"""
        # Skip the view approach that renames fields and use direct approach
        try:
            # Get all programs with basic fields first
            programs_result = supabase_manager.get_client().table('program').select('code, name, college').execute()
            programs = programs_result.data or []
            
            if not programs:
                return []
            
            # Get unique college codes
            college_codes = list(set(p.get('college') for p in programs if p.get('college')))
            
            # Get college names for better display
            colleges_result = supabase_manager.get_client().table('college').select('code, name').in_('code', college_codes).execute()
            college_map = {c['code']: c['name'] for c in (colleges_result.data or [])}
            
            # Combine data ensuring correct field names for frontend
            combined_programs = []
            for program in programs:
                clean_program = {
                    'code': program.get('code', ''),
                    'name': program.get('name', ''),  # Ensure 'name' field, not 'program_name'
                    'college': program.get('college', ''),
                    'college_name': college_map.get(program.get('college'), '')
                }
                combined_programs.append(clean_program)
            
            print(f"✅ Successfully processed {len(combined_programs)} programs with correct field names")
            return combined_programs
            
        except Exception as e2:
            print(f"Error with manual approach: {e2}")
            # Final fallback: just return basic program data with correct field names
            try:
                result = supabase_manager.get_client().table('program').select('code, name, college').execute()
                programs = result.data or []
                for program in programs:
                    program['college_name'] = ''
                print(f"✅ Using final fallback: returning {len(programs)} programs with correct field structure")
                return programs
            except Exception as e3:
                print(f"Error with final fallback: {e3}")
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
