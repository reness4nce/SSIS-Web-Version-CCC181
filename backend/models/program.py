from extensions import db

class Program(db.Model):
    __tablename__ = 'programs'
    code = db.Column(db.String, primary_key=True)
    name = db.Column(db.String, nullable=False)
    college_code = db.Column(db.String, db.ForeignKey('colleges.code'), nullable=False)
    # ...add other fields if needed...
