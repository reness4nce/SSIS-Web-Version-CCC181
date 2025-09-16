import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from extensions import db
from sqlalchemy import or_

# Initialize Flask app
app = Flask(__name__, instance_relative_config=True)
CORS(app) # Enable CORS for all routes

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(app.instance_path, 'sis.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False    

# Initialize SQLAlchemy
db.init_app(app)

# Import models *after* db is initialized
from models.college import College
from models.program import Program
from models.student import Student

# --- Helper Functions ---
def model_to_dict(model):
    """Converts a SQLAlchemy model instance to a dictionary."""
    d = {}
    for column in model.__table__.columns:
        d[column.name] = str(getattr(model, column.name))
    return d

def generate_student_id(year):
    """Generates a new student ID for a given year."""
    last_student = Student.query.filter(Student.id.like(f"{year}-%")).order_by(Student.id.desc()).first()
    if last_student:
        last_serial = int(last_student.id.split('-')[1])
        new_serial = last_serial + 1
        return f"{year}-{new_serial:04d}"
    else:
        return f"{year}-0001"

# --- Routes ---

@app.route("/")
def index():
    return jsonify({"message": "Simple Student Information System - Web Version API is running!"})

# --- College Routes ---

@app.route("/colleges", methods=['GET', 'POST'])
def handle_colleges():
    if request.method == 'POST':
        data = request.get_json()
        if not data or not 'code' in data or not 'name' in data:
            return jsonify({"error": "Missing required fields"}), 400
        if College.query.get(data['code']):
            return jsonify({"error": "College with this code already exists"}), 400

        new_college = College(code=data['code'], name=data['name'])
        db.session.add(new_college)
        db.session.commit()
        return jsonify(model_to_dict(new_college)), 201

    if request.method == 'GET':
        colleges = College.query.all()
        return jsonify([model_to_dict(c) for c in colleges])

@app.route("/colleges/<code>", methods=['GET', 'PUT', 'DELETE'])
def handle_college(code):
    college = College.query.get_or_404(code)

    if request.method == 'GET':
        return jsonify(model_to_dict(college))

    if request.method == 'PUT':
        data = request.get_json()
        if 'name' in data:
            college.name = data['name']
        db.session.commit()
        return jsonify(model_to_dict(college))

    if request.method == 'DELETE':
        # Check if there are programs associated with this college
        if Program.query.filter_by(college_code=code).first():
            return jsonify({"error": "Cannot delete college with associated programs"}), 400
        db.session.delete(college)
        db.session.commit()
        return '', 204

# --- Program Routes ---

@app.route("/programs", methods=['GET', 'POST'])
def handle_programs():
    if request.method == 'POST':
        data = request.get_json()
        required_fields = ['code', 'name', 'college_code']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
        if Program.query.get(data['code']):
            return jsonify({"error": "Program with this code already exists"}), 400
        if not College.query.get(data['college_code']):
            return jsonify({"error": "College not found"}), 404

        new_program = Program(code=data['code'], name=data['name'], college_code=data['college_code'])
        db.session.add(new_program)
        db.session.commit()
        return jsonify(model_to_dict(new_program)), 201

    if request.method == 'GET':
        programs = Program.query.all()
        return jsonify([model_to_dict(p) for p in programs])

@app.route("/programs/<code>", methods=['GET', 'PUT', 'DELETE'])
def handle_program(code):
    program = Program.query.get_or_404(code)

    if request.method == 'GET':
        return jsonify(model_to_dict(program))

    if request.method == 'PUT':
        data = request.get_json()
        if 'name' in data:
            program.name = data['name']
        if 'college_code' in data:
            if not College.query.get(data['college_code']):
                return jsonify({"error": "College not found"}), 404
            program.college_code = data['college_code']
        db.session.commit()
        return jsonify(model_to_dict(program))

    if request.method == 'DELETE':
        if Student.query.filter_by(course_code=code).first():
             return jsonify({"error": "Cannot delete program with associated students"}), 400
        db.session.delete(program)
        db.session.commit()
        return '', 204

# --- Student Routes ---

@app.route("/students", methods=['GET', 'POST'])
def handle_students():
    if request.method == 'POST':
        data = request.get_json()
        required_fields = ['firstname', 'lastname', 'course_code', 'year', 'gender']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Validate year
        try:
            year = int(data['year'])
            if not (1 <= year <= 5):
                 raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"error": "Year must be an integer between 1 and 5"}), 400

        # Validate gender
        if data['gender'] not in ['Male', 'Female', 'Other']:
            return jsonify({"error": "Invalid gender"}), 400

        # Validate course
        if not Program.query.get(data['course_code']):
            return jsonify({"error": "Program not found"}), 404

        # Generate student ID
        current_year = 2025 # As per example, using a fixed year for now
        new_id = generate_student_id(current_year)

        new_student = Student(
            id=new_id,
            firstname=data['firstname'],
            lastname=data['lastname'],
            course_code=data['course_code'],
            year=year,
            gender=data['gender']
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify(model_to_dict(new_student)), 201

    if request.method == 'GET':
        query = Student.query

        # Search/Filter
        if 'search' in request.args:
            search_term = f"%{request.args['search']}%"
            query = query.filter(
                or_(
                    Student.firstname.ilike(search_term),
                    Student.lastname.ilike(search_term),
                    Student.id.ilike(search_term)
                )
            )
        if 'course' in request.args:
            query = query.filter(Student.course_code == request.args['course'])
        if 'year' in request.args:
            try:
                year_val = int(request.args['year'])
                query = query.filter(Student.year == year_val)
            except ValueError:
                return jsonify({"error": "Year filter must be an integer"}), 400

        # Sorting
        sort_by = request.args.get('sort', 'id')
        sort_order = request.args.get('order', 'asc')
        if hasattr(Student, sort_by):
            column = getattr(Student, sort_by)
            if sort_order == 'desc':
                query = query.order_by(column.desc())
            else:
                query = query.order_by(column.asc())


        students = query.all()
        return jsonify([model_to_dict(s) for s in students])

@app.route("/students/<id>", methods=['GET', 'PUT', 'DELETE'])
def handle_student(id):
    student = Student.query.get_or_404(id)

    if request.method == 'GET':
        return jsonify(model_to_dict(student))

    if request.method == 'PUT':
        data = request.get_json()
        if 'firstname' in data:
            student.firstname = data['firstname']
        if 'lastname' in data:
            student.lastname = data['lastname']
        if 'course_code' in data:
            if not Program.query.get(data['course_code']):
                return jsonify({"error": "Program not found"}), 404
            student.course_code = data['course_code']
        if 'year' in data:
             try:
                year = int(data['year'])
                if not (1 <= year <= 5):
                     raise ValueError()
                student.year = year
             except (ValueError, TypeError):
                return jsonify({"error": "Year must be an integer between 1 and 5"}), 400
        if 'gender' in data:
            if data['gender'] not in ['Male', 'Female', 'Other']:
                return jsonify({"error": "Invalid gender"}), 400
            student.gender = data['gender']

        db.session.commit()
        return jsonify(model_to_dict(student))

    if request.method == 'DELETE':
        db.session.delete(student)
        db.session.commit()
        return '', 204

def main():
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    with app.app_context():
        db.create_all()

    app.run(port=int(os.environ.get('PORT', 5000)))

if __name__ == "__main__":
    main()