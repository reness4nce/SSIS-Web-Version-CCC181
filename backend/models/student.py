from extensions import db

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.String, primary_key=True)
    firstname = db.Column(db.String, nullable=False)
    lastname = db.Column(db.String, nullable=False)
    course_code = db.Column(db.String, db.ForeignKey('programs.code'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String, nullable=False)
    # ...add other fields if needed...
