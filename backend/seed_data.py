import random

from app.college.models import College
from app.program.models import Program
from app.student.models import Student
from app.auth.models import User
from app.database import count_records, get_all, execute_raw_sql

COLLEGES_DATA = [
    ('CASS', 'College of Arts and Social Sciences'),   
    ('CCS', 'College of Computer Studies'),            
    ('CEBA', 'College of Business Economics and Accountancy'),  
    ('CED', 'College of Education'),                    
    ('CHS', 'College of Health Sciences'),              
    ('COE', 'College of Engineering'),                  
    ('CSM', 'College of Science and Mathematics'),      
]

PROGRAMS_DATA = [
    # 🖥️  CCS - College of Computer Studies 
    ('BSCA', 'Bachelor of Science in Computer Applications', 'CCS'),
    ('BSCS', 'Bachelor of Science in Computer Science', 'CCS'),
    ('BSIS', 'Bachelor of Science in Information Systems', 'CCS'),
    ('BSIT', 'Bachelor of Science in Information Technology', 'CCS'),

    # 🏗️  COE - College of Engineering 
    ('BSCE', 'Bachelor of Science in Civil Engineering', 'COE'),
    ('BSECE', 'Bachelor of Science in Electronics and Communications Engineering', 'COE'),
    ('BSEE', 'Bachelor of Science in Electrical Engineering', 'COE'),
    ('BSIE', 'Bachelor of Science in Industrial Engineering', 'COE'),
    ('BSME', 'Bachelor of Science in Mechanical Engineering', 'COE'),

    # 💼 CEBA - College of Business Economics and Accountancy 
    ('BSBA-FM', 'Bachelor of Science in Business Administration Major in Financial Management', 'CEBA'),
    ('BSBA-HM', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'CEBA'),
    ('BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'CEBA'),
    ('BSBA-OM', 'Bachelor of Science in Business Administration Major in Operations Management', 'CEBA'),
    ('BSA', 'Bachelor of Science in Accountancy', 'CEBA'),
    ('BSEcon', 'Bachelor of Science in Economics', 'CEBA'),
    ('BSEntrep', 'Bachelor of Science in Entrepreneurship', 'CEBA'),

    # 🎭 CASS - College of Arts and Social Sciences 
    ('AB-ENGL', 'Bachelor of Arts in English', 'CASS'),
    ('AB-PSYC', 'Bachelor of Arts in Psychology', 'CASS'),
    ('BS-PSYC', 'Bachelor of Science in Psychology', 'CASS'),

    # 🏥 CHS - College of Health Sciences
    ('BSN', 'Bachelor of Science in Nursing', 'CHS'),

    # 📚 CED - College of  Education (6 programs)
    ('BEED', 'Bachelor of Elementary Education', 'CED'),
    ('BSED-ENG', 'Bachelor of Secondary Education Major in English', 'CED'),
    ('BSED-MATH', 'Bachelor of Secondary Education Major in Mathematics', 'CED'),
    ('BSED-SCI', 'Bachelor of Secondary Education Major in Science', 'CED'),
    ('BSED-SS', 'Bachelor of Secondary Education Major in Social Studies', 'CED'),
]

# ================================================================================
# 👥 FILIPINO NAMES DATA - Alphabetically Sorted within Categories
# ================================================================================
# Comprehensive lists of authentic Filipino names for student generation
# All names are sorted alphabetically for easy reference and maintenance
# ================================================================================

# Masculine Filipino First Names (40 names)
FILIPINO_FIRST_NAMES_MALE = [
    'Alejandro', 'Angelo', 'Antonio', 'Carlos', 'Christopher', 'Daniel', 'David',
    'Diego', 'Eduardo', 'Emmanuel', 'Fernando', 'Francisco', 'Gabriel', 'James',
    'Joaquin', 'John', 'Jorge', 'Jose', 'Joshua', 'Juan', 'Kevin', 'Luis',
    'Manuel', 'Marco', 'Mario', 'Mark', 'Matthew', 'Michael', 'Miguel', 'Neil',
    'Pablo', 'Pedro', 'Rafael', 'Raul', 'Ricardo', 'Roberto', 'Romeo', 'Ryan',
    'Sergio', 'Victor'
]

# Feminine Filipino First Names (40 names)
FILIPINO_FIRST_NAMES_FEMALE = [
    'Ana', 'Andrea', 'Angel', 'Angela', 'Beatriz', 'Carmen', 'Catherine', 'Christine',
    'Concepcion', 'Cristina', 'Diana', 'Divine', 'Elena', 'Esperanza', 'Faith',
    'Gloria', 'Grace', 'Heart', 'Hope', 'Isabel', 'Jessica', 'Jennifer', 'Josefa',
    'Joy', 'Kimberly', 'Love', 'Luz', 'Maria', 'Mary', 'Michelle', 'Monica',
    'Nicole', 'Patricia', 'Pilar', 'Precious', 'Princess', 'Rosa', 'Sandra',
    'Stephanie', 'Teresa'
]

# Filipino Last Names (50 names) - Common surnames in the Philippines
FILIPINO_LAST_NAMES = [
    'Aguilar', 'Alvarez', 'Andres', 'Aquino', 'Bautista', 'Cabrera', 'Castillo',
    'Castro', 'Cruz', 'Dela Cruz', 'Diaz', 'Fernandez', 'Flores', 'Francisco',
    'Garcia', 'Gomez', 'Gonzales', 'Gutierrez', 'Hernandez', 'Herrera', 'Jimenez',
    'Marquez', 'Mercado', 'Mendoza', 'Morales', 'Moreno', 'Navarro', 'Ocampo',
    'Ortiz', 'Pascual', 'Perez', 'Ramirez', 'Ramos', 'Reyes', 'Rivera', 'Robles',
    'Rodriguez', 'Romero', 'Ruiz', 'Salazar', 'Salvador', 'Sanchez', 'Santiago',
    'Santos', 'Soriano', 'Tomas', 'Torres', 'Valdez', 'Vargas', 'Villanueva'
]

# ================================================================================
# 📊 STUDENT GENERATION SETTINGS
# ================================================================================
# Configuration parameters for student creation process
# ================================================================================
STUDENT_GENERATION_CONFIG = {
    'default_student_count': 350,
    'academic_years': [2020, 2021, 2022, 2023, 2024],
    'year_levels': [1, 2, 3, 4],
    'gender_options': ['Male', 'Female']
}

# ================================================================================
# 🔐 ADMIN USER CREDENTIALS
# ================================================================================
# Default administrator accounts for system access
# ================================================================================
DEFAULT_ADMIN_USERS = [
    ('admin', 'admin@ssis.edu.ph', 'admin123'),
    ('test', 'test@ssis.edu.ph', 'test123'),
    ('demo', 'demo@ssis.edu.ph', 'demo123'),
]

# ====================================================================================
# End of Organized Data Lists
# ====================================================================================

def create_colleges():
    """Create colleges, checking for existing records first"""
    print("Creating colleges...")
    created_count = 0

    for code, name in COLLEGES_DATA:
        # Check if college already exists
        existing_college = College.get_by_code(code)
        if existing_college:
            print(f"  ✓ College '{code}' already exists, skipping...")
            continue

        # Create new college
        try:
            result = College.create_college(code, name)
            if result:
                created_count += 1
                print(f"  ✓ Created college '{code}': {name}")
            else:
                print(f"  ✗ Failed to create college '{code}'")
        except Exception as e:
            print(f"  ✗ Error creating college '{code}': {str(e)}")

    print(f"Created {created_count} new colleges")
    return COLLEGES_DATA

def create_programs():
    """Create programs, checking for existing records first"""
    print("Creating programs...")
    created_count = 0

    for code, name, college_code in PROGRAMS_DATA:
        # Check if program already exists
        existing_program = Program.get_by_code(code)
        if existing_program:
            print(f"  ✓ Program '{code}' already exists, skipping...")
            continue

        # Create new program
        try:
            result = Program.create_program(code, name, college_code)
            if result:
                created_count += 1
                print(f"  ✓ Created program '{code}': {name}")
            else:
                print(f"  ✗ Failed to create program '{code}'")
        except Exception as e:
            print(f"  ✗ Error creating program '{code}': {str(e)}")

    print(f"Created {created_count} new programs")
    return PROGRAMS_DATA

def create_students(program_codes, target_count=None):
    """
    Create students with organized data structure, checking for existing records first.

    Args:
        program_codes: List of program code strings
        target_count: Number of students to create (uses config default if None)
    """
    if target_count is None:
        target_count = STUDENT_GENERATION_CONFIG['default_student_count']

    print(f"Creating {target_count} students...")
    created_count = 0

    years = STUDENT_GENERATION_CONFIG['academic_years']
    year_levels = STUDENT_GENERATION_CONFIG['year_levels']
    gender_options = STUDENT_GENERATION_CONFIG['gender_options']

    students_per_year = target_count // len(years)
    remaining_students = target_count % len(years)

    # Simple approach: just create sequential IDs starting from 1 for each year
    for year_idx, year in enumerate(years):
        year_student_count = students_per_year + (1 if year_idx < remaining_students else 0)

        for i in range(year_student_count):
            student_id = f'{year}-{(i + 1):04d}'

            # Check if student already exists
            existing_student = Student.get_by_id(student_id)
            if existing_student:
                print(f"  ✓ Student '{student_id}' already exists, skipping...")
                continue

            gender = random.choice(gender_options)
            firstname = random.choice(FILIPINO_FIRST_NAMES_MALE) if gender == 'Male' else random.choice(FILIPINO_FIRST_NAMES_FEMALE)
            lastname = random.choice(FILIPINO_LAST_NAMES)

            # Create new student
            try:
                result = Student.create_student(
                    student_id=student_id,
                    firstname=firstname,
                    lastname=lastname,
                    course=random.choice(program_codes),
                    year=random.choice(year_levels),
                    gender=gender
                )
                if result:
                    created_count += 1
                    print(f"  ✓ Created student '{student_id}': {firstname} {lastname}")
                else:
                    print(f"  ✗ Failed to create student '{student_id}'")
            except Exception as e:
                print(f"  ✗ Error creating student '{student_id}': {str(e)}")

    print(f"Created {created_count} new students")
    return created_count

def create_admin_users():
    """Create default admin users, checking for existing records first"""
    print("Creating admin users...")
    created_count = 0

    for username, email, password in DEFAULT_ADMIN_USERS:
        # Check if user already exists
        existing_user = User.get_by_username(username)
        if existing_user:
            print(f"  ✓ User '{username}' already exists, skipping...")
            continue

        # Create new user
        try:
            result = User.create_user(username, email, password)
            if result:
                created_count += 1
                print(f"  ✓ Created user '{username}': {email}")
            else:
                print(f"  ✗ Failed to create user '{username}'")
        except Exception as e:
            print(f"  ✗ Error creating user '{username}': {str(e)}")

    print(f"Created {created_count} new admin users")

def seed_database():
    """Main seeding function, designed to be called via Flask CLI."""
    print("Starting database seeding...")
    try:
        # Check if data already exists using raw SQL
        college_count = count_records("college")
        # Temporarily force reseed for testing
        # if college_count > 0:
        #     print("Database already has data. Skipping seeding.")
        #     return

        create_colleges()
        create_programs()

        # Get program codes for student creation
        programs_result = execute_raw_sql("SELECT code FROM program", fetch=True)
        program_codes = [p['code'] for p in programs_result] if programs_result else []

        if program_codes:
            create_students(program_codes, target_count=350)

        create_admin_users()

        print("\n=== Database Seeding Complete ===")
        print("\n=== Login Credentials ===")
        print("Username: admin | Password: admin123")
        print("Username: test  | Password: test123")
        print("Username: demo  | Password: demo123")

    except Exception as e:
        print(f"Error during seeding: {str(e)}")
        raise
