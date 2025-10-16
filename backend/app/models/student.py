from ..extensions import db

class Student(db.Model):
    __tablename__ = 'student'
    id = db.Column(db.String(20), primary_key=True)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    course = db.Column(db.String(20), db.ForeignKey('program.code'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'course': self.course,
            'year': self.year,
            'gender': self.gender
        }
