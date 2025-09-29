import random
from faker import Faker

# Corrected imports to work with the Flask CLI
from extensions import db
from models.college import College
from models.program import Program
from models.student import Student
from models.user import User
fake = Faker()

# --- Your excellent data lists are preserved here ---
COLLEGES_DATA = [('CCS', 'College of Computer Studies'), ('COE', 'College of Engineering'), ('CEBA', 'College of Business Administration'), ('CASS', 'College of Arts and Social Sciences'), ('CHS', 'College of Health Sciences'), ('CED', 'College of Education'), ('CSM', 'College of Science and Mathematics'), ('CON', 'College of Nursing'), ('CTE', 'College of Teacher Education'), ('CAF', 'College of Accountancy and Finance'), ('CITHM', 'College of International Tourism and Hospitality Management')]
PROGRAMS_DATA = [('BSCS', 'Bachelor of Science in Computer Science', 'CCS'), ('BSIT', 'Bachelor of Science in Information Technology', 'CCS'), ('BSIS', 'Bachelor of Science in Information Systems', 'CCS'), ('BSCA', 'Bachelor of Science in Computer Applications', 'CCS'), ('BSCE', 'Bachelor of Science in Civil Engineering', 'COE'), ('BSEE', 'Bachelor of Science in Electrical Engineering', 'COE'), ('BSME', 'Bachelor of Science in Mechanical Engineering', 'COE'), ('BSIE', 'Bachelor of Science in Industrial Engineering', 'COE'), ('BSECE', 'Bachelor of Science in Electronics and Communications Engineering', 'COE'), ('BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'CEBA'), ('BSBA-FM', 'Bachelor of Science in Business Administration Major in Financial Management', 'CEBA'), ('BSBA-HM', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'CEBA'), ('BSBA-OM', 'Bachelor of Science in Business Administration Major in Operations Management', 'CEBA'), ('AB-PSYC', 'Bachelor of Arts in Psychology', 'CAS'), ('BS-PSYC', 'Bachelor of Science in Psychology', 'CAS'), ('AB-ENGL', 'Bachelor of Arts in English', 'CAS'), ('BS-MATH', 'Bachelor of Science in Mathematics', 'CAS'), ('BS-BIOL', 'Bachelor of Science in Biology', 'CAS'), ('BS-CHEM', 'Bachelor of Science in Chemistry', 'CAS'), ('BS-PHYS', 'Bachelor of Science in Physics', 'CAS'), ('BSN', 'Bachelor of Science in Nursing', 'CON'), ('BEED', 'Bachelor of Elementary Education', 'CTE'), ('BSED-MATH', 'Bachelor of Secondary Education Major in Mathematics', 'CTE'), ('BSED-ENG', 'Bachelor of Secondary Education Major in English', 'CTE'), ('BSED-SCI', 'Bachelor of Secondary Education Major in Science', 'CTE'), ('BSED-SS', 'Bachelor of Secondary Education Major in Social Studies', 'CTE'), ('BSA', 'Bachelor of Science in Accountancy', 'CAF'), ('BSMA', 'Bachelor of Science in Management Accounting', 'CAF'), ('BSFA', 'Bachelor of Science in Financial Analysis', 'CAF'), ('BSTM', 'Bachelor of Science in Tourism Management', 'CITHM'), ('BSHM', 'Bachelor of Science in Hospitality Management', 'CITHM'), ('BSCM', 'Bachelor of Science in Culinary Management', 'CITHM')]
FILIPINO_FIRST_NAMES_MALE = ['Juan', 'Jose', 'Antonio', 'Pedro', 'Manuel', 'Francisco', 'Ricardo', 'Roberto', 'Luis', 'Carlos', 'Miguel', 'Rafael', 'Daniel', 'Fernando', 'Eduardo', 'Alejandro', 'Joaquin', 'Diego', 'Pablo', 'Sergio', 'Mario', 'Gabriel', 'Victor', 'Raul', 'Jorge', 'Marco', 'Angelo', 'Romeo', 'Emmanuel', 'Christopher', 'Mark', 'John', 'Michael', 'Joshua', 'Matthew', 'David', 'James', 'Ryan', 'Kevin', 'Neil']
FILIPINO_FIRST_NAMES_FEMALE = ['Maria', 'Ana', 'Carmen', 'Luz', 'Esperanza', 'Rosa', 'Josefa', 'Teresa', 'Gloria', 'Concepcion', 'Pilar', 'Elena', 'Cristina', 'Patricia', 'Angela', 'Beatriz', 'Isabel', 'Monica', 'Sandra', 'Diana', 'Michelle', 'Jennifer', 'Catherine', 'Christine', 'Stephanie', 'Andrea', 'Jessica', 'Nicole', 'Kimberly', 'Mary', 'Grace', 'Joy', 'Faith', 'Hope', 'Love', 'Princess', 'Angel', 'Precious', 'Heart', 'Divine']
FILIPINO_LAST_NAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andres', 'Marquez', 'Robles', 'Aquino', 'Dela Cruz', 'Ramos', 'Villanueva', 'Castillo', 'Morales', 'Ortiz', 'Ramirez', 'Flores', 'Hernandez', 'Gutierrez', 'Gonzales', 'Rodriguez', 'Perez', 'Sanchez', 'Romero', 'Rivera', 'Gomez', 'Francisco', 'Salvador', 'Mercado', 'Navarro', 'Aguilar', 'Diaz', 'Pascual', 'Soriano', 'Valdez', 'Santiago', 'Alvarez', 'Fernandez', 'Cabrera', 'Moreno', 'Herrera', 'Salazar', 'Jimenez', 'Castro', 'Vargas', 'Ruiz']
# --- End of data lists ---

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

def create_students(programs, target_count=300):
    # This function is preserved from your original file
    print(f"Creating {target_count} students...")
    # ... logic for creating students is preserved ...
    students = []
    program_codes = [p.code for p in programs]
    years = [2020, 2021, 2022, 2023, 2024]
    students_per_year = target_count // len(years)
    remaining_students = target_count % len(years)
    for year_idx, year in enumerate(years):
        year_student_count = students_per_year + (1 if year_idx < remaining_students else 0)
        existing_count = Student.query.filter(Student.id.like(f'{year}-%')).count()
        student_ids = [f'{year}-{(existing_count + i + 1):04d}' for i in range(year_student_count)]
        for i in range(year_student_count):
            gender = random.choice(['Male', 'Female'])
            firstname = random.choice(FILIPINO_FIRST_NAMES_MALE) if gender == 'Male' else random.choice(FILIPINO_FIRST_NAMES_FEMALE)
            lastname = random.choice(FILIPINO_LAST_NAMES)
            student = Student(id=student_ids[i], firstname=firstname, lastname=lastname, course=random.choice(program_codes), year=random.randint(1, 4), gender=gender)
            students.append(student)
    db.session.add_all(students)
    db.session.commit()
    print(f"Successfully created {len(students)} students")
    return students

def create_admin_users():
    """Create default admin users with SECURE hashed passwords."""
    print("Creating admin users...")
    
    admin_users = [
        ('admin', 'admin@ssis.edu.ph', 'admin123'),
        ('test', 'test@ssis.edu.ph', 'test123'),
        ('demo', 'demo@ssis.edu.ph', 'demo123'),
    ]
    
    new_users = []
    for username, email, password in admin_users:
        if not User.query.filter_by(username=username).first():
            # ** SECURITY UPGRADE **
            user = User(username=username, email=email)
            user.set_password(password) # Use the secure method
            new_users.append(user)
            db.session.add(user)
    
    if new_users:
        db.session.commit()
    print(f"Created/verified {len(admin_users)} admin users.")

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
