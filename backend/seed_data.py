import random
from faker import Faker

from app.extensions import db
from app.models.college import College
from app.models.program import Program
from app.models.student import Student
from app.models.user import User
fake = Faker()

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
    # This function is preserved from your original file
    print("Creating colleges...")
    colleges = [College(code=code, name=name) for code, name in COLLEGES_DATA]
    db.session.add_all(colleges)
    db.session.commit()
    print(f"Created {len(colleges)} colleges")
    return colleges

def create_programs():
    # This function is preserved from your original file
    print("Creating programs...")
    # In your model, Program.college is a string code, which is fine
    programs = [Program(code=code, name=name, college=college_code) for code, name, college_code in PROGRAMS_DATA]
    db.session.add_all(programs)
    db.session.commit()
    print(f"Created {len(programs)} programs")
    return programs

def create_students(programs, target_count=None):
    """
    Create students with organized data structure.

    Args:
        programs: List of Program objects
        target_count: Number of students to create (uses config default if None)
    """
    if target_count is None:
        target_count = STUDENT_GENERATION_CONFIG['default_student_count']

    print(f"Creating {target_count} students...")

    students = []
    program_codes = [p.code for p in programs]
    years = STUDENT_GENERATION_CONFIG['academic_years']
    year_levels = STUDENT_GENERATION_CONFIG['year_levels']
    gender_options = STUDENT_GENERATION_CONFIG['gender_options']

    students_per_year = target_count // len(years)
    remaining_students = target_count % len(years)

    for year_idx, year in enumerate(years):
        year_student_count = students_per_year + (1 if year_idx < remaining_students else 0)
        existing_count = Student.query.filter(Student.id.like(f'{year}-%')).count()
        student_ids = [f'{year}-{(existing_count + i + 1):04d}' for i in range(year_student_count)]

        for i in range(year_student_count):
            gender = random.choice(gender_options)
            firstname = random.choice(FILIPINO_FIRST_NAMES_MALE) if gender == 'Male' else random.choice(FILIPINO_FIRST_NAMES_FEMALE)
            lastname = random.choice(FILIPINO_LAST_NAMES)
            student = Student(
                id=student_ids[i],
                firstname=firstname,
                lastname=lastname,
                course=random.choice(program_codes),
                year=random.choice(year_levels),
                gender=gender
            )
            students.append(student)

    db.session.add_all(students)
    db.session.commit()
    print(f"✅ Successfully created {len(students)} students")
    return students

def create_admin_users():
    """Create default admin users with SECURE hashed passwords using organized data."""
    print("Creating admin users...")

    new_users = []
    for username, email, password in DEFAULT_ADMIN_USERS:
        if not User.query.filter_by(username=username).first():
            # ** SECURITY UPGRADE **
            user = User(username=username, email=email)
            user.set_password(password) # Use the secure method
            new_users.append(user)
            db.session.add(user)

    if new_users:
        db.session.commit()
    print(f"✅ Created/verified {len(DEFAULT_ADMIN_USERS)} admin users.")

def seed_database():
    """Main seeding function, designed to be called via Flask CLI."""
    print("Starting database seeding...")
    try:
        if College.query.count() > 0:
            print("Database already has data. Skipping seeding.")
            return
        
        create_colleges()
        create_programs()
        create_students(Program.query.all(), target_count=350)
        create_admin_users()
        
        print("\n=== Database Seeding Complete ===")
        print("\n=== Login Credentials ===")
        print("Username: admin | Password: admin123")
        print("Username: test  | Password: test123")
        print("Username: demo  | Password: demo123")
        
    except Exception as e:
        print(f"Error during seeding: {str(e)}")
        db.session.rollback()
        raise
